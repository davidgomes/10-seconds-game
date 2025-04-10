-- This is the local database schema for PGlite.

-- It uses two tables: `picks_synced` and `picks_local`. These are combined
-- into a `picks` view that provides a merged view on both tables and supports
-- local live queries. Writes to the `picks` view are redirected using
-- `INSTEAD OF` triggers to the `picks_local` and `changes` tables.

-- The `picks_synced` table for immutable, synced state from the server.
CREATE TABLE IF NOT EXISTS picks_synced (
    "id" uuid PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"number" integer NOT NULL,
	"timestamp" timestamp NOT NULL
);

-- The `picks_local` table for local optimistic state.
CREATE TABLE IF NOT EXISTS picks_local (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL,
  round_id integer NOT NULL,
  number integer NOT NULL,
  timestamp timestamp NOT NULL,
  -- Bookkeeping columns.
  changed_columns TEXT[],
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  write_id UUID NOT NULL
);


-- The `picks` view to combine the two tables on read.
CREATE OR REPLACE VIEW picks AS
  SELECT
    COALESCE(local.id, synced.id) AS id,
    CASE
      WHEN 'user_id' = ANY(local.changed_columns)
        THEN local.user_id
        ELSE synced.user_id
      END AS user_id,
    CASE
      WHEN 'round_id' = ANY(local.changed_columns)
        THEN local.round_id
        ELSE synced.round_id
      END AS round_id,
    CASE
      WHEN 'number' = ANY(local.changed_columns)
        THEN local.number
        ELSE synced.number
      END AS number,
    CASE
      WHEN 'timestamp' = ANY(local.changed_columns)
        THEN local.timestamp
        ELSE synced.timestamp
      END AS timestamp
  FROM picks_synced AS synced
  FULL OUTER JOIN picks_local AS local
    ON synced.id = local.id
    WHERE local.id IS NULL OR local.is_deleted = FALSE;

-- Triggers to automatically remove local optimistic state when the corresponding
-- row syncs over the replication stream. Match on `write_id`, to allow local
-- state to be rebased on concurrent changes to the same row.
CREATE OR REPLACE FUNCTION delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM picks_local
    WHERE id = NEW.id
      AND write_id IS NOT NULL
      AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- N.b.: deletes can be concurrent, but can't update the `write_id` and aren't
-- revertable (once a row is deleted, it would be re-created with an insert),
-- so its safe to just match on ID. You could implement revertable concurrent
-- deletes using soft deletes (which are actually updates).
CREATE OR REPLACE FUNCTION delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM picks_local WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON picks_synced
FOR EACH ROW
EXECUTE FUNCTION delete_local_on_synced_insert_and_update_trigger();

-- The local `changes` table for capturing and persisting a log
-- of local write operations that we want to sync to the server.
CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

-- The following `INSTEAD OF` triggers:
-- 1. allow the app code to write directly to the view
-- 2. to capture write operations and write change messages into the

-- The insert trigger
CREATE OR REPLACE FUNCTION picks_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
  local_write_id UUID := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM picks_synced WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
  END IF;
  IF EXISTS (SELECT 1 FROM picks_local WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
  END IF;

  -- Insert into the local table.
  INSERT INTO picks_local (
    id,
    user_id,
    round_id,
    number,
    timestamp,
    changed_columns,
    write_id
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    NEW.round_id,
    NEW.number,
    NEW.timestamp,
    ARRAY['user_id', 'round_id', 'number', 'timestamp'],
    local_write_id
  );

  -- Record the write operation in the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'insert',
    jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'round_id', NEW.round_id,
      'number', NEW.number,
      'timestamp', NEW.timestamp
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The update trigger
CREATE OR REPLACE FUNCTION picks_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
  synced picks_synced%ROWTYPE;
  local picks_local%ROWTYPE;
  changed_cols TEXT[] := '{}';
  local_write_id UUID := gen_random_uuid();
BEGIN
  -- Fetch the corresponding rows from the synced and local tables
  SELECT * INTO synced FROM picks_synced WHERE id = NEW.id;
  SELECT * INTO local FROM picks_local WHERE id = NEW.id;

  -- If the row is not present in the local table, insert it
  IF NOT FOUND THEN
    -- Compare each column with the synced table and add to changed_cols if different
    IF NEW.user_id IS DISTINCT FROM synced.user_id THEN
      changed_cols := array_append(changed_cols, 'user_id');
    END IF;
    IF NEW.round_id IS DISTINCT FROM synced.round_id THEN
      changed_cols := array_append(changed_cols, 'round_id');
    END IF;
    IF NEW.number IS DISTINCT FROM synced.number THEN
      changed_cols := array_append(changed_cols, 'number');
    END IF;
    IF NEW.timestamp IS DISTINCT FROM synced.timestamp THEN
      changed_cols := array_append(changed_cols, 'timestamp');
    END IF;

    INSERT INTO picks_local (
      id,
      user_id,
      round_id,
      number,
      timestamp,
      changed_columns,
      write_id
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      NEW.round_id,
      NEW.number,
      NEW.timestamp,
      changed_cols,
      local_write_id
    );

  -- Otherwise, if the row is already in the local table, update it and adjust
  -- the changed_columns
  ELSE
    UPDATE picks_local
      SET
        user_id =
          CASE
            WHEN NEW.user_id IS DISTINCT FROM synced.user_id
              THEN NEW.user_id
              ELSE local.user_id
            END,
        round_id =
          CASE
            WHEN NEW.round_id IS DISTINCT FROM synced.round_id
              THEN NEW.round_id
              ELSE local.round_id
            END,
        number =
          CASE
            WHEN NEW.number IS DISTINCT FROM synced.number
              THEN NEW.number
              ELSE local.number
            END,
        timestamp =
          CASE
            WHEN NEW.timestamp IS DISTINCT FROM synced.timestamp
              THEN NEW.timestamp
              ELSE local.timestamp
            END,
        -- Set the changed_columns to columns that have both been marked as changed
        -- and have values that have actually changed.
        changed_columns = (
          SELECT array_agg(DISTINCT col) FROM (
            SELECT unnest(local.changed_columns) AS col
            UNION
            SELECT unnest(ARRAY['user_id', 'round_id', 'number', 'timestamp']) AS col
          ) AS cols
          WHERE (
            CASE
              WHEN col = 'user_id'
                THEN COALESCE(NEW.user_id, local.user_id) IS DISTINCT FROM synced.user_id
              WHEN col = 'round_id'
                THEN COALESCE(NEW.round_id, local.round_id) IS DISTINCT FROM synced.round_id
              WHEN col = 'number'
                THEN COALESCE(NEW.number, local.number) IS DISTINCT FROM synced.number
              WHEN col = 'timestamp'
                THEN COALESCE(NEW.timestamp, local.timestamp) IS DISTINCT FROM synced.timestamp
              END
          )
        ),
        write_id = local_write_id
      WHERE id = NEW.id;
  END IF;

  -- Record the update into the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'update',
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'round_id', NEW.round_id,
        'number', NEW.number,
        'timestamp', NEW.timestamp
      )
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The delete trigger
CREATE OR REPLACE FUNCTION picks_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
  local_write_id UUID := gen_random_uuid();
BEGIN
  -- Upsert a soft-deletion record in the local table.
  IF EXISTS (SELECT 1 FROM picks_local WHERE id = OLD.id) THEN
    UPDATE picks_local
    SET
      is_deleted = TRUE,
      write_id = local_write_id
    WHERE id = OLD.id;
  ELSE
    INSERT INTO picks_local (
      id,
      is_deleted,
      write_id
    )
    VALUES (
      OLD.id,
      TRUE,
      local_write_id
    );
  END IF;

  -- Record in the change log.
  INSERT INTO changes (
    operation,
    value,
    write_id,
    transaction_id
  )
  VALUES (
    'delete',
    jsonb_build_object(
      'id', OLD.id
    ),
    local_write_id,
    pg_current_xact_id()
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER picks_insert
INSTEAD OF INSERT ON picks
FOR EACH ROW
EXECUTE FUNCTION picks_insert_trigger();

CREATE OR REPLACE TRIGGER picks_update
INSTEAD OF UPDATE ON picks
FOR EACH ROW
EXECUTE FUNCTION picks_update_trigger();

CREATE OR REPLACE TRIGGER picks_delete
INSTEAD OF DELETE ON picks
FOR EACH ROW
EXECUTE FUNCTION picks_delete_trigger();

-- Notify on a `changes` topic whenever anything is added to the change log.
CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();
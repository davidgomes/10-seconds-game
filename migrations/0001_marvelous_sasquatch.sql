CREATE TABLE "round_numbers" (
	"round_id" integer NOT NULL,
	"number" integer NOT NULL,
	"display_index" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "round_numbers" ADD CONSTRAINT "round_numbers_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;
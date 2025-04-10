import { PGlite } from '@electric-sql/pglite'
import { type PGliteWithLive, live } from '@electric-sql/pglite/live'
import { electricSync } from '@electric-sql/pglite-sync'

import localSchemaMigrations from './local-schema.sql?raw'

const DATA_DIR = 'idb://local-db'

const registry = new Map<string, Promise<PGliteWithLive>>()

export async function loadPGlite(): Promise<PGliteWithLive> {
  let loadingPromise = registry.get('loadingPromise')

  if (loadingPromise === undefined) {
    loadingPromise = _loadPGlite()

    registry.set('loadingPromise', loadingPromise)
  }

  return loadingPromise as Promise<PGliteWithLive>
}

async function _loadPGlite(): Promise<PGliteWithLive> {
  const pglite: PGliteWithLive = await PGlite.create(DATA_DIR, {
    extensions: {
      electric: electricSync(),
      live,
    },
  })

  await pglite.exec(localSchemaMigrations)

  await pglite.electric.syncShapeToTable({
    shape: {
      url: `${`https://api.electric-sql.cloud`}/v1/shape`,
      params: {
        table: 'picks',
        source_id: '5f4cc37e-b223-445d-b559-8a3ea4e1fecc',
        source_secret: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzb3VyY2VfaWQiOiI1ZjRjYzM3ZS1iMjIzLTQ0NWQtYjU1OS04YTNlYTRlMWZlY2MiLCJpYXQiOjE3NDQxODQ5MjZ9.s2zPbyVCv7kjvroUYOnQt-0Ln0qRK66f0Aq9plNh4b0',
        // ...envParams,
      },
    },
    shapeKey: 'picks',
    table: 'picks_synced',
    primaryKey: ['id'],
  })

  return pglite
}
import { PGlite } from '@electric-sql/pglite'
import { type PGliteWithLive, live } from '@electric-sql/pglite/live'
import { electricSync } from '@electric-sql/pglite-sync'

import localSchemaMigrations from './local-schema.sql?raw'
import { VITE_ELECTRIC_SOURCE_ID, VITE_ELECTRIC_SOURCE_SECRET } from '@/constants'

const DATA_DIR = 'idb://local-db-5'

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
  const pglite: PGliteWithLive = await PGlite.create({
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
        source_id: VITE_ELECTRIC_SOURCE_ID,
        source_secret: VITE_ELECTRIC_SOURCE_SECRET,
      },
    },
    shapeKey: 'picks',
    table: 'picks_synced',
    primaryKey: ['id'],
  })

  return pglite
}
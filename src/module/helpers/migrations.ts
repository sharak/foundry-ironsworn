import { IronswornActor } from '../actor/actor'
import { IronswornItem } from '../item/item'
import {
  DelveThemeDataSourceData,
  FeatureOrDanger,
  ItemDataSource,
} from '../item/itemtypes'
import { IronswornSettings } from './settings.js'

// Utilities
async function everyActor(fn: (a: IronswornActor) => any) {
  // Game actors
  for (const actor of game.actors?.contents ?? []) {
    await fn(actor)
  }

  // Pack actors
  for (const pack of game.packs.contents) {
    if (pack.documentClass === Actor) {
      for (const thing of pack.contents) {
        await fn(thing as IronswornActor)
      }
    }
  }
}
async function everyItem(fn: (x: IronswornItem) => any) {
  // Items
  for (const item of game.items?.contents ?? []) {
    await fn(item)
  }

  // Pack items
  for (const pack of game.packs.contents) {
    if (pack.documentClass === Item) {
      for (const thing of pack.contents) {
        await fn(thing as IronswornItem)
      }
    }
  }

  // Actor-owned items (includes packs)
  await everyActor(async (a) => {
    for (const item of a.items.contents) {
      await fn(item)
    }
  })
}

//----------------------------
// Migration 0 (no-op)
async function noop() {
  // no-op
}

// Migration 1: "formidible" -> "formidable"
async function fixFormidableSpelling() {
  // Iterate through everything that has a rank (sites, items, owned items), and change "formidible" to "formidable"
  await everyItem(async (x) => {
    if ((x?.data?.data as any).rank === 'formidible') {
      console.log(`Upgrading ${x.type} / ${x.name}`)
      await x.update({ system: { rank: 'formidable' } })
    }
  })
}

// Migration 2: convert vows to progresses with the "vow" subtype
async function everythingIsAProgress() {
  await everyItem(async (x) => {
    if (['progress', 'vow'].includes(x.type)) {
      console.log(`Upgrading ${x.type} ${x.name}`)
      await x.update({
        type: 'progress',
        system: { subtype: x.type },
      })
    }
  })
}

// Migration 3: Cast any string values that should be numbers
async function statsAreAlwaysNumbers() {
  await everyActor(async (actor) => {
    if (actor.type !== 'character') return
    const statKeys = [
      'edge',
      'heart',
      'iron',
      'shadow',
      'wits',
      'health',
      'spirit',
      'supply',
    ]
    const update = {}
    for (const k of statKeys) {
      update[k] = parseInt(actor.data.data[k] || '0', 10)
    }
    await actor.update({ system: update })
  })
}

// Migration 4: Site themes and site domains use TableResultData for features
async function normalizeFeaturesAndDangers() {
  interface LegacyFeatureOrDanger {
    low: number
    high: number
    description: string
  }
  await everyItem(async (item) => {
    const targetTypes: ItemDataSource['type'][] = [
      'delve-theme',
      'delve-domain',
    ]
    if (!targetTypes.includes(item.type)) return
    const targetKeys: (keyof DelveThemeDataSourceData)[] = [
      'dangers',
      'features',
    ]
    targetKeys.forEach((key) => {
      const legacyRows: (LegacyFeatureOrDanger | FeatureOrDanger)[] =
        item.system[key]
      item.system[key] = legacyRows.map((row) => {
        if (!(row as any).flags?.type) {
          const legacyRow = row as LegacyFeatureOrDanger
          const tableResult: FeatureOrDanger = {
            range: [legacyRow.low, legacyRow.high],
            text: legacyRow.description,
            flags: {
              'foundry-ironsworn': {
                type: `delve-site-${key === 'dangers' ? 'danger' : 'feature'}`,
                sourceId: item.id,
              },
            },
          }
          return tableResult
        }
        return row
      })
    })
  })
}

// index 1 is the function to run when upgrading from 1 to 2, and so on
const MIGRATIONS: Array<() => Promise<any>> = [
  noop,
  fixFormidableSpelling,
  everythingIsAProgress,
  statsAreAlwaysNumbers,
  normalizeFeaturesAndDangers,
]
const NEWEST_VERSION = MIGRATIONS.length

export async function runDataMigrations() {
  // Bail if this user isn't capable of running the migrations
  if (!game.user?.isGM) return

  // Bail if we're already at the newest version
  let currentVersion = IronswornSettings.get('data-version')
  if (currentVersion >= NEWEST_VERSION) return

  const showWarnings = currentVersion >= 1 // Don't show these for a brand-new world

  try {
    if (showWarnings) {
      ui.notifications?.warn('Doing some system housecleaning, please wait...')
    }

    while (currentVersion < NEWEST_VERSION) {
      await MIGRATIONS[currentVersion]()
      currentVersion++
    }

    // All done
    game.settings.set('foundry-ironsworn', 'data-version', NEWEST_VERSION)
    if (showWarnings) {
      ui.notifications?.warn('All done! Carry on.')
    }
  } catch (e) {
    ui.notifications?.error(
      'Well crap, data migration ran into a problem. Try reloading your browser to run it again.',
      {
        permanent: true,
      }
    )
  }
}

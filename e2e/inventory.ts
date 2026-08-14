/**
 * جسرٌ بين المستخرج (جافاسكربت خالص) وبقيّة العدّة (TypeScript).
 *
 * الجرد يُبنى في `globalSetup` مرّةً واحدة ويُحفظ في generated/inventory.json،
 * ثم تقرؤه كلُّ العمّال. البناء مرّةً واحدةً لا مرّةً لكلّ عاملٍ يضمن أن يزحف
 * الجميع على القائمة نفسها.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { E2E_ROOT, FRONTEND_ROOT } from './config/crawler.config'
import { routeParams, routeParamOverrides } from './config/route-params'
import { buildInventory } from './extract/route-extractor.mjs'
import type { Inventory } from './extract/route-extractor.mjs'

export type CrawlTarget = Inventory['targets'][number]

const ROUTER_FILE = path.join(FRONTEND_ROOT, 'src', 'app', 'router', 'app-router.tsx')
const NAV_FILE = path.join(FRONTEND_ROOT, 'src', 'modules', 'admin', 'constants', 'navigation.ts')
const INVENTORY_FILE = path.join(E2E_ROOT, 'generated', 'inventory.json')

/** يبني الجرد من المصدر ويحفظه. يُستدعى من globalSetup. */
export function generateInventory(): Inventory {
  const inventory = buildInventory({
    routerFile: ROUTER_FILE,
    navFile: NAV_FILE,
    params: routeParams,
    perRoute: routeParamOverrides,
  })

  mkdirSync(path.dirname(INVENTORY_FILE), { recursive: true })
  writeFileSync(INVENTORY_FILE, JSON.stringify(inventory, null, 2), 'utf8')
  return inventory
}

/** يقرأ الجرد المحفوظ، ويبنيه إن لم يوجد. */
export function loadInventory(): Inventory {
  if (!existsSync(INVENTORY_FILE)) return generateInventory()
  try {
    return JSON.parse(readFileSync(INVENTORY_FILE, 'utf8')) as Inventory
  } catch {
    return generateInventory()
  }
}

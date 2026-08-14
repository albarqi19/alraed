/** أنواع مستخرج المسارات — الشيفرة في route-extractor.mjs (جافاسكربت خالص بلا تبعيات). */

export type Audience = 'teacher' | 'admin' | 'super-admin' | 'guardian' | 'public'

export interface RawRoute {
  pattern: string
  audience: Audience
  shell: string | null
  element: string
  isIndex: boolean
  isRedirect: boolean
  isCatchAll: boolean
}

export interface NavItem {
  to: string
  label: string
  group: string
  soon: boolean
}

export interface InventoryTarget {
  url: string
  pattern: string
  audience: Audience
  element: string
  params: string[]
}

export interface SkippedTarget {
  pattern: string
  audience: Audience
  reason: string
}

export interface Inventory {
  targets: InventoryTarget[]
  skipped: SkippedTarget[]
  nav: NavItem[]
  orphanNav: Array<{ to: string; label: string; group: string }>
  totalRoutes: number
  generatedAt: string
}

export function extractRoutes(routerFilePath: string): RawRoute[]

export function extractNavItems(navFilePath: string): NavItem[]

export function buildInventory(options: {
  routerFile: string
  navFile: string
  params: Record<string, string | number | undefined>
  /**
   * تعيينٌ خاصٌّ بمسارٍ بعينه، مفتاحُه نمطُ المسار كما هو في الراوتر.
   * يتقدّم على `params` العامّ — لأن `:id` ليس شيئاً واحداً في كلّ المسارات.
   */
  perRoute?: Record<string, Record<string, string | number | undefined>>
}): Inventory

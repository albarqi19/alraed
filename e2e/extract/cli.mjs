/**
 * سطر أوامر الجرد — يطبع ما سيزحف عليه الزاحف قبل أن يزحف.
 *
 * الفائدة العملية: قبل تشغيلٍ يستغرق دقائق، اعرف في ثانية كم صفحةً ستُفحص،
 * وكم ستُتخطّى ولماذا، وأيّ عناصر تنقّلٍ تقود إلى العدم.
 *
 *   node e2e/extract/cli.mjs           # تقريرٌ مقروء
 *   node e2e/extract/cli.mjs --json    # JSON للأدوات
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import '../config/load-env.mjs'
import { perRouteParams, routeParams } from '../config/seed-payload.mjs'
import { buildInventory } from './route-extractor.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '..', '..')

const routerFile = path.join(frontendRoot, 'src', 'app', 'router', 'app-router.tsx')
const navFile = path.join(frontendRoot, 'src', 'modules', 'admin', 'constants', 'navigation.ts')

/* التعيينُ نفسُه الذي تستعمله العدّة — من `config/seed-payload.mjs` لا مكرَّراً
   هنا، كي لا يقول السطرُ «سيُزحف على كذا» ويزحف الزاحف على غيره. */
const inventory = buildInventory({
  routerFile,
  navFile,
  params: routeParams(),
  perRoute: perRouteParams(),
})

const outFile = path.join(here, '..', 'generated', 'inventory.json')
mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(inventory, null, 2), 'utf8')

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(inventory, null, 2))
  process.exit(0)
}

/* ── التقرير المقروء ── */

const byAudience = {}
for (const target of inventory.targets) {
  byAudience[target.audience] = (byAudience[target.audience] ?? 0) + 1
}

const AUDIENCE_LABEL = {
  admin: 'الإدارة',
  teacher: 'المعلم',
  'super-admin': 'المشرف العام',
  guardian: 'وليّ الأمر',
  public: 'عامّ (بلا دخول)',
}

console.log('')
console.log('══════════ جرد مسارات «الرائد» ══════════')
console.log('')
console.log(`  عُقَدُ المسارات في الراوتر : ${inventory.totalRoutes}`)
console.log(`  أهدافٌ جاهزة للزحف       : ${inventory.targets.length}`)
console.log(`  متخطّاة                  : ${inventory.skipped.length}`)
console.log(`  عناصر تنقّل الأدمن        : ${inventory.nav.length}`)
console.log('')
console.log('  التوزيع على الأدوار:')
for (const [audience, count] of Object.entries(byAudience).sort((a, b) => b[1] - a[1])) {
  console.log(`    · ${(AUDIENCE_LABEL[audience] ?? audience).padEnd(18)} ${count}`)
}

if (inventory.orphanNav.length > 0) {
  console.log('')
  console.log(`  ⚠ عناصر تنقّلٍ بلا مسارٍ مطابق (${inventory.orphanNav.length}) — أزرارٌ تقود إلى «الصفحة غير موجودة»:`)
  for (const item of inventory.orphanNav) {
    console.log(`    · «${item.label}» → ${item.to}   [${item.group}]`)
  }
} else {
  console.log('')
  console.log('  ✓ كلُّ عناصر التنقّل لها مساراتٌ مطابقة')
}

const skippedForData = inventory.skipped.filter((s) => s.reason.startsWith('متخطّى — لا بيانات'))
if (skippedForData.length > 0) {
  console.log('')
  console.log(`  ⓘ متخطّاة لغياب البيانات (${skippedForData.length}) — اضبط متغيّرات البارامترات لتُفحص:`)
  for (const item of skippedForData) {
    console.log(`    · ${item.pattern}`)
  }
}

console.log('')
console.log(`  حُفظ الجرد في: ${path.relative(frontendRoot, outFile)}`)
console.log('')

/**
 * تهيئةٌ عامّةٌ قبل أيّ اختبار.
 *
 * أربعةُ أمورٍ بالترتيب:
 *   ١) التحقّق من أنّ الهدف ليس الإنتاج — قبل فتح متصفّحٍ واحد.
 *   ٢) التحقّق من أنّ الهدف هو **تطبيقُنا** لا تطبيقاً آخرَ على المنفذ نفسه.
 *   ٣) بناء جرد المسارات من الراوتر مرّةً واحدةً لكلّ العمّال.
 *   ٤) طباعة ما سيُفحص كي يعرف المشغّل حجم العمل قبل أن يبدأ.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertNotProduction, assertTargetIsOurApp, crawlerConfig } from './config/crawler.config'
import { generateInventory } from './inventory'

const ROLES = ['public', 'admin', 'teacher', 'super-admin', 'guardian']

/**
 * يضمن وجود ملفّ حالةٍ لكلّ دور.
 *
 * `storageState` في إعداد Playwright يشير إلى ملفٍّ يجب أن يوجد قبل إنشاء
 * السياق. ولو انهار مشروعُ التهيئة قبل كتابته، لسقط التشغيل كلُّه بخطأ
 * «ملفٌّ غير موجود» بدل أن يُنتج تقريراً عمّا استطاع فحصه. فنكتب حالاتٍ
 * فارغةً سلفاً، ويكتب مشروعُ التهيئة فوقها ما ينجح منها.
 */
function ensureAuthStates(): void {
  mkdirSync(crawlerConfig.authStateDir, { recursive: true })
  for (const role of ROLES) {
    const file = path.join(crawlerConfig.authStateDir, `${role}.json`)
    if (!existsSync(file)) {
      writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf8')
    }
  }
}

/**
 * ينظّف مخلَّفات التشغيل السابق.
 *
 * بلا هذا يكذب التقرير مرّتين: حالةُ دورٍ فشل أمس تبقى «فاشلة» وإن نجح اليوم،
 * ولقطةُ عطلٍ أُصلح تبقى مضمّنةً في تقرير اليوم فيظنّ القارئ العطل قائماً.
 */
function clearPreviousRun(): void {
  const staleStatus = path.join(crawlerConfig.authStateDir, 'roles-status.json')
  if (existsSync(staleStatus)) rmSync(staleStatus, { force: true })
  if (existsSync(crawlerConfig.screenshotDir)) {
    rmSync(crawlerConfig.screenshotDir, { recursive: true, force: true })
  }
  mkdirSync(crawlerConfig.screenshotDir, { recursive: true })
}

export default async function globalSetup(): Promise<void> {
  assertNotProduction()
  await assertTargetIsOurApp()
  clearPreviousRun()
  ensureAuthStates()

  const inventory = generateInventory()

  const byAudience = new Map<string, number>()
  for (const target of inventory.targets) {
    byAudience.set(target.audience, (byAudience.get(target.audience) ?? 0) + 1)
  }

  const line = '─'.repeat(56)
  console.log(`\n${line}`)
  console.log('  زحف «الرائد» — الجرد')
  console.log(line)
  console.log(`  الهدف   : ${crawlerConfig.baseURL}`)
  console.log(`  الـ API : ${crawlerConfig.apiBaseURL}`)
  console.log(`  مساراتٌ في الراوتر : ${inventory.totalRoutes}`)
  console.log(`  أهدافٌ للزحف       : ${inventory.targets.length}`)
  console.log(`  متخطّاة            : ${inventory.skipped.length}`)
  for (const [audience, count] of [...byAudience].sort((a, b) => b[1] - a[1])) {
    console.log(`      · ${audience}: ${count}`)
  }
  if (inventory.orphanNav.length > 0) {
    console.log(`  ⚠ عناصر تنقّلٍ بلا مسار: ${inventory.orphanNav.length}`)
  }
  console.log(`${line}\n`)
}

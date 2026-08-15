/**
 * القياسُ قبل/بعد — قلبُ مذهب الرحلة.
 *
 * ══ لماذا لا يكفي «صار خمسة»؟ ══
 * لأنه لا يقول شيئاً. خمسةٌ قد تكون خمسةً قبل الفعل. والقاعدة تتغيّر بين
 * تشغيلٍ وتشغيل، فأيُّ رقمٍ مطلقٍ في التأكيد يصير كذبةً بعد أوّل بذرةٍ جديدة.
 * أمّا «كان أربعةً فصار خمسة» فيُثبت أنّ **فعلَنا** هو الذي غيّر الرقم.
 *
 * وأهمُّ ما يكشفه هذا القياس: **التكرار**. زرُّ حفظٍ يُرسل الطلب مرّتين يُنتج
 * «صار ستّة» — وهي حالةٌ يقرأها التحقّق الساذج نجاحاً («الطالب موجود!») بينما
 * القاعدة صار فيها طالبان بالاسم نفسه.
 */

import { expect, type Locator } from '@playwright/test'

/** قياسٌ مفتوح: أُخذ الرقمُ الأوّل وينتظر الثاني */
export interface Measurement {
  /** وصفٌ عربيٌّ يظهر في التقرير: «عدد الطلاب في الـAPI» */
  label: string
  before: number
  /** يُملأ عند الإغلاق */
  after?: number
  /** الفرق المتوقَّع الذي أُعلن عند الإغلاق */
  expected?: number
}

/**
 * يؤكّد أنّ الفرق هو المتوقَّع بالضبط، برسالةٍ عربيةٍ تقول ما وقع.
 *
 * الرسالة ليست ترفاً: من يقرأ فشلاً بعد شهرين لن يفتح الشيفرة. «كان ٨ فصار ١٠
 * والمتوقَّع ٩ — أُضيف صفّان بفعلٍ واحد» تشخيصٌ كامل في سطر.
 */
export function assertDelta(measurement: Measurement, after: number, expectedDelta: number, why: string): void {
  const actualDelta = after - measurement.before
  expect(
    actualDelta,
    [
      `${measurement.label}: كان ${measurement.before} فصار ${after} — أي ${signed(actualDelta)}،`,
      `والمتوقَّع ${signed(expectedDelta)}. ${why}`,
    ].join(' '),
  ).toBe(expectedDelta)
}

function signed(n: number): string {
  if (n === 0) return 'بلا تغيير'
  return n > 0 ? `+${n}` : String(n)
}

/* ══════════════════════════════════════════════════════════════
   قياسُ الواجهة
   ══════════════════════════════════════════════════════════════ */

/**
 * عددُ صفوف جدولٍ في الواجهة.
 *
 * يقيس `tbody tr` تحديداً لا `tr`: لولا ذلك لعُدّ صفُّ الترويسة صفَّ بيانات،
 * فصار كلُّ جدولٍ فارغٍ «فيه صفٌّ واحد» ونجحت تأكيداتٌ على العدم.
 */
export async function rowCount(table: Locator): Promise<number> {
  return table.locator('tbody tr').count()
}

/**
 * يؤكّد أنّ عدد صفوف الجدول تغيّر بالمقدار المتوقَّع.
 *
 * ينتظر العددَ ولا يقيسه فوراً: الجدول يُعاد جلبُه بعد الحفظ (إبطالُ ذاكرة
 * TanStack Query)، والقياسُ في اللحظة نفسها يقع على الحالة القديمة. والانتظار
 * هنا بالمحتوى لا بالثواني — `toHaveCount` تعيد المحاولة حتى المهلة.
 */
export async function expectRowCount(table: Locator, before: number, delta: number, why: string): Promise<void> {
  const target = before + delta
  await expect(
    table.locator('tbody tr'),
    `صفوف الجدول: كانت ${before} والمتوقَّع أن تصير ${target} (${signed(delta)}). ${why}`,
  ).toHaveCount(target)
}

/**
 * يقرأ عدداً معروضاً في الواجهة (شارةً أو حقيقةً في الترويسة).
 *
 * الأرقام في التطبيق تُنسَّق بـ`toLocaleString('ar-SA-u-nu-latn')` فتخرج
 * بأرقامٍ لاتينيةٍ وفواصل آلاف. ونستوعب الأرقامَ العربية-الهندية أيضاً تحسّباً
 * لصفحةٍ نسيت اللاحقة `-nu-latn` — فلا ينكسر القياس على اختلافِ تنسيق.
 */
export async function readDisplayedNumber(locator: Locator): Promise<number> {
  const text = (await locator.first().innerText()).trim()
  const normalized = text
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d]/g, '')

  if (normalized === '') {
    throw new Error(`لم أجد رقماً في النصّ المعروض: «${text.slice(0, 80)}»`)
  }
  return Number(normalized)
}

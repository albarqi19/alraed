/**
 * نموذج الاكتشافات — اللغة المشتركة بين الكواشف والمُبلِّغ.
 */

import type { CrawlRole } from '../config/route-params'

/** درجة الخطورة. الترتيب مقصود: يُفرز التقرير عليه. */
export type Severity = 'عطل' | 'مشبوه' | 'متوقَّع'

export const severityRank: Record<Severity, number> = {
  'عطل': 0,
  'مشبوه': 1,
  'متوقَّع': 2,
}

export type FindingKind =
  | 'شاشة بيضاء'
  | 'انهيار React'
  | 'خطأ console'
  | 'نداء فاشل'
  | 'مهلة التحميل'
  | 'انهيار بعد ضغطة'
  | 'عنصر تنقّل معطوب'

export interface Finding {
  kind: FindingKind
  severity: Severity
  /** جملةٌ تشخيصيةٌ يفهمها المالك بلا شرح */
  detail: string
  /** تفصيلٌ تقنيّ اختياريّ (نصّ الخطأ، عنوان النداء…) */
  technical?: string
}

export interface PageResult {
  /** العنوان المزار */
  url: string
  /** النمط الأصلي في الراوتر */
  pattern: string
  role: CrawlRole
  /** اسم المكوّن — يساعد المطوّر على القفز للملفّ مباشرة */
  element: string
  /** مدّة التحميل بالمللي ثانية */
  durationMs: number
  findings: Finding[]
  /** مسار اللقطة نسبةً لمجلّد التقرير، إن وُجد عطل */
  screenshot?: string
  /** الأزرار التي جُرّبت وما نتج عنها */
  buttonsProbed: Array<{ label: string; outcome: string }>
  /** الأزرار التي مُنعت ولماذا — شفافيةٌ تمنع التقرير من ادّعاء تغطيةٍ لا يملكها */
  buttonsSkipped: Array<{ label: string; reason: string }>
}

/** أخطر درجةٍ في صفحة (لفرز الجدول) */
export function worstSeverity(findings: Finding[]): Severity | null {
  if (findings.length === 0) return null
  return findings.reduce<Severity>(
    (worst, f) => (severityRank[f.severity] < severityRank[worst] ? f.severity : worst),
    'متوقَّع',
  )
}

/** هل هذه الصفحة معطّلة فعلاً (لا مجرّد ملاحظاتٍ متوقَّعة)؟ */
export function isBroken(page: PageResult): boolean {
  return page.findings.some((f) => f.severity === 'عطل')
}

/** هل فيها ما يستحقّ نظرةً دون أن يكون عطلاً مؤكَّداً؟ */
export function isSuspicious(page: PageResult): boolean {
  return !isBroken(page) && page.findings.some((f) => f.severity === 'مشبوه')
}

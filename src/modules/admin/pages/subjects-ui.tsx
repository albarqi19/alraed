import { TONES } from '@/shared/workspace'
import type { SubjectGradeCell } from '../types'

/* ═══════════════════════════════════════════════════════════
   وحدات إدارة المواد — «مِشط المادة»
   ═══════════════════════════════════════════════════════════ */

/**
 * ترتيب الصفوف. اثنا عشر مدخلاً لا تسعة:
 * ImportController::convertGradeNumber يُنتج الثانوي أيضاً عبر fullCodeMap
 * (1314→أول ثانوي · 1416→ثاني ثانوي · 1516→ثالث ثانوي) — وبدونها يسقط
 * الثانوي كله على ?? 99 فيترتّب عشوائياً.
 */
export const GRADE_ORDER: Record<string, number> = {
  'الصف الأول': 1,
  'الصف الثاني': 2,
  'الصف الثالث': 3,
  'الصف الرابع': 4,
  'الصف الخامس': 5,
  'الصف السادس': 6,
  'أول متوسط': 7,
  'ثاني متوسط': 8,
  'ثالث متوسط': 9,
  'أول ثانوي': 10,
  'ثاني ثانوي': 11,
  'ثالث ثانوي': 12,
}

function tipFor(cell: SubjectGradeCell, blind: boolean): string {
  const base = `${cell.grade} · ${cell.slots} حصة في الجدول · ${cell.sections} فصل`
  if (blind) return `${base} · لا توزيع محمَّل لهذا الفصل الدراسي`
  if (!cell.has_curriculum) return `${base} · بلا توزيع منهج — معلّموه يفتحون الخطة فارغة`
  return `${base} · المقرّر ${cell.sessions_per_week} حصة أسبوعياً`
}

/**
 * ★ مِشط المادة — سنٌّ لكل صفٍّ تُدرَّس فيه المادة **فعلاً**
 * (من class_sessions.grade المميّزة، لا من قائمة نظرية).
 *
 * الارتفاع = ثِقَل المدرسة نفسها (slots) — كمّي فيُقاس بالارتفاع ولا يُلوَّن
 *            (سابقة PriorityMeter). وهو حرفياً العدد الذي سيردّ الحذف بـ422.
 * اللون    = محور واحد: هذا الصف بلا توزيع منهج ⇒ معلّموه يفتحون الخطة فارغة.
 *
 * لماذا slots لا sessions_per_week المقرّرة: الأخيرة غير معرَّفة عند الفجوة
 * أصلاً (فالأسنان التي تهمّ أكثر تبقى بلا ارتفاع)، وهي ثابت وزاري لا يتغيّر
 * بشيء يفعله المدير.
 */
export function SubjectComb({
  grades,
  maxSlots,
  curriculumBlind,
}: {
  grades: SubjectGradeCell[]
  maxSlots: number
  curriculumBlind: boolean
}) {
  if (grades.length === 0) {
    return (
      <span
        title="لا حصص في الجدول — الحذف لن يُرفض"
        style={{ display: 'inline-block', width: 14, height: 2, borderRadius: 1, background: 'var(--ws-border)' }}
      />
    )
  }

  const sorted = [...grades].sort((a, b) => (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99))

  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {sorted.map((cell, i) => {
        // حارس الفصل: بلا توزيعٍ محمَّل، لا أحد «بلا توزيع» — الكل محايد.
        // بدونه يُطلى ١٠٠٪ من الشاشة كهرماناً فتقول «الكل معطوب» بدل «لا أعرف».
        const gap = !curriculumBlind && !cell.has_curriculum
        return (
          <span
            key={cell.grade}
            className="ws-sparkbar"
            title={tipFor(cell, curriculumBlind)}
            style={{
              width: 4,
              height: 4 + Math.round(10 * (cell.slots / maxSlots)),
              borderRadius: 2,
              flexShrink: 0,
              background: gap ? TONES.amber.tx : 'var(--ws-text-2)',
              animationDelay: `${i * 40}ms`,
            }}
          />
        )
      })}
    </span>
  )
}

export function combSummary(grades: SubjectGradeCell[], blind: boolean): string {
  if (grades.length === 0) return 'بلا حصص'
  const gaps = blind ? 0 : grades.filter((g) => !g.has_curriculum).length
  const slots = grades.reduce((s, g) => s + g.slots, 0)
  const base = `${grades.length} صفوف · ${slots} حصة`
  if (blind) return base
  if (gaps === grades.length) return `${base} · بلا منهج إطلاقاً`
  if (gaps > 0) return `${base} · ${gaps} بلا توزيع`
  return base
}

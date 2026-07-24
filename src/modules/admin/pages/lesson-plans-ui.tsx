import { BookX, FileWarning } from 'lucide-react'
import { TONES, WsAlert, type Tone } from '@/shared/workspace'
import type { TeacherWeekPlan } from '../lesson-plans/api'

/* ═══════════════════════════════════════════════════════════
   وحدات الخطط الأسبوعية — «البروفة»
   الخطة بلاغٌ يُنشر، و«اعتماد» زرّ المطبعة. فلتكن اللمسة بروفةَ
   الطبع: النصّ كما سيقرأه وليّ الأمر بالضبط، تحت إصبع المدير، قبل النقر.
   ═══════════════════════════════════════════════════════════ */

type Plan = TeacherWeekPlan['plans'][number]
type Session = Plan['sessions'][number]

export type PlanRowStatus = 'not_submitted' | 'draft' | 'teacher_approved' | 'admin_approved' | 'rejected'

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  not_submitted: { label: 'لم يُسلّم', tone: TONES.gray },
  draft: { label: 'مسودة', tone: TONES.gray },
  teacher_approved: { label: 'بانتظار اعتمادك', tone: TONES.amber },
  admin_approved: { label: 'معتمد ومنشور', tone: TONES.green },
  rejected: { label: 'مرفوض', tone: TONES.red },
}

export function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.not_submitted
}

/** حصة مكتوبة = لها عنوان درس (topic) غير فارغ */
const isWritten = (s: Session) => Boolean(s.topic?.trim())

export interface PlanMetrics {
  prescribed: number | null
  written: number
  /** max(المقرَّر، المكتوب) — لا يُخفي تجاوزاً أبداً */
  slots: number
  gap: number
  debt: number
}

export function planMetrics(plan: Plan): PlanMetrics {
  const written = (plan.sessions ?? []).filter(isWritten).length
  const prescribed = plan.prescribed_sessions
  const slots = Math.max(prescribed ?? 0, plan.sessions?.length ?? 0)
  const gap = prescribed != null ? Math.max(0, prescribed - written) : 0
  return { prescribed, written, slots, gap, debt: gap }
}

export function teacherDebt(teacher: TeacherWeekPlan): number {
  return teacher.plans.reduce((sum, p) => sum + planMetrics(p).debt, 0)
}

export function GRADE_LABEL(grade: string): string {
  return grade
}

/* ★ البروفة — النصّ كما سيقرأه وليّ الأمر بالضبط */
export function ProofSheet({ plan }: { plan: Plan }) {
  const m = planMetrics(plan)
  const sessions = plan.sessions ?? []

  // الحالة المنحلّة: لا مرجع لعدد الحصص المقرّرة
  const noReference = m.prescribed == null

  // نبني الخانات: المكتوبة أولاً، ثم الفارغة حتى المقرَّر
  const written = sessions.filter(isWritten)
  const emptyCount = m.prescribed != null ? Math.max(0, m.prescribed - written.length) : 0

  return (
    <div style={{ maxWidth: 640, padding: '4px 2px' }}>
      {/* شريط الجمهور */}
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          color: TONES.gray.tx,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <FileWarning style={{ width: 13, height: 13 }} />
        {plan.audience_count > 0
          ? `ستصل إلى ${plan.audience_count.toLocaleString('ar-SA-u-nu-latn')} طالباً في ${plan.grade}`
          : `${plan.subject_name} · ${plan.grade}`}
      </p>

      {noReference && (
        <WsAlert tone="warn" boxed icon={BookX}>
          لا توزيع منهج مربوط لهذه المادة — لا مرجع لعدد الحصص المقرّرة.
        </WsAlert>
      )}

      {/* الحصص المكتوبة — كما سيقرؤها وليّ الأمر */}
      {written.map((session, i) => (
        <div
          key={`w-${i}`}
          style={{
            display: 'flex',
            gap: 8,
            minHeight: 34,
            padding: '6px 0',
            borderBottom: '1px solid var(--ws-surface-2)',
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--ws-surface-2)',
              color: 'var(--ws-text-2)',
              fontSize: 10,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i + 1}
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>
              {session.topic || <span style={{ color: TONES.amber.tx }}>بلا عنوان</span>}
            </span>
            {session.lesson_title && (
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)' }}>
                {session.lesson_title}
              </span>
            )}
            {session.objectives ? (
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)', marginTop: 1 }}>
                <b style={{ fontWeight: 500 }}>الأهداف: </b>
                {session.objectives}
              </span>
            ) : (
              <MissingChip label="بلا أهداف" />
            )}
            {session.homework && (
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)', marginTop: 1 }}>
                <b style={{ fontWeight: 500 }}>الواجب: </b>
                {session.homework}
              </span>
            )}
          </span>
        </div>
      ))}

      {/* الخانات الفارغة — ما سيراه وليّ الأمر: لا شيء */}
      {Array.from({ length: emptyCount }, (_, i) => (
        <div
          key={`e-${i}`}
          style={{
            height: 26,
            marginTop: 4,
            border: '1px dashed var(--ws-border)',
            background: 'var(--ws-surface-2)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: 'var(--ws-text-2)',
          }}
        >
          الحصة {written.length + i + 1} — لن يظهر شيء لولي الأمر
        </div>
      ))}

      {/* ذيل البروفة */}
      <p style={{ margin: '8px 0 0', fontSize: 11, color: m.gap > 0 ? TONES.amber.tx : 'var(--ws-text-2)' }}>
        {m.prescribed != null
          ? `${m.written} من ${m.prescribed} حصص مكتوبة${m.gap > 0 ? ` · فجوة ${m.gap}` : ''}`
          : `${m.written} حصص مكتوبة`}
      </p>
    </div>
  )
}

function MissingChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginTop: 2,
        fontSize: 10,
        padding: '1px 6px',
        borderRadius: 3,
        background: TONES.gray.bg,
        color: TONES.gray.tx,
      }}
    >
      {label}
    </span>
  )
}

import { TONES, type Tone } from '@/shared/workspace'
import type { FarisReconciliationAbsence } from '../faris/types'

/* ═══════════════════════════════════════════════════════════
   وحدات ربط فارس — «المِشبك»
   نافذة سبعة أيام ثابتة المقياس، يوم الغياب مثبَّت في مركزها،
   وجَوف الإجازة الوزارية ينزلق عليها. السنّ إمّا مستقرٌّ في الجَوف
   أو واقفٌ وحده بجواره — والفَرْجة هي مطابقة التسامح.
   ═══════════════════════════════════════════════════════════ */

const DAY = 86_400_000

/** يوم مطلق — يقصّ الزمن والمنطقة فلا انزلاق */
const dayIndex = (s: string) => Math.round(Date.parse(s.slice(0, 10) + 'T00:00:00Z') / DAY)

const R = 3

export const ABSENCE_REASON_AR: Record<string, string> = {
  sick: 'إجازة مرضية',
  emergency: 'ظرف طارئ',
  personal: 'إجازة شخصية',
  official: 'مهمة رسمية',
  maternity: 'إجازة وضع',
  unpaid: 'إجازة بدون راتب',
  other: 'أخرى',
}

export interface ClipModel {
  tone: Tone
  seated: boolean
  gap: number
  from: number
  to: number
  capFrom: boolean
  capTo: boolean
  hasLeave: boolean
}

/**
 * النغمة من الحالة لا من الشارة:
 * - لا إجازة: أحمر إن no_leave، رمادي إن not_synced (كان مطابَقاً ومُحي غالباً)
 * - إجازة غير معتمَدة: كهرماني — يفضح عطب المزامنة اليومية (لا تفلتر leave_status)
 * - مستقرّ في الجَوف: أخضر
 * - على الحافة (gap===1): كهرماني — مطابقة تسامح، تخمينٌ لا واقعة
 */
export function buildClip(absence: FarisReconciliationAbsence): ClipModel {
  const leave = absence.faris_leave

  if (!leave) {
    return {
      tone: absence.faris_sync_status === 'no_leave' ? TONES.red : TONES.gray,
      seated: false,
      gap: 0,
      from: 0,
      to: 0,
      capFrom: false,
      capTo: false,
      hasLeave: false,
    }
  }

  const A = dayIndex(absence.attendance_date)
  const S = dayIndex(leave.start_date)
  const E = dayIndex(leave.end_date)

  const seated = S <= A && A <= E
  const gap = seated ? 0 : A < S ? S - A : A - E
  const from = Math.max(-R, S - A)
  const to = Math.min(R, E - A)
  const capFrom = S - A >= -R
  const capTo = E - A <= R

  const tone =
    leave.leave_status !== 'approved' ? TONES.amber : seated ? TONES.green : TONES.amber

  return { tone, seated, gap, from, to, capFrom, capTo, hasLeave: true }
}

const CELL = 15

/** ★ المِشبك — سنٌّ وجَوف على نافذة سبعة أيام */
export function LeaveClip({ absence }: { absence: FarisReconciliationAbsence }) {
  const clip = buildClip(absence)
  const leave = absence.faris_leave

  if (!clip.hasLeave) {
    return (
      <span
        title={absence.faris_sync_status === 'no_leave' ? 'لا إجازة في فارس تغطّي هذا اليوم' : 'غير مزامن'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        <span style={{ width: 5, height: 20, borderRadius: 2, background: clip.tone.tx }} />
        <span style={{ fontSize: 10.5, color: clip.tone.tx }}>
          {absence.faris_sync_status === 'no_leave' ? 'بلا إجازة' : 'غير مزامن'}
        </span>
      </span>
    )
  }

  const cells = []
  for (let offset = -R; offset <= R; offset++) {
    const inLeave = offset >= clip.from && offset <= clip.to
    const isFrom = offset === clip.from && clip.capFrom
    const isTo = offset === clip.to && clip.capTo
    cells.push(
      <span key={offset} style={{ position: 'relative', width: CELL, height: 22 }}>
        {/* الجَوف */}
        {inLeave && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              insetInline: 0,
              height: 12,
              background: clip.tone.bg,
              borderBlockStart: `1px solid ${clip.tone.bd}`,
              borderBlockEnd: `1px solid ${clip.tone.bd}`,
              borderInlineStart: isFrom ? `1px solid ${clip.tone.bd}` : undefined,
              borderInlineEnd: isTo ? `1px solid ${clip.tone.bd}` : undefined,
              borderStartStartRadius: isFrom ? 6 : 0,
              borderEndStartRadius: isFrom ? 6 : 0,
              borderStartEndRadius: isTo ? 6 : 0,
              borderEndEndRadius: isTo ? 6 : 0,
            }}
          />
        )}
        {/* شبكة الأيام — خطّ شعري يجعل «سبعة أيام» مقروءاً */}
        <span
          style={{ position: 'absolute', top: 19, insetInlineStart: CELL / 2 - 0.5, width: 1, height: 3, background: 'var(--ws-hairline)' }}
        />
        {/* السنّ — يوم الغياب في المركز */}
        {offset === 0 && (
          <span
            style={{
              position: 'absolute',
              top: 1,
              height: 20,
              width: 5,
              insetInlineStart: CELL / 2 - 2.5,
              borderRadius: 2,
              background: clip.tone.tx,
            }}
          />
        )}
      </span>,
    )
  }

  const title = leave
    ? `${leave.faris_leave_type} · ${leave.start_date.slice(0, 10)} ← ${leave.end_date.slice(0, 10)}` +
      (leave.leave_status !== 'approved' ? ` · ${leave.leave_status === 'pending' ? 'معلّقة' : 'مرفوضة'}!` : '') +
      (clip.gap === 1 ? ' · مطابقة تسامح (±يوم)' : clip.seated ? ' · مطابقة دقيقة' : '')
    : ''

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ display: 'inline-flex', height: 22 }} title={title}>
        {cells}
      </span>
      {leave && (
        <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>
          {leave.faris_leave_type}
          {leave.leave_status === 'pending' && <b style={{ color: TONES.amber.tx }}> · معلّقة</b>}
          {leave.leave_status === 'rejected' && <b style={{ color: TONES.amber.tx }}> · مرفوضة</b>}
          {clip.gap === 1 && leave.leave_status === 'approved' && (
            <span style={{ color: TONES.amber.tx }}> · ±يوم</span>
          )}
        </span>
      )}
    </span>
  )
}

export const SYNC_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  matched: { label: 'مطابق', tone: TONES.green },
  no_leave: { label: 'بلا إجازة', tone: TONES.red },
  pending_leave: { label: 'طلب معلّق', tone: TONES.amber },
}

export function syncStatusMeta(status: string | null): { label: string; tone: Tone } {
  if (!status) return { label: 'غير مزامن', tone: TONES.gray }
  return SYNC_STATUS_META[status] ?? { label: status, tone: TONES.gray }
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  const days = Math.floor(hrs / 24)
  return `منذ ${days} يوم`
}

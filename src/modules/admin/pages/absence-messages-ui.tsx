import { TONES, type Tone } from '@/shared/workspace'

/* ═══════════════════════════════════════════════════════════
   وحدات إدارة رسائل الغياب — «فجوة العِلم»
   المسافة بين لحظة عِلم المدرسة بالغياب ولحظة خروج الخبر إلى الأب.
   مسافةٌ بلا مدىً معلوم، بعضها لا ينتهي أبداً — والصفوف التي لا
   تنتهي هي كل العمل.
   ═══════════════════════════════════════════════════════════ */

export interface AbsenceRow {
  student_id: number
  student_name: string
  student_phone: string | null
  class_session_id: number | null
  attendance_id: number
  approved_at: string | null
  message_sent_at: string | null
  message_created_at: string | null
  message_status: string | null
  error_message: string | null
}

/** الحالة على محور واحد: هل خرج الخبر إلى الأب؟ */
export type GapState = 'sent' | 'failed' | 'unknocked'

export function gapState(row: AbsenceRow): GapState {
  const st = row.message_status
  if (st === 'sent' || st === 'delivered') return 'sent'
  if (st === 'failed') return 'failed'
  // pending / processing / لا صفّ = لم يُطرَق باب الأب بعد
  return 'unknocked'
}

export const STATE_META: Record<GapState, { label: string; tone: Tone }> = {
  sent: { label: 'أُرسل', tone: TONES.green },
  failed: { label: 'لن يُرسَل', tone: TONES.red },
  unknocked: { label: 'لم يُطرَق', tone: TONES.amber },
}

const ms = (iso: string | null): number | null => {
  if (!iso) return null
  const t = new Date(iso.replace(' ', 'T')).getTime()
  return Number.isNaN(t) ? null : t
}

/** لحظة عِلم المدرسة، بالميلي ثانية */
export function originMs(row: AbsenceRow): number | null {
  return ms(row.approved_at) ?? ms(row.message_created_at)
}

/** لحظة خروج الخبر، أو null إن لم يخرج بعد */
export function endMs(row: AbsenceRow): number | null {
  return ms(row.message_sent_at)
}

/** الفجوة بالثواني — المفتوح يقاس إلى الآن وينمو */
export function gapSeconds(row: AbsenceRow, nowMs: number): number {
  const t0 = originMs(row)
  if (t0 == null) return 0
  const t1 = endMs(row)
  return Math.max(0, ((t1 ?? nowMs) - t0) / 1000)
}

export function fmtGap(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} ث`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} د`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs} س ${rem} د` : `${hrs} س`
}

export function fmtClock(iso: string | null): string {
  const t = ms(iso)
  if (t == null) return '—'
  return new Date(t).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

const TRACK = 180

/**
 * ★ لمسة التوقيع: فجوة العِلم
 * سُلّم واحد مشترك (G) بين كل الصفوف — بلا هذا لا معنى للفرز بالطول.
 * أرضية G ≥ ٦٠٠ث شرط صدق لا تجميل: بلا أرضية يومٌ كل فجواته ٣٠ث
 * يُرسم أسوأ صفٍّ شريطاً كاملاً، فيقرأ المدير كارثة حيث لا كارثة.
 */
export function GapCell({
  row,
  scaleSec,
  nowMs,
}: {
  row: AbsenceRow
  /** ثوانٍ لكامل المسار — أطول فجوة في الجدول، بأرضية ٦٠٠ */
  scaleSec: number
  nowMs: number
}) {
  const gap = gapSeconds(row, nowMs)
  const state = gapState(row)
  const len = Math.min(TRACK, (gap / scaleSec) * TRACK)
  const meta = STATE_META[state]

  return (
    <div style={{ position: 'relative', width: 200, height: 34 }} title={`${meta.label} · ${fmtGap(gap)}`}>
      {/* المدرج — شعرة مرجعية بعرض المسار كاملاً */}
      <span
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 17,
          width: TRACK,
          height: 1,
          background: 'var(--ws-border)',
        }}
      />
      {/* علامة المنشأ — خطّ واحد لكل الصفوف: العين تقرأ الانطلاق من نقطة واحدة */}
      <span
        style={{ position: 'absolute', insetInlineStart: 0, top: 12, width: 1, height: 10, background: 'var(--ws-border)' }}
      />

      {/* المسافة */}
      {state === 'failed' ? (
        // لن يُرسَل: لا عقدة، والخطّ يتنقّط ويتلاشى إلى الحافة
        <span
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: 15.5,
            width: len,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(to left, ${TONES.red.tx}, ${TONES.red.tx} 70%, transparent)`,
          }}
        />
      ) : (
        <span
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: 15.5,
            width: len,
            height: 3,
            borderRadius: 2,
            background: state === 'sent' ? TONES.green.tx : TONES.amber.tx,
          }}
        />
      )}

      {/* النهاية — تحمل كل المعنى */}
      {state === 'sent' && (
        // عقدة مصمتة: المسافة مغلقة
        <span
          style={{
            position: 'absolute',
            insetInlineStart: Math.max(0, len - 3.5),
            top: 13.5,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: TONES.green.tx,
          }}
        />
      )}
      {state === 'unknocked' && (
        // حلقة مجوّفة تنبض: مفتوحة، وقد تُغلق
        <span
          className="ws-soft-pulse"
          style={{
            position: 'absolute',
            insetInlineStart: Math.max(0, len - 3.5),
            top: 13.5,
            width: 7,
            height: 7,
            borderRadius: '50%',
            border: `2px solid ${TONES.amber.tx}`,
            background: 'transparent',
          }}
        />
      )}

      {/* السطر السفلي: المدة + التفصيل */}
      <span
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 21,
          fontSize: 9.5,
          color: 'var(--ws-text-2)',
          whiteSpace: 'nowrap',
          maxWidth: 198,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {state === 'sent' && `أُرسل ${fmtClock(row.message_sent_at)} · بعد ${fmtGap(gap)}`}
        {state === 'unknocked' && `منذ ${fmtGap(gap)}…`}
        {state === 'failed' && (row.error_message || 'فشل الإرسال')}
      </span>
    </div>
  )
}

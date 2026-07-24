import { TONES, type Tone } from '@/shared/workspace'
import type { FormSummary } from '@/modules/forms/types'

/* ═══════════════════════════════════════════════════════════
   وحدات النماذج الإلكترونية — «المُغلِق»
   ═══════════════════════════════════════════════════════════ */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * النموذج كائنٌ يُغلق، وله قيدان مستقلّان أيّهما بلغ نهايته أغلقه:
 * الوقت (start_at → end_at) والسعة (submissions_count → max_responses).
 * والخادم يفرض الاثنين معاً: canAcceptSubmission يرفض عند
 * `$total >= $form->max_responses` (FormPublicController:206-213).
 *
 * لا `projected` ولا `t − r`: كلاهما يفترض وصولاً خطّياً للردود لا وجود له
 * (الردود تتكدّس عند الفتح وعند الموعد النهائي)، وهو نِسبةٌ بمقام متحرّك.
 */
export interface Closer {
  /** نصيب النافذة الزمنية المنقضي — null حين لا end_at */
  t: number | null
  /** نصيب السقف الممتلئ — null حين لا max_responses */
  r: number | null
  harvest: number
  ceiling: number | null
  hasClose: boolean
  daysLeft: number | null
  verdict: string
  tone: Tone
  /** هل يحتاج قرار المدير الآن؟ */
  needsDecision: boolean
  /** خارج السباق: مسودة أو مؤرشف — لا مضمار */
  inert: boolean
}

export function buildCloser(form: FormSummary): Closer {
  const originRaw = form.start_at ?? form.created_at
  const origin = new Date(originRaw).getTime()
  const close = form.end_at ? new Date(form.end_at).getTime() : null
  const ceiling = form.max_responses ?? null
  const harvest = form.submissions_count ?? 0
  const fieldsCount = form.fields_count ?? null

  const span = close != null ? close - origin : null
  const now = Date.now()
  const t = span && span > 0 ? clamp01((now - origin) / span) : null
  const r = ceiling ? clamp01(harvest / ceiling) : null
  const daysLeft = close != null ? Math.ceil((close - now) / 86_400_000) : null

  const inert = form.status !== 'published'

  // الحكم — حقائق لا تنبّؤات
  let verdict: string
  let tone: Tone = TONES.gray
  let needsDecision = false

  if (r != null && r >= 1) {
    verdict = 'امتلأ — يردّ أولياء الأمور الآن'
    tone = TONES.amber
    needsDecision = true
  } else if (t != null && t >= 1 && form.status === 'published') {
    verdict = 'انتهى وقته وما زال منشوراً'
    tone = TONES.amber
    needsDecision = true
  } else if (form.status === 'draft' && fieldsCount === 0) {
    verdict = 'بلا أسئلة — لا يمكن نشره'
    tone = TONES.amber
    needsDecision = true
  } else if (form.status === 'published' && t != null && daysLeft != null && daysLeft <= 7 && harvest === 0) {
    // الصفر صفر — لا يحتاج نموذج وصول. هذا ما يفصله عن ادّعاء «متأخّر عن الوتيرة»
    verdict = `يُغلق خلال ${daysLeft} أيام بلا ردّ واحد`
    tone = TONES.amber
    needsDecision = true
  } else if (form.status === 'published') {
    tone = TONES.green
    if (close && !ceiling) verdict = `يُغلق بالوقت · بقي ${daysLeft} يوماً`
    else if (!close && ceiling) verdict = `يُغلق بالامتلاء · بقي ${ceiling - harvest} مقعداً`
    else if (close && ceiling) verdict = `بقي ${daysLeft} يوماً · بقي ${ceiling! - harvest} مقعداً`
    else verdict = 'لا شيء يُغلقه'
  } else if (form.status === 'draft') {
    verdict = fieldsCount != null ? `مسودة · ${fieldsCount} سؤالاً` : 'مسودة'
  } else {
    verdict = 'مؤرشف'
  }

  return { t, r, harvest, ceiling, hasClose: close != null, daysLeft, verdict, tone, needsDecision, inert }
}

/* ★ لمسة التوقيع: المُغلِق — مضمار بمساري الزمن والسعة، وسارية عند الإغلاق */
export function CloserTrack({ closer }: { closer: Closer }) {
  if (closer.inert) {
    return <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>—</span>
  }

  const { t, r, tone, hasClose } = closer

  return (
    <div style={{ position: 'relative', width: 152, height: 30 }}>
      {/* القضيب — يتلاشى حين لا نهاية: الغياب معنى، لا جهل */}
      <span
        style={{
          position: 'absolute',
          insetInline: 0,
          top: 14,
          height: 2,
          borderRadius: 999,
          background: 'var(--ws-border)',
          maskImage: hasClose ? undefined : 'linear-gradient(to left, #000 55%, transparent)',
          WebkitMaskImage: hasClose ? undefined : 'linear-gradient(to left, #000 55%, transparent)',
        }}
      />

      {/* سارية الإغلاق — عند inline-end (اليسار في RTL) */}
      {hasClose && (
        <span
          style={{
            position: 'absolute',
            insetInlineEnd: 0,
            top: 4,
            width: 2,
            height: 22,
            background: 'var(--ws-text-2)',
          }}
        />
      )}

      {/* مسار الزمن — رمادي دائماً: الزمن ركيزة لا حالة */}
      {t != null && (
        <>
          <span
            style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 4,
              height: 8,
              width: `${t * 100}%`,
              background: TONES.gray.bg,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              position: 'absolute',
              insetInlineStart: `calc(${t * 100}% - 2px)`,
              top: 4,
              width: 2,
              height: 8,
              background: TONES.gray.tx,
            }}
          />
        </>
      )}

      {/* مسار السعة — يحمل اللون: هو ما يطلب القرار */}
      {r != null && (
        <>
          <span
            style={{
              position: 'absolute',
              insetInlineStart: 0,
              top: 18,
              height: 8,
              width: `${r * 100}%`,
              background: tone.bg,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              position: 'absolute',
              insetInlineStart: `calc(${r * 100}% - 2px)`,
              top: 18,
              width: 2,
              height: 8,
              background: tone.tx,
            }}
          />
        </>
      )}
    </div>
  )
}

export function closerTitle(closer: Closer): string {
  const parts: string[] = []
  if (closer.t != null) parts.push(`انقضى ${Math.round(closer.t * 100)}٪ من النافذة`)
  if (closer.ceiling != null) parts.push(`${closer.harvest} من ${closer.ceiling} ردّ`)
  else parts.push(`${closer.harvest} ردّ · بلا سقف`)
  parts.push(closer.verdict)
  return parts.join(' · ')
}

export const STATUS_LABELS: Record<FormSummary['status'], string> = {
  draft: 'مسودة',
  published: 'منشور',
  archived: 'مؤرشف',
}

export const STATUS_TONES: Record<FormSummary['status'], Tone> = {
  draft: TONES.gray,
  published: TONES.green,
  archived: TONES.gray,
}

/** ar-SA في كل مكان — لا منسّق en-US موازٍ */
export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'medium' }).format(date)
}

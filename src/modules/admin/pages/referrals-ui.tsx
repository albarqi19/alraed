/* عناصر بصرية مشتركة لعائلة «الإحالات» — عرض فقط، لا منطق

   قاعدة اللون الحاكمة: اللون يقول **موضع الإحالة من دورة الحياة** ولا شيء آخر.
   الشاشة فيها ثلاثة محاور تتنافس (حالة ٧ قيم · نوع ٢ · أولوية ٤) — فالنوع والأولوية
   يخرجان من قناة اللون: النوع يُقال بأيقونة، والأولوية تُقاس بالارتفاع لا تُلوَّن.

   سماوي = عهدة حيّة بيدك · كهرماني = بلا يد، انتظار · بنفسجي = مسار التوجيه البنّاء
   أخضر = أُنجز · أحمر = تجاوُز ولا رجعة · رمادي = محايد/انتهى بلا نتيجة */
import { AlertTriangle, BookOpen } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import type { ReferralPriority, ReferralStatus, ReferralType } from '../referrals/types'

export const STATUS_META: Record<ReferralStatus, { label: string; tone: Tone }> = {
  pending: { label: 'قيد الانتظار', tone: TONES.amber },
  received: { label: 'تم الاستلام', tone: TONES.sky },
  in_progress: { label: 'قيد المعالجة', tone: TONES.sky },
  transferred: { label: 'محوّلة', tone: TONES.amber },
  completed: { label: 'مكتملة', tone: TONES.green },
  closed: { label: 'مغلقة', tone: TONES.gray },
  cancelled: { label: 'ملغاة', tone: TONES.red },
}

export const statusTone = (status: ReferralStatus): Tone => (STATUS_META[status] ?? STATUS_META.pending).tone

/** النوع لا يملك لوناً — شريحته رمادية دائماً وتفرّقها الأيقونة وحدها */
export function TypeChip({ type, label }: { type: ReferralType; label?: string }) {
  const isViolation = type === 'behavioral_violation'
  const Icon = isViolation ? AlertTriangle : BookOpen
  return (
    <span className="ws-chip" style={{ gap: 4 }}>
      <Icon style={{ width: 11, height: 11, color: isViolation ? TONES.red.tx : 'var(--ws-text-2)' }} />
      {label ?? (isViolation ? 'مخالفة سلوكية' : 'ضعف دراسي')}
    </span>
  )
}

const PRIORITY_LEVEL: Record<ReferralPriority, number> = { low: 1, medium: 2, high: 3, urgent: 4 }
const PRIORITY_LABEL: Record<ReferralPriority, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة',
}

/**
 * مقياس الأولوية — نفس هندسة مقياس الحالات الطلابية لكن **رمادي**:
 * الشدّة كمّية فتُقال بالارتفاع، ويبقى محور واحد يشتغل على الألوان (دورة الحياة).
 * الأحمر محجوز لـ«عاجلة» وحدها فيُصدَّق حين يضيء.
 */
export function PriorityMeter({ priority }: { priority: ReferralPriority }) {
  const level = PRIORITY_LEVEL[priority] ?? 2
  const isUrgent = priority === 'urgent'
  return (
    <span
      className={isUrgent ? 'ws-soft-pulse' : undefined}
      title={`الأولوية: ${PRIORITY_LABEL[priority] ?? priority}`}
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}
    >
      {[1, 2, 3, 4].map((step) => (
        <span
          key={step}
          style={{
            width: 4,
            height: 4 + step * 2.5,
            borderRadius: 2,
            background: step <= level
              ? (isUrgent ? TONES.red.tx : 'var(--ws-text-2)')
              : 'var(--ws-border)',
          }}
        />
      ))}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: ReferralPriority }) {
  const isUrgent = priority === 'urgent'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <PriorityMeter priority={priority} />
      <span style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? TONES.red.tx : 'var(--ws-text-2)' }}>
        {PRIORITY_LABEL[priority] ?? priority}
      </span>
    </span>
  )
}

/** «منذ» بالعربية + عدد الأيام للحكم على التعفّن */
export function sinceText(iso?: string | null): { text: string; days: number; hours: number } {
  if (!iso) return { text: '—', days: 0, hours: 0 }
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return { text: '—', days: 0, hours: 0 }
  const diff = Date.now() - then
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor(diff / 60_000)
  if (days >= 1) return { text: `${days} يوم`, days, hours }
  if (hours >= 1) return { text: `${hours} ساعة`, days, hours }
  if (minutes >= 1) return { text: `${minutes} دقيقة`, days, hours }
  return { text: 'الآن', days, hours }
}

/* عتبتا التعفّن: المخالفة السلوكية تتعفّن خلال يومين، والضعف الدراسي خلال أسبوعين */
export const STALE_HOURS: Record<ReferralType, number> = {
  behavioral_violation: 48,
  academic_weakness: 24 * 14,
}

export const isStale = (type: ReferralType, iso?: string | null): boolean => {
  const { hours } = sinceText(iso)
  return hours > (STALE_HOURS[type] ?? 48)
}

interface CustodyProps {
  referredBy?: string | null
  receivedAt?: string | null
  assignedTo?: string | null
  status: ReferralStatus
  type: ReferralType
  createdAt: string
}

/**
 * ★ خط العُهدة — التوقيع.
 * الإحالة ليست صفاً في جدول: هي عُهدة تنتقل بين ثلاث أيدٍ أو تبقى معلّقة في الهواء.
 * ثلاث عقد (المحيل ← الاستلام ← المكلَّف) والفجوة بينها كهرمانية حين لا يد تحملها،
 * وتحتها المدة الحقيقية من received_at و created_at — لا تقدير.
 */
export function CustodyLine({ referredBy, receivedAt, assignedTo, status, type, createdAt }: CustodyProps) {
  const isDone = status === 'completed' || status === 'closed'
  const isCancelled = status === 'cancelled'
  const isHeld = status === 'received' || status === 'in_progress'
  const isWaiting = status === 'pending' || status === 'transferred'

  /* المدة التي تهم: المعلّقة تُقاس من الإحالة، والمستلَمة تُقاس من الاستلام */
  const waitFrom = status === 'pending' ? createdAt : receivedAt ?? createdAt
  const since = sinceText(waitFrom)
  const stale = isWaiting && isStale(type, createdAt)

  const nodeTone = (filled: boolean, tone: Tone): Tone => (filled ? tone : TONES.gray)

  const Node = ({ label, filled, tone, title }: { label: string; filled: boolean; tone: Tone; title: string }) => {
    const t = nodeTone(filled, tone)
    return (
      <span
        title={title}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9.5,
          fontWeight: 800,
          background: filled ? t.bg : 'transparent',
          color: filled ? t.tx : 'var(--ws-text-2)',
          border: `1px ${filled ? 'solid' : 'dashed'} ${filled ? t.bd : 'var(--ws-border)'}`,
          opacity: filled ? 1 : 0.7,
        }}
      >
        {label}
      </span>
    )
  }

  const Link = ({ filled, tone }: { filled: boolean; tone: Tone }) => (
    <span
      style={{
        flex: 1,
        height: 2,
        minWidth: 10,
        borderRadius: 1,
        background: filled ? tone.tx : 'transparent',
        backgroundImage: filled ? undefined : `repeating-linear-gradient(to left, ${TONES.amber.bd} 0 3px, transparent 3px 6px)`,
        opacity: filled ? 0.6 : 1,
      }}
    />
  )

  const endTone = isCancelled ? TONES.red : isDone ? TONES.green : isHeld ? TONES.sky : TONES.amber

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Node label={referredBy?.charAt(0) ?? '؟'} filled={Boolean(referredBy)} tone={TONES.gray} title={`أحالها: ${referredBy ?? 'غير محدد'}`} />
        <Link filled={Boolean(receivedAt)} tone={TONES.sky} />
        <Node
          label="✓"
          filled={Boolean(receivedAt)}
          tone={TONES.sky}
          title={receivedAt ? `استُلمت: ${new Date(receivedAt).toLocaleString('ar-SA')}` : 'لم تُستلم بعد'}
        />
        <Link filled={Boolean(assignedTo)} tone={endTone} />
        <Node
          label={assignedTo?.charAt(0) ?? '؟'}
          filled={Boolean(assignedTo)}
          tone={endTone}
          title={assignedTo ? `المكلَّف: ${assignedTo}` : 'بلا مكلَّف'}
        />
      </span>
      <span style={{ fontSize: 10, color: stale ? TONES.red.tx : 'var(--ws-text-2)', fontWeight: stale ? 700 : 400 }}>
        {isDone ? `أُنجزت` : isCancelled ? 'ألغيت' : isWaiting ? `تنتظر ${since.text}` : `بيد ${assignedTo ?? '—'} منذ ${since.text}`}
      </span>
    </span>
  )
}

export function StatusChip({ status, label }: { status: ReferralStatus; label?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  return <ToneChip tone={meta.tone}>{label ?? meta.label}</ToneChip>
}

/* ══════════════════════════════════════════════════════════
   ★ سلسلة العُهدة — التوقيع
   الإحالة عُهدة تنتقل بين أيدٍ. النظام نفسه يعترف: أنواع مستنداته حرفياً
   إيصالات تسليم (teacher_to_admin · admin_to_counselor). فالعهدة نموذج
   المجال مكتوباً في الشيفرة لا استعارة مستوردة.
   المدد حقيقية من created_at + workflow_logs المحمَّلة أصلاً — صفر نداء جديد.
   ══════════════════════════════════════════════════════════ */

/** أفعال تفتح/تغلق قطعة عُهدة — ما عداها علامات على القطعة الجارية */
const HANDOVER_ACTIONS = new Set([
  'created', 'received', 'assigned', 'transferred', 'completed', 'closed', 'cancelled', 'reopened',
])

export interface CustodyLog {
  id: number | string
  action: string
  action_label?: string
  notes?: string | null
  performed_by?: { id: number; name: string } | null
  created_at: string
}

export interface CustodySegment {
  kind: 'held' | 'gap'
  holder?: string
  startsAt: number
  endsAt: number
  durationMs: number
  open: boolean
  marks: Array<{ id: number | string; action: string; label: string; at: number }>
}

/** مدة بالعربية — «٦ أيام»، «دقيقتان» */
export function humanDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  if (minutes < 1) return 'لحظات'
  if (minutes < 60) return minutes === 1 ? 'دقيقة' : minutes === 2 ? 'دقيقتان' : `${minutes} دقيقة`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعة`
  const days = Math.round(hours / 24)
  return days === 1 ? 'يوم' : days === 2 ? 'يومان' : `${days} أيام`
}

/**
 * يبني سلسلة العهدة من سجل الوقائع.
 * فخّان معالَجان صراحةً:
 *  (١) receive() في الخادم يسجّل received ثم assigned في نفس اللحظة — فتُدمج
 *      أحداث التسليم المتتالية خلال أقل من ثانيتين في تسليم واحد يأخذ حامل الأخير.
 *  (٢) transfer() يضبط assigned_to_user_id = null — فالمحوَّلة فعلاً بلا يد: فجوة لا قطعة.
 */
export function buildCustody(logs: CustodyLog[], createdAt: string, now: number): CustodySegment[] {
  const sorted = [...(logs ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const segments: CustodySegment[] = []

  const makeSegment = (kind: 'held' | 'gap', at: number, holder?: string): CustodySegment => ({
    kind, holder, startsAt: at, endsAt: at, durationMs: 0, open: true, marks: [],
  })

  const closeCurrent = (at: number) => {
    const last = segments[segments.length - 1]
    if (last && last.open) {
      last.endsAt = at
      last.durationMs = Math.max(0, at - last.startsAt)
      last.open = false
    }
  }

  // الإحالة تولد بلا يد
  segments.push(makeSegment('gap', new Date(createdAt).getTime()))

  for (const log of sorted) {
    const at = new Date(log.created_at).getTime()
    const last = segments[segments.length - 1]

    if (!HANDOVER_ACTIONS.has(log.action)) {
      // علامة على القطعة الجارية — لا تفتح قطعة
      last?.marks.push({ id: log.id, action: log.action, label: log.action_label ?? log.action, at })
      continue
    }

    switch (log.action) {
      case 'created':
        break
      case 'received':
      case 'assigned': {
        // دمج أحداث التسليم المتتالية (<2s) في تسليم واحد يأخذ حامل الأخير
        if (last && last.open && last.kind === 'held' && at - last.startsAt < 2000) {
          last.holder = log.performed_by?.name ?? last.holder
          break
        }
        closeCurrent(at)
        segments.push(makeSegment('held', at, log.performed_by?.name))
        break
      }
      case 'transferred':
      case 'reopened':
        closeCurrent(at)
        segments.push(makeSegment('gap', at))
        break
      case 'completed':
      case 'closed':
      case 'cancelled':
        closeCurrent(at)
        break
      default:
        break
    }
  }

  const tail = segments[segments.length - 1]
  if (tail && tail.open) {
    tail.endsAt = now
    tail.durationMs = Math.max(0, now - tail.startsAt)
  }

  return segments.filter((s) => s.durationMs > 0 || s.open)
}

/** جملة الحصيلة فوق الشريط — ما لا تقوله الصفحة اليوم */
export function custodySummary(segments: CustodySegment[], isClosed: boolean): string {
  if (segments.length === 0) return ''
  const total = segments.reduce((sum, s) => sum + s.durationMs, 0)
  const gapMs = segments.filter(s => s.kind === 'gap').reduce((sum, s) => sum + s.durationMs, 0)
  const openGap = segments[segments.length - 1]?.kind === 'gap' && segments[segments.length - 1]?.open

  if (isClosed) {
    return gapMs > 0
      ? `${humanDuration(total)} من الإحالة إلى الإغلاق — منها ${humanDuration(gapMs)} بلا يد`
      : `${humanDuration(total)} من الإحالة إلى الإغلاق`
  }
  if (openGap) return `${humanDuration(total)} منذ الإحالة — بلا يد حتى الآن`
  return gapMs > 0
    ? `${humanDuration(total)} منذ الإحالة — منها ${humanDuration(gapMs)} بلا يد`
    : `${humanDuration(total)} منذ الإحالة`
}

/**
 * شريط السلسلة: العرض ∝ المدة (بحدّ أدنى 44px ثم تناسب في الباقي — نفس علاج
 * الحصص القصيرة في «مسطرة اليوم»)، والمدّة مكتوبة نصّاً دائماً فالتناسب لا يكذب.
 * بلا أرقام سحرية: لا عتبة «متأخر» مخترعة — الفجوة كهرمانية دائماً (انتظار)،
 * والمفتوحة الآن تنبض. الاتهام تحمله النسبة: فجوة ستة أيام تظهر ستة أضعاف فجوة يوم.
 */
export function CustodyChain({
  segments,
  onPickMark,
}: {
  segments: CustodySegment[]
  onPickMark?: (id: number | string) => void
}) {
  if (segments.length === 0) return null

  const MIN_PCT = 8
  const totalMs = segments.reduce((sum, s) => sum + s.durationMs, 0) || 1

  return (
    <span style={{ display: 'flex', alignItems: 'stretch', gap: 3, width: '100%', minHeight: 42 }}>
      {segments.map((seg, index) => {
        const rawPct = (seg.durationMs / totalMs) * 100
        const pct = Math.max(MIN_PCT, rawPct)
        const isGap = seg.kind === 'gap'
        const tone = isGap ? TONES.amber : TONES.sky
        return (
          <span
            key={index}
            className={isGap && seg.open ? 'ws-soft-pulse' : undefined}
            title={
              isGap
                ? `بلا يد — ${humanDuration(seg.durationMs)}${seg.open ? ' (مستمرة)' : ''}`
                : `بيد ${seg.holder ?? '—'} — ${humanDuration(seg.durationMs)}${seg.open ? ' (مستمرة)' : ''}`
            }
            style={{
              flex: `1 1 ${pct}%`,
              minWidth: 44,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 6px',
              borderRadius: 7,
              background: tone.bg,
              border: `1px ${isGap ? 'dashed' : 'solid'} ${tone.bd}`,
              overflow: 'hidden',
              /* الماضي يهدأ بالشفافية لا بتدرّج لوني — فتبقى الأصباغ بمعانيها */
              opacity: seg.open ? 1 : 0.62,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              {!isGap && seg.holder && (
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8.5,
                    fontWeight: 800,
                    background: tone.tx,
                    color: '#fff',
                  }}
                >
                  {seg.holder.charAt(0)}
                </span>
              )}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: tone.tx,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isGap ? 'بلا يد' : seg.holder ?? 'بيد'}
              </span>
            </span>
            <span style={{ fontSize: 9, color: tone.tx, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {humanDuration(seg.durationMs)}
            </span>
            {/* العلامات: السلسلة فهرس للسرد لا تكرار له */}
            {seg.marks.length > 0 && (
              <span style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {seg.marks.slice(0, 6).map((mark) => (
                  <button
                    key={mark.id}
                    type="button"
                    title={mark.label}
                    onClick={() => onPickMark?.(mark.id)}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      border: 'none',
                      padding: 0,
                      cursor: onPickMark ? 'pointer' : 'default',
                      background: tone.tx,
                      opacity: 0.55,
                    }}
                  />
                ))}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

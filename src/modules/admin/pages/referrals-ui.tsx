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

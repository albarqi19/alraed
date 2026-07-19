import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { TONES, type Tone } from '@/shared/workspace'
import type { AdminDashboardStats } from '@/modules/admin/types'

/* ═══════════════════════════════════════════════════════════
   وحدات «نظرة عامة» — طابور الصباح
   ═══════════════════════════════════════════════════════════ */

export type WeekDay = NonNullable<AdminDashboardStats['weekly_attendance']>[number]

/** Y-m-d محلي بلا انجراف UTC — الخادم يصوغ date بتوقيت الرياض (config/app.php) */
export const todayIso = () => new Date().toLocaleDateString('sv-SE')

/**
 * يوم اليوم يُقرأ بمطابقة `date` لا بالفهرس [0].
 * الحلقة في الخادم تتخطى الجمعة والسبت بـcontinue، فيوم الجمعة يكون [0]
 * هو **الخميس الماضي** — أي قراءة من الفهرس صفر تكذب يومين في كل أسبوع.
 */
export function findToday(days: WeekDay[]): WeekDay | null {
  const iso = todayIso()
  return days.find((d) => d.date === iso) ?? null
}

/**
 * الصمت العنيد: عدد الطلاب الذين لم يُرصدوا في **أي** يوم مكتمل هذا الأسبوع.
 *
 * رياضياً: unrecorded(d) = T − recorded(d) بمقام واحد T،
 * إذن min(unrecorded) = T − max(recorded).
 *
 * تُعتمد الكمية ويُرفض تفسيرها: ثلاث حالات تنتجها (مستوردٌ جديد، منسحبٌ ما زال
 * active، فصلٌ بلا معلم) — فالتسمية الصادقة هي وصفها الحرفي بلا اتهام.
 * الاسم هو ما يجعل الرقم صادقاً أو كاذباً، لا الحساب.
 */
export function chronicSilence(days: WeekDay[]): number {
  const completed = days.filter((d) => d.date !== todayIso())
  if (completed.length < 3) return 0
  return Math.min(...completed.map((d) => d.unrecorded_students))
}

/** «حُسب ٧:٠٤ · قبل ٢١ دقيقة» — الصمت المعروض يحمل ساعته */
export function freshnessLabel(generatedAt?: string): string | null {
  if (!generatedAt) return null
  const then = new Date(generatedAt)
  if (Number.isNaN(then.getTime())) return null
  const mins = Math.floor((Date.now() - then.getTime()) / 60000)
  const clock = then.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  if (mins < 1) return `حُسب ${clock} · الآن`
  if (mins === 1) return `حُسب ${clock} · قبل دقيقة`
  if (mins < 60) return `حُسب ${clock} · قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  return `حُسب ${clock} · قبل ${hrs} ساعة`
}

export const arNum = (n: number) => n.toLocaleString('ar-SA')

/* ═══ ★ لمسة التوقيع: طابور الصباح ═══
   انقلاب الحبر — الحبر لا يُصرف إلا على ما لم يُرصد.
   المرصود رمادي صامت، واليوم المكتمل شبكةٌ بلا لون.

   ولماذا لا أخضر لـ«حاضر»: --ws-accent-2 يتبع أساس المظهر النشط
   (ست قيم، منها برتقالي #E8953B في مظهر warm) — فبناء محور دلالي
   على الأخضر يصطدم بالكروم. الطابور لا يرث شيئاً: ألوانه صريحة في
   <rect fill> فينجو تحت المظاهر الستة كلها. */

const SQ = 8
const GAP = 3
const PITCH = SQ + GAP
const MAX_NODES = 2400

interface MorningQueueProps {
  total: number
  recorded: number
  chronic: number
}

export function MorningQueue({ total, recorded, chronic }: MorningQueueProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const per = Math.max(1, Math.ceil(total / MAX_NODES))
  const units = Math.ceil(total / per)
  const cols = Math.max(24, Math.floor((width || 900) / PITCH))
  const rows = Math.ceil(units / cols)
  const height = Math.max(PITCH, rows * PITCH - GAP)

  // التوزيع يحفظ المجموع بلا انجراف تقريب
  const recU = Math.min(Math.round(recorded / per), units)
  const chrU = Math.min(Math.round(chronic / per), Math.max(units - recU, 0))
  const silU = Math.max(units - recU - chrU, 0)

  // الترتيب من اليمين: [رُصد] ثم [لم يُرصد بعد] ثم [صامت الأسبوع] في الذيل.
  // الذيل مقصود: المهشّر يستقرّ في النهاية ولا يتحرّك، فتذوب الصفرة أمامه
  // ويبقى وحده — الحركة تُنتج الاكتشاف بلا شرح.
  const pos = (i: number) => ({
    x: (width || 900) - SQ - (i % cols) * PITCH,
    y: Math.floor(i / cols) * PITCH,
  })

  const cells = (from: number, count: number, fill: string, stroke?: string) => {
    const out = []
    for (let k = 0; k < count; k++) {
      const { x, y } = pos(from + k)
      out.push(
        <rect
          key={from + k}
          x={x}
          y={y}
          width={SQ}
          height={SQ}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 1 : undefined}
        />,
      )
    }
    return out
  }

  return (
    <div ref={hostRef} style={{ width: '100%' }}>
      <svg width={width || '100%'} height={height} shapeRendering="crispEdges" role="img"
        aria-label={`${arNum(recorded)} من ${arNum(total)} رُصدوا · ${arNum(total - recorded)} لم يُرصدوا بعد`}>
        <defs>
          <pattern id="ws-mq-hatch" width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={4} height={4} fill="transparent" />
            <line x1={0} y1={0} x2={0} y2={4} stroke={TONES.gray.tx} strokeWidth={1} opacity={0.55} />
          </pattern>
        </defs>
        {/* رُصد — رمادي مصمت: نطق، أياً كانت حالته */}
        {cells(0, recU, TONES.gray.bd)}
        {/* لم يُرصد بعد — الصمت القابل للإصلاح، يذوب مع الصباح */}
        {cells(recU, silU, TONES.amber.bd)}
        {/* صامت طوال الأسبوع — الصمت العنيد، لا يذوب. تهشير لا لون ثانٍ */}
        {cells(recU + silU, chrU, 'url(#ws-mq-hatch)', TONES.gray.bd)}
      </svg>
    </div>
  )
}

export function QueueLegend({ recorded, silent, chronic, total }: {
  recorded: number
  silent: number
  chronic: number
  total: number
}) {
  const items = [
    { key: 'rec', label: 'رُصد', count: recorded, swatch: <span style={{ width: 11, height: 11, borderRadius: 2, background: TONES.gray.bd, display: 'inline-block' }} /> },
    { key: 'sil', label: 'لم يُرصد بعد', count: silent, swatch: <span style={{ width: 11, height: 11, borderRadius: 2, background: TONES.amber.bd, display: 'inline-block' }} /> },
  ]
  if (chronic > 0) {
    items.push({
      key: 'chr',
      label: 'لم يُرصدوا في أي يوم هذا الأسبوع',
      count: chronic,
      swatch: (
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: 2,
            border: `1px solid ${TONES.gray.bd}`,
            background: `repeating-linear-gradient(45deg, ${TONES.gray.bd} 0 1px, transparent 1px 3px)`,
            display: 'inline-block',
          }}
        />
      ),
    })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10 }}>
      {items.map((it) => (
        <span key={it.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ws-text-2)' }}>
          {it.swatch}
          {it.label}
          <b style={{ color: it.key === 'sil' && it.count > 0 ? TONES.amber.tx : 'var(--ws-text)' }}>{arNum(it.count)}</b>
        </span>
      ))}
      <span style={{ fontSize: 12, color: 'var(--ws-text-2)', marginInlineStart: 'auto' }}>
        من {arNum(total)} طالباً نشطاً
      </span>
    </div>
  )
}

/* ═══ إغناء «حصيلة اليوم» — بطاقات ملوّنة بأوزان متفاوتة ═══
   قاعدة الصفر: القيمة 0 تلبس الرمادي ويقول السياق الخبر السعيد نصاً —
   الصفر لا يلبس أحمر. كل الأرقام أعداد مطلقة ليوم واحد؛ لا نسبة في أي بطاقة. */

/** رقاقة الأيقونة الموحدة — تينت-60: اللون حبرٌ ورقاقة، لا مساحة */
export const chip = (t: Tone) => `color-mix(in srgb, ${t.bd} 60%, #FFFFFF)`

export function todayGreetingLine(): { greeting: string; hijri: string; greg: string } {
  const now = new Date()
  return {
    greeting: now.getHours() < 12 ? 'صباح الخير' : 'مساء الخير',
    hijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now),
    greg: new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' }).format(now),
  }
}

interface DayCardProps {
  icon: LucideIcon
  label: string
  value: number
  tone: Tone
  /** البطل: رقم 40px بدل 32 */
  hero?: boolean
  context?: string
  /** نص الصفر السعيد — عند value===0 تلبس البطاقة الرمادي ويُعرض هذا */
  zeroContext?: string
  spark?: ReactNode
  extra?: ReactNode
  to?: string
}

export function DayCard({ icon: Icon, label, value, tone, hero, context, zeroContext, spark, extra, to }: DayCardProps) {
  const isZero = value === 0
  const t = isZero ? TONES.gray : tone
  const ctx = isZero ? (zeroContext ?? context) : context

  const body = (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        border: `1px solid ${t.bd}`,
        background: 'var(--ws-surface)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: chip(t),
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 16, height: 16, color: t.tx }} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: 'var(--ws-text)' }}>{label}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: hero ? 40 : 32,
            fontWeight: 800,
            lineHeight: 1,
            color: t.tx,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {arNum(value)}
        </span>
        {spark}
      </span>
      {ctx && (
        <span style={{ fontSize: 12, color: 'var(--ws-text-2)', marginTop: 7, lineHeight: 1.45 }}>{ctx}</span>
      )}
      {extra}
    </div>
  )

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
        {body}
      </Link>
    )
  }
  return body
}

/**
 * شرارة أسبوعية — 7 أعمدة بأعداد مطلقة تُقارن بأقصى الأسبوع.
 * لا نِسَب تاريخية أبداً: مقامها الكشفُ الحالي مُسقَطاً على الماضي، وهو مكذوب.
 * الخادم يرسل الأحدث أولاً — فتُعكس زمنياً، واليوم يُطابَق بـdate لا بالفهرس.
 */
export function WeekSpark({ days, field, tone }: { days: WeekDay[]; field: 'absent' | 'late'; tone: Tone }) {
  const chrono = [...days].reverse()
  const max = Math.max(1, ...days.map((d) => d[field]))
  const iso = todayIso()
  return (
    <span
      title="آخر ٧ أيام دراسية"
      style={{ display: 'inline-flex', gap: 4, alignItems: 'flex-end', height: 28, direction: 'ltr', flexShrink: 0 }}
    >
      {chrono.map((d) => (
        <span
          key={d.date}
          title={`${d.day} · ${arNum(d[field])}`}
          style={{
            width: 8,
            borderRadius: 2,
            height: Math.max(3, Math.round((28 * d[field]) / max)),
            background: d.date === iso ? tone.tx : tone.bd,
          }}
        />
      ))}
    </span>
  )
}

/** نبض الأسبوع — فرق مطلق بين اليوم ومتوسط الأيام المكتملة. لا نسبة، لا مقام متحرك */
export function weekPulse(days: WeekDay[], todayAbsent: number): { delta: number } | null {
  const iso = todayIso()
  const completed = days.filter((d) => d.date !== iso)
  if (completed.length < 3) return null
  const avg = Math.round(completed.reduce((s, d) => s + d.absent, 0) / completed.length)
  return { delta: todayAbsent - avg }
}

/**
 * قوس تغطية اليوم — coverage_rate اليومي حصراً: النسبة الصادقة الوحيدة
 * (مقامها كشف اليوم النشط بعد إصلاح الفلتر). ممنوع رسمه لأي يوم ماضٍ.
 */
export function CoverageArc({ rate }: { rate: number }) {
  const r = 24
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, rate))
  const done = clamped >= 100
  const stroke = done ? TONES.green.tx : TONES.amber.tx
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <svg width={56} height={56} role="img" aria-label={`تغطية اليوم ${Math.round(clamped)}٪`}>
        <circle cx={28} cy={28} r={r} fill="none" stroke={TONES.gray.bd} strokeWidth={6} />
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          transform="rotate(-90 28 28)"
        />
        <text x={28} y={32} textAnchor="middle" fontSize={13} fontWeight={800} fill={stroke}>
          {arNum(Math.round(clamped))}٪
        </text>
      </svg>
      <span style={{ fontSize: 11.5, color: done ? TONES.green.tx : 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>
        {done ? 'اكتمل رصد اليوم' : 'تغطية اليوم'}
      </span>
    </span>
  )
}

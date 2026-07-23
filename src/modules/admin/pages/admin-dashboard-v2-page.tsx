import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  GraduationCap,
  MessageSquareQuote,
  Plane,
  Quote,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  UserRoundPlus,
  Users,
  UserX,
  Zap,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════
   نظرة عامة v2 — نموذج بصري خالص (بلا أي ربط خلفي)
   بيانات ثابتة لعرض النمط: بطاقات ناعمة + سباركلاينات + منحنى مساحي
   ═══════════════════════════════════════════════════════════════ */

const DEEP = '#20402C'
const DEEP_2 = '#2A5038'
const INK = '#22301F'
const SUB = '#7C8677'
const LINE = '#EAEDE6'
const CARD = '#FFFFFF'
const PAGE_SHADOW = '0 1px 3px rgba(24, 40, 24, 0.05)'

/* ─── أدوات رسم ─────────────────────────────────────────────── */

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`
  }
  return d
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const W = 130
  const H = 34
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const pts: Array<[number, number]> = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - 4 - ((v - min) / span) * (H - 8),
  ])
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} aria-hidden>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.7} fill={color} />
      ))}
    </svg>
  )
}

function Donut({
  pct,
  size,
  stroke,
  color,
  track = '#E9EEE7',
  children,
}: {
  pct: number
  size: number
  stroke: number
  color: string
  track?: string
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ─── بيانات العرض الثابتة ──────────────────────────────────── */

const KPIS = [
  {
    label: 'إجمالي الطلاب',
    value: '994',
    unit: 'طالب',
    context: 'في جميع المراحل',
    up: true,
    bg: '#EDF6EF',
    ic: '#2E7D46',
    icon: Users,
    spark: [960, 964, 968, 970, 975, 981, 986, 994],
  },
  {
    label: 'الحضور اليوم',
    value: '915',
    unit: 'طالب',
    context: '92.1% من إجمالي الطلاب',
    up: true,
    bg: '#E7F3EB',
    ic: '#2E7D46',
    icon: UserCheck,
    spark: [88, 90, 87, 91, 89, 92, 90, 92],
  },
  {
    label: 'طلاب غائبون اليوم',
    value: '36',
    unit: 'طالب',
    context: '+4 عن أمس',
    up: false,
    bg: '#FBEDED',
    ic: '#C43D3D',
    icon: UserX,
    spark: [30, 33, 29, 35, 31, 34, 32, 36],
  },
  {
    label: 'طلاب متأخرون',
    value: '28',
    unit: 'طالب',
    context: '+5 عن أمس',
    up: false,
    bg: '#FCEFEA',
    ic: '#C05A2E',
    icon: Clock,
    spark: [22, 26, 21, 27, 24, 22, 23, 28],
  },
  {
    label: 'تنبيهات سلوكية',
    value: '7',
    unit: 'تنبيهات',
    context: '-2 عن أمس',
    up: true,
    bg: '#FCF4E4',
    ic: '#B87514',
    icon: ShieldAlert,
    spark: [10, 8, 11, 9, 8, 10, 9, 7],
  },
  {
    label: 'طلبات بانتظار الموافقة',
    value: '12',
    unit: 'طلب',
    context: '+3 عن أمس',
    up: true,
    bg: '#F3EFFA',
    ic: '#6D3FA9',
    icon: ClipboardList,
    spark: [8, 9, 7, 10, 9, 11, 10, 12],
  },
]

const RANGE_DATA: Record<string, number[]> = {
  '14': [78, 74, 80, 76, 82, 78, 74, 80, 77, 83, 79, 81, 77, 92],
  '30': [72, 76, 74, 79, 75, 81, 77, 74, 80, 78, 83, 79, 76, 82, 78],
  '90': [70, 74, 78, 73, 77, 81, 76, 80, 75, 79, 83, 78, 82, 86, 84],
}

const DAY_LABELS = [
  '10 مايو', '11 مايو', '12 مايو', '13 مايو', '14 مايو', '15 مايو', '16 مايو',
  '17 مايو', '18 مايو', '19 مايو', '20 مايو', '21 مايو', '22 مايو', '23 مايو',
]

const SHORTCUTS = [
  { label: 'تسجيل حضور الطلاب', icon: CheckCircle2 },
  { label: 'إضافة طالب جديد', icon: UserRoundPlus },
  { label: 'إرسال إشعار', icon: Send },
  { label: 'جدول الحصص', icon: CalendarDays },
  { label: 'التقارير والإحصائيات', icon: BarChart3 },
]

const STAGES = [
  { label: 'الابتدائية', pct: 42, count: 418, color: '#2E7D46' },
  { label: 'المتوسطة', pct: 31, count: 308, color: '#D9A741' },
  { label: 'الثانوية', pct: 27, count: 268, color: '#9CC7A8' },
]

const ALERTS = [
  {
    title: 'طالب متأخر: سلمان أحمد الشهراني',
    sub: 'الصف الأول ثانوي - أ',
    time: '08:15 ص',
    icon: Clock,
    bg: '#FBEDED',
    ic: '#C43D3D',
  },
  {
    title: 'تنبيه سلوكي: مشادة كلامية بين طالبين',
    sub: 'الصف الثالث متوسط - ج',
    time: '11:20 ص',
    icon: ShieldAlert,
    bg: '#FCF4E4',
    ic: '#B87514',
  },
  {
    title: 'طلب تحويل طالب جديد',
    sub: 'من المدرسة النموذجية',
    time: 'أمس',
    icon: UserPlus,
    bg: '#E7F3EB',
    ic: '#2E7D46',
  },
]

const QUICK_STATS = [
  { label: 'الطلاب الجدد', sub: 'هذا الفصل', value: '56', icon: UserRoundPlus, bg: '#E7F3EB', ic: '#2E7D46' },
  { label: 'طلبات النقل', sub: 'هذا الشهر', value: '23', icon: UserPlus, bg: '#EDF6EF', ic: '#2E7D46' },
  { label: 'الطلاب المتخرجون', sub: 'هذا العام — الموافقة', value: '8', icon: GraduationCap, bg: '#F3EFFA', ic: '#6D3FA9' },
]

const ACTIVITIES = [
  { title: 'اجتماع أولياء الأمور', time: 'الأحد 26 مايو · 04:00 م', icon: Users, bg: '#EDF6EF', ic: '#2E7D46' },
  { title: 'اختبار نهاية الفصل', time: 'من 02 يونيو إلى 06 يونيو', icon: ClipboardList, bg: '#FCF4E4', ic: '#B87514' },
  { title: 'إجازة نهاية العام', time: 'من 20 يونيو إلى 15 أغسطس', icon: Plane, bg: '#E7F3EB', ic: '#2E7D46' },
]

/* ─── لبنات ─────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  borderRadius: 18,
  boxShadow: PAGE_SHADOW,
}

function CardHead({ icon: Icon, title, action, to }: { icon: React.ElementType; title: string; action?: string; to?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 0' }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: '#F2F5F0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 15, height: 15, color: DEEP_2 }} />
      </span>
      <h3 style={{ margin: 0, flex: 1, fontSize: 14.5, fontWeight: 800, color: INK }}>{title}</h3>
      {action && to && (
        <Link to={to} style={{ fontSize: 12, fontWeight: 700, color: DEEP_2, textDecoration: 'none' }}>
          {action}
        </Link>
      )}
    </div>
  )
}

function AttendanceChart() {
  const [range, setRange] = useState<'14' | '30' | '90'>('14')
  const values = RANGE_DATA[range]
  const W = 720
  const H = 250
  const padX = 8
  const padTop = 14
  const padBottom = 30
  const plotH = H - padTop - padBottom
  const pts: Array<[number, number]> = values.map((v, i) => [
    padX + (i / (values.length - 1)) * (W - padX * 2),
    padTop + (1 - v / 100) * plotH,
  ])
  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1][0]} ${H - padBottom} L ${pts[0][0]} ${H - padBottom} Z`
  const labels = range === '14' ? DAY_LABELS : DAY_LABELS.map((_, i) => (i % 2 === 0 ? DAY_LABELS[i] : ''))

  return (
    <section style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: DEEP_2 }} />
        <h3 style={{ margin: 0, flex: 1, fontSize: 14.5, fontWeight: 800, color: INK }}>
          متوسط الحضور: خلال آخر {range} يوم
        </h3>
        <div style={{ display: 'inline-flex', gap: 4, background: '#F2F5F0', borderRadius: 12, padding: 4 }}>
          {(['14', '30', '90'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 9,
                padding: '5px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                background: range === r ? DEEP : 'transparent',
                color: range === r ? '#F4F8F2' : SUB,
              }}
            >
              {r} يوم
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden>
          <defs>
            <linearGradient id="dv2-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3E8E58" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3E8E58" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((g) => {
            const y = padTop + (1 - g / 100) * plotH
            return (
              <g key={g}>
                <line x1={padX} x2={W - padX} y1={y} y2={y} stroke={LINE} strokeWidth={1} strokeDasharray="3 5" />
                <text x={W - padX} y={y - 4} textAnchor="end" fontSize={10} fill={SUB}>
                  {g}%
                </text>
              </g>
            )
          })}
          <path d={area} fill="url(#dv2-area)" />
          <path d={line} fill="none" stroke={DEEP_2} strokeWidth={2.5} strokeLinecap="round" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3} fill="#FFFFFF" stroke={DEEP_2} strokeWidth={2} />
          ))}
          {pts.map(([x], i) =>
            labels[i] ? (
              <text key={`l-${i}`} x={x} y={H - 8} textAnchor="middle" fontSize={9.5} fill={SUB}>
                {labels[i]}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </section>
  )
}

function StudentSpotlight() {
  return (
    <section
      style={{
        background: DEEP,
        borderRadius: 18,
        padding: 16,
        color: '#F4F8F2',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 8px 22px rgba(31, 61, 43, 0.28)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles style={{ width: 16, height: 16, color: '#E8C05B' }} />
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>نظرة على طالب</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: '#E7F3EB',
            color: DEEP,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          أ
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>أحمد خالد العتيبي</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(244,248,242,0.65)' }}>الصف الثاني متوسط - ب</p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            background: 'rgba(232,192,91,0.15)',
            border: '1px solid rgba(232,192,91,0.4)',
            color: '#E8C05B',
            padding: '3px 10px',
            fontSize: 11.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ★ متميز
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6 }}>
        {[
          { pct: 95, text: '95%', label: 'الحضور' },
          { pct: 88, text: '88', label: 'المعدل العام' },
          { pct: 30, text: '4', label: 'ملاحظات' },
        ].map((d) => (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <Donut pct={d.pct} size={62} stroke={6} color="#7FC894" track="rgba(255,255,255,0.14)">
              <b style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>{d.text}</b>
            </Donut>
            <span style={{ fontSize: 11.5, color: 'rgba(244,248,242,0.7)' }}>{d.label}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          borderRadius: 12,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Quote style={{ width: 13, height: 13, color: '#7FC894' }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(244,248,242,0.75)' }}>
            آخر ملاحظة · 20 مايو 2024
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>أداء متميز في مادة الرياضيات.</p>
      </div>

      <button
        type="button"
        style={{
          border: '1px solid rgba(244,248,242,0.35)',
          background: 'transparent',
          color: '#F4F8F2',
          borderRadius: 12,
          padding: '9px 12px',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        عرض الملف الشخصي
        <ArrowUpRight style={{ width: 14, height: 14 }} />
      </button>
    </section>
  )
}

/* ─── الصفحة ────────────────────────────────────────────────── */

export function AdminDashboardV2Page() {
  const admin = useAuthStore((state) => state.user)
  const firstName = (admin?.name ?? 'بك').trim().split(/\s+/)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: INK }}>
      {/* الترحيب + شريط النجاح */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
            مرحبًا {firstName} <span aria-hidden>👋</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: SUB }}>
            إليك نظرة شاملة عن اليوم الدراسي وإحصائيات الطلاب.
          </p>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 280,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderRadius: 14,
            border: '1px solid #CFE6D6',
            background: '#EDF7F0',
            padding: '10px 14px',
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: DEEP_2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 style={{ width: 17, height: 17, color: '#EDF7F0' }} />
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>تم تحديث بيانات الحضور بنجاح</p>
            <p style={{ margin: 0, fontSize: 11.5, color: SUB }}>آخر تحديث: منذ 5 دقائق</p>
          </div>
        </div>
      </div>

      {/* ملخص اليوم */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3E8E58' }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: SUB }}>ملخص اليوم</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        {KPIS.map((k) => {
          const Icon = k.icon
          return (
            <article
              key={k.label}
              style={{
                background: k.bg,
                borderRadius: 18,
                padding: '14px 14px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>{k.label}</span>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: PAGE_SHADOW,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: k.ic }} />
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <b style={{ fontSize: 30, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {k.value}
                </b>
                <span style={{ fontSize: 12, color: SUB }}>{k.unit}</span>
              </div>
              <Spark values={k.spark} color={k.ic} />
              <span style={{ fontSize: 11.5, color: SUB }}>{k.context}</span>
            </article>
          )
        })}
      </div>

      {/* الوسط: المنحنى + نظرة على طالب | العمود الجانبي */}
      <div className="dv2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="dv2-mid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, alignItems: 'stretch' }}>
            <AttendanceChart />
            <StudentSpotlight />
          </div>

          {/* الصف السفلي: التنبيهات + إحصائيات سريعة + الأنشطة */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 14,
              alignItems: 'start',
            }}
          >
            <section style={{ ...cardStyle, paddingBottom: 8 }}>
              <CardHead icon={Bell} title="أحدث التنبيهات" action="عرض جميع التنبيهات ←" to="/admin/app-notifications" />
              <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column' }}>
                {ALERTS.map((a) => {
                  const Icon = a.icon
                  return (
                    <div
                      key={a.title}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '9px 4px',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: a.bg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: 15, height: 15, color: a.ic }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>{a.title}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11.5, color: SUB }}>{a.sub}</p>
                      </div>
                      <span style={{ fontSize: 11, color: SUB, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {a.time}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section style={{ ...cardStyle, paddingBottom: 8 }}>
              <CardHead icon={BarChart3} title="إحصائيات سريعة" />
              <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column' }}>
                {QUICK_STATS.map((q) => {
                  const Icon = q.icon
                  return (
                    <div
                      key={q.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 4px',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: q.bg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: 15, height: 15, color: q.ic }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{q.label}</p>
                        <p style={{ margin: 0, fontSize: 11.5, color: SUB }}>{q.sub}</p>
                      </div>
                      <b style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', color: INK }}>{q.value}</b>
                    </div>
                  )
                })}
              </div>
            </section>

            <section style={{ ...cardStyle, paddingBottom: 8 }}>
              <CardHead icon={CalendarDays} title="الأنشطة القادمة" action="عرض جميع الأنشطة ←" to="/admin/activities" />
              <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column' }}>
                {ACTIVITIES.map((a) => {
                  const Icon = a.icon
                  return (
                    <div
                      key={a.title}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 4px',
                        borderBottom: `1px solid ${LINE}`,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: a.bg,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: 15, height: 15, color: a.ic }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{a.title}</p>
                        <p style={{ margin: 0, fontSize: 11.5, color: SUB }}>{a.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>

        {/* العمود الجانبي */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section style={{ ...cardStyle, paddingBottom: 10 }}>
            <CardHead icon={Zap} title="اختصارات سريعة" />
            <div style={{ padding: '10px 12px 2px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SHORTCUTS.map((sh) => {
                const Icon = sh.icon
                return (
                  <button
                    key={sh.label}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 12,
                      border: `1px solid ${LINE}`,
                      background: '#FBFCFA',
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: 13,
                      fontWeight: 700,
                      color: INK,
                      textAlign: 'start',
                    }}
                  >
                    <Icon style={{ width: 15, height: 15, color: DEEP_2, flexShrink: 0 }} />
                    {sh.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, alignSelf: 'flex-start', fontSize: 14.5, fontWeight: 800 }}>نسبة الحضور العامة</h3>
            <Donut pct={92.1} size={130} stroke={13} color="#3E8E58">
              <b style={{ fontSize: 21, fontVariantNumeric: 'tabular-nums', color: INK }}>92.1%</b>
              <span style={{ fontSize: 11, color: '#3E8E58', fontWeight: 700 }}>ممتاز</span>
            </Donut>
            <p style={{ margin: 0, fontSize: 12, color: SUB, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpRight style={{ width: 13, height: 13, color: '#3E8E58' }} />
              2.7% عن الأسبوع الماضي
            </p>
          </section>

          <section style={{ ...cardStyle, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>التوزيع حسب المرحلة</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const size = 130
                const stroke = 16
                const r = (size - stroke) / 2
                const c = 2 * Math.PI * r
                let acc = 0
                return (
                  <div style={{ position: 'relative', width: size, height: size }}>
                    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
                      {STAGES.map((st) => {
                        const seg = (st.pct / 100) * c
                        const el = (
                          <circle
                            key={st.label}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            stroke={st.color}
                            strokeWidth={stroke}
                            strokeDasharray={`${Math.max(0, seg - 3)} ${c - seg + 3}`}
                            strokeDashoffset={-acc}
                            strokeLinecap="round"
                          />
                        )
                        acc += seg
                        return el
                      })}
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <b style={{ fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>994</b>
                      <span style={{ fontSize: 10.5, color: SUB }}>طالب</span>
                    </div>
                  </div>
                )
              })()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {STAGES.map((st) => (
                <div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: st.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: INK, fontWeight: 600 }}>{st.label}</span>
                  <span style={{ color: SUB, fontVariantNumeric: 'tabular-nums' }}>
                    {st.count} · {st.pct}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              ...cardStyle,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: '#FCF9F0',
              borderColor: '#EFE3C2',
            }}
          >
            <MessageSquareQuote style={{ width: 16, height: 16, color: '#B87514', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#7A6836', lineHeight: 1.7 }}>
              هذه نسخة عرض بصرية ببيانات تجريبية ثابتة — لم يُربط أي رقم فيها بالخادم بعد.
            </p>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dv2-cols { grid-template-columns: 1fr !important; }
          .dv2-mid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

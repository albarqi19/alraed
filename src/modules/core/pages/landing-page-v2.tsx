import {
  ArrowUpLeft,
  BarChart3,
  BellRing,
  CalendarRange,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  ScanLine,
  Send,
  Star,
  Sunrise,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ══════════════════════════════════════════════════════
   نسخة ٢ — «التحريري الفاتح» (Bento Editorial)
   طباعة عربية ضخمة على ورق فاتح + شبكة بطاقات حية،
   كل بطاقة عرض مصغّر يعمل فعلاً. نقيض النسخة الكحلية.
   المعاينة: /landing-v2
   ══════════════════════════════════════════════════════ */

const INK = '#101d30'
const SUB = '#68705f'
const GOLD = '#b98a2e'
const LINE = '#e3ddcd'
const PAPER = '#f7f4ec'
const CARD = '#fffdf8'
const GREEN = '#177a4b'

/* ─── أدوات الحركة ─── */

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: visible ? 'none' : 'translateY(38px)',
        opacity: visible ? 1 : 0,
        transition: `transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function CountUp({ end, suffix = '', duration = 1600 }: { end: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * end))
          if (progress < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [end, duration])

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  )
}

/* عدّاد تنازلي حقيقي لبطاقة الجرس */
function BellCountdown() {
  const [seconds, setSeconds] = useState(4 * 60 + 12)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((current) => (current <= 1 ? 4 * 60 + 12 : current - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <span className="tabular-nums tracking-wider" dir="ltr">
      {mm}:{ss}
    </span>
  )
}

/* ─── البيانات ─── */

const tickerItems = [
  'رُصد حضور ٤٨٢ طالباً هذا الصباح',
  'أُرسلت ٣٧ رسالة واتساب لأولياء الأمور',
  'اكتمل تحضير ٢٤ حصة من ٢٤',
  'صُدّر الغياب إلى نظام نور',
  'وُزّع الانتظار على ٣ معلمين تلقائياً',
]

const modulePills = [
  'الحضور والغياب',
  'رسائل الواتساب',
  'النداء الذكي',
  'الجرس الآلي',
  'النقاط والسلوك',
  'التوجيه الطلابي',
  'متابعة المعلمين',
  'النماذج والتقارير',
  'لوحات المعلومات',
]

const beforeAfter: Array<{ before: string; after: string }> = [
  { before: 'كشوف ورقية تُجمع آخر اليوم', after: 'تحضير رقمي يكتمل قبل ٧:٣٠' },
  { before: 'اتصالات يدوية لكل ولي أمر', after: 'واتساب تلقائي لحظة رصد الغياب' },
  { before: 'جرس يدوي ومواقيت متضاربة', after: 'جرس آلي مبرمج بجدول المدرسة' },
  { before: 'انتظار يُرتَّب بالنداء والاجتهاد', after: 'توزيع انتظار ذكي وعادل بنقرة' },
  { before: 'تقارير تُجهَّز يدوياً لنور', after: 'تصدير جاهز لنظام نور بضغطة' },
]

const portals: Array<{ index: string; title: string; text: string; icon: LucideIcon; items: string[] }> = [
  {
    index: '٠١',
    title: 'الإدارة',
    text: 'لوحة قيادة حيّة: من نسبة الحضور إلى أداء المعلمين — قرارك مبني على رقم، لا على انطباع.',
    icon: LayoutDashboard,
    items: ['لوحات تحكم فورية', 'تقارير تفصيلية', 'إدارة الكوادر', 'صلاحيات دقيقة'],
  },
  {
    index: '٠٢',
    title: 'المعلم',
    text: 'تحضير الفصل بنقرة، نقاط السلوك في مكانها، والتواصل مع ولي الأمر دون مغادرة الحصة.',
    icon: GraduationCap,
    items: ['تحضير بنقرة', 'نقاط وسلوك', 'نماذج رسمية', 'تواصل مباشر'],
  },
  {
    index: '٠٣',
    title: 'ولي الأمر',
    text: 'يعرف قبل أن يسأل: غياب، تأخر، نقاط، ورسائل المدرسة — كلها تصل إليه لحظة حدوثها.',
    icon: Users,
    items: ['تنبيهات فورية', 'سجل الأداء', 'رسائل مباشرة', 'متابعة النقاط'],
  },
]

const callQueueNames = ['فيصل العتيبي — ٦/أ', 'عبدالله القحطاني — ٥/ب', 'سلطان الشهري — ٤/أ', 'خالد الدوسري — ٦/ج', 'ناصر الغامدي — ٣/ب']

const editorialStats: Array<{ end?: number; suffix?: string; raw?: string; label: string; note: string }> = [
  { end: 190, suffix: '+', label: 'ميزة تشغيلية', note: 'تغطي اليوم المدرسي كاملاً' },
  { end: 9, label: 'وحدات متكاملة', note: 'تعمل من قاعدة بيانات واحدة' },
  { end: 3, label: 'واجهات مستخدم', note: 'إدارة ومعلم وولي أمر' },
  { raw: '24/7', label: 'عمل متواصل', note: 'سحابي بنسخ احتياطي دائم' },
  { end: 99, suffix: '%', label: 'استقرار تشغيلي', note: 'موثوقية مثبتة ميدانياً' },
]

/* ─── الصفحة ─── */

export function LandingPageV2() {
  return (
    <div dir="rtl" className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <style>{`
        @keyframes lp2-draw { 0% { stroke-dashoffset: 1; } 45%, 78% { stroke-dashoffset: 0; opacity: 1; } 92%, 100% { stroke-dashoffset: 0; opacity: 0; } }
        @keyframes lp2-marker { 0% { transform: scaleX(0); } 55% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        @keyframes lp2-ticker { 0%, 16% { transform: translateY(0); } 20%, 36% { transform: translateY(-100%); } 40%, 56% { transform: translateY(-200%); } 60%, 76% { transform: translateY(-300%); } 80%, 96% { transform: translateY(-400%); } 100% { transform: translateY(-500%); } }
        @keyframes lp2-queue { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes lp2-typing { 0%, 100% { opacity: 0.25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
        @keyframes lp2-bubble2 { 0%, 42% { opacity: 0; transform: translateY(10px) scale(0.96); } 52%, 88% { opacity: 1; transform: translateY(0) scale(1); } 96%, 100% { opacity: 0; } }
        @keyframes lp2-dots-hide { 0%, 40% { opacity: 1; } 48%, 100% { opacity: 0; } }
        @keyframes lp2-pop { 0%, 70% { opacity: 0; transform: scale(0.4); } 76% { opacity: 1; transform: scale(1.18); } 80%, 92% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
        @keyframes lp2-ring { 0%, 100% { box-shadow: 0 0 0 0 rgba(185,138,46,0.4); } 60% { box-shadow: 0 0 0 10px rgba(185,138,46,0); } }
        @keyframes lp2-fill { 0%, 15% { width: 0%; } 70%, 82% { width: 100%; } 100% { width: 100%; } }
        @keyframes lp2-check { 0%, 78% { opacity: 0; transform: scale(0.5); } 84%, 96% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
        @keyframes lp2-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lp2-bar-grow { from { transform: scaleY(0.2); } to { transform: scaleY(1); } }
        .lp2-marquee-track { animation: lp2-marquee 36s linear infinite; }
        .lp2-marquee:hover .lp2-marquee-track { animation-play-state: paused; }
        .lp2-cell { transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s ease; }
        .lp2-cell:hover { transform: translateY(-6px); box-shadow: 0 30px 60px -30px rgba(16,29,48,0.25); }
        @media (prefers-reduced-motion: reduce) {
          [class*="lp2-"], .lp2-marquee-track { animation: none !important; }
        }
      `}</style>

      {/* ══ الشريط العلوي ══ */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: LINE, background: 'rgba(247,244,236,0.88)', backdropFilter: 'blur(14px)' }}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-black text-white" style={{ background: INK }}>
              ر
            </span>
            <div className="leading-none">
              <div className="text-[16px] font-black" style={{ color: INK }}>الرائد</div>
              <div className="mt-1 text-[9.5px] font-bold tracking-[0.18em]" style={{ color: SUB }}>نظام الإدارة المدرسية</div>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-[13.5px] font-bold lg:flex" style={{ color: '#3d485c' }}>
            <a href="#bento" className="transition-colors hover:text-black">النظام حيّاً</a>
            <a href="#compare" className="transition-colors hover:text-black">قبل وبعد</a>
            <a href="#portals2" className="transition-colors hover:text-black">الواجهات</a>
            <Link to="/plans" className="transition-colors hover:text-black">الأسعار</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth/teacher"
              className="hidden rounded-full px-4 py-2 text-[13px] font-bold transition-colors hover:bg-black/5 sm:inline-flex"
              style={{ color: INK }}
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-black text-white transition-transform hover:scale-[1.03]"
              style={{ background: INK }}
            >
              ابدأ مجاناً
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ══ الهيرو الطباعي ══ */}
      <section className="relative overflow-hidden">
        {/* علامة مائية */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-8 select-none text-[26vw] font-black leading-none opacity-[0.045]"
          style={{ color: 'transparent', WebkitTextStroke: `2px ${INK}` }}
        >
          الرائد
        </div>

        <div className="relative mx-auto max-w-[1280px] px-5 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
          <Reveal>
            <div className="flex items-center gap-3 text-[12.5px] font-black tracking-wide" style={{ color: GOLD }}>
              <span className="h-px w-10" style={{ background: GOLD }} />
              منظومة سعودية للإدارة المدرسية
            </div>
          </Reveal>

          <Reveal delay={100}>
            <h1
              className="mt-6 max-w-[17ch] text-[13vw] font-black leading-[1.08] tracking-tight sm:text-7xl lg:text-[92px]"
              style={{ color: INK }}
            >
              مدرسةٌ تُدار
              <br />
              <span className="relative inline-block">
                بدقّة السّاعة
                <span
                  aria-hidden
                  className="absolute bottom-2 right-0 -z-10 h-[0.28em] w-full origin-right rounded-sm lg:bottom-3"
                  style={{ background: 'rgba(215,167,74,0.38)', animation: 'lp2-marker 1.6s cubic-bezier(0.16,1,0.3,1) forwards' }}
                />
              </span>
              <span style={{ color: GOLD }}>.</span>
            </h1>
          </Reveal>

          <div className="mt-10 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <Reveal delay={200}>
              <p className="max-w-[46ch] text-[15.5px] font-medium leading-8" style={{ color: '#4c5568' }}>
                الحضور يُرصد، أولياء الأمور يُبلَّغون، الجرس يدق، والتقارير تكتب نفسها.
                <span className="font-black" style={{ color: INK }}> نظام الرائد</span> يدير التفاصيل — وأنت تدير المدرسة.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-[15px] font-black text-white shadow-[0_18px_40px_-16px_rgba(16,29,48,0.55)] transition-transform hover:scale-[1.03]"
                  style={{ background: INK }}
                >
                  جرّب النظام مجاناً
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 rounded-full border px-8 py-4 text-[15px] font-bold transition-colors hover:bg-black/5"
                  style={{ borderColor: '#c9c2ae', color: INK }}
                >
                  استعرض الباقات
                </Link>
              </div>

              <Link
                to="/story"
                className="group mt-6 inline-flex items-center gap-2.5 text-[13.5px] font-black transition-opacity hover:opacity-75"
                style={{ color: GOLD }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full border" style={{ borderColor: '#e0cfa6', background: '#fbf4e4' }}>
                  <Sunrise className="h-4 w-4" />
                </span>
                عِش قصة يوم مدرسي كامل مع الرائد — من الفجر إلى الليل
                <ArrowUpLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Reveal>

            {/* شريط الأحداث الحي */}
            <Reveal delay={300}>
              <div
                className="flex w-fit items-center gap-3 rounded-full border py-2 pl-5 pr-2 text-[12.5px] font-bold"
                style={{ borderColor: LINE, background: CARD, color: '#4c5568' }}
              >
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#e8f4ec', color: GREEN }}>
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-60" style={{ background: GREEN }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN }} />
                </span>
                <div className="h-[20px] overflow-hidden">
                  <div style={{ animation: 'lp2-ticker 15s steps(1) infinite' }}>
                    {[...tickerItems, tickerItems[0]].map((item, index) => (
                      <div key={index} className="flex h-[20px] items-center whitespace-nowrap">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ شبكة البنتو — النظام حيّاً ══ */}
      <section id="bento" className="mx-auto max-w-[1280px] px-5 pb-20 lg:px-8">
        <Reveal>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: INK }}>
              ليست شعارات — <span style={{ color: GOLD }}>هذا النظام يعمل أمامك</span>
            </h2>
            <span className="hidden shrink-0 text-[12px] font-bold lg:block" style={{ color: SUB }}>
              عروض حيّة مصغّرة ↓
            </span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {/* ١ — الحضور المباشر (كبيرة) */}
          <Reveal className="sm:col-span-2 lg:col-span-5" delay={0}>
            <div className="lp2-cell flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: LINE, background: CARD }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: INK }}>
                  <ClipboardCheck className="h-4 w-4" style={{ color: GOLD }} />
                  الحضور اليوم
                </span>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: '#e8f4ec', color: GREEN }}>
                  مباشر
                </span>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tight" style={{ color: INK }}>
                  <CountUp end={96} suffix="%" />
                </span>
                <span className="text-[12px] font-bold" style={{ color: SUB }}>نسبة حضور المدرسة</span>
              </div>

              {/* منحنى يرسم نفسه */}
              <svg viewBox="0 0 300 80" className="mt-4 w-full" fill="none">
                <path
                  d="M2 62 C40 58 55 40 85 44 C115 48 130 24 165 28 C200 32 215 14 250 18 C270 20 285 12 298 10"
                  stroke={GOLD}
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{ strokeDasharray: 1, animation: 'lp2-draw 7s ease-in-out infinite' }}
                />
                <path
                  d="M2 62 C40 58 55 40 85 44 C115 48 130 24 165 28 C200 32 215 14 250 18 C270 20 285 12 298 10"
                  stroke={INK}
                  strokeOpacity="0.08"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              {/* أعمدة الأسبوع */}
              <div className="mt-auto flex items-end justify-between gap-2 border-t pt-4" style={{ borderColor: LINE }}>
                {[
                  { day: 'الأحد', height: 34 },
                  { day: 'الإثنين', height: 42 },
                  { day: 'الثلاثاء', height: 38 },
                  { day: 'الأربعاء', height: 46 },
                  { day: 'الخميس', height: 40 },
                ].map(({ day, height }, index) => (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full origin-bottom rounded-t-md"
                      style={{
                        height,
                        background: index === 3 ? GOLD : '#e7dfcb',
                        animation: `lp2-bar-grow 0.9s cubic-bezier(0.16,1,0.3,1) ${index * 0.1}s both`,
                      }}
                    />
                    <span className="text-[9px] font-bold" style={{ color: SUB }}>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ٢ — واتساب يكتب */}
          <Reveal className="lg:col-span-4" delay={80}>
            <div className="lp2-cell flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: LINE, background: CARD }}>
              <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: INK }}>
                <MessageCircle className="h-4 w-4" style={{ color: '#1faa59' }} />
                واتساب تلقائي
              </span>

              <div className="mt-4 flex flex-1 flex-col justify-center gap-2.5">
                {/* فقاعة النظام */}
                <div className="max-w-[85%] self-start rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[12px] font-semibold leading-5 text-white" style={{ background: '#128c5e' }}>
                  تنبيه غياب: ابنكم <b>خالد</b> لم يحضر اليوم الأربعاء.
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-white/70">
                    7:31 ص
                    <CheckCheck className="h-3 w-3" />
                  </div>
                </div>

                {/* نقاط الكتابة ثم الرد */}
                <div className="relative min-h-[52px]">
                  <div
                    className="absolute right-auto left-0 flex w-14 items-center justify-center gap-1 rounded-2xl rounded-tl-md border px-3 py-3"
                    style={{ borderColor: LINE, background: '#f3efe4', animation: 'lp2-dots-hide 9s ease infinite' }}
                  >
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: '#9b9276', animation: `lp2-typing 1s ease ${dot * 0.18}s infinite` }}
                      />
                    ))}
                  </div>
                  <div
                    className="max-w-[85%] rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[12px] font-semibold leading-5"
                    style={{ borderColor: LINE, background: '#f3efe4', color: '#3d3a30', animation: 'lp2-bubble2 9s ease infinite', marginLeft: 0, marginRight: 'auto' }}
                  >
                    جزاكم الله خيراً — سيصلكم عذر الغياب اليوم 🙏
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t pt-3 text-[11px] font-bold" style={{ borderColor: LINE, color: SUB }}>
                غياب، تأخر، استئذان، ورسائل جماعية — كلها آلية
              </div>
            </div>
          </Reveal>

          {/* ٣ — الجرس الآلي (عدّاد حقيقي) */}
          <Reveal className="lg:col-span-3" delay={160}>
            <div className="lp2-cell flex h-full flex-col items-center justify-center rounded-3xl border p-6 text-center" style={{ borderColor: LINE, background: INK }}>
              <span
                className="grid h-12 w-12 place-items-center rounded-full"
                style={{ background: 'rgba(215,167,74,0.15)', color: '#e9c579', animation: 'lp2-ring 2.4s ease-out infinite' }}
              >
                <BellRing className="h-5 w-5" />
              </span>
              <div className="mt-4 text-[11px] font-bold text-white/55">الحصة الثالثة تبدأ بعد</div>
              <div className="mt-1 text-4xl font-black text-white">
                <BellCountdown />
              </div>
              <div className="mt-4 border-t border-white/10 pt-3 text-[10.5px] font-bold leading-5 text-white/45">
                جرس آلي يتبع جدول مدرستك
                <br />
                شتاءً وصيفاً ورمضان
              </div>
            </div>
          </Reveal>

          {/* ٤ — النداء الذكي (طابور جارٍ) */}
          <Reveal className="lg:col-span-3" delay={0}>
            <div className="lp2-cell flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: LINE, background: CARD }}>
              <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: INK }}>
                <Megaphone className="h-4 w-4" style={{ color: GOLD }} />
                النداء الذكي
              </span>
              <div className="relative mt-4 h-[132px] flex-1 overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(${CARD}, transparent)` }} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6" style={{ backgroundImage: `linear-gradient(transparent, ${CARD})` }} />
                <div style={{ animation: 'lp2-queue 12s linear infinite' }}>
                  {[...callQueueNames, ...callQueueNames].map((name, index) => (
                    <div
                      key={`${name}-${index}`}
                      className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-[11.5px] font-bold"
                      style={{ borderColor: LINE, background: '#faf7ef', color: '#3d485c' }}
                    >
                      {name}
                      <Megaphone className="h-3 w-3" style={{ color: '#c8b98e' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 border-t pt-3 text-[11px] font-bold" style={{ borderColor: LINE, color: SUB }}>
                خروج منظم شاشةً وصوتاً — دون تزاحم
              </div>
            </div>
          </Reveal>

          {/* ٥ — النقاط والسلوك */}
          <Reveal className="lg:col-span-4" delay={80}>
            <div className="lp2-cell flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: LINE, background: CARD }}>
              <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: INK }}>
                <Star className="h-4 w-4" style={{ color: GOLD }} />
                النقاط والسلوك
              </span>
              <div className="relative mt-5 flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-black" style={{ color: INK }}>
                    <CountUp end={1284} duration={2000} />
                  </div>
                  <div className="mt-1 text-[11px] font-bold" style={{ color: SUB }}>نقطة وُزّعت هذا الأسبوع</div>
                </div>
                {[
                  { label: '+5 مشاركة', top: '4%', right: '2%', delay: '0s' },
                  { label: '+3 واجب', top: '58%', right: '76%', delay: '-3s' },
                  { label: '+10 تميّز', top: '70%', right: '6%', delay: '-6s' },
                ].map(({ label, top, right, delay }) => (
                  <span
                    key={label}
                    className="absolute rounded-full border px-2.5 py-1 text-[10px] font-black"
                    style={{ top, right, borderColor: '#e6d3a8', background: '#fdf6e3', color: GOLD, animation: `lp2-pop 9s ease ${delay} infinite` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-3 border-t pt-3 text-[11px] font-bold" style={{ borderColor: LINE, color: SUB }}>
                برنامج نقاطي متكامل يحفّز الطلاب ويوثّق السلوك
              </div>
            </div>
          </Reveal>

          {/* ٦ — تصدير نور */}
          <Reveal className="lg:col-span-5" delay={160}>
            <div className="lp2-cell flex h-full flex-col rounded-3xl border p-6" style={{ borderColor: LINE, background: CARD }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-black" style={{ color: INK }}>
                  <ScanLine className="h-4 w-4" style={{ color: GOLD }} />
                  التكامل مع نظام نور
                </span>
                <span className="relative">
                  <CheckCircle2 className="h-5 w-5" style={{ color: GREEN, animation: 'lp2-check 6s ease infinite' }} />
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { label: 'تجهيز غياب اليوم', width: '100%' },
                  { label: 'مطابقة سجلات الطلاب', width: '100%' },
                  { label: 'ملف نور جاهز للتصدير', width: '100%' },
                ].map(({ label }, index) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold" style={{ color: '#4c5568' }}>
                      {label}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: '#ece5d2' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ background: index === 2 ? GREEN : GOLD, animation: `lp2-fill 6s ease ${index * 0.35}s infinite` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-4 border-t pt-4 text-[11px] font-bold" style={{ borderColor: LINE, color: SUB }}>
                <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" style={{ color: GOLD }} /> استيراد جدول مدرستي</span>
                <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" style={{ color: GOLD }} /> ربط مع فارس</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ شريط الوحدات ══ */}
      <div className="lp2-marquee overflow-hidden border-y py-5" style={{ borderColor: LINE }} dir="ltr">
        <div className="lp2-marquee-track flex w-max items-center gap-8 pr-8">
          {[...modulePills, ...modulePills].map((name, index) => (
            <span key={`${name}-${index}`} dir="rtl" className="flex shrink-0 items-center gap-3 text-2xl font-black tracking-tight" style={{ color: index % 2 ? '#d4c9ac' : INK }}>
              {name}
              <span className="text-lg" style={{ color: GOLD }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══ قبل / بعد ══ */}
      <section id="compare" className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8">
        <Reveal>
          <h2 className="max-w-[24ch] text-3xl font-black leading-snug tracking-tight sm:text-4xl" style={{ color: INK }}>
            الفرق ليس في البرنامج —
            <span style={{ color: GOLD }}> الفرق في يومك</span>
          </h2>
        </Reveal>

        <div className="mt-10 overflow-hidden rounded-3xl border" style={{ borderColor: LINE, background: CARD }}>
          <div className="grid grid-cols-2 border-b text-center text-[13px] font-black" style={{ borderColor: LINE }}>
            <div className="border-l px-4 py-4" style={{ borderColor: LINE, color: '#a8493f', background: '#faf1ec' }}>
              قبل الرائد
            </div>
            <div className="px-4 py-4" style={{ color: GREEN, background: '#eef6ef' }}>
              مع الرائد
            </div>
          </div>
          {beforeAfter.map(({ before, after }, index) => (
            <Reveal key={before} delay={index * 70}>
              <div className="grid grid-cols-2 border-b last:border-b-0" style={{ borderColor: '#efe9da' }}>
                <div className="flex items-center gap-2.5 border-l px-4 py-4 text-[12.5px] font-semibold sm:px-6" style={{ borderColor: '#efe9da', color: '#8a8272' }}>
                  <X className="h-3.5 w-3.5 shrink-0" style={{ color: '#c96d5f' }} />
                  <span className="line-through decoration-[#c96d5f]/40 decoration-2">{before}</span>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-4 text-[12.5px] font-black sm:px-6" style={{ color: INK }}>
                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: GREEN }} />
                  {after}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ الأرقام التحريرية ══ */}
      <section className="border-y" style={{ borderColor: LINE, background: '#f2eee2' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-8 gap-y-10 px-5 py-14 sm:grid-cols-3 lg:grid-cols-5 lg:px-8">
          {editorialStats.map(({ end, suffix, raw, label, note }, index) => (
            <Reveal key={label} delay={index * 80}>
              <div className="border-t-2 pt-4" style={{ borderColor: index === 0 ? GOLD : '#d8d0ba' }}>
                <div className="text-5xl font-black tracking-tight" style={{ color: INK }}>
                  {raw ?? <CountUp end={end!} suffix={suffix ?? ''} />}
                </div>
                <div className="mt-2 text-[13px] font-black" style={{ color: '#3d485c' }}>{label}</div>
                <div className="mt-0.5 text-[11px] font-semibold leading-5" style={{ color: SUB }}>{note}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ الواجهات الثلاث ══ */}
      <section id="portals2" className="mx-auto max-w-[1280px] px-5 py-20 lg:px-8">
        <Reveal>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: INK }}>
              ثلاث واجهات — <span style={{ color: GOLD }}>حقيقة واحدة</span>
            </h2>
            <p className="max-w-[38ch] text-[13px] font-semibold leading-6" style={{ color: SUB }}>
              الكل يرى نفس البيانات الحيّة، كلٌ من زاويته — لا نسخ ولا تعارض ولا «أرسل لي الملف».
            </p>
          </div>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-3">
          {portals.map(({ index, title, text, icon: Icon, items }, cardIndex) => (
            <Reveal key={title} delay={cardIndex * 110}>
              <article className="lp2-cell group flex h-full flex-col rounded-3xl border p-7" style={{ borderColor: LINE, background: CARD }}>
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-black" style={{ color: '#e4dbc2' }}>{index}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl transition-colors" style={{ background: '#f2ecdb', color: GOLD }}>
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black" style={{ color: INK }}>{title}</h3>
                <p className="mt-2 text-[13px] font-medium leading-7" style={{ color: '#5b6474' }}>{text}</p>
                <div className="mt-5 flex flex-wrap gap-1.5 border-t pt-5" style={{ borderColor: '#efe9da' }}>
                  {items.map((item) => (
                    <span key={item} className="rounded-full border px-2.5 py-1 text-[10.5px] font-bold" style={{ borderColor: '#e7dfc9', color: '#6d6550' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* شريط أدوار صغير */}
        <Reveal delay={140}>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border px-6 py-4 text-[12px] font-bold" style={{ borderColor: LINE, background: '#f2eee2', color: '#6d6550' }}>
            <span className="font-black" style={{ color: INK }}>وتشمل أيضاً:</span>
            {['وكيل شؤون المعلمين', 'وكيل شؤون الطلاب', 'رائد النشاط', 'الموجه الطلابي', 'الإداري'].map((role) => (
              <span key={role} className="flex items-center gap-1.5">
                <Fingerprint className="h-3 w-3" style={{ color: GOLD }} />
                {role}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══ الدعوة الختامية ══ */}
      <section className="relative overflow-hidden" style={{ background: INK }}>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 left-0 select-none text-[22vw] font-black leading-none opacity-[0.06]"
          style={{ color: 'transparent', WebkitTextStroke: '2px #f7f4ec' }}
        >
          الرائد
        </div>
        <div className="relative mx-auto max-w-[1280px] px-5 py-24 text-center lg:px-8">
          <Reveal>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11.5px] font-black text-[#e9c579]">
              <Clock3 className="h-3.5 w-3.5" />
              الإعداد يستغرق يوماً واحداً
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mx-auto mt-6 max-w-[16ch] text-5xl font-black leading-[1.15] tracking-tight text-white sm:text-6xl">
              ابدأ غداً صباحاً<span style={{ color: GOLD }}>.</span>
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto mt-5 max-w-[44ch] text-[14.5px] font-medium leading-8 text-white/60">
              سجّل مدرستك اليوم، ارفع بيانات الطلاب، وليكن أول جرس غدٍ آلياً —
              وأول رسالة غياب تصل ولي الأمر قبل الساعة ٧:٣٠.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full px-9 py-4 text-[15px] font-black transition-transform hover:scale-[1.04]"
                style={{ background: '#d7a74a', color: '#14263f', boxShadow: '0 20px 50px -18px rgba(215,167,74,0.55)' }}
              >
                سجّل مدرستك مجاناً
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/auth/admin"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-9 py-4 text-[15px] font-bold text-white/85 transition-colors hover:bg-white/10"
              >
                دخول الإدارة
              </Link>
            </div>
          </Reveal>

          <Reveal delay={330}>
            <div className="mx-auto mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11.5px] font-bold text-white/40">
              {[
                { label: 'أمان ونسخ احتياطي دائم', icon: Send },
                { label: 'دعم فني سريع', icon: Users },
                { label: 'تحديثات مستمرة', icon: BarChart3 },
                { label: 'بدون التزام — جرّب أولاً', icon: CheckCircle2 },
              ].map(({ label, icon: Icon }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" style={{ color: '#c9a75f' }} />
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* الفوتر */}
        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-5 py-6 text-[12px] font-semibold text-white/45 sm:flex-row lg:px-8">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full text-[12px] font-black" style={{ background: '#d7a74a', color: '#14263f' }}>
                ر
              </span>
              <span className="font-black text-white/75">نظام الرائد</span>
              للإدارة المدرسية
            </div>
            <div className="flex items-center gap-5">
              <a href="#bento" className="transition-colors hover:text-white">النظام حيّاً</a>
              <Link to="/plans" className="transition-colors hover:text-white">الأسعار</Link>
              <Link to="/auth/teacher" className="transition-colors hover:text-white">دخول المعلمين</Link>
            </div>
            <div>© {new Date().getFullYear()} جميع الحقوق محفوظة</div>
          </div>
        </div>
      </section>
    </div>
  )
}

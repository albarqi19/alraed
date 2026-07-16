import {
  ArrowDown,
  ArrowUpLeft,
  BellRing,
  CalendarCheck2,
  Check,
  CheckCheck,
  ClipboardCheck,
  CloudUpload,
  FileText,
  Megaphone,
  MessageCircle,
  Moon,
  RefreshCcw,
  ShieldCheck,
  Sunrise,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ══════════════════════════════════════════════════════
   نسخة ٣ — «رحلة سماء» (Scroll Cinema)
   الصفحة قصّة يوم مدرسي كامل: السماء تتبدل من الفجر إلى
   الليل مع التمرير، والشمس تعبر القبة ثم يطلع القمر.
   كل فصل = لحظة من اليوم + مشهد حي مصغّر.
   المعاينة: /landing-v3
   ══════════════════════════════════════════════════════ */

type Tone = 'light' | 'dark'

interface Chapter {
  id: string
  time: string
  clock: string
  title: string
  text: string
  tone: Tone
  sky: string
  icon: LucideIcon
}

const chapters: Chapter[] = [
  {
    id: 'ch-dawn',
    time: 'قبل الفجر',
    clock: '٥:٤٠ ص',
    title: 'قبل أن يستيقظ أحد',
    text: 'المدرسة ما زالت نائمة — لكن جداول اليوم، وخطة الإشراف، ومواقيت الجرس جاهزة منذ الليل.',
    tone: 'light',
    sky: 'linear-gradient(180deg,#10163a 0%,#272457 45%,#6e4560 75%,#c17346 100%)',
    icon: Moon,
  },
  {
    id: 'ch-sunrise',
    time: '٦:٣٠ صباحاً',
    clock: '٦:٣٠ ص',
    title: 'اليوم يبدأ جاهزاً',
    text: 'مع أول ضوء: الانتظار موزّع، الإشراف اليومي معلن، والجرس الآلي مضبوط على جدول اليوم — دون أن يلمس أحدٌ شيئاً.',
    tone: 'light',
    sky: 'linear-gradient(180deg,#31406f 0%,#5c5c96 40%,#d5885a 78%,#f3b571 100%)',
    icon: Sunrise,
  },
  {
    id: 'ch-attendance',
    time: '٧:١٥ صباحاً',
    clock: '٧:١٥ ص',
    title: 'التحضير يكتمل قبل الطابور',
    text: 'كل معلم يحضّر فصله بنقرة — أو يمسح الطلاب بالباركود عند البوابة. الإدارة ترى النسبة ترتفع لحظياً على الشاشة.',
    tone: 'dark',
    sky: 'linear-gradient(180deg,#79aede 0%,#b3d5f1 55%,#e8f3fb 100%)',
    icon: ClipboardCheck,
  },
  {
    id: 'ch-whatsapp',
    time: '٧:٣١ صباحاً',
    clock: '٧:٣١ ص',
    title: 'أولياء الأمور يعرفون أولاً',
    text: 'دقيقة واحدة بعد إغلاق الرصد: رسائل واتساب آلية بالغياب والتأخر تصل — قبل أن يرن هاتف الإدارة بسؤال.',
    tone: 'dark',
    sky: 'linear-gradient(180deg,#5da2dd 0%,#a5cdf0 55%,#e0effa 100%)',
    icon: MessageCircle,
  },
  {
    id: 'ch-standby',
    time: '٩:٤٠ صباحاً',
    clock: '٩:٤٠ ص',
    title: 'معلم غائب؟ الحصة لن تضيع',
    text: 'الانتظار الذكي يرشّح البديل الأنسب حسب العدالة والجدول، ويبلغه فوراً — الفصل لا يبقى دقيقة بلا معلم.',
    tone: 'dark',
    sky: 'linear-gradient(180deg,#4b93d8 0%,#9cc8ee 55%,#ddeefa 100%)',
    icon: RefreshCcw,
  },
  {
    id: 'ch-dismissal',
    time: '١:٣٠ ظهراً',
    clock: '١:٣٠ م',
    title: 'انصرافٌ بلا فوضى',
    text: 'النداء الذكي يعرض أسماء الطلاب شاشةً وصوتاً فور وصول ذويهم — خروج هادئ ومنظم حتى آخر طالب.',
    tone: 'dark',
    sky: 'linear-gradient(180deg,#74a7da 0%,#c7d8ea 45%,#f5d7a5 100%)',
    icon: Megaphone,
  },
  {
    id: 'ch-reports',
    time: '٢:٣٠ ظهراً',
    clock: '٢:٣٠ م',
    title: 'التقارير تكتب نفسها',
    text: 'ملخص اليوم كاملاً بين يدي المدير: حضور، تأخر، سلوك، ورسائل — وملف الغياب جاهز للتصدير إلى نور بضغطة.',
    tone: 'light',
    sky: 'linear-gradient(180deg,#66799f 0%,#bc8670 55%,#ee9f5f 82%,#f6cf92 100%)',
    icon: FileText,
  },
  {
    id: 'ch-night',
    time: 'بعد منتصف الليل',
    clock: '١٢:٠٠ ل',
    title: 'المدرسة نامت... والرائد يسهر',
    text: 'نسخ احتياطي لبياناتك، تجهيز جداول الغد، ومزامنة كل شيء — ليستقبلك صباحٌ جاهز كهذا الصباح.',
    tone: 'light',
    sky: 'linear-gradient(180deg,#070c26 0%,#111740 55%,#1b2452 100%)',
    icon: ShieldCheck,
  },
]

/* ─── مساعدات ─── */

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
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
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: visible ? 'none' : 'translateY(40px)',
        opacity: visible ? 1 : 0,
        transition: `transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, opacity 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── محرك الشمس: موضع ولون متصلان مع كل بكسل تمرير ─── */

type Rgb = [number, number, number]
const SUN_DAWN: Rgb = [242, 163, 92]
const SUN_NOON: Rgb = [255, 216, 110]
const SUN_SET: Rgb = [240, 140, 76]

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function sunColorAt(t: number): Rgb {
  return t < 0.5 ? mixRgb(SUN_DAWN, SUN_NOON, t * 2) : mixRgb(SUN_NOON, SUN_SET, (t - 0.5) * 2)
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toArabicDigits = (value: string) => value.replace(/\d/g, (digit) => AR_DIGITS[Number(digit)])

/** أوقات الفصول بالدقائق (٥:٤٠ ص → ١٢:٠٠ ليلاً) لحساب ساعة مستمرة من موضع التمرير */
const TIME_WAYPOINTS = [340, 390, 435, 451, 580, 810, 870, 1440]

function clockLabelAt(progress: number) {
  const segments = TIME_WAYPOINTS.length - 1
  const x = Math.min(0.9999, Math.max(0, progress)) * segments
  const i = Math.floor(x)
  const minutes = Math.round(TIME_WAYPOINTS[i] + (TIME_WAYPOINTS[i + 1] - TIME_WAYPOINTS[i]) * (x - i))
  const hour24 = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  const suffix = hour24 < 12 ? 'ص' : hour24 < 18 ? 'م' : 'ليلاً'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${toArabicDigits(String(hour12))}:${toArabicDigits(String(mins).padStart(2, '0'))} ${suffix}`
}

interface SkyRefs {
  sun: RefObject<HTMLDivElement | null>
  moon: RefObject<HTMLDivElement | null>
  stars: RefObject<HTMLDivElement | null>
  clouds: RefObject<HTMLDivElement | null>
  birds: RefObject<HTMLDivElement | null>
  clock: RefObject<HTMLSpanElement | null>
  skyline: RefObject<SVGSVGElement | null>
}

/** محرك المشهد: الشمس والقمر والنجوم والسحب والعصافير والساعة ونوافذ المدرسة — كلها تتبع كل بكسل تمرير */
function useScrollSky(refs: SkyRefs) {
  useEffect(() => {
    let raf = 0

    const update = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

      // الشمس: قوس شروق→ذروة→غروب يكتمل عند 85%، ثم تغرب خلف الأفق
      const sun = refs.sun.current
      if (sun) {
        const t = Math.min(1, progress / 0.85)
        const [r, g, b] = sunColorAt(t)
        sun.style.top = `${78 - Math.sin(t * Math.PI) * 66}%`
        sun.style.right = `${5 + t * 88}%`
        sun.style.background = `rgb(${r}, ${g}, ${b})`
        sun.style.boxShadow = `0 0 90px 40px rgba(${r}, ${g}, ${b}, 0.42)`
        sun.style.opacity = String(progress < 0.78 ? 1 : Math.max(0, 1 - (progress - 0.78) / 0.1))
      }

      // القمر: يبزغ صاعداً مع دخول الليل
      const moon = refs.moon.current
      if (moon) {
        const t = Math.min(1, Math.max(0, (progress - 0.86) / 0.09))
        moon.style.opacity = String(t)
        moon.style.transform = `translateY(${(1 - t) * 46}px)`
      }

      // النجوم: تودّع الفجر مع الشروق وتعود ليلاً
      const stars = refs.stars.current
      if (stars) {
        const dawn = progress < 0.05 ? (1 - progress / 0.05) * 0.75 : 0
        const night = progress > 0.85 ? Math.min(1, (progress - 0.85) / 0.09) : 0
        stars.style.opacity = String(Math.max(dawn, night))
      }

      // السحب: نهارية فقط
      const clouds = refs.clouds.current
      if (clouds) {
        const fadeIn = Math.min(1, Math.max(0, (progress - 0.06) / 0.08))
        const fadeOut = Math.min(1, Math.max(0, (0.8 - progress) / 0.08))
        clouds.style.opacity = String(Math.min(fadeIn, fadeOut))
      }

      // العصافير: تحلّق في سماء الصباح ثم تغيب
      const birds = refs.birds.current
      if (birds) {
        const fadeIn = Math.min(1, Math.max(0, (progress - 0.13) / 0.05))
        const fadeOut = Math.min(1, Math.max(0, (0.52 - progress) / 0.06))
        birds.style.opacity = String(Math.min(fadeIn, fadeOut))
      }

      // الساعة الحية: تتقدم دقيقة بدقيقة مع التمرير
      const clock = refs.clock.current
      if (clock) {
        const label = clockLabelAt(progress)
        if (clock.textContent !== label) clock.textContent = label
      }

      // نوافذ المدرسة: تُضاء بعد الغروب
      const skyline = refs.skyline.current
      if (skyline) skyline.classList.toggle('is-night', progress > 0.84)
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
    // المراجع ثابتة الهوية عبر التصييرات — الاشتراك مرة واحدة يكفي
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/* نجوم الليل */
const NIGHT_STARS = Array.from({ length: 46 }, (_, index) => ({
  top: `${(index * 37) % 92}%`,
  right: `${(index * 53) % 96}%`,
  size: index % 3 === 0 ? 2.4 : 1.6,
  delay: `${(index % 7) * 0.6}s`,
}))

/* ─── المشاهد الحية ─── */

function VignetteShell({ children, footer }: { children: ReactNode; footer?: string }) {
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-white/50 bg-white/95 p-5 text-right shadow-[0_36px_80px_-32px_rgba(10,20,45,0.55)] backdrop-blur">
      {children}
      {footer ? (
        <div className="mt-4 border-t border-[#ece5d6] pt-3 text-[11px] font-bold text-[#8d8676]">{footer}</div>
      ) : null}
    </div>
  )
}

function PrepVignette() {
  const items = ['جداول اليوم مفعّلة', 'الانتظار موزّع بعدالة', 'الإشراف اليومي معلن', 'الجرس مضبوط على جدول الأحد']
  return (
    <VignetteShell footer="كل هذا حدث تلقائياً أثناء نومك">
      <div className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
        <CalendarCheck2 className="h-4 w-4 text-[#b98a2e]" />
        استعدادات اليوم
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item, index) => (
          <div
            key={item}
            className="lp3-prep flex items-center justify-between rounded-lg border border-[#eee7d8] bg-[#fbf8f1] px-3 py-2 text-[12px] font-bold text-[#37455c]"
            style={{ animationDelay: `${index * 0.9}s` }}
          >
            {item}
            <Check className="h-3.5 w-3.5 text-[#1e8a52]" />
          </div>
        ))}
      </div>
    </VignetteShell>
  )
}

function AttendanceVignette() {
  const rows: Array<{ name: string; status: string; bg: string; tx: string }> = [
    { name: 'فيصل العتيبي', status: 'حاضر', bg: '#e6f6ec', tx: '#1e7c45' },
    { name: 'سلطان الشهري', status: 'متأخر', bg: '#fdf3df', tx: '#a8690a' },
    { name: 'خالد الدوسري', status: 'غائب', bg: '#fdeaea', tx: '#c43d3d' },
    { name: 'ناصر الغامدي', status: 'حاضر', bg: '#e6f6ec', tx: '#1e7c45' },
  ]
  return (
    <VignetteShell footer="نسبة الحضور تظهر للإدارة لحظياً">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
          <ClipboardCheck className="h-4 w-4 text-[#b98a2e]" />
          السادس (أ) — الحصة الأولى
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#e6f6ec] px-2 py-0.5 text-[10px] font-black text-[#1e7c45]">
          <span className="lp3-live h-1.5 w-1.5 rounded-full bg-[#22a55a]" />
          مباشر
        </span>
      </div>
      <div className="mt-3">
        {rows.map((row, index) => (
          <div key={row.name} className="flex items-center justify-between border-b border-[#f2ecdf] py-2 last:border-b-0">
            <span className="text-[12px] font-bold text-[#37455c]">{row.name}</span>
            <span
              className="lp3-stamp rounded-md px-2.5 py-0.5 text-[10.5px] font-black"
              style={{ background: row.bg, color: row.tx, animationDelay: `${-index * 1.7}s` }}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </VignetteShell>
  )
}

function WhatsappVignette() {
  return (
    <VignetteShell footer="غياب، تأخر، استئذان — رسائل آلية بلا تدخل">
      <div className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
        <MessageCircle className="h-4 w-4 text-[#1faa59]" />
        واتساب المدرسة
      </div>
      <div className="mt-3 space-y-2.5">
        <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-[#128c5e] px-3.5 py-2.5 text-[12px] font-semibold leading-5 text-white">
          صباح الخير — ابنكم <b>خالد</b> لم يُرصد حضوره اليوم.
          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-white/70">
            ٧:٣١ ص
            <CheckCheck className="h-3 w-3" />
          </div>
        </div>
        <div className="lp3-bubble max-w-[88%] rounded-2xl rounded-tl-md border border-[#eee7d8] bg-[#f5f1e6] px-3.5 py-2.5 text-[12px] font-semibold leading-5 text-[#3d3a30]" style={{ marginRight: 'auto', marginLeft: 0 }}>
          جزاكم الله خيراً — عنده موعد مستشفى، سأرفع العذر الآن 🙏
        </div>
      </div>
    </VignetteShell>
  )
}

function StandbyVignette() {
  return (
    <VignetteShell footer="ترشيح عادل حسب النصاب والجدول">
      <div className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
        <RefreshCcw className="h-4 w-4 text-[#b98a2e]" />
        الانتظار الذكي
      </div>
      <div className="mt-3 rounded-xl border border-[#f3d9d4] bg-[#fdf3f1] px-3.5 py-2.5">
        <div className="text-[10.5px] font-black text-[#b0483a]">معلم غائب</div>
        <div className="mt-0.5 text-[12.5px] font-bold text-[#37455c]">أ. محمد العنزي — الحصة الثانية (٦/ب)</div>
      </div>
      <div className="my-2 flex justify-center">
        <ArrowDown className="lp3-arrow h-4 w-4 text-[#b98a2e]" />
      </div>
      <div className="lp3-assign rounded-xl border border-[#d9ecd9] bg-[#eef8ee] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-black text-[#1e7c45]">تم التكليف تلقائياً</div>
            <div className="mt-0.5 text-[12.5px] font-bold text-[#37455c]">أ. سعد المطيري — أقل المعلمين انتظاراً</div>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#1e7c45] shadow-sm">
            <UserRound className="h-4 w-4" />
          </span>
        </div>
      </div>
    </VignetteShell>
  )
}

function CallVignette() {
  const names = ['فيصل العتيبي — ٦/أ', 'عبدالله القحطاني — ٥/ب', 'سلطان الشهري — ٤/أ', 'خالد الدوسري — ٦/ج', 'ناصر الغامدي — ٣/ب']
  return (
    <VignetteShell footer="شاشة العرض + نداء صوتي في الفناء">
      <div className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
        <Megaphone className="h-4 w-4 text-[#b98a2e]" />
        النداء الآن
      </div>
      <div className="relative mt-3 h-[128px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5" style={{ background: 'linear-gradient(rgba(255,255,255,0.95), transparent)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5" style={{ background: 'linear-gradient(transparent, rgba(255,255,255,0.95))' }} />
        <div className="lp3-queue">
          {[...names, ...names].map((name, index) => (
            <div key={`${name}-${index}`} className="mb-2 flex items-center justify-between rounded-lg border border-[#eee7d8] bg-[#fbf8f1] px-3 py-2 text-[11.5px] font-bold text-[#37455c]">
              {name}
              <BellRing className="h-3 w-3 text-[#c8b98e]" />
            </div>
          ))}
        </div>
      </div>
    </VignetteShell>
  )
}

function ReportsVignette() {
  const rows = [
    { label: 'ملخص الحضور والتأخر', tint: '#b98a2e' },
    { label: 'تقرير السلوك والنقاط', tint: '#b98a2e' },
    { label: 'ملف الغياب لنظام نور', tint: '#1e8a52' },
  ]
  return (
    <VignetteShell footer="كل التقارير قابلة للطباعة والمشاركة">
      <div className="flex items-center gap-2 text-[13px] font-black text-[#14273f]">
        <FileText className="h-4 w-4 text-[#b98a2e]" />
        إقفال اليوم
      </div>
      <div className="mt-4 space-y-3.5">
        {rows.map(({ label, tint }, index) => (
          <div key={label}>
            <div className="mb-1 text-[11.5px] font-bold text-[#4c5568]">{label}</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#ece5d2]">
              <div className="lp3-fill h-full rounded-full" style={{ background: tint, animationDelay: `${index * 0.4}s` }} />
            </div>
          </div>
        ))}
      </div>
    </VignetteShell>
  )
}

function NightVignette() {
  const items = [
    { label: 'نسخ احتياطي للبيانات', icon: CloudUpload },
    { label: 'تجهيز جداول الغد', icon: CalendarCheck2 },
    { label: 'مزامنة الأجهزة والشاشات', icon: RefreshCcw },
  ]
  return (
    <div className="w-full max-w-[400px] rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-right shadow-[0_36px_80px_-32px_rgba(0,0,10,0.8)] backdrop-blur">
      <div className="flex items-center gap-2 text-[13px] font-black text-white">
        <ShieldCheck className="h-4 w-4 text-[#e9c579]" />
        وردية الليل
      </div>
      <div className="mt-3 space-y-2">
        {items.map(({ label, icon: Icon }, index) => (
          <div
            key={label}
            className="lp3-prep flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[12px] font-bold text-white/85"
            style={{ animationDelay: `${index * 1.1}s` }}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-[#c9a75f]" />
              {label}
            </span>
            <Check className="h-3.5 w-3.5 text-[#7fd7a4]" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-white/10 pt-3 text-[11px] font-bold text-white/45">
        يعمل بصمت — ليستقبلك صباح جاهز
      </div>
    </div>
  )
}

const vignettes: Record<string, () => ReactNode> = {
  'ch-dawn': () => <PrepVignette />,
  'ch-sunrise': () => <PrepVignette />,
  'ch-attendance': () => <AttendanceVignette />,
  'ch-whatsapp': () => <WhatsappVignette />,
  'ch-standby': () => <StandbyVignette />,
  'ch-dismissal': () => <CallVignette />,
  'ch-reports': () => <ReportsVignette />,
  'ch-night': () => <NightVignette />,
}

/* ─── الصفحة ─── */

export function LandingPageV3() {
  const [active, setActive] = useState(0)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const sunRef = useRef<HTMLDivElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)
  const starsRef = useRef<HTMLDivElement>(null)
  const cloudsRef = useRef<HTMLDivElement>(null)
  const birdsRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const skylineRef = useRef<SVGSVGElement>(null)

  useScrollSky({
    sun: sunRef,
    moon: moonRef,
    stars: starsRef,
    clouds: cloudsRef,
    birds: birdsRef,
    clock: clockRef,
    skyline: skylineRef,
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = Number((entry.target as HTMLElement).dataset.chapter)
          if (!Number.isNaN(index)) setActive(index)
        })
      },
      { threshold: 0.55 },
    )
    sectionRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const chapter = chapters[active]

  return (
    <div dir="rtl" className="relative min-h-screen" style={{ color: '#14273f' }}>
      <style>{`
        @keyframes lp3-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        @keyframes lp3-stamp { 0% { opacity: 0; transform: scale(0.4) rotate(-8deg); } 6% { opacity: 1; transform: scale(1.1); } 9% { transform: scale(1); } 86% { opacity: 1; } 94%, 100% { opacity: 0; } }
        @keyframes lp3-prep-in { 0%, 8% { opacity: 0; transform: translateX(14px); } 18%, 88% { opacity: 1; transform: translateX(0); } 96%, 100% { opacity: 0; } }
        @keyframes lp3-queue-roll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes lp3-bubble-in { 0%, 38% { opacity: 0; transform: translateY(8px); } 50%, 90% { opacity: 1; transform: translateY(0); } 98%, 100% { opacity: 0; } }
        @keyframes lp3-fill-once { 0%, 10% { width: 0%; } 62%, 100% { width: 100%; } }
        @keyframes lp3-assign-pop { 0%, 34% { opacity: 0; transform: translateY(10px); } 48%, 90% { opacity: 1; transform: translateY(0); } 98%, 100% { opacity: 0; } }
        @keyframes lp3-arrow-bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(4px); opacity: 1; } }
        @keyframes lp3-live-ping { 0%, 100% { box-shadow: 0 0 0 0 rgba(34,165,90,0.5); } 60% { box-shadow: 0 0 0 6px rgba(34,165,90,0); } }
        @keyframes lp3-scroll-hint { 0%, 100% { transform: translateY(0); opacity: 0.85; } 55% { transform: translateY(8px); opacity: 0.35; } }
        @keyframes lp3-cloud-drift { from { margin-right: -26px; } to { margin-right: 30px; } }
        @keyframes lp3-bird-fly { from { right: -12vw; } to { right: 110vw; } }
        @keyframes lp3-bird-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
        .lp3-cloud { position: absolute; width: 150px; height: 34px; border-radius: 40px; background: rgba(255,255,255,0.78); box-shadow: 42px -16px 0 4px rgba(255,255,255,0.7), 88px -6px 0 0 rgba(255,255,255,0.58); filter: blur(0.5px); animation-name: lp3-cloud-drift; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        .lp3-bird { position: absolute; animation-name: lp3-bird-fly; animation-timing-function: linear; animation-iteration-count: infinite; }
        .lp3-bird svg { animation: lp3-bird-bob 1.5s ease-in-out infinite; }
        .lp3-window { fill: rgba(255,255,255,0.14); transition: fill 1.4s ease, filter 1.4s ease; }
        .lp3-skyline.is-night .lp3-window { fill: rgba(255,255,255,0.05); }
        .lp3-skyline.is-night .lp3-window--lit { fill: #ffd76e; filter: drop-shadow(0 0 5px rgba(255,215,110,0.85)); }
        .lp3-stamp { animation: lp3-stamp 7.5s ease-in-out infinite; }
        .lp3-prep { animation: lp3-prep-in 8s ease-in-out infinite; }
        .lp3-queue { animation: lp3-queue-roll 12s linear infinite; }
        .lp3-bubble { animation: lp3-bubble-in 8s ease-in-out infinite; }
        .lp3-fill { animation: lp3-fill-once 6s ease-in-out infinite; }
        .lp3-assign { animation: lp3-assign-pop 7s ease-in-out infinite; }
        .lp3-arrow { animation: lp3-arrow-bounce 1.6s ease-in-out infinite; }
        .lp3-live { animation: lp3-live-ping 2s ease-out infinite; }
        .lp3-star { animation: lp3-twinkle 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          [class*="lp3-"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* ══ طبقات السماء (تتلاشى بينها) ══ */}
      <div className="fixed inset-0 z-0">
        {chapters.map((item, index) => (
          <div
            key={item.id}
            className="absolute inset-0"
            style={{ background: item.sky, opacity: active === index ? 1 : 0, transition: 'opacity 1.4s ease' }}
          />
        ))}
      </div>

      {/* ══ الشمس — تتحرك مع كل تمريرة ══ */}
      <div
        ref={sunRef}
        className="pointer-events-none fixed z-0 h-24 w-24 rounded-full sm:h-32 sm:w-32"
        style={{
          top: '78%',
          right: '5%',
          background: '#f2a35c',
          boxShadow: '0 0 90px 40px rgba(242,163,92,0.42)',
          willChange: 'top, right, opacity',
        }}
      />
      {/* القمر */}
      <div
        ref={moonRef}
        className="pointer-events-none fixed z-0 h-20 w-20 rounded-full sm:h-24 sm:w-24"
        style={{
          top: '16%',
          right: '18%',
          background: 'radial-gradient(circle at 34% 34%, #f4f6fb, #c9d2e4)',
          boxShadow: '0 0 70px 26px rgba(220,228,246,0.25), inset -14px -10px 0 rgba(150,162,190,0.35)',
          opacity: 0,
          willChange: 'opacity, transform',
        }}
      />
      {/* النجوم */}
      <div ref={starsRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0, willChange: 'opacity' }}>
        {NIGHT_STARS.map((star, index) => (
          <span
            key={index}
            className="lp3-star absolute rounded-full bg-white"
            style={{ top: star.top, right: star.right, width: star.size, height: star.size, animationDelay: star.delay }}
          />
        ))}
      </div>

      {/* ══ السحب (نهارية) ══ */}
      <div ref={cloudsRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0, willChange: 'opacity' }}>
        <div className="lp3-cloud" style={{ top: '13%', right: '16%', animationDuration: '9s' }} />
        <div className="lp3-cloud" style={{ top: '24%', right: '58%', transform: 'scale(0.72)', animationDuration: '12s', animationDelay: '-4s' }} />
        <div className="lp3-cloud" style={{ top: '8%', right: '76%', transform: 'scale(1.18)', animationDuration: '14s', animationDelay: '-8s' }} />
        <div className="lp3-cloud" style={{ top: '32%', right: '34%', transform: 'scale(0.55)', animationDuration: '10s', animationDelay: '-2s' }} />
      </div>

      {/* ══ عصافير الصباح ══ */}
      <div ref={birdsRef} className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0, willChange: 'opacity' }}>
        {[
          { top: '15%', duration: '44s', delay: '0s', scale: 1 },
          { top: '21%', duration: '58s', delay: '-19s', scale: 0.7 },
          { top: '11%', duration: '50s', delay: '-34s', scale: 0.85 },
        ].map((bird, index) => (
          <div key={index} className="lp3-bird" style={{ top: bird.top, animationDuration: bird.duration, animationDelay: bird.delay }}>
            <svg width={30 * bird.scale} height={12 * bird.scale} viewBox="0 0 30 12" fill="none">
              <path d="M2 9 Q8 2 15 9 Q22 2 28 9" stroke="#13253f" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
            </svg>
          </div>
        ))}
      </div>

      {/* ══ أفق المدرسة — الشمس تغرب خلفه وتضاء نوافذه ليلاً ══ */}
      <svg
        ref={skylineRef}
        className="lp3-skyline pointer-events-none fixed inset-x-0 bottom-0 z-0 w-full"
        style={{ height: 'clamp(76px, 13vw, 150px)' }}
        viewBox="0 0 1200 160"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <g fill="#0c1730" opacity="0.92">
          {/* الأرض */}
          <rect x="0" y="148" width="1200" height="12" />
          {/* المسجد: مئذنة وقبة */}
          <rect x="150" y="54" width="14" height="96" />
          <rect x="143" y="46" width="28" height="8" rx="2" />
          <circle cx="157" cy="38" r="6" />
          <rect x="196" y="98" width="112" height="52" />
          <path d="M196 98 Q252 60 308 98 Z" />
          {/* شجرة */}
          <ellipse cx="372" cy="112" rx="27" ry="22" />
          <rect x="368" y="128" width="8" height="22" />
          {/* سارية العلم */}
          <rect x="432" y="50" width="3" height="100" />
          {/* مبنى المدرسة الرئيسي */}
          <rect x="470" y="58" width="300" height="92" />
          <rect x="560" y="42" width="120" height="16" rx="3" />
          {/* برج الساعة */}
          <rect x="790" y="26" width="46" height="124" />
          {/* مبنى جانبي */}
          <rect x="858" y="94" width="150" height="56" />
          {/* أشجار يسار */}
          <ellipse cx="1052" cy="116" rx="30" ry="24" />
          <rect x="1048" y="132" width="8" height="18" />
          <ellipse cx="1112" cy="124" rx="22" ry="17" />
          <rect x="1109" y="136" width="6" height="14" />
        </g>
        {/* العلم */}
        <rect x="435" y="50" width="28" height="16" rx="2" fill="#2e6b4c" opacity="0.95" />
        {/* ساعة البرج */}
        <circle cx="813" cy="54" r="13" fill="#f4ecd8" opacity="0.92" />
        <rect x="812" y="45" width="2" height="10" fill="#0c1730" />
        <rect x="813" y="53" width="8" height="2" fill="#0c1730" />
        {/* باب المدرسة */}
        <path d="M602 150 L602 122 Q620 108 638 122 L638 150 Z" fill="rgba(255,255,255,0.12)" />
        {/* نوافذ المدرسة */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`w1-${i}`} className="lp3-window" x={488 + i * 46} y={74} width="26" height="17" rx="2" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={`w2-${i}`}
            className={`lp3-window${i === 4 ? ' lp3-window--lit' : ''}`}
            x={488 + i * 46}
            y={104}
            width="26"
            height="17"
            rx="2"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`w3-${i}`}
            className={`lp3-window${i === 1 ? ' lp3-window--lit' : ''}`}
            x={874 + i * 34}
            y={106}
            width="22"
            height="14"
            rx="2"
          />
        ))}
        <rect className="lp3-window lp3-window--lit" x="801" y="86" width="24" height="18" rx="2" />
      </svg>

      {/* ══ المحتوى فوق السماء ══ */}
      <div className="relative z-10">

      {/* ══ الشريط العلوي ══ */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-full border border-white/15 bg-[#0c1830]/70 px-4 py-2.5 text-white shadow-[0_18px_50px_-24px_rgba(2,8,25,0.9)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d7a74a] text-[13px] font-black text-[#14263f]">ر</span>
            <span className="text-[14px] font-black">نظام الرائد</span>
          </div>
          <div className="hidden items-center gap-1 text-[12px] font-bold text-white/60 md:flex">
            <span>رحلة يوم مدرسي واحد</span>
            <span className="mx-1 text-white/25">•</span>
            <span>مرّر لتعيشه</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth/teacher" className="hidden rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white/80 transition hover:bg-white/10 sm:inline-flex">
              تسجيل الدخول
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#d7a74a] px-4 py-1.5 text-[12.5px] font-black text-[#14263f] transition-transform hover:scale-[1.04]"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </header>

      {/* ══ ساعة الرحلة — تتقدم مع كل تمريرة ══ */}
      <div className="fixed left-1/2 top-[74px] z-40 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#0c1830]/60 px-4 py-1.5 text-[12px] font-black text-white backdrop-blur-lg">
          <chapter.icon className="h-3.5 w-3.5 text-[#e9c579]" style={{ transition: 'opacity 0.4s ease' }} />
          <span ref={clockRef} className="min-w-[52px] text-center tabular-nums">
            ٥:٤٠ ص
          </span>
        </div>
      </div>

      {/* ══ سكة الفصول ══ */}
      <nav className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex">
        {chapters.map((item, index) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            title={item.time}
            className="group flex items-center gap-2"
          >
            <span
              className="block rounded-full transition-all duration-300"
              style={{
                width: active === index ? 10 : 6,
                height: active === index ? 10 : 6,
                background: active === index ? '#d7a74a' : 'rgba(255,255,255,0.55)',
                boxShadow: active === index ? '0 0 12px rgba(215,167,74,0.8)' : 'none',
              }}
            />
          </a>
        ))}
      </nav>

      {/* ══ البطل ══ */}
      <section
        ref={(el) => { sectionRefs.current[0] = el }}
        data-chapter={0}
        id={chapters[0].id}
        className="relative flex min-h-screen flex-col items-center justify-center px-5 text-center"
      >
        <Reveal>
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[12px] font-black text-[#ffdf9e] backdrop-blur">
            <Sunrise className="h-3.5 w-3.5" />
            قصة يوم مدرسي واحد — عِشها بالتمرير
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="mx-auto mt-7 max-w-[15ch] text-5xl font-black leading-[1.2] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] sm:text-7xl">
            يومٌ واحد يكفي
            <span className="block text-[#f3cf87]">لتعرف الفرق</span>
          </h1>
        </Reveal>
        <Reveal delay={220}>
          <p className="mx-auto mt-6 max-w-[44ch] text-[15px] font-medium leading-8 text-white/80">
            من عتمة الفجر إلى سكون الليل — هذه رحلة يومٍ حقيقي في مدرسة تعمل بنظام الرائد.
            مرّر، وراقب السماء.
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#d7a74a] px-8 py-3.5 text-[14.5px] font-black text-[#14263f] shadow-[0_18px_44px_-14px_rgba(215,167,74,0.65)] transition-transform hover:scale-[1.04]"
            >
              جرّب النظام مجاناً
              <ArrowUpLeft className="h-4 w-4" />
            </Link>
            <Link
              to="/plans"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-[14.5px] font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              استعرض الباقات
            </Link>
          </div>
        </Reveal>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70">
          <div className="flex flex-col items-center gap-1.5 text-[11px] font-bold">
            <span>ابدأ الرحلة</span>
            <ArrowDown className="h-4 w-4" style={{ animation: 'lp3-scroll-hint 1.8s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ══ الفصول ══ */}
      {chapters.slice(1).map((item, sliceIndex) => {
        const index = sliceIndex + 1
        const isDarkText = item.tone === 'dark'
        const titleColor = isDarkText ? '#14273f' : '#ffffff'
        const bodyColor = isDarkText ? 'rgba(20,39,63,0.72)' : 'rgba(255,255,255,0.78)'
        const timeColor = isDarkText ? '#9a7420' : '#f3cf87'
        const Vignette = vignettes[item.id]
        const isLast = index === chapters.length - 1

        return (
          <section
            key={item.id}
            ref={(el) => { sectionRefs.current[index] = el }}
            data-chapter={index}
            id={item.id}
            className="relative flex min-h-screen items-center px-5 py-24 sm:px-8"
          >
            <div className="mx-auto grid w-full max-w-[1100px] items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <div className="text-center lg:text-right">
                  <div className="flex items-center justify-center gap-3 text-[13px] font-black tracking-wide lg:justify-start" style={{ color: timeColor }}>
                    <span className="h-px w-9" style={{ background: timeColor, opacity: 0.7 }} />
                    {item.time}
                  </div>
                  <h2 className="mt-4 text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl" style={{ color: titleColor, textShadow: isDarkText ? 'none' : '0 3px 26px rgba(0,0,0,0.35)' }}>
                    {item.title}
                  </h2>
                  <p className="mx-auto mt-5 max-w-[46ch] text-[14.5px] font-medium leading-8 lg:mx-0" style={{ color: bodyColor }}>
                    {item.text}
                  </p>

                  {isLast ? (
                    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-2 rounded-full bg-[#d7a74a] px-8 py-4 text-[15px] font-black text-[#14263f] shadow-[0_20px_50px_-16px_rgba(215,167,74,0.6)] transition-transform hover:scale-[1.04]"
                      >
                        سجّل مدرستك — وليكن غدك أول يوم
                        <ArrowUpLeft className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/auth/admin"
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-8 py-4 text-[15px] font-bold text-white/90 backdrop-blur transition hover:bg-white/12"
                      >
                        دخول الإدارة
                      </Link>
                    </div>
                  ) : null}
                </div>
              </Reveal>

              <Reveal delay={150} className="flex justify-center lg:justify-start">
                {Vignette()}
              </Reveal>
            </div>

            {isLast ? (
              <div className="absolute inset-x-0 bottom-0 border-t border-white/10">
                <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-3 px-5 py-5 text-[11.5px] font-semibold text-white/40 sm:flex-row">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#d7a74a] text-[11px] font-black text-[#14263f]">ر</span>
                    نظام الرائد للإدارة المدرسية
                  </div>
                  <div className="flex items-center gap-5">
                    <Link to="/plans" className="transition hover:text-white">الأسعار</Link>
                    <Link to="/auth/teacher" className="transition hover:text-white">دخول المعلمين</Link>
                    <a href="#ch-dawn" className="transition hover:text-white">عش اليوم من جديد ↑</a>
                  </div>
                  <div>© {new Date().getFullYear()} جميع الحقوق محفوظة</div>
                </div>
              </div>
            ) : null}
          </section>
        )
      })}

      </div>
    </div>
  )
}

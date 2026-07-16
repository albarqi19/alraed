import {
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Fingerprint,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MonitorSmartphone,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type IconType = LucideIcon

/* ─────────────────────────────────────────────
   البيانات
   ───────────────────────────────────────────── */

const navItems = [
  { label: 'الرئيسية', href: '#top' },
  { label: 'رحلة اليوم', href: '#journey' },
  { label: 'الواجهات', href: '#portals' },
  { label: 'المميزات', href: '#features' },
  { label: 'الأسعار', href: '/plans', isRoute: true },
  { label: 'تواصل معنا', href: '#cta' },
]

const heroMetrics: Array<{ end?: number; suffix?: string; raw?: string; label: string }> = [
  { end: 190, suffix: '+', label: 'ميزة تشغيلية' },
  { end: 9, label: 'وحدات متكاملة' },
  { end: 3, label: 'واجهات مستخدم' },
  { raw: '24/7', label: 'متابعة مستمرة' },
  { end: 99, suffix: '%', label: 'استقرار تشغيلي' },
]

const systemModules: Array<{ name: string; icon: IconType }> = [
  { name: 'الحضور والغياب', icon: CalendarRange },
  { name: 'النقاط والسلوك', icon: Star },
  { name: 'التوجيه الطلابي', icon: Fingerprint },
  { name: 'رسائل الواتساب', icon: MessageCircle },
  { name: 'النماذج والتقارير', icon: FileText },
  { name: 'النداء الذكي', icon: Megaphone },
  { name: 'الجرس الآلي', icon: BellRing },
  { name: 'لوحات المعلومات', icon: BarChart3 },
  { name: 'متابعة المعلمين', icon: Clock3 },
]

const journeySteps: Array<{ time: string; title: string; text: string; icon: IconType }> = [
  {
    time: '٦:٣٠ ص',
    title: 'يومك يبدأ جاهزاً',
    text: 'الجداول والانتظار والإشراف اليومي مُعدّة تلقائياً قبل وصول أول معلم.',
    icon: Sunrise,
  },
  {
    time: '٧:١٥ ص',
    title: 'رصد الحضور',
    text: 'المعلم يحضّر فصله بنقرة واحدة — أو بالباركود من بوابة المدرسة.',
    icon: ClipboardCheck,
  },
  {
    time: '٧:٣٠ ص',
    title: 'أولياء الأمور يعرفون',
    text: 'رسائل واتساب آلية للغياب والتأخر تصل قبل أن يسأل أحد.',
    icon: Send,
  },
  {
    time: 'خلال اليوم',
    title: 'كل حصة مرصودة',
    text: 'حضور بالحصة، نقاط سلوك، استئذان، وانتظار ذكي عند غياب معلم.',
    icon: Star,
  },
  {
    time: '١:٣٠ م',
    title: 'خروج آمن',
    text: 'النداء الذكي ينظّم استلام الطلاب شاشةً وصوتاً دون تزاحم.',
    icon: Megaphone,
  },
  {
    time: '٢:٠٠ م',
    title: 'التقارير جاهزة',
    text: 'ملخص اليوم للإدارة، وتصدير الغياب لنظام نور بضغطة.',
    icon: FileText,
  },
]

const portalCards: Array<{
  title: string
  badge: string
  description: string
  icon: IconType
  features: string[]
}> = [
  {
    title: 'واجهة الإدارة',
    badge: '45+ وظيفة',
    description: 'إدارة المدرسة بكفاءة واتخاذ قرارات مبنية على البيانات الفورية.',
    icon: LayoutDashboard,
    features: [
      'لوحات التحكم والإحصائيات الفورية',
      'تقارير الحضور والأداء التفصيلية',
      'إدارة الكوادر التعليمية والإدارية',
      'إعدادات الصلاحيات والأذونات',
    ],
  },
  {
    title: 'واجهة المعلم',
    badge: '30+ وظيفة',
    description: 'إدارة الصف والطلاب وتتبع العمل اليومي بسهولة واحترافية.',
    icon: GraduationCap,
    features: [
      'تسجيل الحضور اليومي للطلاب',
      'متابعة السلوك والنقاط المدرسية',
      'رفع النماذج والمستندات الرسمية',
      'التواصل الفوري مع ولي الأمر',
    ],
  },
  {
    title: 'واجهة ولي الأمر',
    badge: '15+ وظيفة',
    description: 'متابعة الأبناء والاطلاع على التنبيهات لحظة بلحظة.',
    icon: Users,
    features: [
      'تنبيهات الغياب والتأخر الفوري',
      'متابعة النقاط والسلوك المدرسي',
      'الرسائل المباشرة مع الإدارة',
      'سجل الأداء والحضور التفصيلي',
    ],
  },
]

const featureGroups: Array<{
  category: string
  items: Array<{ title: string; icon: IconType }>
}> = [
  {
    category: 'الإدارة اليومية',
    items: [
      { title: 'تسجيل الحضور والغياب يومياً', icon: CalendarRange },
      { title: 'متابعة حضور المعلمين', icon: Clock3 },
      { title: 'النداء الذكي عند استلام الطلاب', icon: Megaphone },
      { title: 'الجرس المدرسي الآلي', icon: BellRing },
      { title: 'استيراد جدول مدرستي', icon: BookOpenCheck },
      { title: 'تصدير الغياب إلى نظام نور', icon: ScanLine },
    ],
  },
  {
    category: 'الطالب والسلوك',
    items: [
      { title: 'البرنامج النقاطي المتكامل', icon: Star },
      { title: 'التوجيه الإرشادي والطلابي', icon: Fingerprint },
      { title: 'متابعة السلوك والمواظبة', icon: Trophy },
      { title: 'لوحات المعلومات التفاعلية', icon: BarChart3 },
      { title: 'تقارير الطالب التفصيلية', icon: FileText },
      { title: 'ربط وتكامل مع فارس', icon: Sparkles },
    ],
  },
  {
    category: 'التواصل والتوثيق',
    items: [
      { title: 'إشعارات الواتساب التلقائية', icon: MessageCircle },
      { title: 'النماذج والتقارير المطبوعة', icon: FileText },
      { title: 'رسائل التأخر الفوري', icon: BellRing },
      { title: 'إشعارات الغياب المتكررة', icon: Megaphone },
      { title: 'لوحات العرض المرئي', icon: MonitorSmartphone },
      { title: 'قوائم التواصل الموحدة', icon: Users },
    ],
  },
]

const roleCards: Array<{ title: string; subtitle: string; icon: IconType }> = [
  { title: 'وكيل المعلمين', subtitle: 'إدارة شؤون المعلمين', icon: UserRound },
  { title: 'وكيل الطلاب', subtitle: 'إدارة شؤون الطلاب', icon: GraduationCap },
  { title: 'رائد النشاط', subtitle: 'إدارة الأنشطة الطلابية', icon: Star },
  { title: 'الموجه الطلابي', subtitle: 'دعم وتوجيه الطلاب', icon: Fingerprint },
  { title: 'الإداري', subtitle: 'إدارة الأعمال الإدارية', icon: ClipboardList },
]

const trustItems: Array<{ title: string; subtitle: string; icon: IconType }> = [
  { title: 'تحديثات مستمرة', subtitle: 'تطوير النظام باستمرار', icon: Sparkles },
  { title: 'أمان عالٍ للبيانات', subtitle: 'حماية مشددة ونسخ احتياطي', icon: ShieldCheck },
  { title: 'دعم فني متميز', subtitle: 'فريق دعم جاهز لخدمتكم', icon: Headphones },
  { title: 'سهولة الاستخدام', subtitle: 'واجهة بسيطة ومرنة', icon: MonitorSmartphone },
]

const mockStudents: Array<{ name: string; grade: string; status: string; tone: 'green' | 'amber' | 'red' }> = [
  { name: 'فيصل العتيبي', grade: '6/أ', status: 'حاضر', tone: 'green' },
  { name: 'عبدالله القحطاني', grade: '6/أ', status: 'حاضر', tone: 'green' },
  { name: 'سلطان الشهري', grade: '6/أ', status: 'متأخر', tone: 'amber' },
  { name: 'خالد الدوسري', grade: '6/أ', status: 'غائب', tone: 'red' },
  { name: 'ناصر الغامدي', grade: '6/أ', status: 'حاضر', tone: 'green' },
]

const mockToneStyles: Record<'green' | 'amber' | 'red', { bg: string; tx: string }> = {
  green: { bg: '#e6f6ec', tx: '#1e7c45' },
  amber: { bg: '#fdf3df', tx: '#a8690a' },
  red: { bg: '#fdeaea', tx: '#c43d3d' },
}

/* ─────────────────────────────────────────────
   أدوات الحركة
   ───────────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  from = 'up',
  className,
}: {
  children: ReactNode
  delay?: number
  from?: 'up' | 'right' | 'left' | 'none'
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
      { threshold: 0.08 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hidden =
    from === 'up'
      ? 'translateY(46px)'
      : from === 'right'
        ? 'translateX(46px)'
        : from === 'left'
          ? 'translateX(-46px)'
          : 'none'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: visible ? 'none' : hidden,
        opacity: visible ? 1 : 0,
        transition: `transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 0.6s ease ${delay}ms`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  )
}

function CountUp({ end, suffix = '', duration = 1500 }: { end: number; suffix?: string; duration?: number }) {
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
      { threshold: 0.4 },
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

/* ─────────────────────────────────────────────
   الهوية
   ───────────────────────────────────────────── */

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex items-center justify-center'}>
      <div
        className={
          compact
            ? 'relative grid h-11 w-11 place-items-center rounded-xl border-2 border-[#d7a74a] bg-[#fff7e9] shadow-[0_6px_18px_-10px_rgba(5,46,94,0.5)]'
            : 'relative grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#d7a74a] bg-[#fff7e9] shadow-[0_18px_50px_-28px_rgba(5,46,94,0.55)] sm:h-24 sm:w-24'
        }
      >
        <div className={compact ? 'absolute inset-1 rounded-lg border border-[#edd8ad]' : 'absolute inset-2 rounded-full border border-[#edd8ad]'} />
        <div className="text-center leading-none text-[#0c3b70]">
          <div className={compact ? 'text-sm font-black' : 'text-3xl font-bold sm:text-4xl'}>الرائد</div>
          <div
            className={
              compact
                ? 'mt-0.5 text-[6px] font-semibold text-[#7d6b4f]'
                : 'mt-1 text-[10px] font-semibold text-[#7d6b4f] sm:text-[11px]'
            }
          >
            نظام الإدارة المدرسية
          </div>
        </div>
      </div>
      {compact ? (
        <div className="hidden text-right sm:block">
          <div className="text-sm font-black text-white">نظام الرائد</div>
          <div className="text-xs font-medium text-white/60">للإدارة المدرسية</div>
        </div>
      ) : null}
    </div>
  )
}

/* ─────────────────────────────────────────────
   موك المنتج الحي (قلب الهيرو)
   ───────────────────────────────────────────── */

function HeroProductMock() {
  const [barVisible, setBarVisible] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBarVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[460px]" style={{ perspective: '1400px' }}>
      {/* توهج خلفي */}
      <div
        className="absolute -inset-8 rounded-[40px] opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(215,167,74,0.35), rgba(59,130,246,0.15), transparent)' }}
      />

      {/* البطاقة الرئيسية: لوحة التحضير */}
      <div
        className="lp-tilt relative overflow-hidden rounded-2xl border border-white/60 bg-white text-right shadow-[0_40px_90px_-30px_rgba(3,21,46,0.65)]"
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-[#eee5d4] bg-[#fbf8f2] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0c3b70] text-[#f3cf87]">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[12.5px] font-black text-[#173f74]">لوحة التحضير — السادس (أ)</div>
              <div className="text-[10px] font-semibold text-[#9a8a6a]">الحصة الأولى • لغتي الجميلة</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[10px] font-black text-[#1e7c45]">
            <span className="lp-live-dot h-1.5 w-1.5 rounded-full bg-[#22a55a]" />
            مباشر
          </span>
        </div>

        {/* صفوف الطلاب — الحالات تُختم تباعاً */}
        <div className="relative px-3 py-2">
          <div className="lp-scan pointer-events-none absolute inset-x-0 top-0 h-10 rounded-lg bg-[#d7a74a]/8" />
          {mockStudents.map((student, index) => {
            const tone = mockToneStyles[student.tone]
            return (
              <div
                key={student.name}
                className="flex items-center justify-between gap-3 border-b border-[#f3ede0] px-1.5 py-2.5 last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0e8d9] text-[11px] font-black text-[#7d6b4f]">
                    {student.name.charAt(0)}
                  </span>
                  <div>
                    <div className="text-[12px] font-bold leading-4 text-[#26476e]">{student.name}</div>
                    <div className="text-[9.5px] font-semibold text-[#a09580]">{student.grade}</div>
                  </div>
                </div>
                <span
                  className="lp-stamp rounded-md px-2.5 py-1 text-[10.5px] font-black"
                  style={{ background: tone.bg, color: tone.tx, animationDelay: `${-index * 1.6}s` }}
                >
                  {student.status}
                </span>
              </div>
            )
          })}
        </div>

        {/* شريط نسبة الحضور */}
        <div ref={barRef} className="border-t border-[#eee5d4] bg-[#fbf8f2] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-bold">
            <span className="text-[#7d6b4f]">نسبة حضور المدرسة اليوم</span>
            <span className="text-[#1e7c45]">96%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#ece2cd]">
            <div
              className="lp-bar-fill h-full rounded-full bg-[linear-gradient(90deg,#2fa964,#59c98a)]"
              style={{ width: barVisible ? '96%' : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* بطاقة واتساب عائمة */}
      <div className="lp-float absolute -right-4 -top-9 w-[230px] sm:-right-12">
        <div className="rounded-xl border border-white/70 bg-white/95 p-3 text-right shadow-[0_24px_60px_-24px_rgba(3,21,46,0.6)] backdrop-blur">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7f8ee] text-[#1faa59]">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-[#173f74]">رسالة واتساب أُرسلت</div>
              <div className="mt-0.5 text-[10px] font-semibold leading-4 text-[#6b6b6b]">
                إشعار غياب «خالد الدوسري» وصل لولي الأمر
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 text-[9px] font-bold text-[#3aa4dd]">
                7:31 ص
                <CheckCircle2 className="h-3 w-3" />
                <CheckCircle2 className="-mr-2 h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقة إحصائية عائمة */}
      <div className="lp-float-slow absolute -bottom-8 -left-3 w-[190px] sm:-left-10">
        <div className="rounded-xl border border-white/70 bg-white/95 p-3 text-right shadow-[0_24px_60px_-24px_rgba(3,21,46,0.6)] backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fdf3df] text-[#a8690a]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="text-left">
              <div className="text-lg font-black leading-5 text-[#173f74]">3</div>
              <div className="text-[9.5px] font-bold text-[#9a8a6a]">متأخرو اليوم</div>
            </div>
          </div>
          <div className="mt-2 border-t border-[#f3ede0] pt-1.5 text-[9.5px] font-semibold text-[#6b6b6b]">
            رسائل التأخر أُرسلت تلقائياً ✓
          </div>
        </div>
      </div>

      {/* شارة الحصة الحالية */}
      <div className="lp-float absolute -top-4 left-2 sm:left-6" style={{ animationDelay: '-2s' }}>
        <span className="flex items-center gap-1.5 rounded-full border border-[#d7a74a]/40 bg-[#0c3b70]/90 px-3 py-1.5 text-[10px] font-black text-[#f3cf87] shadow-[0_14px_36px_-16px_rgba(3,21,46,0.8)] backdrop-blur">
          <span className="lp-live-dot h-1.5 w-1.5 rounded-full bg-[#f3cf87]" />
          الجرس الآلي: الحصة الأولى بدأت
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   عناوين الأقسام
   ───────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  center = false,
}: {
  eyebrow: string
  title: string
  subtitle: string
  light?: boolean
  center?: boolean
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl space-y-3 text-center' : 'max-w-2xl space-y-3 text-right'}>
      <span
        className={
          light
            ? 'inline-block rounded-full border border-[#d7a74a]/40 bg-[#d7a74a]/10 px-3.5 py-1 text-[11px] font-black tracking-wide text-[#f3cf87]'
            : 'inline-block rounded-full border border-[#e0cfa6] bg-[#fbf4e4] px-3.5 py-1 text-[11px] font-black tracking-wide text-[#a8823c]'
        }
      >
        {eyebrow}
      </span>
      <h2
        className={
          light
            ? 'text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl'
            : 'text-3xl font-black leading-tight tracking-tight text-[#14355d] sm:text-4xl'
        }
      >
        {title}
      </h2>
      <p className={light ? 'text-sm font-medium leading-7 text-white/65 sm:text-[15px]' : 'text-sm font-medium leading-7 text-[#6f6a5e] sm:text-[15px]'}>
        {subtitle}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   الصفحة
   ───────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div id="top" dir="rtl" className="min-h-screen bg-[#f6f1e7] text-[#16385f]">
      {/* حركات الصفحة */}
      <style>{`
        @keyframes lp-float { from { transform: translateY(0); } to { transform: translateY(-12px); } }
        @keyframes lp-live { 0%,100% { box-shadow: 0 0 0 0 rgba(34,165,90,0.55); } 60% { box-shadow: 0 0 0 6px rgba(34,165,90,0); } }
        @keyframes lp-stamp {
          0% { opacity: 0; transform: scale(0.4) rotate(-8deg); }
          5% { opacity: 1; transform: scale(1.12) rotate(1deg); }
          8% { transform: scale(1) rotate(0); }
          88% { opacity: 1; transform: scale(1); }
          95%, 100% { opacity: 0; transform: scale(0.85); }
        }
        @keyframes lp-scan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(190px); opacity: 0; } }
        @keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .lp-float { animation: lp-float 5.5s ease-in-out infinite alternate; }
        .lp-float-slow { animation: lp-float 7s ease-in-out infinite alternate; animation-delay: -3s; }
        .lp-live-dot { animation: lp-live 2s ease-out infinite; }
        .lp-stamp { animation: lp-stamp 8s ease-in-out infinite; }
        .lp-scan { animation: lp-scan 8s ease-in-out infinite; }
        .lp-marquee-track { animation: lp-marquee 32s linear infinite; }
        .lp-marquee:hover .lp-marquee-track { animation-play-state: paused; }
        .lp-tilt { transform: rotateY(-6deg) rotateX(3deg); transition: transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        @media (min-width: 1024px) { .lp-tilt:hover { transform: rotateY(0deg) rotateX(0deg); } }
        .lp-bar-fill { transition: width 1.6s cubic-bezier(0.22,1,0.36,1) 0.3s; }
        .lp-portal-card { transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), box-shadow 0.45s ease; }
        .lp-portal-card:hover { transform: translateY(-8px); box-shadow: 0 34px 70px -34px rgba(8,41,84,0.45); }
        @media (prefers-reduced-motion: reduce) {
          .lp-float, .lp-float-slow, .lp-live-dot, .lp-stamp, .lp-scan, .lp-marquee-track { animation: none !important; }
          .lp-stamp { opacity: 1 !important; }
          .lp-scan { opacity: 0 !important; }
        }
      `}</style>

      {/* ══════════ الهيرو ══════════ */}
      <div
        className="relative overflow-hidden pb-14 text-white"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(215,167,74,0.14) 0%, transparent 70%), radial-gradient(ellipse 45% 65% at 95% 20%, rgba(215,167,74,0.2) 0%, transparent 60%), radial-gradient(ellipse 55% 75% at -5% 40%, rgba(14,70,140,0.6) 0%, transparent 65%), linear-gradient(172deg, #061a35 0%, #0a3363 38%, #0b3d71 62%, #0e4a85 100%)',
        }}
      >
        {/* شبكة نقطية */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #a8c8f0 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* حلقات زخرفية */}
        <div className="absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full border border-[#d7a74a]/12" />
        <div className="absolute -right-10 -top-10 h-[280px] w-[280px] rounded-full border border-[#d7a74a]/18" />
        <div className="absolute -left-28 bottom-6 h-[340px] w-[340px] rounded-full border border-white/6" />
        {/* توهجات */}
        <div className="absolute -right-10 top-0 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #d7a74a, transparent 70%)' }} />
        <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(215,167,74,0.5)_50%,transparent_100%)]" />

        {/* ── الشريط العلوي الثابت ── */}
        <div className="fixed inset-x-0 top-0 z-[60] px-4 pt-3 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <header className="rounded-2xl border border-white/10 bg-[#0b3d71]/85 px-4 py-2.5 shadow-[0_16px_50px_-28px_rgba(4,19,40,0.9)] backdrop-blur-xl sm:px-5">
              <div className="flex items-center justify-between gap-4">
                <BrandMark compact />
                <nav className="hidden items-center gap-0.5 text-sm font-bold text-white/85 lg:flex">
                  {navItems.map((item) =>
                    item.isRoute ? (
                      <Link key={item.label} to={item.href} className="rounded-lg px-3 py-2 transition hover:bg-white/10 hover:text-[#f5d08b]">
                        {item.label}
                      </Link>
                    ) : (
                      <a key={item.label} href={item.href} className="rounded-lg px-3 py-2 transition hover:bg-white/10 hover:text-[#f5d08b]">
                        {item.label}
                      </a>
                    ),
                  )}
                </nav>
                <div className="flex items-center gap-2">
                  <Link
                    to="/register"
                    className="hidden rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 sm:inline-flex"
                  >
                    تجربة مجانية
                  </Link>
                  <Link
                    to="/auth/teacher"
                    className="rounded-xl border border-[#d7a74a] bg-[#d7a74a] px-4 py-2 text-sm font-bold text-[#173f74] transition hover:bg-[#e2b457]"
                  >
                    تسجيل الدخول
                  </Link>
                </div>
              </div>
            </header>
          </div>
        </div>

        {/* ── محتوى الهيرو ── */}
        <div className="relative mx-auto max-w-[1400px] px-4 pt-28 sm:px-6 sm:pt-32 lg:px-10">
          <div className="grid items-center gap-14 pb-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
            {/* النص */}
            <div className="space-y-7 text-center lg:text-right">
              <Reveal from="none">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d7a74a]/35 bg-[#d7a74a]/10 px-5 py-2 text-sm font-bold text-[#f8d690] shadow-[0_0_20px_rgba(215,167,74,0.12)] backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-[#d7a74a]" />
                  نظام ERP متكامل للإدارة المدرسية
                </div>
              </Reveal>

              <Reveal delay={90} from="none">
                <h1 className="text-[44px] font-black leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-[64px]">
                  من طابور الصباح
                  <span className="relative mx-3 inline-block text-[#ecc36e]">
                    إلى تقرير المساء
                    <svg className="absolute -bottom-2 right-0 w-full" viewBox="0 0 220 12" fill="none" preserveAspectRatio="none" style={{ height: 10 }}>
                      <path d="M4 8.5C60 2.5 160 2.5 216 8.5" stroke="#d7a74a" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
                    </svg>
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={180} from="none">
                <p className="mx-auto max-w-xl text-base leading-8 text-white/75 lg:mx-0 sm:text-lg">
                  <span className="font-black text-white">نظام الرائد</span> يرصد الحضور، يراسل أولياء الأمور،
                  ويدير يومك المدرسي كاملاً — لحظة بلحظة، ومن مكان واحد.
                </p>
              </Reveal>

              <Reveal delay={260} from="none">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d7a74a] bg-[#d7a74a] px-8 py-4 text-base font-black text-[#173f74] shadow-[0_4px_24px_rgba(215,167,74,0.35)] transition hover:bg-[#e2b457] hover:shadow-[0_6px_32px_rgba(215,167,74,0.5)]"
                  >
                    جرّب النظام مجاناً
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/plans"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white/90 backdrop-blur-sm transition hover:bg-white/12"
                  >
                    استعرض الباقات
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={300} from="none">
                <Link
                  to="/story"
                  className="group inline-flex items-center gap-2.5 text-[13.5px] font-black text-[#f3cf87]/90 transition hover:text-[#f8d690]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d7a74a]/45 bg-[#d7a74a]/12 shadow-[0_0_18px_rgba(215,167,74,0.2)]">
                    <Sunrise className="h-4 w-4" />
                  </span>
                  عِش قصة يوم مدرسي كامل مع الرائد — من الفجر إلى الليل
                  <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </Link>
              </Reveal>

              <Reveal delay={330} from="none">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-white/60 lg:justify-start">
                  {['إعداد خلال يوم واحد', 'بدون تعقيد تقني', 'دعم فني مستمر'].map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#d7a74a]" />
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* الموك الحي */}
            <Reveal delay={200} from="none" className="relative z-10 px-4 pt-10 sm:px-8 lg:px-0 lg:pt-0">
              <HeroProductMock />
            </Reveal>
          </div>

          {/* ── شريط الأرقام (عدّادات) ── */}
          <Reveal>
            <div className="grid grid-cols-2 divide-white/10 rounded-2xl border border-white/12 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:grid-cols-5 sm:divide-x sm:divide-x-reverse">
              {heroMetrics.map((item) => (
                <div key={item.label} className="px-4 py-5 text-center">
                  <div className="text-2xl font-black text-[#f3cf87] drop-shadow-[0_0_12px_rgba(215,167,74,0.4)] sm:text-3xl">
                    {item.raw ?? <CountUp end={item.end!} suffix={item.suffix ?? ''} />}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-white/55">{item.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ══════════ شريط الوحدات الجاري ══════════ */}
      <div className="lp-marquee overflow-hidden border-b border-[#e5d9c2] bg-[#fdfaf4] py-4" dir="ltr">
        <div className="lp-marquee-track flex w-max items-center gap-3 pr-3">
          {[...systemModules, ...systemModules].map(({ name, icon: Icon }, index) => (
            <span
              key={`${name}-${index}`}
              dir="rtl"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[#e7dcc4] bg-white px-4 py-2 text-[12px] font-black text-[#5d5342] shadow-[0_4px_14px_-8px_rgba(8,41,84,0.25)]"
            >
              <Icon className="h-3.5 w-3.5 text-[#c89638]" />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════ رحلة اليوم الدراسي ══════════ */}
      <section id="journey" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <SectionHeading
          center
          eyebrow="رحلة اليوم الدراسي"
          title="يوم مدرسي كامل... يدير نفسه"
          subtitle="من لحظة فتح الأبواب حتى آخر تقرير — الرائد يعمل معك خطوة بخطوة، وأغلبها دون أن تلمس شيئاً."
        />

        <div className="relative mt-12">
          {/* الخط الواصل */}
          <div className="absolute right-[19px] top-2 bottom-2 w-px bg-[linear-gradient(180deg,transparent,#d9c294_12%,#d9c294_88%,transparent)] lg:right-0 lg:top-[26px] lg:bottom-auto lg:h-px lg:w-full lg:bg-[linear-gradient(90deg,transparent,#d9c294_8%,#d9c294_92%,transparent)]" />

          <div className="grid gap-8 lg:grid-cols-6 lg:gap-4">
            {journeySteps.map(({ time, title, text, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 90}>
                <div className="relative flex gap-4 pr-1 lg:flex-col lg:gap-0 lg:pr-0 lg:text-center">
                  {/* النقطة */}
                  <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#d7a74a] bg-[#0c3b70] text-[#f3cf87] shadow-[0_8px_20px_-8px_rgba(8,41,84,0.5)] lg:mx-auto lg:h-[52px] lg:w-[52px]">
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  </div>
                  <div className="lg:mt-4">
                    <div className="text-[11px] font-black tracking-wide text-[#b88c3d]">{time}</div>
                    <h3 className="mt-0.5 text-[15px] font-black text-[#14355d]">{title}</h3>
                    <p className="mt-1.5 text-[12.5px] font-medium leading-6 text-[#6f6a5e]">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ الواجهات الثلاث ══════════ */}
      <section id="portals" className="border-y border-[#e5d9c2] bg-[#fdfaf4]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <SectionHeading
            eyebrow="ثلاث بوابات — نظام واحد"
            title="واجهة لكل من يعنيه اليوم المدرسي"
            subtitle="الإدارة تقرر، المعلم ينفّذ، وولي الأمر يطمئن — كلٌ يرى ما يخصه فقط، والبيانات واحدة حيّة بينهم."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {portalCards.map(({ title, badge, description, icon: Icon, features }, index) => (
              <Reveal key={title} delay={index * 110}>
                <article className="lp-portal-card h-full overflow-hidden rounded-2xl border border-[#e7dcc7] bg-white shadow-[0_14px_40px_-28px_rgba(8,41,84,0.35)]">
                  {/* رأس متدرج */}
                  <div className="relative overflow-hidden bg-[linear-gradient(150deg,#0a3160_0%,#0e4a85_100%)] px-5 py-5 text-white">
                    <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
                    <div className="absolute -right-4 -bottom-10 h-24 w-24 rounded-full bg-[#d7a74a]/15 blur-xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#d7a74a]/40 bg-white/10 text-[#f3cf87] backdrop-blur-sm">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-md border border-[#d7a74a]/35 bg-[#d7a74a]/15 px-2 py-0.5 text-xs font-black text-[#f3cf87]">
                        {badge}
                      </span>
                    </div>
                    <h3 className="relative mt-3 text-lg font-black">{title}</h3>
                    <p className="relative mt-1 text-[12.5px] leading-6 text-white/70">{description}</p>
                  </div>
                  <ul className="space-y-2.5 px-5 py-5">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm font-medium text-[#3a5a7a]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#c89638]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>

          {/* الأدوار المساندة */}
          <Reveal delay={120}>
            <div className="mt-6 rounded-2xl border border-[#e7dcc7] bg-white px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="shrink-0 text-[13px] font-black text-[#14355d] lg:ml-4">
                  ويشمل بقية الأدوار:
                </div>
                <div className="flex flex-wrap gap-2">
                  {roleCards.map(({ title, subtitle, icon: Icon }) => (
                    <span
                      key={title}
                      className="flex items-center gap-2 rounded-lg border border-[#efe6d2] bg-[#fbf8f1] px-3 py-1.5"
                      title={subtitle}
                    >
                      <Icon className="h-3.5 w-3.5 text-[#b88c3d]" />
                      <span className="text-[12px] font-bold text-[#5d5342]">{title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════ المميزات (قسم كحلي) ══════════ */}
      <section
        id="features"
        className="relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(165deg, #082448 0%, #0b3d71 55%, #0d4278 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, #a8c8f0 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#d7a74a]/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <SectionHeading
            light
            eyebrow="18 ميزة أساسية"
            title="كل تفاصيل المدرسة... مغطّاة"
            subtitle="ثلاثة محاور تشغيلية تتكامل داخل منظومة واحدة — لا برامج متفرقة ولا نسخ بيانات بين الأنظمة."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {featureGroups.map(({ category, items }, index) => (
              <Reveal key={category} delay={index * 110}>
                <div className="h-full rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[15px] font-black text-white">{category}</span>
                    <span className="rounded-md border border-[#d7a74a]/30 bg-[#d7a74a]/10 px-2 py-0.5 text-[11px] font-bold text-[#f3cf87]">
                      {items.length} ميزات
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {items.map(({ title, icon: Icon }) => (
                      <li key={title} className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 text-[#e9c579]">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[13px] font-semibold text-white/85">{title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* شريط الثقة */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {trustItems.map(({ title, subtitle, icon: Icon }, index) => (
              <Reveal key={title} delay={index * 80}>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d7a74a]/15 text-[#f3cf87]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-white">{title}</div>
                    <div className="text-[11px] leading-5 text-white/55">{subtitle}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ الدعوة الختامية ══════════ */}
      <section id="cta" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-[#e0cfa6]/60 bg-[linear-gradient(150deg,#0b3d71_0%,#0e4d8a_60%,#133e6e_100%)] text-white shadow-[0_30px_80px_-36px_rgba(8,41,84,0.6)]">
            <div className="border-b border-white/10 px-6 py-4 sm:px-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7a74a]/20 text-[#d7a74a]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-white/80">نظام الرائد — جاهزية تشغيلية من أول يوم</span>
                </div>
                <span className="rounded-lg border border-[#d7a74a]/30 bg-[#d7a74a]/10 px-3 py-1 text-xs font-bold text-[#f3cf87]">
                  تجربة مجانية متاحة الآن
                </span>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="border-b border-white/10 px-6 py-9 sm:px-10 lg:border-b-0 lg:border-l">
                <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                  جاهز للارتقاء
                  <span className="block text-[#ecc36e]">بإدارة مدرستك؟</span>
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-white/70">
                  انضم إلى المدارس التي تدير يومها بكفاءة مع نظام الرائد — من الحضور والسلوك والرسائل إلى
                  التقارير ولوحات المتابعة في منظومة واحدة مترابطة.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {['تشغيل يومي أسرع', 'رسائل واتساب آلية', 'تقارير فورية', 'دعم فني مستمر'].map((feature) => (
                    <span key={feature} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75">
                      <CheckCircle2 className="h-3 w-3 text-[#d7a74a]" />
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d7a74a] px-8 py-4 text-base font-black text-[#173f74] shadow-[0_4px_24px_rgba(215,167,74,0.3)] transition hover:bg-[#e2b457]"
                  >
                    ابدأ الآن مجاناً
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/auth/admin"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white/90 transition hover:bg-white/12"
                  >
                    دخول الإدارة
                  </Link>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 bg-white/5 px-6 py-9 sm:px-10">
                <div className="text-center">
                  <div className="text-base font-black text-white">سجّل الآن</div>
                  <div className="mt-0.5 text-xs font-medium text-white/55">امسح QR للتسجيل السريع</div>
                </div>
                <div className="w-full max-w-[160px] rounded-2xl border border-[#d7a74a]/30 bg-white p-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]">
                  <div className="grid grid-cols-6 gap-1 rounded-xl bg-[#fffaf0] p-3">
                    {Array.from({ length: 36 }).map((_, index) => (
                      <div
                        key={index}
                        className={
                          index % 5 === 0 || index % 7 === 0 || index === 1 || index === 8 || index === 28
                            ? 'aspect-square rounded-[3px] bg-[#173f74]'
                            : 'aspect-square rounded-[3px] bg-[#d8c6a1]/55'
                        }
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5 text-[#b88c3d]" />
                    <span className="text-[10px] font-bold text-[#7d6b4f]">نظام الرائد</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════ الفوتر ══════════ */}
      <footer className="border-t border-white/10 bg-[#071e3d] text-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr] lg:px-10">
          <div className="space-y-4">
            <BrandMark compact />
            <p className="max-w-sm text-[13px] leading-7 text-white/55">
              منظومة سعودية متكاملة للإدارة المدرسية — حضور، سلوك، تواصل، تقارير، وأتمتة يومية تعمل
              لحظة بلحظة لخدمة المدرسة وأولياء الأمور.
            </p>
          </div>
          <div>
            <div className="mb-3 text-sm font-black text-[#ecc36e]">روابط سريعة</div>
            <ul className="space-y-2 text-[13px] font-semibold text-white/65">
              <li><a href="#journey" className="transition hover:text-[#f5d08b]">رحلة اليوم الدراسي</a></li>
              <li><a href="#portals" className="transition hover:text-[#f5d08b]">الواجهات</a></li>
              <li><a href="#features" className="transition hover:text-[#f5d08b]">المميزات</a></li>
              <li><Link to="/plans" className="transition hover:text-[#f5d08b]">الباقات والأسعار</Link></li>
              <li><Link to="/register" className="transition hover:text-[#f5d08b]">تسجيل مدرسة جديدة</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-black text-[#ecc36e]">الدخول للنظام</div>
            <ul className="space-y-2 text-[13px] font-semibold text-white/65">
              <li><Link to="/auth/admin" className="transition hover:text-[#f5d08b]">بوابة الإدارة</Link></li>
              <li><Link to="/auth/teacher" className="transition hover:text-[#f5d08b]">بوابة المعلمين</Link></li>
              <li><a href="#cta" className="transition hover:text-[#f5d08b]">تواصل معنا</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[12.5px] font-medium text-white/50 sm:px-6 lg:px-10">
          © {new Date().getFullYear()} نظام الرائد للإدارة المدرسية — جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  )
}

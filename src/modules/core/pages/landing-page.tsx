import {
  BarChart3,
  BellRing,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Fingerprint,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  QrCode,
  Quote,
  ScanLine,
  Send,
  RefreshCw,
  Star,
  Sunrise,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'

type IconType = LucideIcon

/* ─────────────────────────────────────────────
   البيانات
   ───────────────────────────────────────────── */

/* النوع مثبَّت صراحةً: كان يُستنتج من المحتوى، وعنصر «الأسعار» هو حامل
   isRoute الوحيد — فبحذفه كان يسقط الحقل من النوع وينفجر item.isRoute
   في شريط سطح المكتب وقائمة الجوال، ويفشل tsc -b قبل vite */
const navItems: Array<{ label: string; href: string; isRoute?: boolean }> = [
  { label: 'الرئيسية', href: '#top' },
  { label: 'رحلة اليوم', href: '#journey' },
  { label: 'الواجهات', href: '#portals' },
  { label: 'المميزات', href: '#features' },
  { label: 'الأسئلة الشائعة', href: '#faq' },
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
      { title: 'برنامج نقاطي متكامل', icon: Star },
      { title: 'التوجيه الإرشادي والطلابي', icon: Fingerprint },
      { title: 'متابعة السلوك والمواظبة', icon: Trophy },
      { title: 'لوحات المعلومات التفاعلية', icon: BarChart3 },
      { title: 'تقارير الطالب التفصيلية', icon: FileText },
      { title: 'ربط وتكامل مع فارس', icon: RefreshCw },
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

/* شرائح بشكل شرائح الهيرو نفسه — كانت أربع بطاقات بعنوان ووصف وأيقونة */
const trustItems: string[] = ['تحديثات مستمرة', 'أمان عالٍ للبيانات', 'دعم فني متميز', 'سهولة الاستخدام']

// الأسماء والصفات حقيقية بموافقة أصحابها، ونصوص الاقتباسات ما زالت تمثيلية
// تُستبدل بأقوالهم الفعلية عند توفرها — فلا يُضاف اسم جديد هنا بلا إذن صاحبه
const testimonials: Array<{ quote: string; name: string; role: string; initials: string }> = [
  {
    quote:
      'كنا نستهلك أول ساعتين من اليوم في متابعة الحضور والتواصل مع أولياء الأمور. مع الرائد صار كل شيء آلياً — والوقت الذي وفّرناه نستثمره الآن في التعليم نفسه.',
    name: 'أ. حسن الرشيد',
    role: 'مدير مدرسة',
    initials: 'ح',
  },
  {
    quote:
      'رسائل الواتساب الفورية غيّرت علاقتنا بأولياء الأمور تماماً؛ صاروا يعرفون قبل أن نتصل بهم. نسبة الغياب عندنا انخفضت بشكل واضح خلال فصل واحد.',
    name: 'أ. عبدالله العماري',
    role: 'وكيل شؤون الطلاب',
    initials: 'ع',
  },
  {
    quote:
      'التحضير كان عبئاً يومياً، الآن أنهيه بدقيقة من جوالي قبل دخول الفصل. ولوحة النقاط جعلت الطلاب يتنافسون على السلوك الإيجابي بدل مطاردتهم عليه.',
    name: 'أ. أحمد البارقي',
    role: 'معلم صف',
    initials: 'أ',
  },
]

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'كم يستغرق تجهيز النظام لمدرستنا؟',
    answer:
      'يوم عمل واحد فقط. فريقنا يساعدك في استيراد بيانات الطلاب والمعلمين والجداول من ملفات Excel أو نظام نور، وتبدأ المدرسة باستخدام النظام من صباح اليوم التالي.',
  },
  {
    question: 'هل نحتاج أجهزة أو تجهيزات خاصة؟',
    answer:
      'لا. النظام يعمل بالكامل من المتصفح على أي جهاز — حاسب، جوال، أو لوح ذكي. وتحضير الطلاب بالباركود يتم عبر كاميرا الجوال دون الحاجة لأي قارئ إضافي.',
  },
  {
    question: 'كيف تصل رسائل الواتساب لأولياء الأمور؟',
    answer:
      'تلقائياً فور تسجيل الغياب أو التأخر، دون أي تدخل منك. تُرسل الرسائل بهوية المدرسة وتشمل اسم الطالب ووقت الرصد، مع سجل كامل لكل رسالة مرسلة داخل النظام.',
  },
  {
    question: 'هل يدعم النظام التصدير لنظام نور؟',
    answer:
      'نعم، يوفّر الرائد تصدير الغياب والتأخر بصيغة متوافقة مع نظام نور بضغطة واحدة، إضافة إلى تقارير يومية وأسبوعية جاهزة للطباعة والاعتماد.',
  },
  {
    question: 'ماذا عن أمان بيانات المدرسة والطلاب؟',
    answer:
      'بياناتك مشفّرة ومحفوظة على خوادم آمنة، مع نسخ احتياطي يومي تلقائي وصلاحيات دقيقة تضمن أن كل مستخدم يرى ما يخصّه فقط — لا أكثر.',
  },
  {
    question: 'هل يمكن تجربة النظام قبل الاشتراك؟',
    answer:
      'بالتأكيد. نمنحك تجربة مجانية كاملة تشمل كل المزايا مع بيانات تجريبية جاهزة، لتقيّم النظام في بيئة مدرستك الفعلية قبل أي التزام مالي.',
  },
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

/* ─────────────────────────────────────────────
   الهوية
   ───────────────────────────────────────────── */

function BrandMark({ compact = false }: { compact?: boolean }) {
  /* المضغوطة: خاتم ذهبي على كحلي — لا مربّع كريمي ساطع.
     الكريمي كان أنصع عنصر في الشريط فيسحب العين من زر الدخول،
     والسطر الداخلي كان 6px (غير مقروء) ومكرّراً حرفياً للاسم بجواره. */
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        {/* الشعار نفسه المستعمل في صفحة التسجيل — كان حرف «ر» */}
        <div className="lp-e-ring relative grid h-10 w-10 place-items-center rounded-xl border border-[#d7a74a]/70 bg-[linear-gradient(150deg,#22432C,#132D1D)]">
          <div className="absolute inset-[3px] rounded-lg border border-[#d7a74a]/25" />
          <BookOpenCheck className="h-[19px] w-[19px] text-[#f3cf87]" />
        </div>
        <div className="text-right">
          <div className="text-[15px] font-black leading-tight text-white">نظام الرائد</div>
          <div className="text-[10.5px] font-semibold leading-tight text-[#e3c489]">للإدارة المدرسية</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div className="relative grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#d7a74a] bg-[#fff7e9] sm:h-24 sm:w-24">
        <div className="absolute inset-2 rounded-full border border-[#edd8ad]" />
        <div className="text-center leading-none text-[#204029]">
          <div className="text-3xl font-bold sm:text-4xl">الرائد</div>
          <div className="mt-1 text-[10px] font-semibold text-[#7d6b4f] sm:text-[11px]">نظام الإدارة المدرسية</div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   الشريط العلوي (يتفاعل مع التمرير + قائمة جوال)
   ───────────────────────────────────────────── */

function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      const track = document.documentElement.scrollHeight - window.innerHeight
      setProgress(track > 0 ? Math.min(1, y / track) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="fixed inset-x-0 top-0 z-[60] px-4 pt-3 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        {/* فوق الهيرو: بلا لوح إطلاقاً. الشريط كان يرسم لوحاً كحلياً فاتحاً
            (#24452F) فوق أغمق نقطة في الهيرو (#08190F) فيظهر مستطيلاً ساطعاً
            معلّقاً، ثم يغمق عند التمرير — عكس المنطق. الآن: شفاف عند القمة،
            يتجسّد داكناً حين يمرّ فوق الأقسام الفاتحة. */}
        <header
          className={`relative rounded-2xl border px-4 py-2.5 transition-all duration-300 sm:px-5 ${
            scrolled
              ? 'lp-e-head border-[#d7a74a]/25 bg-[#0A1E13]/95 backdrop-blur-xl'
              : 'border-transparent bg-transparent'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <BrandMark compact />
            <nav className="hidden items-center gap-0.5 text-sm font-bold text-white/90 lg:flex">
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
                className="hidden rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/15 sm:inline-flex"
              >
                تجربة مجانية
              </Link>
              <Link
                to="/auth/teacher"
                className="rounded-xl border border-[#d7a74a] bg-[#d7a74a] px-4 py-2 text-sm font-bold text-[#163C27] transition hover:bg-[#e8bc63]"
              >
                تسجيل الدخول
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={menuOpen}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* خيط تقدّم القراءة — يظهر مع اللوح فقط كي لا يعلّق خطاً على الهيرو */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-4 bottom-0 h-px overflow-hidden rounded-full transition-opacity duration-300 sm:inset-x-5 ${
              scrolled ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="h-full origin-right rounded-full bg-[linear-gradient(90deg,#d7a74a,#f3cf87)]"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        </header>

        {/* قائمة الجوال */}
        <div
          className={`grid transition-all duration-300 ease-out lg:hidden ${
            menuOpen ? 'visible mt-2 grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="overflow-hidden">
            <nav className="rounded-2xl border border-[#d7a74a]/20 bg-[#0A1E13]/95 p-2.5 backdrop-blur-xl">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={closeMenu}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-[#f5d08b]"
                  >
                    {item.label}
                    <ChevronLeft className="h-4 w-4 text-white/70" />
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-[#f5d08b]"
                  >
                    {item.label}
                    <ChevronLeft className="h-4 w-4 text-white/70" />
                  </a>
                ),
              )}
              <div className="mt-1.5 border-t border-white/10 pt-1.5 sm:hidden">
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[#d7a74a]/60 bg-[#d7a74a]/15 px-4 py-3 text-sm font-black text-[#f3cf87] transition hover:bg-[#d7a74a]/25"
                >
                  ابدأ تجربتك المجانية
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </div>
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
        style={{ background: 'radial-gradient(closest-side, rgba(215,167,74,0.35), rgba(76,175,80,0.18), transparent)' }}
      />

      {/* البطاقة الرئيسية: لوحة التحضير */}
      <div className="lp-tilt relative overflow-hidden rounded-2xl border border-white/60 bg-white text-right ">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-[#eee5d4] bg-[#fbf8f2] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#204029] text-[#f3cf87]">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[12.5px] font-black text-[#163C27]">لوحة التحضير — السادس (أ)</div>
              <div className="text-[10px] font-semibold text-[#7d6b4f]">الحصة الأولى • لغتي الجميلة</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-[#e6f6ec] px-2.5 py-1 text-[10px] font-black text-[#1e7c45]">
            <span className="lp-live-dot h-1.5 w-1.5 rounded-full bg-[#22a55a]" />
            مباشر
          </span>
        </div>

        {/* صفوف الطلاب — الحالات تُختم تباعاً */}
        <div className="relative px-3 py-2">
          {/* الغلاف يأخذ ارتفاع الحاوية كاملاً فتصير 100% في الحركة = ارتفاع القائمة،
              والشريط بداخله بارتفاعه الثابت. بلا هذا الغلاف كانت النسبة تُحسب على
              ارتفاع الشريط نفسه (h-10 = 2.5rem) فتصير مسافة الانتقال صفراً */}
          <div className="lp-scan pointer-events-none absolute inset-0">
            <div className="h-10 rounded-lg bg-[#d7a74a]/[0.08]" />
          </div>
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
                    <div className="text-[12px] font-bold leading-4 text-[#2A4E37]">{student.name}</div>
                    <div className="text-[9.5px] font-semibold text-[#7d6b4f]">{student.grade}</div>
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
        <div className="rounded-xl border border-white/70 bg-white/95 p-3 text-right backdrop-blur">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7f8ee] text-[#1faa59]">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-[#163C27]">رسالة واتساب أُرسلت</div>
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
        <div className="rounded-xl border border-white/70 bg-white/95 p-3 text-right backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fdf3df] text-[#a8690a]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="text-left">
              <div className="text-lg font-black leading-5 text-[#163C27]">3</div>
              <div className="text-[9.5px] font-bold text-[#7d6b4f]">متأخرو اليوم</div>
            </div>
          </div>
          <div className="mt-2 border-t border-[#f3ede0] pt-1.5 text-[9.5px] font-semibold text-[#6b6b6b]">
            رسائل التأخر أُرسلت تلقائياً ✓
          </div>
        </div>
      </div>

      {/* شارة الحصة الحالية */}
      <div className="lp-float absolute -top-4 left-2 sm:left-6" style={{ animationDelay: '-2s' }}>
        <span className="flex items-center gap-1.5 rounded-full border border-[#d7a74a]/40 bg-[#204029]/90 px-3 py-1.5 text-[10px] font-black text-[#f3cf87] backdrop-blur">
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
            ? 'inline-flex items-center gap-2 rounded-full border border-[#d7a74a]/40 bg-[#d7a74a]/10 px-3.5 py-1 text-[11px] font-black tracking-wide text-[#f3cf87]'
            : 'inline-flex items-center gap-2 rounded-full border border-[#e0cfa6] bg-[#fbf4e4] px-3.5 py-1 text-[11px] font-black tracking-wide text-[#856224]'
        }
      >
        {eyebrow}
      </span>
      <h2
        className={
          light
            ? 'text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl'
            : 'text-3xl font-black leading-tight tracking-tight text-[#173D28] sm:text-4xl'
        }
      >
        {title}
      </h2>
      <p className={light ? 'text-sm font-medium leading-7 text-white/75 sm:text-[15px]' : 'text-sm font-medium leading-7 text-[#6f6a5e] sm:text-[15px]'}>
        {subtitle}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   الأسئلة الشائعة (أكورديون)
   ───────────────────────────────────────────── */

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-3">
      {faqItems.map((item, index) => {
        const open = openIndex === index
        return (
          <Reveal key={item.question} delay={index * 60}>
            <div
              className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                open
                  ? 'border-[#d7a74a]/55 bg-white '
                  : 'border-[#e7dcc7] bg-white/80 hover:border-[#dcc99c] hover:bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? -1 : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
              >
                <span className={`text-[14.5px] font-black transition-colors ${open ? 'text-[#204029]' : 'text-[#173D28]'}`}>
                  {item.question}
                </span>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                    open
                      ? 'rotate-180 border-[#d7a74a] bg-[#d7a74a] text-[#163C27]'
                      : 'border-[#e0cfa6] bg-[#fbf4e4] text-[#856224]'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
              <div
                className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-[13px] font-medium leading-7 text-[#6f6a5e]">{item.answer}</p>
                </div>
              </div>
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   رمز QR حقيقي يوجّه لصفحة التسجيل
   ───────────────────────────────────────────── */

function RegisterQrCode() {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    QRCode.toDataURL(`${window.location.origin}/register`, {
      margin: 1,
      width: 360,
      color: { dark: '#163C27', light: '#fffaf0' },
    })
      .then((url) => {
        if (mounted) setSrc(url)
      })
      .catch(() => {
        /* يبقى الإطار فارغاً بهدوء عند تعذر التوليد */
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="w-full max-w-[160px] rounded-2xl border border-[#d7a74a]/30 bg-white p-3 ">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#fffaf0]">
        {src ? (
          <img src={src} alt="رمز QR للتسجيل السريع في نظام الرائد" className="h-full w-full" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <QrCode className="h-8 w-8 animate-pulse text-[#d8c6a1]" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <QrCode className="h-3.5 w-3.5 text-[#b88c3d]" />
        <span className="text-[10px] font-bold text-[#7d6b4f]">نظام الرائد</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   الصفحة
   ───────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div
      id="top"
      dir="rtl"
      className="min-h-screen bg-[#f6f1e7] text-[#1A3F2B]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif" }}
    >
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
        /* المسح يقطع ارتفاع القائمة الفعلي: كان مثبّتاً على 190px بينما
           الحاوية تحسب ارتفاعها من عدد الطلاب، فيقف قبل النهاية أو يتجاوزها */
        @keyframes lp-scan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(calc(100% - 2.5rem)); opacity: 0; } }
        @keyframes lp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lp-aurora { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-42px,26px,0) scale(1.14); } }
        @keyframes lp-shine { from { background-position: 200% center; } to { background-position: -200% center; } }
        html { scroll-behavior: smooth; }
        section[id], #top { scroll-margin-top: 96px; }

        /* ── العمق بلا ظلال ──
           الظل الضبابي مظهر قديم، والنظام كله مسطّح عمداً
           ([class*='shadow'] مُلغى عالمياً في styles/index.css).
           الفصل هنا يأتي من: حدّ شعري بلونٍ من العائلة نفسها، وفرقِ
           درجةٍ بين السطح وما تحته، وخطٍّ علوي مضيء داخل الأسطح الداكنة.
           لا blur ولا ارتفاع وهمي — حوافُّ صريحة فقط. */
        /* حلقة شعرية حادّة (1px بلا تمويه) — ليست ظلاً بل حدٌّ ثانٍ */
        .lp-e-ring { box-shadow: 0 0 0 1px rgba(215,167,74,0.22); }
        /* الشريط الملتصق: خيط ذهبي أسفله يفصله عمّا يمرّ تحته */
        .lp-e-head { box-shadow: 0 1px 0 0 rgba(215,167,74,0.18); }
        /* لمعة علوية بمقدار بكسل داخل الأسطح الشفافة الداكنة — تُقعّرها */
        .lp-e-inset { box-shadow: inset 0 1px 0 rgba(255,255,255,0.12); }
        .lp-float { animation: lp-float 5.5s ease-in-out infinite alternate; }
        .lp-float-slow { animation: lp-float 7s ease-in-out infinite alternate; animation-delay: -3s; }
        .lp-live-dot { animation: lp-live 2s ease-out infinite; }
        .lp-stamp { animation: lp-stamp 8s ease-in-out infinite; }
        .lp-scan { animation: lp-scan 8s ease-in-out infinite; }
        /* 64s لا 32s: مسافة الدورة صارت نسختين بدل واحدة، فمضاعفة المدّة
           تُبقي السرعة المرئية (بكسل/ثانية) على ما كانت عليه */
        .lp-marquee-track { animation: lp-marquee 64s linear infinite; will-change: transform; }
        .lp-marquee:hover .lp-marquee-track { animation-play-state: paused; }
        .lp-aurora { animation: lp-aurora 16s ease-in-out infinite; will-change: transform; }
        .lp-gold-shine { background-size: 200% auto; animation: lp-shine 7s linear infinite; }
        /* الميلان ثلاثي الأبعاد لسطح المكتب فقط — كان دائماً على كل المقاسات
           فتصل البطاقة للجوال مائلة بلا تفسير ولا مفرّ (الفكّ عند hover فقط) */
        .lp-tilt { transition: transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        @media (min-width: 1024px) {
          .lp-tilt { transform: rotateY(-6deg) rotateX(3deg); }
          .lp-tilt:hover { transform: rotateY(0deg) rotateX(0deg); }
        }
        .lp-bar-fill { transition: width 1.6s cubic-bezier(0.22,1,0.36,1) 0.3s; }
        /* التحويم: رفعة + اشتداد الحدّ — لا ظلّ ينمو تحت البطاقة */
        .lp-portal-card { transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.3s ease; }
        .lp-portal-card:hover { transform: translateY(-6px); border-color: #d7a74a; }
        .lp-journey-step { transition: background-color 0.35s ease, border-color 0.35s ease; }
        @media (min-width: 1024px) {
          .lp-journey-step:hover { background-color: #ffffff; border-color: #e7dcc7; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .lp-float, .lp-float-slow, .lp-live-dot, .lp-stamp, .lp-scan, .lp-marquee-track, .lp-aurora, .lp-gold-shine { animation: none !important; }
          .lp-stamp { opacity: 1 !important; }
          .lp-scan { opacity: 0 !important; }
        }
      `}</style>

      <SiteHeader />

      {/* ══════════ الهيرو ══════════ */}
      <div
        className="relative overflow-hidden pb-16 text-white"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(215,167,74,0.14) 0%, transparent 70%), radial-gradient(ellipse 45% 65% at 95% 20%, rgba(215,167,74,0.2) 0%, transparent 60%), radial-gradient(ellipse 55% 75% at -5% 40%, rgba(38,80,52,0.65) 0%, transparent 65%), linear-gradient(172deg, #08190F 0%, #1D3826 38%, #24452F 62%, #2C5637 100%)',
        }}
      >
        {/* شبكة نقطية */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #8FD49B 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* حلقات زخرفية */}
        <div className="absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full border border-[#d7a74a]/[0.12]" />
        <div className="absolute -right-10 -top-10 h-[280px] w-[280px] rounded-full border border-[#d7a74a]/20" />
        <div className="absolute -left-28 bottom-6 h-[340px] w-[340px] rounded-full border border-white/[0.06]" />
        {/* توهجات ثابتة */}
        <div className="absolute -right-10 top-0 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #d7a74a, transparent 70%)' }} />
        <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #4CAF50, transparent 70%)' }} />
        {/* توهجات متحركة (أورورا) */}
        <div className="lp-aurora absolute right-[12%] top-[18%] h-80 w-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #66BB6A, transparent 70%)' }} />
        <div className="lp-aurora absolute bottom-[8%] left-[16%] h-72 w-72 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #d7a74a, transparent 70%)', animationDelay: '-8s' }} />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(215,167,74,0.5)_50%,transparent_100%)]" />

        {/* ── محتوى الهيرو ── */}
        <div className="relative mx-auto max-w-[1400px] px-4 pt-28 sm:px-6 sm:pt-32 lg:px-10">
          <div className="grid items-center gap-14 pb-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
            {/* النص */}
            <div className="space-y-7 text-center lg:text-right">
              <Reveal from="none">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d7a74a]/35 bg-[#d7a74a]/10 px-5 py-2 text-sm font-bold text-[#f8d690] backdrop-blur-sm">
                  نظام ERP متكامل للإدارة المدرسية
                </div>
              </Reveal>

              <Reveal delay={90} from="none">
                <h1 className="text-[44px] font-black leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-[64px]">
                  من طابور الصباح
                  <span className="relative mx-3 inline-block">
                    <span className="lp-gold-shine bg-[linear-gradient(110deg,#ecc36e_25%,#fff3d6_45%,#d7a74a_65%)] bg-clip-text text-transparent">
                      إلى تقرير المساء
                    </span>
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d7a74a] bg-[#d7a74a] px-8 py-4 text-base font-black text-[#163C27] transition hover:bg-[#e2b457]"
                  >
                    جرّب النظام مجاناً
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={300} from="none">
                <Link
                  to="/story"
                  className="group inline-flex items-center gap-2.5 text-[13.5px] font-black text-[#f3cf87]/90 transition hover:text-[#f8d690]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d7a74a]/45 bg-[#d7a74a]/[0.12] ">
                    <Sunrise className="h-4 w-4" />
                  </span>
                  عش قصة يوم مع الرائد — من الفجر إلى الليل
                  <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </Link>
              </Reveal>

              <Reveal delay={330} from="none">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-white/75 lg:justify-start">
                  {['أكثر من 200 ميزة', 'إعداد خلال يوم واحد', 'بدون تعقيد تقني', 'دعم فني مستمر'].map((item) => (
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

        </div>

        {/* موجة فاصلة نحو شريط الوحدات */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-none">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="h-10 w-full fill-[#fdfaf4]">
            <path d="M0,40 C240,64 480,8 720,24 C960,40 1200,56 1440,24 L1440,64 L0,64 Z" />
          </svg>
        </div>
      </div>

      {/* ══════════ شريط الوحدات الجاري ══════════
          كان ينقطع: نسختان فقط والحركة إلى -50%، أي أن مسافة الدورة =
          عرض نسخة واحدة (~1400px). على شاشة أعرض من ذلك يفرغ يمينُها
          قبل أن يقفز الشريط للبداية — فيُرى انقطاعٌ ثم استئنافٌ مفاجئ.
          الحل: أربع نسخ، فمسافة الدورة تصير نسختين (~2800px) وتغطّي
          أعرض الشاشات. والفراغ نُقل من gap على المسار إلى mr على كل
          شريحة: مع gap يبقى ٣٥ فراغاً بين ٣٦ عنصراً فلا يساوي نصفُ
          العرض عدداً صحيحاً من الدورات، وكان يُعوَّض بحشوة pr-3 خفيّة
          تنكسر بأي تغيير في المقاسات. */}
      <div className="lp-marquee overflow-hidden border-b border-[#e5d9c2] bg-[#fdfaf4] py-4" dir="ltr">
        <div className="lp-marquee-track flex w-max items-center">
          {[...systemModules, ...systemModules, ...systemModules, ...systemModules].map(({ name, icon: Icon }, index) => (
            <span
              key={`${name}-${index}`}
              dir="rtl"
              aria-hidden={index >= systemModules.length}
              className="mr-3 flex shrink-0 items-center gap-2 rounded-full border border-[#e7dcc4] bg-white px-4 py-2 text-[12px] font-black text-[#5d5342]"
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
                <div className="lp-journey-step relative flex gap-4 rounded-2xl border border-transparent pr-1 lg:flex-col lg:gap-0 lg:p-3 lg:pr-3 lg:text-center">
                  {/* النقطة */}
                  <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#d7a74a] bg-[#204029] text-[#f3cf87] lg:mx-auto lg:h-[52px] lg:w-[52px]">
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  </div>
                  <div className="lg:mt-4">
                    <div className="text-[11px] font-black tracking-wide text-[#7f6020]">{time}</div>
                    <h3 className="mt-0.5 text-[15px] font-black text-[#173D28]">{title}</h3>
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
                <article className="lp-portal-card h-full overflow-hidden rounded-2xl border border-[#e7dcc7] bg-white ">
                  {/* رأس متدرج */}
                  <div className="relative overflow-hidden bg-[linear-gradient(150deg,#1A3826_0%,#2C5637_100%)] px-5 py-5 text-white">
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
                      <li key={feature} className="flex items-center gap-2 text-sm font-medium text-[#3D6349]">
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
                <div className="shrink-0 text-[13px] font-black text-[#173D28] lg:ml-4">
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
        style={{ background: 'linear-gradient(165deg, #0F2A1B 0%, #24452F 55%, #26492F 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, #8FD49B 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#d7a74a]/10 blur-3xl" />
        <div className="lp-aurora absolute -right-16 bottom-16 h-80 w-80 rounded-full bg-[#66BB6A]/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1400px] px-4 pb-24 pt-16 sm:px-6 lg:px-10 lg:pb-28 lg:pt-20">
          <SectionHeading
            light
            eyebrow="18 ميزة من 26 منظومة"
            title="يدقّ الجرس ويرصد في نور"
            subtitle="الحضور والسلوك والمعلّمون والتواصل في منظومة واحدة بقاعدة بيانات واحدة، وبأربع بوابات: الإدارة والمعلّم ووليّ الأمر والتوجيه الطلابي — والتبادل مع نور ومدرستي وحضوري يجري بلا إدخال مزدوج ولا نقل يدوي."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {featureGroups.map(({ category, items }, index) => (
              <Reveal key={category} delay={index * 110}>
                <div className="h-full rounded-2xl border border-white/[0.12] bg-white/[0.06] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-[#d7a74a]/30 hover:bg-white/[0.09]">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[15px] font-black text-white">{category}</span>
                    <span className="rounded-md border border-[#d7a74a]/30 bg-[#d7a74a]/10 px-2 py-0.5 text-[11px] font-bold text-[#f3cf87]">
                      {items.length} ميزات
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {items.map(({ title, icon: Icon }) => (
                      <li key={title} className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[#e9c579]">
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

          {/* شريط الثقة — بشكل شرائح الهيرو: سطر واحد ملفوف بعلامة صحّ */}
          <Reveal>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-white/75">
              {trustItems.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#d7a74a]" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* موجة فاصلة نحو قسم الآراء */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-none">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="h-10 w-full fill-[#f6f1e7]">
            <path d="M0,32 C300,60 620,4 900,20 C1120,32 1300,52 1440,28 L1440,64 L0,64 Z" />
          </svg>
        </div>
      </section>

      {/* ══════════ آراء المدارس ══════════ */}
      <section id="testimonials" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <SectionHeading
          center
          eyebrow="آراء المدارس"
          title="ماذا يقول من يدير يومه مع الرائد؟"
          subtitle="من مدير المدرسة إلى معلم الصف — خلاصة تجربة فرق العمل التي تعتمد الرائد في يومها الدراسي."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 110}>
              <figure className="lp-portal-card relative flex h-full flex-col rounded-2xl border border-[#e7dcc7] bg-white p-6 ">
                <Quote className="absolute left-5 top-5 h-8 w-8 text-[#d7a74a]/25" />
                <div className="flex gap-1 text-[#d7a74a]" aria-label="تقييم خمس نجوم">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[13.5px] font-medium leading-7 text-[#3D6349]">
                  «{testimonial.quote}»
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-[#f3ede0] pt-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(150deg,#1A3826,#2C5637)] text-base font-black text-[#f3cf87]">
                    {testimonial.initials}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-black text-[#173D28]">{testimonial.name}</div>
                    <div className="text-[11.5px] font-semibold text-[#7d6b4f]">{testimonial.role}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════ الأسئلة الشائعة ══════════ */}
      <section id="faq" className="border-y border-[#e5d9c2] bg-[#fdfaf4]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <SectionHeading
            center
            eyebrow="الأسئلة الشائعة"
            title="كل ما تريد معرفته قبل البدء"
            subtitle="جمعنا أكثر ما يسألنا عنه مديرو المدارس — وإن بقي لديك سؤال آخر، فريقنا جاهز للرد عليك."
          />
          <FaqAccordion />
        </div>
      </section>

      {/* ══════════ الدعوة الختامية ══════════ */}
      <section id="cta" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-[#e0cfa6]/60 bg-[linear-gradient(150deg,#24452F_0%,#2C5637_60%,#1F4029_100%)] text-white">
            <div className="border-b border-white/10 px-6 py-4 sm:px-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d7a74a] px-8 py-4 text-base font-black text-[#163C27] transition hover:bg-[#e2b457]"
                  >
                    ابدأ الآن مجاناً
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/auth/admin"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-8 py-4 text-base font-bold text-white/90 transition hover:bg-white/[0.12]"
                  >
                    دخول الإدارة
                  </Link>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 bg-white/5 px-6 py-9 sm:px-10">
                <div className="text-center">
                  <div className="text-base font-black text-white">سجّل الآن</div>
                  <div className="mt-0.5 text-xs font-medium text-white/70">امسح الرمز للانتقال لصفحة التسجيل</div>
                </div>
                <RegisterQrCode />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════ الفوتر ══════════ */}
      <footer className="relative overflow-hidden bg-[#0B2114] text-white">
        {/* موجة الدخول للفوتر — كان الانتقال من الكريمي للكحلي خطاً أفقياً
            حادّاً وحده في صفحة كل فواصلها الأخرى موجية. نفس اللغة: نفس
            viewBox والارتفاع والسعة، مقلوبةً رأسياً كي تملأ الأعلى بلون
            القسم السابق (#f6f1e7) فينسكب على الفوتر. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 leading-none">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="h-10 w-full fill-[#f6f1e7]">
            <path d="M0,32 C300,4 620,60 900,44 C1120,32 1300,12 1440,36 L1440,0 L0,0 Z" />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 pb-12 pt-20 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr] lg:px-10">
          <div className="space-y-4">
            <BrandMark compact />
            <p className="max-w-sm text-[13px] leading-7 text-white/70">
              منظومة سعودية متكاملة للإدارة المدرسية — حضور، سلوك، تواصل، تقارير، وأتمتة يومية تعمل
              لحظة بلحظة لخدمة المدرسة وأولياء الأمور.
            </p>
          </div>
          <div>
            <div className="mb-3 text-sm font-black text-[#ecc36e]">روابط سريعة</div>
            <ul className="space-y-2 text-[13px] font-semibold text-white/75">
              <li><a href="#journey" className="transition hover:text-[#f5d08b]">رحلة اليوم الدراسي</a></li>
              <li><a href="#portals" className="transition hover:text-[#f5d08b]">الواجهات</a></li>
              <li><a href="#features" className="transition hover:text-[#f5d08b]">المميزات</a></li>
              <li><a href="#faq" className="transition hover:text-[#f5d08b]">الأسئلة الشائعة</a></li>
              <li><Link to="/register" className="transition hover:text-[#f5d08b]">تسجيل مدرسة جديدة</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-black text-[#ecc36e]">الدخول للنظام</div>
            <ul className="space-y-2 text-[13px] font-semibold text-white/75">
              <li><Link to="/auth/admin" className="transition hover:text-[#f5d08b]">بوابة الإدارة</Link></li>
              <li><Link to="/auth/teacher" className="transition hover:text-[#f5d08b]">بوابة المعلمين</Link></li>
              <li><Link to="/story" className="transition hover:text-[#f5d08b]">قصة يوم مدرسي</Link></li>
              <li><a href="#cta" className="transition hover:text-[#f5d08b]">تواصل معنا</a></li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-black text-[#ecc36e]">تواصل معنا</div>
            <ul className="space-y-3 text-[13px] font-semibold text-white/75">
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[#f3cf87]">
                  <Headphones className="h-4 w-4" />
                </span>
                <span>
                  الدعم الفني
                  <span className="block text-[11px] font-medium text-white/70">متاح على مدار الساعة طوال أيام الأسبوع</span>
                </span>
              </li>
              <li>
                <a
                  href="https://wa.me/966573767989"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 transition hover:text-[#f5d08b]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[#f3cf87] transition group-hover:bg-white/[0.14]">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span>
                    تواصل واتساب
                    <span className="block font-bold tracking-wide text-[11px] text-white/80" dir="ltr">
                      0573767989
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/alraed_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 transition hover:text-[#f5d08b]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[#f3cf87] transition group-hover:bg-white/[0.14]">
                    {/* شعار منصّة X — lucide لا يوفّره: أيقونة X فيه علامة إغلاق وTwitter شعار الطائر القديم */}
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[13px] w-[13px]">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </span>
                  <span>
                    حساب النظام على X
                    <span className="block font-bold text-[11px] text-white/80" dir="ltr">
                      @alraed_app
                    </span>
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-[#f3cf87]">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>
                  المقر
                  <span className="block text-[11px] font-medium text-white/70">المملكة العربية السعودية</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-[12.5px] font-medium text-white/70 sm:px-6 lg:px-10">
          © {new Date().getFullYear()} نظام الرائد للإدارة المدرسية — جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  )
}

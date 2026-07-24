import {
  ArrowUpLeft,
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Pin,
  RefreshCcw,
  Sunrise,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ══════════════════════════════════════════════════════
   نسخة ٤ — «السبورة» (Chalkboard)
   الصفحة كلها سبورة مدرسية: الهيرو «درس اليوم» بأهدافه،
   المميزات جدول حصص بالطباشير، الواجهات أوراق مثبّتة،
   الأرقام ملاحظات لاصقة، والختام «الواجب المنزلي».
   المعاينة: /landing-v4
   ══════════════════════════════════════════════════════ */

const CHALK = '#f2efdf'
const CHALK_DIM = 'rgba(242,239,223,0.62)'
const CHALK_FAINT = 'rgba(242,239,223,0.28)'
const YELLOW = '#ffd977'
const RED = '#ff9d9d'
const BLUE = '#9fd4e8'
const PAPER = '#fdfbf2'
const INK = '#233043'

/* ─── أدوات الحركة ─── */

function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.2) {
  const ref = useRef<T>(null)
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
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

/** يكشف المحتوى + يشغّل رسم خطوط الطباشير (.chalk-stroke) بداخله */
function Drawn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView(0.18)
  return (
    <div
      ref={ref}
      className={`${className ?? ''} ${visible ? 'is-drawn' : ''}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(26px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── عناصر طباشيرية ─── */

/** خربشة تسطير تحت الكلمات المهمة */
function Squiggle({ color = YELLOW, width = 200 }: { color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 200 12" style={{ width }} className="block" fill="none" aria-hidden>
      <path
        d="M3 8 Q 28 3 52 7 T 100 6 T 148 8 T 197 5"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
        className="chalk-stroke"
        opacity="0.9"
      />
    </svg>
  )
}

/** شخبطة شمس بالطباشير */
function SunDoodle({ size = 74, color = YELLOW }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} fill="none" aria-hidden>
      <circle cx="40" cy="40" r="15" stroke={color} strokeWidth="3" pathLength={1} className="chalk-stroke" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI) / 4
        const x1 = 40 + Math.cos(angle) * 22
        const y1 = 40 + Math.sin(angle) * 22
        const x2 = 40 + Math.cos(angle) * 32
        const y2 = 40 + Math.sin(angle) * 32
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            className="chalk-stroke"
            style={{ animationDelay: `${0.5 + i * 0.07}s` }}
          />
        )
      })}
    </svg>
  )
}

/** جرس مدرسي مخربش */
function BellDoodle({ size = 60 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} fill="none" aria-hidden>
      <path
        d="M30 10 C18 12 16 24 16 34 L12 42 L48 42 L44 34 C44 24 42 12 30 10 Z"
        stroke={CHALK}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="chalk-stroke"
      />
      <path d="M26 46 Q30 52 34 46" stroke={CHALK} strokeWidth="3" strokeLinecap="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.6s' }} />
      <path d="M8 20 Q5 16 6 12 M52 20 Q55 16 54 12" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.9s' }} />
    </svg>
  )
}

/** سهم منحنٍ مخربش */
function ArrowDoodle({ flip = false, color = RED, size = 90 }: { flip?: boolean; color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 90 60" width={size} fill="none" aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M6 10 Q 40 4 58 26 Q 70 40 78 46" stroke={color} strokeWidth="3" strokeLinecap="round" pathLength={1} className="chalk-stroke" />
      <path d="M64 46 L79 47 L74 33" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.55s' }} />
    </svg>
  )
}

/** نجمة صغيرة */
function StarDoodle({ size = 26, color = CHALK_DIM, delay = 0 }: { size?: number; color?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
      <path
        d="M12 3 L14 9.5 L21 10 L15.5 14 L17.5 21 L12 17 L6.5 21 L8.5 14 L3 10 L10 9.5 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        pathLength={1}
        className="chalk-stroke"
        style={{ animationDelay: `${delay}s` }}
      />
    </svg>
  )
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toArabicDigits = (value: string) => value.replace(/\d/g, (digit) => AR_DIGITS[Number(digit)])

/** عدّاد تصاعدي بأرقام عربية — للملاحظات اللاصقة */
function ArCount({ end, prefix = '', duration = 1500 }: { end: number; prefix?: string; duration?: number }) {
  const { ref, visible } = useInView<HTMLSpanElement>(0.5)
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setValue(Math.round((1 - Math.pow(1 - progress, 3)) * end))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, end, duration])

  return (
    <span ref={ref}>
      {prefix}
      {toArabicDigits(String(value))}
    </span>
  )
}

/** عنصر قابل للسحب بالماوس (يُعطَّل على شاشات اللمس حفاظاً على التمرير) */
function Draggable({ children, className }: { children: ReactNode; className?: string }) {
  const [canDrag] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)
  const elRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const startRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  if (!canDrag) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        position: 'relative',
        zIndex: dragging ? 40 : undefined,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const el = elRef.current
        if (!el) return
        el.setPointerCapture(event.pointerId)
        startRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: posRef.current.x, y: posRef.current.y }
        el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px) scale(1.04)`
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!dragging) return
        const el = elRef.current
        if (!el) return
        const x = startRef.current.x + event.clientX - startRef.current.pointerX
        const y = startRef.current.y + event.clientY - startRef.current.pointerY
        posRef.current = { x, y }
        el.style.transform = `translate(${x}px, ${y}px) scale(1.04)`
      }}
      onPointerUp={() => {
        const el = elRef.current
        if (el) el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`
        setDragging(false)
      }}
      onPointerCancel={() => setDragging(false)}
    >
      {children}
    </div>
  )
}

/** طائرة ورقية */
function PaperPlane({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 34" width={size} fill="none" aria-hidden>
      <path d="M2 16 L46 2 L30 32 L24 20 Z" fill={PAPER} stroke="#8b93a3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M24 20 L46 2" stroke="#b9c0cd" strokeWidth="1.5" />
      <path d="M2 16 L24 20" stroke="#b9c0cd" strokeWidth="1.5" />
    </svg>
  )
}

/* ─── البيانات ─── */

/** كلمات الفوضى — الطبقة التي تمسحها الممحاة */
const messyWords: Array<{ text: string; top: string; right: string; rotate: number; color: string }> = [
  { text: 'كشوف ورقية', top: '12%', right: '8%', rotate: -7, color: RED },
  { text: 'اتصالات لا تنتهي', top: '32%', right: '40%', rotate: 4, color: CHALK_DIM },
  { text: 'أين ملف نور؟', top: '60%', right: '12%', rotate: -3, color: CHALK_DIM },
  { text: 'معلم غائب!', top: '16%', right: '66%', rotate: 6, color: RED },
  { text: 'فوضى الانصراف', top: '68%', right: '56%', rotate: -5, color: CHALK_DIM },
  { text: 'تقارير متأخرة', top: '44%', right: '74%', rotate: 3, color: RED },
]

/** دفتر التصحيح: الواقع القديم مشطوب وتحته التصحيح */
const corrections: Array<{ wrong: string; right: string }> = [
  { wrong: 'نطبع كشوف الحضور ونجمعها آخر اليوم', right: 'الرصد رقمي ويكتمل قبل ٧:٣٠ صباحاً' },
  { wrong: 'الإدارة تتصل بأولياء أمور الغائبين واحداً واحداً', right: 'واتساب تلقائي يبلّغ الجميع في دقيقة واحدة' },
  { wrong: 'الانتظار يُرتَّب بالاجتهاد... وينسى العدالة', right: 'توزيع آلي عادل حسب النصاب والجدول' },
  { wrong: 'نسهر آخر الشهر نجهّز ملفات نور يدوياً', right: 'التصدير جاهز بضغطة قبل الانصراف' },
]

/** الاختبار القصير */
interface QuizItem {
  question: string
  options: string[]
  correct: number
  note: string
}

const quizItems: QuizItem[] = [
  {
    question: 'كم يستغرق تجهيز النظام لمدرسة جديدة؟',
    options: ['فصل دراسي كامل', 'أسبوعان مع فريق تقني', 'يوم واحد فقط'],
    correct: 2,
    note: 'ترفع بياناتك اليوم... وغداً أول جرس آلي.',
  },
  {
    question: 'متى يعرف ولي الأمر بغياب ابنه؟',
    options: ['في اجتماع أولياء الأمور', 'إذا اتصل بالمدرسة بنفسه', 'قبل الساعة ٧:٣١ صباحاً'],
    correct: 2,
    note: 'رسالة واتساب تلقائية فور إغلاق الرصد.',
  },
  {
    question: 'ماذا يلزم لتصدير الغياب إلى نور؟',
    options: ['موظف متفرّغ للنسخ', 'ليلة عمل إضافية', 'ضغطة زر واحدة'],
    correct: 2,
    note: 'الملف يتجهّز طوال اليوم من تلقاء نفسه.',
  },
]

const quizLetters = ['أ', 'ب', 'ج']

/** بطاقة سؤال: اضغط إجابة — الصحيحة تُحوَّط بالطباشير الأحمر */
function QuizCard({ item, index }: { item: QuizItem; index: number }) {
  const [picked, setPicked] = useState<number | null>(null)
  const isRevealed = picked !== null

  return (
    <div className="flex h-full flex-col rounded-xl border-2 p-5" style={{ borderColor: CHALK_FAINT }}>
      <div className="text-[12px] font-black" style={{ color: BLUE }}>السؤال {toArabicDigits(String(index + 1))}</div>
      <div className="mt-1.5 text-[15px] font-black leading-7" style={{ color: CHALK }}>{item.question}</div>

      <div className="mt-4 space-y-1.5">
        {item.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === item.correct
          const isPicked = picked === optionIndex
          return (
            <button
              key={option}
              type="button"
              disabled={isRevealed}
              onClick={() => setPicked(optionIndex)}
              className={`v4-quiz-option relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-right text-[13px] font-bold ${
                isRevealed && isPicked && !isCorrect ? 'v4-wrong' : ''
              }`}
              style={{
                color: isRevealed && isCorrect ? YELLOW : 'rgba(242,239,223,0.85)',
                background: 'transparent',
                border: 'none',
                fontFamily: 'inherit',
                cursor: isRevealed ? 'default' : 'pointer',
              }}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-black"
                style={{ borderColor: isRevealed && isCorrect ? YELLOW : CHALK_FAINT }}
              >
                {quizLetters[optionIndex]}
              </span>
              <span className="relative min-w-0">
                {option}
                {isRevealed && isPicked && !isCorrect ? (
                  <svg className="is-drawn absolute inset-x-0 top-1/2 h-2.5 w-full" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none" aria-hidden>
                    <path d="M2 5 Q 30 2 55 6 T 98 4" stroke={RED} strokeWidth="2.4" strokeLinecap="round" pathLength={1} className="chalk-stroke" vectorEffect="non-scaling-stroke" />
                  </svg>
                ) : null}
              </span>
              {isRevealed && isCorrect ? (
                <svg
                  className="is-drawn pointer-events-none absolute -inset-x-1 -inset-y-0.5 h-[calc(100%+4px)] w-[calc(100%+8px)]"
                  viewBox="0 0 200 46"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden
                >
                  <ellipse cx="100" cy="23" rx="96" ry="19" stroke={RED} strokeWidth="2.5" pathLength={1} className="chalk-stroke" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        className="mt-auto border-t pt-3 text-[12px] font-bold transition-opacity duration-500"
        style={{
          borderColor: 'rgba(242,239,223,0.14)',
          color: !isRevealed ? 'transparent' : picked === item.correct ? YELLOW : CHALK_DIM,
          minHeight: 44,
        }}
      >
        {!isRevealed ? '…' : picked === item.correct ? `⭐ إجابة صحيحة! ${item.note}` : `الإجابة الصحيحة محوَّطة بالأحمر — ${item.note}`}
      </div>
    </div>
  )
}

/* ─── البيانات ─── */

const objectives = [
  'أن يصل خبرُ الغياب لولي الأمر قبل الساعة ٧:٣١ صباحاً.',
  'أن تُدار الحصص والانتظار والإشراف بلا ورقة واحدة.',
  'أن تُكتب تقارير اليوم كاملةً... من تلقاء نفسها.',
]

const periods: Array<{ period: string; time: string; lesson: string; note: string; icon: LucideIcon }> = [
  { period: 'الأولى', time: '٧:١٥', lesson: 'التحضير الذكي', note: 'رصد بنقرة أو بالباركود، والنسبة ترتفع مباشرة', icon: ClipboardCheck },
  { period: 'الثانية', time: '٧:٣١', lesson: 'رسائل الواتساب', note: 'غياب وتأخر واستئذان — تصل تلقائياً لولي الأمر', icon: MessageCircle },
  { period: 'الثالثة', time: '٩:٤٠', lesson: 'الانتظار العادل', note: 'معلم غائب؟ البديل الأنسب يُكلَّف فوراً', icon: RefreshCcw },
  { period: 'الرابعة', time: '١١:٠٠', lesson: 'النقاط والسلوك', note: 'تحفيز وتوثيق لحظي يظهر لولي الأمر', icon: GraduationCap },
  { period: 'الخامسة', time: '١:٣٠', lesson: 'النداء الذكي', note: 'انصراف منظم شاشةً وصوتاً بلا تزاحم', icon: Megaphone },
  { period: 'السادسة', time: '٢:٣٠', lesson: 'تقارير اليوم', note: 'ملخص جاهز للإدارة وتصدير الغياب لنور', icon: FileText },
]

const papers: Array<{ title: string; badge: string; icon: LucideIcon; lines: string[]; rotate: number; tapeRotate: number }> = [
  {
    title: 'ورقة الإدارة',
    badge: '٤٥+ وظيفة',
    icon: LayoutDashboard,
    lines: ['لوحة قيادة حيّة بالأرقام', 'تقارير تفصيلية فورية', 'إدارة الكوادر والصلاحيات', 'قرارات مبنية على بيانات'],
    rotate: -1.6,
    tapeRotate: -4,
  },
  {
    title: 'ورقة المعلم',
    badge: '٣٠+ وظيفة',
    icon: BookOpen,
    lines: ['تحضير الفصل بنقرة', 'نقاط السلوك في مكانها', 'نماذج رسمية جاهزة', 'تواصل مباشر مع ولي الأمر'],
    rotate: 1.2,
    tapeRotate: 3,
  },
  {
    title: 'ورقة ولي الأمر',
    badge: '١٥+ وظيفة',
    icon: Users,
    lines: ['يعرف قبل أن يسأل', 'تنبيهات الغياب والتأخر', 'سجل الأداء والنقاط', 'رسائل المدرسة أولاً بأول'],
    rotate: -0.8,
    tapeRotate: -2,
  },
]

const stickyNotes: Array<{ end: number; prefix: string; label: string; bg: string; rotate: number }> = [
  { end: 190, prefix: '+', label: 'ميزة تشغيلية', bg: '#ffe9a0', rotate: -2 },
  { end: 9, prefix: '', label: 'وحدات متكاملة', bg: '#ffd3dc', rotate: 1.5 },
  { end: 3, prefix: '', label: 'واجهات مستخدم', bg: '#cde8f7', rotate: -1 },
  { end: 99, prefix: '٪', label: 'استقرار تشغيلي', bg: '#d9f0d4', rotate: 2 },
]

function todayHijri(): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  }
}

/* ─── الصفحة ─── */

export function LandingPageV4() {
  const rulerFillRef = useRef<HTMLDivElement>(null)
  const wipeSectionRef = useRef<HTMLElement>(null)
  const eraserRef = useRef<HTMLDivElement>(null)
  const wipeHintRef = useRef<HTMLDivElement>(null)
  const planeSectionRef = useRef<HTMLElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)

  // المسح بالماوس: canvas + صوت احتكاك مُخلَّق
  const [pointerFine] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches)
  const pointerFineRef = useRef(pointerFine)
  const wipeCanvasRef = useRef<HTMLCanvasElement>(null)
  const wipeCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const wipeRedrawRef = useRef<(() => void) | null>(null)
  const lastErasePointRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const audioRef = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null)
  const soundOnRef = useRef(false)
  const [soundOn, setSoundOn] = useState(false)

  /** ضجيج أبيض → مرشّح حزمي ≈ صوت ممحاة على سبورة (بلا أي ملف صوتي) */
  const ensureAudio = () => {
    if (audioRef.current) {
      void audioRef.current.ctx.resume()
      return
    }
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const audioContext = new Ctor()
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1700
    filter.Q.value = 0.8
    const gain = audioContext.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(audioContext.destination)
    source.start()
    audioRef.current = { ctx: audioContext, gain }
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    soundOnRef.current = next
    if (next) {
      ensureAudio()
    } else if (audioRef.current) {
      audioRef.current.gain.gain.setTargetAtTime(0, audioRef.current.ctx.currentTime, 0.02)
    }
  }

  useEffect(() => {
    return () => {
      void audioRef.current?.ctx.close()
      audioRef.current = null
    }
  }, [])

  /** يرسم طبقة الفوضى على الـ canvas (ويعيد رسمها عند الطلب) */
  useEffect(() => {
    const canvas = wipeCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    wipeCtxRef.current = context

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.fillStyle = '#20403a'
      context.fillRect(0, 0, width, height)

      context.lineCap = 'round'
      const squiggle = (x: number, y: number, length: number, tint: string) => {
        context.strokeStyle = tint
        context.lineWidth = 2.5
        context.beginPath()
        context.moveTo(x, y)
        context.quadraticCurveTo(x + length * 0.25, y - 14, x + length * 0.5, y)
        context.quadraticCurveTo(x + length * 0.75, y + 14, x + length, y)
        context.stroke()
      }
      squiggle(width * 0.08, height * 0.82, width * 0.18, 'rgba(242,239,223,0.22)')
      squiggle(width * 0.55, height * 0.22, width * 0.16, 'rgba(255,157,157,0.4)')
      squiggle(width * 0.34, height * 0.92, width * 0.14, 'rgba(242,239,223,0.2)')

      const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
      const fontSize = Math.max(17, Math.min(26, width / 34))
      for (const word of messyWords) {
        const rightFraction = parseFloat(word.right) / 100
        const topFraction = parseFloat(word.top) / 100
        context.save()
        context.translate(width * (1 - rightFraction), height * topFraction + fontSize)
        context.rotate((word.rotate * Math.PI) / 180)
        context.font = `900 ${fontSize}px ${family}`
        context.fillStyle = word.color
        context.textAlign = 'right'
        context.fillText(word.text, 0, 0)
        context.restore()
      }
    }

    wipeRedrawRef.current = draw
    draw()
    void document.fonts?.ready.then(() => draw())
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  /** مسح دائري عند نقطة المؤشر + صوت حسب سرعة اليد + الممحاة تتبع المؤشر */
  const eraseAt = (clientX: number, clientY: number) => {
    const canvas = wipeCanvasRef.current
    const context = wipeCtxRef.current
    if (!canvas || !context) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const last = lastErasePointRef.current
    const now = performance.now()

    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(x, y, 34, 0, Math.PI * 2)
    context.fill()
    if (last) {
      context.lineWidth = 68
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(last.x, last.y)
      context.lineTo(x, y)
      context.stroke()
    }
    context.globalCompositeOperation = 'source-over'

    if (last && soundOnRef.current && audioRef.current) {
      const dt = Math.max(8, now - last.t)
      const speed = Math.hypot(x - last.x, y - last.y) / dt
      const target = Math.min(0.22, speed * 0.09)
      const { ctx: audioContext, gain } = audioRef.current
      gain.gain.cancelScheduledValues(audioContext.currentTime)
      gain.gain.setTargetAtTime(target, audioContext.currentTime, 0.02)
      gain.gain.setTargetAtTime(0, audioContext.currentTime + 0.1, 0.08)
    }
    lastErasePointRef.current = { x, y, t: now }

    if (wipeHintRef.current) wipeHintRef.current.style.opacity = '0'
    if (eraserRef.current) {
      eraserRef.current.style.opacity = '1'
      eraserRef.current.style.left = `${x - 48}px`
      eraserRef.current.style.top = `${y - 34}px`
      eraserRef.current.style.transform = `rotate(${-6 + Math.sin(now / 90) * 6}deg)`
    }
  }

  const resetWipe = () => {
    wipeRedrawRef.current?.()
    lastErasePointRef.current = null
  }

  // محرك التمرير: المسطرة + الممحاة + الطائرة الورقية — rAF واحد بلا re-render
  useEffect(() => {
    let raf = 0
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

    const update = () => {
      const doc = document.documentElement
      const vh = window.innerHeight
      const globalMax = doc.scrollHeight - vh
      const globalProgress = globalMax > 0 ? clamp01(window.scrollY / globalMax) : 0

      if (rulerFillRef.current) {
        rulerFillRef.current.style.transform = `scaleY(${globalProgress})`
      }

      // الممحاة (شاشات اللمس): التمرير يمسح شريطاً متنامياً من اليمين
      const wipeSection = wipeSectionRef.current
      if (wipeSection && !pointerFineRef.current) {
        const rect = wipeSection.getBoundingClientRect()
        const total = rect.height - vh
        const progress = total > 0 ? clamp01(-rect.top / total) : 0
        const canvas = wipeCanvasRef.current
        const context = wipeCtxRef.current
        if (canvas && context && progress > 0) {
          const width = canvas.clientWidth
          const height = canvas.clientHeight
          context.globalCompositeOperation = 'destination-out'
          context.fillRect(width * (1 - progress), 0, width * progress + 2, height)
          context.globalCompositeOperation = 'source-over'
        }
        if (eraserRef.current && canvas) {
          eraserRef.current.style.left = `${canvas.clientWidth * (1 - progress) - 48}px`
          eraserRef.current.style.top = '42%'
          eraserRef.current.style.transform = `rotate(${-4 + Math.sin(progress * 14) * 5}deg)`
          eraserRef.current.style.opacity = progress >= 0.995 ? '0' : '1'
        }
        if (wipeHintRef.current) {
          wipeHintRef.current.style.opacity = progress > 0.9 ? '0' : '1'
        }
      }

      // الطائرة الورقية: تعبر الشاشة على مسارها المتقطع
      const planeSection = planeSectionRef.current
      const plane = planeRef.current
      if (planeSection && plane) {
        const rect = planeSection.getBoundingClientRect()
        const progress = clamp01((vh - rect.top) / (vh + rect.height))
        const width = planeSection.clientWidth
        const x = -progress * Math.max(0, width - 90)
        const y = Math.sin(progress * Math.PI * 2.2) * 26 - progress * 8
        const angle = -10 + Math.cos(progress * Math.PI * 2.2) * 16
        plane.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`
      }
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
  }, [])

  return (
    <div
      dir="rtl"
      className="min-h-screen"
      style={{
        color: CHALK,
        background:
          'radial-gradient(130% 90% at 50% -10%, #2c5147 0%, #234439 52%, #1b3730 100%)',
      }}
    >
      <style>{`
        @keyframes v4-draw { to { stroke-dashoffset: 0; } }
        @keyframes v4-dust { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes v4-swing { 0%,100% { transform: rotate(-1.2deg); } 50% { transform: rotate(1.2deg); } }
        .chalk-stroke { stroke-dasharray: 1; stroke-dashoffset: 1; }
        .is-drawn .chalk-stroke { animation: v4-draw 1.1s ease forwards; }
        .v4-paper { transition: transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.45s ease; }
        .v4-paper:hover { transform: rotate(0deg) translateY(-8px) !important; box-shadow: 0 30px 50px -22px rgba(0,0,0,0.55) !important; }
        .v4-note { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .v4-note:hover { transform: scale(1.06) rotate(0deg) !important; }
        .v4-chalk-text { text-shadow: 0 0 1px rgba(242,239,223,0.4); }
        @keyframes v4-stamp-pop { 0% { opacity: 0; transform: scale(2.2) rotate(-20deg); } 60% { opacity: 1; transform: scale(0.92) rotate(-10deg); } 80% { transform: scale(1.06) rotate(-13deg); } 100% { opacity: 1; transform: scale(1) rotate(-12deg); } }
        .is-drawn .v4-stamp { animation: v4-stamp-pop 0.7s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
        .v4-quiz-option { transition: background 0.25s ease; }
        .v4-quiz-option:not(:disabled):hover { background: rgba(255,255,255,0.06); }
        @keyframes v4-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(4px); } 50% { transform: translateX(-4px); } 75% { transform: translateX(3px); } }
        .v4-wrong { animation: v4-shake 0.4s ease; }
        @media (prefers-reduced-motion: reduce) {
          .chalk-stroke { stroke-dashoffset: 0 !important; animation: none !important; }
          [class*="v4-"] { animation: none !important; }
        }
      `}</style>

      {/* ══ الشريط الخشبي العلوي ══ */}
      <header
        className="sticky top-0 z-50 border-b-4"
        style={{
          background: 'linear-gradient(180deg, #96683e 0%, #7d5531 60%, #6f4a2a 100%)',
          borderColor: '#563a20',
          boxShadow: '0 10px 30px -14px rgba(0,0,0,0.6)',
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-full border-2 text-[15px] font-black"
              style={{ borderColor: '#f6e7c8', color: '#f6e7c8', background: 'rgba(0,0,0,0.18)' }}
            >
              ر
            </span>
            <div className="leading-none">
              <div className="text-[15px] font-black" style={{ color: '#faf0da' }}>نظام الرائد</div>
              <div className="mt-1 text-[9.5px] font-bold" style={{ color: 'rgba(250,240,218,0.65)' }}>سبورة الإدارة المدرسية</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-[13px] font-bold lg:flex" style={{ color: 'rgba(250,240,218,0.85)' }}>
            <a href="#lesson" className="transition hover:text-white">الدرس</a>
            <a href="#wipe" className="transition hover:text-white">الممحاة</a>
            <a href="#timetable" className="transition hover:text-white">الجدول</a>
            <a href="#grading" className="transition hover:text-white">التصحيح</a>
            <a href="#quiz" className="transition hover:text-white">الاختبار</a>
            <a href="#homework" className="transition hover:text-white">الواجب</a>
            <Link to="/plans" className="transition hover:text-white">الأسعار</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth/teacher"
              className="hidden rounded-lg border px-3.5 py-1.5 text-[12.5px] font-bold transition hover:bg-black/15 sm:inline-flex"
              style={{ borderColor: 'rgba(250,240,218,0.4)', color: '#faf0da' }}
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12.5px] font-black shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.04]"
              style={{ background: YELLOW, color: '#4a3410' }}
            >
              ابدأ مجاناً
              <ArrowUpLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ══ المسطرة: تقدمك في الدرس ══ */}
      <div className="pointer-events-none fixed bottom-24 left-3 top-24 z-40 hidden w-4 lg:block" aria-hidden>
        <div className="absolute inset-y-0 right-1 w-[3px] rounded-full" style={{ background: CHALK_FAINT }} />
        <div
          ref={rulerFillRef}
          className="absolute inset-y-0 right-1 w-[3px] origin-top rounded-full"
          style={{ background: YELLOW, transform: 'scaleY(0)', willChange: 'transform' }}
        />
        {Array.from({ length: 11 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-[2px] rounded-full"
            style={{ top: `${index * 10}%`, right: 4, width: index % 5 === 0 ? 13 : 8, background: CHALK_FAINT }}
          />
        ))}
      </div>

      {/* ══ درس اليوم (الهيرو) ══ */}
      <section id="lesson" className="relative mx-auto max-w-[1200px] px-5 pb-10 pt-12 lg:px-8 lg:pt-16">
        {/* ترويسة السبورة: التاريخ والمادة */}
        <Drawn>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-[12.5px] font-bold" style={{ borderColor: CHALK_FAINT, color: CHALK_DIM }}>
            <span>اليوم: {todayHijri()}</span>
            <span className="hidden sm:inline">المادة: إدارة مدرسية</span>
            <span>عدد الحصص: ٦</span>
          </div>
        </Drawn>

        <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* نص الدرس */}
          <div className="text-center lg:text-right">
            <Drawn delay={80}>
              <div className="text-[15px] font-black" style={{ color: CHALK_DIM }}>درسُ اليوم:</div>
              <h1 className="v4-chalk-text mt-3 text-5xl font-black leading-[1.25] tracking-tight sm:text-6xl lg:text-[64px]" style={{ color: CHALK }}>
                كيف تُدار مدرسةٌ
                <span className="relative mt-1 block" style={{ color: YELLOW }}>
                  بلا فوضى؟
                  <span className="absolute -bottom-3 right-1/2 translate-x-1/2 lg:right-0 lg:translate-x-0">
                    <Squiggle width={220} />
                  </span>
                </span>
              </h1>
            </Drawn>

            <Drawn delay={200}>
              <div className="mt-10 text-right">
                <div className="text-[14px] font-black" style={{ color: BLUE }}>الأهداف — بنهاية هذا الدرس:</div>
                <ul className="mt-3 space-y-2.5">
                  {objectives.map((objective, index) => (
                    <li key={objective} className="flex items-start gap-2.5 text-[14px] font-semibold leading-7" style={{ color: 'rgba(242,239,223,0.88)' }}>
                      <svg viewBox="0 0 20 20" width="18" height="18" className="mt-1 shrink-0" fill="none" aria-hidden>
                        <path
                          d="M3 11 L8 16 L17 4"
                          stroke={YELLOW}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={1}
                          className="chalk-stroke"
                          style={{ animationDelay: `${0.4 + index * 0.25}s` }}
                        />
                      </svg>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            </Drawn>

            <Drawn delay={320}>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[15px] font-black shadow-[0_14px_30px_-12px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.03] hover:-rotate-1"
                  style={{ background: PAPER, color: INK }}
                >
                  سجّل مدرستك مجاناً
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>
                <Link
                  to="/story"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed px-7 py-3.5 text-[14px] font-black transition hover:bg-white/5"
                  style={{ borderColor: CHALK_FAINT, color: CHALK }}
                >
                  <Sunrise className="h-4 w-4" style={{ color: YELLOW }} />
                  أو عِش قصة يوم كامل
                </Link>
              </div>
            </Drawn>
          </div>

          {/* لوحة الخربشات */}
          <Drawn delay={250} className="relative mx-auto hidden w-full max-w-[420px] lg:block">
            <div className="relative h-[380px]">
              <div className="absolute right-6 top-0"><SunDoodle /></div>
              <div className="absolute left-10 top-6" style={{ animation: 'v4-swing 5s ease-in-out infinite', transformOrigin: 'top center' }}>
                <BellDoodle />
              </div>
              <div className="absolute right-0 top-24"><StarDoodle delay={0.8} /></div>
              <div className="absolute left-0 top-40"><StarDoodle size={20} color={BLUE} delay={1.1} /></div>

              {/* مدرسة مخربشة */}
              <svg viewBox="0 0 300 190" className="absolute inset-x-0 top-24 w-full" fill="none" aria-hidden>
                <rect x="50" y="80" width="200" height="90" rx="3" stroke={CHALK} strokeWidth="3" pathLength={1} className="chalk-stroke" />
                <path d="M40 80 L150 30 L260 80" stroke={CHALK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.35s' }} />
                <rect x="135" y="120" width="32" height="50" stroke={YELLOW} strokeWidth="3" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.7s' }} />
                <rect x="72" y="100" width="26" height="22" stroke={BLUE} strokeWidth="2.5" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.9s' }} />
                <rect x="202" y="100" width="26" height="22" stroke={BLUE} strokeWidth="2.5" pathLength={1} className="chalk-stroke" style={{ animationDelay: '1.05s' }} />
                <line x1="150" y1="30" x2="150" y2="12" stroke={CHALK} strokeWidth="2.5" pathLength={1} className="chalk-stroke" style={{ animationDelay: '1.2s' }} />
                <path d="M150 12 L172 16 L150 22" stroke={RED} strokeWidth="2.5" strokeLinejoin="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '1.35s' }} />
              </svg>

              {/* ٩٦٪ مُحوّطة */}
              <div className="absolute bottom-0 left-2">
                <div className="relative px-5 py-3">
                  <div className="text-3xl font-black" style={{ color: YELLOW }}>٩٦٪</div>
                  <div className="text-[11px] font-bold" style={{ color: CHALK_DIM }}>حضور اليوم</div>
                  <svg viewBox="0 0 120 70" className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)]" fill="none" aria-hidden>
                    <ellipse cx="60" cy="35" rx="55" ry="30" stroke={RED} strokeWidth="2.5" pathLength={1} className="chalk-stroke" style={{ animationDelay: '1.5s' }} />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-14 right-8 rotate-[8deg]">
                <ArrowDoodle flip />
              </div>
            </div>
          </Drawn>
        </div>

        {/* حامل الطباشير */}
        <Drawn delay={150}>
          <div className="mt-14 flex items-center justify-between rounded-lg border-t-2 px-4 py-2.5" style={{ background: 'linear-gradient(180deg,#8a5f38,#6f4a2a)', borderTopColor: '#a97f52' }}>
            <div className="flex items-center gap-2.5">
              {[CHALK, YELLOW, RED, BLUE].map((color, index) => (
                <span key={index} className="h-2.5 w-12 rounded-sm" style={{ background: color, boxShadow: '0 2px 4px rgba(0,0,0,0.35)', opacity: 0.92 }} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-4 w-14 rounded-sm" style={{ background: '#3d4b5c', boxShadow: '0 2px 5px rgba(0,0,0,0.4)' }} />
              <span className="text-[10px] font-bold" style={{ color: 'rgba(250,240,218,0.55)' }}>الممحاة</span>
            </div>
          </div>
        </Drawn>
      </section>

      {/* ══ جرّب الممحاة: امسح الفوضى بالتمرير ══ */}
      <section id="wipe" ref={wipeSectionRef} className="relative" style={{ height: '230vh' }}>
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center px-5">
          <Drawn className="text-center">
            <h2 className="v4-chalk-text text-3xl font-black sm:text-4xl" style={{ color: CHALK }}>
              الممحاة بيدك — <span style={{ color: YELLOW }}>مرّر وامسح الفوضى</span>
            </h2>
            <div className="mt-2 flex justify-center"><Squiggle color={RED} width={170} /></div>
          </Drawn>

          <div
            className="relative mt-8 w-full max-w-[860px] overflow-hidden rounded-2xl border-2"
            style={{ borderColor: CHALK_FAINT, height: 330, background: 'rgba(0,0,0,0.14)' }}
          >
            {/* الطبقة النظيفة (تظهر بعد المسح) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
              <div className="v4-chalk-text text-4xl font-black sm:text-5xl" style={{ color: YELLOW }}>مع الرائد</div>
              <div className="flex flex-wrap justify-center gap-2.5">
                {['الحضور ٩٦٪ ✓', 'الرسائل وصلت ✓', 'الانتظار موزّع ✓', 'ملف نور جاهز ✓'].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-lg border px-3.5 py-2 text-[13px] font-black"
                    style={{ borderColor: 'rgba(242,239,223,0.35)', color: CHALK }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="text-[13px] font-bold" style={{ color: CHALK_DIM }}>
                سبورة نظيفة، أرقام واضحة، ويومٌ يمشي وحده.
              </div>
            </div>

            {/* طبقة الفوضى — canvas يُمسح بالماوس (أو بالتمرير على الجوال) */}
            <canvas
              ref={wipeCanvasRef}
              className="absolute inset-0 h-full w-full"
              style={{ touchAction: 'pan-y', cursor: pointerFine ? 'none' : 'auto' }}
              onPointerDown={(event) => {
                if (soundOnRef.current) ensureAudio()
                if (pointerFine) eraseAt(event.clientX, event.clientY)
              }}
              onPointerMove={(event) => {
                if (pointerFine && event.pointerType === 'mouse') eraseAt(event.clientX, event.clientY)
              }}
              onPointerLeave={() => {
                lastErasePointRef.current = null
                if (pointerFine && eraserRef.current) eraserRef.current.style.opacity = '0'
              }}
            />

            {/* أدوات اللوحة: الصوت + إعادة الفوضى */}
            <div className="absolute left-3 top-3 z-20 flex gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-black backdrop-blur transition hover:bg-white/10"
                style={{ borderColor: CHALK_FAINT, color: soundOn ? YELLOW : CHALK_DIM, background: 'rgba(0,0,0,0.25)' }}
              >
                {soundOn ? '🔊 صوت المسح: مفعّل' : '🔇 صوت المسح: صامت'}
              </button>
              <button
                type="button"
                onClick={resetWipe}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-black backdrop-blur transition hover:bg-white/10"
                style={{ borderColor: CHALK_FAINT, color: CHALK_DIM, background: 'rgba(0,0,0,0.25)' }}
              >
                🧹 أعد الفوضى
              </button>
            </div>

            {/* الممحاة — تتبع الماوس (أو حافة المسح على الجوال) */}
            <div
              ref={eraserRef}
              className="pointer-events-none absolute z-10 h-16 w-24"
              style={{ left: -130, top: '42%', opacity: pointerFine ? 0 : 1, willChange: 'left, top, transform, opacity', transition: 'opacity 0.3s ease' }}
            >
              <div className="h-11 rounded-md" style={{ background: 'linear-gradient(180deg,#96683e,#7d5531)', boxShadow: '0 12px 22px -8px rgba(0,0,0,0.65)' }} />
              <div className="h-5 rounded-b-md" style={{ background: '#3d4b5c' }} />
            </div>
          </div>

          <div ref={wipeHintRef} className="mt-5 text-[12.5px] font-bold" style={{ color: CHALK_DIM, transition: 'opacity 0.5s ease' }}>
            {pointerFine ? '🖱️ أمسك الممحاة — حرّك الماوس داخل السبورة وامسح بنفسك' : '⬇ واصل التمرير — الممحاة تتحرك معك'}
          </div>
        </div>
      </section>

      {/* ══ جدول الحصص (المميزات) ══ */}
      <section id="timetable" className="mx-auto max-w-[1200px] px-5 py-14 lg:px-8">
        <Drawn>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="v4-chalk-text text-3xl font-black sm:text-4xl" style={{ color: CHALK }}>
              جدول حصص <span style={{ color: YELLOW }}>الرائد</span>
            </h2>
            <span className="text-[12px] font-bold" style={{ color: CHALK_DIM }}>كل حصة... مهمة يديرها النظام عنك</span>
          </div>
          <div className="mt-2"><Squiggle color={BLUE} width={160} /></div>
        </Drawn>

        <div className="mt-8 overflow-x-auto">
          <div className="min-w-[640px] rounded-xl border-2" style={{ borderColor: CHALK_FAINT }}>
            {/* رأس الجدول */}
            <div className="grid grid-cols-[90px_70px_180px_1fr] gap-0 border-b-2 text-[12.5px] font-black" style={{ borderColor: CHALK_FAINT, color: BLUE }}>
              <div className="border-l px-4 py-3" style={{ borderColor: CHALK_FAINT }}>الحصة</div>
              <div className="border-l px-4 py-3" style={{ borderColor: CHALK_FAINT }}>الزمن</div>
              <div className="border-l px-4 py-3" style={{ borderColor: CHALK_FAINT }}>الدرس</div>
              <div className="px-4 py-3">ماذا يحدث؟</div>
            </div>
            {periods.map(({ period, time, lesson, note, icon: Icon }, index) => (
              <Drawn key={period} delay={index * 80}>
                <div
                  className="grid grid-cols-[90px_70px_180px_1fr] items-center border-b text-[13px] transition hover:bg-white/[0.04] last:border-b-0"
                  style={{ borderColor: 'rgba(242,239,223,0.14)' }}
                >
                  <div className="border-l px-4 py-3.5 font-black" style={{ borderColor: 'rgba(242,239,223,0.14)', color: CHALK }}>{period}</div>
                  <div className="border-l px-4 py-3.5 font-bold" style={{ borderColor: 'rgba(242,239,223,0.14)', color: CHALK_DIM }}>{time}</div>
                  <div className="flex items-center gap-2 border-l px-4 py-3.5 font-black" style={{ borderColor: 'rgba(242,239,223,0.14)', color: YELLOW }}>
                    <Icon className="h-4 w-4 shrink-0" style={{ color: CHALK_DIM }} />
                    {lesson}
                  </div>
                  <div className="px-4 py-3.5 font-semibold" style={{ color: 'rgba(242,239,223,0.75)' }}>{note}</div>
                </div>
              </Drawn>
            ))}
          </div>
        </div>

        <Drawn delay={120}>
          <div className="mt-4 flex items-center gap-2 text-[12px] font-bold" style={{ color: CHALK_DIM }}>
            <Bell className="h-3.5 w-3.5" style={{ color: YELLOW }} />
            ملاحظة المعلم: الجرس بين الحصص يدق آلياً — لا تشغل بالك به إطلاقاً.
          </div>
        </Drawn>
      </section>

      {/* ══ الطائرة الورقية: من السبورة إلى ولي الأمر ══ */}
      <section ref={planeSectionRef} className="relative mx-auto max-w-[1200px] overflow-hidden px-5 py-16 lg:px-8">
        <Drawn className="text-center">
          <h2 className="v4-chalk-text text-2xl font-black sm:text-3xl" style={{ color: CHALK }}>
            وكل ما يحدث على السبورة... <span style={{ color: BLUE }}>يطير فوراً لجوال ولي الأمر</span>
          </h2>
        </Drawn>

        <div className="relative mt-10 h-[130px]">
          {/* المسار المتقطع */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 130" fill="none" aria-hidden>
            <path
              d="M985 84 C 800 16, 620 116, 440 62 C 320 28, 170 76, 60 50"
              stroke={CHALK_FAINT}
              strokeWidth="2.5"
              strokeDasharray="10 12"
              strokeLinecap="round"
            />
          </svg>

          {/* الطائرة — يحركها التمرير */}
          <div ref={planeRef} className="absolute right-3 top-1/2 -mt-5" style={{ willChange: 'transform' }}>
            <PaperPlane />
          </div>

          {/* الوجهة: جوال ولي الأمر */}
          <Drawn delay={150} className="absolute left-0 top-1/2 hidden -translate-y-1/2 sm:block">
            <svg viewBox="0 0 44 76" width="42" fill="none" aria-hidden>
              <rect x="3" y="3" width="38" height="70" rx="8" stroke={CHALK} strokeWidth="3" pathLength={1} className="chalk-stroke" />
              <circle cx="22" cy="64" r="3" stroke={CHALK_DIM} strokeWidth="2" />
              <path d="M12 22 h20 M12 32 h13" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.45s' }} />
            </svg>
          </Drawn>
        </div>

        <Drawn delay={100} className="text-center">
          <div className="text-[12.5px] font-bold" style={{ color: CHALK_DIM }}>
            غياب، تأخر، نقاط، رسائل المدرسة — تصل قبل أن يسأل أحد.
          </div>
        </Drawn>
      </section>

      {/* ══ الأوراق المثبتة (الواجهات) ══ */}
      <section id="papers" className="mx-auto max-w-[1200px] px-5 py-14 lg:px-8">
        <Drawn>
          <h2 className="v4-chalk-text text-3xl font-black sm:text-4xl" style={{ color: CHALK }}>
            أوراق مثبّتة على السبورة <span style={{ color: YELLOW }}>— لكل دورٍ ورقته</span>
          </h2>
          <div className="mt-2"><Squiggle width={190} /></div>
        </Drawn>

        <div className="mt-10 grid gap-7 md:grid-cols-3">
          {papers.map(({ title, badge, icon: Icon, lines, rotate, tapeRotate }, index) => (
            <Drawn key={title} delay={index * 120}>
              <Draggable>
              <article
                className="v4-paper relative rounded-md px-6 pb-6 pt-8"
                style={{
                  background: PAPER,
                  color: INK,
                  transform: `rotate(${rotate}deg)`,
                  boxShadow: '0 18px 34px -18px rgba(0,0,0,0.5)',
                }}
              >
                {/* شريط لاصق */}
                <span
                  className="absolute -top-3 right-1/2 h-7 w-24 translate-x-1/2 rounded-[2px]"
                  style={{
                    background: 'rgba(250,235,180,0.55)',
                    transform: `translateX(50%) rotate(${tapeRotate}deg)`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(1px)',
                  }}
                />
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: '#eef0e6', color: '#3f6f55' }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-md px-2 py-1 text-[10.5px] font-black" style={{ background: '#fdf3d8', color: '#8a6a1f' }}>
                    {badge}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <ul className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: '#e8e4d5' }}>
                  {lines.map((line) => (
                    <li key={line} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#45536b' }}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#c9a13f' }} />
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
              </Draggable>
            </Drawn>
          ))}
        </div>

        {/* الملاحظات اللاصقة (الأرقام) */}
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stickyNotes.map(({ end, prefix, label, bg, rotate }, index) => (
            <Drawn key={label} delay={index * 90}>
              <Draggable>
              <div
                className="v4-note relative mx-auto flex aspect-square w-full max-w-[150px] flex-col items-center justify-center rounded-sm text-center"
                style={{
                  background: bg,
                  color: '#3a3a2c',
                  transform: `rotate(${rotate}deg)`,
                  boxShadow: '0 14px 22px -12px rgba(0,0,0,0.45)',
                }}
              >
                <Pin className="absolute -top-2.5 h-5 w-5 rotate-[20deg]" style={{ color: '#b0483a', fill: '#d9695a' }} />
                <div className="text-3xl font-black">
                  <ArCount end={end} prefix={prefix} />
                </div>
                <div className="mt-1 px-2 text-[11px] font-black opacity-70">{label}</div>
              </div>
              </Draggable>
            </Drawn>
          ))}
        </div>
      </section>

      {/* ══ دفتر التصحيح: الواقع القديم مشطوب ══ */}
      <section id="grading" className="mx-auto max-w-[1200px] px-5 py-14 lg:px-8">
        <Drawn>
          <h2 className="v4-chalk-text text-3xl font-black sm:text-4xl" style={{ color: CHALK }}>
            دفتر الواقع — <span style={{ color: YELLOW }}>وعليه التصحيح</span>
          </h2>
          <div className="mt-2"><Squiggle color={RED} width={175} /></div>
          <p className="mt-3 text-[13px] font-bold" style={{ color: CHALK_DIM }}>
            هكذا يصحّح الرائد يوم المدرسة... سطراً سطراً.
          </p>
        </Drawn>

        <Drawn delay={150}>
          <div
            className="relative mx-auto mt-10 max-w-[820px] rounded-md px-8 pb-10 pt-14 sm:px-14"
            style={{
              background: PAPER,
              color: INK,
              boxShadow: '0 26px 48px -22px rgba(0,0,0,0.55)',
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 37px, #dbe6f0 37px, #dbe6f0 38px)',
            }}
          >
            {/* هامش الدفتر */}
            <div className="absolute inset-y-0 right-10 w-[2px]" style={{ background: 'rgba(214,90,90,0.45)' }} />

            {/* ختم التقدير */}
            <div
              className="v4-stamp absolute -left-2 -top-6 grid h-24 w-24 place-items-center rounded-full border-[3px] text-center sm:-left-5"
              style={{ borderColor: '#d65a5a', color: '#d65a5a', background: 'rgba(253,251,242,0.92)', opacity: 0, boxShadow: '0 10px 24px -12px rgba(0,0,0,0.4)' }}
            >
              <div>
                <div className="text-lg font-black leading-5">ممتاز</div>
                <div className="mt-0.5 text-[11.5px] font-black">١٠٠ / ١٠٠</div>
              </div>
            </div>

            <div className="space-y-7 pr-6">
              {corrections.map((row, index) => (
                <Drawn key={row.wrong} delay={index * 120}>
                  <div>
                    <div className="relative inline-block text-[14.5px] font-bold leading-8" style={{ color: '#5a677e' }}>
                      {row.wrong}
                      <svg className="absolute inset-x-0 top-1/2 h-3 w-full" preserveAspectRatio="none" viewBox="0 0 100 10" fill="none" aria-hidden>
                        <path
                          d="M1 6 Q 25 2 50 6 T 99 4"
                          stroke="#d65a5a"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          pathLength={1}
                          className="chalk-stroke"
                          style={{ animationDelay: '0.3s' }}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[14px] font-black" style={{ color: '#2f7d4d' }}>
                      <span className="text-[16px]" aria-hidden>✎</span>
                      {row.right}
                    </div>
                  </div>
                </Drawn>
              ))}
            </div>
          </div>
        </Drawn>
      </section>

      {/* ══ اختبار قصير (تفاعلي) ══ */}
      <section id="quiz" className="mx-auto max-w-[1200px] px-5 py-14 lg:px-8">
        <Drawn>
          <h2 className="v4-chalk-text text-3xl font-black sm:text-4xl" style={{ color: CHALK }}>
            اختبار قصير <span style={{ color: YELLOW }}>(لا يحتاج مذاكرة)</span>
          </h2>
          <div className="mt-2"><Squiggle color={BLUE} width={150} /></div>
          <p className="mt-3 text-[13px] font-bold" style={{ color: CHALK_DIM }}>
            اضغط إجابتك — والطباشير الأحمر سيحكم بينكما.
          </p>
        </Drawn>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {quizItems.map((item, index) => (
            <Drawn key={item.question} delay={index * 110}>
              <QuizCard item={item} index={index} />
            </Drawn>
          ))}
        </div>
      </section>

      {/* ══ شهادة الموثوقية ══ */}
      <section className="mx-auto max-w-[1200px] px-5 py-14 lg:px-8">
        <Drawn>
          <Draggable className="mx-auto max-w-[660px]">
          <div
            className="relative rotate-[-0.6deg] rounded-sm px-7 py-10 text-center sm:px-14"
            style={{ background: PAPER, color: INK, boxShadow: '0 28px 52px -24px rgba(0,0,0,0.6)' }}
          >
            <div className="pointer-events-none absolute inset-2 rounded-sm border-2" style={{ borderColor: '#c9a13f' }} />
            <div className="pointer-events-none absolute inset-[13px] rounded-sm border" style={{ borderColor: 'rgba(201,161,63,0.45)' }} />

            <div className="relative">
              <div className="text-[11px] font-black tracking-[0.35em]" style={{ color: '#8a6a1f' }}>من سبورة المدرسة</div>
              <div className="mt-2 text-3xl font-black sm:text-4xl">شهادة موثوقية</div>
              <div className="mt-2 flex justify-center"><Squiggle color="#c9a13f" width={150} /></div>

              <p className="mx-auto mt-5 max-w-[44ch] text-[13.5px] font-semibold leading-8" style={{ color: '#45536b' }}>
                تُمنح لنظام <b>الرائد</b> لإدارته اليوم المدرسي بانضباطٍ تام — رصدٌ لا يتأخر، ورسائل لا تُنسى،
                وتقاريرُ لا تحتاج من يكتبها.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {['٩٩٪ استقرار تشغيلي', 'نسخ احتياطي يومي', 'دعم فني سريع', 'تحديثات مستمرة'].map((chip) => (
                  <span key={chip} className="rounded-full border px-3 py-1.5 text-[11.5px] font-black" style={{ borderColor: '#e0cfa6', color: '#8a6a1f', background: '#fdf7e8' }}>
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex items-end justify-between px-2 sm:px-6">
                {/* التوقيع */}
                <div className="text-right">
                  <svg viewBox="0 0 120 34" width="110" fill="none" aria-hidden>
                    <path
                      d="M6 24 C 22 6, 30 30, 44 16 C 54 6, 60 26, 74 18 C 88 10, 96 24, 114 12"
                      stroke="#3a4a63"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      pathLength={1}
                      className="chalk-stroke"
                      style={{ animationDelay: '0.5s' }}
                    />
                  </svg>
                  <div className="mt-1 border-t pt-1 text-[10.5px] font-black" style={{ borderColor: '#d9d3c2', color: '#7b8598' }}>
                    الإدارة المدرسية
                  </div>
                </div>

                {/* الختم */}
                <svg viewBox="0 0 90 90" width="86" fill="none" aria-hidden>
                  <circle cx="45" cy="45" r="40" stroke="#c9a13f" strokeWidth="3" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.7s' }} />
                  <circle cx="45" cy="45" r="31" stroke="rgba(201,161,63,0.55)" strokeWidth="1.5" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.9s' }} />
                  <path
                    d="M45 26 L50 39 L64 40 L53 48 L57 62 L45 54 L33 62 L37 48 L26 40 L40 39 Z"
                    stroke="#c9a13f"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    pathLength={1}
                    className="chalk-stroke"
                    style={{ animationDelay: '1.1s' }}
                  />
                </svg>
              </div>
            </div>
          </div>
          </Draggable>
        </Drawn>
      </section>

      {/* ══ الواجب المنزلي (CTA) ══ */}
      <section id="homework" className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8">
        <Drawn>
          <div className="relative mx-auto max-w-[760px] rounded-2xl border-2 px-6 py-10 text-center sm:px-12" style={{ borderColor: CHALK_FAINT }}>
            <div className="absolute -top-4 right-8 rotate-[-6deg]">
              <StarDoodle color={YELLOW} delay={0.3} />
            </div>
            <div className="absolute -bottom-5 left-10 rotate-[10deg]">
              <StarDoodle size={20} color={RED} delay={0.6} />
            </div>

            <div className="inline-block rounded-lg px-4 py-1.5 text-[13px] font-black" style={{ background: 'rgba(255,157,157,0.14)', color: RED }}>
              📌 الواجب المنزلي
            </div>
            <h2 className="v4-chalk-text mx-auto mt-5 max-w-[20ch] text-4xl font-black leading-[1.3] sm:text-5xl" style={{ color: CHALK }}>
              سجّل مدرستك اليوم
              <span className="block text-[0.6em]" style={{ color: CHALK_DIM }}>موعد التسليم: قبل جرس الغد</span>
            </h2>

            <div className="relative mx-auto mt-9 w-fit">
              <Link
                to="/register"
                className="relative z-10 inline-flex items-center gap-2 rounded-xl px-9 py-4 text-[16px] font-black shadow-[0_16px_34px_-12px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.04]"
                style={{ background: PAPER, color: INK }}
              >
                أبدأ الواجب الآن — مجاناً
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
              {/* دائرة الطباشير الحمراء حول الزر */}
              <svg viewBox="0 0 300 90" className="pointer-events-none absolute -inset-x-8 -inset-y-4 h-[calc(100%+32px)] w-[calc(100%+64px)]" fill="none" aria-hidden>
                <ellipse cx="150" cy="45" rx="140" ry="38" stroke={RED} strokeWidth="3" pathLength={1} className="chalk-stroke" style={{ animationDelay: '0.5s' }} />
              </svg>
            </div>

            <div className="mt-8 text-[12.5px] font-bold" style={{ color: CHALK_DIM }}>
              درجة إضافية: التجربة مجانية وبلا بطاقة — والإعداد يستغرق يوماً واحداً.
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[12px] font-bold" style={{ color: CHALK_DIM }}>
              <Link to="/auth/admin" className="underline decoration-dashed underline-offset-4 transition hover:text-white">دخول الإدارة</Link>
              <Link to="/plans" className="underline decoration-dashed underline-offset-4 transition hover:text-white">الباقات والأسعار</Link>
              <Link to="/story" className="underline decoration-dashed underline-offset-4 transition hover:text-white">قصة يوم مدرسي كامل</Link>
            </div>
          </div>
        </Drawn>
      </section>

      {/* ══ الفوتر ══ */}
      <footer className="border-t px-5 py-6" style={{ borderColor: CHALK_FAINT }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 text-[12px] font-bold sm:flex-row" style={{ color: CHALK_DIM }}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full border text-[11px] font-black" style={{ borderColor: CHALK_DIM }}>ر</span>
            نظام الرائد للإدارة المدرسية
          </div>
          <div>انتهى الدرس — © {new Date().getFullYear()} جميع الحقوق محفوظة ✏️</div>
        </div>
      </footer>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Check,
  Clock3,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { usePublicSubscriptionPlansQuery, useRegisterSchoolMutation } from '../hooks'
import type { RegisterSchoolPayload } from '../types'
import { copyText } from '@/modules/core/clipboard'

/* هوية الرائد للصفحات العامة: أخضر عميق + كريمي دافئ */
const DEEP = '#24452F'
const GREEN = '#2E7D46'
const PASTEL = '#E9F5EC'
const PASTEL_BD = '#BFE3C9'
const WARM_BD = '#E8E3D9'

const initialForm: RegisterSchoolPayload = {
  school_name: '',
  subdomain: '',
  school_level: 'elementary',
  ministry_number: '',
  admin_name: '',
  admin_national_id: '',
  admin_phone: '',
  admin_email: '',
  plan_code: '',
}

const schoolLevelOptions = [
  { value: 'elementary', label: 'ابتدائي' },
  { value: 'middle', label: 'متوسط' },
  { value: 'high', label: 'ثانوي' },
] as const

const fieldInput =
  'rounded-xl border px-4 py-2.5 text-sm font-normal text-slate-700 transition-colors focus:outline-none focus:ring-2'

const fieldStyle: React.CSSProperties = {
  borderColor: '#E5E0D5',
  background: '#FBFAF8',
  ['--tw-ring-color' as string]: 'rgba(46,125,70,0.15)',
}

function SectionTitle({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-sm font-extrabold"
        style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}`, color: GREEN }}
      >
        {step}
      </span>
      <h3 className="text-base font-bold text-slate-900">{children}</h3>
    </div>
  )
}

function RequiredHint() {
  return <span className="text-xs font-normal" style={{ color: '#C43D3D' }}>هذا الحقل مطلوب</span>
}

/** رسالةُ خطأٍ حرّة — للحقول التي لا يكفيها «هذا الحقل مطلوب» */
function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-normal" style={{ color: '#C43D3D' }}>{children}</span>
}

/* ══════════════════════════════════════════════════════════════
   البريد الإلكتروني — تحقّقٌ نفرضه نحن لا نتركه للمتصفّح وحده
   ══════════════════════════════════════════════════════════════
   `type="email"` يمنع الإرسال، لكنّ فقاعته تظهر **بلغة المتصفّح** — فمديرُ
   مدرسةٍ على واجهةٍ عربيّةٍ قد يقرأ «Please include an '@'». فنكتب نصَّنا
   بأنفسنا عبر `setCustomValidity`، ونعرض الخطأ مكتوباً تحت الحقل أيضاً لمن
   تفوته الفقاعة.

   والنمطُ متساهلٌ عمداً: غايته منعُ الأخطاء المطبعيّة الواضحة («فلان@») لا
   الحكمُ على صحّة العنوان — من ذلك التشدّد تُرفض عناوينُ صحيحةٌ نادرة، والخادم
   هو الحكم الأخير على أيّ حال. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const EMAIL_REQUIRED_MESSAGE = 'البريد الإلكتروني مطلوب — إليه تُرسل بيانات الدخول'
const EMAIL_INVALID_MESSAGE = 'صيغة البريد غير صحيحة. مثال: manager@school.com'

function emailProblem(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return EMAIL_REQUIRED_MESSAGE
  if (!EMAIL_PATTERN.test(trimmed)) return EMAIL_INVALID_MESSAGE
  return null
}

/**
 * زرُّ نسخٍ صغير — يعترف حين يفشل.
 *
 * النسخُ البرمجيّ لا يعمل خارج الاتصال الآمن، و`copyText` تحتاط له ثمّ تُرجع
 * `false` إن عجزت. وزرٌّ يقول «تمّ» بلا نسخٍ أسوأ من زرٍّ يقول «انسخه يدوياً»:
 * الأوّل يجعل المدير يغادر الصفحة واثقاً وقد ضاعت كلمةُ مروره.
 */
function CopyChip({ value, label, wide = false }: { value: string; label: string; wide?: boolean }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2500)
    return () => window.clearTimeout(timer)
  }, [state])

  const handleCopy = async () => {
    setState((await copyText(value)) ? 'done' : 'failed')
  }

  const text = state === 'done' ? 'تم النسخ' : state === 'failed' ? 'انسخه يدوياً' : wide ? 'نسخ بيانات الدخول' : 'نسخ'

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={state === 'done' ? `نُسخ ${label}` : `نسخ ${label}`}
      className={[
        'inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors',
        wide ? 'mt-3 w-full px-3 py-2 text-xs' : 'px-2.5 py-1 text-[11px]',
      ].join(' ')}
      style={{
        borderColor: state === 'failed' ? '#C43D3D' : state === 'done' ? GREEN : WARM_BD,
        background: state === 'done' ? GREEN : '#FFFFFF',
        color: state === 'done' ? '#FFFFFF' : state === 'failed' ? '#C43D3D' : DEEP,
      }}
    >
      {state === 'done' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {text}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════
   لَبِناتُ شاشة النجاح — مبنيّةٌ لتشبه النموذج، لا لتشبه شاشةَ نجاح
   ══════════════════════════════════════════════════════════════
   الشاشتان تتشاركان: `SectionTitle` بشارة الرقم الخضراء · شبكةُ عمودَين ·
   `rounded-xl` بحدٍّ 1px · سطورُ تلميحٍ صغيرةٌ بأيقونة · تذييلٌ بخطٍّ فاصل
   والزرُّ الداكن في طرفه. فمن ينتقل من النموذج إلى النجاح لا يشعر أنّه
   انتقل إلى صفحةٍ صمّمها أحدٌ آخر. */

/** سطرُ تلميحٍ صغير — نفس هيئة تلميحات النموذج (أيقونة 3.5 + نصّ 12px). */
function Hint({
  icon: Icon,
  tone = '#6B6255',
  iconTone = GREEN,
  children,
}: {
  icon: typeof Mail
  tone?: string
  iconTone?: string
  children: React.ReactNode
}) {
  return (
    <p className="flex items-start gap-1.5 text-xs font-normal leading-relaxed" style={{ color: tone }}>
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: iconTone }} />
      {children}
    </p>
  )
}

/**
 * بيانُ دخولٍ واحد — يُعرض بهيئة حقل النموذج نفسِها (تسميةٌ فوق، صندوقٌ تحت).
 *
 * مقصودٌ أن يبدو كحقلٍ لا كسطرِ جدول: المدير خرج لتوّه من نموذجٍ ملأ فيه
 * حقولاً بهذا الشكل بالضبط، فيقرأ الصندوق فوراً على أنّه «قيمةٌ تخصّني».
 */
function CredentialField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
      {label}
      <div
        className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: '#E5E0D5', background: '#FFFFFF' }}
      >
        <span className="select-all break-all font-mono text-sm font-bold text-slate-800" dir="ltr">
          {value}
        </span>
        <CopyChip value={value} label={label} />
      </div>
    </div>
  )
}

export function SchoolRegistrationPage() {
  const [searchParams] = useSearchParams()
  const { data: plansData } = usePublicSubscriptionPlansQuery()
  const registerMutation = useRegisterSchoolMutation()

  const plans = plansData?.plans ?? []
  const defaultPlanCode = useMemo(
    () => searchParams.get('plan') ?? plans[0]?.code ?? '',
    [searchParams, plans],
  )

  const [form, setForm] = useState<RegisterSchoolPayload>({ ...initialForm, plan_code: defaultPlanCode })
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  /* لا اختيار باقة عند التسجيل — التجربة المجانية تبدأ فوراً، والاختيار بعدها.
     الخادم ما زال يتوقع plan_code فنمرّر الافتراضية صامتةً فور تحميل الباقات. */
  useEffect(() => {
    if (defaultPlanCode) {
      setForm((prev) => (prev.plan_code ? prev : { ...prev, plan_code: defaultPlanCode }))
    }
  }, [defaultPlanCode])

  /* ══════════════════════════════════════════════════════════════
     لا احتفالَ بالورق المتطاير — أُسقط عمداً
     ══════════════════════════════════════════════════════════════
     كان هنا مِدفعا `canvas-confetti` يرميان الورق من طرفَي الشاشة ثلاث ثوانٍ
     كاملة (`requestAnimationFrame` متكرّر). أُزيلا لسببين:

     ١) الورقُ المتطاير نقيضُ «الفلات»: مئاتُ الجسيمات المتحرّكة فوق شاشةٍ
        بُنيت على حدودٍ رفيعةٍ وكتلٍ لونيّةٍ صلبة تجعل الصفحة تبدو من قالبَين.
     ٢) اللحظةُ ليست لحظة لهو: على الشاشة كلمةُ مرورٍ تُعرض **مرّةً واحدة**،
        فأيُّ حركةٍ تسحب العين بعيداً عنها تعمل ضدّ غرض الشاشة.

     وبقي الاحتفالُ قائماً لكن بأخفض صوت: علامةُ صحٍّ تظهر برفق (انظر
     `reg-ok-mark` أدناه) — ظهورٌ واحدٌ في ربع ثانية، ويُلغى كلّياً لمن
     طلب تقليل الحركة في نظامه.

     ملاحظة: الحزمة `canvas-confetti` تبقى في package.json لأنّ
     `modules/admin/teacher-profile/components/badges-section.tsx` ما زال
     يستعملها — الإسقاطُ هنا لا يُبرّر نزعها من المشروع. */

  const handleChange = (field: keyof RegisterSchoolPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const emailError = emailProblem(form.admin_email ?? '')

  /* العنوانُ كما أُرسل فعلاً لا كما هو في النموذج الآن: `variables` تحمل حمولة
     الطفرة نفسها، فيُعرض في شاشة النجاح ما ذهبت إليه الرسالة بالضبط. */
  const submittedEmail = registerMutation.variables?.admin_email?.trim() ?? ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)

    if (!form.school_name || !form.admin_name || !form.admin_national_id || !form.admin_phone || !form.school_level || !form.ministry_number) {
      return
    }

    /* البريد شرطٌ لا مجاملة: بلا عنوانٍ صحيح لن تصل بيانات الدخول إلى أحد.
       والحقلُ الفارغ يوقفه المتصفّح قبل أن يصل الإرسالُ إلى هنا؛ أمّا المشوّه
       — مثل «name@school» بلا نطاقٍ أعلى — فالمتصفّح يقبله وتحقّقُنا لا يقبله.
       فنُطلق فقاعة المتصفّح **برسالتنا** ونُعيد التركيز إلى الحقل، وإلّا ظنّ
       المستخدم أنّ الزرّ لا يعمل. */
    if (emailError) {
      const input = emailInputRef.current
      if (input) {
        input.setCustomValidity(emailError)
        input.reportValidity()
        input.focus()
      }
      return
    }

    // التشذيبُ قبل الإرسال: مسافةٌ لاصقةٌ في آخر البريد (يضيفها اللصقُ من الجوّال
    // كثيراً) تجعل الرسالة تُرفض عند البوّابة، والمدرسةُ لا تعرف لماذا لم تصل.
    registerMutation.mutate({ ...form, admin_email: (form.admin_email ?? '').trim() })
  }

  return (
    <section className="flex flex-col gap-4 pb-4 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
      {/* الصفحة بلا هيدر عام — شريط هوية خفيف يعيد الزائر للرئيسية */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
            style={{ background: DEEP }}
          >
            <BookOpenCheck className="h-5 w-5" style={{ color: '#EAF3EC' }} />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">نظام الرائد</span>
            <span className="block text-[11px] text-slate-500">للإدارة المدرسية</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors"
          style={{ background: '#FFFFFF', border: `1px solid ${WARM_BD}`, color: GREEN }}
        >
          العودة للرئيسية
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* شاشة التحميل الكاملة أثناء التسجيل */}
      {registerMutation.isPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="rounded-2xl bg-white p-8 shadow-2xl" style={{ border: `1px solid ${WARM_BD}` }}>
            <div className="flex flex-col items-center gap-5">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: PASTEL }}
              >
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: GREEN }} />
              </span>
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">جارِ تسجيل مدرستك</h3>
                <p className="mt-2 text-sm text-slate-600">يُرجى الانتظار قليلاً...</p>
              </div>
              <div className="h-1.5 w-64 overflow-hidden rounded-full" style={{ background: '#EFEDE6' }}>
                <div className="animate-progress h-full" style={{ background: GREEN }}></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ══════════════════════════════════════════════════════════════
          شاشة النجاح — من عائلة النموذج نفسِه
          ══════════════════════════════════════════════════════════════
          كانت شاشةً غريبةً عن الصفحة: خلفيّةٌ خضراء، وعنوانٌ 3xl، ودائرةٌ
          تنبض بلا توقّف (`animate-ping`)، وظلالٌ في أربعة مواضع، ونصٌّ
          مُوسَّطٌ يجعل قراءةَ بياناتٍ حسّاسةٍ عملاً بصريّاً.

          صارت بطاقةً بيضاء بحدٍّ كريميٍّ 1px — لا ظلّ ولا تدرّج ولا لمعان —
          مقسّمةً بشاراتِ الأرقام الخضراء نفسِها التي في النموذج، وبالترتيب
          الذي يخدم المدير لا الذي يُطري النظام:

            رأسٌ هادئ  →  ١ بيانات الدخول  →  ٢ البريد  →  ٣ ما يبدأ الآن  →  الدخول

          بيانات الدخول أوّلاً لأنّها الشيء الوحيد في الشاشة الذي **يضيع إن
          غادر**؛ والترحيبُ يُقرأ في أيّ وقت. */}
      {registerMutation.isSuccess && registerMutation.data?.school ? (
        <div className="mx-auto w-full max-w-2xl lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <style>{`
            /* الاحتفالُ كلُّه في هذين السطرين: ظهورٌ واحدٌ برفق، ثمّ سكون. */
            @keyframes reg-ok-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
            @keyframes reg-ok-mark-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: none; } }
            .reg-ok { animation: reg-ok-in 320ms ease-out both; }
            .reg-ok-mark { animation: reg-ok-mark-in 260ms ease-out 120ms both; }
            @media (prefers-reduced-motion: reduce) {
              .reg-ok, .reg-ok-mark { animation: none; }
            }
          `}</style>

          <div
            className="reg-ok space-y-5 rounded-2xl bg-white p-5"
            style={{ border: `1px solid ${WARM_BD}` }}
          >
            {/* رأسٌ هادئ: علامةُ صحٍّ واحدةٌ واسمُ المدرسة — لا تهنئةٌ صاخبة */}
            <div className="flex items-center gap-3">
              <span
                className="reg-ok-mark flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}` }}
              >
                <Check className="h-5 w-5" strokeWidth={2.5} style={{ color: GREEN }} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold" style={{ color: DEEP }}>
                  تم تسجيل مدرستك
                </h2>
                <p className="truncate text-sm text-slate-600">{registerMutation.data.school.name}</p>
              </div>
            </div>

            {/* ══ ١ — بيانات الدخول ══
                أوّلُ ما يراه المدير، وفي إطارٍ أخضر باهتٍ كإطار «بيانات مدير
                المدرسة» في النموذج — الحقول التي كتبها هناك تعود إليه هنا. */}
            {registerMutation.data.admin_credentials ? (
              <div
                /* مرساةٌ ثابتةٌ للاختبار: كانت البطاقة تُلتقط بوسم `<dl>` وحيدٍ
                   في الشاشة، وقد زال الوسم مع إعادة التصميم فسقط التأكيد بلا
                   عطبٍ حقيقيّ. المعرّفُ لا يتبدّل مع الشكل. */
                data-testid="admin-credentials"
                className="space-y-4 rounded-xl p-4"
                style={{ background: '#F7FBF8', border: `1px solid ${PASTEL_BD}` }}
              >
                <SectionTitle step="١">بيانات الدخول</SectionTitle>

                <div className="grid gap-3 md:grid-cols-2">
                  <CredentialField
                    label="اسم المستخدم"
                    value={registerMutation.data.admin_credentials.national_id}
                  />
                  <CredentialField
                    label="كلمة المرور"
                    value={registerMutation.data.admin_credentials.password}
                  />
                </div>

                <CopyChip
                  wide
                  label="بيانات الدخول كاملة"
                  value={`اسم المستخدم: ${registerMutation.data.admin_credentials.national_id}\nكلمة المرور: ${registerMutation.data.admin_credentials.password}`}
                />

                {/* التنبيهُ تحت البيانات لا فوقها: يُقرأ بعد رؤيتها فيُفهم أثره */}
                <Hint icon={AlertTriangle} iconTone="#9A6B1E">
                  احفظ كلمة المرور الآن — لن تظهر مرة أخرى بعد مغادرة هذه الصفحة، ولا نحتفظ
                  بنسخةٍ منها.
                </Hint>
              </div>
            ) : null}

            {/* ══ ٢ — البريد ══
                يُذكر العنوانُ صريحاً كي يكتشف صاحبُه خطأً مطبعياً فيه الآن، لا
                بعد ساعةٍ من انتظار رسالةٍ ذهبت إلى عنوانٍ لا يملكه. */}
            {submittedEmail ? (
              <div className="space-y-3">
                <SectionTitle step="٢">وأرسلناها إلى بريدك</SectionTitle>
                <div
                  className="rounded-xl border px-4 py-2.5"
                  style={{ borderColor: '#E5E0D5', background: '#FBFAF8' }}
                >
                  <span className="block break-all font-mono text-sm font-bold" dir="ltr" style={{ color: DEEP, textAlign: 'left' }}>
                    {submittedEmail}
                  </span>
                </div>
                <Hint icon={Mail}>
                  قد تستغرق الرسالة بضع دقائق. إن لم تجدها فابحث في مجلد الرسائل غير المرغوب
                  فيها (Spam).
                </Hint>
              </div>
            ) : null}

            {/* ══ ٣ — ما يبدأ الآن ══
                صفٌّ واحدٌ بثلاثة أعمدة وفواصل 1px بدل ثلاث بطاقاتٍ مُظلَّلة:
                معلوماتٌ مساندة، فتأخذ حجمَ المساند. */}
            <div className="space-y-3">
              <SectionTitle step="٣">ما الذي يبدأ الآن</SectionTitle>
              <div
                className="grid rounded-xl md:grid-cols-3"
                style={{ border: `1px solid ${WARM_BD}` }}
              >
                {[
                  { icon: Clock3, title: 'تجربة مجانية', sub: '7 أيام بكامل المميزات' },
                  { icon: Sparkles, title: 'وصول كامل', sub: 'كل أقسام النظام متاحة' },
                  { icon: MessageCircle, title: 'ترحيب على واتساب', sub: 'على الجوال المسجّل' },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.title}
                      /* الفاصلُ أفقيٌّ على الجوّال ورأسيٌّ على العريض. و`border-r`
                         فيزيائيّ عن قصد: الصفحة RTL فأوّلُ خليّةٍ في اليمين،
                         والفاصلُ يقع بينها وبين تاليتها. وأوّلُ خليّةٍ بلا فاصل
                         كي لا يُزدوج مع حدّ الصندوق. */
                      className={[
                        'flex items-start gap-2.5 p-3.5',
                        index === 0 ? '' : 'border-t border-[#E8E3D9] md:border-t-0 md:border-r',
                      ].join(' ')}
                    >
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.sub}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* التذييل — نفس تذييل النموذج: خطٌّ فاصل، نصٌّ صغير، والزرُّ الداكن */}
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-t pt-4"
              style={{ borderColor: '#F0ECE3' }}
            >
              <p className="max-w-xs text-xs text-slate-500">
                لم تصلك الرسالة بعد دقائق؟ تحقّق من مجلد الرسائل غير المرغوب فيها، ثم تواصل مع
                الدعم الفني.
              </p>
              <a
                href="/auth/admin"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold text-white transition-colors"
                style={{ background: DEEP }}
              >
                الانتقال لتسجيل الدخول
                <ArrowLeft className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {/* نموذج التسجيل */}
      {!registerMutation.isSuccess && (
        <>
          <header className="mx-auto max-w-3xl flex-shrink-0 space-y-2 text-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}`, color: GREEN }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              تسجيل مدرسة جديدة
            </span>
            <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl">ابدأ رحلتك مع نظام الرائد</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600">
              عبّئ البيانات التالية وتبدأ تجربتك المجانية فوراً بكامل المميزات — سننشئ حساباً لمدير
              المدرسة ونرسل بيانات الدخول إلى بريده الإلكتروني، وتختار باقتك بعد التجربة.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-3xl space-y-5 rounded-2xl bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
            style={{ border: `1px solid ${WARM_BD}` }}
          >
              {/* ١ — بيانات المدرسة */}
              <div className="space-y-4">
                <SectionTitle step="١">بيانات المدرسة</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    اسم المدرسة
                    <input
                      type="text"
                      required
                      value={form.school_name}
                      onChange={(event) => handleChange('school_name', event.target.value)}
                      className={fieldInput}
                      style={fieldStyle}
                    />
                    {hasSubmitted && !form.school_name ? <RequiredHint /> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    المرحلة الدراسية
                    <select
                      required
                      value={form.school_level}
                      onChange={(event) => handleChange('school_level', event.target.value)}
                      className={fieldInput}
                      style={fieldStyle}
                    >
                      {schoolLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {hasSubmitted && !form.school_level ? <RequiredHint /> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    الرقم الوزاري للمدرسة
                    <input
                      type="text"
                      required
                      value={form.ministry_number ?? ''}
                      onChange={(event) => handleChange('ministry_number', event.target.value)}
                      placeholder="مثال: 12345678"
                      className={fieldInput}
                      style={fieldStyle}
                    />
                    {hasSubmitted && !form.ministry_number ? <RequiredHint /> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    النطاق الفرعي (اختياري)
                    <input
                      type="text"
                      value={form.subdomain ?? ''}
                      onChange={(event) => handleChange('subdomain', event.target.value)}
                      placeholder="مثال: alraed-school"
                      className={fieldInput}
                      style={fieldStyle}
                    />
                  </label>
                </div>
              </div>

              {/* ٢ — بيانات مدير المدرسة */}
              <div
                className="space-y-4 rounded-xl p-4"
                style={{ background: '#F7FBF8', border: `1px solid ${PASTEL_BD}` }}
              >
                <SectionTitle step="٢">بيانات مدير المدرسة — للدخول على النظام</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    اسم مدير المدرسة
                    <input
                      type="text"
                      required
                      value={form.admin_name}
                      onChange={(event) => handleChange('admin_name', event.target.value)}
                      placeholder="الاسم الرباعي"
                      className={fieldInput}
                      style={{ ...fieldStyle, background: '#FFFFFF' }}
                    />
                    {hasSubmitted && !form.admin_name ? <RequiredHint /> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    رقم جوال مدير المدرسة
                    <input
                      type="tel"
                      required
                      value={form.admin_phone ?? ''}
                      onChange={(event) => handleChange('admin_phone', event.target.value)}
                      placeholder="05xxxxxxxx"
                      className={fieldInput}
                      style={{ ...fieldStyle, background: '#FFFFFF' }}
                    />
                    {hasSubmitted && !form.admin_phone ? <RequiredHint /> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    رقم الهوية (للدخول على النظام)
                    <input
                      type="text"
                      required
                      value={form.admin_national_id}
                      onChange={(event) => handleChange('admin_national_id', event.target.value)}
                      placeholder="رقم الهوية الوطنية"
                      className={fieldInput}
                      style={{ ...fieldStyle, background: '#FFFFFF' }}
                    />
                    {hasSubmitted && !form.admin_national_id ? <RequiredHint /> : null}
                  </label>
                  {/* بجانب الهويّة لا تحتها: كانت `md:col-span-2` تمدّه سطراً كاملاً
                      فيقف رقم الهويّة وحيداً في نصف سطر ويبقى النصف الآخر فارغاً.
                      والحقلان زوجٌ منطقيّ — بهما يدخل المدير، وأحدهما يستعيد الآخر. */}
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    البريد الإلكتروني — إليه تصل بيانات الدخول
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      dir="ltr"
                      inputMode="email"
                      autoComplete="email"
                      value={form.admin_email ?? ''}
                      onChange={(event) => {
                        // مسحُ الرسالة المخصّصة أوّلاً: بلا هذا يبقى الحقل «غير
                        // صالح» في نظر المتصفّح ولو صحّحه المستخدم
                        event.currentTarget.setCustomValidity('')
                        handleChange('admin_email', event.target.value)
                      }}
                      onInvalid={(event) => {
                        // نصُّنا العربيّ بدل فقاعة المتصفّح بلغته
                        event.currentTarget.setCustomValidity(
                          emailProblem(event.currentTarget.value) ?? EMAIL_INVALID_MESSAGE,
                        )
                      }}
                      placeholder="manager@school.com"
                      className={`${fieldInput} text-left`}
                      style={{ ...fieldStyle, background: '#FFFFFF' }}
                    />
                    {/* السطرُ الذي يجعل المستخدم يكتب بريده الحقيقيّ لا بريداً عابراً */}
                    <span className="flex items-start gap-1.5 text-xs font-normal" style={{ color: '#6B6255' }}>
                      <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: GREEN }} />
                      سنرسل اسم المستخدم وكلمة المرور إلى هذا البريد — اكتب بريداً تصل إليه
                      وتفتحه، فهو طريقك الوحيد لاستعادة بياناتك لاحقاً.
                    </span>
                    {hasSubmitted && emailError ? <FieldError>{emailError}</FieldError> : null}
                  </label>
                </div>
                <p className="flex items-start gap-1.5 text-xs" style={{ color: GREEN }}>
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  سيُنشأ حساب دخول لمدير المدرسة تلقائياً باستخدام رقم الهوية وكلمة مرور مؤقتة.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4" style={{ borderColor: '#F0ECE3' }}>
                {/* الوثيقتان تُفتحان في تبويبٍ جديد لا في التبويب نفسه: المدير هنا وقد
                    ملأ عشرة حقول، ومغادرةُ الصفحة لقراءة الشروط تمحوها كلَّها. */}
                <p className="text-xs text-slate-500">
                  بالضغط على زر التسجيل فأنت توافق على{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 transition-colors hover:text-slate-700"
                    style={{ color: GREEN }}
                  >
                    شروط الاستخدام
                  </Link>{' '}
                  و
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 transition-colors hover:text-slate-700"
                    style={{ color: GREEN }}
                  >
                    سياسة الخصوصية
                  </Link>
                  .
                </p>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="rounded-xl px-8 py-3.5 text-sm font-bold text-white shadow-md transition-colors disabled:opacity-50"
                  style={{ background: DEEP }}
                >
                  {registerMutation.isPending ? 'جاري تسجيل المدرسة...' : 'إكمال التسجيل'}
                </button>
              </div>
          </form>
        </>
      )}
    </section>
  );
};

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { usePublicSubscriptionPlansQuery, useRegisterSchoolMutation } from '../hooks'
import type { RegisterSchoolPayload } from '../types'

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
  const [credentialsCopied, setCredentialsCopied] = useState(false)

  /* لا اختيار باقة عند التسجيل — التجربة المجانية تبدأ فوراً، والاختيار بعدها.
     الخادم ما زال يتوقع plan_code فنمرّر الافتراضية صامتةً فور تحميل الباقات. */
  useEffect(() => {
    if (defaultPlanCode) {
      setForm((prev) => (prev.plan_code ? prev : { ...prev, plan_code: defaultPlanCode }))
    }
  }, [defaultPlanCode])

  // تفعيل Confetti عند نجاح التسجيل
  useEffect(() => {
    if (registerMutation.isSuccess) {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#2E7D46', '#7FC894', '#BFE3C9']
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#2E7D46', '#7FC894', '#BFE3C9']
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }
  }, [registerMutation.isSuccess])

  const handleChange = (field: keyof RegisterSchoolPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)

    if (!form.school_name || !form.admin_name || !form.admin_national_id || !form.admin_phone || !form.school_level || !form.ministry_number) {
      return
    }

    registerMutation.mutate(form)
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

      {/* صفحة النجاح */}
      {registerMutation.isSuccess && registerMutation.data?.school ? (
        <div className="mx-auto max-w-2xl">
          <div
            className="rounded-2xl p-8 text-center shadow-sm"
            style={{ background: '#F3F9F4', border: `1px solid ${PASTEL_BD}` }}
          >
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full opacity-25" style={{ background: GREEN }}></div>
                <div className="relative rounded-full p-5 text-white shadow-lg" style={{ background: GREEN }}>
                  <CheckCircle2 className="h-14 w-14" />
                </div>
              </div>
            </div>

            <h2 className="mb-2 text-3xl font-bold" style={{ color: DEEP }}>
              مرحباً بك في نظام الرائد!
            </h2>
            <p className="mb-6 text-lg font-semibold" style={{ color: GREEN }}>
              تم تسجيل مدرستك بنجاح
            </p>

            {/* بيانات الدخول تُعرض هنا مرة واحدة: رسالة الواتساب قد تتأخر أو
                تتعذّر، ولا يجوز أن يتوقف دخول المدرسة على ذلك وحده. */}
            {registerMutation.data.admin_credentials ? (
              <div
                className="mx-auto mb-6 max-w-md rounded-xl bg-white p-5 text-right shadow-sm"
                style={{ border: `1px solid ${PASTEL_BD}` }}
              >
                <p className="mb-1 text-sm font-bold" style={{ color: DEEP }}>
                  بيانات الدخول
                </p>
                <p className="mb-4 text-xs text-slate-500">
                  احفظها الآن — لن تظهر مرة أخرى بعد مغادرة هذه الصفحة.
                </p>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-slate-600">اسم المستخدم</dt>
                    <dd className="font-mono font-bold text-slate-800" dir="ltr">
                      {registerMutation.data.admin_credentials.national_id}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-slate-600">كلمة المرور</dt>
                    <dd className="font-mono font-bold text-slate-800" dir="ltr">
                      {registerMutation.data.admin_credentials.password}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => {
                    const creds = registerMutation.data?.admin_credentials
                    if (!creds) return
                    void navigator.clipboard
                      ?.writeText(`اسم المستخدم: ${creds.national_id}\nكلمة المرور: ${creds.password}`)
                      .then(() => setCredentialsCopied(true))
                      .catch(() => undefined)
                  }}
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-50"
                  style={{ borderColor: WARM_BD, color: DEEP }}
                >
                  {credentialsCopied ? '✓ تم النسخ' : 'نسخ بيانات الدخول'}
                </button>
              </div>
            ) : null}

            <div
              className="mx-auto mb-6 max-w-md space-y-4 rounded-xl bg-white p-5 text-right shadow-sm"
              style={{ border: `1px solid ${WARM_BD}` }}
            >
              {[
                {
                  icon: MessageCircle,
                  title: 'وستصلك نسخة عبر واتساب',
                  sub: 'على رقم الجوال المسجّل',
                },
                {
                  icon: Clock3,
                  title: 'فترة تجريبية مجانية',
                  sub: '7 أيام للاستفادة من جميع المميزات',
                },
                {
                  icon: Sparkles,
                  title: 'وصول كامل',
                  sub: 'جميع مميزات النظام متاحة لك الآن',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: PASTEL }}
                    >
                      <Icon className="h-4.5 w-4.5" style={{ color: GREEN, width: 18, height: 18 }} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <a
              href="/auth/admin"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors"
              style={{ background: DEEP }}
            >
              الانتقال لتسجيل الدخول
              <ArrowLeft className="h-5 w-5" />
            </a>

            <p className="mt-6 text-xs text-slate-500">
              لم تستلم الرسالة؟ تواصل مع الدعم الفني.
            </p>
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
              المدرسة ونرسل بيانات الدخول عبر واتساب، وتختار باقتك بعد التجربة.
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
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    البريد الإلكتروني (اختياري)
                    <input
                      type="email"
                      value={form.admin_email ?? ''}
                      onChange={(event) => handleChange('admin_email', event.target.value)}
                      placeholder="example@school.com"
                      className={fieldInput}
                      style={{ ...fieldStyle, background: '#FFFFFF' }}
                    />
                  </label>
                </div>
                <p className="flex items-start gap-1.5 text-xs" style={{ color: GREEN }}>
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  سيُنشأ حساب دخول لمدير المدرسة تلقائياً باستخدام رقم الهوية وكلمة مرور مؤقتة.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4" style={{ borderColor: '#F0ECE3' }}>
                <p className="text-xs text-slate-500">
                  بالضغط على زر التسجيل فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
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

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { usePublicSubscriptionPlansQuery, useRegisterSchoolMutation } from '../hooks'
import { PlanCard } from '../components/plan-card'
import type { RegisterSchoolPayload } from '../types'

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

export function SchoolRegistrationPage() {
  const [searchParams] = useSearchParams()
  const { data: plansData, isLoading: isPlansLoading } = usePublicSubscriptionPlansQuery()
  const registerMutation = useRegisterSchoolMutation()

  const plans = plansData?.plans ?? []
  const defaultPlanCode = searchParams.get('plan') ?? plans[0]?.code ?? ''

  const [form, setForm] = useState<RegisterSchoolPayload>({ ...initialForm, plan_code: defaultPlanCode })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === form.plan_code) ?? plans[0], [plans, form.plan_code])

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
          colors: ['#10b981', '#34d399', '#6ee7b7']
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
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
    <section className="space-y-10">
      {/* شاشة التحميل الكاملة أثناء التسجيل */}
      {registerMutation.isPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-6">
              {/* Spinner متحرك */}
              <div className="relative h-20 w-20">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
                <div className="absolute inset-2 animate-pulse rounded-full bg-emerald-50"></div>
              </div>
              
              {/* نص التحميل */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800">جارِ تسجيل مدرستك</h3>
                <p className="mt-2 text-sm text-slate-600">يُرجى الانتظار قليلاً...</p>
              </div>
              
              {/* شريط تقدم متحرك */}
              <div className="h-1 w-64 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full animate-progress bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* صفحة النجاح الكاملة */}
      {registerMutation.isSuccess && registerMutation.data?.school ? (
        <div className="glass-card mx-auto max-w-2xl">
          <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-lg">
            {/* تأثير احتفالي */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-30"></div>
                <div className="relative rounded-full bg-emerald-500 p-6 text-white shadow-xl">
                  <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* عنوان رئيسي */}
            <h2 className="mb-3 text-3xl font-bold text-emerald-800">
              🎉 مرحباً بك في نظام الرائد!
            </h2>
            
            {/* نص توضيحي */}
            <p className="mb-6 text-lg font-medium text-emerald-700">
              تم تسجيل مدرستك بنجاح
            </p>

            {/* معلومات إضافية */}
            <div className="mx-auto mb-6 max-w-md space-y-3 rounded-xl bg-white/80 p-5 text-right shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-slate-800">ستصلك بيانات الدخول عبر واتساب</p>
                  <p className="text-sm text-slate-600">تحقق من رسائل واتساب على رقمك المسجل</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="font-semibold text-slate-800">فترة تجريبية مجانية</p>
                  <p className="text-sm text-slate-600">
                    7 أيام للاستفادة من جميع المميزات
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-semibold text-slate-800">وصول كامل</p>
                  <p className="text-sm text-slate-600">جميع مميزات النظام متاحة لك الآن</p>
                </div>
              </div>
            </div>

            {/* زر الانتقال للدخول */}
            <a
              href="/auth/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              الانتقال لتسجيل الدخول
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>

            {/* ملاحظة */}
            <p className="mt-6 text-xs text-slate-500">
              💡 لم تستلم الرسالة؟ تواصل مع الدعم الفني
            </p>
          </div>
        </div>
      ) : null}

      {/* نموذج التسجيل */}
      {!registerMutation.isSuccess && (
        <>
          <header className="glass-card">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <span className="badge-soft">تسجيل مدرسة جديدة</span>
                <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">ابدأ رحلتك مع نظام الرائد</h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  قم بتعبئة البيانات التالية لتفعيل حساب مدرستك مباشرة، سنقوم بإنشاء حساب لمدير المدرسة وإرسال بيانات الدخول فوراً.
                </p>
              </div>
              {selectedPlan ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold text-emerald-700">الباقة المختارة</p>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPlan.name}</h2>
                  <p className="mt-1 text-xs text-emerald-700">
                    يمكنك تعديل الباقة لاحقاً من لوحة الإدارة.
                  </p>
                </div>
              ) : null}
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
            <form
              onSubmit={handleSubmit}
              className="glass-card space-y-6"
            >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              اسم المدرسة
              <input
                type="text"
                required
                value={form.school_name}
                onChange={(event) => handleChange('school_name', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {hasSubmitted && !form.school_name ? (
                <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              المرحلة الدراسية
              <select
                required
                value={form.school_level}
                onChange={(event) => handleChange('school_level', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {schoolLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {hasSubmitted && !form.school_level ? (
                <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              الرقم الوزاري للمدرسة
              <input
                type="text"
                required
                value={form.ministry_number ?? ''}
                onChange={(event) => handleChange('ministry_number', event.target.value)}
                placeholder="مثال: 12345678"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {hasSubmitted && !form.ministry_number ? (
                <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              النطاق الفرعي (اختياري)
              <input
                type="text"
                value={form.subdomain ?? ''}
                onChange={(event) => handleChange('subdomain', event.target.value)}
                placeholder="مثال: alraed-school"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-semibold text-emerald-800 mb-3">بيانات مدير المدرسة (للدخول على النظام)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                اسم مدير المدرسة
                <input
                  type="text"
                  required
                  value={form.admin_name}
                  onChange={(event) => handleChange('admin_name', event.target.value)}
                  placeholder="الاسم الرباعي"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {hasSubmitted && !form.admin_name ? (
                  <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                رقم جوال مدير المدرسة
                <input
                  type="tel"
                  required
                  value={form.admin_phone ?? ''}
                  onChange={(event) => handleChange('admin_phone', event.target.value)}
                  placeholder="05xxxxxxxx"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {hasSubmitted && !form.admin_phone ? (
                  <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                رقم الهوية (للدخول على النظام)
                <input
                  type="text"
                  required
                  value={form.admin_national_id}
                  onChange={(event) => handleChange('admin_national_id', event.target.value)}
                  placeholder="رقم الهوية الوطنية"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {hasSubmitted && !form.admin_national_id ? (
                  <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                البريد الإلكتروني (اختياري)
                <input
                  type="email"
                  value={form.admin_email ?? ''}
                  onChange={(event) => handleChange('admin_email', event.target.value)}
                  placeholder="example@school.com"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-emerald-700">
              💡 سيتم إنشاء حساب دخول لمدير المدرسة تلقائياً باستخدام رقم الهوية وكلمة مرور مؤقتة.
            </p>
          </div>



          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-muted">
              بالضغط على زر التسجيل فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="button-primary"
            >
              {registerMutation.isPending ? 'جاري تسجيل المدرسة...' : 'إكمال التسجيل'}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="glass-card space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">اختر الباقة المناسبة</h2>
            {isPlansLoading ? (
              <p className="text-sm text-muted">جاري تحميل الباقات...</p>
            ) : null}
            <div className="grid gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handleChange('plan_code', plan.code)}
                  className={`rounded-xl border px-4 py-3 text-right text-sm transition ${
                    plan.code === form.plan_code
                      ? 'border-emerald-400 bg-emerald-50/70 text-emerald-700'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{plan.name}</p>
                  {plan.description ? <p className="text-xs text-muted">{plan.description}</p> : null}
                </button>
              ))}
            </div>
          </div>

          {selectedPlan ? (
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl">
              <PlanCard plan={selectedPlan} highlight current actionLabel="" badge="الباقة المختارة" />
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )}
    </section>
  );
};

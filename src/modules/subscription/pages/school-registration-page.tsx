import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePublicSubscriptionPlansQuery, useRegisterSchoolMutation } from '../hooks'
import { PlanCard } from '../components/plan-card'
import type { RegisterSchoolPayload } from '../types'

const initialForm: RegisterSchoolPayload = {
  school_name: '',
  subdomain: '',
  admin_name: '',
  admin_national_id: '',
  admin_phone: '',
  admin_email: '',
  plan_code: '',
}

export function SchoolRegistrationPage() {
  const [searchParams] = useSearchParams()
  const { data: plansData, isLoading: isPlansLoading } = usePublicSubscriptionPlansQuery()
  const registerMutation = useRegisterSchoolMutation()

  const plans = plansData?.plans ?? []
  const defaultPlanCode = searchParams.get('plan') ?? plans[0]?.code ?? ''

  const [form, setForm] = useState<RegisterSchoolPayload>({ ...initialForm, plan_code: defaultPlanCode })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const selectedPlan = useMemo(() => plans.find((plan) => plan.code === form.plan_code) ?? plans[0], [plans, form.plan_code])

  const handleChange = (field: keyof RegisterSchoolPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)

    if (!form.school_name || !form.admin_name || !form.admin_national_id) {
      return
    }

    registerMutation.mutate(form)
  }

  return (
    <section className="space-y-10">
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
              النطاق الفرعي (اختياري)
              <input
                type="text"
                value={form.subdomain ?? ''}
                onChange={(event) => handleChange('subdomain', event.target.value)}
                placeholder="مثال: alraed-school"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              اسم مدير المدرسة
              <input
                type="text"
                required
                value={form.admin_name}
                onChange={(event) => handleChange('admin_name', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {hasSubmitted && !form.admin_name ? (
                <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              رقم هوية المدير
              <input
                type="text"
                required
                value={form.admin_national_id}
                onChange={(event) => handleChange('admin_national_id', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {hasSubmitted && !form.admin_national_id ? (
                <span className="text-xs font-normal text-rose-600">هذا الحقل مطلوب</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              هاتف المدير
              <input
                type="tel"
                value={form.admin_phone ?? ''}
                onChange={(event) => handleChange('admin_phone', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              البريد الإلكتروني للمدير
              <input
                type="email"
                value={form.admin_email ?? ''}
                onChange={(event) => handleChange('admin_email', event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-700">
            سيتم إنشاء حساب مدير المدرسة تلقائياً وإرسال كلمة مرور مؤقتة يمكن تغييرها بعد تسجيل الدخول الأول.
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

          {registerMutation.isSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-700">
              <p className="font-semibold text-emerald-800">تم إنشاء المدرسة بنجاح!</p>
              <p className="mt-2">يمكن للمدير تسجيل الدخول باستخدام البيانات التالية:</p>
              <ul className="mt-3 space-y-2 text-xs font-mono">
                <li>رقم الهوية: {registerMutation.data.admin_credentials.national_id}</li>
                <li>كلمة المرور المؤقتة: {registerMutation.data.admin_credentials.password}</li>
              </ul>
            </div>
          ) : null}
        </form>

        <aside className="space-y-4">
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
            <PlanCard plan={selectedPlan} highlight current actionLabel="" badge="الباقة المختارة" />
          ) : null}
        </aside>
      </div>
    </section>
  )
}

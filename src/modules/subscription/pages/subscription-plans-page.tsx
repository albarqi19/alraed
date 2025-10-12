import { Link, useNavigate } from 'react-router-dom'
import { usePublicSubscriptionPlansQuery } from '../hooks'
import { PlanCard } from '../components/plan-card'
import { useMemo } from 'react'

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = usePublicSubscriptionPlansQuery()

  const plans = data?.plans ?? []
  const highlightedPlan = useMemo(() => plans.find((plan) => plan.code === 'premium') ?? plans[0], [plans])

  return (
    <section className="space-y-10">
      <header className="glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-amber-400/15" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="badge-soft">خطط الاشتراك</span>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">اختر الخطة المثالية لمدرستك</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              صممنا الباقات لتناسب مختلف أحجام المدارس، مع إمكانية الترقية في أي وقت. جميع الباقات تشمل دعمًا فنيًا مستمرًا، وتقارير تفصيلية، وتكامل كامل مع خدماتنا.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="button-primary">
                جرّب النظام الآن
              </Link>
              <a href="#plans" className="button-secondary">
                استعراض الباقات
              </a>
            </div>
          </div>
          <div className="rounded-3xl bg-white/80 p-6 shadow-lg">
            <p className="text-xs font-semibold text-emerald-600">الخطة الأكثر اختيارًا</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {highlightedPlan ? highlightedPlan.name : 'خطة الرائد'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {highlightedPlan ? highlightedPlan.description : 'وصول كامل لجميع خصائص النظام مع دعم Priority'}
            </p>
            <button
              type="button"
              onClick={() => highlightedPlan && navigate(`/register?plan=${highlightedPlan.code}`)}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              ابدأ مع {highlightedPlan ? highlightedPlan.name : 'الباقة المميزة'}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="glass-card text-center text-muted">جاري تحميل الباقات...</div>
      ) : null}
      {isError ? (
        <div className="glass-card text-center text-rose-600">{error instanceof Error ? error.message : 'تعذر تحميل الباقات حالياً'}</div>
      ) : null}

      <div id="plans" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            highlight={plan.code === highlightedPlan?.code}
            onAction={(selected) => navigate(`/register?plan=${selected.code}`)}
            actionLabel="ابدأ بهذه الباقة"
          />
        ))}
      </div>

      {data?.faqs && data.faqs.length > 0 ? (
        <section className="glass-card space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">أسئلة شائعة</h2>
          <div className="space-y-3">
            {data.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200/80 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm text-muted leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { ChevronDown, Headset, Loader2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { usePublicSubscriptionPlansQuery } from '../hooks'
import { PlanCard } from '../components/plan-card'

/* هوية الرائد للصفحات العامة: أخضر عميق + كريمي دافئ */
const DEEP = '#24452F'
const GREEN = '#2E7D46'
const PASTEL = '#E9F5EC'
const PASTEL_BD = '#BFE3C9'

const TRUST_POINTS = [
  { icon: Sparkles, text: 'تجربة مجانية عند التسجيل' },
  { icon: RefreshCw, text: 'ترقية أو تغيير الباقة في أي وقت' },
  { icon: Headset, text: 'دعم فني مستمر لكل الباقات' },
  { icon: ShieldCheck, text: 'بياناتك محفوظة ومعزولة لمدرستك' },
]

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = usePublicSubscriptionPlansQuery()

  const plans = data?.plans ?? []
  const highlightedPlan = useMemo(() => plans.find((plan) => plan.code === 'premium') ?? plans[0], [plans])

  return (
    <section className="space-y-10 pb-6">
      {/* ── الترويسة: بسيطة ومركّزة ── */}
      <header className="mx-auto max-w-3xl space-y-4 pt-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold"
          style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}`, color: GREEN }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          خطط الاشتراك
        </span>
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">اختر الباقة المناسبة لمدرستك</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600">
          باقات تناسب مختلف أحجام المدارس مع إمكانية الترقية في أي وقت — وكلها تشمل دعماً فنياً مستمراً
          وتقارير تفصيلية وتكاملاً كاملاً مع خدمات النظام.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            to="/register"
            className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-colors"
            style={{ background: DEEP }}
          >
            جرّب النظام الآن
          </Link>
          {highlightedPlan ? (
            <button
              type="button"
              onClick={() => navigate(`/register?plan=${highlightedPlan.code}`)}
              className="rounded-xl px-6 py-3 text-sm font-bold transition-colors"
              style={{ background: '#FFFFFF', border: `1px solid ${PASTEL_BD}`, color: GREEN }}
            >
              ابدأ مع {highlightedPlan.name} — الأكثر اختياراً
            </button>
          ) : null}
        </div>
      </header>

      {/* ── نقاط الثقة ── */}
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
        {TRUST_POINTS.map((point) => {
          const Icon = point.icon
          return (
            <div
              key={point.text}
              className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3"
              style={{ border: '1px solid #E8E3D9' }}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: PASTEL }}
              >
                <Icon className="h-4 w-4" style={{ color: GREEN }} />
              </span>
              <span className="text-xs font-semibold leading-snug text-slate-700">{point.text}</span>
            </div>
          )
        })}
      </div>

      {/* ── الباقات ── */}
      {isLoading ? (
        <div
          className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-white px-6 py-10 text-sm text-slate-500"
          style={{ border: '1px solid #E8E3D9' }}
        >
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: GREEN }} />
          جاري تحميل الباقات...
        </div>
      ) : null}
      {isError ? (
        <div
          className="mx-auto max-w-md rounded-2xl px-6 py-6 text-center text-sm font-semibold"
          style={{ background: '#FBEAEA', border: '1px solid #EFC5C5', color: '#C43D3D' }}
        >
          {error instanceof Error ? error.message : 'تعذر تحميل الباقات حالياً'}
        </div>
      ) : null}

      <div id="plans" className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
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

      {/* ── الأسئلة الشائعة ── */}
      {data?.faqs && data.faqs.length > 0 ? (
        <section className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">أسئلة شائعة</h2>
          <div className="space-y-3">
            {data.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl bg-white p-4"
                style={{ border: '1px solid #E8E3D9' }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-slate-800">
                  {faq.question}
                  <ChevronDown
                    className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 border-t pt-3 text-sm leading-relaxed text-slate-600" style={{ borderColor: '#F0ECE3' }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

import type { PlatformOverview } from '../types'

export function TopPlansList({ plans }: { plans: PlatformOverview['top_plans'] }) {
  if (!plans.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
        لا توجد بيانات كافية عن الباقات بعد.
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">أكثر الباقات استخدامًا</h2>
          <p className="text-sm text-slate-500">ترتيب أعلى خمس باقات على مستوى المنصة.</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-600">
          {plans.length} باقات
        </span>
      </header>
      <ul className="space-y-3">
        {plans.map((plan) => (
          <li
            key={plan.plan ?? plan.name ?? 'plan'}
            className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700"
          >
            <div>
              <p className="font-semibold text-emerald-700">{plan.name ?? plan.plan ?? '—'}</p>
              <p className="text-xs text-emerald-600/80">رمز الباقة: {plan.plan ?? 'غير محدد'}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow">
              {plan.schools.toLocaleString('en-US')} مدرسة
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

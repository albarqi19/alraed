import type { PlatformRevenueTrend } from '../types'

export function RevenueTrendChart({ data }: { data: PlatformRevenueTrend[] }) {
  const maxValue = data.reduce((max, item) => Math.max(max, item.total), 0)

  if (!data.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
        لم يتم تسجيل إيرادات كافية بعد لعرض الاتجاه.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">اتجاه الإيرادات</h2>
          <p className="text-sm text-slate-500">آخر ستة أشهر من الفواتير المدفوعة.</p>
        </div>
        <span className="rounded-full bg-indigo-500/10 px-4 py-1 text-xs font-semibold text-indigo-600">
          {data.length} شهر
        </span>
      </header>
      <div className="space-y-4">
        {data.map((item) => {
          const width = maxValue > 0 ? Math.max((item.total / maxValue) * 100, 4) : 4
          return (
            <article key={item.period} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="font-medium text-indigo-600">
                  {item.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} ر.س
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-indigo-500 via-sky-500 to-emerald-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

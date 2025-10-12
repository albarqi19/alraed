import { useMemo } from 'react'
import { MetricCards } from '../components/metric-cards'
import { RevenueTrendChart } from '../components/revenue-trend-chart'
import { TopPlansList } from '../components/top-plans-list'
import { RecentInvoicesTable } from '../components/recent-invoices-table'
import { usePlatformOverviewQuery, usePlatformRevenueTrendsQuery, usePlatformRecentInvoicesQuery } from '../hooks'

export function PlatformOverviewPage() {
  const { data: overview, isLoading, refetch } = usePlatformOverviewQuery()
  const { data: revenueTrends } = usePlatformRevenueTrendsQuery()
  const { data: invoices, isLoading: isInvoicesLoading } = usePlatformRecentInvoicesQuery()

  const safeOverview = overview ?? {
    schools: { total: 0, active: 0, trial: 0, suspended: 0, new_last_30_days: 0 },
    subscriptions: { active: 0, expiring_soon: 0, monthly_recurring_revenue: 0 },
    revenue: { total: 0, this_month: 0 },
    top_plans: [],
  }

  const schoolCards = useMemo(
    () => [
      { title: 'إجمالي المدارس', value: safeOverview.schools.total, subtitle: 'جميع المدارس المسجلة', tone: 'indigo' as const },
      { title: 'مدارس نشطة', value: safeOverview.schools.active, subtitle: 'تشغيل كامل للمنصة', tone: 'emerald' as const },
      { title: 'مدارس تجريبية', value: safeOverview.schools.trial, subtitle: 'تحتاج متابعة للترقية', tone: 'amber' as const },
      { title: 'المضاف آخر 30 يوم', value: safeOverview.schools.new_last_30_days, subtitle: 'توسع المنصة الشهري', tone: 'sky' as const },
    ],
    [safeOverview.schools],
  )

  const subscriptionCards = useMemo(
    () => [
      { title: 'اشتراكات نشطة', value: safeOverview.subscriptions.active, subtitle: 'خلال الباقات الحالية', tone: 'emerald' as const },
      { title: 'تنتهي خلال 14 يوم', value: safeOverview.subscriptions.expiring_soon, subtitle: 'تحتاج تواصل عاجل', tone: 'rose' as const },
      {
        title: 'الإيراد الشهري المتكرر',
        value: Math.round(safeOverview.subscriptions.monthly_recurring_revenue),
        subtitle: 'MRR بالريال السعودي',
        tone: 'indigo' as const,
      },
      {
        title: 'إجمالي الإيراد المحقق',
        value: Math.round(safeOverview.revenue.total),
        subtitle: `الشهر الحالي: ${Math.round(safeOverview.revenue.this_month).toLocaleString('en-US')} ر.س`,
        tone: 'sky' as const,
      },
    ],
    [safeOverview.subscriptions, safeOverview.revenue],
  )

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-600 via-sky-600 to-emerald-500 p-[1px] shadow-lg">
        <div className="space-y-4 rounded-3xl bg-white/95 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-700">الرؤية الشاملة</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">مؤشرات الأداء على مستوى المنصة</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                تتبع انتشار المدارس، أداء الاشتراكات، والإيرادات المتكررة بشكل لحظي لمساعدة الإدارة العليا على اتخاذ القرارات السريعة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full border border-indigo-200 px-5 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              تحديث البيانات
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-indigo-600/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 font-semibold">
              <i className="bi bi-buildings" /> إجمالي المدارس: {safeOverview.schools.total.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-600">
              <i className="bi bi-check-circle" /> مدارس نشطة: {safeOverview.schools.active.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-600">
              <i className="bi bi-hourglass-split" /> تجريبي: {safeOverview.schools.trial.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </header>

      <MetricCards cards={schoolCards} />
      <MetricCards cards={subscriptionCards} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RevenueTrendChart data={revenueTrends ?? []} />
        <TopPlansList plans={safeOverview.top_plans} />
      </div>

      <RecentInvoicesTable invoices={(invoices ?? []).slice(0, 8)} isLoading={isInvoicesLoading && !invoices} />

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500">
          يتم تحميل بيانات المنصة...
        </div>
      ) : null}
    </section>
  )
}

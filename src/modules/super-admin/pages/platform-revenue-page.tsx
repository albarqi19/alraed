import { useMemo } from 'react'
import { usePlatformOverviewQuery, usePlatformRevenueTrendsQuery } from '../hooks'
import { MetricCards } from '../components/metric-cards'
import { RevenueTrendChart } from '../components/revenue-trend-chart'

export function PlatformRevenuePage() {
  const { data: overview } = usePlatformOverviewQuery()
  const { data: revenueTrends } = usePlatformRevenueTrendsQuery()

  const revenueCards = useMemo(() => {
    const revenue = overview?.revenue ?? { total: 0, this_month: 0 }
    const subscriptions = overview?.subscriptions ?? { monthly_recurring_revenue: 0, active: 0, expiring_soon: 0 }

    return [
      {
        title: 'إجمالي الإيراد المحقق',
        value: Math.round(revenue.total),
        subtitle: 'منذ إطلاق المنصة',
        tone: 'indigo' as const,
      },
      {
        title: 'إيراد هذا الشهر',
        value: Math.round(revenue.this_month),
        subtitle: 'إجمالي المدفوع خلال الشهر الحالي',
        tone: 'emerald' as const,
      },
      {
        title: 'MRR الحالي',
        value: Math.round(subscriptions.monthly_recurring_revenue),
        subtitle: 'الإيراد الشهري المتكرر المتوقع',
        tone: 'sky' as const,
      },
      {
        title: 'اشتراكات نشطة',
        value: subscriptions.active,
        subtitle: `تنتهي قريبًا: ${subscriptions.expiring_soon}`,
        tone: 'amber' as const,
      },
    ]
  }, [overview])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">إدارة الإيرادات</h1>
            <p className="text-sm text-slate-500">
              تحليل شامل لحركة الإيرادات والفواتير لتقدير النمو الأسبوعي والشهري للمنصة.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold text-indigo-600">
            <i className="bi bi-graph-up" />
            تحديث تلقائي كل 10 دقائق
          </span>
        </header>
      </div>

      <MetricCards cards={revenueCards} />

      <RevenueTrendChart data={revenueTrends ?? []} />

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm leading-7 text-slate-600 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">ملاحظات استراتيجية</h2>
        <ul className="space-y-2 list-disc pr-4">
          <li>راقب الاشتراكات التي تنتهي قريبًا وتواصل مع المدارس لتجديد الباقات أو ترقية الخطة.</li>
          <li>استخدم بيانات الإيرادات المتكررة للتنبؤ بالتدفق النقدي وخطط الاستثمار القادمة.</li>
          <li>اربط استراتيجيات التسويق بالمدارس التي مازالت في التجربة لزيادة التحويل لباقات مدفوعة.</li>
        </ul>
      </div>
    </section>
  )
}

import { usePlatformRecentInvoicesQuery } from '../hooks'
import { RecentInvoicesTable } from '../components/recent-invoices-table'

export function PlatformInvoicesPage() {
  const { data: invoices, isLoading, refetch, isFetching } = usePlatformRecentInvoicesQuery()

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">آخر الفواتير</h1>
            <p className="text-sm text-slate-500">اطلع على أحدث المعاملات المالية للتأكد من سير الدفعات بسلاسة.</p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold text-indigo-600">
                <i className="bi bi-arrow-repeat animate-spin" />
                يتم التحديث
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              تحديث القائمة
            </button>
          </div>
        </header>
      </div>

      <RecentInvoicesTable invoices={invoices ?? []} isLoading={isLoading && !invoices} />
    </section>
  )
}

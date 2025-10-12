import type { PlatformInvoice } from '../types'

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function RecentInvoicesTable({ invoices, isLoading }: { invoices: PlatformInvoice[]; isLoading?: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70 shadow-sm">
      <header className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">أحدث الفواتير</h2>
        <p className="text-sm text-slate-500">آخر المعاملات المالية عبر المنصة.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-right">
          <thead className="bg-slate-100/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">الفاتورة</th>
              <th className="px-4 py-3 font-medium">المدرسة</th>
              <th className="px-4 py-3 font-medium">الباقة</th>
              <th className="px-4 py-3 font-medium">القيمة</th>
              <th className="px-4 py-3 font-medium">الفترة</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  يتم تحميل الفواتير...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  لا توجد فواتير حديثة حتى الآن.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">{invoice.school?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{invoice.school?.subscription_status ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {invoice.plan?.name ?? invoice.plan?.code ?? invoice.school?.plan ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-indigo-600">
                    {invoice.total.toLocaleString('en-US', { minimumFractionDigits: 0 })} {invoice.currency ?? 'ر.س'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(invoice.billing_period_start)} – {formatDate(invoice.billing_period_end)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

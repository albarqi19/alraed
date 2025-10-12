import type { SubscriptionInvoiceRecord } from '../types'
import clsx from 'classnames'

const STATUS_BADGES: Record<SubscriptionInvoiceRecord['status'], { label: string; className: string }> = {
  draft: { label: 'مسودة', className: 'bg-slate-200 text-slate-600' },
  pending: { label: 'بانتظار الدفع', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'مدفوعة', className: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'فشل الدفع', className: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'مستردة', className: 'bg-indigo-100 text-indigo-700' },
}

function formatCurrency(value: number, currency = 'SAR') {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface BillingHistoryTableProps {
  invoices: SubscriptionInvoiceRecord[]
  isLoading?: boolean
  page: number
  lastPage: number
  onPageChange?: (page: number) => void
}

export function BillingHistoryTable({ invoices, isLoading, page, lastPage, onPageChange }: BillingHistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/70 text-right">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">رقم الفاتورة</th>
              <th className="px-4 py-3">القيمة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">فترة الفوترة</th>
              <th className="px-4 py-3">تاريخ الاستحقاق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 text-sm text-slate-600">
            {invoices.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  لا توجد فواتير حالياً
                </td>
              </tr>
            ) : null}
            {invoices.map((invoice) => {
              const badge = STATUS_BADGES[invoice.status]
              return (
                <tr key={invoice.id} className="transition hover:bg-emerald-50/30">
                  <td className="px-4 py-3 font-semibold text-slate-800">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', badge.className)}>{badge.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(invoice.billing_period_start)} – {formatDate(invoice.billing_period_end)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.due_date)}</td>
                </tr>
              )
            })}
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  جاري التحميل...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
        <span>
          صفحة {page} من {lastPage}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold transition disabled:opacity-50"
          >
            السابق
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(lastPage, page + 1))}
            disabled={page >= lastPage}
            className="rounded-full border border-slate-200 px-3 py-1 font-semibold transition disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  )
}

import type { SubscriptionInvoiceRecord } from '../types'
import { useInitiatePaymentMutation } from '../hooks'
import clsx from 'classnames'
import { CreditCard, Loader2, Clock, AlertTriangle } from 'lucide-react'

const STATUS_BADGES: Record<SubscriptionInvoiceRecord['status'], { label: string; className: string }> = {
  draft: { label: 'مسودة', className: 'bg-slate-200 text-slate-600' },
  pending: { label: 'بانتظار الدفع', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'مدفوعة', className: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'فشل الدفع', className: 'bg-rose-100 text-rose-700' },
  refunded: { label: 'مستردة', className: 'bg-indigo-100 text-indigo-700' },
  expired: { label: 'منتهية', className: 'bg-slate-200 text-slate-500' },
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

/** حساب الأيام المتبقية للدفع (7 أيام من إنشاء الفاتورة) */
function getRemainingDays(createdAt?: string | null): number | null {
  if (!createdAt) return null
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return null
  const expiryDate = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

interface BillingHistoryTableProps {
  invoices: SubscriptionInvoiceRecord[]
  isLoading?: boolean
  page: number
  lastPage: number
  onPageChange?: (page: number) => void
}

export function BillingHistoryTable({ invoices, isLoading, page, lastPage, onPageChange }: BillingHistoryTableProps) {
  const initiatePayment = useInitiatePaymentMutation()

  const canPay = (invoice: SubscriptionInvoiceRecord) => {
    // Cannot pay expired, paid, or refunded invoices
    if (['expired', 'paid', 'refunded'].includes(invoice.status)) return false
    // Can pay if status is pending, draft, or failed
    if (!['pending', 'draft', 'failed'].includes(invoice.status)) return false
    // Check if invoice is older than 7 days (will be expired by backend soon)
    if (invoice.created_at) {
      const created = new Date(invoice.created_at)
      const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation > 7) return false
    }
    return true
  }

  const handlePay = (invoice: SubscriptionInvoiceRecord) => {
    // If there's a valid payment link, redirect directly
    if (invoice.payment_link_url && invoice.payment_expires_at) {
      const expiresAt = new Date(invoice.payment_expires_at)
      if (expiresAt > new Date()) {
        window.location.href = invoice.payment_link_url
        return
      }
    }
    // Otherwise, create new payment link
    initiatePayment.mutate(invoice.id)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/70 text-right">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">رقم الفاتورة</th>
              <th className="px-4 py-3">القيمة</th>
              <th className="px-4 py-3">الحالة</th>
              <th className="px-4 py-3">تاريخ الدفع</th>
              <th className="px-4 py-3">تاريخ الاستحقاق</th>
              <th className="px-4 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 text-sm text-slate-600">
            {invoices.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  لا توجد فواتير حالياً
                </td>
              </tr>
            ) : null}
            {invoices.map((invoice) => {
              const badge = STATUS_BADGES[invoice.status] ?? STATUS_BADGES.draft
              const showPayButton = canPay(invoice)
              const remainingDays = invoice.status === 'pending' ? getRemainingDays(invoice.created_at) : null
              const isUrgent = remainingDays !== null && remainingDays <= 2

              return (
                <tr key={invoice.id} className="transition hover:bg-emerald-50/30">
                  <td className="px-4 py-3 font-semibold text-slate-800">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={clsx('inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold', badge.className)}>
                        {badge.label}
                      </span>
                      {/* تحذير المدة المتبقية للدفع */}
                      {remainingDays !== null && remainingDays > 0 && (
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-[10px]',
                          isUrgent ? 'text-rose-600 font-semibold' : 'text-amber-600'
                        )}>
                          {isUrgent ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          متبقي {remainingDays} {remainingDays === 1 ? 'يوم' : 'أيام'} للدفع
                        </span>
                      )}
                      {remainingDays !== null && remainingDays <= 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          تجاوزت مهلة الدفع
                        </span>
                      )}
                      {invoice.status === 'expired' && (
                        <span className="text-[10px] text-slate-400">لم يتم الدفع في المهلة المحددة</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {invoice.paid_at ? (
                      <span className="text-emerald-600 font-medium">{formatDate(invoice.paid_at)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.due_date)}</td>
                  <td className="px-4 py-3">
                    {showPayButton ? (
                      <button
                        type="button"
                        onClick={() => handlePay(invoice)}
                        disabled={initiatePayment.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {initiatePayment.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        ادفع الآن
                      </button>
                    ) : invoice.status === 'paid' ? (
                      <span className="text-xs text-emerald-600">✓ تم الدفع</span>
                    ) : invoice.status === 'expired' ? (
                      <span className="text-xs text-slate-400">انتهت المهلة</span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
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

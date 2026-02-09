import { useEffect, useMemo, useState } from 'react'
import { useChangeSubscriptionPlanMutation, useSubscriptionInvoicesQuery, useSubscriptionSummaryQuery } from '../hooks'
import { SubscriptionStatusIndicator } from '../components/subscription-status-indicator'
import { PlanCard } from '../components/plan-card'
import { BillingHistoryTable } from '../components/billing-history-table'
import type { BillingCycle, SubscriptionPlanRecord } from '../types'
import clsx from 'classnames'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { differenceInDays, parseISO } from 'date-fns'

const STATUS_FILTERS: Array<{ value?: string; label: string }> = [
  { value: undefined, label: 'جميع الحالات' },
  { value: 'pending', label: 'بانتظار الدفع' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'failed', label: 'فشل الدفع' },
  { value: 'draft', label: 'مسودة' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** حساب تقريبي للخصم من الاشتراك الحالي (proration) */
function estimateCredit(
  currentPrice: number,
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): number {
  if (!currentPrice || currentPrice <= 0 || !startsAt || !endsAt) return 0
  try {
    const start = parseISO(startsAt)
    const end = parseISO(endsAt)
    const now = new Date()
    const totalDays = differenceInDays(end, start)
    const remainingDays = differenceInDays(end, now)
    if (totalDays <= 0 || remainingDays <= 0) return 0
    return Math.round((remainingDays / totalDays) * currentPrice)
  } catch {
    return 0
  }
}

export function AdminSubscriptionPage() {
  const { data, isLoading, isError, error } = useSubscriptionSummaryQuery()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
  const changePlanMutation = useChangeSubscriptionPlanMutation()

  const [invoiceStatus, setInvoiceStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const invoicesQuery = useSubscriptionInvoicesQuery({ status: invoiceStatus, page })

  // حوار التأكيد
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlanRecord | null>(null)

  const currentPlanCode = data?.school.plan ?? ''
  const currentBillingCycle = data?.current_subscription?.billing_cycle ?? null
  const plans = data?.available_plans ?? []
  const currentSubscription = data?.current_subscription ?? null

  const sortedPlans = useMemo(() => plans.slice().sort((a, b) => a.monthly_price - b.monthly_price), [plans])

  useEffect(() => {
    if (currentSubscription?.billing_cycle && currentSubscription.billing_cycle !== billingCycle) {
      setBillingCycle(currentSubscription.billing_cycle)
    }
  }, [currentSubscription?.billing_cycle])

  // حساب تفاصيل السعر للحوار
  const confirmationPricing = useMemo(() => {
    if (!pendingPlan) return null
    const basePrice = billingCycle === 'yearly'
      ? (pendingPlan.yearly_price ?? pendingPlan.monthly_price)
      : pendingPlan.monthly_price
    const credit = estimateCredit(
      currentSubscription?.price ?? 0,
      currentSubscription?.starts_at,
      currentSubscription?.ends_at,
    )
    const afterCredit = Math.max(0, basePrice - credit)
    const tax = Math.round(afterCredit * 0.15)
    const total = afterCredit + tax
    return { basePrice, credit, afterCredit, tax, total }
  }, [pendingPlan, billingCycle, currentSubscription])

  const handlePlanAction = (plan: SubscriptionPlanRecord) => {
    if (changePlanMutation.isPending) return
    setPendingPlan(plan)
  }

  const handleConfirmChange = () => {
    if (!pendingPlan || !billingCycle || changePlanMutation.isPending) return
    changePlanMutation.mutate(
      { plan_code: pendingPlan.code, billing_cycle: billingCycle },
      { onSettled: () => setPendingPlan(null) },
    )
  }

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">إدارة الاشتراك والفوترة</h1>
        <p className="text-sm text-muted">
          تابع حالة الاشتراك الحالية، قم بالترقية أو التبديل بين الباقات، واستعرض سجلات الفواتير والمدفوعات للمدرسة.
        </p>
      </header>

      {isLoading ? <div className="glass-card text-center text-muted">جاري تحميل بيانات الاشتراك...</div> : null}
      {isError ? <div className="glass-card text-center text-rose-600">{error instanceof Error ? error.message : 'تعذر تحميل البيانات'}</div> : null}

      {data ? (
        <div className="space-y-6">
          <SubscriptionStatusIndicator
            plan={data.school.plan}
            status={data.school.subscription_status}
            nextBillingAt={data.school.next_billing_at}
            trialEndsAt={currentSubscription?.trial_ends_at}
            endsAt={currentSubscription?.ends_at}
          />

          <div className="glass-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">الباقات المتاحة</h2>
                <p className="text-xs text-muted">يمكنك ترقية أو تخفيض الباقة في أي وقت، دون فقدان البيانات.</p>
              </div>
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50/60 p-1 text-xs font-semibold text-emerald-700">
                {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={clsx(
                      'rounded-full px-4 py-1 transition',
                      billingCycle === cycle ? 'bg-emerald-500 text-white' : 'text-emerald-700',
                    )}
                  >
                    {cycle === 'monthly' ? 'شهري' : 'سنوي'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedPlans.map((plan) => {
                const isSamePlan = plan.code === currentPlanCode
                const isSameCycle = billingCycle === currentBillingCycle
                const isExactCurrent = isSamePlan && isSameCycle

                let actionLabel: string
                if (isSamePlan && !isSameCycle) {
                  actionLabel = billingCycle === 'yearly' ? 'التبديل للسنوي' : 'التبديل للشهري'
                } else {
                  actionLabel = billingCycle === 'monthly' ? 'اختر الباقة الشهرية' : 'اختر الباقة السنوية'
                }

                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billingCycle={billingCycle}
                    highlight={plan.code === 'premium'}
                    current={isExactCurrent}
                    onAction={handlePlanAction}
                    actionLabel={actionLabel}
                    disabled={changePlanMutation.isPending}
                    badge={isSamePlan ? 'خطة المدرسة الحالية' : undefined}
                  />
                )
              })}
            </div>
          </div>

          <div className="glass-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">سجل الفواتير</h2>
                <p className="text-xs text-muted">تابع الفواتير الصادرة ونتائج الدفع لكل فترة اشتراك.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <span className="text-muted">تصفية حسب الحالة</span>
                  <select
                    value={invoiceStatus ?? ''}
                    onChange={(event) => {
                      setInvoiceStatus(event.target.value || undefined)
                      setPage(1)
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    {STATUS_FILTERS.map((filter) => (
                      <option key={filter.label} value={filter.value ?? ''}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <BillingHistoryTable
              invoices={invoicesQuery.data?.data ?? []}
              isLoading={invoicesQuery.isLoading}
              page={invoicesQuery.data?.meta.current_page ?? page}
              lastPage={invoicesQuery.data?.meta.last_page ?? 1}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        </div>
      ) : null}

      {/* حوار تأكيد تغيير الباقة */}
      <Dialog open={!!pendingPlan} onOpenChange={(open) => { if (!open) setPendingPlan(null) }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تأكيد تغيير الباقة</DialogTitle>
            <DialogDescription>
              أنت على وشك الاشتراك في باقة <strong>{pendingPlan?.name}</strong> ({billingCycle === 'monthly' ? 'شهري' : 'سنوي'})
            </DialogDescription>
          </DialogHeader>

          {confirmationPricing && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">سعر الباقة</span>
                <span className="font-semibold text-slate-900">{formatCurrency(confirmationPricing.basePrice)}</span>
              </div>
              {confirmationPricing.credit > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>خصم المتبقي من اشتراكك الحالي</span>
                  <span className="font-semibold">- {formatCurrency(confirmationPricing.credit)}</span>
                </div>
              )}
              {confirmationPricing.credit > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-600">بعد الخصم</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(confirmationPricing.afterCredit)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ضريبة القيمة المضافة (15%)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(confirmationPricing.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-900">الإجمالي</span>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(confirmationPricing.total)}</span>
              </div>
              {confirmationPricing.credit > 0 && (
                <p className="text-xs text-slate-500">
                  * الخصم تقديري وسيُحسب بدقة من الخادم عند إنشاء الفاتورة.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirmChange}
              disabled={changePlanMutation.isPending}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {changePlanMutation.isPending ? 'جاري المعالجة...' : 'تأكيد والمتابعة للدفع'}
            </button>
            <button
              type="button"
              onClick={() => setPendingPlan(null)}
              disabled={changePlanMutation.isPending}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

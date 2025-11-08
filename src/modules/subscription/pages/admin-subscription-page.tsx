import { useEffect, useMemo, useState } from 'react'
import { useChangeSubscriptionPlanMutation, useSubscriptionInvoicesQuery, useSubscriptionSummaryQuery } from '../hooks'
import { SubscriptionStatusIndicator } from '../components/subscription-status-indicator'
import { PlanCard } from '../components/plan-card'
import { BillingHistoryTable } from '../components/billing-history-table'
import type { BillingCycle } from '../types'
import clsx from 'classnames'

const STATUS_FILTERS: Array<{ value?: string; label: string }> = [
  { value: undefined, label: 'جميع الحالات' },
  { value: 'pending', label: 'بانتظار الدفع' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'failed', label: 'فشل الدفع' },
  { value: 'draft', label: 'مسودة' },
]

export function AdminSubscriptionPage() {
  const { data, isLoading, isError, error } = useSubscriptionSummaryQuery()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
  const changePlanMutation = useChangeSubscriptionPlanMutation()

  const [invoiceStatus, setInvoiceStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const invoicesQuery = useSubscriptionInvoicesQuery({ status: invoiceStatus, page })

  const currentPlanCode = data?.school.plan ?? ''
  const plans = data?.available_plans ?? []
  const currentSubscription = data?.current_subscription ?? null

  const sortedPlans = useMemo(() => plans.slice().sort((a, b) => a.monthly_price - b.monthly_price), [plans])

  useEffect(() => {
    if (currentSubscription?.billing_cycle && currentSubscription.billing_cycle !== billingCycle) {
      setBillingCycle(currentSubscription.billing_cycle)
    }
  }, [currentSubscription?.billing_cycle])

  const handlePlanChange = (planCode: string) => {
    if (!billingCycle || changePlanMutation.isPending) return
    changePlanMutation.mutate({ plan_code: planCode, billing_cycle: billingCycle })
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
              {sortedPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  highlight={plan.code === 'premium'}
                  current={plan.code === currentPlanCode}
                  onAction={(selected) => handlePlanChange(selected.code)}
                  actionLabel={billingCycle === 'monthly' ? 'اختر الباقة الشهرية' : 'اختر الباقة السنوية'}
                  disabled={changePlanMutation.isPending}
                  badge={plan.code === currentPlanCode ? 'خطة المدرسة الحالية' : undefined}
                />
              ))}
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
    </section>
  )
}

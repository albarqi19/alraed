import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  LayoutGrid,
  Receipt,
  ReceiptText,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Timer,
  Wallet,
  X,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  type Tone,
} from '@/shared/workspace'
import { useChangeSubscriptionPlanMutation, useSubscriptionInvoicesQuery, useSubscriptionSummaryQuery } from '../hooks'
import { PlanCard } from '../components/plan-card'
import { BillingHistoryTable } from '../components/billing-history-table'
import type { BillingCycle, SubscriptionPlanRecord } from '../types'

const STATUS_FILTERS: Array<{ value?: string; label: string }> = [
  { value: undefined, label: 'جميع الحالات' },
  { value: 'pending', label: 'بانتظار الدفع' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'failed', label: 'فشل الدفع' },
  { value: 'draft', label: 'مسودة' },
]

/* خريطة حالة الاشتراك — كل لون بمعنى واحد */
const SUB_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'نشط', tone: TONES.green },
  trial: { label: 'تجريبي', tone: TONES.sky },
  trialing: { label: 'تجريبي', tone: TONES.sky },
  past_due: { label: 'متأخر السداد', tone: TONES.red },
  pending: { label: 'بانتظار الدفع', tone: TONES.amber },
  cancelled: { label: 'ملغى', tone: TONES.gray },
  canceled: { label: 'ملغى', tone: TONES.gray },
  expired: { label: 'منتهٍ', tone: TONES.red },
  suspended: { label: 'موقوف', tone: TONES.red },
}

const subStatusMeta = (status?: string | null) =>
  SUB_STATUS_META[status ?? ''] ?? { label: status || 'غير محدد', tone: TONES.gray }

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-SA-u-nu-latn', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return value
  }
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
  const { data, isLoading, isError, error, refetch } = useSubscriptionSummaryQuery()
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly')
  const changePlanMutation = useChangeSubscriptionPlanMutation()

  const [invoiceStatus, setInvoiceStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const invoicesQuery = useSubscriptionInvoicesQuery({ status: invoiceStatus, page })

  // حوار التأكيد
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlanRecord | null>(null)
  const [matrixOpen, setMatrixOpen] = useState(false)

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

  /* ── مشتقات العرض ── */
  const statusMeta = subStatusMeta(data?.school.subscription_status)
  /* اسم الباقة بالعربية — كان plan.toUpperCase() يعرض «PREMIUM» بينما الكائن العربي واصل */
  const planName =
    currentSubscription?.plan?.name ??
    plans.find((p) => p.code === currentPlanCode)?.name ??
    currentPlanCode

  const daysLeft = currentSubscription?.ends_at
    ? differenceInDays(parseISO(currentSubscription.ends_at), new Date())
    : null
  const isTrial = Boolean(currentSubscription?.trial_ends_at)
  const trialDaysLeft = currentSubscription?.trial_ends_at
    ? differenceInDays(parseISO(currentSubscription.trial_ends_at), new Date())
    : null

  /* ★ شريط المدة المدفوعة: نسبة ما مضى من الفترة التي دفعتَ ثمنها */
  const term = useMemo(() => {
    const start = currentSubscription?.starts_at
    const end = currentSubscription?.ends_at
    if (!start || !end) return null
    try {
      const s = parseISO(start).getTime()
      const e = parseISO(end).getTime()
      const now = Date.now()
      const total = e - s
      if (total <= 0) return null
      const elapsed = Math.min(total, Math.max(0, now - s))
      const pct = (elapsed / total) * 100
      const trialEnd = currentSubscription?.trial_ends_at ? parseISO(currentSubscription.trial_ends_at).getTime() : null
      const trialPct = trialEnd && trialEnd > s && trialEnd <= e ? ((trialEnd - s) / total) * 100 : null
      return { start: s, end: e, pct, trialPct, totalDays: Math.round(total / 86_400_000) }
    } catch {
      return null
    }
  }, [currentSubscription])

  const cyclePrice = currentSubscription?.price ?? 0
  const cycleLabel = currentBillingCycle === 'yearly' ? 'سنوياً' : currentBillingCycle === 'monthly' ? 'شهرياً' : ''

  return (
    <WsPage>
      <WsHeader
        title="الاشتراك والفوترة"
        badge={planName || undefined}
        actions={
          <>
            <WsIconBtn
              icon={RotateCw}
              label="تحديث"
              onClick={() => { refetch(); invoicesQuery.refetch() }}
            />
            <WsBtn variant="primary" icon={LayoutGrid} onClick={() => setMatrixOpen(true)}>
              تغيير الباقة
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ShieldCheck} label="الحالة">
              <span style={{ color: statusMeta.tone.tx }}>{statusMeta.label}</span>
            </WsFact>
            {cyclePrice > 0 && (
              <WsFact icon={Wallet} label="القيمة الدورية">
                {formatCurrency(cyclePrice)} {cycleLabel && `/ ${cycleLabel}`}
              </WsFact>
            )}
            <WsFact icon={RefreshCw} label="التجديد">
              <span style={{ color: currentSubscription?.auto_renew ? TONES.green.tx : TONES.amber.tx }}>
                {currentSubscription?.auto_renew ? 'تلقائي' : 'يدوي'}
              </span>
            </WsFact>
            {data?.school.next_billing_at && (
              <WsFact icon={CalendarClock} label="الفاتورة القادمة">{formatDate(data.school.next_billing_at)}</WsFact>
            )}
            {daysLeft != null && (
              <WsFact icon={Timer} label="ينتهي في">
                <span style={{ color: daysLeft <= 7 ? TONES.red.tx : daysLeft <= 30 ? TONES.amber.tx : undefined }}>
                  {daysLeft > 0 ? `بعد ${daysLeft} يوم` : 'انتهى'}
                </span>
              </WsFact>
            )}
            <WsFact icon={Receipt} label="الفواتير">{invoicesQuery.data?.meta.total ?? 0}</WsFact>
          </>
        }
      />

      {/* شريط المهلة — الحقيقة التي لا تحتمل التأجيل */}
      {isTrial && trialDaysLeft != null && trialDaysLeft >= 0 && (
        <WsToolbar>
          <WsAlert tone={trialDaysLeft <= 3 ? 'warn' : 'info'} boxed style={{ width: '100%' }}>
            الفترة التجريبية تنتهي {trialDaysLeft === 0 ? 'اليوم' : `بعد ${trialDaysLeft} يوم`} — اختر باقة قبل التوقف
          </WsAlert>
        </WsToolbar>
      )}
      {!isTrial && daysLeft != null && daysLeft <= 7 && daysLeft >= 0 && (
        <WsToolbar>
          <WsAlert tone="warn" boxed style={{ width: '100%' }}>
            اشتراكك ينتهي {daysLeft === 0 ? 'اليوم' : `بعد ${daysLeft} يوم`}
            {currentSubscription?.auto_renew ? ' — سيُجدَّد تلقائياً' : ' — التجديد يدوي، جدّد قبل التوقف'}
          </WsAlert>
        </WsToolbar>
      )}

      <WsToolbar>
        <WsField label="حالة الفاتورة">
          <div className="ws-seg">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={`ws-seg__btn ${(invoiceStatus ?? '') === (filter.value ?? '') ? 'is-active' : ''}`}
                onClick={() => { setInvoiceStatus(filter.value); setPage(1) }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </WsField>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {isLoading ? (
            <WsBlock fill><WsEmpty loading>جاري تحميل بيانات الاشتراك...</WsEmpty></WsBlock>
          ) : isError ? (
            <WsBlock fill padded>
              <WsAlert tone="error" boxed>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {error instanceof Error ? error.message : 'تعذر تحميل البيانات'}
                  <WsBtn size="sm" icon={RotateCw} onClick={() => refetch()}>إعادة المحاولة</WsBtn>
                </span>
              </WsAlert>
            </WsBlock>
          ) : (
            <>
              {/* ★ شريط المدة المدفوعة — أين أنت من الفترة التي دفعتَ ثمنها */}
              {term && (
                <WsBlock padded>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span className="ws-label" style={{ margin: 0 }}>المدة المدفوعة</span>
                    <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                      {term.totalDays} يوم · مضى {Math.round(term.pct)}%
                    </span>
                  </div>

                  <div style={{ position: 'relative', height: 16, borderRadius: 8, background: TONES.gray.bg, border: `1px solid ${TONES.gray.bd}`, overflow: 'hidden' }}>
                    {/* الجزء المستهلك */}
                    <span
                      style={{
                        position: 'absolute',
                        insetInlineStart: 0,
                        top: 0,
                        bottom: 0,
                        width: `${term.pct}%`,
                        background: daysLeft != null && daysLeft <= 7 ? TONES.red.bg : TONES.green.bg,
                        borderInlineEnd: `2px solid ${daysLeft != null && daysLeft <= 7 ? TONES.red.tx : TONES.green.tx}`,
                      }}
                    />
                    {/* حدّ الفترة التجريبية إن وجدت */}
                    {term.trialPct != null && (
                      <span
                        title="نهاية الفترة التجريبية"
                        style={{
                          position: 'absolute',
                          insetInlineStart: `${term.trialPct}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: TONES.sky.tx,
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {/* علامة «الآن» */}
                    <span
                      className="ws-soft-pulse"
                      style={{
                        position: 'absolute',
                        insetInlineStart: `calc(${term.pct}% - 4px)`,
                        top: 2,
                        bottom: 2,
                        width: 8,
                        borderRadius: 4,
                        background: daysLeft != null && daysLeft <= 7 ? TONES.red.tx : TONES.green.tx,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    <span>{formatDate(currentSubscription?.starts_at)}</span>
                    {daysLeft != null && (
                      <span style={{ fontWeight: 700, color: daysLeft <= 7 ? TONES.red.tx : daysLeft <= 30 ? TONES.amber.tx : 'var(--ws-text-2)' }}>
                        {daysLeft > 0 ? `باقٍ ${daysLeft} يوم` : 'انتهت المدة'}
                      </span>
                    )}
                    <span>{formatDate(currentSubscription?.ends_at)}</span>
                  </div>
                </WsBlock>
              )}

              <WsBlock
                fill
                scroll
                title="سجل الفواتير"
                icon={ReceiptText}
                count={invoicesQuery.data?.meta.total ?? 0}
              >
                <div style={{ padding: 12 }}>
                  <BillingHistoryTable
                    invoices={invoicesQuery.data?.data ?? []}
                    isLoading={invoicesQuery.isLoading}
                    page={invoicesQuery.data?.meta.current_page ?? page}
                    lastPage={invoicesQuery.data?.meta.last_page ?? 1}
                    onPageChange={(nextPage) => setPage(nextPage)}
                  />
                </div>
              </WsBlock>
            </>
          )}
        </WsMain>

        {/* بطاقة الاشتراك الحالي */}
        {data && (
          <WsSideCol side="end" title="اشتراكك" icon={ShieldCheck} storageKey="ws:subscription:sidecol" width={310}>
            <WsBlock padded>
              <div
                style={{
                  border: `1px solid ${statusMeta.tone.bd}`,
                  background: statusMeta.tone.bg,
                  borderRadius: 10,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: statusMeta.tone.tx }}>{planName}</p>
                <div style={{ marginTop: 5 }}>
                  <ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip>
                </div>
                {cyclePrice > 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: statusMeta.tone.tx }}>
                    <b style={{ fontSize: 16 }}>{formatCurrency(cyclePrice)}</b>
                    {cycleLabel && <span style={{ fontSize: 10.5 }}> / {cycleLabel}</span>}
                  </p>
                )}
              </div>
            </WsBlock>

            <WsBlock title="التفاصيل" icon={Receipt} padded fill scroll>
              <WsFactsList>
                <WsFactRow label="الباقة">{planName}</WsFactRow>
                <WsFactRow label="دورة الفوترة">
                  {currentBillingCycle === 'yearly' ? 'سنوية' : currentBillingCycle === 'monthly' ? 'شهرية' : '—'}
                </WsFactRow>
                <WsFactRow label="التجديد التلقائي">
                  <ToneChip tone={currentSubscription?.auto_renew ? TONES.green : TONES.amber}>
                    {currentSubscription?.auto_renew ? 'مفعّل' : 'معطّل'}
                  </ToneChip>
                </WsFactRow>
                <WsFactRow label="بداية الفترة">{formatDate(currentSubscription?.starts_at)}</WsFactRow>
                <WsFactRow label="نهاية الفترة">{formatDate(currentSubscription?.ends_at)}</WsFactRow>
                {currentSubscription?.trial_ends_at && (
                  <WsFactRow label="انتهاء التجربة">{formatDate(currentSubscription.trial_ends_at)}</WsFactRow>
                )}
                {data.school.next_billing_at && (
                  <WsFactRow label="الفاتورة القادمة">{formatDate(data.school.next_billing_at)}</WsFactRow>
                )}
              </WsFactsList>

              <WsBtn
                variant="primary"
                icon={LayoutGrid}
                onClick={() => setMatrixOpen(true)}
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              >
                تغيير الباقة
              </WsBtn>
              <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.7, textAlign: 'center' }}>
                الترقية أو التخفيض في أي وقت دون فقدان البيانات
              </p>
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>

      {/* مودال الباقات — نادر ومركّز فيستحق حجب الشاشة */}
      {matrixOpen && (
        <div className="ws-modal" onClick={() => setMatrixOpen(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 1000 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">الباقات المتاحة</h3>
                  <p className="ws-modal__sub">يمكنك ترقية أو تخفيض الباقة في أي وقت، دون فقدان البيانات</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <div className="ws-seg">
                    {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        className={`ws-seg__btn ${billingCycle === cycle ? 'is-active' : ''}`}
                        onClick={() => setBillingCycle(cycle)}
                      >
                        {cycle === 'monthly' ? 'شهري' : 'سنوي'}
                      </button>
                    ))}
                  </div>
                  <WsIconBtn icon={X} label="إغلاق" onClick={() => setMatrixOpen(false)} />
                </span>
              </div>
            </header>

            <div className="ws-modal__body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
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
          </div>
        </div>
      )}

      {/* حوار تأكيد تغيير الباقة */}
      {pendingPlan && (
        <div className="ws-modal" style={{ zIndex: 60 }} onClick={() => !changePlanMutation.isPending && setPendingPlan(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">تأكيد تغيير الباقة</h3>
              <p className="ws-modal__sub">
                أنت على وشك الاشتراك في باقة <b>{pendingPlan.name}</b> ({billingCycle === 'monthly' ? 'شهري' : 'سنوي'})
              </p>
            </header>

            {confirmationPricing && (
              <div className="ws-modal__body">
                <div style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Row label="سعر الباقة" value={formatCurrency(confirmationPricing.basePrice)} />
                  {confirmationPricing.credit > 0 && (
                    <>
                      <Row
                        label="خصم المتبقي من اشتراكك الحالي"
                        value={`- ${formatCurrency(confirmationPricing.credit)}`}
                        tone={TONES.green}
                      />
                      <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 7 }}>
                        <Row label="بعد الخصم" value={formatCurrency(confirmationPricing.afterCredit)} />
                      </div>
                    </>
                  )}
                  <Row label="ضريبة القيمة المضافة (15%)" value={formatCurrency(confirmationPricing.tax)} />
                  <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 7 }}>
                    <Row label="الإجمالي" value={formatCurrency(confirmationPricing.total)} bold tone={TONES.green} />
                  </div>
                  {confirmationPricing.credit > 0 && (
                    <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                      * الخصم تقديري وسيُحسب بدقة من الخادم عند إنشاء الفاتورة.
                    </p>
                  )}
                </div>
              </div>
            )}

            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setPendingPlan(null)} disabled={changePlanMutation.isPending}>إلغاء</WsBtn>
              <WsBtn variant="primary" icon={Wallet} onClick={handleConfirmChange} disabled={changePlanMutation.isPending}>
                {changePlanMutation.isPending ? 'جاري المعالجة...' : 'تأكيد والمتابعة للدفع'}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: Tone; bold?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
      <span style={{ color: tone?.tx ?? 'var(--ws-text-2)', fontWeight: bold ? 800 : 400 }}>{label}</span>
      <b style={{ fontSize: bold ? 14 : 12, color: tone?.tx ?? 'var(--ws-text)' }}>{value}</b>
    </span>
  )
}

import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  BillingCycle,
  ChangePlanResponse,
  InitiatePaymentResponse,
  PaymentStatusResponse,
  PublicSubscriptionPlansPayload,
  RegisterSchoolPayload,
  RegisterSchoolResponse,
  SchoolSubscriptionInfo,
  SubscriptionInvoiceRecord,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionSummaryPayload,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function normalizePlan(raw: unknown): SubscriptionPlanRecord | null {
  if (!isRecord(raw)) return null

  const id = coerceNumber(raw.id, NaN)
  const name = typeof raw.name === 'string' ? raw.name : null
  const code = typeof raw.code === 'string' ? raw.code : null

  if (!Number.isFinite(id) || !name || !code) return null

  return {
    id,
    name,
    code,
    description: typeof raw.description === 'string' ? raw.description : null,
    monthly_price: coerceNumber(raw.monthly_price, 0),
    yearly_price: Number.isFinite(coerceNumber(raw.yearly_price, NaN)) ? coerceNumber(raw.yearly_price, NaN) : null,
    student_limit: Number.isFinite(coerceNumber(raw.student_limit, NaN)) ? coerceNumber(raw.student_limit, NaN) : null,
    teacher_limit: Number.isFinite(coerceNumber(raw.teacher_limit, NaN)) ? coerceNumber(raw.teacher_limit, NaN) : null,
    storage_limit_mb: Number.isFinite(coerceNumber(raw.storage_limit_mb, NaN))
      ? coerceNumber(raw.storage_limit_mb, NaN)
      : null,
    features: isRecord(raw.features) ? (raw.features as SubscriptionPlanRecord['features']) : null,
    is_active: Boolean(raw.is_active ?? true),
  }
}

function normalizeSchool(raw: unknown): SchoolSubscriptionInfo | null {
  if (!isRecord(raw)) return null

  const id = coerceNumber(raw.id, NaN)
  const name = typeof raw.name === 'string' ? raw.name : null
  const plan = typeof raw.plan === 'string' ? raw.plan : 'trial'
  const status = typeof raw.status === 'string' ? raw.status : 'active'
  const subscriptionStatus = typeof raw.subscription_status === 'string' ? raw.subscription_status : 'active'

  if (!Number.isFinite(id) || !name) return null

  return {
    id,
    name,
    plan,
    status,
    subscription_status: subscriptionStatus,
    next_billing_at: typeof raw.next_billing_at === 'string' ? raw.next_billing_at : null,
    features: isRecord(raw.features) ? (raw.features as SchoolSubscriptionInfo['features']) : null,
  }
}

function normalizeSubscription(raw: unknown): SubscriptionRecord | null {
  if (!isRecord(raw)) return null

  const id = coerceNumber(raw.id, NaN)

  if (!Number.isFinite(id)) return null

  const billingCycle =
    raw.billing_cycle === 'monthly' || raw.billing_cycle === 'yearly'
      ? (raw.billing_cycle as BillingCycle)
      : 'monthly'

  return {
    id,
    status:
      typeof raw.status === 'string'
        ? (raw.status as SubscriptionRecord['status'])
        : 'active',
    billing_cycle: billingCycle,
    price: coerceNumber(raw.price, 0),
    currency: typeof raw.currency === 'string' ? raw.currency : 'SAR',
    auto_renew: Boolean(raw.auto_renew),
    starts_at: typeof raw.starts_at === 'string' ? raw.starts_at : null,
    ends_at: typeof raw.ends_at === 'string' ? raw.ends_at : null,
    trial_ends_at: typeof raw.trial_ends_at === 'string' ? raw.trial_ends_at : null,
    plan: normalizePlan(raw.plan) ?? null,
  }
}

function normalizeInvoice(raw: unknown): SubscriptionInvoiceRecord | null {
  if (!isRecord(raw)) return null

  const id = coerceNumber(raw.id, NaN)
  const subscriptionId = coerceNumber(raw.subscription_id, NaN)
  const invoiceNumber = typeof raw.invoice_number === 'string' ? raw.invoice_number : null

  if (!Number.isFinite(id) || !Number.isFinite(subscriptionId) || !invoiceNumber) {
    return null
  }

  const status =
    raw.status === 'draft' ||
    raw.status === 'pending' ||
    raw.status === 'paid' ||
    raw.status === 'failed' ||
    raw.status === 'refunded'
      ? raw.status
      : 'pending'

  return {
    id,
    subscription_id: subscriptionId,
    invoice_number: invoiceNumber,
    subtotal: coerceNumber(raw.subtotal, 0),
    tax: coerceNumber(raw.tax, 0),
    total: coerceNumber(raw.total, 0),
    currency: typeof raw.currency === 'string' ? raw.currency : 'SAR',
    status,
    billing_period_start: typeof raw.billing_period_start === 'string' ? raw.billing_period_start : null,
    billing_period_end: typeof raw.billing_period_end === 'string' ? raw.billing_period_end : null,
    due_date: typeof raw.due_date === 'string' ? raw.due_date : null,
    paid_at: typeof raw.paid_at === 'string' ? raw.paid_at : null,
    payment_reference: typeof raw.payment_reference === 'string' ? raw.payment_reference : null,
    payment_gateway: typeof raw.payment_gateway === 'string' ? raw.payment_gateway : null,
    payment_link_url: typeof raw.payment_link_url === 'string' ? raw.payment_link_url : null,
    payment_expires_at: typeof raw.payment_expires_at === 'string' ? raw.payment_expires_at : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

export async function fetchPublicSubscriptionPlans() {
  const { data } = await apiClient.get<ApiResponse<PublicSubscriptionPlansPayload>>('/public/subscription-plans')

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الباقات')
  }

  const rawPayload = data.data
  const plansSource = isRecord(rawPayload) && Array.isArray(rawPayload.plans) ? rawPayload.plans : []
  const faqs = isRecord(rawPayload) && Array.isArray(rawPayload.faqs)
    ? rawPayload.faqs.filter((faq): faq is { question: string; answer: string } =>
        isRecord(faq) && typeof faq.question === 'string' && typeof faq.answer === 'string',
      )
    : []

  const plans = plansSource
    .map((plan) => normalizePlan(plan))
    .filter((plan): plan is SubscriptionPlanRecord => plan !== null)

  return {
    plans,
    faqs,
  }
}

export async function registerSchool(payload: RegisterSchoolPayload) {
  const { data } = await apiClient.post<ApiResponse<RegisterSchoolResponse>>('/public/schools/register', payload)

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تسجيل المدرسة')
  }

  return data.data
}

export async function fetchSubscriptionSummary() {
  const { data } = await apiClient.get<ApiResponse<SubscriptionSummaryPayload>>('/admin/subscription/summary')

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل بيانات الاشتراك')
  }

  const payload = data.data
  const school = normalizeSchool(isRecord(payload) ? payload.school : null)
  const subscription = normalizeSubscription(isRecord(payload) ? payload.current_subscription : null)
  const plans = isRecord(payload) && Array.isArray(payload.available_plans)
    ? payload.available_plans
        .map((plan) => normalizePlan(plan))
        .filter((plan): plan is SubscriptionPlanRecord => plan !== null)
    : []

  if (!school) {
    throw new Error('استجابة غير صالحة من الخادم لبيانات المدرسة')
  }

  return {
    school,
    current_subscription: subscription,
    available_plans: plans,
  }
}

export async function changeSubscriptionPlan(payload: { plan_code: string; billing_cycle: BillingCycle; auto_pay?: boolean }): Promise<ChangePlanResponse> {
  const { data } = await apiClient.post<ApiResponse<{
    subscription: unknown
    invoice: unknown
    payment_url: string | null
  }>>(
    '/admin/subscription/change-plan',
    { ...payload, auto_pay: payload.auto_pay ?? true },
  )

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحديث الخطة')
  }

  const subscription = normalizeSubscription(data.data.subscription)
  if (!subscription) {
    throw new Error('استجابة غير صالحة من الخادم')
  }

  return {
    subscription,
    invoice: normalizeInvoice(data.data.invoice),
    payment_url: data.data.payment_url ?? null,
  }
}

export interface SubscriptionInvoicesResult {
  data: SubscriptionInvoiceRecord[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export async function fetchSubscriptionInvoices(params?: { status?: string; page?: number }) {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/subscription/invoices', { params })

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الفواتير')
  }

  const payload = isRecord(data.data) ? data.data : {}

  const invoicesSource = Array.isArray(payload.data) ? payload.data : []
  const invoices = invoicesSource
    .map((invoice) => normalizeInvoice(invoice))
    .filter((invoice): invoice is SubscriptionInvoiceRecord => invoice !== null)

  const meta = {
    current_page: coerceNumber(payload.current_page, 1),
    last_page: coerceNumber(payload.last_page, 1),
    per_page: coerceNumber(payload.per_page, invoices.length || 15),
    total: coerceNumber(payload.total, invoices.length),
  }

  return {
    data: invoices,
    meta,
  }
}

export async function createSubscriptionInvoice(payload: {
  total: number
  tax?: number
  currency?: string
  billing_period_start?: string
  billing_period_end?: string
  due_date?: string
  status?: SubscriptionInvoiceRecord['status']
}) {
  const { data } = await apiClient.post<ApiResponse<SubscriptionInvoiceRecord>>('/admin/subscription/invoices', payload)

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إنشاء الفاتورة')
  }

  const invoice = normalizeInvoice(data.data)

  if (!invoice) {
    throw new Error('استجابة غير صالحة من الخادم عند إنشاء الفاتورة')
  }

  return invoice
}

/**
 * Initiate payment for a pending invoice
 */
export async function initiatePayment(invoiceId: number): Promise<InitiatePaymentResponse> {
  const { data } = await apiClient.post<ApiResponse<{
    payment_url: string
    invoice_id: number
    expires_at?: string | null
  }>>(`/admin/subscription/invoices/${invoiceId}/pay`)

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إنشاء رابط الدفع')
  }

  return {
    payment_url: data.data.payment_url,
    invoice_id: data.data.invoice_id,
    expires_at: data.data.expires_at ?? null,
  }
}

/**
 * Check payment status for an invoice
 */
export async function checkPaymentStatus(invoiceId: number): Promise<PaymentStatusResponse> {
  const { data } = await apiClient.get<ApiResponse<PaymentStatusResponse>>(
    `/admin/subscription/invoices/${invoiceId}/payment-status`
  )

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر التحقق من حالة الدفع')
  }

  return data.data
}

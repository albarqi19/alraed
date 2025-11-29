export type BillingCycle = 'monthly' | 'yearly'

export type SubscriptionLifecycleStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'

export interface SubscriptionPlanFeatureMap {
  [key: string]: boolean | number | string | null | undefined
}

export interface SubscriptionPlanRecord {
  id: number
  name: string
  code: string
  description?: string | null
  monthly_price: number
  yearly_price?: number | null
  student_limit?: number | null
  teacher_limit?: number | null
  storage_limit_mb?: number | null
  features?: SubscriptionPlanFeatureMap | null
  is_active: boolean
}

export interface SubscriptionRecord {
  id: number
  status: SubscriptionLifecycleStatus
  billing_cycle: BillingCycle
  price: number
  currency: string
  auto_renew: boolean
  starts_at?: string | null
  ends_at?: string | null
  trial_ends_at?: string | null
  plan?: SubscriptionPlanRecord | null
}

export interface SchoolSubscriptionInfo {
  id: number
  name: string
  status: string
  plan: string
  subscription_status: string
  next_billing_at?: string | null
  features?: SubscriptionPlanFeatureMap | null
}

export interface SubscriptionSummaryPayload {
  school: SchoolSubscriptionInfo
  current_subscription: SubscriptionRecord | null
  available_plans: SubscriptionPlanRecord[]
}

export interface SubscriptionInvoiceRecord {
  id: number
  subscription_id: number
  invoice_number: string
  subtotal: number
  tax: number
  total: number
  currency: string
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded'
  billing_period_start?: string | null
  billing_period_end?: string | null
  due_date?: string | null
  paid_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PublicSubscriptionPlansPayload {
  plans: SubscriptionPlanRecord[]
  faqs?: Array<{
    question: string
    answer: string
  }>
}

export interface RegisterSchoolPayload {
  school_name: string
  subdomain?: string | null
  school_level: 'elementary' | 'middle' | 'high'
  ministry_number?: string | null
  admin_name: string
  admin_national_id: string
  admin_phone: string
  admin_email?: string | null
  plan_code?: string | null
}

export interface RegisterSchoolResponse {
  school: {
    id: number
    name: string
    slug: string
    subdomain?: string | null
    plan: string
    trial_ends_at?: string | null
  }
  admin_credentials: {
    national_id: string
    password: string
  }
}

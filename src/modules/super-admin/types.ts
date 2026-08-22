export interface PlatformOverview {
  schools: {
    total: number
    active: number
    trial: number
    suspended: number
    new_last_30_days: number
  }
  subscriptions: {
    active: number
    expiring_soon: number
    monthly_recurring_revenue: number
  }
  revenue: {
    total: number
    this_month: number
  }
  top_plans: Array<{
    plan: string | null
    name: string | null
    schools: number
  }>
}

export interface PlatformPlanOption {
  id: number
  code: string
  name: string
}

export interface PlatformFiltersResponse {
  plans: PlatformPlanOption[]
  school_statuses: Array<{ value: string; label: string }>
  subscription_statuses: Array<{ value: string; label: string }>
}

export interface PlatformRevenueTrend {
  period: string
  label: string
  total: number
}

export interface PlatformInvoice {
  id: number
  invoice_number: string
  total: number
  status: string
  currency: string | null
  billing_period_start: string | null
  billing_period_end: string | null
  created_at: string | null
  school: {
    id: number
    name: string
    plan: string | null
    subscription_status: string | null
  } | null
  plan: {
    id: number
    name: string
    code: string
  } | null
}

export interface PlatformSchoolRow {
  id: number
  name: string
  subdomain: string | null
  domain: string | null
  admin_name: string | null
  admin_phone: string | null
  status: string | null
  subscription_status: string | null
  plan: {
    code: string | null
    name: string | null
  }
  trial_ends_at: string | null
  subscription_starts_at: string | null
  subscription_ends_at: string | null
  next_billing_at: string | null
  metrics: {
    total_paid_revenue: number
    active_subscriptions: number
  }
  subscription: {
    id: number
    status: string | null
    billing_cycle: string | null
    price: number | null
    currency: string | null
    auto_renew: boolean
    starts_at: string | null
    ends_at: string | null
    trial_ends_at: string | null
  } | null
}

export interface PlatformSchoolsResponse {
  items: PlatformSchoolRow[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  applied_filters: {
    search: string
    status: string | null
    plan: string | null
  }
}

/* ═══════ رموز الإحالة ═══════ */

export interface ReferralCode {
  id: number
  code: string
  owner_name: string
  owner_phone: string | null
  discount_percent: string | number
  discount_months: number
  is_active: boolean
  notes: string | null
  created_at: string
  /** كل المدارس المنسوبة للرمز، بما فيها المحذوفة. */
  schools_count: number
  /** المدارس القائمة وحدها — الفرق بينهما هو ما حُذف. */
  active_schools_count: number
  creator?: { id: number; name: string } | null
}

export interface ReferralCodesResponse {
  items: ReferralCode[]
  summary: { codes: number; active_codes: number; schools: number }
}

export interface ReferralSchool {
  id: number
  name: string
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  status: string | null
  subscription_status: string | null
  created_at: string
  referral_discount_percent: string | number | null
  referral_discount_ends_at: string | null
  discount_active: boolean
}

export interface ReferralCodePayload {
  code?: string
  owner_name?: string
  owner_phone?: string | null
  discount_percent?: number | null
  discount_months?: number | null
  is_active?: boolean
  notes?: string | null
}

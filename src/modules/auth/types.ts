export type UserRole =
  | 'teacher'
  | 'admin'
  | 'super_admin'
  | 'school_principal'
  | 'deputy_teachers'
  | 'deputy_students'
  | 'administrative_staff'
  | 'student_counselor'
  | 'learning_resources_admin'
  | 'health_counselor'

export type SubscriptionPlan = 'trial' | 'basic' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
export type SchoolStatus = 'active' | 'inactive' | 'suspended'

export interface SchoolSummary {
  id: number
  name: string
  slug: string
  subdomain?: string | null
  domain?: string | null
  plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  status: SchoolStatus
  trial_ends_at?: string | null
  subscription_starts_at?: string | null
  subscription_ends_at?: string | null
  features?: Record<string, unknown> | null
}

export interface AuthenticatedUser {
  id: number
  name: string
  national_id: string
  role: UserRole
  school_id?: number | null
  school?: SchoolSummary | null
  email?: string | null
  phone?: string | null
  needs_password_change?: boolean
  needs_onboarding?: boolean // هل يحتاج لإكمال إعداد المدرسة
  permissions?: string[] // صلاحيات بسيطة للفرونت
  permissions_simple?: string[] // نسخة بديلة
  detailed_permissions?: Array<{
    slug: string
    name?: string
    name_ar?: string
    is_enabled?: boolean
    actions?: string[]
  }> // صلاحيات تفصيلية للإضافات الخارجية
}

export interface LoginPayload {
  national_id: string
  password: string
}

export interface LoginResponse {
  token: string
  user: AuthenticatedUser
  token_type?: string
}

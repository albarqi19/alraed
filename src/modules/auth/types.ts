export type UserRole = 'teacher' | 'admin' | 'super_admin'

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

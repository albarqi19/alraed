/**
 * قيمُ الأدوار — يجب أن تطابق `App\Enums\UserRole` في الباك حرفاً بحرف.
 *
 * مصفوفةٌ لا اتحادٌ مكتوبٌ باليد، ليكون للقيم وجودٌ في وقت التشغيل أيضاً (تحقّقٌ،
 * سردٌ، مقارنة) لا في وقت الترجمة وحده.
 */
export const USER_ROLE_VALUES = [
  'teacher',
  'teacher_assistant',
  'admin',
  'super_admin',
  'school_principal',
  'deputy_teachers',
  'deputy_students',
  'administrative_staff',
  'administrative_assistant',
  'student_counselor',
  'health_counselor',
  'learning_resources_admin',
  'activity_leader',
  'lab_technician',
  'gifted_teacher',
  'data_registrar',
] as const

export type UserRole = (typeof USER_ROLE_VALUES)[number]

export type SubscriptionPlan = 'trial' | 'basic' | 'premium' | 'enterprise' | (string & {})
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

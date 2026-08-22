// أنواع البيانات لإدارة الإحالات

export type ReferralType = 'academic_weakness' | 'behavioral_violation'

export type ReferralTargetRole = 'counselor' | 'vice_principal' | 'committee'

export type ReferralStatus = 
  | 'pending' 
  | 'received' 
  | 'in_progress' 
  | 'transferred' 
  | 'completed' 
  | 'closed' 
  | 'cancelled'

export type ReferralPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Student {
  id: number
  name: string
  student_number?: string
  grade?: string
  class_name?: string
  classroom?: {
    id: number
    name: string
  }
}

export interface User {
  id: number
  name: string
  email?: string
  role?: string
  role_label?: string
}

export interface ReferralWorkflowLog {
  id: number
  action: string
  action_label: string
  notes?: string
  performed_by?: User  // من الـ API (snake_case of performedBy relation)
  performed_by_user?: User  // للتوافق
  created_at: string
}

export interface ReferralDocument {
  id: number
  document_number: string
  document_type: string
  document_type_label: string
  title: string
  generated_by_user?: User
  file_path?: string
  created_at: string
}

export interface StudentReferral {
  id: number
  referral_number: string
  student_id: number
  student?: Student
  referred_by_user_id: number
  referred_by?: User  // من الـ API (snake_case of referredBy relation)
  referred_by_user?: User  // للتوافق
  referral_type: ReferralType
  referral_type_label: string
  target_role: ReferralTargetRole
  target_role_label: string
  /** عنوان الإحالة كما كتبه المحيل — في $fillable ويصل في الحمولة (كان ناقصاً من الإعلان) */
  title?: string
  description: string
  status: ReferralStatus
  status_label: string
  priority: ReferralPriority
  priority_label: string
  assigned_to_user_id?: number
  assigned_to?: User  // من الـ API (snake_case of assignedTo relation)
  assigned_to_user?: User  // للتوافق
  received_by?: User  // من الـ API
  /** لحظة استلام الإحالة — في $casts كـ datetime ويصل في الحمولة (كان ناقصاً من الإعلان) */
  received_at?: string
  parent_notified: boolean
  parent_notified_at?: string
  behavior_violation_id?: number
  student_case_id?: number
  treatment_plan_id?: number
  completed_at?: string
  created_at: string
  updated_at: string
  workflow_logs?: ReferralWorkflowLog[]
  documents?: ReferralDocument[]
  available_assignees?: User[]
  linked_entities?: {
    behavior_violation?: { id: number; description: string }
    student_case?: { id: number; case_number: string; title: string }
    treatment_plan?: { id: number; plan_number: string; title: string }
  }
}

export interface ReferralStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  academic_weakness: number
  behavioral_violation: number
  by_target_role: {
    counselor: number
    vice_principal: number
    committee: number
  }
  by_referred_type?: {
    teacher: number
    deputy_students: number
    system: number
  }
}

export interface ReferralFilters {
  status?: string
  type?: string
  target_role?: string
  priority?: string
  assigned_to?: number
  referred_by?: number
  grade?: string
  date_from?: string
  date_to?: string
  referred_by_type?: 'teacher' | 'deputy_students' | 'system'
  page?: number
  per_page?: number
  /** `current` (الافتراضيّ في الخادم) أو `all` أو معرَّف سنة */
  academic_year?: string
}

export interface AssignReferralPayload {
  user_id: number
  notes?: string
}

export interface TransferReferralPayload {
  target_role: ReferralTargetRole
  notes: string
}

export interface RecordViolationPayload {
  degree: number // 1-4
  violation_type_id?: number
  violation_type: string // نص نوع المخالفة
  description?: string
  points_to_deduct?: number
  send_parent_message?: boolean
  parent_message?: string
  transfer_to_counselor?: boolean
  create_treatment_plan?: boolean
  behavior_violation_id?: string // UUID ربط بالمخالفة في سجل المخالفات
}

export interface ViolationDegree {
  id: number
  degree: number
  name: string
  description?: string
  types?: ViolationType[]
}

export interface ViolationType {
  id: number
  name: string
  degree_id: number
  points_to_deduct?: number
}

export interface ReferralListResponse {
  data: StudentReferral[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface PaginatedReferralsResult {
  items: StudentReferral[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface ReferralDetailResponse {
  data: StudentReferral
}

export interface ReferralStatsResponse {
  data: ReferralStats
}

export interface DocumentType {
  value: string
  label: string
}

// الإحصائيات المتقدمة
export interface AdvancedReferralStats {
  summary: {
    total: number
    pending: number
    in_progress: number
    completed: number
    today: number
    this_week: number
    avg_per_day: number
  }
  top_students: Array<{
    student_id: number
    name: string
    grade: string
    class_name: string
    count: number
  }>
  top_referrers: Array<{
    user_id: number
    name: string
    role: string
    count: number
  }>
  by_type: Array<{
    type: string
    label: string
    count: number
  }>
  by_target_role: Array<{
    role: string
    label: string
    count: number
  }>
  by_assignee: Array<{
    user_id: number
    name: string
    count: number
  }>
  by_hour: Array<{
    hour: number
    label: string
    count: number
  }>
  by_day_of_week: Array<{
    day: number
    label: string
    count: number
  }>
  by_grade: Array<{
    grade: string
    count: number
  }>
  by_class: Array<{
    grade: string
    class_name: string
    label: string
    count: number
  }>
  by_status: Array<{
    status: string
    label: string
    count: number
  }>
  by_priority: Array<{
    priority: string
    label: string
    count: number
  }>
  monthly_trend: Array<{
    year: number
    month: number
    label: string
    count: number
  }>
}

export interface AdvancedReferralStatsResponse {
  data: AdvancedReferralStats
}

/* ═══════════════════════════════════════════════════════════
   إحالات الغياب (تبويب «إحالات النظام»)
   ═══════════════════════════════════════════════════════════ */

export interface AbsenceReferral {
  id: number
  school_id: number
  student_id: number
  referral_id: number | null
  absence_type: 'consecutive' | 'repeated'
  total_absence_days: number
  consecutive_days: number | null
  absence_start_date: string
  last_absence_date: string
  action_level: '3days' | '5days' | '10days'
  counselor_notified: boolean
  counselor_notified_at: string | null
  learning_plan_created: boolean
  learning_plan_created_at: string | null
  protection_center_notified: boolean
  protection_center_notified_at: string | null
  parent_summoned: boolean
  parent_summoned_at: string | null
  commitment_taken: boolean
  commitment_taken_at: string | null
  committee_referred: boolean
  committee_referred_at: string | null
  reported_to_1919: boolean
  reported_to_1919_at: string | null
  education_dept_notified: boolean
  education_dept_notified_at: string | null
  status: 'active' | 'resolved' | 'escalated'
  notes: string | null
  created_at: string
  student?: {
    id: number
    name: string
    grade?: string
    class_name?: string
  }
  referral?: {
    id: number
    referral_number: string
    status: string
  }
  absence_type_label?: string
  action_level_label?: string
  status_label?: string
  /** ⚠️ الثلاثة التالية accessors بلا $appends — لا تصل قط. لا يُبنى عليها شيء (انظر absence-ladder.ts) */
  requires_protection_center?: boolean
  next_action_required?: string | null
  actions_progress?: number
}

export interface AbsenceReferralStats {
  consecutive: { total: number; '3days': number; '5days': number; '10days': number }
  repeated: { total: number; '3days': number; '5days': number; '10days': number }
  /** النوعان معاً — scopeRequiringAction لا يُقيَّد بنوع الغياب */
  requiring_action: number
}

export interface ViolationStudent {
  student_id: number
  student_name: string
  grade: string
  class_name: string
  violation_count: number
  last_violation_date: string
}

export interface LateStudent {
  student_id: number
  student_name: string
  grade: string
  class_name: string
  late_count: number
  last_late_date: string
  action_level: 'warning' | 'parent_summon' | 'committee'
}

/** per_page يصل في meta للنقطتين وإن لم يكن معلَناً — الرقم ١٥ السحري كان يُكتب بيداً */
export interface WatchListMeta {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export interface AbsenceReferralFilters {
  absence_type?: string
  status?: string
  action_level?: string
  requiring_action?: boolean
  page?: number
  per_page?: number
  /** `current` (الافتراضيّ في الخادم) أو `all` أو معرَّف سنة */
  academic_year?: string
}

export interface ProcessAbsencesResult {
  consecutive_referrals?: number
  repeated_referrals?: number
}

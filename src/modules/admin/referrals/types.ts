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
  description: string
  status: ReferralStatus
  status_label: string
  priority: ReferralPriority
  priority_label: string
  assigned_to_user_id?: number
  assigned_to?: User  // من الـ API (snake_case of assignedTo relation)
  assigned_to_user?: User  // للتوافق
  received_by?: User  // من الـ API
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
  date_from?: string
  date_to?: string
  referred_by_type?: 'teacher' | 'deputy_students' | 'system'
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

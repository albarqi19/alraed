// أنواع البيانات لنظام إحالة الطلاب

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
}

export interface ReferralWorkflowLog {
  id: number
  action: string
  action_label: string
  notes?: string
  performed_by_user?: User
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
  referred_by_user?: User
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
  assigned_to_user?: User
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
  can_cancel?: boolean
}

export interface ReferralStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  academic_weakness: number
  behavioral_violation: number
}

export interface CreateReferralPayload {
  student_id: number
  referral_type: ReferralType
  description: string
  priority?: ReferralPriority
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

export interface MyStudentsResponse {
  data: Student[]
}

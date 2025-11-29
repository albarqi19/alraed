// Types for the excuse submission system
export interface ExcuseData {
  student_name: string
  student_class: string
  student_grade: string
  absence_date: string
  absence_date_formatted: string
  token_expires_at?: string
  days_remaining?: number
  excuse_text?: string
  has_file?: boolean
  submitted_at?: string
  review_status?: 'pending' | 'approved' | 'rejected'
  review_status_label?: string
  review_notes?: string | null
}

export interface ExcuseApiResponse {
  success: boolean
  message?: string
  status?: 'pending_submission' | 'submitted'
  error_code?: 'INVALID_TOKEN' | 'TOKEN_EXPIRED'
  data?: ExcuseData
}

export interface SubmitExcusePayload {
  excuse_text: string
  file?: File
  parent_name?: string
}

export interface SubmitExcuseResponse {
  success: boolean
  message: string
  data?: {
    excuse_id: number
    submitted_at: string
  }
  errors?: Record<string, string[]>
}

// Admin types
export interface AbsenceExcuseRecord {
  id: number
  school_id: number
  student_id: number
  attendance_id: number | null
  absence_date: string
  token: string
  excuse_text: string | null
  file_path: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  status: 'pending' | 'approved' | 'rejected'
  status_label: string
  status_color: string
  submitted_at: string | null
  submitted_ip: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  review_notes: string | null
  response_message: string | null
  decision_notified: boolean
  noor_synced: boolean
  noor_synced_at: string | null
  noor_synced_by: number | null
  sync_notes: string | null
  parent_phone: string | null
  parent_name: string | null
  created_at: string
  updated_at: string
  student?: {
    id: number
    name: string
    national_id: string
    identity_number: string
    class_name: string
    grade: string
  }
  attendance?: {
    id: number
    date: string
    status: string
  }
  reviewer?: {
    id: number
    name: string
  }
  synced_by_user?: {
    id: number
    name: string
  }
}

export interface AbsenceExcuseStats {
  total: number
  pending: number
  approved: number
  rejected: number
  approved_not_synced: number
}

export interface AbsenceExcuseListResponse {
  success: boolean
  data: AbsenceExcuseRecord[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  stats: AbsenceExcuseStats
}

export interface AbsenceExcuseFilters {
  status?: 'all' | 'pending' | 'approved' | 'rejected'
  synced?: 'all' | 'true' | 'false'
  start_date?: string
  end_date?: string
  search?: string
  page?: number
  per_page?: number
}

export interface ApprovedNotSyncedResponse {
  success: boolean
  data: Array<{
    date: string
    date_formatted: string
    count: number
    excuses: Array<{
      id: number
      student_name: string
      student_national_id: string
      student_class: string
      student_grade: string
      excuse_text: string
      approved_at: string
    }>
  }>
  total: number
}

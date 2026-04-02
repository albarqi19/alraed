export interface FarisSettings {
  enabled: boolean
  username: string
  has_password: boolean
}

export interface FarisSyncLog {
  id: number
  sync_date: string
  sync_type: 'daily' | 'full_year'
  status: 'pending' | 'running' | 'completed' | 'failed'
  employees_found: number
  absences_checked: number
  leaves_matched: number
  leaves_cached: number
  pending_requests_found: number
  progress_current: number
  progress_total: number
  progress_message: string | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

export interface FarisEmployeeLeave {
  id: number
  national_id: string
  employee_name: string | null
  faris_leave_type: string
  mapped_absence_reason: string | null
  start_date: string
  end_date: string
  start_date_hijri: string | null
  end_date_hijri: string | null
  duration_days: number | null
  leave_status: 'approved' | 'pending' | 'rejected'
}

export interface FarisReconciliationStats {
  total_absences: number
  matched: number
  no_leave: number
  pending_leave: number
  not_synced: number
}

export interface FarisReconciliationAbsence {
  id: number
  national_id: string
  employee_name: string | null
  attendance_date: string
  absence_reason: string | null
  faris_sync_status: 'matched' | 'no_leave' | 'pending_leave' | null
  faris_synced_at: string | null
  faris_leave: FarisEmployeeLeave | null
  user?: {
    id: number
    name: string
    national_id: string
  }
}

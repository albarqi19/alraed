// أنواع البيانات لنظام أعذار التأخير

export type ExcuseStatus = 'pending' | 'approved' | 'rejected'

export interface ExcusableDelay {
  id: number
  attendance_date: string
  attendance_date_formatted: string
  check_in_time: string | null
  delay_minutes: number
  can_submit: boolean
  submit_reason: string | null
}

export interface DelayExcuse {
  id: number
  delay_date: string
  delay_date_formatted: string
  delay_minutes: number
  excuse_text: string
  status: ExcuseStatus
  status_label: string
  status_color: string
  submitted_at: string | null
  reviewed_at: string | null
  review_notes: string | null
  reviewer_name: string | null
  attendance?: {
    check_in_time: string | null
  }
}

export interface ExcuseSettings {
  enabled: boolean
  can_submit_now: boolean
  can_submit_reason: string | null
  submission_days: number
  allowed_days: number[]
  start_time: string
  end_time: string
}

export interface SubmitExcusePayload {
  attendance_id: number
  excuse_text: string
}

export interface ExcuseListResponse {
  success: boolean
  data: DelayExcuse[]
}

export interface ExcusableDelaysResponse {
  success: boolean
  data: ExcusableDelay[]
}

export interface ExcuseSettingsResponse {
  success: boolean
  data: ExcuseSettings
}

export interface SubmitExcuseResponse {
  success: boolean
  message: string
  data: {
    id: number
    status: ExcuseStatus
    status_label: string
  }
}

export interface ExcuseDetailResponse {
  success: boolean
  data: DelayExcuse
}

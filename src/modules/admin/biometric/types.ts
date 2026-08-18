// ========== أنواع أجهزة البصمة (ADMS / ZKTeco) ==========

export interface BiometricDevice {
  id: number
  serial_number: string
  name: string | null
  status: 'pending' | 'active' | 'disabled'
  device_model: string | null
  firmware_version: string | null
  last_ip: string | null
  last_seen_at: string | null
  is_online: boolean
  total_punches: number
  notes: string | null
}

/** سببُ إهمال البصمة — يُقرأ في الشاشة لتشخيص «البصمة لا تعمل». */
export type PunchIgnoreReason =
  | 'device_not_active'
  | 'student_inactive'
  | 'biometric_disabled'
  | 'test_mode'
  | 'non_working_day'
  | 'holiday'
  | 'subsequent_punch'
  | 'excused_not_overridden'
  | 'earlier_arrival_wins'

export interface BiometricPunch {
  id: number
  external_user_id: string
  student_id: number | null
  student_name: string | null
  student_grade: string | null
  student_class: string | null
  punched_at: string | null
  time: string | null
  verify_mode: number | null
  verify_label: string
  direction: number | null
  status: 'matched' | 'unmatched' | 'ignored'
  ignore_reason: PunchIgnoreReason | null
  serial_number: string
}

export interface BiometricStats {
  total_punches: number
  matched_count: number
  unmatched_count: number
  ignored_count: number
  last_punch_at: string | null
  devices_total: number
  devices_online: number
  devices_active: number
}

export interface BiometricPunchFilters {
  date?: string
  status?: string
  device_id?: number
}

export interface ClaimDevicePayload {
  serial_number: string
  name?: string
}

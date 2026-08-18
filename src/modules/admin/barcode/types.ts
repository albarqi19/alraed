// ========== أنواع نظام حضور البوابة بالباركود ==========

export interface BarcodeScanResult {
  success: boolean
  status: 'success' | 'error' | 'info'
  scan_result: 'present' | 'late' | 'duplicate' | 'invalid' | 'inactive' | 'disabled' | 'non_working_day' | 'holiday' | 'error'
  message: string
  student_name?: string | null
  student_grade?: string | null
  student_class?: string | null
  late_minutes?: number | null
  scan_time: string
}

export interface BarcodeScanRecord {
  id: number
  student_id: number | null
  barcode_value: string
  scan_date: string
  scan_time: string
  scan_result: 'present' | 'late' | 'duplicate' | 'invalid' | 'inactive'
  late_minutes: number | null
  scanner_device_id: string | null
  attendance_created: boolean
  whatsapp_queued: boolean
  student?: {
    id: number
    name: string
    grade: string
    class_name: string
    national_id: string
  } | null
  created_at: string
}

export interface BarcodeStatsData {
  total_students: number
  present_count: number
  late_count: number
  absent_count: number
  scanned_count: number
  last_scan_time: string | null
  /** هل مُنع رصدُ الغياب اليوم، ولماذا — كي لا يُقرأ الصمتُ عطلاً */
  auto_absence_blocked?: boolean
  auto_absence_reason?:
    | 'disabled'
    | 'auto_absence_disabled'
    | 'test_mode'
    | 'non_working_day'
    | 'holiday'
    | 'before_cutoff'
    | 'already_processed'
    | 'below_quorum'
    | null
  auto_absence_message?: string | null
  /** النصاب المطلوب من المسحات قبل السماح برصد الغياب */
  required_quorum?: number
}

export interface BarcodeSettings {
  barcode_enabled: boolean
  barcode_school_start_time: string
  barcode_late_threshold_minutes: number
  barcode_absence_cutoff_time: string
  barcode_auto_absence_enabled: boolean
  barcode_whatsapp_late_enabled: boolean
  barcode_whatsapp_absence_enabled: boolean
  barcode_duplicate_scan_mode: string
  barcode_sound_on_success: boolean
  barcode_sound_on_late: boolean
  barcode_sound_on_error: boolean
  barcode_working_days: number[]
  /** نهاية نافذة المسح — بعدها يُسجَّل الحضور بلا رسالة تأخير. فارغ = بلا حدّ */
  barcode_scan_end_time: string
  /** النصاب: أقلُّ العددِ الثابت والنسبةِ من الطلاب. صفرٌ يُعطّل الحارس */
  barcode_min_scans_for_absence: number
  barcode_min_scans_percent: number
  /** احترام التقويم الدراسي: لا رصدَ ولا رسائلَ في يوم إجازة */
  barcode_respect_academic_calendar: boolean
  /** وضع الاختبار: المسح يُعرض على الشاشة ولا يُكتب ولا يُرسل */
  barcode_test_mode: boolean
  /** حضور البصمة: يتقاسم أوقات هذه الصفحة وحرّاسها، وله تشغيلٌ مستقلّ */
  biometric_enabled: boolean
}

export interface ScannerDevice {
  id: number
  device_name: string
  device_token: string
  device_type: string | null
  status: 'active' | 'inactive' | 'maintenance'
  last_seen_at: string | null
  last_ip: string | null
  notes: string | null
  is_online?: boolean
  created_at: string
}

export interface BarcodeStudentRecord {
  id: number
  name: string
  student_number: string
  national_id: string
  grade: string
  class_name: string
  status: string
}

export interface BarcodeScanFilters {
  date?: string
  scan_result?: string
  grade?: string
  class_name?: string
  search?: string
}

export interface BarcodeHistoryFilters {
  from_date: string
  to_date: string
  per_page?: number
}

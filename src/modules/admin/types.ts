export interface AdminDashboardStats {
  total_students: number
  total_teachers: number
  present_today: number
  absent_today: number
  pending_approvals: number
  weekly_attendance?: Array<{
    day: string
    present: number
    absent: number
    late: number
    absent_teachers: number
  }>
}

export type TeacherStatus = 'active' | 'inactive'

export type StaffRole =
  | 'teacher'
  | 'school_principal'
  | 'deputy_teachers'
  | 'deputy_students'
  | 'administrative_staff'
  | 'student_counselor'
  | 'learning_resources_admin'
  | 'health_counselor'

export interface TeacherRecord {
  id: number
  name: string
  national_id: string
  phone?: string | null
  role: StaffRole
  secondary_role?: StaffRole | null
  status: TeacherStatus
  generated_password?: string | null
  secondary_generated_password?: string | null
  needs_password_change?: boolean
  created_at?: string
  updated_at?: string
}

export interface TeacherCredentials {
  national_id: string
  password: string
  role?: StaffRole
}

export interface CreateTeacherResponse {
  teacher: TeacherRecord
  login_credentials?: TeacherCredentials
  secondary_login_credentials?: TeacherCredentials
}

export interface UpdateTeacherResponse extends TeacherRecord {
  secondary_login_credentials?: TeacherCredentials
}

export interface StudentRecord {
  id: number
  name: string
  national_id: string
  grade: string
  class_name: string
  parent_name?: string
  parent_phone?: string
  created_at?: string
  updated_at?: string
}

export interface SubjectRecord {
  id: number
  name: string
  name_en?: string | null
  description?: string | null
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export interface ClassSessionTeacher {
  id: number
  name: string
}

export interface ClassSessionSubject {
  id: number
  name: string
}

export interface ClassSessionRecord {
  id: number
  grade: string
  class_name: string
  day: string
  period_number: number
  start_time: string
  end_time: string
  status: 'active' | 'inactive'
  teacher: ClassSessionTeacher
  subject: ClassSessionSubject
  notes?: string | null
}

export type ScheduleType = 'winter' | 'summer' | 'custom'

export interface SchedulePeriod {
  id?: number
  period_number: number
  start_time: string
  end_time: string
  is_break: boolean
  break_duration?: number | null
  period_name?: string | null
}

export interface ScheduleRecord {
  id: number
  name: string
  type: ScheduleType
  target_level?: string | null
  description?: string | null
  is_active: boolean
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string
  updated_at?: string
  periods?: SchedulePeriod[]
  sessions_count?: number
}

export interface ScheduleTemplate {
  key: string
  name: string
  type: ScheduleType
  target_level?: string | null
  periods: Array<Omit<SchedulePeriod, 'id'>>
}

export interface ClassScheduleSummary {
  id: string
  name: string
  grade: string
  class_name: string
  students_count: number
  sessions_count?: number
  active_schedule?: string | null
}

export interface ClassScheduleSlot {
  id: number
  teacher_name: string
  subject_name: string
  start_time?: string | null
  end_time?: string | null
  period_number: number
  schedule_name?: string | null
  period_name?: string | null
}

export type ClassScheduleGrid = Record<string, Record<number, ClassScheduleSlot | null>>

export interface ClassScheduleClassInfo {
  grade: string
  class_name: string
  full_name: string
}

export interface ClassScheduleResult {
  schedule: ClassScheduleGrid
  applied_schedule?: ScheduleRecord | null
  class_info: ClassScheduleClassInfo
}

export interface TeacherScheduleSummary {
  id: number
  name: string
  national_id?: string
  phone?: string | null
  status: TeacherStatus
  sessions_count: number
  classes_count: number
  earliest_start?: string | null
  latest_end?: string | null
}

export interface TeacherScheduleSlot {
  id: number
  subject_name: string
  grade: string
  class_name: string
  start_time?: string | null
  end_time?: string | null
  schedule_name?: string | null
  period_number: number
}

export type TeacherScheduleGrid = Record<string, Record<number, TeacherScheduleSlot | null>>

export interface TeacherScheduleResult {
  schedule: TeacherScheduleGrid
  teacher_info: {
    id: number
    name: string
    national_id?: string | null
    phone?: string | null
    status: TeacherStatus
    classes_count: number
    subjects_count: number
    sessions_count: number
  }
}

export interface MasterScheduleTeacher {
  id: number
  name: string
  schedule: Record<string, Record<number, string | null>>
  standby: Record<string, Record<number, number>>
}

export interface MasterScheduleResult {
  teachers: MasterScheduleTeacher[]
  max_period: number
  days: string[]
}

export type TeacherScheduleDayLimits = Record<string, number>

export interface TeacherScheduleDayLimitsResponse {
  day_limits: TeacherScheduleDayLimits
  defaults: {
    max_periods: number
    days: string[]
  }
}

export type TeacherScheduleConflictPriority = 'P1' | 'P2' | 'P3'

export interface TeacherScheduleMoveConflict {
  priority: TeacherScheduleConflictPriority
  code: string
  message: string
}

export interface TeacherScheduleMoveResolutionStep {
  session_id: number
  target_day: string
  target_period: number
}

export interface TeacherScheduleMoveSuggestionStep {
  session_id: number
  from_day: string
  from_period: number
  to_day: string
  to_period: number
  teacher_name?: string | null
  subject_name?: string | null
  grade: string
  class_name: string
}

export interface TeacherScheduleMoveResolution {
  mode: 'direct' | 'swap' | 'chain'
  swap_session_id?: number
  swap_target_day?: string
  swap_target_period?: number
  steps?: TeacherScheduleMoveResolutionStep[]
  next_target_day?: string
  next_target_period?: number
  next_target_teacher_id?: number | null
}

export interface TeacherScheduleMoveSuggestion {
  id: string
  title: string
  description: string
  priority: TeacherScheduleConflictPriority
  resolution: TeacherScheduleMoveResolution
  resolves_conflicts?: boolean
  strategy?: 'single_swap' | 'chain_swap' | 'delay' | string
  steps?: TeacherScheduleMoveSuggestionStep[]
  metadata?: Record<string, unknown>
}

export interface TeacherScheduleMovePreviewPayload {
  source_session_id: number
  target_day: string
  target_period: number
  target_teacher_id?: number | null
}

export interface TeacherScheduleMovePreviewResult {
  can_move: boolean
  conflicts: TeacherScheduleMoveConflict[]
  suggestions: TeacherScheduleMoveSuggestion[]
  source_session: TeacherScheduleMoveSession
  target_slot: {
    day: string
    period_number: number
    teacher_id: number
    teacher_name: string
    existing_session?: TeacherScheduleMoveSession | null
  }
  metrics: {
    teacher_day_load_after_move: number
    day_max_periods: number
    class_day_load_after_move: number
  }
}

export interface TeacherScheduleMoveSession extends TeacherScheduleSlot {
  day: string
  teacher_id: number
  teacher_name?: string | null
}

export interface TeacherScheduleMoveConfirmPayload extends TeacherScheduleMovePreviewPayload {
  resolution?: TeacherScheduleMoveResolution
}

export interface TeacherScheduleMoveConfirmResult {
  success: boolean
  message: string
  affected_sessions: number[]
}

export interface ClassScheduleSessionData {
  teachers: Array<{
    id: number
    name: string
    national_id?: string | null
  }>
  subjects: Array<{
    id: number
    name: string
  }>
  schedules: Array<{
    id: number
    name: string
    type?: string | null
    target_level?: string | null
    is_active: boolean
  }>
}

export interface AttendanceReportRecord {
  id?: number
  student_name?: string
  grade: string
  class_name: string
  subject_name?: string
  teacher_name: string
  teacher_id_number?: string
  teacher_id?: number
  status?: 'present' | 'absent' | 'late' | 'excused'
  attendance_date: string
  recorded_at?: string
  is_approved?: boolean | null
  students_count?: number
  first_id?: number
}

export interface PendingApprovalRecord {
  id: number
  class_session_id: number
  attendance_date: string
  teacher_name: string
  subject_name: string
  grade: string
  class_name: string
  present_count: number
  absent_count: number
  late_count?: number
  excused_count?: number
  recorded_at?: string
  student_count?: number
}

export interface AttendanceSessionDetails {
  session_info: {
    id: number
    class_session_id: number
    teacher_name: string
    subject_name: string
    grade: string
    class_name: string
    attendance_date: string
    recorded_at?: string
    is_approved: boolean | null
    rejection_reason?: string | null
  }
  statistics: {
    total_students: number
    present_count: number
    absent_count: number
    late_count: number
    excused_count: number
    attendance_rate: number
  }
  students: Array<{
    attendance_id: number
    student_id: number
    name: string
    national_id?: string
    status: 'present' | 'absent' | 'late' | 'excused'
    notes?: string | null
    recorded_at?: string
  }>
}

export type AttendanceReportView = 'class' | 'student' | 'grade'

export interface AttendanceReportFiltersPayload {
  type: AttendanceReportView
  grade?: string
  class?: string
  student_id?: number
  start_date: string
  end_date: string
}

export interface AttendanceReportSummary {
  total_present: number
  total_absent: number
  total_late: number
  total_excused?: number
  students_count: number
  days_count: number
  grade?: string | null
  class_name?: string | null
  student_name?: string | null
}

export interface AttendanceReportStudentAttendance {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string | null
  recorded_at?: string | null
}

export interface AttendanceReportStudentRow {
  student_id: number
  national_id?: string | null
  name: string
  grade: string
  class_name: string
  total_present: number
  total_absent: number
  total_late: number
  total_excused?: number
  attendance: AttendanceReportStudentAttendance[]
}

export interface AttendanceReportMatrix {
  view: AttendanceReportView
  dates: string[]
  summary: AttendanceReportSummary
  students: AttendanceReportStudentRow[]
  generated_at?: string
  metadata?: {
    grade?: string | null
    class_name?: string | null
    student?: {
      id: number
      name: string
    }
  }
}

export type TeacherHudoriAttendanceStatus = 'present' | 'departed' | 'failed' | 'unknown' | 'absent'
export type TeacherHudoriAttendanceLoginMethod = 'face' | 'fingerprint' | 'card' | 'voice' | 'manual' | 'unknown'
export type TeacherDelayStatus = 'on_time' | 'delayed' | 'excused' | 'unknown' | 'absent'
export type TeacherAbsenceReason =
  | 'unjustified'
  | 'delegated'
  | 'annual_leave'
  | 'sick_leave'
  | 'emergency_leave'
  | 'exceptional_leave'
  | 'deduction'
  | 'companion_leave'
  | 'training_course'
  | 'workshop'
  | 'makeup'
  | 'bereavement_leave'
  | 'maternity_leave'
  | 'exam_leave'
  | 'paternity_leave'
  | 'motherhood_leave'
  | 'disaster'
  | 'sports_leave'
  | 'dialysis_leave'
  | 'disability_care_leave'
  | 'patient_companion_leave'
  | 'international_sports_leave'
  | 'accident_sick_leave'
  | 'pending'
  | 'remote_work'

export interface TeacherDelayInquiryRecord {
  id: number
  status: TeacherDelayStatus | string
  channel?: string | null
  notified_at?: string | null
  responded_at?: string | null
  response_text?: string | null
  payload?: Record<string, unknown> | null
  response_meta?: Record<string, unknown> | null
}

export interface TeacherHudoriAttendanceRecord {
  id: number
  national_id: string
  employee_name: string
  job_number?: string | null
  transaction_type: 'check_in' | 'check_out'
  status: TeacherHudoriAttendanceStatus
  status_label: string
  login_method: TeacherHudoriAttendanceLoginMethod
  login_method_label: string
  result?: string | null
  attendance_date: string
  transaction_time?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
  gate_name?: string | null
  location?: string | null
  page_number?: number | null
  source?: string | null
  is_matched: boolean
  user?: {
    id: number
    name: string
    school_id?: number | null
  } | null
  delay_status?: TeacherDelayStatus | null
  delay_status_label?: string | null
  delay_minutes?: number | null
  delay_evaluated_at?: string | null
  delay_notified_at?: string | null
  delay_notice_channel?: string | null
  delay_notice_payload?: Record<string, unknown> | null
  delay_notes?: string | null
  delay_inquiry?: TeacherDelayInquiryRecord | null
}

export interface TeacherHudoriAttendanceStats {
  total: number
  matched: number
  unmatched: number
  present: number
  departed: number
  failed: number
  unknown: number
  delayed?: number
  on_time?: number
  excused?: number
  delay_unknown?: number
}

export interface TeacherHudoriAttendanceResponse {
  success?: boolean
  date: string
  records: TeacherHudoriAttendanceRecord[]
  stats: TeacherHudoriAttendanceStats
  metadata?: {
    refreshed_at?: string
    filters?: {
      status?: string | null
      matched?: string | null
      search?: string | null
      delay_status?: string | null
    }
  }
}

export interface TeacherHudoriAttendanceFilters {
  date?: string
  status?: TeacherHudoriAttendanceStatus | 'all'
  matched?: 'all' | 'matched' | 'unmatched'
  search?: string
  login_method?: TeacherHudoriAttendanceLoginMethod | 'all'
  delay_status?: TeacherDelayStatus | 'all'
  delayed_only?: boolean
}

export interface TeacherAttendanceTemplateOption {
  id: number
  name: string
  type?: string | null
}

export interface TeacherAttendanceSettingsRecord {
  school_id: number
  start_time: string | null
  end_time: string | null
  grace_minutes: number
  auto_calculate_delay: boolean
  send_whatsapp_for_delay: boolean
  include_delay_notice: boolean
  allow_e_signature: boolean
  remind_check_in: boolean
  remind_check_out: boolean
  delay_notification_template_id?: number | null
  additional_settings: Record<string, unknown>
  available_templates: TeacherAttendanceTemplateOption[]
}

export interface TeacherAttendanceSettingsPayload {
  start_time?: string | null
  end_time?: string | null
  grace_minutes?: number
  auto_calculate_delay?: boolean
  send_whatsapp_for_delay?: boolean
  include_delay_notice?: boolean
  allow_e_signature?: boolean
  remind_check_in?: boolean
  remind_check_out?: boolean
  delay_notification_template_id?: number | null
  additional_settings?: Record<string, unknown>
}

export interface TeacherAttendanceDelayRecord {
  id: number
  teacher_id?: number | null
  teacher_name?: string | null
  teacher_phone?: string | null
  national_id?: string | null
  attendance_date?: string | null
  check_in_time?: string | null
  delay_minutes?: number | null
  delay_status: TeacherDelayStatus
  delay_status_label?: string | null
  delay_evaluated_at?: string | null
  delay_notified_at?: string | null
  delay_notice_channel?: string | null
  delay_notice_payload?: Record<string, unknown> | null
  delay_notes?: string | null
  transaction_type?: 'check_in' | 'check_out' | null
  status?: TeacherHudoriAttendanceStatus
  status_label?: string | null
  absence_reason?: TeacherAbsenceReason | string | null
  absence_reason_label?: string | null
  absence_recorded_at?: string | null
  absence_notes?: string | null
  absence_source?: string | null
  user?: {
    id: number
    name: string
    phone?: string | null
  } | null
  delay_inquiry?: TeacherDelayInquiryRecord | null
}

export interface TeacherAttendanceDelayFilters {
  status?: TeacherDelayStatus | 'all'
  absence_reason?: TeacherAbsenceReason | 'all'
  start_date?: string
  end_date?: string
  search?: string
  page?: number
  per_page?: number
  order?: 'asc' | 'desc'
}

export interface TeacherAttendanceDelayListResponse {
  data: TeacherAttendanceDelayRecord[]
  meta: PaginationMeta
}

export interface TeacherAttendanceDelayStatusUpdatePayload {
  status: TeacherDelayStatus
  notes?: string | null
  clear_notification?: boolean
  attendance_status?: TeacherHudoriAttendanceStatus
  absence_reason?: TeacherAbsenceReason | string | null
  absence_notes?: string | null
}

export interface TeacherAttendanceDelayRecalculatePayload {
  check_in_time?: string
}

// إحصائيات حضور المعلمين المتقدمة
export interface TeacherAttendanceAdvancedStats {
  period: {
    start_date: string
    end_date: string
    semester_name: string
    semester_code: string | null
  }
  summary: {
    total_teachers: number
    present_today: number
    absent_today: number
    delayed_today: number
    excused_today: number
    on_time_today: number
    avg_delay_today: number
    semester_attendance_rate: number
    semester_total_delay_hours: number
    semester_delayed_count: number
    semester_absent_count: number
  }
  monthly_trend: Array<{
    year: number
    month: number
    label: string
    total: number
    present: number
    absent: number
    delayed: number
    attendance_rate: number
  }>
  by_absence_reason: Array<{
    reason: string
    label: string
    count: number
  }>
  by_day_of_week: Array<{
    day: number
    label: string
    total: number
    delayed: number
    absent: number
  }>
  by_hour: Array<{
    hour: number
    label: string
    count: number
  }>
  delay_distribution: Array<{
    bracket: string
    label: string
    count: number
  }>
  top_delayed_teachers: Array<{
    name: string
    national_id: string
    delay_count: number
    total_delay_hours: number
    avg_delay_minutes: number
  }>
  top_absent_teachers: Array<{
    name: string
    national_id: string
    absence_count: number
  }>
  teachers_delay_hours: Array<{
    name: string
    national_id: string
    total_delay_hours: number
    total_delay_minutes: number
    delay_count: number
  }>
  by_login_method: Array<{
    method: string
    label: string
    count: number
  }>
}

export interface TeacherAttendanceAdvancedStatsResponse {
  success: boolean
  data: TeacherAttendanceAdvancedStats
}

export interface LateArrivalRecord {
  id: number
  student_id: number
  student_name: string
  student_class: string
  late_date: string
  recorded_at: string
  notes?: string | null
  whatsapp_sent: boolean
  whatsapp_sent_at?: string | null
}

export interface LateArrivalStats {
  today: number
  week: number
  messages_sent: number
}

export interface LateArrivalCreateResponse {
  registered_count: number
  errors: string[]
  message?: string
}

export interface ImportPreviewStudentChange {
  field: string
  old: string | number | null
  new: string | number | null
}

export interface ImportStudentsPreview {
  new_students_count: number
  students_with_changes: number
  to_be_deleted_count: number
  errors_count: number
  total_students: number
  new_students: StudentRecord[]
  existing_students: Array<{
    id: number
    current_data: StudentRecord
    new_data: StudentRecord
    changes: Record<string, ImportPreviewStudentChange>
    attendance_count?: number
  }>
  to_be_deleted: StudentRecord[]
  errors: string[]
}

export interface ImportStudentsPayload {
  update_existing?: boolean
  delete_missing?: boolean
}

export interface ImportSummary {
  new_count?: number
  updated_count?: number
  deleted_count?: number
  skipped_count?: number
  duplicates_in_file?: number
  errors_count?: number
  warnings_count?: number
  total_students?: number
  message?: string
  errors?: string[]
  warnings?: string[]
  deleted_students?: Array<{
    id: number
    name: string
    national_id: string
    grade: string
    class_name: string
  }>
}

export interface ImportTeachersSummary extends ImportSummary {
  credentials?: TeacherCredentials[]
}

export interface AdminSettings {
  school_name: string
  school_phone: string
  school_region?: string | null
  school_principal_name?: string | null
  attendance_notification: boolean
  weekly_report: boolean
  auto_approve_attendance: boolean
}

export interface WhatsappStatistics {
  total_sent: number
  total_failed: number
  queue_size: number
  last_synced_at?: string | null
}

export interface WhatsappQueueItem {
  id: number
  student_name?: string
  parent_phone: string
  template_name?: string
  created_at: string
  scheduled_at?: string | null
  status: 'pending' | 'processing' | 'sent' | 'failed'
  error_message?: string | null
}

export interface WhatsappHistoryItem {
  id: number
  recipient?: string | null
  recipient_name?: string | null
  recipient_phone?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  student_name?: string | null
  student_grade?: string | null
  student_class?: string | null
  phone_number?: string | null
  message_content?: string | null
  message_preview?: string | null
  message_body?: string | null
  template_name?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  created_at?: string | null
  status: 'sent' | 'failed'
  error_message?: string | null
  metadata?: Record<string, unknown> | null
}

export interface StoreStats {
  total_items: number
  active_items: number
  total_orders: number
  pending_orders: number
  fulfilled_orders: number
  points_redeemed: number
}

export type StoreStatus = 'open' | 'closed' | 'maintenance' | 'inventory' | 'paused' | 'empty'

export interface StoreSettingsRecord {
  id?: number
  school_id?: number | null
  auto_approve_orders: boolean
  auto_fulfill_orders: boolean
  allow_student_cancellations: boolean
  allow_student_notes: boolean
  require_admin_reason_on_reject: boolean
  notify_low_stock: boolean
  low_stock_threshold: number
  max_pending_orders_per_student?: number | null
  max_items_per_order: number
  max_points_per_order?: number | null
  reference_prefix?: string | null
  notification_recipients: string[]
  store_status: StoreStatus
  store_status_message?: string | null
  allow_redemption_start_time?: string | null
  allow_redemption_end_time?: string | null
  allowed_redemption_weekdays: number[]
  enforce_violation_limit: boolean
  max_behavior_violations?: number | null
  violation_lookback_days?: number | null
  prevent_redemption_when_inventory_empty: boolean
  allow_waitlist_when_closed: boolean
  created_at?: string
  updated_at?: string
}

export interface StoreSettingsPayload {
  auto_approve_orders: boolean
  auto_fulfill_orders: boolean
  allow_student_cancellations: boolean
  allow_student_notes: boolean
  require_admin_reason_on_reject: boolean
  notify_low_stock: boolean
  low_stock_threshold: number
  max_pending_orders_per_student?: number | null
  max_items_per_order: number
  max_points_per_order?: number | null
  reference_prefix?: string | null
  notification_recipients?: string[] | null
  store_status: StoreStatus
  store_status_message?: string | null
  allow_redemption_start_time?: string | null
  allow_redemption_end_time?: string | null
  allowed_redemption_weekdays?: number[] | null
  enforce_violation_limit: boolean
  max_behavior_violations?: number | null
  violation_lookback_days?: number | null
  prevent_redemption_when_inventory_empty: boolean
  allow_waitlist_when_closed: boolean
}

export interface StoreCategoryRecord {
  id: number
  name: string
  slug?: string | null
  description?: string | null
  icon?: string | null
  is_active: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export interface StoreCategoryPayload {
  name: string
  slug?: string | null
  description?: string | null
  icon?: string | null
  is_active?: boolean
  display_order?: number | null
}

export interface StoreItemRecord {
  id: number
  store_category_id?: number | null
  name: string
  slug?: string | null
  sku?: string | null
  points_cost: number
  stock_quantity?: number | null
  unlimited_stock: boolean
  max_per_student?: number | null
  is_active: boolean
  display_order: number
  available_from?: string | null
  available_until?: string | null
  image_url?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  times_redeemed: number
  created_at?: string
  updated_at?: string
  category?: StoreCategoryRecord | null
}

export interface StoreItemPayload {
  store_category_id?: number | null
  name: string
  slug?: string | null
  sku?: string | null
  points_cost: number
  stock_quantity?: number | null
  unlimited_stock?: boolean
  max_per_student?: number | null
  is_active?: boolean
  display_order?: number | null
  available_from?: string | null
  available_until?: string | null
  image_url?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}

export interface StoreItemFilters {
  status?: 'all' | 'active' | 'inactive'
  category_id?: number
  search?: string
  page?: number
  per_page?: number
}

export interface StoreOrderItemRecord {
  id: number
  store_order_id: number
  store_item_id?: number | null
  name: string
  description?: string | null
  image_url?: string | null
  quantity: number
  unit_points: number
  total_points: number
  metadata?: Record<string, unknown> | null
}

export type StoreOrderStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'rejected'

export interface StoreOrderStudent {
  id: number
  name: string
  grade?: string | null
  class_name?: string | null
  national_id?: string | null
}

export interface StoreOrderRecord {
  id: number
  student_id: number
  reference_number: string
  status: StoreOrderStatus
  total_points: number
  points_charged: number
  items_count: number
  submitted_via?: string | null
  student_notes?: string | null
  admin_notes?: string | null
  point_transaction_id?: number | null
  refund_transaction_id?: number | null
  approved_at?: string | null
  fulfilled_at?: string | null
  cancelled_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
  student: StoreOrderStudent
  items: StoreOrderItemRecord[]
}

export interface StoreOrderPayload {
  student_id: number
  items: Array<{
    item_id: number
    quantity: number
  }>
  student_notes?: string | null
  admin_notes?: string | null
  submitted_via?: string | null
  metadata?: Record<string, unknown> | null
}

export interface StoreOrderFilters {
  status?: StoreOrderStatus | 'all'
  student_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export interface WhatsappTemplateVariable {
  key: string
  label: string
  example?: string
}

export interface WhatsappTemplate {
  id: number
  name: string
  body: string
  category?: string
  variables?: WhatsappTemplateVariable[]
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export interface WhatsappTargetStudent {
  id: number
  name: string
  grade?: string | null
  class_name?: string | null
  national_id?: string | null
  parent_phone?: string | null
  parent_name?: string | null
  absence_days?: number | null
  total_absences?: number | null
  last_absence_date?: string | null
}

export interface WhatsappBulkMessagePayloadItem {
  student_id: number
  phone?: string | null
  message: string
  student_name?: string | null
}

export interface WhatsappBulkMessagePayload {
  template_id?: number | null
  messages: WhatsappBulkMessagePayloadItem[]
}

export interface WhatsappSettings {
  instance_name?: string
  phone_number?: string
  is_connected: boolean
  last_sync_at?: string | null
  auto_send_enabled?: boolean
}

export interface WhatsappInstance {
  id: number
  school_id: number
  instance_name: string
  phone_number: string | null
  status: 'disconnected' | 'connecting' | 'connected'
  qr_code: string | null
  department: string | null
  metadata: Record<string, any> | null
  last_connected_at: string | null
  created_at: string
  updated_at: string
  status_text?: string
}

export interface WhatsappInstanceCreatePayload {
  department?: string | null
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type LeaveRequestSubmittedBy = 'admin' | 'guardian'

export interface LeaveRequestActor {
  id: number
  name: string
}

export interface LeaveRequestRecord {
  id: number
  student_id: number
  student: StudentRecord
  status: LeaveRequestStatus
  reason: string
  pickup_person_name: string
  pickup_person_relation?: string | null
  pickup_person_phone?: string | null
  expected_pickup_time?: string | null
  submitted_by_type: LeaveRequestSubmittedBy
  submitted_by_admin?: LeaveRequestActor | null
  guardian_name?: string | null
  guardian_phone?: string | null
  decision_notes?: string | null
  decision_at?: string | null
  decision_by_admin?: LeaveRequestActor | null
  created_at: string
  updated_at: string
}

export interface LeaveRequestFilters {
  status?: LeaveRequestStatus | 'all'
  grade?: string
  class_name?: string
  submitted_by_type?: LeaveRequestSubmittedBy | 'all'
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
  student_id?: number
}

export interface LeaveRequestListResult {
  items: LeaveRequestRecord[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  stats?: {
    pending: number
    approved: number
    rejected: number
    cancelled: number
  }
}

export interface LeaveRequestCreatePayload {
  student_id: number
  reason: string
  pickup_person_name: string
  pickup_person_relation?: string | null
  pickup_person_phone?: string | null
  expected_pickup_time?: string | null
  guardian_name?: string | null
  guardian_phone?: string | null
  status?: LeaveRequestStatus
  decision_notes?: string | null
}

export interface LeaveRequestUpdatePayload extends Partial<LeaveRequestCreatePayload> {
  status?: LeaveRequestStatus
}

export interface PointSettingsRecord {
  id: number
  daily_teacher_cap: number
  per_student_cap: number
  daily_violation_cap: number
  rewards_enabled: boolean
  violations_enabled: boolean
  require_camera_confirmation: boolean
  undo_timeout_seconds: number
  reward_values?: number[] | null
  violation_values?: number[] | null
  created_at?: string
  updated_at?: string
}

export type PointSettingsUpdatePayload = Omit<PointSettingsRecord, 'id' | 'created_at' | 'updated_at'>

export interface PointReasonRecord {
  id: number
  title: string
  type: 'reward' | 'violation'
  value: number
  category?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type PointReasonPayload = Omit<PointReasonRecord, 'id' | 'created_at' | 'updated_at'>

export interface PointTransactionStudent {
  id: number
  name: string
  grade?: string | null
  class_name?: string | null
}

export interface PointTransactionTeacher {
  id: number
  name: string
}

export interface PointTransactionRecord {
  id: number
  student_id: number
  teacher_id?: number | null
  reason_id?: number | null
  card_id?: number | null
  created_by?: number | null
  type: 'reward' | 'violation'
  amount: number
  source: string
  context?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  undoable_until?: string | null
  undone_at?: string | null
  created_at: string
  updated_at: string
  student?: PointTransactionStudent
  teacher?: PointTransactionTeacher | null
  reason?: PointReasonRecord | null
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PointLeaderboardEntry {
  id: number
  student_id: number
  total_points: number
  lifetime_rewards?: number
  lifetime_violations?: number
  student: StudentRecord
}

export interface PointCardRecord {
  student: StudentRecord
  card: {
    id: number
    token: string
    version: string
    is_active: boolean
    issued_at?: string | null
    revoked_at?: string | null
  }
  total_points: number
}

export interface PointTransactionFilters {
  type?: 'reward' | 'violation'
  student_id?: number
  teacher_id?: number
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
}

export interface PointLeaderboardFilters {
  grade?: string
  class_name?: string
  page?: number
  per_page?: number
}

export interface PointCardFilters {
  grade?: string
  class_name?: string
  search?: string
  page?: number
  per_page?: number
}

export interface PointManualTransactionPayload {
  student_id: number
  teacher_id?: number | null
  reason_id?: number | null
  type: 'reward' | 'violation'
  amount: number
  notes?: string | null
  context?: string | null
}

export interface PointTransactionsResponse {
  items: PointTransactionRecord[]
  meta: PaginationMeta
}

export interface PointLeaderboardResponse {
  items: PointLeaderboardEntry[]
  meta: PaginationMeta
}

export interface PointCardsResponse {
  items: PointCardRecord[]
  meta: PaginationMeta
}

export type DutyRosterWeekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

export const DUTY_ROSTER_WEEKDAYS: DutyRosterWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
]

export type DutyRosterStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export type DutyRosterAssignmentStatus = 'scheduled' | 'absent' | 'replacement_assigned' | 'completed'

export type DutyRosterAssignmentRole = 'teacher' | 'staff'

export interface DutyRosterAssignmentRecord {
  id: number
  user_id: number
  user: {
    id: number
    name: string
    phone?: string | null
  }
  assignment_role: DutyRosterAssignmentRole
  status: DutyRosterAssignmentStatus
  marked_absent_at?: string | null
  replacement_user_id?: number | null
  replacement_user?: {
    id: number
    name: string
    phone?: string | null
  } | null
  replacement_assigned_at?: string | null
  meta?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface DutyRosterShiftRecord {
  id: number
  duty_shift_template_id?: number | null
  shift_type: string
  shift_date: string
  window_start: string
  window_end: string
  trigger_time?: string | null
  status: DutyRosterStatus
  reminder_offset_minutes: number
  settings?: Record<string, unknown> | null
  notifications_dispatched_at?: string | null
  created_at: string
  updated_at: string
  template?: {
    id: number
    name: string
    shift_type: string
    weekday_assignments?: DutyRosterTemplateWeekdayAssignments
  } | null
  assignments: DutyRosterAssignmentRecord[]
}

export interface DutyRosterStats {
  total_shifts: number
  absent_assignments: number
  replacement_assignments: number
}

export interface DutyRosterFilters {
  shift_type?: string
  status?: DutyRosterStatus
  date?: string
  from_date?: string
  to_date?: string
  page?: number
  per_page?: number
}

export interface DutyRosterListResponse {
  items: DutyRosterShiftRecord[]
  meta: PaginationMeta & {
    stats: DutyRosterStats
  }
}

export interface DutyRosterCreatePayload {
  shift_type: string
  shift_date: string
  window_start: string
  window_end: string
  trigger_time?: string | null
  status?: DutyRosterStatus
  reminder_offset_minutes?: number
  template_id?: number | null
  assignments: Array<{
    user_id: number
    assignment_role?: DutyRosterAssignmentRole
  }>
}

export interface DutyRosterMarkAbsentPayload {
  reason?: string | null
}

export interface DutyRosterAssignReplacementPayload {
  replacement_user_id: number
  notes?: string | null
}

export interface DutyRosterTemplateUserSummary {
  id: number
  name: string
  phone?: string | null
}

export interface DutyRosterTemplateAssignmentRecord {
  id: number
  weekday: DutyRosterWeekday
  user_id: number
  assignment_role: DutyRosterAssignmentRole
  sort_order: number
  is_active: boolean
  user?: DutyRosterTemplateUserSummary | null
}

export type DutyRosterTemplateWeekdayAssignments = Record<
  DutyRosterWeekday,
  DutyRosterTemplateAssignmentRecord[]
>

export interface DutyRosterTemplateRecord {
  id: number
  name: string
  shift_type: string
  window_start: string | null
  window_end: string | null
  trigger_offset_minutes: number | null
  is_active: boolean
  weekday_assignments: DutyRosterTemplateWeekdayAssignments
  created_at?: string | null
  updated_at?: string | null
}

export interface DutyRosterTemplateFilters {
  shift_type?: string
  is_active?: boolean
}

export interface DutyRosterSettingsRecord {
  id: number
  auto_generate_enabled: boolean
  auto_generate_time: string | null
  reminder_notifications_enabled: boolean
  reminder_lead_minutes: number
  reminder_channels: string[]
  reminder_repeat_interval_minutes: number | null
  reminder_repeat_count: number
  settings?: Record<string, unknown> | null
  // إعدادات تذكيرات المناوبة الفصلية
  duty_schedule_reminder_enabled: boolean
  duty_schedule_morning_reminder_time: string | null
  duty_schedule_afternoon_reminder_time: string | null
  duty_schedule_day_before_reminder: boolean
  duty_schedule_day_before_reminder_time: string | null
  duty_schedule_reminder_channels: string[]
  created_at?: string | null
  updated_at?: string | null
}

export interface DutyRosterSettingsUpdatePayload {
  auto_generate_enabled?: boolean
  auto_generate_time?: string | null
  reminder_notifications_enabled?: boolean
  reminder_lead_minutes?: number
  reminder_channels?: string[]
  reminder_repeat_interval_minutes?: number | null
  reminder_repeat_count?: number
  settings?: Record<string, unknown> | null
  // إعدادات تذكيرات المناوبة الفصلية
  duty_schedule_reminder_enabled?: boolean
  duty_schedule_morning_reminder_time?: string | null
  duty_schedule_afternoon_reminder_time?: string | null
  duty_schedule_day_before_reminder?: boolean
  duty_schedule_day_before_reminder_time?: string | null
  duty_schedule_reminder_channels?: string[]
}

export interface DutyRosterTemplatePayload {
  name: string
  shift_type: string
  window_start: string
  window_end: string
  trigger_offset_minutes?: number | null
  is_active?: boolean
  weekday_assignments: Partial<Record<DutyRosterWeekday, number[]>>
}

export interface DutyRosterTemplateUpdatePayload
  extends Partial<Omit<DutyRosterTemplatePayload, 'weekday_assignments'>> {
  weekday_assignments?: Partial<Record<DutyRosterWeekday, number[]>>
}

// ===== SMS Gateway Types =====

export type SmsDeviceStatus = 'active' | 'inactive' | 'blocked'

export type SmsMessageStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'

export type SmsMessageType = 'absence' | 'late_arrival' | 'behavior' | 'general' | 'custom'

export interface SmsRegisteredDevice {
  id: number
  device_id: string
  device_name: string | null
  device_model: string | null
  android_version: string | null
  school_id: number
  registration_date: string
  last_active: string | null
  status: SmsDeviceStatus
  app_version: string | null
  total_sent?: number
  created_at: string
  updated_at: string
}

export interface SmsDeviceActivityLog {
  id: number
  device_id: string
  school_id: number
  action: string
  timestamp: string
  ip_address: string | null
  details: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface SmsMessage {
  id: number
  school_id: number
  phone: string
  message: string
  status: SmsMessageStatus
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  device_id: string | null
  error_message: string | null
  student_id: number | null
  message_type: SmsMessageType | null
  retry_count: number
  next_retry_at: string | null
  updated_at: string
  student?: StudentRecord
  device?: SmsRegisteredDevice
}

export interface SmsStatistics {
  total_devices: number
  active_devices: number
  total_messages: number
  pending_messages: number
  sent_messages: number
  failed_messages: number
  messages_today: number
  messages_this_month: number
}

export interface NoorSyncRecord {
  id: number
  teacher_id: number
  school_id: number
  attendance_date: string
  grade: string
  class_name: string
  subject_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  total_students: number
  processed_students: number
  absent_students: number
  failed_students: number
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  student_data: string | any[] | null // Can be JSON string or already parsed array
  sync_results: string | null
  noor_sync_status: string | null
  synced_at: string | null
  error_log: string | null
  notes: string | null
  extension_version: string | null
  browser_info: string | null
  created_at: string
  updated_at: string
}

export interface SendSmsPayload {
  phone: string
  message: string
  student_id?: number
  message_type?: SmsMessageType
}

export interface RegisterDevicePayload {
  device_id: string
  device_name?: string
  device_model?: string
  android_version?: string
  app_version?: string
}

// إحصائيات جدول الانتظار المتقدمة
export interface StandbyAdvancedStatsTeacher {
  id: number | null
  name: string
  count: number
  percentage?: number
}

export interface StandbyAdvancedStatsRecommendation {
  type: 'success' | 'warning' | 'danger' | 'info'
  icon: string
  title: string
  message: string
  teachers?: StandbyAdvancedStatsTeacher[]
}

export interface StandbyAdvancedStats {
  period: {
    start_date: string
    end_date: string
    semester_name: string
  }
  summary: {
    total_assignments: number
    today: number
    this_week: number
    avg_per_day: number
    total_standby_teachers: number
    total_absent_teachers: number
    total_days: number
  }
  monthly_trend: Array<{
    year: number
    month: number
    label: string
    count: number
  }>
  by_day_of_week: Array<{
    day: number
    label: string
    count: number
  }>
  by_period_number: Array<{
    period: number
    label: string
    count: number
  }>
  top_standby_teachers: StandbyAdvancedStatsTeacher[]
  top_absent_teachers: StandbyAdvancedStatsTeacher[]
  by_priority: Array<{
    priority: number
    label: string
    count: number
  }>
  fairness_analysis: {
    coefficient_of_variation: number
    avg_assignments_per_teacher: number
    std_deviation: number
    overloaded_teachers: StandbyAdvancedStatsTeacher[]
    underutilized_teachers: StandbyAdvancedStatsTeacher[]
  }
  recommendations: StandbyAdvancedStatsRecommendation[]
}

export interface StandbyAdvancedStatsResponse {
  success: boolean
  data: StandbyAdvancedStats | null
  message?: string
}

// ===== TimeTable Import Types =====

export interface TimeTableDay {
  id: string
  name: string
  short: string
}

export interface TimeTablePeriod {
  id: string
  period_number: number
  start_time: string
  end_time: string
}

export interface TimeTableTeacherMatch {
  id: number
  name: string
  score: number
}

export interface TimeTableMatchedTeacher {
  xml_id: string
  xml_name: string
  xml_short: string
  match: TimeTableTeacherMatch | null
  status: 'matched' | 'unmatched'
}

export interface TimeTableSubjectMatch {
  id: number
  name: string
  score: number
}

export interface TimeTableMatchedSubject {
  xml_id: string
  xml_name: string
  xml_short: string
  match: TimeTableSubjectMatch | null
  status: 'matched' | 'unmatched'
}

export interface TimeTableParsedClass {
  xml_id: string
  xml_name: string
  xml_short: string
  parsed_grade: string
  parsed_class: string
}

export interface TimeTableAvailableTeacher {
  id: number
  name: string
}

export interface TimeTableAvailableSubject {
  id: number
  name: string
}

export interface TimeTablePreviewStats {
  total_cards: number
  total_teachers: number
  matched_teachers: number
  total_subjects: number
  matched_subjects: number
  total_classes: number
  total_days: number
  total_periods: number
}

export interface TimeTablePreviewData {
  days: TimeTableDay[]
  periods: TimeTablePeriod[]
  teachers: TimeTableMatchedTeacher[]
  subjects: TimeTableMatchedSubject[]
  classes: TimeTableParsedClass[]
  cards_count: number
  available_teachers: TimeTableAvailableTeacher[]
  available_subjects: TimeTableAvailableSubject[]
  stats: TimeTablePreviewStats
}

export interface TimeTablePreviewResponse {
  success: boolean
  data: TimeTablePreviewData
  message?: string
}

export interface TimeTableTeacherMapping {
  xml_id: string
  teacher_id: number | null
}

export interface TimeTableSubjectMapping {
  xml_id: string
  subject_id: number | null
}

export interface TimeTableClassMapping {
  xml_id: string
  grade: string
  class_name: string
}

export interface TimeTableConfirmPayload {
  file: File
  teacher_mappings: TimeTableTeacherMapping[]
  subject_mappings: TimeTableSubjectMapping[]
  class_mappings: TimeTableClassMapping[]
  replace_existing: boolean
}

export interface TimeTableConfirmStats {
  sessions_created: number
  sessions_replaced: number
  classes_count: number
  errors_count: number
}

export interface TimeTableConfirmResponse {
  success: boolean
  message: string
  stats: TimeTableConfirmStats
}

// ========== تحضير الحصص (Period Attendance) ==========

export interface PeriodHeader {
  period_number: number
  name: string
  start_time: string | null
  end_time: string | null
}

export interface PeriodCell {
  status: 'submitted' | 'not_submitted' | 'no_session'
  attendance_type: 'daily' | 'period' | null
  present: number
  absent: number
  late: number
  alerts_count: number
  teacher_name: string | null
  subject_name: string | null
  class_session_id?: number
}

export interface ClassPeriodRow {
  grade: string
  class_name: string
  periods: Record<number, PeriodCell>
}

export interface PeriodAttendanceGrid {
  classes: ClassPeriodRow[]
  period_headers: PeriodHeader[]
  date: string
  day_name: string
}

export interface PeriodAttendanceStudent {
  id: number
  student_id: number
  student_name: string
  student_number: string | null
  period_status: 'present' | 'absent' | 'late'
  daily_status: 'present' | 'absent' | 'late' | null
  attendance_type: 'daily' | 'period'
  late_minutes: number | null
  has_alert: boolean
  alert_status: 'new' | 'seen' | 'resolved' | null
}

export interface PeriodAttendanceDetails {
  students: PeriodAttendanceStudent[]
  summary: {
    total: number
    present: number
    absent: number
    late: number
  }
  session_info: {
    grade: string
    class_name: string
    period_number: number
    subject_name: string | null
    teacher_name: string | null
  }
}

export interface PeriodAbsenceAlert {
  id: number
  student_id: number
  student_name: string
  period_number: number
  subject_name: string | null
  teacher_name: string | null
  grade: string
  class_name: string
  alert_status: 'new' | 'seen' | 'resolved'
  created_at: string | null
}

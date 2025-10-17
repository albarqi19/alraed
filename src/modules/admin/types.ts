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
  }>
}

export type TeacherStatus = 'active' | 'inactive'

export interface TeacherRecord {
  id: number
  name: string
  national_id: string
  phone?: string | null
  status: TeacherStatus
  generated_password?: string | null
  needs_password_change?: boolean
  created_at?: string
  updated_at?: string
}

export interface TeacherCredentials {
  national_id: string
  password: string
}

export interface CreateTeacherResponse {
  teacher: TeacherRecord
  login_credentials?: TeacherCredentials
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
  errors_count?: number
  total_students?: number
  message?: string
  errors?: string[]
}

export interface ImportTeachersSummary extends ImportSummary {
  credentials?: TeacherCredentials[]
}

export interface AdminSettings {
  school_name: string
  school_phone: string
  whatsapp_webhook_url?: string | null
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

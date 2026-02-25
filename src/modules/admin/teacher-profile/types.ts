/**
 * أنواع ملف المعلم (Teacher Profile)
 */

// ========== بيانات المعلم الأساسية ==========
export interface TeacherProfileInfo {
  id: number
  name: string
  national_id: string
  phone: string | null
  role: string
  secondary_role: string | null
  status: 'active' | 'inactive'
  created_at: string | null
}

// ========== ملخص النظرة العامة ==========
export interface TeacherProfileSummary {
  teacher: TeacherProfileInfo
  attendance: {
    total_records: number
    present_days: number
    absent_days: number
    delayed_days: number
    on_time_days: number
    total_delay_minutes: number
    total_delay_hours: number
    avg_delay_minutes: number
  }
  delay_actions: {
    warnings_count: number
    deductions_count: number
  }
  schedule: {
    total_sessions: number
    subjects_count: number
    classes_count: number
  }
  messages: {
    total_sent: number
    sent_count: number
    failed_count: number
    replies_count: number
  }
  preparation: {
    is_linked: boolean
    total: number
    prepared: number
    unprepared: number
    rate: number
  }
  referrals_count: number
  period: {
    from: string
    to: string
  }
}

// ========== سجل الحضور ==========
export interface TeacherAttendanceRecord {
  id: number
  attendance_date: string
  status: 'present' | 'departed' | 'failed' | 'unknown' | 'absent'
  delay_status: 'on_time' | 'delayed' | 'excused' | 'unknown' | 'absent'
  delay_minutes: number | null
  check_in_time: string | null
  check_out_time: string | null
  login_method: string | null
  absence_reason: string | null
  absence_reason_label: string | null
}

export interface AttendanceSummary {
  total: number
  present: number
  absent: number
  delayed: number
  on_time: number
}

export interface TeacherAttendanceResponse {
  records: TeacherAttendanceRecord[]
  summary: AttendanceSummary
}

// ========== التأخرات ==========
export interface DelayExcuseInfo {
  id: number
  excuse_text: string
  status: 'pending' | 'approved' | 'rejected'
  review_notes: string | null
  submitted_at: string | null
}

export interface DelayInquiryInfo {
  id: number
  status: string
  response_text: string | null
  notified_at: string | null
  responded_at: string | null
}

export interface TeacherDelayRecord {
  id: number
  attendance_date: string
  delay_minutes: number
  check_in_time: string | null
  excuse: DelayExcuseInfo | null
  inquiry: DelayInquiryInfo | null
}

export interface DelaysSummary {
  total_delays: number
  total_minutes: number
  total_hours: number
  excused_count: number
  pending_excuses: number
}

export interface TeacherDelaysResponse {
  records: TeacherDelayRecord[]
  summary: DelaysSummary
}

// ========== التنبيهات والحسميات ==========
export interface DelayActionRecord {
  id: number
  action_type: 'warning' | 'deduction'
  total_delay_minutes: number
  deducted_minutes: number | null
  carried_over_minutes: number | null
  formatted_delay: string
  sequence_number: number
  fiscal_year: number
  calculation_start_date: string | null
  calculation_end_date: string | null
  is_printed: boolean
  is_signed: boolean
  is_notified: boolean
  notes: string | null
  created_at: string | null
}

export interface DelayActionsSummary {
  warnings: number
  deductions: number
  total_deducted_minutes: number
}

export interface TeacherDelayActionsResponse {
  actions: DelayActionRecord[]
  summary: DelayActionsSummary
}

// ========== الجدول الدراسي ==========
export interface ScheduleSession {
  id: number
  day: string
  period_number: number
  start_time: string | null
  end_time: string | null
  grade: string
  class_name: string
  subject_name: string
}

export interface ScheduleSummary {
  total_sessions: number
  subjects_count: number
  classes_count: number
}

export interface TeacherScheduleResponse {
  sessions: ScheduleSession[]
  by_day: Record<string, ScheduleSession[]>
  subjects: string[]
  classes: string[]
  summary: ScheduleSummary
}

// ========== المناوبة والإشراف ==========
export interface DutyRecord {
  id: number
  type: 'duty_schedule' | 'duty_shift' | 'standby'
  duty_date?: string
  schedule_date?: string
  duty_type?: string
  shift_type?: string
  period_number?: number
  status: string
  assignment_role?: string
  replacing_teacher?: string
}

export interface DutiesSummary {
  duty_schedule_count: number
  duty_shift_count: number
  standby_count: number
  total: number
}

export interface TeacherDutiesResponse {
  duties: DutyRecord[]
  summary: DutiesSummary
}

// ========== الرسائل ==========
export interface MessageReplyInfo {
  reply_text: string
  replied_at: string | null
  is_read: boolean
}

export interface TeacherMessageRecord {
  id: number
  template_key: string
  template_title: string
  message_content: string
  student_name: string | null
  parent_name: string | null
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_at: string | null
  reply: MessageReplyInfo | null
}

export interface MessagesSummary {
  total_sent: number
  delivered: number
  failed: number
  with_replies: number
  unread_replies: number
}

export interface TeacherMessagesResponse {
  messages: TeacherMessageRecord[]
  summary: MessagesSummary
}

// ========== التحضير ==========
export interface PreparationRecord {
  id: number
  extraction_date: string
  day: string
  period_number: number
  status: 'prepared' | 'waiting' | 'warning' | 'activity' | 'empty'
  status_text: string | null
  lesson_title: string
  class_name: string
  time_from: string | null
  time_to: string | null
}

export interface PreparationSummary {
  total: number
  prepared: number
  unprepared: number
  rate: number
}

export interface TeacherPreparationResponse {
  is_linked: boolean
  madrasati_name?: string
  records: PreparationRecord[]
  summary: PreparationSummary | null
}

// ========== الإحالات ==========
export interface ReferralRecord {
  id: number
  referral_number: string
  student_name: string | null
  referral_type: 'academic_weakness' | 'behavioral_violation' | 'student_absence'
  target_role: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  incident_date: string | null
  created_at: string | null
  completed_at: string | null
}

export interface ReferralsSummary {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
}

export interface TeacherReferralsResponse {
  referrals: ReferralRecord[]
  summary: ReferralsSummary
}

// ========== النقاط ==========
export interface PointTransactionRecord {
  id: number
  type: 'reward' | 'violation'
  amount: number
  student_name: string | null
  reason: string | null
  created_at: string | null
}

export interface PointsSummary {
  total_rewards: number
  total_violations: number
  rewards_count: number
  violations_count: number
}

export interface TeacherPointsResponse {
  transactions: PointTransactionRecord[]
  summary: PointsSummary
}

// ========== طلبات التغطية ==========
export interface CoverageRequestRecord {
  id: number
  request_date: string
  from_period: number
  to_period: number
  reason: string | null
  reason_type: string
  status: string
  items_count: number
  created_at: string | null
}

export interface CoverageRequestsSummary {
  total: number
  approved: number
  pending: number
}

export interface TeacherCoverageResponse {
  requests: CoverageRequestRecord[]
  summary: CoverageRequestsSummary
}

// ========== إحصائيات تحضير الطلاب ==========
export interface StudentAttendanceStatsCategory {
  total: number
  present: number
  absent: number
  days_recorded: number
}

export interface TeacherStudentAttendanceStats {
  daily: StudentAttendanceStatsCategory
  period: StudentAttendanceStatsCategory
}

// ========== المقارنة بمتوسط المدرسة ==========
export interface BenchmarkValues {
  avg_present_days: number
  avg_absent_days: number
  avg_delayed_days: number
  avg_delay_minutes: number
  avg_messages_per_teacher: number
  school_preparation_rate: number
  avg_referrals_per_teacher: number
}

export interface TeacherBenchmarksResponse {
  active_teachers: number
  benchmarks: BenchmarkValues | null
}

// ========== فلاتر مشتركة ==========
export interface DateRangeFilter {
  from?: string
  to?: string
}

// ========== أقسام التبويبات ==========
export type ProfileTabKey =
  | 'overview'
  | 'attendance'
  | 'delays'
  | 'teaching'
  | 'duties'
  | 'messages'
  | 'preparation'
  | 'referrals-reports'

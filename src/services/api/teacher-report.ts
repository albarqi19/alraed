import { apiClient } from './client'

export type TeacherReportSectionKey =
  | 'daily_attendance'
  | 'daily_lates'
  | 'daily_absences'
  | 'period_actions'
  | 'schedule'
  | 'preparation'
  | 'standby_coverage'
  | 'coverage_requests'
  | 'referrals_sent'
  | 'admin_messages'

export type TeacherReportSignatureKey = 'teacher' | 'supervisor' | 'deputy' | 'principal'

export interface TeacherReportRequestParams {
  start_date?: string
  end_date?: string
  semester_id?: number
  include: TeacherReportSectionKey[]
  signatures?: TeacherReportSignatureKey[]
}

export interface DailyAttendanceTotals {
  records: number
  present: number
  on_time: number
  delayed: number
  excused: number
  absent: number
  unknown: number
  total_delay_minutes: number
  attendance_rate_pct: number | null
}

export interface DailyAttendanceSection {
  count: number
  totals: DailyAttendanceTotals
}

export interface DailyLateItem {
  date: string | null
  check_in_time: string | null
  delay_minutes: number | null
  notes: string | null
}

export interface DailyLatesSection {
  count: number
  total_minutes: number
  items: DailyLateItem[]
}

export interface DailyAbsenceItem {
  date: string | null
  reason: string | null
  reason_label: string | null
  notes: string | null
  is_manual: boolean
}

export interface DailyAbsencesSection {
  count: number
  items: DailyAbsenceItem[]
}

export interface PeriodActionItem {
  date: string | null
  period_type: string
  period_label: string
  period_number: number | null
  action_type: string
  action_label: string
  subject_class: string | null
  grade: string | null
  class_name: string | null
  minutes: number | null
  recorded_by: string | null
  is_manual: boolean
  notes: string | null
}

export interface PeriodActionsTotals {
  class_absent: number
  class_late: number
  class_late_minutes: number
  early_leave: number
  early_leave_minutes: number
  duty_absent: number
  assembly_absences: number
  break_absences: number
  dismissal_absences: number
}

export interface PeriodActionsSection {
  count: number
  totals: PeriodActionsTotals
  items: PeriodActionItem[]
}

export interface ScheduleItem {
  day: string
  day_label: string
  period_number: number
  grade: string | null
  class_name: string | null
  subject: string | null
}

export interface ScheduleSection {
  count: number
  items: ScheduleItem[]
}

export interface PreparationItem {
  date: string | null
  day: string | null
  period_number: number | null
  lesson_title: string | null
  class_name: string | null
  status: string | null
  status_text: string | null
}

export interface PreparationSection {
  count: number
  totals: { prepared: number; not_prepared: number }
  items: PreparationItem[]
}

export interface StandbyCoverageItem {
  date: string | null
  period_number: number | null
  class: string | null
  status: string | null
  replacing_teacher: string | null
}

export interface StandbyCoverageSection {
  count: number
  totals: { assigned: number; completed: number; cancelled: number }
  items: StandbyCoverageItem[]
}

export interface CoverageRequestItem {
  date: string | null
  role: 'requester' | 'cover'
  role_label: string
  from_period: number | null
  to_period: number | null
  other_teacher: string | null
  status: string | null
  reason: string | null
}

export interface CoverageRequestsSection {
  count: number
  items: CoverageRequestItem[]
}

export interface ReferralSentItem {
  date: string | null
  referral_type: string | null
  referral_type_label: string
  priority: string | null
  priority_label: string
  status: string | null
  status_label: string
  student_name: string | null
  title: string | null
  reason: string | null
}

export interface ReferralsSentSection {
  count: number
  items: ReferralSentItem[]
}

export interface AdminMessageItem {
  date: string | null
  sent_at: string | null
  type: string | null
  type_label: string
  excerpt: string
}

export interface AdminMessagesSection {
  count: number
  totals: Record<string, number>
  items: AdminMessageItem[]
}

export interface SignatoryInfo {
  role_label: string
  name: string | null
}

export interface TeacherReportData {
  teacher: {
    id: number
    name: string
    national_id: string | null
    phone: string | null
    role: string | null
    role_label: string
    secondary_role: string | null
    secondary_role_label: string | null
  }
  school: {
    name: string | null
  }
  period: {
    from: string
    to: string
    semester_name: string | null
  }
  sections: {
    daily_attendance?: DailyAttendanceSection
    daily_lates?: DailyLatesSection
    daily_absences?: DailyAbsencesSection
    period_actions?: PeriodActionsSection
    schedule?: ScheduleSection
    preparation?: PreparationSection
    standby_coverage?: StandbyCoverageSection
    coverage_requests?: CoverageRequestsSection
    referrals_sent?: ReferralsSentSection
    admin_messages?: AdminMessagesSection
  }
  signatories: Partial<Record<TeacherReportSignatureKey, SignatoryInfo>>
  requested_signatures: TeacherReportSignatureKey[]
  generated_at: string
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

export async function fetchTeacherReport(
  teacherId: number,
  params: TeacherReportRequestParams,
): Promise<TeacherReportData> {
  const response = await apiClient.get<ApiEnvelope<TeacherReportData>>(
    `/admin/teachers/${teacherId}/report`,
    { params },
  )
  return response.data.data
}

import { apiClient } from './client'

export type StudentReportSectionKey =
  | 'absences'
  | 'leave_requests'
  | 'lates'
  | 'behavior_violations'
  | 'academic_weakness'
  | 'referrals'

export type StudentReportSignatureKey = 'parent' | 'deputy' | 'principal'

export interface StudentReportRequestParams {
  start_date?: string
  end_date?: string
  semester_id?: number
  include: StudentReportSectionKey[]
  signatures?: StudentReportSignatureKey[]
}

export interface AbsenceItem {
  date: string | null
  status: string | null
  recorded_at: string | null
  notes: string | null
}

export interface LeaveRequestItem {
  date: string | null
  expected_pickup_time: string | null
  reason: string | null
  status: string | null
  status_label: string
}

export interface LateItem {
  date: string | null
  recorded_at: string | null
  notes: string | null
}

export interface BehaviorViolationItem {
  date: string | null
  time: string | null
  violation_type: string | null
  degree: string | null
  status: string | null
  description: string | null
}

export interface EvaluationItem {
  date: string | null
  subject: string | null
  numeric_grade: string | number | null
  descriptive_grade: string | null
  notes: string | null
}

export interface AcademicReferralItem {
  date: string | null
  priority: string | null
  priority_label: string
  status: string | null
  status_label: string
  title: string | null
  reason: string | null
}

export interface ReferralItem extends AcademicReferralItem {
  referral_type: string | null
  referral_type_label: string
}

export interface SectionWithItems<T> {
  count: number
  items: T[]
}

export interface AcademicWeaknessSection {
  count: number
  evaluations: EvaluationItem[]
  referrals: AcademicReferralItem[]
}

export interface SignatoryInfo {
  role_label: string
  name: string | null
}

export interface StudentReportData {
  student: {
    id: number
    name: string
    national_id: string
    student_number: string | null
    grade: string | null
    class_name: string | null
    parent_name: string | null
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
    absences?: SectionWithItems<AbsenceItem>
    leave_requests?: SectionWithItems<LeaveRequestItem>
    lates?: SectionWithItems<LateItem>
    behavior_violations?: SectionWithItems<BehaviorViolationItem>
    academic_weakness?: AcademicWeaknessSection
    referrals?: SectionWithItems<ReferralItem>
  }
  signatories: Partial<Record<StudentReportSignatureKey, SignatoryInfo>>
  requested_signatures: StudentReportSignatureKey[]
  generated_at: string
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

export async function fetchStudentReport(
  studentId: number,
  params: StudentReportRequestParams,
): Promise<StudentReportData> {
  const response = await apiClient.get<ApiEnvelope<StudentReportData>>(
    `/admin/students/${studentId}/report`,
    { params },
  )
  return response.data.data
}

// أنواع موديول الأنشطة

export type ActivityStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ReportStatus = 'pending' | 'approved' | 'rejected'

export interface ActivityCreator {
  id: number
  name: string
}

// مكان التنفيذ
export interface ExecutionLocation {
  id: number
  name: string
  name_ar: string
  is_active: boolean
  sort_order: number
}

export interface Activity {
  id: number
  title: string
  description: string | null
  objectives: string[] | null // تم تغييرها من string إلى مصفوفة
  examples: string | null
  start_date: string
  end_date: string
  pdf_file: string | null
  target_grades: string[]
  status: ActivityStatus
  created_by: number
  creator?: ActivityCreator
  created_at?: string
  updated_at?: string
  reports_count?: number
  pending_reports_count?: number
  approved_reports_count?: number
  rejected_reports_count?: number
}

export interface ActivityReport {
  id: number
  activity_id: number
  teacher_id: number
  grade: string | null // الصف الدراسي للتقرير
  execution_location_id: number | null
  execution_location: string | null
  achieved_objectives: string[] | null // تم تغييرها من string إلى مصفوفة
  students_count: number
  images: string[]
  status: ReportStatus
  rejection_reason: string | null
  reviewed_by: number | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  teacher?: {
    id: number
    name: string
  }
  reviewer?: {
    id: number
    name: string
  }
}

// معلومات تقرير صف لمعلم معين (للوحة الإدارة)
export interface TeacherGradeReportInfo {
  grade: string
  has_report: boolean
  report_id: number | null
  report_status: ReportStatus | null
}

export interface TeacherWithReportStatus {
  id: number
  name: string
  total_grades: number
  submitted_grades: number
  grade_reports: TeacherGradeReportInfo[]
}

export interface ActivityWithDetails extends Activity {
  reports?: ActivityReport[]
}

export interface ActivityStats {
  total_activities: number
  active_activities: number
  draft_activities: number
  completed_activities: number
  total_reports: number
  pending_reports: number
  approved_reports: number
  rejected_reports: number
}

// معلومات الصف للمعلم مع حالة التقرير
export interface GradeReportInfo {
  grade: string
  has_report: boolean
  report_id: number | null
  report_status: ReportStatus | null
}

// معلومات تفصيلية للصف (للشاشة التفصيلية)
export interface GradeDetailInfo {
  grade: string
  students_count: number
  has_report: boolean
  report: {
    id: number
    execution_location_id: number | null
    execution_location: string | null
    achieved_objectives: string[] | null
    students_count: number
    images: string[]
    status: ReportStatus
    rejection_reason: string | null
    submitted_at: string
    reviewed_at: string | null
  } | null
}

export interface TeacherActivityView {
  id: number
  title: string
  description: string | null
  objectives: string[] | null // تم تغييرها من string إلى مصفوفة
  examples: string | null
  start_date: string
  end_date: string
  pdf_file: string | null
  target_grades: string[]
  teacher_grades: string[] // الصفوف المشتركة بين المعلم والنشاط
  creator?: ActivityCreator
  is_active: boolean
  has_started: boolean // هل بدأ النشاط
  is_late: boolean // هل التسليم متأخر
  grades_reports: GradeReportInfo[] // حالة التقارير لكل صف
  total_reports: number
  pending_reports: number
  approved_reports: number
  rejected_reports: number
}

export interface TeacherActivityDetails {
  data: {
    id: number
    title: string
    description: string | null
    objectives: string[] | null
    examples: string | null
    start_date: string
    end_date: string
    pdf_file: string | null
    target_grades: string[]
    creator?: ActivityCreator
    is_active: boolean
    has_started: boolean // هل بدأ النشاط
    is_late: boolean // هل التسليم متأخر
  }
  teacher_grades: string[]
  grades_info: GradeDetailInfo[]
  execution_locations: ExecutionLocation[]
}

export interface ActivityCreatePayload {
  title: string
  description?: string
  objectives?: string[] // تم تغييرها من string إلى مصفوفة
  examples?: string
  start_date: string
  end_date: string
  target_grades: string[]
  status?: ActivityStatus
  pdf_file?: File
}

export interface ActivityUpdatePayload extends Partial<ActivityCreatePayload> { }

export interface ReportSubmitPayload {
  grade: string // الصف المستهدف للتقرير
  execution_location_id: number // مكان التنفيذ
  achieved_objectives: string[] // الأهداف المحققة كمصفوفة
  students_count: number
  images?: File[]
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ActivitiesListResponse {
  data: Activity[]
  meta: PaginationMeta
}

export interface ActivityFilters {
  status?: ActivityStatus | 'all'
  page?: number
}

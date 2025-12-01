// أنواع موديول الأنشطة

export type ActivityStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type ReportStatus = 'pending' | 'approved' | 'rejected'

export interface ActivityCreator {
  id: number
  name: string
}

export interface Activity {
  id: number
  title: string
  description: string | null
  objectives: string | null
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
  execution_location: string | null
  achieved_objectives: string | null
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

export interface TeacherWithReportStatus {
  id: number
  name: string
  has_report: boolean
  report_status: ReportStatus | null
  report_id: number | null
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

export interface TeacherActivityView {
  id: number
  title: string
  description: string | null
  objectives: string | null
  examples: string | null
  start_date: string
  end_date: string
  pdf_file: string | null
  target_grades: string[]
  creator?: ActivityCreator
  is_active: boolean
  report: {
    id: number
    status: ReportStatus
    rejection_reason: string | null
    submitted_at: string
    reviewed_at: string | null
  } | null
}

export interface TeacherActivityDetails {
  data: TeacherActivityView
  students_count: number
  report: {
    id: number
    execution_location: string | null
    achieved_objectives: string | null
    students_count: number
    images: string[]
    status: ReportStatus
    rejection_reason: string | null
    submitted_at: string
    reviewed_at: string | null
  } | null
}

export interface ActivityCreatePayload {
  title: string
  description?: string
  objectives?: string
  examples?: string
  start_date: string
  end_date: string
  target_grades: string[]
  status?: ActivityStatus
  pdf_file?: File
}

export interface ActivityUpdatePayload extends Partial<ActivityCreatePayload> {}

export interface ReportSubmitPayload {
  execution_location: string
  achieved_objectives: string
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

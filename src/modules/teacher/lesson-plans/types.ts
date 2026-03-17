export interface AcademicWeekSummary {
  id: number
  week_number: number
  start_date: string
  end_date: string
  date_range: string
  is_current: boolean
}

export interface TeacherPlanSubject {
  subject_id: number
  subject_name: string
  grade: string
  has_curriculum: boolean
  is_mapped: boolean
  sessions_per_week: number
  curriculum_distribution_id: number | null
}

export interface LessonPlanSession {
  session_number: number
  topic: string
  lesson_title?: string
  objectives?: string
  homework?: string
  notes?: string
  curriculum_week_number?: number
  curriculum_session_number?: number
}

export type PlanStatus = 'draft' | 'teacher_approved' | 'admin_approved' | 'rejected'

export interface WeeklyLessonPlan {
  id: number
  teacher_id: number
  subject_id: number
  grade: string
  academic_week_id: number
  week_number: number
  sessions: LessonPlanSession[]
  status: PlanStatus
  teacher_approved_at: string | null
  admin_approved_at: string | null
  rejection_reason: string | null
  subject?: { id: number; name: string }
  academic_week?: AcademicWeekSummary
}

export interface SuggestedTopicsResponse {
  suggested_topics: LessonPlanSession[]
  all_topics: Array<{ week_number: number; session_number: number; topic: string }>
  sessions_per_week: number
  is_auto_suggested: boolean
  curriculum_distribution_id: number | null
  target_week_number: number
}

export interface StorePlanPayload {
  subject_id: number
  grade: string
  academic_week_id: number
  sessions: LessonPlanSession[]
}

export const STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'مسودة',
  teacher_approved: 'معتمد من المعلم',
  admin_approved: 'معتمد من الإدارة',
  rejected: 'مرفوض',
}

export const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  teacher_approved: 'bg-blue-100 text-blue-700',
  admin_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

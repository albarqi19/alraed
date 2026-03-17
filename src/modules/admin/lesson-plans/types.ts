export type PlanStatus = 'draft' | 'teacher_approved' | 'admin_approved' | 'rejected'

export interface LessonPlanSession {
  session_number: number
  topic: string
  lesson_title?: string
  objectives?: string
  homework?: string
  notes?: string
}

export interface AdminWeeklyLessonPlan {
  id: number
  school_id: number
  teacher_id: number
  subject_id: number
  grade: string
  academic_week_id: number
  week_number: number
  sessions: LessonPlanSession[]
  status: PlanStatus
  teacher_approved_at: string | null
  admin_approved_at: string | null
  admin_approved_by: number | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  teacher?: { id: number; name: string }
  subject?: { id: number; name: string }
  academic_week?: { id: number; week_number: number; start_date: string; end_date: string }
  approved_by_admin?: { id: number; name: string }
}

export interface LessonPlanStats {
  total: number
  draft: number
  pending_approval: number
  approved: number
  rejected: number
}

export interface CurriculumDistribution {
  id: number
  subject_name: string
  grade: string
  semester_code: string
  education_type: string | null
  sessions_per_week: number
  total_weeks: number
}

export interface UnmappedSubjectsData {
  unmapped_subjects: Array<{ id: number; name: string }>
  available_curriculum_names: string[]
}

export interface PaginatedPlans {
  data: AdminWeeklyLessonPlan[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'مسودة',
  teacher_approved: 'بانتظار الاعتماد',
  admin_approved: 'معتمد',
  rejected: 'مرفوض',
}

export const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  teacher_approved: 'bg-amber-100 text-amber-700',
  admin_approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

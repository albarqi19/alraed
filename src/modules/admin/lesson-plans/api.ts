import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  AdminWeeklyLessonPlan,
  LessonPlanStats,
  CurriculumDistribution,
  UnmappedSubjectsData,
  PaginatedPlans,
} from './types'

function unwrapResponse<T>(data: ApiResponse<T>, errorMessage: string): T {
  if (!data.success) throw new Error(data.message ?? errorMessage)
  return data.data as T
}

// ═══════════ الخطط ═══════════

export async function fetchLessonPlans(params: {
  teacher_id?: number
  subject_id?: number
  grade?: string
  academic_week_id?: number
  status?: string
  page?: number
}): Promise<PaginatedPlans> {
  const { data } = await apiClient.get<ApiResponse<PaginatedPlans>>('/admin/lesson-plans', { params })
  return unwrapResponse(data, 'تعذر تحميل الخطط')
}

export async function fetchLessonPlanDetail(id: number): Promise<AdminWeeklyLessonPlan> {
  const { data } = await apiClient.get<ApiResponse<AdminWeeklyLessonPlan>>(`/admin/lesson-plans/${id}`)
  return unwrapResponse(data, 'تعذر تحميل تفاصيل الخطة')
}

export async function approveLessonPlan(id: number): Promise<AdminWeeklyLessonPlan> {
  const { data } = await apiClient.post<ApiResponse<AdminWeeklyLessonPlan>>(
    `/admin/lesson-plans/${id}/approve`,
  )
  return unwrapResponse(data, 'تعذر اعتماد الخطة')
}

export async function rejectLessonPlan(
  id: number,
  rejectionReason: string,
): Promise<AdminWeeklyLessonPlan> {
  const { data } = await apiClient.post<ApiResponse<AdminWeeklyLessonPlan>>(
    `/admin/lesson-plans/${id}/reject`,
    { rejection_reason: rejectionReason },
  )
  return unwrapResponse(data, 'تعذر رفض الخطة')
}

// ═══════════ الإحصائيات ═══════════

export async function fetchLessonPlanStats(weekId?: number): Promise<LessonPlanStats> {
  const { data } = await apiClient.get<ApiResponse<LessonPlanStats>>('/admin/lesson-plans/stats', {
    params: weekId ? { academic_week_id: weekId } : {},
  })
  return unwrapResponse(data, 'تعذر تحميل الإحصائيات')
}

// ═══════════ التوزيعات ═══════════

export async function fetchCurriculumDistributions(): Promise<CurriculumDistribution[]> {
  const { data } = await apiClient.get<ApiResponse<CurriculumDistribution[]>>(
    '/admin/lesson-plans/curriculum',
  )
  return unwrapResponse(data, 'تعذر تحميل التوزيعات')
}

// ═══════════ ربط المواد ═══════════

export async function fetchUnmappedSubjects(): Promise<UnmappedSubjectsData> {
  const { data } = await apiClient.get<ApiResponse<UnmappedSubjectsData>>(
    '/admin/lesson-plans/unmapped-subjects',
  )
  return unwrapResponse(data, 'تعذر تحميل المواد')
}

export async function mapSubjectCurriculum(
  subjectId: number,
  curriculumSubjectName: string,
): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>('/admin/lesson-plans/map-subject', {
    subject_id: subjectId,
    curriculum_subject_name: curriculumSubjectName,
  })
  if (!data.success) throw new Error(data.message ?? 'تعذر ربط المادة')
}

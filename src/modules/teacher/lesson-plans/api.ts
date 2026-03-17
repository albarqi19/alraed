import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  AcademicWeekSummary,
  TeacherPlanSubject,
  WeeklyLessonPlan,
  SuggestedTopicsResponse,
  StorePlanPayload,
} from './types'

function unwrapResponse<T>(data: ApiResponse<T>, errorMessage: string): T {
  if (!data.success) throw new Error(data.message ?? errorMessage)
  return data.data as T
}

// ═══════════ المواد والأسابيع ═══════════

export async function fetchMySubjectsForPlanning(): Promise<TeacherPlanSubject[]> {
  const { data } = await apiClient.get<ApiResponse<TeacherPlanSubject[]>>(
    '/teacher/lesson-plans/my-subjects',
  )
  return unwrapResponse(data, 'تعذر تحميل المواد')
}

export async function fetchWeeks(): Promise<AcademicWeekSummary[]> {
  const { data } = await apiClient.get<ApiResponse<AcademicWeekSummary[]>>(
    '/teacher/lesson-plans/weeks',
  )
  return unwrapResponse(data, 'تعذر تحميل الأسابيع')
}

// ═══════════ خطط الأسبوع ═══════════

export async function fetchWeekPlans(weekId: number): Promise<WeeklyLessonPlan[]> {
  const { data } = await apiClient.get<ApiResponse<WeeklyLessonPlan[]>>(
    `/teacher/lesson-plans/week/${weekId}`,
  )
  return unwrapResponse(data, 'تعذر تحميل الخطط')
}

// ═══════════ الاقتراح الذكي ═══════════

export async function fetchSuggestedTopics(
  subjectId: number,
  grade: string,
  academicWeekId: number,
): Promise<SuggestedTopicsResponse> {
  const { data } = await apiClient.get<ApiResponse<SuggestedTopicsResponse>>(
    `/teacher/lesson-plans/suggest/${subjectId}`,
    { params: { grade, academic_week_id: academicWeekId } },
  )
  return unwrapResponse(data, 'تعذر تحميل المواضيع المقترحة')
}

// ═══════════ حفظ واعتماد ═══════════

export async function storePlan(payload: StorePlanPayload): Promise<WeeklyLessonPlan> {
  const { data } = await apiClient.post<ApiResponse<WeeklyLessonPlan>>(
    '/teacher/lesson-plans',
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ الخطة')
}

export async function approvePlan(planId: number): Promise<WeeklyLessonPlan> {
  const { data } = await apiClient.post<ApiResponse<WeeklyLessonPlan>>(
    `/teacher/lesson-plans/${planId}/approve`,
  )
  return unwrapResponse(data, 'تعذر اعتماد الخطة')
}

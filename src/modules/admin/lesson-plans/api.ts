import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type { AdminWeeklyLessonPlan } from './types'

function unwrapResponse<T>(data: ApiResponse<T>, errorMessage: string): T {
  if (!data.success) throw new Error(data.message ?? errorMessage)
  return data.data as T
}

// ═══════════ ملخص الأسابيع ═══════════

export interface WeekSummary {
  id: number
  week_number: number
  start_date: string
  end_date: string
  date_range: string
  is_current: boolean
  is_past: boolean
  total_teachers: number
  plans_count: number
  approved_count: number
  pending_count: number
  draft_count: number
  rejected_count: number
}

export async function fetchWeeksSummary(): Promise<WeekSummary[]> {
  const { data } = await apiClient.get<ApiResponse<WeekSummary[]>>(
    '/admin/lesson-plans/weeks-summary',
  )
  return unwrapResponse(data, 'تعذر تحميل ملخص الأسابيع')
}

// ═══════════ خطط أسبوع بالمعلم ═══════════

export interface TeacherWeekPlan {
  teacher_id: number
  teacher_name: string
  plans: Array<{
    id: number | null
    subject_id: number
    subject_name: string
    grade: string
    status: string // 'not_submitted' | 'draft' | 'teacher_approved' | 'admin_approved' | 'rejected'
    sessions_count: number
    sessions: Array<{ session_number: number; topic: string; homework?: string }>
  }>
  total_subjects: number
  submitted_count: number
  approved_count: number
  pending_count: number
}

export async function fetchWeekTeachers(weekId: number): Promise<TeacherWeekPlan[]> {
  const { data } = await apiClient.get<ApiResponse<TeacherWeekPlan[]>>(
    `/admin/lesson-plans/week/${weekId}/teachers`,
  )
  return unwrapResponse(data, 'تعذر تحميل خطط المعلمين')
}

// ═══════════ اعتماد ═══════════

export async function approveLessonPlan(id: number): Promise<AdminWeeklyLessonPlan> {
  const { data } = await apiClient.post<ApiResponse<AdminWeeklyLessonPlan>>(
    `/admin/lesson-plans/${id}/approve`,
  )
  return unwrapResponse(data, 'تعذر اعتماد الخطة')
}

export async function approveAllWeekPlans(weekId: number): Promise<{ approved_count: number }> {
  const { data } = await apiClient.post<ApiResponse<{ approved_count: number }>>(
    `/admin/lesson-plans/week/${weekId}/approve-all`,
  )
  return unwrapResponse(data, 'تعذر اعتماد الخطط')
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

// ═══════════ الإعدادات ═══════════

export interface LessonPlanSettings {
  reminder_enabled: boolean
  reminder_day: string
  reminder_time: string
  reminder_message: string
}

export async function fetchLessonPlanSettings(): Promise<LessonPlanSettings> {
  const { data } = await apiClient.get<ApiResponse<LessonPlanSettings>>(
    '/admin/lesson-plans/settings',
  )
  return unwrapResponse(data, 'تعذر تحميل الإعدادات')
}

export async function updateLessonPlanSettings(
  settings: LessonPlanSettings,
): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<void>>(
    '/admin/lesson-plans/settings',
    settings,
  )
  unwrapResponse(data, 'تعذر حفظ الإعدادات')
}

// ═══════════ إرسال لأولياء الأمور ═══════════

export async function sendPlansToParents(
  weekId: number,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    `/admin/lesson-plans/week/${weekId}/send-to-parents`,
  )
  return unwrapResponse(data, 'تعذر إرسال الخطط')
}

// ═══════════ الصفوف + PDF ═══════════

export async function fetchWeekGrades(weekId: number): Promise<string[]> {
  const { data } = await apiClient.get<ApiResponse<string[]>>(
    `/admin/lesson-plans/week/${weekId}/grades`,
  )
  return unwrapResponse(data, 'تعذر تحميل الصفوف')
}

export function downloadWeekPdf(weekId: number, grade: string): void {
  const baseUrl = apiClient.defaults.baseURL ?? ''
  const token = localStorage.getItem('token') ?? ''
  const url = `${baseUrl}/admin/lesson-plans/week/${weekId}/pdf?grade=${encodeURIComponent(grade)}&token=${encodeURIComponent(token)}`
  window.open(url, '_blank')
}

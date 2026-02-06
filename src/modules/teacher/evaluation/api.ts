import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  SessionEvaluationConfig,
  StudentEvaluation,
  SaveEvaluationPayload,
  BulkEvaluationPayload,
  SubjectSkill,
  SubjectSkillFormPayload,
} from './types'

function unwrapResponse<T>(data: ApiResponse<T>, errorMessage: string): T {
  if (!data.success) throw new Error(data.message ?? errorMessage)
  return data.data as T
}

// ═══════════ تقييم الطلاب ═══════════

export async function fetchSessionEvaluationConfig(sessionId: number): Promise<SessionEvaluationConfig> {
  const { data } = await apiClient.get<ApiResponse<SessionEvaluationConfig>>(
    `/teacher/sessions/${sessionId}/evaluation-config`,
  )
  return unwrapResponse(data, 'تعذر تحميل إعدادات التقييم')
}

export async function fetchStudentEvaluations(sessionId: number, studentId: number): Promise<StudentEvaluation[]> {
  const { data } = await apiClient.get<ApiResponse<StudentEvaluation[]>>(
    `/teacher/sessions/${sessionId}/students/${studentId}/evaluations`,
  )
  return unwrapResponse(data, 'تعذر تحميل تقييمات الطالب')
}

export async function saveEvaluation(
  sessionId: number,
  studentId: number,
  payload: SaveEvaluationPayload,
): Promise<StudentEvaluation | null> {
  const { data } = await apiClient.post<ApiResponse<StudentEvaluation | null>>(
    `/teacher/sessions/${sessionId}/students/${studentId}/evaluations`,
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ التقييم')
}

export async function saveBulkEvaluation(
  sessionId: number,
  payload: BulkEvaluationPayload,
): Promise<{ saved_count: number; updated_count: number }> {
  const { data } = await apiClient.post<ApiResponse<{ saved_count: number; updated_count: number }>>(
    `/teacher/sessions/${sessionId}/bulk-evaluations`,
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ التقييم الجماعي')
}

export async function removeEvaluation(sessionId: number, studentId: number, evaluationId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/teacher/sessions/${sessionId}/students/${studentId}/evaluations/${evaluationId}`,
  )
  unwrapResponse(data, 'تعذر حذف التقييم')
}

export async function fetchSessionEvaluationsSummary(
  sessionId: number,
): Promise<Record<number, StudentEvaluation[]>> {
  const { data } = await apiClient.get<ApiResponse<Record<number, StudentEvaluation[]>>>(
    `/teacher/sessions/${sessionId}/evaluations-summary`,
  )
  return unwrapResponse(data, 'تعذر تحميل ملخص التقييمات')
}

// ═══════════ مواد المعلم ═══════════

export interface TeacherSubject {
  id: number
  name: string
  skills_count: number
}

export async function fetchTeacherSubjects(): Promise<TeacherSubject[]> {
  const { data } = await apiClient.get<ApiResponse<TeacherSubject[]>>('/teacher/my-subjects')
  return unwrapResponse(data, 'تعذر تحميل المواد')
}

// ═══════════ مهارات المعلم ═══════════

export async function fetchTeacherSubjectSkills(subjectId: number): Promise<SubjectSkill[]> {
  const { data } = await apiClient.get<ApiResponse<SubjectSkill[]>>(
    `/teacher/subjects/${subjectId}/skills`,
  )
  return unwrapResponse(data, 'تعذر تحميل مهارات المادة')
}

export async function createSubjectSkill(subjectId: number, payload: SubjectSkillFormPayload): Promise<SubjectSkill> {
  const { data } = await apiClient.post<ApiResponse<SubjectSkill>>(
    `/teacher/subjects/${subjectId}/skills`,
    payload,
  )
  return unwrapResponse(data, 'تعذر إنشاء المهارة')
}

export async function updateSubjectSkill(
  subjectId: number,
  skillId: number,
  payload: Partial<SubjectSkillFormPayload>,
): Promise<SubjectSkill> {
  const { data } = await apiClient.put<ApiResponse<SubjectSkill>>(
    `/teacher/subjects/${subjectId}/skills/${skillId}`,
    payload,
  )
  return unwrapResponse(data, 'تعذر تحديث المهارة')
}

export async function deleteSubjectSkill(subjectId: number, skillId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/teacher/subjects/${subjectId}/skills/${skillId}`,
  )
  unwrapResponse(data, 'تعذر حذف المهارة')
}

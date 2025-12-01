/**
 * API functions for Guidance module - uses standard auth token (no separate guidance token needed)
 */
import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  GuidanceCaseAction,
  GuidanceCaseDocument,
  GuidanceCaseFilters,
  GuidanceCaseFollowup,
  GuidanceCaseRecord,
  GuidancePaginatedResponse,
  GuidanceStatsSummary,
  GuidanceStudentSummary,
  TreatmentPlan,
  TreatmentPlanFilters,
  TreatmentPlanFormData,
  TreatmentGoal,
  TreatmentGoalFormData,
  TreatmentFollowup,
  TreatmentFollowupFormData,
  TreatmentEvaluation,
  TreatmentEvaluationFormData,
  TreatmentIntervention,
} from '@/modules/guidance/types'

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallback)
  }
  return response.data
}

// ==================== Student Cases API ====================

export async function fetchGuidanceCases(filters: GuidanceCaseFilters) {
  const { data } = await apiClient.get<ApiResponse<GuidancePaginatedResponse<GuidanceCaseRecord>>>(
    '/guidance/cases',
    { params: filters },
  )
  return unwrap(data, 'تعذر تحميل الحالات الطلابية')
}

export async function fetchGuidanceStats() {
  const { data } = await apiClient.get<ApiResponse<GuidanceStatsSummary>>('/guidance/cases/stats')
  return unwrap(data, 'تعذر تحميل ملخص الحالات')
}

export async function fetchGuidanceStudents() {
  const { data } = await apiClient.get<ApiResponse<GuidanceStudentSummary[]>>('/guidance/cases/students')
  return unwrap(data, 'تعذر تحميل قائمة الطلاب')
}

export async function createGuidanceCase(payload: Partial<GuidanceCaseRecord>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>('/guidance/cases', {
    student_id: payload.student_id,
    category: payload.category,
    title: payload.title,
    summary: payload.summary,
    severity: payload.severity,
    assigned_user_id: payload.assigned_user_id,
    tags: payload.tags,
    metadata: payload.metadata,
  })
  return unwrap(data, 'تعذر إنشاء الحالة')
}

export async function updateGuidanceCase(id: number, payload: Partial<GuidanceCaseRecord>) {
  const { data } = await apiClient.put<ApiResponse<GuidanceCaseRecord>>(`/guidance/cases/${id}`, {
    category: payload.category,
    title: payload.title,
    summary: payload.summary,
    status: payload.status,
    severity: payload.severity,
    assigned_user_id: payload.assigned_user_id,
    tags: payload.tags,
    metadata: payload.metadata,
  })
  return unwrap(data, 'تعذر تحديث الحالة')
}

export async function closeGuidanceCase(id: number) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>(`/guidance/cases/${id}/close`)
  return unwrap(data, 'تعذر إغلاق الحالة')
}

export async function reopenGuidanceCase(id: number) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>(`/guidance/cases/${id}/reopen`)
  return unwrap(data, 'تعذر إعادة فتح الحالة')
}

export async function deleteGuidanceCase(id: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/guidance/cases/${id}`)
  return unwrap(data, 'تعذر حذف الحالة')
}

export async function fetchGuidanceCase(id: number) {
  const { data } = await apiClient.get<ApiResponse<GuidanceCaseRecord>>(`/guidance/cases/${id}`)
  return unwrap(data, 'تعذر تحميل تفاصيل الحالة')
}

export async function createGuidanceAction(caseId: number, payload: Partial<GuidanceCaseAction>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseAction>>(
    `/guidance/cases/${caseId}/actions`,
    payload,
  )
  return unwrap(data, 'تعذر إضافة الإجراء')
}

export async function createGuidanceFollowup(caseId: number, payload: Partial<GuidanceCaseFollowup>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseFollowup>>(
    `/guidance/cases/${caseId}/followups`,
    payload,
  )
  return unwrap(data, 'تعذر إضافة المتابعة')
}

export async function updateGuidanceFollowupStatus(
  caseId: number,
  followupId: number,
  payload: { status: GuidanceCaseFollowup['status']; notes?: string | null },
) {
  const { data } = await apiClient.patch<ApiResponse<GuidanceCaseFollowup>>(
    `/guidance/cases/${caseId}/followups/${followupId}`,
    payload,
  )
  return unwrap(data, 'تعذر تحديث حالة المتابعة')
}

export async function uploadGuidanceDocument(caseId: number, file: File, description?: string | null) {
  const formData = new FormData()
  formData.append('file', file)
  if (description) {
    formData.append('description', description)
  }

  const { data } = await apiClient.post<ApiResponse<GuidanceCaseDocument>>(
    `/guidance/cases/${caseId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return unwrap(data, 'تعذر رفع الملف')
}

// ==================== Treatment Plans API ====================

export async function fetchTreatmentPlans(filters: TreatmentPlanFilters) {
  const { data } = await apiClient.get<ApiResponse<GuidancePaginatedResponse<TreatmentPlan>>>(
    '/guidance/treatment-plans',
    { params: filters },
  )
  // الـ API يرجع {success, data, current_page, ...} ونحتاج نرجع الكل للـ pagination
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر جلب الخطط العلاجية')
  }
  // نرجع الـ response الكامل للـ pagination
  return {
    data: data.data,
    current_page: (data as any).current_page ?? 1,
    per_page: (data as any).per_page ?? 20,
    total: (data as any).total ?? 0,
    last_page: (data as any).last_page ?? 1,
  }
}

export async function fetchTreatmentPlan(planId: number) {
  const { data } = await apiClient.get<ApiResponse<TreatmentPlan>>(`/guidance/treatment-plans/${planId}`)
  return unwrap(data, 'تعذر جلب الخطة العلاجية')
}

export async function createTreatmentPlan(formData: TreatmentPlanFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentPlan>>('/guidance/treatment-plans', formData)
  return unwrap(data, 'تعذر إنشاء الخطة العلاجية')
}

export async function updateTreatmentPlan(planId: number, formData: Partial<TreatmentPlanFormData>) {
  const { data } = await apiClient.put<ApiResponse<TreatmentPlan>>(
    `/guidance/treatment-plans/${planId}`,
    formData,
  )
  return unwrap(data, 'تعذر تحديث الخطة العلاجية')
}

export async function deleteTreatmentPlan(planId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/guidance/treatment-plans/${planId}`)
  return unwrap(data, 'تعذر حذف الخطة العلاجية')
}

// Goals API
export async function addTreatmentGoal(planId: number, goalData: TreatmentGoalFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentGoal>>(
    `/guidance/treatment-plans/${planId}/goals`,
    goalData,
  )
  return unwrap(data, 'تعذر إضافة الهدف')
}

export async function updateTreatmentGoal(
  planId: number,
  goalId: number,
  goalData: Partial<TreatmentGoalFormData>,
) {
  const { data } = await apiClient.put<ApiResponse<TreatmentGoal>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}`,
    goalData,
  )
  return unwrap(data, 'تعذر تحديث الهدف')
}

export async function deleteTreatmentGoal(planId: number, goalId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}`,
  )
  return unwrap(data, 'تعذر حذف الهدف')
}

// Interventions API
export async function addIntervention(
  planId: number,
  goalId: number,
  interventionData: { intervention_type: string; description: string },
) {
  const { data } = await apiClient.post<ApiResponse<TreatmentIntervention>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}/interventions`,
    interventionData,
  )
  return unwrap(data, 'تعذر إضافة التدخل')
}

export async function deleteIntervention(planId: number, goalId: number, interventionId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}/interventions/${interventionId}`,
  )
  return unwrap(data, 'تعذر حذف التدخل')
}

// Followups API
export async function addTreatmentFollowup(planId: number, followupData: TreatmentFollowupFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentFollowup>>(
    `/guidance/treatment-plans/${planId}/followups`,
    followupData,
  )
  return unwrap(data, 'تعذر إضافة المتابعة')
}

// Evaluations API
export async function addTreatmentEvaluation(planId: number, evaluationData: TreatmentEvaluationFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentEvaluation>>(
    `/guidance/treatment-plans/${planId}/evaluations`,
    evaluationData,
  )
  return unwrap(data, 'تعذر إضافة التقييم')
}

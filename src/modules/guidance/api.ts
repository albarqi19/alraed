import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  GuidanceAccessSessionResponse,
  GuidanceCaseAction,
  GuidanceCaseDocument,
  GuidanceCaseFilters,
  GuidanceCaseFollowup,
  GuidanceCaseRecord,
  GuidanceOtpVerificationResponse,
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
} from './types'

function applyGuidanceToken(token: string | null | undefined) {
  return token
    ? {
        headers: {
          'X-Guidance-Token': token,
        },
      }
    : undefined
}

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallback)
  }
  return response.data
}

export async function requestGuidanceAccess(secret: string) {
  const { data } = await apiClient.post<ApiResponse<GuidanceAccessSessionResponse>>('/guidance/request-access', {
    secret,
  })
  return unwrap(data, 'تعذر إرسال رمز التحقق')
}

export async function verifyGuidanceOtp(sessionId: number, code: string) {
  const { data } = await apiClient.post<ApiResponse<GuidanceOtpVerificationResponse>>('/guidance/verify-otp', {
    session_id: sessionId,
    code,
  })
  return unwrap(data, 'تعذر التحقق من الرمز')
}

export async function fetchGuidanceCases(token: string, filters: GuidanceCaseFilters) {
  const { data } = await apiClient.get<ApiResponse<GuidancePaginatedResponse<GuidanceCaseRecord>>>(
    '/guidance/cases',
    {
      params: filters,
      ...applyGuidanceToken(token),
    },
  )

  return unwrap(data, 'تعذر تحميل الحالات الطلابية')
}

export async function fetchGuidanceStats(token: string) {
  const { data } = await apiClient.get<ApiResponse<GuidanceStatsSummary>>('/guidance/cases/stats', applyGuidanceToken(token))
  return unwrap(data, 'تعذر تحميل ملخص الحالات')
}

export async function fetchGuidanceStudents(token: string) {
  const { data } = await apiClient.get<ApiResponse<GuidanceStudentSummary[]>>(
    '/guidance/cases/students',
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر تحميل قائمة الطلاب')
}

export async function createGuidanceCase(token: string, payload: Partial<GuidanceCaseRecord>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>(
    '/guidance/cases',
    {
      student_id: payload.student_id,
      category: payload.category,
      title: payload.title,
      summary: payload.summary,
      severity: payload.severity,
      assigned_user_id: payload.assigned_user_id,
      tags: payload.tags,
      metadata: payload.metadata,
    },
    applyGuidanceToken(token),
  )

  return unwrap(data, 'تعذر إنشاء الحالة')
}

export async function updateGuidanceCase(token: string, id: number, payload: Partial<GuidanceCaseRecord>) {
  const { data } = await apiClient.put<ApiResponse<GuidanceCaseRecord>>(
    `/guidance/cases/${id}`,
    {
      category: payload.category,
      title: payload.title,
      summary: payload.summary,
      status: payload.status,
      severity: payload.severity,
      assigned_user_id: payload.assigned_user_id,
      tags: payload.tags,
      metadata: payload.metadata,
    },
    applyGuidanceToken(token),
  )

  return unwrap(data, 'تعذر تحديث الحالة')
}

export async function closeGuidanceCase(token: string, id: number) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>(
    `/guidance/cases/${id}/close`,
    undefined,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إغلاق الحالة')
}

export async function reopenGuidanceCase(token: string, id: number) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseRecord>>(
    `/guidance/cases/${id}/reopen`,
    undefined,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إعادة فتح الحالة')
}

export async function fetchGuidanceCase(token: string, id: number) {
  const { data } = await apiClient.get<ApiResponse<GuidanceCaseRecord>>(
    `/guidance/cases/${id}`,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر تحميل تفاصيل الحالة')
}

export async function createGuidanceAction(token: string, caseId: number, payload: Partial<GuidanceCaseAction>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseAction>>(
    `/guidance/cases/${caseId}/actions`,
    payload,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة الإجراء')
}

export async function createGuidanceFollowup(token: string, caseId: number, payload: Partial<GuidanceCaseFollowup>) {
  const { data } = await apiClient.post<ApiResponse<GuidanceCaseFollowup>>(
    `/guidance/cases/${caseId}/followups`,
    payload,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة المتابعة')
}

export async function updateGuidanceFollowupStatus(
  token: string,
  caseId: number,
  followupId: number,
  payload: { status: GuidanceCaseFollowup['status']; notes?: string | null },
) {
  const { data } = await apiClient.patch<ApiResponse<GuidanceCaseFollowup>>(
    `/guidance/cases/${caseId}/followups/${followupId}`,
    payload,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر تحديث حالة المتابعة')
}

export async function uploadGuidanceDocument(token: string, caseId: number, file: File, description?: string | null) {
  const formData = new FormData()
  formData.append('file', file)
  if (description) {
    formData.append('description', description)
  }

  const { data } = await apiClient.post<ApiResponse<GuidanceCaseDocument>>(
    `/guidance/cases/${caseId}/documents`,
    formData,
    {
      ...applyGuidanceToken(token),
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Guidance-Token': token,
      },
    },
  )

  return unwrap(data, 'تعذر رفع الملف')
}

// ==================== Treatment Plans API ====================

export async function fetchTreatmentPlans(token: string, filters: TreatmentPlanFilters) {
  const { data } = await apiClient.get<ApiResponse<GuidancePaginatedResponse<TreatmentPlan>>>(
    '/guidance/treatment-plans',
    {
      params: filters,
      ...applyGuidanceToken(token),
    },
  )
  return unwrap(data, 'تعذر جلب الخطط العلاجية')
}

export async function fetchTreatmentPlan(token: string, planId: number) {
  const { data } = await apiClient.get<ApiResponse<TreatmentPlan>>(
    `/guidance/treatment-plans/${planId}`,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر جلب الخطة العلاجية')
}

export async function createTreatmentPlan(token: string, formData: TreatmentPlanFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentPlan>>(
    '/guidance/treatment-plans',
    formData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إنشاء الخطة العلاجية')
}

export async function updateTreatmentPlan(token: string, planId: number, formData: Partial<TreatmentPlanFormData>) {
  const { data } = await apiClient.put<ApiResponse<TreatmentPlan>>(
    `/guidance/treatment-plans/${planId}`,
    formData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر تحديث الخطة العلاجية')
}

export async function deleteTreatmentPlan(token: string, planId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/guidance/treatment-plans/${planId}`,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر حذف الخطة العلاجية')
}

// Goals API
export async function addTreatmentGoal(token: string, planId: number, goalData: TreatmentGoalFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentGoal>>(
    `/guidance/treatment-plans/${planId}/goals`,
    goalData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة الهدف')
}

export async function updateTreatmentGoal(
  token: string,
  planId: number,
  goalId: number,
  goalData: Partial<TreatmentGoalFormData>,
) {
  const { data } = await apiClient.put<ApiResponse<TreatmentGoal>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}`,
    goalData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر تحديث الهدف')
}

export async function deleteTreatmentGoal(token: string, planId: number, goalId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}`,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر حذف الهدف')
}

// Interventions API
export async function addIntervention(
  token: string,
  planId: number,
  goalId: number,
  interventionData: { intervention_type: string; description: string },
) {
  const { data } = await apiClient.post<ApiResponse<TreatmentIntervention>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}/interventions`,
    interventionData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة التدخل')
}

export async function deleteIntervention(token: string, planId: number, goalId: number, interventionId: number) {
  const { data } = await apiClient.delete<ApiResponse<void>>(
    `/guidance/treatment-plans/${planId}/goals/${goalId}/interventions/${interventionId}`,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر حذف التدخل')
}

// Followups API
export async function addTreatmentFollowup(token: string, planId: number, followupData: TreatmentFollowupFormData) {
  const { data } = await apiClient.post<ApiResponse<TreatmentFollowup>>(
    `/guidance/treatment-plans/${planId}/followups`,
    followupData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة المتابعة')
}

// Evaluations API
export async function addTreatmentEvaluation(
  token: string,
  planId: number,
  evaluationData: TreatmentEvaluationFormData,
) {
  const { data } = await apiClient.post<ApiResponse<TreatmentEvaluation>>(
    `/guidance/treatment-plans/${planId}/evaluations`,
    evaluationData,
    applyGuidanceToken(token),
  )
  return unwrap(data, 'تعذر إضافة التقييم')
}


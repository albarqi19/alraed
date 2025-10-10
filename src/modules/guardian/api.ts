import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  GuardianLeaveRequestPayload,
  GuardianLeaveRequestRecord,
  GuardianStudentSummary,
  GuardianPortalSettings,
} from './types'
import type { LeaveRequestStatus } from '@/modules/admin/types'

interface GuardianSubmissionResponse {
  id: number
  status: LeaveRequestStatus
}

interface GuardianRequestsResponse {
  id: number
  status: LeaveRequestStatus
  reason: string
  pickup_person_name: string
  expected_pickup_time?: string | null
  decision_notes?: string | null
  submitted_at: string
  decision_at?: string | null
}

interface GuardianSettingsResponse {
  school_name: string
  school_phone?: string | null
}

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallback)
  }
  return response.data
}

export async function lookupGuardianStudent(nationalId: string): Promise<GuardianStudentSummary> {
  const { data } = await apiClient.get<ApiResponse<GuardianStudentSummary>>('/public/leave-requests/student', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر العثور على الطالب')
}

export async function submitGuardianLeaveRequest(
  payload: GuardianLeaveRequestPayload,
): Promise<GuardianSubmissionResponse> {
  const { data } = await apiClient.post<ApiResponse<GuardianSubmissionResponse>>('/public/leave-requests', payload)
  return unwrap(data, 'تعذر إرسال طلب الاستئذان')
}

export async function fetchGuardianLeaveRequests(nationalId: string): Promise<GuardianLeaveRequestRecord[]> {
  const { data } = await apiClient.get<ApiResponse<GuardianRequestsResponse[]>>('/public/leave-requests', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل طلبات الاستئذان')
}

export async function fetchGuardianPortalSettings(): Promise<GuardianPortalSettings> {
  const { data } = await apiClient.get<ApiResponse<GuardianSettingsResponse>>('/public/leave-requests/settings')
  return unwrap(data, 'تعذر تحميل بيانات المدرسة')
}

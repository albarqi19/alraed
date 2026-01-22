import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  GuardianLeaveRequestPayload,
  GuardianLeaveRequestRecord,
  GuardianStudentSummary,
  GuardianPortalSettings,
  GuardianStoreOverview,
  GuardianStoreCatalog,
  GuardianStoreOrderRecord,
  GuardianStoreOrderPayload,
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

export async function fetchGuardianStoreOverview(nationalId: string): Promise<GuardianStoreOverview> {
  const { data } = await apiClient.get<ApiResponse<GuardianStoreOverview>>('/public/e-store/student', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل بيانات نقاط الطالب')
}

export async function fetchGuardianStoreCatalog(nationalId: string): Promise<GuardianStoreCatalog> {
  const { data } = await apiClient.get<ApiResponse<GuardianStoreCatalog>>('/public/e-store/catalog', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل منتجات المتجر')
}

export async function fetchGuardianStoreOrders(nationalId: string): Promise<GuardianStoreOrderRecord[]> {
  const { data } = await apiClient.get<ApiResponse<GuardianStoreOrderRecord[]>>('/public/e-store/orders', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل طلبات المتجر')
}

export async function submitGuardianStoreOrder(payload: GuardianStoreOrderPayload): Promise<GuardianStoreOrderRecord> {
  const { data } = await apiClient.post<ApiResponse<GuardianStoreOrderRecord>>('/public/e-store/orders', payload)
  return unwrap(data, 'تعذر إرسال طلب الاستبدال')
}

// ================== Guardian Dashboard APIs ==================

export interface GuardianAttendanceStats {
  present_days: number
  absent_days: number
  late_days: number
  excused_days: number
  attendance_rate: number
  total_days: number
  period: string
}

export interface GuardianBehaviorStats {
  positive_count: number
  negative_count: number
  positive_points: number
  negative_points: number
  balance: number
}

export interface GuardianPointsStats {
  total: number
  lifetime_rewards: number
  lifetime_violations: number
  lifetime_redemptions: number
}

export interface GuardianDashboardData {
  attendance: GuardianAttendanceStats
  behavior: GuardianBehaviorStats
  points: GuardianPointsStats
}

export interface GuardianMessage {
  id: number
  type: 'absence' | 'late' | 'teacher' | 'general'
  title: string
  content: string
  date: string
  datetime: string
  is_read: boolean
  teacher_name?: string | null
}

export interface GuardianMessagesData {
  messages: GuardianMessage[]
  total: number
  unread: number
}

export interface GuardianAttendanceRecord {
  id: number
  date: string
  status: string
  status_text: string
  session?: number | null
}

export interface GuardianLateArrival {
  id: number
  date: string
  minutes: number
  reason?: string | null
}

export interface GuardianAttendanceData {
  records: GuardianAttendanceRecord[]
  late_arrivals: GuardianLateArrival[]
}

export interface GuardianProcedureTask {
  title: string
  completed: boolean
  role_label?: string | null
  action_category_label?: string | null
}

export interface GuardianProcedure {
  step: number
  repetition: number
  completed: boolean
  completed_date?: string | null
  notes?: string | null
  tasks: GuardianProcedureTask[]
}

export interface GuardianBehaviorViolation {
  id: string
  code: string
  degree: number
  degree_label: string
  violation_type: string
  description: string
  location?: string | null
  incident_date: string
  incident_time?: string | null
  reported_by: string
  status: string
  status_label: string
  procedures_count: number
  procedures_completed: number
  procedures_progress: number
  procedures: GuardianProcedure[]
  created_at: string
}

export interface GuardianBehaviorData {
  violations: GuardianBehaviorViolation[]
  total: number
  pending: number
  completed: number
}

export async function fetchGuardianDashboard(nationalId: string): Promise<GuardianDashboardData> {
  const { data } = await apiClient.get<ApiResponse<GuardianDashboardData>>('/public/guardian/dashboard', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل بيانات الطالب')
}

export async function fetchGuardianMessages(nationalId: string): Promise<GuardianMessagesData> {
  const { data } = await apiClient.get<ApiResponse<GuardianMessagesData>>('/public/guardian/messages', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل الرسائل')
}

export async function fetchGuardianAttendance(nationalId: string): Promise<GuardianAttendanceData> {
  const { data } = await apiClient.get<ApiResponse<GuardianAttendanceData>>('/public/guardian/attendance', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل سجل المواظبة')
}

export async function fetchGuardianBehavior(nationalId: string): Promise<GuardianBehaviorData> {
  const { data } = await apiClient.get<ApiResponse<GuardianBehaviorData>>('/public/guardian/behavior', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل سجل السلوك')
}

// ================== Guardian Absence Excuses APIs ==================

import type {
  GuardianAbsencesResponse,
  GuardianSubmitExcusePayload,
  GuardianSubmitExcuseResponse,
} from './types'

export async function fetchGuardianAbsences(nationalId: string): Promise<GuardianAbsencesResponse> {
  const { data } = await apiClient.get<ApiResponse<GuardianAbsencesResponse>>('/public/guardian/absences', {
    params: { national_id: nationalId },
  })
  return unwrap(data, 'تعذر تحميل سجل الغياب')
}

export async function submitGuardianExcuse(payload: GuardianSubmitExcusePayload): Promise<GuardianSubmitExcuseResponse> {
  const formData = new FormData()
  formData.append('national_id', payload.national_id)
  formData.append('attendance_id', payload.attendance_id.toString())
  formData.append('excuse_text', payload.excuse_text)
  formData.append('file', payload.file)
  if (payload.parent_name) {
    formData.append('parent_name', payload.parent_name)
  }

  const { data } = await apiClient.post<ApiResponse<GuardianSubmitExcuseResponse>>(
    '/public/guardian/absences/excuse',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return unwrap(data, 'تعذر تقديم العذر')
}


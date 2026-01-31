import { apiClient } from '@/services/api/client'
import type {
  ExcuseApiResponse,
  SubmitExcusePayload,
  SubmitExcuseResponse,
  AbsenceExcuseListResponse,
  AbsenceExcuseRecord,
  AbsenceExcuseFilters,
  ApprovedNotSyncedResponse,
  StudentSearchResult,
  UnexcusedAbsence,
  CreateAdminExcusePayload,
  CreateAdminExcuseResponse,
  ExcuseSettingsResponse,
  UpdateExcuseSettingsPayload,
  MessageType,
} from './types'

// استخدام نفس الـ base URL المستخدم في apiClient
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.brqq.site/api'

// ==================== Public APIs (لولي الأمر - بدون تسجيل دخول) ====================

/**
 * الحصول على بيانات العذر بالتوكن
 */
export async function getExcuseByToken(token: string): Promise<ExcuseApiResponse> {
  const response = await fetch(`${API_BASE_URL}/excuse/${token}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })
  return response.json()
}

/**
 * تقديم العذر من ولي الأمر
 */
export async function submitExcuse(token: string, payload: SubmitExcusePayload): Promise<SubmitExcuseResponse> {
  const formData = new FormData()
  formData.append('excuse_text', payload.excuse_text)

  if (payload.file) {
    formData.append('file', payload.file)
  }

  if (payload.parent_name) {
    formData.append('parent_name', payload.parent_name)
  }

  const response = await fetch(`${API_BASE_URL}/excuse/${token}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    body: formData,
  })
  return response.json()
}

/**
 * التحقق من حالة العذر
 */
export async function checkExcuseStatus(token: string): Promise<ExcuseApiResponse> {
  const response = await fetch(`${API_BASE_URL}/excuse/${token}/status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })
  return response.json()
}

// ==================== Admin APIs (للإدارة - تتطلب تسجيل دخول) ====================

/**
 * الحصول على قائمة الأعذار
 */
export async function getAbsenceExcuses(filters?: AbsenceExcuseFilters): Promise<AbsenceExcuseListResponse> {
  const params = new URLSearchParams()

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status)
  }
  if (filters?.synced && filters.synced !== 'all') {
    params.append('synced', filters.synced)
  }
  if (filters?.start_date) {
    params.append('start_date', filters.start_date)
  }
  if (filters?.end_date) {
    params.append('end_date', filters.end_date)
  }
  if (filters?.search) {
    params.append('search', filters.search)
  }
  if (filters?.grades && filters.grades.length > 0) {
    params.append('grades', filters.grades.join(','))
  }
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }
  if (filters?.per_page) {
    params.append('per_page', filters.per_page.toString())
  }

  const query = params.toString()
  const url = query ? `/admin/absence-excuses?${query}` : '/admin/absence-excuses'

  const response = await apiClient.get<AbsenceExcuseListResponse>(url)
  return response.data
}

/**
 * الحصول على تفاصيل عذر معين
 */
export async function getExcuseDetails(id: number): Promise<AbsenceExcuseRecord> {
  const response = await apiClient.get<{ success: boolean; data: AbsenceExcuseRecord }>(`/admin/absence-excuses/${id}`)
  return response.data.data
}

/**
 * قبول العذر
 */
export async function approveExcuse(id: number, message?: string): Promise<{ success: boolean; message: string; data: AbsenceExcuseRecord }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: AbsenceExcuseRecord }>(
    `/admin/absence-excuses/${id}/approve`,
    { response_message: message }
  )
  return response.data
}

/**
 * رفض العذر
 */
export async function rejectExcuse(id: number, reason: string): Promise<{ success: boolean; message: string; data: AbsenceExcuseRecord }> {
  const response = await apiClient.post<{ success: boolean; message: string; data: AbsenceExcuseRecord }>(
    `/admin/absence-excuses/${id}/reject`,
    { notes: reason }
  )
  return response.data
}

/**
 * تسجيل مزامنة العذر مع نور
 */
export async function markExcuseNoorSynced(id: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/admin/absence-excuses/${id}/noor-synced`,
    {}
  )
  return response.data
}

/**
 * مزامنة عدة أعذار دفعة واحدة
 */
export async function bulkMarkExcusesSynced(excuseIds: number[], notes?: string): Promise<{
  success: boolean
  message: string
  data: { synced_count: number; failed_count: number; failed_ids: number[] }
}> {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: { synced_count: number; failed_count: number; failed_ids: number[] }
  }>('/admin/absence-excuses/bulk-mark-synced', { excuse_ids: excuseIds, notes })
  return response.data
}

/**
 * الحصول على الأعذار المقبولة غير المزامنة (للكروم)
 */
export async function getApprovedNotSynced(): Promise<ApprovedNotSyncedResponse> {
  const response = await apiClient.get<ApprovedNotSyncedResponse>('/admin/absence-excuses/approved-not-synced')
  return response.data
}

/**
 * حذف عذر
 */
export async function deleteExcuse(id: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/admin/absence-excuses/${id}`)
  return response.data
}

/**
 * الحصول على رابط الملف المرفق
 */
export function getExcuseFileUrl(id: number): string {
  return `${API_BASE_URL}/admin/absence-excuses/${id}/file`
}

// ==================== APIs لإنشاء العذر من الإدارة ====================

/**
 * البحث عن طلاب لإنشاء عذر
 */
export async function searchStudentsForExcuse(query: string): Promise<{
  success: boolean
  data: StudentSearchResult[]
}> {
  const response = await apiClient.get<{ success: boolean; data: StudentSearchResult[] }>(
    `/admin/absence-excuses/search-students?q=${encodeURIComponent(query)}`
  )
  return response.data
}

/**
 * جلب أيام الغياب بدون عذر للطالب
 */
export async function getUnexcusedAbsences(studentId: number): Promise<{
  success: boolean
  data: UnexcusedAbsence[]
  student: StudentSearchResult
}> {
  const response = await apiClient.get<{
    success: boolean
    data: UnexcusedAbsence[]
    student: StudentSearchResult
  }>(`/admin/absence-excuses/student/${studentId}/unexcused-absences`)
  return response.data
}

/**
 * إنشاء عذر من الإدارة
 */
export async function createAdminExcuse(payload: CreateAdminExcusePayload): Promise<CreateAdminExcuseResponse> {
  const formData = new FormData()
  formData.append('student_id', payload.student_id.toString())
  payload.absence_dates.forEach((date, index) => {
    formData.append(`absence_dates[${index}]`, date)
  })
  formData.append('excuse_text', payload.excuse_text)
  if (payload.file) {
    formData.append('file', payload.file)
  }

  const response = await apiClient.post<CreateAdminExcuseResponse>(
    '/admin/absence-excuses/create-by-admin',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return response.data
}

// ==================== APIs لإعدادات الأعذار ====================

/**
 * جلب إعدادات الأعذار
 */
export async function getExcuseSettings(): Promise<ExcuseSettingsResponse> {
  const response = await apiClient.get<ExcuseSettingsResponse>('/admin/absence-excuses/settings')
  return response.data
}

/**
 * تحديث إعدادات الأعذار
 */
export async function updateExcuseSettings(
  payload: UpdateExcuseSettingsPayload
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.put<{ success: boolean; message: string }>(
    '/admin/absence-excuses/settings',
    payload
  )
  return response.data
}

/**
 * إعادة تعيين نص رسالة للافتراضي
 */
export async function resetMessageToDefault(
  messageType: MessageType
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/admin/absence-excuses/settings/reset-message',
    { message_type: messageType }
  )
  return response.data
}

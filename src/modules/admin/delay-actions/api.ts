/**
 * دوال API لنظام إجراءات تأخير المعلمين
 */

import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  DelayActionsStatistics,
  TeacherDelayListResponse,
  TeacherDelayDetails,
  DelayActionsHistoryResponse,
  DelayActionsFilters,
  DelayActionsHistoryFilters,
  RecordActionPayload,
  MarkSignedPayload,
  DelayActionRecord,
  DelayActionsSettings,
  UpdateDelayActionsSettingsPayload,
  DelayExcusesFilters,
  DelayExcusesListResponse,
  DelayExcusesStatistics,
  DelayExcusesSettings,
  TeacherExcuseSetting,
  ReviewExcusePayload,
  UpdateDelayExcusesSettingsPayload,
  UpdateTeacherExcuseSettingPayload,
  DelayExcuse,
} from './types'

const BASE_PATH = '/admin/teacher-delay-actions'

/**
 * استخراج البيانات من الاستجابة
 */
function unwrapResponse<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }
  return response.data
}

/**
 * جلب قائمة المعلمين مع إجمالي التأخير
 * GET /api/admin/teacher-delay-actions
 */
export async function fetchTeacherDelayList(
  filters: DelayActionsFilters = {},
): Promise<TeacherDelayListResponse> {
  const params: Record<string, string | number> = {}

  if (filters.fiscal_year) {
    params.fiscal_year = filters.fiscal_year
  }
  if (filters.pending_action && filters.pending_action !== 'all') {
    params.pending_action = filters.pending_action
  }
  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim()
  }

  const { data } = await apiClient.get<TeacherDelayListResponse>(BASE_PATH, { params })
  return data
}

/**
 * جلب الإحصائيات
 * GET /api/admin/teacher-delay-actions/statistics
 */
export async function fetchDelayActionsStatistics(
  fiscalYear?: number,
): Promise<DelayActionsStatistics> {
  const params: Record<string, number> = {}
  if (fiscalYear) {
    params.fiscal_year = fiscalYear
  }

  const { data } = await apiClient.get<ApiResponse<DelayActionsStatistics>>(
    `${BASE_PATH}/statistics`,
    { params },
  )
  return unwrapResponse(data, 'تعذر تحميل الإحصائيات')
}

/**
 * جلب تفاصيل تأخير معلم
 * GET /api/admin/teacher-delay-actions/{userId}/details
 */
export async function fetchTeacherDelayDetails(
  userId: number,
  fiscalYear?: number,
): Promise<TeacherDelayDetails> {
  const params: Record<string, number> = {}
  if (fiscalYear) {
    params.fiscal_year = fiscalYear
  }

  const { data } = await apiClient.get<ApiResponse<TeacherDelayDetails>>(
    `${BASE_PATH}/${userId}/details`,
    { params },
  )
  return unwrapResponse(data, 'تعذر تحميل تفاصيل المعلم')
}

/**
 * جلب تاريخ الإجراءات
 * GET /api/admin/teacher-delay-actions/history
 */
export async function fetchDelayActionsHistory(
  filters: DelayActionsHistoryFilters = {},
): Promise<DelayActionsHistoryResponse> {
  const params: Record<string, string | number> = {}

  if (filters.fiscal_year) {
    params.fiscal_year = filters.fiscal_year
  }
  if (filters.action_type && filters.action_type !== 'all') {
    params.action_type = filters.action_type
  }
  if (filters.user_id) {
    params.user_id = filters.user_id
  }
  if (filters.page) {
    params.page = filters.page
  }
  if (filters.per_page) {
    params.per_page = filters.per_page
  }

  const { data } = await apiClient.get<DelayActionsHistoryResponse>(
    `${BASE_PATH}/history`,
    { params },
  )
  return data
}

/**
 * تسجيل تنبيه
 * POST /api/admin/teacher-delay-actions/warning
 */
export async function recordWarning(
  payload: RecordActionPayload,
): Promise<DelayActionRecord> {
  const { data } = await apiClient.post<ApiResponse<DelayActionRecord>>(
    `${BASE_PATH}/warning`,
    {
      user_id: payload.user_id,
      notes: payload.notes ?? null,
      send_notification: payload.send_notification ?? false,
    },
  )
  return unwrapResponse(data, 'تعذر تسجيل التنبيه')
}

/**
 * تسجيل قرار حسم
 * POST /api/admin/teacher-delay-actions/deduction
 */
export async function recordDeduction(
  payload: RecordActionPayload,
): Promise<DelayActionRecord> {
  const { data } = await apiClient.post<ApiResponse<DelayActionRecord>>(
    `${BASE_PATH}/deduction`,
    {
      user_id: payload.user_id,
      notes: payload.notes ?? null,
      send_notification: payload.send_notification ?? false,
    },
  )
  return unwrapResponse(data, 'تعذر تسجيل قرار الحسم')
}

/**
 * تحديث حالة التوقيع
 * POST /api/admin/teacher-delay-actions/{id}/mark-signed
 */
export async function markActionSigned(
  actionId: number,
  payload: MarkSignedPayload,
): Promise<DelayActionRecord> {
  const { data } = await apiClient.post<ApiResponse<DelayActionRecord>>(
    `${BASE_PATH}/${actionId}/mark-signed`,
    {
      signed_by_name: payload.signed_by_name,
    },
  )
  return unwrapResponse(data, 'تعذر تحديث حالة التوقيع')
}

/**
 * الحصول على رابط الطباعة (للتوافق مع الكود القديم)
 * GET /api/admin/teacher-delay-actions/{id}/print
 */
export function getPrintUrl(actionId: number): string {
  const baseUrl = apiClient.defaults.baseURL ?? ''
  return `${baseUrl}${BASE_PATH}/${actionId}/print`
}

/**
 * جلب صفحة الطباعة كـ HTML وفتحها في نافذة جديدة
 * GET /api/admin/teacher-delay-actions/{id}/print
 */
export async function fetchAndOpenPrintPage(actionId: number): Promise<void> {
  const response = await apiClient.get<string>(`${BASE_PATH}/${actionId}/print`, {
    responseType: 'text' as const,
  })

  // فتح نافذة جديدة وكتابة الـ HTML فيها
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(response.data)
    printWindow.document.close()
  } else {
    throw new Error('تعذر فتح نافذة الطباعة - تأكد من السماح بالنوافذ المنبثقة')
  }
}

/**
 * جلب إعدادات إجراءات التأخير
 * GET /api/admin/teacher-attendance/settings
 */
export async function fetchDelayActionsSettings(): Promise<DelayActionsSettings> {
  const { data } = await apiClient.get<ApiResponse<DelayActionsSettings>>(
    '/admin/teacher-attendance/settings',
  )
  return unwrapResponse(data, 'تعذر تحميل الإعدادات')
}

/**
 * تحديث إعدادات إجراءات التأخير
 * PUT /api/admin/teacher-attendance/settings
 */
export async function updateDelayActionsSettings(
  payload: UpdateDelayActionsSettingsPayload,
): Promise<DelayActionsSettings> {
  const { data } = await apiClient.put<ApiResponse<DelayActionsSettings>>(
    '/admin/teacher-attendance/settings',
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ الإعدادات')
}

// ==================== دوال API لأعذار التأخير ====================

const EXCUSES_BASE_PATH = '/admin/teacher-delay-excuses'

/**
 * جلب قائمة أعذار التأخير
 * GET /api/admin/teacher-delay-excuses
 */
export async function fetchDelayExcuses(
  filters: DelayExcusesFilters = {},
): Promise<DelayExcusesListResponse> {
  const params: Record<string, string | number> = {}

  if (filters.fiscal_year) {
    params.fiscal_year = filters.fiscal_year
  }
  if (filters.status && filters.status !== 'all') {
    params.status = filters.status
  }
  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim()
  }
  if (filters.page) {
    params.page = filters.page
  }
  if (filters.per_page) {
    params.per_page = filters.per_page
  }

  const { data } = await apiClient.get<DelayExcusesListResponse>(EXCUSES_BASE_PATH, { params })
  return data
}

/**
 * جلب إحصائيات أعذار التأخير
 * GET /api/admin/teacher-delay-excuses/statistics
 */
export async function fetchDelayExcusesStatistics(
  fiscalYear?: number,
): Promise<DelayExcusesStatistics> {
  const params: Record<string, number> = {}
  if (fiscalYear) {
    params.fiscal_year = fiscalYear
  }

  const { data } = await apiClient.get<ApiResponse<DelayExcusesStatistics>>(
    `${EXCUSES_BASE_PATH}/statistics`,
    { params },
  )
  return unwrapResponse(data, 'تعذر تحميل إحصائيات الأعذار')
}

/**
 * جلب تفاصيل عذر
 * GET /api/admin/teacher-delay-excuses/{id}
 */
export async function fetchDelayExcuseDetails(id: number): Promise<DelayExcuse> {
  const { data } = await apiClient.get<ApiResponse<DelayExcuse>>(`${EXCUSES_BASE_PATH}/${id}`)
  return unwrapResponse(data, 'تعذر تحميل تفاصيل العذر')
}

/**
 * قبول عذر
 * POST /api/admin/teacher-delay-excuses/{id}/approve
 */
export async function approveExcuse(
  id: number,
  payload: ReviewExcusePayload = {},
): Promise<DelayExcuse> {
  const { data } = await apiClient.post<ApiResponse<DelayExcuse>>(
    `${EXCUSES_BASE_PATH}/${id}/approve`,
    payload,
  )
  return unwrapResponse(data, 'تعذر قبول العذر')
}

/**
 * رفض عذر
 * POST /api/admin/teacher-delay-excuses/{id}/reject
 */
export async function rejectExcuse(
  id: number,
  payload: ReviewExcusePayload = {},
): Promise<DelayExcuse> {
  const { data } = await apiClient.post<ApiResponse<DelayExcuse>>(
    `${EXCUSES_BASE_PATH}/${id}/reject`,
    payload,
  )
  return unwrapResponse(data, 'تعذر رفض العذر')
}

/**
 * جلب إعدادات أعذار التأخير
 * GET /api/admin/teacher-delay-excuses/settings
 */
export async function fetchDelayExcusesSettings(): Promise<DelayExcusesSettings> {
  const { data } = await apiClient.get<ApiResponse<DelayExcusesSettings>>(
    `${EXCUSES_BASE_PATH}/settings`,
  )
  return unwrapResponse(data, 'تعذر تحميل إعدادات الأعذار')
}

/**
 * تحديث إعدادات أعذار التأخير
 * PUT /api/admin/teacher-delay-excuses/settings
 */
export async function updateDelayExcusesSettings(
  payload: UpdateDelayExcusesSettingsPayload,
): Promise<DelayExcusesSettings> {
  const { data } = await apiClient.put<ApiResponse<DelayExcusesSettings>>(
    `${EXCUSES_BASE_PATH}/settings`,
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ إعدادات الأعذار')
}

/**
 * جلب إعدادات المعلمين الفردية
 * GET /api/admin/teacher-delay-excuses/teacher-settings
 */
export async function fetchTeacherExcuseSettings(): Promise<TeacherExcuseSetting[]> {
  const { data } = await apiClient.get<ApiResponse<TeacherExcuseSetting[]>>(
    `${EXCUSES_BASE_PATH}/teacher-settings`,
  )
  return unwrapResponse(data, 'تعذر تحميل إعدادات المعلمين')
}

/**
 * تحديث إعدادات معلم فردي
 * PUT /api/admin/teacher-delay-excuses/teacher-settings/{userId}
 */
export async function updateTeacherExcuseSetting(
  userId: number,
  payload: UpdateTeacherExcuseSettingPayload,
): Promise<TeacherExcuseSetting> {
  const { data } = await apiClient.put<ApiResponse<TeacherExcuseSetting>>(
    `${EXCUSES_BASE_PATH}/teacher-settings/${userId}`,
    payload,
  )
  return unwrapResponse(data, 'تعذر حفظ إعدادات المعلم')
}

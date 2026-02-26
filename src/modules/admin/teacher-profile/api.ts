/**
 * دوال API لملف المعلم
 */

import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  TeacherProfileSummary,
  TeacherAttendanceResponse,
  TeacherDelaysResponse,
  TeacherDelayActionsResponse,
  TeacherScheduleResponse,
  TeacherDutiesResponse,
  TeacherMessagesResponse,
  TeacherPreparationResponse,
  TeacherReferralsResponse,
  TeacherPointsResponse,
  TeacherCoverageResponse,
  TeacherStudentAttendanceStats,
  TeacherBenchmarksResponse,
  TeacherPeriodActionsResponse,
  TeacherBadgesResponse,
  TeacherAIAnalysis,
  AppreciationTemplatesResponse,
  SendAppreciationResponse,
  DateRangeFilter,
} from './types'

const BASE = '/admin/teacher-profile'

function unwrapResponse<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }
  return response.data
}

function buildParams(filters: DateRangeFilter): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  return params
}

/** النظرة العامة */
export async function fetchTeacherProfileSummary(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherProfileSummary> {
  const { data } = await apiClient.get<ApiResponse<TeacherProfileSummary>>(
    `${BASE}/${teacherId}/summary`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل ملخص المعلم')
}

/** سجل الحضور */
export async function fetchTeacherProfileAttendance(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherAttendanceResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherAttendanceResponse>>(
    `${BASE}/${teacherId}/attendance`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل سجل الحضور')
}

/** التأخرات */
export async function fetchTeacherProfileDelays(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherDelaysResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherDelaysResponse>>(
    `${BASE}/${teacherId}/delays`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل التأخرات')
}

/** التنبيهات والحسميات */
export async function fetchTeacherProfileDelayActions(
  teacherId: number,
  fiscalYear?: number,
): Promise<TeacherDelayActionsResponse> {
  const params: Record<string, string | number> = {}
  if (fiscalYear) params.fiscal_year = fiscalYear
  const { data } = await apiClient.get<ApiResponse<TeacherDelayActionsResponse>>(
    `${BASE}/${teacherId}/delay-actions`,
    { params },
  )
  return unwrapResponse(data, 'تعذر تحميل التنبيهات والحسميات')
}

/** الجدول الدراسي */
export async function fetchTeacherProfileSchedule(
  teacherId: number,
): Promise<TeacherScheduleResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherScheduleResponse>>(
    `${BASE}/${teacherId}/schedule`,
  )
  return unwrapResponse(data, 'تعذر تحميل الجدول الدراسي')
}

/** المناوبة والإشراف */
export async function fetchTeacherProfileDuties(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherDutiesResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherDutiesResponse>>(
    `${BASE}/${teacherId}/duties`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل المناوبات')
}

/** الرسائل */
export async function fetchTeacherProfileMessages(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherMessagesResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherMessagesResponse>>(
    `${BASE}/${teacherId}/messages`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل الرسائل')
}

/** التحضير */
export async function fetchTeacherProfilePreparation(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherPreparationResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherPreparationResponse>>(
    `${BASE}/${teacherId}/preparation`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل التحضير')
}

/** الإحالات */
export async function fetchTeacherProfileReferrals(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherReferralsResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherReferralsResponse>>(
    `${BASE}/${teacherId}/referrals`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل الإحالات')
}

/** النقاط */
export async function fetchTeacherProfilePoints(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherPointsResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherPointsResponse>>(
    `${BASE}/${teacherId}/points`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل النقاط')
}

/** طلبات التغطية */
export async function fetchTeacherProfileCoverage(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherCoverageResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherCoverageResponse>>(
    `${BASE}/${teacherId}/coverage-requests`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل طلبات التغطية')
}

/** إحصائيات تحضير الطلاب */
export async function fetchTeacherStudentAttendanceStats(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherStudentAttendanceStats> {
  const { data } = await apiClient.get<ApiResponse<TeacherStudentAttendanceStats>>(
    `${BASE}/${teacherId}/student-attendance-stats`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل إحصائيات تحضير الطلاب')
}

/** إجراءات الحصص والطابور */
export async function fetchTeacherPeriodActions(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherPeriodActionsResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherPeriodActionsResponse>>(
    `${BASE}/${teacherId}/period-actions`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل إجراءات الحصص')
}

/** المقارنة بمتوسط المدرسة */
export async function fetchTeacherBenchmarks(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherBenchmarksResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherBenchmarksResponse>>(
    `${BASE}/${teacherId}/benchmarks`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل المقارنات')
}

/** الأوسمة */
export async function fetchTeacherBadges(
  teacherId: number,
  filters: DateRangeFilter = {},
): Promise<TeacherBadgesResponse> {
  const { data } = await apiClient.get<ApiResponse<TeacherBadgesResponse>>(
    `${BASE}/${teacherId}/badges`,
    { params: buildParams(filters) },
  )
  return unwrapResponse(data, 'تعذر تحميل الأوسمة')
}

/** تحليل AI */
export async function fetchTeacherAIAnalysis(
  teacherId: number,
  filters: DateRangeFilter = {},
  forceRefresh = false,
): Promise<TeacherAIAnalysis> {
  const params: Record<string, string> = buildParams(filters)
  if (forceRefresh) params.force_refresh = '1'
  const { data } = await apiClient.get<ApiResponse<TeacherAIAnalysis>>(
    `${BASE}/${teacherId}/ai-analysis`,
    { params },
  )
  return unwrapResponse(data, 'تعذر تحميل التحليل الذكي')
}

/** قوالب التقدير */
export async function fetchAppreciationTemplates(
  teacherId: number,
): Promise<AppreciationTemplatesResponse> {
  const { data } = await apiClient.get<ApiResponse<AppreciationTemplatesResponse>>(
    `${BASE}/${teacherId}/appreciation-templates`,
  )
  return unwrapResponse(data, 'تعذر تحميل قوالب التقدير')
}

/** إرسال رسالة تقدير */
export async function sendTeacherAppreciation(
  teacherId: number,
  message: string,
): Promise<SendAppreciationResponse> {
  const { data } = await apiClient.post<ApiResponse<SendAppreciationResponse>>(
    `${BASE}/${teacherId}/send-appreciation`,
    { message },
  )
  return unwrapResponse(data, 'فشل إرسال رسالة التقدير')
}

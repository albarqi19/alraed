import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  PlatformFiltersResponse,
  PlatformInvoice,
  PlatformOverview,
  PlatformRevenueTrend,
  PlatformSchoolsResponse,
  ReferralCode,
  ReferralCodePayload,
  ReferralCodesResponse,
  ReferralSchool,
} from './types'

interface SchoolsQueryParams {
  page?: number
  search?: string
  status?: string | null
  plan?: string | null
}

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const { data } = await apiClient.get<ApiResponse<PlatformOverview>>('/platform/overview')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل ملخص المنصة')
  }
  return data.data
}

export async function fetchPlatformRevenueTrends(): Promise<PlatformRevenueTrend[]> {
  const { data } = await apiClient.get<ApiResponse<PlatformRevenueTrend[]>>('/platform/revenue-trends')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل بيانات الإيرادات')
  }
  return data.data
}

export async function fetchPlatformRecentInvoices(): Promise<PlatformInvoice[]> {
  const { data } = await apiClient.get<ApiResponse<PlatformInvoice[]>>('/platform/recent-invoices')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الفواتير الأخيرة')
  }
  return data.data
}

export async function fetchPlatformFilters(): Promise<PlatformFiltersResponse> {
  const { data } = await apiClient.get<ApiResponse<PlatformFiltersResponse>>('/platform/filters')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل خيارات التصفية')
  }
  return data.data
}

export async function fetchPlatformSchools(params: SchoolsQueryParams = {}): Promise<PlatformSchoolsResponse> {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.search) queryParams.set('search', params.search)
  if (params.status) queryParams.set('status', params.status)
  if (params.plan) queryParams.set('plan', params.plan)

  const queryString = queryParams.toString()
  const endpoint = queryString ? `/platform/schools?${queryString}` : '/platform/schools'
  const { data } = await apiClient.get<ApiResponse<PlatformSchoolsResponse>>(endpoint)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل قائمة المدارس')
  }
  return data.data
}

/* ═══════ رموز الإحالة ═══════ */

export async function fetchReferralCodes(): Promise<ReferralCodesResponse> {
  const { data } = await apiClient.get<ApiResponse<ReferralCodesResponse>>('/platform/referral-codes')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل رموز الإحالة')
  }
  return data.data
}

export async function fetchReferralCodeSchools(
  id: number,
): Promise<{ code: ReferralCode; schools: ReferralSchool[] }> {
  const { data } = await apiClient.get<ApiResponse<{ code: ReferralCode; schools: ReferralSchool[] }>>(
    `/platform/referral-codes/${id}/schools`,
  )
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل مدارس الرمز')
  }
  return data.data
}

export async function createReferralCode(payload: ReferralCodePayload): Promise<ReferralCode> {
  const { data } = await apiClient.post<ApiResponse<ReferralCode>>('/platform/referral-codes', payload)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إنشاء الرمز')
  }
  return data.data
}

export async function updateReferralCode(
  id: number,
  payload: ReferralCodePayload,
): Promise<ReferralCode> {
  const { data } = await apiClient.put<ApiResponse<ReferralCode>>(`/platform/referral-codes/${id}`, payload)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحديث الرمز')
  }
  return data.data
}

export async function toggleReferralCode(id: number): Promise<ReferralCode> {
  const { data } = await apiClient.post<ApiResponse<ReferralCode>>(`/platform/referral-codes/${id}/toggle`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تغيير حالة الرمز')
  }
  return data.data
}

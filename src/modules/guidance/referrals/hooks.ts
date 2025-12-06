import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type {
  StudentReferral,
  GuidanceReferralStats,
  ReferralFilters,
  OpenCasePayload,
  CreateTreatmentPlanPayload,
  ReferralListResponse,
  ReferralDetailResponse,
  ReferralStatsResponse,
} from './types'

const REFERRAL_KEYS = {
  all: ['guidance-referrals'] as const,
  lists: () => [...REFERRAL_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...REFERRAL_KEYS.lists(), filters] as const,
  details: () => [...REFERRAL_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...REFERRAL_KEYS.details(), id] as const,
  stats: () => [...REFERRAL_KEYS.all, 'stats'] as const,
}

// جلب قائمة الإحالات للموجه
export function useGuidanceReferralsQuery(filters?: ReferralFilters) {
  return useQuery<StudentReferral[]>({
    queryKey: REFERRAL_KEYS.list((filters ?? {}) as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.date_from) params.append('date_from', filters.date_from)
      if (filters?.date_to) params.append('date_to', filters.date_to)

      const { data } = await apiClient.get<ReferralListResponse>(
        `/guidance/referrals?${params.toString()}`
      )
      return data.data
    },
  })
}

// جلب تفاصيل إحالة
export function useGuidanceReferralDetailQuery(id: number) {
  return useQuery<StudentReferral>({
    queryKey: REFERRAL_KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralDetailResponse>(`/guidance/referrals/${id}`)
      return data.data
    },
    enabled: id > 0,
  })
}

// جلب إحصائيات
export function useGuidanceReferralStatsQuery() {
  return useQuery<GuidanceReferralStats>({
    queryKey: REFERRAL_KEYS.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralStatsResponse>('/guidance/referrals/stats')
      return data.data
    },
  })
}

// استلام إحالة
export function useReceiveGuidanceReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/receive`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// فتح حالة من الإحالة
export function useOpenCaseFromReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: OpenCasePayload }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/open-case`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إنشاء خطة علاجية من الإحالة
export function useCreateTreatmentPlanFromReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: CreateTreatmentPlanPayload }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/create-treatment-plan`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إكمال إحالة
export function useCompleteGuidanceReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/complete`, { notes })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// تحويل إحالة
export function useTransferGuidanceReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, target_role, notes }: { id: number; target_role: string; notes: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/transfer`, { target_role, notes })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إضافة ملاحظة
export function useAddGuidanceReferralNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/guidance/referrals/${id}/add-note`, { notes })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type {
  StudentReferral,
  ReferralStats,
  ReferralFilters,
  AssignReferralPayload,
  TransferReferralPayload,
  RecordViolationPayload,
  ReferralListResponse,
  ReferralDetailResponse,
  ReferralStatsResponse,
} from './types'

const REFERRAL_KEYS = {
  all: ['admin-referrals'] as const,
  lists: () => [...REFERRAL_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...REFERRAL_KEYS.lists(), filters] as const,
  details: () => [...REFERRAL_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...REFERRAL_KEYS.details(), id] as const,
  stats: () => [...REFERRAL_KEYS.all, 'stats'] as const,
}

// جلب قائمة الإحالات
export function useAdminReferralsQuery(filters?: ReferralFilters) {
  return useQuery<StudentReferral[]>({
    queryKey: REFERRAL_KEYS.list((filters ?? {}) as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.target_role) params.append('target_role', filters.target_role)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.assigned_to) params.append('assigned_to', String(filters.assigned_to))
      if (filters?.date_from) params.append('date_from', filters.date_from)
      if (filters?.date_to) params.append('date_to', filters.date_to)
      if (filters?.referred_by_type) params.append('referred_by_type', filters.referred_by_type)

      const { data } = await apiClient.get<ReferralListResponse>(
        `/admin/referrals?${params.toString()}`
      )
      return data.data
    },
  })
}

// جلب تفاصيل إحالة
export function useAdminReferralDetailQuery(id: number) {
  return useQuery<StudentReferral>({
    queryKey: REFERRAL_KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralDetailResponse>(`/admin/referrals/${id}`)
      return data.data
    },
    enabled: id > 0,
  })
}

// جلب إحصائيات
export function useAdminReferralStatsQuery(filters?: { type?: string }) {
  return useQuery<ReferralStats>({
    queryKey: [...REFERRAL_KEYS.stats(), filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.type) params.append('type', filters.type)

      const { data } = await apiClient.get<ReferralStatsResponse>(
        `/admin/referrals/stats?${params.toString()}`
      )
      return data.data
    },
  })
}

// استلام إحالة
export function useReceiveReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/receive`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// تعيين إحالة لمستخدم
export function useAssignReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: AssignReferralPayload }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/assign`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// تحويل إحالة
export function useTransferReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TransferReferralPayload }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/transfer`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// تسجيل مخالفة
export function useRecordViolationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: RecordViolationPayload }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/record-violation`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إكمال إحالة
export function useCompleteReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/complete`, { notes })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إضافة ملاحظة
export function useAddReferralNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/add-note`, { note })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إنشاء مستند
export function useGenerateDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, documentType }: { id: number; documentType: string }) => {
      const { data } = await apiClient.post<{ data: { id: number; url: string; content: string; document_number: string; title: string } }>(
        `/admin/referrals/${id}/generate-document`,
        { document_type: documentType }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إشعار ولي الأمر
export function useNotifyParentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, message }: { id: number; message?: string }) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/admin/referrals/${id}/notify-parent`, { message })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// حذف إحالة
export function useDeleteReferralMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/admin/referrals/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type {
  StudentReferral,
  ReferralStats,
  CreateReferralPayload,
  ReferralListResponse,
  ReferralDetailResponse,
  ReferralStatsResponse,
  MyStudentsResponse,
  Student,
} from './types'

const REFERRAL_KEYS = {
  all: ['teacher-referrals'] as const,
  lists: () => [...REFERRAL_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...REFERRAL_KEYS.lists(), filters] as const,
  details: () => [...REFERRAL_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...REFERRAL_KEYS.details(), id] as const,
  stats: () => [...REFERRAL_KEYS.all, 'stats'] as const,
  students: () => [...REFERRAL_KEYS.all, 'students'] as const,
}

// جلب قائمة طلابي
export function useMyStudentsQuery() {
  return useQuery<Student[]>({
    queryKey: REFERRAL_KEYS.students(),
    queryFn: async () => {
      const { data } = await apiClient.get<MyStudentsResponse>('/teacher/referrals/my-students')
      return data.data
    },
  })
}

// جلب إحالاتي
export function useMyReferralsQuery(filters?: { status?: string; type?: string }) {
  return useQuery<StudentReferral[]>({
    queryKey: REFERRAL_KEYS.list(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      
      const { data } = await apiClient.get<ReferralListResponse>(
        `/teacher/referrals?${params.toString()}`
      )
      return data.data
    },
  })
}

// جلب تفاصيل إحالة
export function useReferralDetailQuery(id: number) {
  return useQuery<StudentReferral>({
    queryKey: REFERRAL_KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralDetailResponse>(`/teacher/referrals/${id}`)
      return data.data
    },
    enabled: id > 0,
  })
}

// جلب إحصائيات
export function useReferralStatsQuery() {
  return useQuery<ReferralStats>({
    queryKey: REFERRAL_KEYS.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralStatsResponse>('/teacher/referrals/stats')
      return data.data
    },
  })
}

// إنشاء إحالة جديدة
export function useCreateReferralMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: CreateReferralPayload) => {
      const { data } = await apiClient.post<ReferralDetailResponse>('/teacher/referrals', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// إلغاء إحالة
export function useCancelReferralMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post<ReferralDetailResponse>(`/teacher/referrals/${id}/cancel`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all })
    },
  })
}

// تحميل مستند
export function useDownloadDocumentMutation() {
  return useMutation({
    mutationFn: async ({ referralId, documentId }: { referralId: number; documentId: number }) => {
      const { data } = await apiClient.get<{ success: boolean; data: { content: string; title: string; document_number: string } }>(
        `/teacher/referrals/${referralId}/documents/${documentId}`
      )
      return data.data
    },
  })
}

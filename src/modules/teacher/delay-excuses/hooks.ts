import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type {
  DelayExcuse,
  ExcusableDelay,
  ExcuseSettings,
  SubmitExcusePayload,
  ExcuseListResponse,
  ExcusableDelaysResponse,
  ExcuseSettingsResponse,
  SubmitExcuseResponse,
  ExcuseDetailResponse,
} from './types'

const EXCUSE_KEYS = {
  all: ['teacher-delay-excuses'] as const,
  lists: () => [...EXCUSE_KEYS.all, 'list'] as const,
  list: (fiscalYear?: number) => [...EXCUSE_KEYS.lists(), fiscalYear] as const,
  details: () => [...EXCUSE_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...EXCUSE_KEYS.details(), id] as const,
  excusableDelays: () => [...EXCUSE_KEYS.all, 'excusable-delays'] as const,
  settings: () => [...EXCUSE_KEYS.all, 'settings'] as const,
}

// جلب إعدادات الأعذار
export function useExcuseSettingsQuery() {
  return useQuery<ExcuseSettings>({
    queryKey: EXCUSE_KEYS.settings(),
    queryFn: async () => {
      const { data } = await apiClient.get<ExcuseSettingsResponse>('/teacher/delay-excuses/settings')
      return data.data
    },
  })
}

// جلب التأخيرات القابلة لتقديم عذر
export function useExcusableDelaysQuery() {
  return useQuery<ExcusableDelay[]>({
    queryKey: EXCUSE_KEYS.excusableDelays(),
    queryFn: async () => {
      const { data } = await apiClient.get<ExcusableDelaysResponse>('/teacher/delay-excuses/excusable-delays')
      return data.data
    },
  })
}

// جلب أعذاري
export function useMyExcusesQuery(fiscalYear?: number) {
  return useQuery<DelayExcuse[]>({
    queryKey: EXCUSE_KEYS.list(fiscalYear),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (fiscalYear) params.append('fiscal_year', fiscalYear.toString())

      const { data } = await apiClient.get<ExcuseListResponse>(
        `/teacher/delay-excuses?${params.toString()}`
      )
      return data.data
    },
  })
}

// جلب تفاصيل عذر
export function useExcuseDetailQuery(id: number) {
  return useQuery<DelayExcuse>({
    queryKey: EXCUSE_KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ExcuseDetailResponse>(`/teacher/delay-excuses/${id}`)
      return data.data
    },
    enabled: id > 0,
  })
}

// تقديم عذر جديد
export function useSubmitExcuseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SubmitExcusePayload) => {
      const { data } = await apiClient.post<SubmitExcuseResponse>('/teacher/delay-excuses', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCUSE_KEYS.all })
    },
  })
}

export { EXCUSE_KEYS }

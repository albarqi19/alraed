import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'
import {
  createReferralCode,
  fetchPlatformFilters,
  fetchPlatformOverview,
  fetchPlatformRecentInvoices,
  fetchPlatformRevenueTrends,
  fetchPlatformSchools,
  fetchReferralCodeSchools,
  fetchReferralCodes,
  toggleReferralCode,
  updateReferralCode,
} from './api'
import { platformQueryKeys } from './query-keys'
import type { ReferralCodePayload } from './types'

export function usePlatformOverviewQuery() {
  return useQuery({
    queryKey: platformQueryKeys.overview(),
    queryFn: fetchPlatformOverview,
    refetchInterval: 1000 * 60 * 5, // كل خمس دقائق
  })
}

export function usePlatformRevenueTrendsQuery() {
  return useQuery({
    queryKey: platformQueryKeys.revenue(),
    queryFn: fetchPlatformRevenueTrends,
    staleTime: 1000 * 60 * 10,
  })
}

export function usePlatformRecentInvoicesQuery() {
  return useQuery({
    queryKey: platformQueryKeys.invoices(),
    queryFn: fetchPlatformRecentInvoices,
    refetchInterval: 1000 * 60 * 10,
  })
}

export function usePlatformFiltersQuery() {
  return useQuery({
    queryKey: platformQueryKeys.filters(),
    queryFn: fetchPlatformFilters,
    staleTime: 1000 * 60 * 60,
  })
}

export function usePlatformSchoolsQuery(params: { page?: number; search?: string; status?: string | null; plan?: string | null }) {
  return useQuery({
    queryKey: platformQueryKeys.schools(params),
    queryFn: () => fetchPlatformSchools(params),
    placeholderData: keepPreviousData,
  })
}

/* ═══════ رموز الإحالة ═══════ */

export function useReferralCodesQuery() {
  return useQuery({
    queryKey: platformQueryKeys.referralCodes(),
    queryFn: fetchReferralCodes,
    staleTime: 1000 * 60,
  })
}

/**
 * مدارسُ رمزٍ بعينه — لا تُطلَب إلا حين تُفتَح البطاقة.
 *
 * `enabled` مربوطٌ بالمعرّف: الجدولُ يعرض عشرات الرموز، وجلبُ
 * مدارس كلٍّ منها مقدّماً عشراتُ طلباتٍ لا يقرأ المستخدم إلا واحداً منها.
 */
export function useReferralCodeSchoolsQuery(id: number | null) {
  return useQuery({
    queryKey: platformQueryKeys.referralCodeSchools(id ?? 0),
    queryFn: () => fetchReferralCodeSchools(id as number),
    enabled: id !== null,
  })
}

/** يُبطل قائمةَ الرموز بعد كل كتابة — العدّادات فيها تتغيّر بتغيّر الحالة. */
function useReferralInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: platformQueryKeys.referralCodes() })
}

export function useCreateReferralCodeMutation() {
  const invalidate = useReferralInvalidate()

  return useMutation({
    mutationFn: createReferralCode,
    onSuccess: (code) => {
      invalidate()
      sileo.success({ title: `أُنشئ الرمز ${code.code}`, duration: 3000 })
    },
    onError: (error: Error) => sileo.error({ title: error.message, duration: 4000 }),
  })
}

export function useUpdateReferralCodeMutation() {
  const invalidate = useReferralInvalidate()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ReferralCodePayload }) =>
      updateReferralCode(id, payload),
    onSuccess: () => {
      invalidate()
      sileo.success({ title: 'حُدّث الرمز', duration: 3000 })
    },
    onError: (error: Error) => sileo.error({ title: error.message, duration: 4000 }),
  })
}

export function useToggleReferralCodeMutation() {
  const invalidate = useReferralInvalidate()

  return useMutation({
    mutationFn: toggleReferralCode,
    onSuccess: (code) => {
      invalidate()
      sileo.success({ title: code.is_active ? 'الرمز مُفعّل' : 'الرمز مُوقَف', duration: 3000 })
    },
    onError: (error: Error) => sileo.error({ title: error.message, duration: 4000 }),
  })
}

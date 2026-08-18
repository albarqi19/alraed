import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import { biometricQueryKeys } from './query-keys'
import {
  fetchBiometricDevices,
  claimBiometricDevice,
  updateBiometricDevice,
  deleteBiometricDevice,
  fetchBiometricPunches,
  fetchBiometricStats,
} from './api'
import type { BiometricDevice, BiometricPunchFilters } from './types'

// ========== الاستعلامات ==========

export function useBiometricDevicesQuery() {
  return useQuery({
    queryKey: biometricQueryKeys.devices(),
    queryFn: fetchBiometricDevices,
    refetchInterval: 30_000,
  })
}

export function useBiometricPunchesQuery(filters: BiometricPunchFilters = {}) {
  return useQuery({
    queryKey: biometricQueryKeys.punches(filters),
    queryFn: () => fetchBiometricPunches(filters),
    refetchInterval: 30_000,
  })
}

export function useBiometricStatsQuery() {
  return useQuery({
    queryKey: biometricQueryKeys.stats(),
    queryFn: fetchBiometricStats,
    refetchInterval: 20_000,
  })
}

// ========== التعديلات ==========

export function useClaimBiometricDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: claimBiometricDevice,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد الجهاز' })
      queryClient.invalidateQueries({ queryKey: biometricQueryKeys.root })
    },
    onError: (error: unknown) => {
      // رسالةُ الخادم أنفعُ من عبارةٍ عامّة: «الجهاز مسجّل لمدرسة أخرى»
      // تُوقف بحثاً طويلاً عن عطلٍ لا وجود له.
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'تعذّر اعتماد الجهاز'

      toast({ type: 'error', title: message })
    },
  })
}

export function useUpdateBiometricDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BiometricDevice> }) =>
      updateBiometricDevice(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث الجهاز' })
      queryClient.invalidateQueries({ queryKey: biometricQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذّر تحديث الجهاز' })
    },
  })
}

export function useDeleteBiometricDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBiometricDevice,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الجهاز' })
      queryClient.invalidateQueries({ queryKey: biometricQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذّر حذف الجهاز' })
    },
  })
}

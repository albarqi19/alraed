import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeStep, getOnboardingStats, getOnboardingStatus, resetOnboarding } from './api'
import { fetchCurrentUser } from '@/modules/auth/api'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import type { OnboardingStepKey } from './types'

const ONBOARDING_QUERY_KEY = ['onboarding', 'status']
const ONBOARDING_STATS_KEY = ['onboarding', 'stats']

/**
 * Hook للحصول على حالة الإعداد
 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: getOnboardingStatus,
    staleTime: 30000, // 30 ثانية
  })
}

/**
 * Hook للحصول على إحصائيات الإعداد
 */
export function useOnboardingStats() {
  return useQuery({
    queryKey: ONBOARDING_STATS_KEY,
    queryFn: getOnboardingStats,
    staleTime: 30000,
  })
}

/**
 * Hook لإكمال خطوة
 */
export function useCompleteStep() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: ({ stepKey, metadata }: { stepKey: OnboardingStepKey; metadata?: Record<string, unknown> }) =>
      completeStep(stepKey, metadata),
    onSuccess: async (result) => {
      // تحديث حالة الإعداد بعد إكمال الخطوة
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATS_KEY })

      // إذا اكتمل الإعداد بالكامل، تحديث بيانات المستخدم في الـ store
      if (result.onboarding_completed) {
        try {
          const updatedUser = await fetchCurrentUser()
          setUser(updatedUser)
        } catch (error) {
          console.error('Failed to refresh user data:', error)
        }
      }
    },
  })
}

/**
 * Hook لتخطي خطوة (للتجربة فقط)
 */
export function useSkipStep() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: ({ stepKey }: { stepKey: OnboardingStepKey }) =>
      completeStep(stepKey, { skipped: true }, true),
    onSuccess: async (result) => {
      // تحديث حالة الإعداد بعد تخطي الخطوة
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATS_KEY })

      // إذا اكتمل الإعداد بالكامل، تحديث بيانات المستخدم في الـ store
      if (result.onboarding_completed) {
        try {
          const updatedUser = await fetchCurrentUser()
          setUser(updatedUser)
        } catch (error) {
          console.error('Failed to refresh user data:', error)
        }
      }
    },
  })
}

/**
 * Hook لإعادة ضبط الإعداد (للتطوير)
 */
export function useResetOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resetOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATS_KEY })
    },
  })
}

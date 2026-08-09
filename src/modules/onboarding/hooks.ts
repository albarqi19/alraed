import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeStep, getOnboardingStats, getOnboardingStatus, resetOnboarding } from './api'
import { fetchCurrentUser } from '@/modules/auth/api'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { getErrorMessage, getMissingRequirements } from '@/services/api/errors'
import { useToast } from '@/shared/feedback/use-toast'
import type { CompleteStepResponse, OnboardingStepKey } from './types'

const ONBOARDING_QUERY_KEY = ['onboarding', 'status']
const ONBOARDING_STATS_KEY = ['onboarding', 'stats']

/** ترجمة مفاتيح المتطلبات الناقصة إلى نص يفهمه المدير */
const REQUIREMENT_LABELS: Record<string, string> = {
  students: 'إضافة طالب واحد على الأقل',
  teachers: 'إضافة معلم واحد على الأقل',
  whatsapp_connection: 'ربط رقم واتساب',
  attendance_settings: 'حفظ إعدادات وقت الدوام',
  schedule: 'إنشاء جدول زمني',
}

export function describeMissingRequirements(error: unknown): string | null {
  const missing = getMissingRequirements(error)

  if (missing.length === 0) return null

  return missing.map((key) => REQUIREMENT_LABELS[key] ?? key).join('، ')
}

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
 * تحديث بيانات المستخدم بعد اكتمال الإعداد.
 *
 * حارس المسارات يقرأ needs_onboarding من مخزن المصادقة المحفوظ محلياً، وهو
 * يُملأ عند تسجيل الدخول فقط. بدون هذا التحديث يظل المدير مُعاداً إلى
 * /onboarding رغم اكتمال إعداده.
 */
function useUserRefreshOnCompletion() {
  const setUser = useAuthStore((state) => state.setUser)

  return async (result: CompleteStepResponse) => {
    if (!result.onboarding_completed) return

    try {
      setUser(await fetchCurrentUser())
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }
}

/**
 * Hook لإكمال خطوة
 */
export function useCompleteStep() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const refreshUser = useUserRefreshOnCompletion()

  return useMutation({
    mutationFn: ({ stepKey, metadata }: { stepKey: OnboardingStepKey; metadata?: Record<string, unknown> }) =>
      completeStep(stepKey, metadata),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATS_KEY })
      await refreshUser(result)
    },
    // بدون هذا كان الفشل يُبتلع في console.error فقط: يضغط المدير «التالي»
    // فلا يحدث شيء ولا يعرف السبب.
    onError: (error) => {
      const missing = describeMissingRequirements(error)

      toast({
        type: 'error',
        title: getErrorMessage(error, 'تعذّر إكمال هذه الخطوة'),
        description: missing ? `المتبقّي: ${missing}` : undefined,
      })
    },
  })
}

/**
 * Hook لتخطي خطوة — الخطوات الإلزامية تتطلب تأكيداً صريحاً من الباك
 */
export function useSkipStep() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const refreshUser = useUserRefreshOnCompletion()

  return useMutation({
    mutationFn: ({ stepKey, confirm }: { stepKey: OnboardingStepKey; confirm?: boolean }) =>
      completeStep(stepKey, { skipped: true }, true, confirm),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ONBOARDING_STATS_KEY })
      toast({ type: 'info', title: 'تم تخطي الخطوة — يمكنك إكمالها لاحقاً من لوحة التحكم' })
      await refreshUser(result)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذّر تخطي هذه الخطوة') })
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

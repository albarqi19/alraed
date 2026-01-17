import { apiClient } from '@/services/api/client'
import type { CompleteStepResponse, OnboardingStats, OnboardingStatus, OnboardingStepKey } from './types'

/**
 * الحصول على حالة الإعداد الحالية
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await apiClient.get<{ success: boolean; data: OnboardingStatus }>('/admin/onboarding/status')
  return response.data.data
}

/**
 * إكمال خطوة معينة
 */
export async function completeStep(
  step: OnboardingStepKey,
  metadata?: Record<string, unknown>,
  skip?: boolean,
): Promise<CompleteStepResponse> {
  const response = await apiClient.post<{ success: boolean; data: CompleteStepResponse }>(
    `/admin/onboarding/steps/${step}/complete`,
    { metadata, skip },
  )
  return response.data.data
}

/**
 * الحصول على إحصائيات الإعداد
 */
export async function getOnboardingStats(): Promise<OnboardingStats> {
  const response = await apiClient.get<{ success: boolean; data: OnboardingStats }>('/admin/onboarding/stats')
  return response.data.data
}

/**
 * إعادة ضبط الإعداد (للتطوير فقط)
 */
export async function resetOnboarding(): Promise<void> {
  await apiClient.post('/admin/onboarding/reset')
}

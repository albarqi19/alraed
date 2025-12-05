import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeSubscriptionPlan,
  createSubscriptionInvoice,
  fetchPublicSubscriptionPlans,
  fetchSubscriptionInvoices,
  fetchSubscriptionSummary,
  registerSchool,
  type SubscriptionInvoicesResult,
} from './api'
import type { BillingCycle, RegisterSchoolPayload } from './types'
import { useToast } from '@/shared/feedback/use-toast'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { adminQueryKeys } from '@/modules/admin/query-keys'
import type { SubscriptionPlan as AuthSubscriptionPlan } from '@/modules/auth/types'

const KNOWN_PLAN_CODES: AuthSubscriptionPlan[] = ['trial', 'basic', 'premium', 'enterprise']

function normalizePlanCode(planCode: string | null | undefined): AuthSubscriptionPlan | undefined {
  if (!planCode) return undefined
  return KNOWN_PLAN_CODES.includes(planCode as AuthSubscriptionPlan) ? (planCode as AuthSubscriptionPlan) : undefined
}

export function usePublicSubscriptionPlansQuery() {
  return useQuery({
    queryKey: ['public', 'subscription', 'plans'],
    queryFn: fetchPublicSubscriptionPlans,
    staleTime: 1000 * 60 * 60, // ساعة واحدة
  })
}

export function useRegisterSchoolMutation() {
  return useMutation({
    mutationFn: (payload: RegisterSchoolPayload) => registerSchool(payload),
  })
}

export function useSubscriptionSummaryQuery() {
  return useQuery({
    queryKey: adminQueryKeys.subscription.summary(),
    queryFn: fetchSubscriptionSummary,
    refetchOnMount: true,
  })
}

export function useChangeSubscriptionPlanMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (payload: { plan_code: string; billing_cycle: BillingCycle }) => changeSubscriptionPlan(payload),
    onSuccess: (subscription, variables) => {
      toast({ type: 'success', title: 'تم تحديث الخطة بنجاح' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.summary() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.invoices(undefined, undefined) })

      if (currentUser) {
        const normalizedPlan = normalizePlanCode(variables.plan_code)
        setUser({
          ...currentUser,
          school: currentUser.school
            ? {
                ...currentUser.school,
                plan: normalizedPlan ?? currentUser.school.plan,
                subscription_status: subscription?.status ?? currentUser.school.subscription_status,
                subscription_starts_at: subscription?.starts_at ?? currentUser.school.subscription_starts_at,
                subscription_ends_at: subscription?.ends_at ?? currentUser.school.subscription_ends_at,
              }
            : currentUser.school,
        })
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر تحديث الخطة'
      toast({ type: 'error', title: message })
    },
  })
}

export function useSubscriptionInvoicesQuery(filters?: { status?: string; page?: number }) {
  const status = filters?.status ?? undefined
  const page = filters?.page ?? 1

  return useQuery<SubscriptionInvoicesResult>({
    queryKey: adminQueryKeys.subscription.invoices(status, page),
    queryFn: () => fetchSubscriptionInvoices({ status, page }),
    placeholderData: (previous) => previous,
  })
}

export function useCreateSubscriptionInvoiceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSubscriptionInvoice,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إنشاء الفاتورة' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.invoices(undefined, undefined) })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر إنشاء الفاتورة'
      toast({ type: 'error', title: message })
    },
  })
}

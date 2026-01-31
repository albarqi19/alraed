import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeSubscriptionPlan,
  checkPaymentStatus,
  createSubscriptionInvoice,
  fetchPublicSubscriptionPlans,
  fetchSubscriptionInvoices,
  fetchSubscriptionSummary,
  initiatePayment,
  registerSchool,
  type SubscriptionInvoicesResult,
} from './api'
import type { BillingCycle, ChangePlanResponse, RegisterSchoolPayload } from './types'
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

export function useChangeSubscriptionPlanMutation(options?: {
  onPaymentRequired?: (response: ChangePlanResponse) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (payload: { plan_code: string; billing_cycle: BillingCycle; auto_pay?: boolean }) =>
      changeSubscriptionPlan(payload),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.summary() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.invoices(undefined, undefined) })

      // If payment is required, redirect to payment page
      if (response.payment_url) {
        toast({ type: 'info', title: 'جاري التحويل لصفحة الدفع...' })
        if (options?.onPaymentRequired) {
          options.onPaymentRequired(response)
        } else {
          // Default: redirect to payment URL
          window.location.href = response.payment_url
        }
        return
      }

      // Free plan or trial - activated immediately
      toast({ type: 'success', title: 'تم تفعيل الخطة بنجاح' })

      if (currentUser) {
        const normalizedPlan = normalizePlanCode(variables.plan_code)
        setUser({
          ...currentUser,
          school: currentUser.school
            ? {
                ...currentUser.school,
                plan: normalizedPlan ?? currentUser.school.plan,
                subscription_status: response.subscription?.status ?? currentUser.school.subscription_status,
                subscription_starts_at: response.subscription?.starts_at ?? currentUser.school.subscription_starts_at,
                subscription_ends_at: response.subscription?.ends_at ?? currentUser.school.subscription_ends_at,
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

/**
 * Initiate payment for a pending invoice
 */
export function useInitiatePaymentMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: number) => initiatePayment(invoiceId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subscription.invoices(undefined, undefined) })

      if (response.payment_url) {
        toast({ type: 'info', title: 'جاري التحويل لصفحة الدفع...' })
        window.location.href = response.payment_url
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر إنشاء رابط الدفع'
      toast({ type: 'error', title: message })
    },
  })
}

/**
 * Check payment status for an invoice
 */
export function usePaymentStatusQuery(invoiceId: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.subscription.paymentStatus(invoiceId),
    queryFn: () => (invoiceId ? checkPaymentStatus(invoiceId) : Promise.reject('No invoice ID')),
    enabled: options?.enabled !== false && invoiceId !== null,
    refetchInterval: 5000, // Poll every 5 seconds
  })
}

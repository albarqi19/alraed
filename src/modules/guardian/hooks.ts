import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchGuardianLeaveRequests,
  fetchGuardianPortalSettings,
  lookupGuardianStudent,
  submitGuardianLeaveRequest,
  fetchGuardianStoreOverview,
  fetchGuardianStoreCatalog,
  fetchGuardianStoreOrders,
  submitGuardianStoreOrder,
} from './api'
import { guardianQueryKeys } from './query-keys'
import type {
  GuardianLeaveRequestPayload,
  GuardianLeaveRequestRecord,
  GuardianPortalSettings,
  GuardianStudentSummary,
  GuardianStoreOverview,
  GuardianStoreCatalog,
  GuardianStoreOrderRecord,
  GuardianStoreOrderPayload,
} from './types'

type GuardianSubmissionResult = Awaited<ReturnType<typeof submitGuardianLeaveRequest>>

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return fallback
}

export function useGuardianStudentLookupMutation() {
  const toast = useToast()

  return useMutation<GuardianStudentSummary, unknown, string>({
    mutationFn: (nationalId: string) => lookupGuardianStudent(nationalId.trim()),
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر العثور على بيانات الطالب') })
    },
  })
}

export function useGuardianSettingsQuery() {
  return useQuery<GuardianPortalSettings>({
    queryKey: guardianQueryKeys.settings(),
    queryFn: fetchGuardianPortalSettings,
  })
}

export function useGuardianLeaveRequestsQuery(nationalId: string | null) {
  return useQuery<GuardianLeaveRequestRecord[]>({
    queryKey: nationalId ? guardianQueryKeys.leaveRequests(nationalId) : ['guardian', 'leave-requests', 'idle'],
    queryFn: () => fetchGuardianLeaveRequests(nationalId as string),
    enabled: Boolean(nationalId),
  })
}

export function useGuardianLeaveRequestSubmissionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<GuardianSubmissionResult, unknown, GuardianLeaveRequestPayload>({
    mutationFn: submitGuardianLeaveRequest,
    onSuccess: (_result, variables) => {
      toast({ type: 'success', title: 'تم إرسال طلب الاستئذان بنجاح' })
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.leaveRequests(variables.national_id) })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال طلب الاستئذان') })
    },
  })
}

export function useGuardianStoreOverviewQuery(nationalId: string | null) {
  const cacheKey = guardianQueryKeys.storeOverview(nationalId ?? '__idle__')
  return useQuery<GuardianStoreOverview>({
    queryKey: cacheKey,
    queryFn: () => fetchGuardianStoreOverview(nationalId as string),
    enabled: Boolean(nationalId),
  })
}

export function useGuardianStoreCatalogQuery(nationalId: string | null) {
  const cacheKey = guardianQueryKeys.storeCatalog(nationalId ?? '__idle__')
  return useQuery<GuardianStoreCatalog>({
    queryKey: cacheKey,
    queryFn: () => fetchGuardianStoreCatalog(nationalId as string),
    enabled: Boolean(nationalId),
  })
}

export function useGuardianStoreOrdersQuery(nationalId: string | null) {
  const cacheKey = guardianQueryKeys.storeOrders(nationalId ?? '__idle__')
  return useQuery<GuardianStoreOrderRecord[]>({
    queryKey: cacheKey,
    queryFn: () => fetchGuardianStoreOrders(nationalId as string),
    enabled: Boolean(nationalId),
  })
}

export function useGuardianStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<GuardianStoreOrderRecord, unknown, GuardianStoreOrderPayload>({
    mutationFn: submitGuardianStoreOrder,
    onSuccess: (_order, variables) => {
      const nationalId = variables.national_id
      toast({ type: 'success', title: 'تم إرسال طلب الاستبدال بنجاح' })
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.storeOverview(nationalId) })
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.storeOrders(nationalId) })
      queryClient.invalidateQueries({ queryKey: guardianQueryKeys.storeCatalog(nationalId) })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال طلب الاستبدال') })
    },
  })
}

// ================== Guardian Dashboard Hooks ==================

import {
  fetchGuardianDashboard,
  fetchGuardianMessages,
  fetchGuardianAttendance,
  fetchGuardianBehavior,
  type GuardianDashboardData,
  type GuardianMessagesData,
  type GuardianAttendanceData,
  type GuardianBehaviorData,
} from './api'

export function useGuardianDashboardQuery(nationalId: string | null) {
  return useQuery<GuardianDashboardData>({
    queryKey: ['guardian', 'dashboard', nationalId],
    queryFn: () => fetchGuardianDashboard(nationalId as string),
    enabled: Boolean(nationalId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGuardianMessagesQuery(nationalId: string | null) {
  return useQuery<GuardianMessagesData>({
    queryKey: ['guardian', 'messages', nationalId],
    queryFn: () => fetchGuardianMessages(nationalId as string),
    enabled: Boolean(nationalId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useGuardianAttendanceQuery(nationalId: string | null) {
  return useQuery<GuardianAttendanceData>({
    queryKey: ['guardian', 'attendance', nationalId],
    queryFn: () => fetchGuardianAttendance(nationalId as string),
    enabled: Boolean(nationalId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGuardianBehaviorQuery(nationalId: string | null) {
  return useQuery<GuardianBehaviorData>({
    queryKey: ['guardian', 'behavior', nationalId],
    queryFn: () => fetchGuardianBehavior(nationalId as string),
    enabled: Boolean(nationalId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}


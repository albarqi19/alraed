import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchGuardianLeaveRequests,
  fetchGuardianPortalSettings,
  lookupGuardianStudent,
  submitGuardianLeaveRequest,
} from './api'
import { guardianQueryKeys } from './query-keys'
import type {
  GuardianLeaveRequestPayload,
  GuardianLeaveRequestRecord,
  GuardianPortalSettings,
  GuardianStudentSummary,
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { farisQueryKeys } from './query-keys'
import {
  fetchFarisSettings,
  saveFarisSettings,
  testFarisConnection,
  triggerDailySync,
  triggerFullSync,
  fetchSyncStatus,
  fetchSyncLogs,
  fetchFarisLeaves,
  fetchFarisPending,
  fetchReconciliation,
  fetchTeacherFarisReport,
} from './api'

export function useFarisSettingsQuery() {
  return useQuery({
    queryKey: farisQueryKeys.settings(),
    queryFn: fetchFarisSettings,
  })
}

export function useSaveFarisSettingsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveFarisSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: farisQueryKeys.settings() }),
  })
}

export function useTestFarisConnectionMutation() {
  return useMutation({ mutationFn: testFarisConnection })
}

export function useTriggerDailySyncMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerDailySync,
    onSuccess: () => qc.invalidateQueries({ queryKey: farisQueryKeys.syncStatus() }),
  })
}

export function useTriggerFullSyncMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (year?: number) => triggerFullSync(year),
    onSuccess: () => qc.invalidateQueries({ queryKey: farisQueryKeys.syncStatus() }),
  })
}

export function useSyncStatusQuery(polling = false) {
  return useQuery({
    queryKey: farisQueryKeys.syncStatus(),
    queryFn: fetchSyncStatus,
    refetchInterval: polling ? 5000 : false,
  })
}

export function useSyncLogsQuery() {
  return useQuery({
    queryKey: farisQueryKeys.syncLogs(),
    queryFn: fetchSyncLogs,
  })
}

export function useFarisLeavesQuery(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: farisQueryKeys.leaves(params),
    queryFn: () => fetchFarisLeaves(params as any),
  })
}

export function useFarisPendingQuery() {
  return useQuery({
    queryKey: farisQueryKeys.pending(),
    queryFn: fetchFarisPending,
  })
}

export function useReconciliationQuery(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: farisQueryKeys.reconciliation(params),
    queryFn: () => fetchReconciliation(params as any),
  })
}

export function useTeacherFarisReportQuery(teacherId: number, year?: number) {
  return useQuery({
    queryKey: farisQueryKeys.teacherReport(teacherId, year),
    queryFn: () => fetchTeacherFarisReport(teacherId, year),
    enabled: !!teacherId,
  })
}

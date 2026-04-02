export const farisQueryKeys = {
  root: ['admin', 'faris'] as const,
  settings: () => ['admin', 'faris', 'settings'] as const,
  syncStatus: () => ['admin', 'faris', 'sync-status'] as const,
  syncLogs: () => ['admin', 'faris', 'sync-logs'] as const,
  leaves: (params?: Record<string, unknown>) => ['admin', 'faris', 'leaves', params] as const,
  pending: () => ['admin', 'faris', 'pending'] as const,
  reconciliation: (params?: Record<string, unknown>) => ['admin', 'faris', 'reconciliation', params] as const,
  teacherReport: (teacherId: number, year?: number) => ['admin', 'faris', 'teacher', teacherId, year] as const,
}

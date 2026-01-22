export const guardianQueryKeys = {
  base: ['guardian'] as const,
  settings: () => ['guardian', 'settings'] as const,
  student: (nationalId: string) => ['guardian', 'student', nationalId] as const,
  leaveRequests: (nationalId: string) => ['guardian', 'leave-requests', nationalId] as const,
  storeOverview: (nationalId: string) => ['guardian', 'store', 'overview', nationalId] as const,
  storeCatalog: (nationalId: string) => ['guardian', 'store', 'catalog', nationalId] as const,
  storeOrders: (nationalId: string) => ['guardian', 'store', 'orders', nationalId] as const,
  absences: (nationalId: string) => ['guardian', 'absences', nationalId] as const,
}

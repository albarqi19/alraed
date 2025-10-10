export const guardianQueryKeys = {
  base: ['guardian'] as const,
  settings: () => ['guardian', 'settings'] as const,
  student: (nationalId: string) => ['guardian', 'student', nationalId] as const,
  leaveRequests: (nationalId: string) => ['guardian', 'leave-requests', nationalId] as const,
}

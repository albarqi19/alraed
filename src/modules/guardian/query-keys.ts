export const guardianQueryKeys = {
  base: ['guardian'] as const,
  settings: () => ['guardian', 'settings'] as const,
  student: (nationalId: string) => ['guardian', 'student', nationalId] as const,
  leaveRequests: (nationalId: string) => ['guardian', 'leave-requests', nationalId] as const,
  storeOverview: (nationalId: string) => ['guardian', 'store', 'overview', nationalId] as const,
  storeCatalog: (nationalId: string) => ['guardian', 'store', 'catalog', nationalId] as const,
  storeOrders: (nationalId: string) => ['guardian', 'store', 'orders', nationalId] as const,
  absences: (nationalId: string) => ['guardian', 'absences', nationalId] as const,

  // النداء الآلي — مفتاحان بلا هويّة طالب عمداً: الخادم يشتقّ وليَّ الأمر من
  // جلسته، فطابورُه واحدٌ لكلّ أبنائه، ونسخةٌ واحدةٌ منه في الذاكرة تخدم لوحة
  // الخدمات والشريط العلويّ معاً بلا طلبين متوازيين.
  autoCallSettings: () => ['guardian', 'auto-call', 'settings'] as const,
  autoCallQueue: () => ['guardian', 'auto-call', 'queue'] as const,
}

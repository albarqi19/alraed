/**
 * مفاتيح React Query لنظام إجراءات التأخير
 */

export const delayActionsQueryKeys = {
  // المفتاح الجذري
  root: ['delay-actions'] as const,

  // قائمة المعلمين مع التأخير
  list: (filters: Record<string, unknown>) =>
    ['delay-actions', 'list', filters] as const,

  // الإحصائيات
  statistics: (fiscalYear?: number) =>
    ['delay-actions', 'statistics', fiscalYear ?? 'current'] as const,

  // المعلمون الذين ينتظرون تنبيه
  pendingWarnings: (fiscalYear?: number) =>
    ['delay-actions', 'pending-warnings', fiscalYear ?? 'current'] as const,

  // المعلمون الذين ينتظرون حسم
  pendingDeductions: (fiscalYear?: number) =>
    ['delay-actions', 'pending-deductions', fiscalYear ?? 'current'] as const,

  // تفاصيل معلم
  teacherDetails: (userId: number, fiscalYear?: number) =>
    ['delay-actions', 'teacher-details', userId, fiscalYear ?? 'current'] as const,

  // تاريخ الإجراءات
  history: (filters: Record<string, unknown>) =>
    ['delay-actions', 'history', filters] as const,

  // الإعدادات
  settings: () => ['delay-actions', 'settings'] as const,

  // ==================== مفاتيح أعذار التأخير ====================

  // المفتاح الجذري للأعذار
  excusesRoot: ['delay-excuses'] as const,

  // قائمة الأعذار
  excusesList: (filters: Record<string, unknown>) =>
    ['delay-excuses', 'list', filters] as const,

  // إحصائيات الأعذار
  excusesStatistics: (fiscalYear?: number) =>
    ['delay-excuses', 'statistics', fiscalYear ?? 'current'] as const,

  // تفاصيل عذر
  excuseDetails: (id: number) =>
    ['delay-excuses', 'details', id] as const,

  // إعدادات الأعذار
  excusesSettings: () => ['delay-excuses', 'settings'] as const,

  // إعدادات المعلمين الفردية
  teacherExcuseSettings: () => ['delay-excuses', 'teacher-settings'] as const,
}

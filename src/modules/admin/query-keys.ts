export const adminQueryKeys = {
  root: ['admin'] as const,
  dashboard: () => ['admin', 'dashboard', 'stats'] as const,
  teachers: {
    all: () => ['admin', 'teachers', 'list'] as const,
    detail: (id: number) => ['admin', 'teachers', id] as const,
  },
  students: {
    all: () => ['admin', 'students', 'list'] as const,
    detail: (id: number) => ['admin', 'students', id] as const,
    grades: () => ['admin', 'students', 'grades'] as const,
    classes: (grade?: string) => ['admin', 'students', 'classes', grade ?? 'all'] as const,
    gradesWithClasses: () => ['admin', 'students', 'grades-with-classes'] as const,
  },
  subjects: {
    all: () => ['admin', 'subjects', 'list'] as const,
    detail: (id: number) => ['admin', 'subjects', id] as const,
  },
  classSessions: {
    all: () => ['admin', 'class-sessions', 'list'] as const,
    summary: () => ['admin', 'class-schedules', 'summary'] as const,
    schedule: (grade: string, className: string) => ['admin', 'class-schedules', grade, className] as const,
  },
  teacherSchedules: {
    summary: () => ['admin', 'teacher-schedules', 'summary'] as const,
    schedule: (teacherId: number) => ['admin', 'teacher-schedules', teacherId] as const,
    dayLimits: () => ['admin', 'teacher-schedules', 'day-limits'] as const,
  },
  schedules: {
    all: () => ['admin', 'schedules', 'list'] as const,
    detail: (id: number) => ['admin', 'schedules', id] as const,
    templates: () => ['admin', 'schedules', 'templates'] as const,
  },
  attendance: {
    reports: (filters: Record<string, unknown>) => ['admin', 'attendance', 'reports', filters] as const,
    pending: () => ['admin', 'attendance', 'pending'] as const,
    missingSessions: () => ['admin', 'attendance', 'missing-sessions'] as const,
    sessionDetails: (attendanceId: number) => ['admin', 'attendance', 'session-details', attendanceId] as const,
    reportMatrix: (filters: Record<string, unknown>) => ['admin', 'attendance', 'report-matrix', filters] as const,
    classesForManualAbsence: () => ['admin', 'attendance', 'classes-for-manual-absence'] as const,
    studentsForManualAbsence: (grade: string, className: string) => 
      ['admin', 'attendance', 'students-for-manual-absence', grade, className] as const,
  },
  teacherAttendance: {
    root: () => ['admin', 'teacher-attendance'] as const,
    today: (filters: Record<string, unknown>) => ['admin', 'teacher-attendance', 'today', filters] as const,
    settings: () => ['admin', 'teacher-attendance', 'settings'] as const,
    delays: (filters: Record<string, unknown>) => ['admin', 'teacher-attendance', 'delays', filters] as const,
  },
  lateArrivals: {
    list: (filters: Record<string, unknown>) => ['admin', 'late-arrivals', 'list', filters] as const,
    stats: () => ['admin', 'late-arrivals', 'stats'] as const,
  },
  dutyRosters: {
    list: (filters: Record<string, unknown>) => ['admin', 'duty-rosters', 'list', filters] as const,
  },
  dutyRosterSettings: () => ['admin', 'duty-roster', 'settings'] as const,
  dutyRosterTemplates: {
    root: () => ['admin', 'duty-roster-templates'] as const,
    list: (filters: Record<string, unknown>) => ['admin', 'duty-roster-templates', 'list', filters] as const,
    detail: (id: number) => ['admin', 'duty-roster-templates', id] as const,
  },
  leaveRequests: {
    list: (filters: Record<string, unknown>) => ['admin', 'leave-requests', 'list', filters] as const,
  },
  import: {
    studentsPreview: () => ['admin', 'import', 'students', 'preview'] as const,
    summary: () => ['admin', 'import', 'summary'] as const,
  },
  settings: () => ['admin', 'settings'] as const,
  points: {
    settings: () => ['admin', 'points', 'settings'] as const,
    reasons: () => ['admin', 'points', 'reasons'] as const,
    transactions: (filters: Record<string, unknown>) => ['admin', 'points', 'transactions', filters] as const,
    leaderboard: (filters: Record<string, unknown>) => ['admin', 'points', 'leaderboard', filters] as const,
    cards: (filters: Record<string, unknown>) => ['admin', 'points', 'cards', filters] as const,
  },
  store: {
    settings: () => ['admin', 'store', 'settings'] as const,
    stats: () => ['admin', 'store', 'stats'] as const,
    categories: () => ['admin', 'store', 'categories'] as const,
    items: (filters: Record<string, unknown>) => ['admin', 'store', 'items', filters] as const,
    orders: (filters: Record<string, unknown>) => ['admin', 'store', 'orders', filters] as const,
  },
  whatsapp: {
    instances: () => ['admin', 'whatsapp', 'instances'] as const,
    statistics: () => ['admin', 'whatsapp', 'statistics'] as const,
    queue: () => ['admin', 'whatsapp', 'queue'] as const,
    history: (filters?: Record<string, unknown>) => 
      filters && Object.keys(filters).length > 0
        ? (['admin', 'whatsapp', 'history', filters] as const)
        : (['admin', 'whatsapp', 'history'] as const),
    templates: () => ['admin', 'whatsapp', 'templates'] as const,
    settings: () => ['admin', 'whatsapp', 'settings'] as const,
    students: {
      all: () => ['admin', 'whatsapp', 'students', 'all'] as const,
      absent: (days: number) => ['admin', 'whatsapp', 'students', 'absent', days] as const,
    },
  },
  subscription: {
    summary: () => ['admin', 'subscription', 'summary'] as const,
    invoices: (status?: string, page?: number) => ['admin', 'subscription', 'invoices', status ?? 'all', page ?? 1] as const,
    paymentStatus: (invoiceId: number | null) => ['admin', 'subscription', 'payment-status', invoiceId] as const,
  },
}
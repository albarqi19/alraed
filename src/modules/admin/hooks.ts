import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import {
  activateSchedule,
  addQuickClassSession,
  applyScheduleToClass,
  applyScheduleToMultipleClasses,
  approveAllPendingSessions,
  approveAttendanceRecord,
  approveAttendanceSession,
  approveLeaveRequest,
  cancelLeaveRequest,
  createClassSession,
  createLateArrival,
  createLeaveRequest,
  createSchedule,
  createStudent,
  createSubject,
  createTeacher,
  createWhatsappTemplate,
  deactivateSchedule,
  deleteAllClassSchedules,
  deleteClassSchedule,
  deleteClassScheduleSession,
  previewTimeTableImport,
  confirmTimeTableImport,
  deleteClassSession,
  deleteLateArrival,
  deleteSchedule,
  deleteAllPendingWhatsappMessages,
  deleteWhatsappQueueItem,
  deleteWhatsappTemplate,
  downloadStudentsTemplate,
  downloadTeachersTemplate,
  exportAttendanceReport,
  fetchAdminDashboardStats,
  fetchAdminSettings,
  fetchAttendanceReportMatrix,
  fetchAttendanceReports,
  fetchAttendanceSessionDetails,
  fetchClassSchedule,
  fetchClassScheduleSummary,
  fetchClassSessions,
  fetchLateArrivalStats,
  fetchLateArrivals,
  fetchDutyRosters,
  fetchDutyRosterSettings,
  fetchLeaveRequests,
  fetchMissingSessions,
  fetchPendingApprovals,
  fetchTeacherHudoriAttendance,
  fetchTeacherAttendanceSettings,
  fetchTeacherAttendanceDelays,
  fetchScheduleDetails,
  fetchScheduleTemplates,
  fetchTeachers,
  fetchWhatsappAbsentStudents,
  fetchWhatsappHistory,
  fetchWhatsappQueue,
  fetchWhatsappSettings,
  fetchWhatsappStatistics,
  fetchWhatsappStudents,
  fetchWhatsappTemplates,
  importStudents,
  importTeachers,
  previewImportStudents,
  rejectAttendanceRecord,
  rejectAttendanceSession,
  rejectLeaveRequest,
  resetTeacherPassword,
  updateAttendanceStatus,
  sendLateArrivalMessage,
  sendPendingWhatsappMessages,
  sendSingleWhatsappMessage,
  sendWhatsappBulkMessages,
  testWebhook,
  testWhatsappConnection,
  fetchTeacherSchedule,
  fetchTeacherScheduleSummary,
  previewTeacherScheduleMove,
  confirmTeacherScheduleMove,
  fetchTeacherScheduleDayLimits,
  updateTeacherScheduleDayLimits,
  updateAdminSettings,
  updateClassSession,
  updateLeaveRequest,
  updateSchedule,
  updateStudent,
  updateSubject,
  updateTeacher,
  updateTeacherAttendanceSettings,
  updateWhatsappSettings,
  updateWhatsappTemplate,
  updateDutyRosterSettings,
  sendDutyScheduleReminders,
  recalculateTeacherAttendanceDelay,
  notifyTeacherAttendanceDelay,
  updateTeacherAttendanceDelayStatus,
  fetchPointSettings,
  updatePointSettings,
  fetchPointReasons,
  createPointReason,
  updatePointReason,
  deactivatePointReason,
  fetchPointTransactions,
  createManualPointTransaction,
  undoPointTransaction,
  fetchPointLeaderboard,
  fetchPointCards,
  regeneratePointCard,
  fetchStoreStats,
  fetchStoreSettings,
  fetchStoreCategories,
  createStoreCategory,
  updateStoreCategory,
  deleteStoreCategory,
  fetchStoreItems,
  createStoreItem,
  updateStoreItem,
  deleteStoreItem,
  fetchStoreOrders,
  createStoreOrder,
  approveStoreOrder,
  fulfillStoreOrder,
  cancelStoreOrder,
  rejectStoreOrder,
  updateStoreSettings,
  deleteTeacher,
  deleteStudent,
  deleteSubject,
  fetchStudents,
  fetchSubjects,
  fetchGrades,
  fetchClasses,
  fetchGradesWithClasses,
  fetchScheduleSessionData,
  fetchSchedules,
  createDutyRoster,
  markDutyRosterAssignmentAbsent,
  assignDutyRosterReplacement,
  createDutyRosterTemplate,
  deleteDutyRosterTemplate,
  fetchDutyRosterTemplates,
  updateDutyRosterTemplate,
  fetchAbsenceSmsSettings,
  updateAbsenceSmsSettings,
  fetchLiveTrackerData,
  recordTrackerAction,
  deleteTrackerAction,
} from './api'
import { adminQueryKeys } from './query-keys'
import { useToast } from '@/shared/feedback/use-toast'
import type {
  AttendanceReportFiltersPayload,
  AttendanceSessionDetails,
  ImportStudentsPayload,
  LeaveRequestFilters,
  LeaveRequestRecord,
  PointSettingsUpdatePayload,
  PointReasonPayload,
  PointTransactionFilters,
  PointLeaderboardFilters,
  PointCardFilters,
  StoreItemFilters,
  StoreOrderFilters,
  StoreCategoryPayload,
  StoreItemPayload,
  StoreOrderPayload,
  StoreSettingsPayload,
  DutyRosterFilters,
  DutyRosterCreatePayload,
  DutyRosterMarkAbsentPayload,
  DutyRosterAssignReplacementPayload,
  DutyRosterTemplateFilters,
  DutyRosterTemplatePayload,
  DutyRosterTemplateUpdatePayload,
  DutyRosterSettingsUpdatePayload,
  TeacherHudoriAttendanceFilters,
  TeacherAttendanceSettingsPayload,
  TeacherAttendanceDelayFilters,
  TeacherAttendanceDelayRecalculatePayload,
  TeacherAttendanceDelayStatusUpdatePayload,
  SmsStatistics,
  SmsRegisteredDevice,
  SmsMessage,
  SmsDeviceActivityLog,
  SendSmsPayload,
  RegisterDevicePayload,
  TeacherScheduleResult,
  TeacherScheduleSummary,
  TeacherScheduleMovePreviewPayload,
  TeacherScheduleMovePreviewResult,
  TeacherScheduleMoveConfirmPayload,
  TeacherScheduleMoveConfirmResult,
  TeacherScheduleDayLimits,
  TeacherScheduleDayLimitsResponse,
  NoorSyncRecord,
  TimeTableTeacherMapping,
  TimeTableSubjectMapping,
  TimeTableClassMapping,
} from './types'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

type AttendanceFilters = Record<string, string | number | boolean | undefined>
type LateArrivalFilters = {
  date?: string
  className?: string
  studentId?: number
}
type DutyRosterQueryOptions = { enabled?: boolean }
type DutyRosterTemplateQueryOptions = { enabled?: boolean }
type DutyRosterMarkAbsentArgs = {
  shiftId: number
  assignmentId: number
  payload?: DutyRosterMarkAbsentPayload
}
type DutyRosterAssignReplacementArgs = {
  shiftId: number
  assignmentId: number
  payload: DutyRosterAssignReplacementPayload
}
type DutyRosterTemplateUpdateArgs = {
  id: number
  payload: DutyRosterTemplateUpdatePayload
}
type TeacherHudoriAttendanceQueryOptions = {
  enabled?: boolean
  refetchInterval?: number
}

type TeacherAttendanceSettingsQueryOptions = {
  enabled?: boolean
}

type TeacherAttendanceDelaysQueryOptions = {
  enabled?: boolean
  refetchInterval?: number
}

type UpdateTeacherAttendanceDelayStatusArgs = {
  attendanceId: number
  payload: TeacherAttendanceDelayStatusUpdatePayload
}

type RecalculateTeacherAttendanceDelayArgs = {
  attendanceId: number
  payload?: TeacherAttendanceDelayRecalculatePayload
}

export function useTeacherHudoriAttendanceQuery(
  filters: TeacherHudoriAttendanceFilters = {},
  options: TeacherHudoriAttendanceQueryOptions = {},
) {
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== '' && value !== 'all'),
  )

  const enabled = options.enabled ?? true
  const refetchInterval = enabled ? options.refetchInterval ?? 60_000 : undefined

  return useQuery({
    queryKey: adminQueryKeys.teacherAttendance.today(normalizedFilters),
    queryFn: () => fetchTeacherHudoriAttendance(filters),
    enabled,
    refetchInterval,
    staleTime: 30_000,
  })
}

export function useTeacherAttendanceSettingsQuery(
  options: TeacherAttendanceSettingsQueryOptions = {},
) {
  return useQuery({
    queryKey: adminQueryKeys.teacherAttendance.settings(),
    queryFn: fetchTeacherAttendanceSettings,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateTeacherAttendanceSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TeacherAttendanceSettingsPayload) => updateTeacherAttendanceSettings(payload),
    onSuccess: (record) => {
      toast({ type: 'success', title: 'تم حفظ إعدادات حضور المعلمين' })
      queryClient.setQueryData(adminQueryKeys.teacherAttendance.settings(), record)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherAttendance.root(), exact: false })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ إعدادات حضور المعلمين') })
    },
  })
}

export function useTeacherAttendanceDelaysQuery(
  filters: TeacherAttendanceDelayFilters = {},
  options: TeacherAttendanceDelaysQueryOptions = {},
) {
  const normalizedFilters = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== '' && value !== 'all'),
  )

  const enabled = options.enabled ?? true
  const refetchInterval = enabled ? options.refetchInterval : undefined

  return useQuery({
    queryKey: adminQueryKeys.teacherAttendance.delays(normalizedFilters),
    queryFn: () => fetchTeacherAttendanceDelays(filters),
    enabled,
    refetchInterval,
    staleTime: 0, // دائماً جلب بيانات جديدة عند تغيير الفلتر
    gcTime: 0, // عدم تخزين في cache
  })
}

export function useRecalculateTeacherAttendanceDelayMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendanceId, payload }: RecalculateTeacherAttendanceDelayArgs) =>
      recalculateTeacherAttendanceDelay(attendanceId, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إعادة احتساب التأخير' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherAttendance.root(), exact: false })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إعادة احتساب التأخير') })
    },
  })
}

export function useNotifyTeacherAttendanceDelayMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attendanceId: number) => notifyTeacherAttendanceDelay(attendanceId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تمت جدولة إرسال تنبيه التأخير' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherAttendance.root(), exact: false })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر جدولة رسالة التنبيه') })
    },
  })
}

export function useUpdateTeacherAttendanceDelayStatusMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendanceId, payload }: UpdateTeacherAttendanceDelayStatusArgs) =>
      updateTeacherAttendanceDelayStatus(attendanceId, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث حالة التأخير' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherAttendance.root(), exact: false })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث حالة التأخير') })
    },
  })
}

export function useTeacherAttendanceAdvancedStatsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...adminQueryKeys.teacherAttendance.root(), 'advanced-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: import('./types').TeacherAttendanceAdvancedStats }>(
        '/admin/teacher-attendance/advanced-stats'
      )
      return data.data
    },
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminDashboardStatsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: fetchAdminDashboardStats,
    refetchOnMount: true,
  })
}

export function useTeachersQuery() {
  return useQuery({
    queryKey: adminQueryKeys.teachers.all(),
    queryFn: fetchTeachers,
  })
}

export function useCreateTeacherMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTeacher,
    onSuccess: (response) => {
      toast({ type: 'success', title: `تم إضافة المعلم ${response.teacher.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة المعلم') })
    },
  })
}

export function useUpdateTeacherMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateTeacher>[1] }) =>
      updateTeacher(id, payload),
    onSuccess: (teacher) => {
      toast({ type: 'success', title: `تم تحديث بيانات ${teacher.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث بيانات المعلم') })
    },
  })
}

export function useDeleteTeacherMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف المعلم' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف المعلم') })
    },
  })
}

export function useResetTeacherPasswordMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: resetTeacherPassword,
    onSuccess: (credentials) => {
      toast({
        type: 'info',
        title: 'تم إنشاء كلمة مرور جديدة',
        description: `الهوية: ${credentials.national_id}`,
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إعادة تعيين كلمة المرور') })
    },
  })
}

export function useDutyRosterSettingsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.dutyRosterSettings(),
    queryFn: fetchDutyRosterSettings,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateDutyRosterSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DutyRosterSettingsUpdatePayload) => updateDutyRosterSettings(payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حفظ إعدادات المناوبات' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dutyRosterSettings() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ إعدادات المناوبات') })
    },
  })
}

export function useSendDutyScheduleRemindersMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: (params: { date?: string; duty_type?: 'morning' | 'afternoon' }) =>
      sendDutyScheduleReminders(params),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: `تم إرسال ${result.sent} تذكير بنجاح`,
        description: result.failed > 0 ? `فشل ${result.failed} رسالة` : undefined,
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال التذكيرات') })
    },
  })
}

export function useDutyRosterTemplatesQuery(
  filters: DutyRosterTemplateFilters = {},
  options: DutyRosterTemplateQueryOptions = {},
) {
  const enabled = options.enabled ?? true
  const queryFilters = filters as unknown as Record<string, unknown>

  return useQuery({
    queryKey: adminQueryKeys.dutyRosterTemplates.list(queryFilters),
    queryFn: () => fetchDutyRosterTemplates(filters),
    enabled,
  })
}

export function useCreateDutyRosterTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DutyRosterTemplatePayload) => createDutyRosterTemplate(payload),
    onSuccess: (template) => {
      toast({ type: 'success', title: `تم حفظ قالب ${template.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dutyRosterTemplates.root() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ القالب الأسبوعي') })
    },
  })
}

export function useUpdateDutyRosterTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: DutyRosterTemplateUpdateArgs) => updateDutyRosterTemplate(id, payload),
    onSuccess: (template) => {
      toast({ type: 'success', title: `تم تحديث قالب ${template.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dutyRosterTemplates.root() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث القالب الأسبوعي') })
    },
  })
}

export function useDeleteDutyRosterTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: number) => deleteDutyRosterTemplate(templateId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف القالب بنجاح' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dutyRosterTemplates.root() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف القالب الأسبوعي') })
    },
  })
}

export function useStudentsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students.all(),
    queryFn: fetchStudents,
    enabled: options.enabled ?? true,
  })
}

export function useCreateStudentMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createStudent,
    onSuccess: (student) => {
      toast({ type: 'success', title: `تم إضافة الطالب ${student.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة الطالب') })
    },
  })
}

export function useUpdateStudentMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateStudent>[1] }) =>
      updateStudent(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث بيانات الطالب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث بيانات الطالب') })
    },
  })
}

export function useDeleteStudentMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الطالب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الطالب') })
    },
  })
}

/** جلب الصفوف الدراسية المتاحة للمدرسة الحالية (ديناميكياً) */
export function useGradesQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students.grades(),
    queryFn: fetchGrades,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  })
}

/** جلب الفصول لصف معين (ديناميكياً) */
export function useClassesQuery(grade?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students.classes(grade),
    queryFn: () => fetchClasses(grade),
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

/** جلب الصفوف مع فصولها (ديناميكياً) */
export function useGradesWithClassesQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students.gradesWithClasses(),
    queryFn: fetchGradesWithClasses,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSubjectsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.subjects.all(),
    queryFn: fetchSubjects,
  })
}

export function useCreateSubjectMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSubject,
    onSuccess: (subject) => {
      toast({ type: 'success', title: `تم إضافة المادة ${subject.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subjects.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة المادة') })
    },
  })
}

export function useUpdateSubjectMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateSubject>[1] }) =>
      updateSubject(id, payload),
    onSuccess: (subject) => {
      toast({ type: 'success', title: `تم تحديث مادة ${subject.name}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subjects.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث المادة') })
    },
  })
}

export function useDeleteSubjectMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف المادة' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.subjects.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف المادة') })
    },
  })
}

export function useClassSessionsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.classSessions.all(),
    queryFn: fetchClassSessions,
  })
}

export function useCreateClassSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClassSession,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إضافة الحصة' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة الحصة') })
    },
  })
}

export function useUpdateClassSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateClassSession>[1] }) =>
      updateClassSession(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث الحصة' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث الحصة') })
    },
  })
}

export function useDeleteClassSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClassSession,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الحصة' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الحصة') })
    },
  })
}

export function useClassScheduleSummaryQuery() {
  return useQuery({
    queryKey: adminQueryKeys.classSessions.summary(),
    queryFn: fetchClassScheduleSummary,
  })
}

export function useClassScheduleQuery(grade?: string, className?: string) {
  return useQuery({
    queryKey: grade && className ? adminQueryKeys.classSessions.schedule(grade, className) : ['admin', 'class-schedules'],
    queryFn: () => fetchClassSchedule(grade as string, className as string),
    enabled: Boolean(grade && className),
  })
}

export function useTeacherScheduleSummaryQuery() {
  return useQuery<TeacherScheduleSummary[]>({
    queryKey: adminQueryKeys.teacherSchedules.summary(),
    queryFn: fetchTeacherScheduleSummary,
  })
}

export function useTeacherScheduleQuery(teacherId?: number) {
  return useQuery<TeacherScheduleResult>({
    queryKey: teacherId ? adminQueryKeys.teacherSchedules.schedule(teacherId) : ['admin', 'teacher-schedules'],
    queryFn: () => fetchTeacherSchedule(teacherId as number),
    enabled: Boolean(teacherId),
  })
}

export function useTeacherScheduleDayLimitsQuery(options: { enabled?: boolean } = {}) {
  return useQuery<TeacherScheduleDayLimitsResponse>({
    queryKey: adminQueryKeys.teacherSchedules.dayLimits(),
    queryFn: fetchTeacherScheduleDayLimits,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateTeacherScheduleDayLimitsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<TeacherScheduleDayLimits, unknown, TeacherScheduleDayLimits>({
    mutationFn: (payload) => updateTeacherScheduleDayLimits(payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حفظ حدود الحصص اليومية' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherSchedules.dayLimits() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ حدود الحصص اليومية') })
    },
  })
}

export function useTeacherScheduleMovePreviewMutation() {
  const toast = useToast()

  return useMutation<TeacherScheduleMovePreviewResult, unknown, TeacherScheduleMovePreviewPayload>({
    mutationFn: (payload) => previewTeacherScheduleMove(payload),
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحليل التعارضات') })
    },
  })
}

type TeacherScheduleMoveConfirmVariables = TeacherScheduleMoveConfirmPayload & {
  source_teacher_id?: number | null
}

export function useTeacherScheduleMoveMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<TeacherScheduleMoveConfirmResult, unknown, TeacherScheduleMoveConfirmVariables>({
    mutationFn: ({ source_teacher_id: _sourceTeacherId, ...payload }) => {
      void _sourceTeacherId
      return confirmTeacherScheduleMove(payload)
    },
    onSuccess: (result, variables) => {
      toast({ type: 'success', title: result.message ?? 'تم نقل الحصة' })

      const teacherIds = new Set<number>()
      if (variables.target_teacher_id) teacherIds.add(variables.target_teacher_id)
      if (variables.source_teacher_id) teacherIds.add(variables.source_teacher_id)

      teacherIds.forEach((teacherId) => {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherSchedules.schedule(teacherId) })
      })

      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teacherSchedules.summary() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تنفيذ النقل') })
    },
  })
}

export function useAddQuickClassSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addQuickClassSession,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إضافة الحصة للجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة الحصة') })
    },
  })
}

export function useApplyScheduleToClassMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyScheduleToClass,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تطبيق الجدول على الفصل' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تطبيق الجدول') })
    },
  })
}

export function useApplyScheduleToMultipleClassesMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyScheduleToMultipleClasses,
    onSuccess: (_, variables) => {
      const classCount = variables.classes.length
      toast({ type: 'success', title: `تم تطبيق الجدول على ${classCount} فصل بنجاح` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تطبيق الجدول على الفصول') })
    },
  })
}

export function useDeleteClassScheduleSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteClassScheduleSession,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الحصة من الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الحصة من الجدول') })
    },
  })
}

export function useDeleteClassScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ grade, className, password }: { grade: string; className: string; password: string }) =>
      deleteClassSchedule(grade, className, password),
    onSuccess: (data) => {
      toast({
        type: 'success',
        title: `تم حذف ${data.deleted_sessions_count} حصة من جدول الفصل`,
        ...(data.preserved_attendance_count > 0 && {
          description: `تم الاحتفاظ بـ ${data.preserved_attendance_count} سجل حضور`,
        }),
      })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف جدول الفصل') })
    },
  })
}

export function useDeleteAllClassSchedulesMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (password: string) => deleteAllClassSchedules(password),
    onSuccess: (data) => {
      toast({
        type: 'success',
        title: `تم حذف ${data.deleted_sessions_count} حصة من ${data.deleted_classes_count} فصل`,
        ...(data.preserved_attendance_count > 0 && {
          description: `تم الاحتفاظ بـ ${data.preserved_attendance_count} سجل حضور`,
        }),
      })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف جداول الفصول') })
    },
  })
}

export function useScheduleSessionDataQuery() {
  return useQuery({
    queryKey: ['admin', 'class-schedules', 'session-data'],
    queryFn: fetchScheduleSessionData,
  })
}

export function useSchedulesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.schedules.all(),
    queryFn: fetchSchedules,
  })
}

export function useScheduleDetailsQuery(scheduleId?: number) {
  return useQuery({
    queryKey: scheduleId ? adminQueryKeys.schedules.detail(scheduleId) : ['admin', 'schedules', 'detail'],
    queryFn: () => fetchScheduleDetails(scheduleId as number),
    enabled: Boolean(scheduleId),
  })
}

export function useCreateScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إنشاء الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.schedules.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء الجدول') })
    },
  })
}

export function useUpdateScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateSchedule>[1] }) =>
      updateSchedule(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.schedules.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث الجدول') })
    },
  })
}

export function useActivateScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: number) => activateSchedule(scheduleId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تفعيل الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.schedules.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تفعيل الجدول') })
    },
  })
}

export function useDeactivateScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scheduleId: number) => deactivateSchedule(scheduleId),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تعطيل الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.schedules.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تعطيل الجدول') })
    },
  })
}

export function useDeleteScheduleMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الجدول' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.schedules.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الجدول') })
    },
  })
}

export function useScheduleTemplatesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.schedules.templates(),
    queryFn: fetchScheduleTemplates,
  })
}

export function useAttendanceReportsQuery(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: adminQueryKeys.attendance.reports(filters),
    queryFn: () => fetchAttendanceReports(filters),
  })
}

export function useAttendanceReportMatrixQuery(
  filters: AttendanceReportFiltersPayload | null,
  options: { enabled?: boolean } = {},
) {
  const queryKey = filters
    ? adminQueryKeys.attendance.reportMatrix(filters as unknown as Record<string, unknown>)
    : (['admin', 'attendance', 'report-matrix', 'idle'] as const)

  return useQuery({
    queryKey,
    queryFn: () => fetchAttendanceReportMatrix(filters as AttendanceReportFiltersPayload),
    enabled: Boolean(filters) && (options.enabled ?? true),
    staleTime: 60_000,
  })
}

export function usePendingApprovalsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.attendance.pending(),
    queryFn: fetchPendingApprovals,
    refetchInterval: 30_000,
  })
}

export function useMissingSessionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.attendance.missingSessions(),
    queryFn: fetchMissingSessions,
    refetchInterval: 60_000, // كل دقيقة
    enabled: options?.enabled ?? true,
  })
}

export function useAttendanceSessionDetailsQuery(attendanceId?: number) {
  return useQuery({
    queryKey: attendanceId
      ? adminQueryKeys.attendance.sessionDetails(attendanceId)
      : ['admin', 'attendance', 'session-details'],
    queryFn: () => fetchAttendanceSessionDetails(attendanceId as number),
    enabled: Boolean(attendanceId),
  })
}

export function useApproveAttendanceRecordMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveAttendanceRecord,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد سجل الحضور' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'reports'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد السجل') })
    },
  })
}

export function useRejectAttendanceRecordMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendanceId, reason }: { attendanceId: number; reason?: string }) =>
      rejectAttendanceRecord(attendanceId, reason),
    onSuccess: () => {
      toast({ type: 'warning', title: 'تم رفض سجل الحضور' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'reports'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر رفض السجل') })
    },
  })
}

export function useApproveAttendanceSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveAttendanceSession,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد التحضير' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.attendance.pending() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'reports'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد التحضير') })
    },
  })
}

export function useRejectAttendanceSessionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rejectAttendanceSession,
    onSuccess: () => {
      toast({ type: 'warning', title: 'تم رفض التحضير' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.attendance.pending() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'reports'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر رفض التحضير') })
    },
  })
}

type UpdateAttendanceStatusVariables = {
  attendanceId: number
  sessionDetailId?: number | null
  status: AttendanceSessionDetails['students'][number]['status']
  notes?: string | null
}

export function useUpdateAttendanceStatusMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<
    { attendance: AttendanceSessionDetails['students'][number]; statistics: AttendanceSessionDetails['statistics'] },
    unknown,
    UpdateAttendanceStatusVariables
  >({
    mutationFn: ({ attendanceId, status, notes }: UpdateAttendanceStatusVariables) =>
      updateAttendanceStatus(attendanceId, { status, notes }),
    onSuccess: (response, variables) => {
      toast({ type: 'success', title: 'تم تحديث حالة الطالب' })

      if (variables.sessionDetailId) {
        queryClient.setQueryData(
          adminQueryKeys.attendance.sessionDetails(variables.sessionDetailId),
          (previous: AttendanceSessionDetails | undefined) => {
            if (!previous) return previous

            const students = previous.students.map((student) =>
              student.attendance_id === response.attendance.attendance_id
                ? { ...student, ...response.attendance }
                : student,
            )

            return {
              ...previous,
              students,
              statistics: response.statistics,
            }
          },
        )
      }

      queryClient.invalidateQueries({ queryKey: adminQueryKeys.attendance.pending() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث حالة الطالب') })
    },
  })
}

export function useApproveAllPendingSessionsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: approveAllPendingSessions,
    onSuccess: (result: { approved_count: number; failed_count: number }) => {
      const title = `تم اعتماد ${result.approved_count} جلسة${result.failed_count > 0 ? ` (فشل ${result.failed_count})` : ''}`
      toast({ type: 'success', title })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.attendance.pending() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'reports'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد جميع الجلسات') })
    },
  })
}

export function useExportAttendanceReportMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: ({ format, filters }: { format: 'excel' | 'pdf'; filters: AttendanceFilters }) =>
      exportAttendanceReport(format, filters),
    onSuccess: () => {
      toast({ type: 'success', title: 'جارٍ تنزيل التقرير' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تصدير التقرير') })
    },
  })
}

export function useLateArrivalsQuery(
  filters: LateArrivalFilters = {},
  options: { enabled?: boolean; refetchInterval?: number } = {},
) {
  const enabled = options.enabled ?? true
  return useQuery({
    queryKey: adminQueryKeys.lateArrivals.list(filters),
    queryFn: () => fetchLateArrivals(filters),
    enabled,
    refetchInterval: enabled ? options.refetchInterval ?? 60_000 : undefined,
  })
}

export function useLateArrivalStatsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.lateArrivals.stats(),
    queryFn: fetchLateArrivalStats,
    refetchInterval: 60_000,
  })
}

export function useDeleteLateArrivalMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLateArrival,
    onSuccess: () => {
      toast({ type: 'success', title: 'تمت معالجة التأخير' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'late-arrivals'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.lateArrivals.stats() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف سجل التأخير') })
    },
  })
}

export function useSendLateArrivalMessageMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendLateArrivalMessage,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال رسالة التأخر' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'late-arrivals'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.lateArrivals.stats() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال رسالة التأخر') })
    },
  })
}

export function useCreateLateArrivalMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLateArrival,
    onSuccess: (response) => {
      toast({
        type: 'success',
        title: response.message ?? `تم تسجيل تأخير ${response.registered_count.toLocaleString('ar-SA')} طالب`,
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'late-arrivals'] })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.lateArrivals.stats() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل التأخير') })
    },
  })
}

export function useDutyRostersQuery(filters: DutyRosterFilters = {}, options: DutyRosterQueryOptions = {}) {
  const enabled = options.enabled ?? true

  return useQuery({
    queryKey: adminQueryKeys.dutyRosters.list(filters as Record<string, unknown>),
    queryFn: () => fetchDutyRosters(filters),
    enabled,
  })
}

export function useCreateDutyRosterMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DutyRosterCreatePayload) => createDutyRoster(payload),
    onSuccess: (shift) => {
      toast({ type: 'success', title: `تم إنشاء مناوبة ${shift.shift_type}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'duty-rosters'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء المناوبة') })
    },
  })
}

export function useMarkDutyRosterAssignmentAbsentMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, assignmentId, payload }: DutyRosterMarkAbsentArgs) =>
      markDutyRosterAssignmentAbsent(shiftId, assignmentId, payload ?? {}),
    onSuccess: () => {
      toast({ type: 'info', title: 'تم تسجيل عدم حضور المناوبة' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'duty-rosters'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل عدم الحضور') })
    },
  })
}

export function useAssignDutyRosterReplacementMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, assignmentId, payload }: DutyRosterAssignReplacementArgs) =>
      assignDutyRosterReplacement(shiftId, assignmentId, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تعيين البديل المؤقت' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'duty-rosters'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تعيين البديل') })
    },
  })
}

function invalidateLeaveRequests(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'leave-requests'] })
}

export function useLeaveRequestsQuery(filters: LeaveRequestFilters, options: { enabled?: boolean } = {}) {
  const queryFilters = filters as unknown as Record<string, unknown>
  const enabled = options.enabled ?? true

  return useQuery({
    queryKey: adminQueryKeys.leaveRequests.list(queryFilters),
    queryFn: () => fetchLeaveRequests(filters),
    enabled,
  })
}

export function useCreateLeaveRequestMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<LeaveRequestRecord, unknown, Parameters<typeof createLeaveRequest>[0]>({
    mutationFn: createLeaveRequest,
    onSuccess: (record) => {
      toast({ type: 'success', title: `تم تسجيل طلب استئذان للطالب ${record.student.name}` })
      invalidateLeaveRequests(queryClient)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء طلب الاستئذان') })
    },
  })
}

export function useUpdateLeaveRequestMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<LeaveRequestRecord, unknown, { id: number; payload: Parameters<typeof updateLeaveRequest>[1] }>({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateLeaveRequest>[1] }) =>
      updateLeaveRequest(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث طلب الاستئذان' })
      invalidateLeaveRequests(queryClient)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث طلب الاستئذان') })
    },
  })
}

export function useApproveLeaveRequestMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<LeaveRequestRecord, unknown, { id: number; decision_notes?: string | null }>({
    mutationFn: ({ id, decision_notes }: { id: number; decision_notes?: string | null }) =>
      approveLeaveRequest(id, decision_notes ? { decision_notes } : {}),
    onSuccess: (record) => {
      toast({ type: 'success', title: `تمت الموافقة على استئذان ${record.student.name}` })
      invalidateLeaveRequests(queryClient)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر الموافقة على الطلب') })
    },
  })
}

export function useRejectLeaveRequestMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<LeaveRequestRecord, unknown, { id: number; decision_notes: string }>({
    mutationFn: ({ id, decision_notes }: { id: number; decision_notes: string }) =>
      rejectLeaveRequest(id, decision_notes),
    onSuccess: (record) => {
      toast({ type: 'warning', title: `تم رفض طلب استئذان ${record.student.name}` })
      invalidateLeaveRequests(queryClient)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر رفض الطلب') })
    },
  })
}

export function useCancelLeaveRequestMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<LeaveRequestRecord, unknown, { id: number; decision_notes?: string | null }>({
    mutationFn: ({ id, decision_notes }: { id: number; decision_notes?: string | null }) =>
      cancelLeaveRequest(id, decision_notes ? { decision_notes } : {}),
    onSuccess: () => {
      toast({ type: 'info', title: 'تم إلغاء طلب الاستئذان' })
      invalidateLeaveRequests(queryClient)
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إلغاء الطلب') })
    },
  })
}

export function usePreviewImportStudentsMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: previewImportStudents,
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحليل ملف الطلاب') })
    },
  })
}

export function useImportStudentsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ formData, options }: { formData: FormData; options?: ImportStudentsPayload }) =>
      importStudents(formData, options),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم استيراد الطلاب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.students.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر استيراد الطلاب') })
    },
  })
}

export function useImportTeachersMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: importTeachers,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم استيراد المعلمين' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachers.all() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر استيراد المعلمين') })
    },
  })
}

export function useDownloadStudentsTemplateMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: downloadStudentsTemplate,
    onSuccess: (blob) => {
      // تنزيل الملف فعلياً
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'قالب_استيراد_الطلاب.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({ type: 'success', title: 'تم تنزيل قالب الطلاب بنجاح' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تنزيل القالب') })
    },
  })
}

export function useDownloadTeachersTemplateMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: downloadTeachersTemplate,
    onSuccess: (blob) => {
      // تنزيل الملف فعلياً
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'قالب_استيراد_المعلمين.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({ type: 'success', title: 'تم تنزيل قالب المعلمين بنجاح' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تنزيل القالب') })
    },
  })
}

export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.settings(),
    queryFn: fetchAdminSettings,
  })
}

export function useUpdateAdminSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حفظ الإعدادات' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حفظ الإعدادات') })
    },
  })
}

export function useTestWebhookMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: testWebhook,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال اختبار الويب هوك بنجاح' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اختبار الويب هوك') })
    },
  })
}

export function useWhatsappStatisticsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.statistics(),
    queryFn: fetchWhatsappStatistics,
    refetchInterval: 15_000,
  })
}

export function useWhatsappStudentsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.students.all(),
    queryFn: fetchWhatsappStudents,
  })
}

export function useWhatsappAbsentStudentsQuery(days: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.students.absent(days),
    queryFn: () => fetchWhatsappAbsentStudents(days),
    enabled: options?.enabled ?? true,
  })
}

export function useWhatsappQueueQuery() {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.queue(),
    queryFn: fetchWhatsappQueue,
    refetchInterval: 10_000,
  })
}

export function useWhatsappHistoryQuery(
  filters?: Parameters<typeof fetchWhatsappHistory>[0],
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true

  return useQuery({
    queryKey: adminQueryKeys.whatsapp.history(filters ?? {}),
    queryFn: () => fetchWhatsappHistory(filters),
    enabled,
  })
}

export function useWhatsappTemplatesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.templates(),
    queryFn: fetchWhatsappTemplates,
  })
}

export function useCreateWhatsappTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWhatsappTemplate,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إنشاء قالب الواتساب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.templates() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء القالب') })
    },
  })
}

export function useUpdateWhatsappTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateWhatsappTemplate>[1] }) =>
      updateWhatsappTemplate(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث القالب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.templates() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث القالب') })
    },
  })
}

export function useDeleteWhatsappTemplateMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWhatsappTemplate,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف القالب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.templates() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف القالب') })
    },
  })
}

export function usePointSettingsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.points.settings(),
    queryFn: fetchPointSettings,
  })
}

export function useUpdatePointSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PointSettingsUpdatePayload) => updatePointSettings(payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث إعدادات برنامج النقاط' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.points.settings() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث الإعدادات') })
    },
  })
}

export function usePointReasonsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.points.reasons(),
    queryFn: () => fetchPointReasons(),
  })
}

export function useCreatePointReasonMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PointReasonPayload) => createPointReason(payload),
    onSuccess: (reason) => {
      toast({ type: 'success', title: `تم إضافة السبب ${reason.title}` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.points.reasons() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة السبب') })
    },
  })
}

export function useUpdatePointReasonMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PointReasonPayload }) => updatePointReason(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث سبب النقاط' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.points.reasons() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث السبب') })
    },
  })
}

export function useDeactivatePointReasonMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deactivatePointReason,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تعطيل السبب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.points.reasons() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تعطيل السبب') })
    },
  })
}

export function usePointTransactionsQuery(filters: PointTransactionFilters) {
  return useQuery({
    queryKey: adminQueryKeys.points.transactions(filters as Record<string, unknown>),
    queryFn: () => fetchPointTransactions(filters),
  })
}

export function useCreateManualPointTransactionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createManualPointTransaction,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تسجيل العملية اليدوية' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'cards'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل العملية') })
    },
  })
}

export function useUndoPointTransactionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: undoPointTransaction,
    onSuccess: () => {
      toast({ type: 'info', title: 'تم إلغاء العملية' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'cards'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إلغاء العملية') })
    },
  })
}

export function usePointLeaderboardQuery(filters: PointLeaderboardFilters) {
  return useQuery({
    queryKey: adminQueryKeys.points.leaderboard(filters as Record<string, unknown>),
    queryFn: () => fetchPointLeaderboard(filters),
  })
}

export function usePointCardsQuery(filters: PointCardFilters) {
  return useQuery({
    queryKey: adminQueryKeys.points.cards(filters as Record<string, unknown>),
    queryFn: () => fetchPointCards(filters),
  })
}

export function useRegeneratePointCardMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: regeneratePointCard,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم توليد بطاقة جديدة' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'cards'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر توليد البطاقة') })
    },
  })
}

export function useStoreSettingsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.store.settings(),
    queryFn: fetchStoreSettings,
    refetchOnMount: true,
  })
}

export function useUpdateStoreSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StoreSettingsPayload) => updateStoreSettings(payload),
    onSuccess: (settings) => {
      toast({ type: 'success', title: 'تم تحديث إعدادات المتجر' })
      queryClient.setQueryData(adminQueryKeys.store.settings(), settings)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.store.stats() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث إعدادات المتجر') })
    },
  })
}

export function useStoreStatsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.store.stats(),
    queryFn: fetchStoreStats,
    refetchOnMount: true,
  })
}

export function useStoreCategoriesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.store.categories(),
    queryFn: fetchStoreCategories,
  })
}

export function useCreateStoreCategoryMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StoreCategoryPayload) => createStoreCategory(payload),
    onSuccess: (category) => {
      toast({ type: 'success', title: `تم إنشاء التصنيف ${category.name}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'categories'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء التصنيف') })
    },
  })
}

export function useUpdateStoreCategoryMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StoreCategoryPayload }) => updateStoreCategory(id, payload),
    onSuccess: (category) => {
      toast({ type: 'success', title: `تم تحديث ${category.name}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'categories'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث التصنيف') })
    },
  })
}

export function useDeleteStoreCategoryMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteStoreCategory(id),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف التصنيف' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'categories'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف التصنيف') })
    },
  })
}

export function useStoreItemsQuery(filters: StoreItemFilters = {}) {
  return useQuery({
    queryKey: adminQueryKeys.store.items(filters as Record<string, unknown>),
    queryFn: () => fetchStoreItems(filters),
  })
}

export function useCreateStoreItemMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StoreItemPayload) => createStoreItem(payload),
    onSuccess: (item) => {
      toast({ type: 'success', title: `تم إضافة المنتج ${item.name}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إضافة المنتج') })
    },
  })
}

export function useUpdateStoreItemMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StoreItemPayload }) => updateStoreItem(id, payload),
    onSuccess: (item) => {
      toast({ type: 'success', title: `تم تحديث ${item.name}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث المنتج') })
    },
  })
}

export function useDeleteStoreItemMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteStoreItem(id),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف المنتج' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'items'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف المنتج') })
    },
  })
}

export function useStoreOrdersQuery(filters: StoreOrderFilters = {}) {
  return useQuery({
    queryKey: adminQueryKeys.store.orders(filters as Record<string, unknown>),
    queryFn: () => fetchStoreOrders(filters),
  })
}

export function useCreateStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StoreOrderPayload) => createStoreOrder(payload),
    onSuccess: (order) => {
      toast({ type: 'success', title: `تم تسجيل طلب للطالب ${order.student.name}` })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء الطلب') })
    },
  })
}

export function useApproveStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => approveStoreOrder(id, reason),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم اعتماد الطلب' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اعتماد الطلب') })
    },
  })
}

export function useFulfillStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => fulfillStoreOrder(id, reason),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إنهاء الطلب وتسليمه' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنهاء الطلب') })
    },
  })
}

export function useCancelStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => cancelStoreOrder(id, reason),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إلغاء الطلب وإرجاع النقاط' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إلغاء الطلب') })
    },
  })
}

export function useRejectStoreOrderMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => rejectStoreOrder(id, reason),
    onSuccess: () => {
      toast({ type: 'info', title: 'تم رفض الطلب وإرجاع النقاط' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'store', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'points', 'transactions'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر رفض الطلب') })
    },
  })
}

export function useWhatsappSettingsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.whatsapp.settings(),
    queryFn: fetchWhatsappSettings,
  })
}

export function useUpdateWhatsappSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWhatsappSettings,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث إعدادات الواتساب' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.settings() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث الإعدادات') })
    },
  })
}

export function useDeleteWhatsappQueueItemMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWhatsappQueueItem,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الرسالة من الانتظار' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.queue() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الرسالة') })
    },
  })
}

export function useDeleteAllPendingWhatsappMessagesMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAllPendingWhatsappMessages,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف جميع الرسائل المعلقة بنجاح' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.queue() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.statistics() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الرسائل المعلقة') })
    },
  })
}

export function useSendPendingWhatsappMessagesMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: sendPendingWhatsappMessages,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال الرسائل المعلقة' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال الرسائل') })
    },
  })
}

export function useSendSingleWhatsappMessageMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: sendSingleWhatsappMessage,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال الرسالة' })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال الرسالة') })
    },
  })
}

export function useSendWhatsappBulkMessagesMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendWhatsappBulkMessages,
    onSuccess: ({ queued }) => {
      toast({ type: 'success', title: `تمت جدولة ${queued.toLocaleString('ar-SA')} رسالة` })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.queue() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.whatsapp.statistics() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال الرسائل') })
    },
  })
}

export function useTestWhatsappConnectionMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: testWhatsappConnection,
    onSuccess: (response) => {
      toast({
        type: response.success ? 'success' : 'warning',
        title: response.success ? 'الاتصال ناجح' : 'تأكد من الإعدادات',
        description: response.message,
      })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر اختبار الاتصال') })
    },
  })
}

export function useDownloadableAttendanceReportMutation() {
  return useExportAttendanceReportMutation()
}

// ===== SMS Gateway Hooks =====

export function useSmsStatisticsQuery() {
  return useQuery({
    queryKey: ['admin', 'sms', 'statistics'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SmsStatistics>>('/sms/statistics')
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    refetchInterval: 30000, // تحديث كل 30 ثانية
  })
}

export function useSmsDevicesQuery() {
  return useQuery({
    queryKey: ['admin', 'sms', 'devices'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SmsRegisteredDevice[]>>('/sms/devices')
      if (!data.success) throw new Error(data.message)
      return data.data
    },
  })
}

export function useSmsMessagesQuery(filters?: { status?: string; type?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'sms', 'messages', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{
          data: SmsMessage[]
          total: number
          current_page: number
          last_page: number
        }>
      >('/sms/messages', { params: filters })
      if (!data.success) throw new Error(data.message)
      return data.data
    },
  })
}

export function useSmsActivityLogQuery() {
  return useQuery({
    queryKey: ['admin', 'sms', 'activity-log'],
    queryFn: async () => {
      const { data } = await apiClient.get<
        ApiResponse<{
          data: SmsDeviceActivityLog[]
          total: number
          current_page: number
          last_page: number
        }>
      >('/sms/activity-log')
      if (!data.success) throw new Error(data.message)
      return data.data
    },
  })
}

export function useSendSmsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendSmsPayload) => {
      const { data } = await apiClient.post<ApiResponse<SmsMessage>>('/sms/send', payload)
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إضافة الرسالة إلى قائمة الانتظار' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'messages'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'statistics'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إرسال الرسالة') })
    },
  })
}

export function useRegisterSmsDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RegisterDevicePayload) => {
      const { data } = await apiClient.post<ApiResponse<{ device: SmsRegisteredDevice; api_token: string }>>(
        '/sms/devices/register',
        payload,
      )
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تسجيل الجهاز بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'devices'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'statistics'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل الجهاز') })
    },
  })
}

export function useDeleteSmsDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data } = await apiClient.delete<ApiResponse<void>>(`/sms/devices/${deviceId}`)
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الجهاز بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'devices'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'statistics'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الجهاز') })
    },
  })
}

export function useToggleSmsDeviceStatusMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data } = await apiClient.patch<ApiResponse<SmsRegisteredDevice>>(`/sms/devices/${deviceId}/toggle`)
      if (!data.success) throw new Error(data.message)
      return data.data
    },
    onSuccess: (device) => {
      toast({
        type: 'success',
        title: device.status === 'active' ? 'تم تفعيل الجهاز' : 'تم حظر الجهاز',
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'devices'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'sms', 'statistics'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تغيير حالة الجهاز') })
    },
  })
}

// =====================================================
// Noor Sync Hooks
// =====================================================

export function useNoorSyncRecordsQuery(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters)
  return useQuery({
    queryKey: ['admin', 'noor-sync', 'records', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<NoorSyncRecord[]>>(`/noor-sync/records?${params}`)
      if (!data.success) throw new Error(data.message)
      return data.data
    },
  })
}

// =====================================================
// Noor Excuse Sync Hooks (مزامنة الأعذار مع نور)
// =====================================================

export interface NoorExcuseSyncRecord {
  id: number
  student: {
    id: number
    name: string
    national_id: string
    class_name: string
    grade: string
  } | null
  absence_date: string
  excuse_text: string
  status: string
  synced_to_noor: boolean
  synced_to_noor_at: string | null
  sync_notes: string | null
  synced_by_user: {
    id: number
    name: string
  } | null
  reviewer: {
    id: number
    name: string
  } | null
  reviewed_at: string | null
}

export interface NoorExcuseSyncResponse {
  success: boolean
  data: NoorExcuseSyncRecord[]
  grouped_by_date: Record<string, NoorExcuseSyncRecord[]>
  stats: {
    total_synced: number
    today_synced: number
    pending_sync: number
  }
  filters: {
    grades: string[]
  }
}

export function useNoorExcuseSyncRecordsQuery(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters)
  return useQuery({
    queryKey: ['admin', 'noor-excuse-sync', 'records', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<NoorExcuseSyncResponse>(`/admin/absence-excuses/noor-sync-records?${params}`)
      if (!data.success) throw new Error('فشل في جلب البيانات')
      return data
    },
  })
}

// =====================================================
// Manual Absence Hooks (إضافة غياب يدوي من الإدارة)
// =====================================================

import {
  fetchClassesForManualAbsence,
  fetchStudentsForManualAbsence,
  createManualAbsence,
  type ClassForManualAbsence,
  type ManualAbsencePayload,
  type ManualAbsenceResponse,
} from './api'

export function useClassesForManualAbsenceQuery(options: { enabled?: boolean } = {}) {
  return useQuery<ClassForManualAbsence[]>({
    queryKey: adminQueryKeys.attendance.classesForManualAbsence(),
    queryFn: fetchClassesForManualAbsence,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  })
}

export function useStudentsForManualAbsenceQuery(
  grade: string | null,
  className: string | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled ?? (Boolean(grade) && Boolean(className))

  return useQuery({
    queryKey: adminQueryKeys.attendance.studentsForManualAbsence(grade ?? '', className ?? ''),
    queryFn: () => fetchStudentsForManualAbsence(grade!, className!),
    enabled,
    staleTime: 2 * 60 * 1000, // دقيقتين
  })
}

export function useCreateManualAbsenceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<ManualAbsenceResponse, unknown, ManualAbsencePayload>({
    mutationFn: createManualAbsence,
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: `تم تسجيل حضور ${result.saved_count} طالب`,
        description: `الفصل ${result.grade} ${result.class_name}`,
      })
      // تحديث قائمة التحضير المعلق
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.attendance.pending() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل الغياب اليدوي') })
    },
  })
}

// إحصائيات جدول الانتظار المتقدمة
export function useStandbyAdvancedStatsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['admin', 'teacher-standby', 'advanced-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<import('./types').StandbyAdvancedStatsResponse>(
        '/admin/teacher-standby/advanced-stats'
      )
      return data.data
    },
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000, // دقيقتين
  })
}

// ========================================
// إعدادات إرسال رسائل الغياب
// ========================================

export function useAbsenceSmsSettingsQuery() {
  return useQuery({
    queryKey: ['admin', 'attendance', 'sms-settings'],
    queryFn: fetchAbsenceSmsSettings,
    staleTime: 5 * 60 * 1000, // 5 دقائق
  })
}

export function useUpdateAbsenceSmsSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAbsenceSmsSettings,
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: result.send_absence_sms ? 'تم تفعيل إرسال رسائل الغياب' : 'تم إيقاف إرسال رسائل الغياب',
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'attendance', 'sms-settings'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث إعدادات الرسائل') })
    },
  })
}

// ========================================
// مؤشر المتابعة المباشر (Live Tracker)
// ========================================

import type { RecordActionPayload, DeleteActionPayload } from './live-tracker/types'

/**
 * Hook لجلب بيانات مؤشر المتابعة المباشر مع التحديث التلقائي
 */
export function useLiveTrackerQuery(date?: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['admin', 'live-tracker', date ?? 'today'],
    queryFn: () => fetchLiveTrackerData(date),
    enabled: options.enabled ?? true,
    refetchInterval: 30000, // تحديث كل 30 ثانية
    refetchIntervalInBackground: false, // إيقاف التحديث عند مغادرة الصفحة
    staleTime: 15000, // 15 ثانية قبل اعتبار البيانات قديمة
  })
}

/**
 * Hook لتسجيل إجراء متابعة
 */
export function useRecordTrackerActionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecordActionPayload) => recordTrackerAction(payload),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: 'تم تسجيل الإجراء',
        description: `${result.action_type_label} - ${result.period_type_label}`,
      })
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['admin', 'live-tracker'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تسجيل الإجراء') })
    },
  })
}

/**
 * Hook لحذف إجراء متابعة
 */
export function useDeleteTrackerActionMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DeleteActionPayload) => deleteTrackerAction(payload),
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'تم حذف الإجراء',
      })
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['admin', 'live-tracker'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف الإجراء') })
    },
  })
}

// ============================================
// استيراد الجداول من TimeTable (aSc)
// ============================================

/**
 * Hook لمعاينة ملف TimeTable
 */
export function usePreviewTimeTableMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: (file: File) => previewTimeTableImport(file),
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر قراءة ملف TimeTable') })
    },
  })
}

/**
 * Hook لتأكيد استيراد TimeTable
 */
export function useConfirmTimeTableMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      file: File
      teacher_mappings: TimeTableTeacherMapping[]
      subject_mappings: TimeTableSubjectMapping[]
      class_mappings: TimeTableClassMapping[]
      replace_existing: boolean
    }) => confirmTimeTableImport(payload),
    onSuccess: (result) => {
      toast({
        type: 'success',
        title: 'تم استيراد الجدول',
        description: result.message,
      })
      // تحديث الجداول
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.classSessions.summary() })
      queryClient.invalidateQueries({ queryKey: ['admin', 'class-schedules'] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر استيراد الجدول') })
    },
  })
}

import { apiClient } from '@/services/api/client'
import type { ApiResponse, PaginatedResponse } from '@/services/api/types'
import type {
  AdminDashboardStats,
  AdminSettings,
  AttendanceReportFiltersPayload,
  AttendanceReportMatrix,
  AttendanceReportStudentAttendance,
  AttendanceReportStudentRow,
  AttendanceReportSummary,
  AttendanceReportView,
  AttendanceReportRecord,
  AttendanceSessionDetails,
  ClassScheduleSummary,
  ClassScheduleResult,
  ClassScheduleSessionData,
  ClassSessionRecord,
  CreateTeacherResponse,
  ImportStudentsPayload,
  ImportStudentsPreview,
  ImportSummary,
  ImportTeachersSummary,
  LateArrivalCreateResponse,
  LateArrivalRecord,
  LateArrivalStats,
  PendingApprovalRecord,
  SchedulePeriod,
  ScheduleRecord,
  ScheduleTemplate,
  ScheduleType,
  StudentRecord,
  SubjectRecord,
  TeacherCredentials,
  TeacherRecord,
  WhatsappHistoryItem,
  WhatsappQueueItem,
  WhatsappSettings,
  WhatsappStatistics,
  WhatsappTemplate,
  WhatsappTargetStudent,
  WhatsappBulkMessagePayload,
  LeaveRequestRecord,
  LeaveRequestFilters,
  LeaveRequestListResult,
  LeaveRequestCreatePayload,
  LeaveRequestUpdatePayload,
  LeaveRequestStatus,
  PointSettingsRecord,
  PointSettingsUpdatePayload,
  PointReasonRecord,
  PointReasonPayload,
  PointTransactionRecord,
  PointTransactionFilters,
  PointTransactionsResponse,
  PointLeaderboardResponse,
  PointManualTransactionPayload,
  PointLeaderboardEntry,
  PointLeaderboardFilters,
  PointCardRecord,
  PointCardFilters,
  PointCardsResponse,
  PaginationMeta,
} from './types'
import { deserializeWhatsappVariables, serializeWhatsappVariables } from './utils/whatsapp-templates'

type Filters = Record<string, string | number | boolean | undefined>

function unwrapResponse<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }
  return response.data
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractArrayFromPayload<T>(payload: unknown, candidateKeys: string[]): T[] | null {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (isRecord(payload)) {
    for (const key of candidateKeys) {
      const value = payload[key]
      if (Array.isArray(value)) {
        return value as T[]
      }
    }

    if ('data' in payload) {
      const nested = extractArrayFromPayload<T>(payload.data, candidateKeys)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

function unwrapCollectionResponse<T>(response: ApiResponse<unknown>, fallbackMessage: string, candidateKeys: string[]): T[] {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }

  // First try to extract from response directly (not from response.data)
  const directCollection = extractArrayFromPayload<T>(response, candidateKeys)
  if (directCollection) {
    return directCollection
  }

  // Then try response.data
  const collection =
    extractArrayFromPayload<T>(response.data, candidateKeys) ??
    (isRecord(response.data) ? extractArrayFromPayload<T>(response.data['data'], candidateKeys) : null)

  return collection ?? []
}

const ATTENDANCE_STATUS_VALUES: Array<AttendanceReportStudentAttendance['status']> = [
  'present',
  'absent',
  'late',
  'excused',
]

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  if (typeof value === 'boolean') return value ? 1 : 0
  return fallback
}

function normalizeAttendanceEntries(entries: unknown): AttendanceReportStudentAttendance[] {
  if (!Array.isArray(entries)) {
    return []
  }

  const normalized: AttendanceReportStudentAttendance[] = []

  for (const entry of entries) {
    if (!isRecord(entry)) continue

    const date =
      typeof entry.date === 'string'
        ? entry.date
        : typeof entry.attendance_date === 'string'
          ? entry.attendance_date
          : null

    const statusValue =
      typeof entry.status === 'string'
        ? entry.status
        : typeof entry.attendance_status === 'string'
          ? entry.attendance_status
          : null

    if (!date || !statusValue) continue
    if (!ATTENDANCE_STATUS_VALUES.includes(statusValue as AttendanceReportStudentAttendance['status'])) continue

    normalized.push({
      date,
      status: statusValue as AttendanceReportStudentAttendance['status'],
      notes: typeof entry.notes === 'string' ? entry.notes : null,
      recorded_at: typeof entry.recorded_at === 'string' ? entry.recorded_at : null,
    })
  }

  return normalized
}

function normalizeAttendanceStudentRow(raw: unknown): AttendanceReportStudentRow | null {
  if (!isRecord(raw)) return null

  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.student_name === 'string'
        ? raw.student_name
        : typeof raw.full_name === 'string'
          ? raw.full_name
          : null

  if (!name) return null

  const studentId =
    typeof raw.student_id === 'number'
      ? raw.student_id
      : typeof raw.id === 'number'
        ? raw.id
        : undefined

  const grade = typeof raw.grade === 'string' ? raw.grade : typeof raw.grade_name === 'string' ? raw.grade_name : ''
  const className =
    typeof raw.class_name === 'string'
      ? raw.class_name
      : typeof raw.class === 'string'
        ? raw.class
        : typeof raw.class_section === 'string'
          ? raw.class_section
          : ''

  return {
    student_id: studentId ?? 0,
    national_id: typeof raw.national_id === 'string' ? raw.national_id : null,
    name,
    grade,
    class_name: className,
    total_present: coerceNumber(raw.total_present ?? raw.present_count ?? raw.present ?? 0),
    total_absent: coerceNumber(raw.total_absent ?? raw.absent_count ?? raw.absent ?? 0),
    total_late: coerceNumber(raw.total_late ?? raw.late_count ?? raw.late ?? 0),
    total_excused: coerceNumber(raw.total_excused ?? raw.excused_count ?? raw.excused ?? 0),
    attendance: normalizeAttendanceEntries(raw.attendance ?? raw.records ?? raw.attendance_records ?? []),
  }
}

function computeAttendanceSummary(
  students: AttendanceReportStudentRow[],
  summaryPayload: unknown,
  daysCount: number,
): AttendanceReportSummary {
  const aggregate = students.reduce(
    (acc, student) => {
      acc.present += student.total_present
      acc.absent += student.total_absent
      acc.late += student.total_late
      acc.excused += student.total_excused ?? 0
      return acc
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  )

  const summaryRecord = isRecord(summaryPayload) ? summaryPayload : {}

  return {
    total_present: coerceNumber(summaryRecord.total_present, aggregate.present),
    total_absent: coerceNumber(summaryRecord.total_absent, aggregate.absent),
    total_late: coerceNumber(summaryRecord.total_late, aggregate.late),
    total_excused: coerceNumber(summaryRecord.total_excused, aggregate.excused),
    students_count: coerceNumber(summaryRecord.students_count, students.length),
    days_count: coerceNumber(summaryRecord.days_count, daysCount),
    grade: typeof summaryRecord.grade === 'string' ? summaryRecord.grade : null,
    class_name: typeof summaryRecord.class_name === 'string' ? summaryRecord.class_name : null,
    student_name: typeof summaryRecord.student_name === 'string' ? summaryRecord.student_name : null,
  }
}

function normalizeAttendanceReportMatrix(
  payload: unknown,
  filters: AttendanceReportFiltersPayload,
): AttendanceReportMatrix {
  const payloadRecord = isRecord(payload) ? payload : {}

  const datesSource = Array.isArray(payloadRecord.dates) ? payloadRecord.dates : []
  const dates = datesSource.filter((value): value is string => typeof value === 'string')

  const studentsSource = Array.isArray(payloadRecord.students)
    ? payloadRecord.students
    : Array.isArray(payloadRecord.data)
      ? payloadRecord.data
      : []

  const students = studentsSource
    .map((student) => normalizeAttendanceStudentRow(student))
    .filter((student): student is AttendanceReportStudentRow => student !== null)

  const summary = computeAttendanceSummary(students, payloadRecord.summary, dates.length)

  const metadataRecord = isRecord(payloadRecord.metadata) ? payloadRecord.metadata : {}

  const metadata: AttendanceReportMatrix['metadata'] | undefined = Object.keys(metadataRecord).length
    ? {
        grade: typeof metadataRecord.grade === 'string' ? metadataRecord.grade : summary.grade ?? filters.grade ?? null,
        class_name:
          typeof metadataRecord.class_name === 'string'
            ? metadataRecord.class_name
            : summary.class_name ?? filters.class ?? null,
        student:
          isRecord(metadataRecord.student) && typeof metadataRecord.student.name === 'string'
            ? {
                id:
                  typeof metadataRecord.student.id === 'number'
                    ? metadataRecord.student.id
                    : typeof metadataRecord.student.student_id === 'number'
                      ? metadataRecord.student.student_id
                      : filters.student_id ?? 0,
                name: metadataRecord.student.name,
              }
            : filters.student_id
              ? {
                  id: filters.student_id,
                  name: summary.student_name ?? '',
                }
              : undefined,
      }
    : undefined

  return {
    view: typeof payloadRecord.view === 'string' ? (payloadRecord.view as AttendanceReportView) : filters.type,
    dates,
    students,
    summary,
    generated_at: typeof payloadRecord.generated_at === 'string' ? payloadRecord.generated_at : undefined,
    metadata,
  }
}

function normalizeWhatsappStudentRecord(raw: unknown): WhatsappTargetStudent | null {
  if (!isRecord(raw)) return null

  const idCandidate = coerceNumber(raw.id ?? raw.student_id ?? raw.user_id, Number.NaN)
  if (!Number.isFinite(idCandidate)) return null
  const id = Math.trunc(idCandidate)
  if (id <= 0) return null

  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.student_name === 'string'
        ? raw.student_name
        : typeof raw.full_name === 'string'
          ? raw.full_name
          : null

  if (!name) return null

  const grade =
    typeof raw.grade === 'string'
      ? raw.grade
      : typeof raw.grade_name === 'string'
        ? raw.grade_name
        : typeof raw.student_grade === 'string'
          ? raw.student_grade
          : null

  const className =
    typeof raw.class_name === 'string'
      ? raw.class_name
      : typeof raw.class === 'string'
        ? raw.class
        : typeof raw.class_section === 'string'
          ? raw.class_section
          : null

  const nationalId =
    typeof raw.national_id === 'string'
      ? raw.national_id
      : typeof raw.student_national_id === 'string'
        ? raw.student_national_id
        : null

  const parentPhone =
    typeof raw.parent_phone === 'string'
      ? raw.parent_phone
      : typeof raw.guardian_phone === 'string'
        ? raw.guardian_phone
        : typeof raw.phone === 'string'
          ? raw.phone
          : null

  const parentName =
    typeof raw.parent_name === 'string'
      ? raw.parent_name
      : typeof raw.guardian_name === 'string'
        ? raw.guardian_name
        : null

  const absenceDays = coerceNumber(
    raw.absence_days ?? raw.absent_days ?? raw.unexcused_absence_days ?? raw.absences ?? raw.total_absence_days,
    0,
  )

  const totalAbsences = coerceNumber(
    raw.total_absences ?? raw.absence_total ?? raw.absence_count ?? raw.absences ?? absenceDays,
    absenceDays,
  )

  const lastAbsenceDate =
    typeof raw.last_absence_date === 'string'
      ? raw.last_absence_date
      : typeof raw.latest_absence_date === 'string'
        ? raw.latest_absence_date
        : typeof raw.last_absence === 'string'
          ? raw.last_absence
          : null

  return {
    id,
    name,
    grade: grade ?? null,
    class_name: className ?? null,
    national_id: nationalId,
    parent_phone: parentPhone,
    parent_name: parentName,
    absence_days: Number.isFinite(absenceDays) ? absenceDays : null,
    total_absences: Number.isFinite(totalAbsences) ? totalAbsences : null,
    last_absence_date: lastAbsenceDate,
  }
}

type RawWhatsappTemplateRecord = Record<string, unknown>

function parseWhatsappTemplateStatus(value: unknown): 'active' | 'inactive' {
  if (typeof value === 'boolean') {
    return value ? 'active' : 'inactive'
  }

  if (typeof value === 'number') {
    return value === 0 ? 'inactive' : 'active'
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return 'active'
    }

  if (['inactive', 'disabled', 'false', '0', 'off', 'paused'].includes(normalized)) {
      return 'inactive'
    }

    return 'active'
  }

  return 'active'
}

function coerceJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeWhatsappTemplateRecord(raw: RawWhatsappTemplateRecord): WhatsappTemplate | null {
  const idCandidate = coerceNumber(
    raw.id ?? raw.template_id ?? raw.templateID ?? raw.ID ?? raw.identifier,
    Number.NaN,
  )

  if (!Number.isFinite(idCandidate)) {
    return null
  }

  const id = Math.trunc(idCandidate)

  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.template_name === 'string'
        ? raw.template_name
        : typeof raw.title === 'string'
          ? raw.title
          : null

  if (!name) {
    return null
  }

  const bodyCandidate =
    typeof raw.content === 'string'
      ? raw.content
      : typeof raw.message === 'string'
        ? raw.message
        : typeof raw.body === 'string'
          ? raw.body
          : ''

  const body = typeof bodyCandidate === 'string' ? bodyCandidate : ''

  let category: string | undefined
  if (typeof raw.category === 'string' && raw.category.trim()) {
    category = raw.category
  } else if (typeof raw.type === 'string' && raw.type.trim()) {
    category = raw.type
  } else if (typeof raw.description === 'string' && raw.description.trim()) {
    category = raw.description
  }

  const metadata = isRecord(raw.metadata) ? raw.metadata : null
  const variablesSource =
    raw.variables ??
    (metadata && metadata.variables) ??
    raw.variable_map ??
    raw.placeholders ??
    raw.placeholders_map ??
    null

  const variables = deserializeWhatsappVariables(coerceJsonValue(variablesSource), body)

  return {
    id,
    name,
    body,
    ...(category ? { category } : {}),
    status: parseWhatsappTemplateStatus(raw.status ?? raw.is_active ?? raw.active ?? true),
    variables,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  }
}

function serializeWhatsappTemplatePayload(payload: Partial<WhatsappTemplate>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (payload.name !== undefined) {
    result.name = payload.name
  }

  if (payload.body !== undefined) {
    result.content = payload.body
    result.message = payload.body
    result.body = payload.body
  }

  if (payload.status !== undefined) {
    result.status = payload.status
    result.is_active = payload.status === 'active'
  }

  if (payload.variables !== undefined) {
    const serialized = serializeWhatsappVariables(payload.variables)
    result.variables = Object.keys(serialized).length > 0 ? serialized : []
  }

  if (payload.category !== undefined) {
    result.category = payload.category
  }

  return result
}

function unwrapPaginatedArray<T>(
  response: PaginatedResponse<T[]>,
  fallbackMessage: string,
): { items: T[]; meta: PaginationMeta } {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage)
  }

  const items = Array.isArray(response.data) ? response.data : []
  const meta = response.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: items.length,
    total: items.length,
  }

  return { items, meta }
}

function normalizeLeaveRequestActor(raw: unknown) {
  if (!isRecord(raw)) return null

  const idCandidate = coerceNumber(raw.id ?? raw.user_id ?? raw.admin_id, Number.NaN)
  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.full_name === 'string'
        ? raw.full_name
        : typeof raw.username === 'string'
          ? raw.username
          : null

  if (!Number.isFinite(idCandidate) || !name) return null

  return {
    id: Math.trunc(idCandidate),
    name,
  }
}

function normalizeStudentRecord(raw: unknown): StudentRecord | null {
  if (!isRecord(raw)) return null

  const idCandidate = coerceNumber(raw.id ?? raw.student_id, Number.NaN)
  if (!Number.isFinite(idCandidate)) return null

  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.student_name === 'string'
        ? raw.student_name
        : null
  if (!name) return null

  return {
    id: Math.trunc(idCandidate),
    name,
    national_id: typeof raw.national_id === 'string' ? raw.national_id : '',
    grade: typeof raw.grade === 'string' ? raw.grade : '',
    class_name: typeof raw.class_name === 'string' ? raw.class_name : '',
    parent_name: typeof raw.parent_name === 'string' ? raw.parent_name : undefined,
    parent_phone: typeof raw.parent_phone === 'string' ? raw.parent_phone : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  }
}

const LEAVE_REQUEST_STATUS_VALUES: LeaveRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled']

function normalizeLeaveRequestRecord(raw: unknown): LeaveRequestRecord | null {
  if (!isRecord(raw)) return null

  const idCandidate = coerceNumber(raw.id, Number.NaN)
  const student = normalizeStudentRecord(raw.student)
  const status = typeof raw.status === 'string' ? raw.status : null

  if (!Number.isFinite(idCandidate) || !student) return null
  if (!status || !LEAVE_REQUEST_STATUS_VALUES.includes(status as LeaveRequestStatus)) return null

  const expectedTime =
    typeof raw.expected_pickup_time === 'string'
      ? raw.expected_pickup_time
      : typeof raw.expected_pickup_at === 'string'
        ? raw.expected_pickup_at
        : null

  const submittedByType =
    raw.submitted_by_type === 'admin' || raw.submitted_by_type === 'guardian' ? raw.submitted_by_type : 'guardian'

  return {
    id: Math.trunc(idCandidate),
    student_id: coerceNumber(raw.student_id, student.id),
    student,
    status: status as LeaveRequestStatus,
    reason: typeof raw.reason === 'string' ? raw.reason : '',
    pickup_person_name: typeof raw.pickup_person_name === 'string' ? raw.pickup_person_name : '',
    pickup_person_relation: typeof raw.pickup_person_relation === 'string' ? raw.pickup_person_relation : null,
    pickup_person_phone: typeof raw.pickup_person_phone === 'string' ? raw.pickup_person_phone : null,
    expected_pickup_time: expectedTime,
    submitted_by_type: submittedByType,
    submitted_by_admin: normalizeLeaveRequestActor(raw.submitted_by_admin),
    guardian_name: typeof raw.guardian_name === 'string' ? raw.guardian_name : null,
    guardian_phone: typeof raw.guardian_phone === 'string' ? raw.guardian_phone : null,
    decision_notes: typeof raw.decision_notes === 'string' ? raw.decision_notes : null,
    decision_at: typeof raw.decision_at === 'string' ? raw.decision_at : null,
    decision_by_admin: normalizeLeaveRequestActor(raw.decision_by_admin),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
  }
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { data } = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard-stats')
  return unwrapResponse(data, 'تعذر تحميل إحصائيات لوحة التحكم')
}

export async function fetchTeachers(): Promise<TeacherRecord[]> {
  const { data } = await apiClient.get<ApiResponse<TeacherRecord[]>>('/admin/teachers')
  return unwrapResponse(data, 'تعذر تحميل قائمة المعلمين')
}

export async function createTeacher(payload: {
  name: string
  national_id: string
  phone?: string | null
}): Promise<CreateTeacherResponse> {
  const { data } = await apiClient.post<ApiResponse<CreateTeacherResponse>>('/admin/teachers', payload)
  return unwrapResponse(data, 'تعذر إضافة المعلم')
}

export async function updateTeacher(id: number, payload: Partial<TeacherRecord>): Promise<TeacherRecord> {
  const { data } = await apiClient.put<ApiResponse<TeacherRecord>>(`/admin/teachers/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث بيانات المعلم')
}

export async function deleteTeacher(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/teachers/${id}`)
  unwrapResponse(data, 'تعذر حذف المعلم')
}

export async function resetTeacherPassword(id: number): Promise<TeacherCredentials> {
  const { data } = await apiClient.post<ApiResponse<{ new_password: string; teacher: TeacherRecord }>>(
    `/admin/teachers/${id}/reset-password`,
  )
  const response = unwrapResponse(data, 'تعذر إعادة تعيين كلمة المرور')
  return {
    national_id: response.teacher.national_id,
    password: response.new_password,
  }
}

export async function fetchStudents(): Promise<StudentRecord[]> {
  const { data } = await apiClient.get<ApiResponse<StudentRecord[]>>('/admin/students')
  return unwrapResponse(data, 'تعذر تحميل قائمة الطلاب')
}

export async function createStudent(payload: Partial<StudentRecord>): Promise<StudentRecord> {
  const { data } = await apiClient.post<ApiResponse<StudentRecord>>('/admin/students', payload)
  return unwrapResponse(data, 'تعذر إضافة الطالب')
}

export async function updateStudent(id: number, payload: Partial<StudentRecord>): Promise<StudentRecord> {
  const { data } = await apiClient.put<ApiResponse<StudentRecord>>(`/admin/students/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث بيانات الطالب')
}

export async function deleteStudent(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/students/${id}`)
  unwrapResponse(data, 'تعذر حذف الطالب')
}

export async function fetchSubjects(): Promise<SubjectRecord[]> {
  const { data } = await apiClient.get<ApiResponse<SubjectRecord[]>>('/admin/subjects')
  return unwrapResponse(data, 'تعذر تحميل قائمة المواد')
}

export async function createSubject(payload: Partial<SubjectRecord>): Promise<SubjectRecord> {
  const { data } = await apiClient.post<ApiResponse<SubjectRecord>>('/admin/subjects', payload)
  return unwrapResponse(data, 'تعذر إضافة المادة')
}

export async function updateSubject(id: number, payload: Partial<SubjectRecord>): Promise<SubjectRecord> {
  const { data } = await apiClient.put<ApiResponse<SubjectRecord>>(`/admin/subjects/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث بيانات المادة')
}

export async function deleteSubject(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/subjects/${id}`)
  unwrapResponse(data, 'تعذر حذف المادة')
}

export async function fetchClassSessions(): Promise<ClassSessionRecord[]> {
  const { data } = await apiClient.get<ApiResponse<ClassSessionRecord[]>>('/admin/class-sessions')
  return unwrapResponse(data, 'تعذر تحميل جدول الحصص')
}

export async function createClassSession(payload: Partial<ClassSessionRecord>): Promise<ClassSessionRecord> {
  const { data } = await apiClient.post<ApiResponse<ClassSessionRecord>>('/admin/class-sessions', payload)
  return unwrapResponse(data, 'تعذر إضافة الحصة')
}

export async function updateClassSession(id: number, payload: Partial<ClassSessionRecord>): Promise<ClassSessionRecord> {
  const { data } = await apiClient.put<ApiResponse<ClassSessionRecord>>(`/admin/class-sessions/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث بيانات الحصة')
}

export async function deleteClassSession(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/class-sessions/${id}`)
  unwrapResponse(data, 'تعذر حذف الحصة')
}

export async function fetchClassScheduleSummary(): Promise<ClassScheduleSummary[]> {
  const { data } = await apiClient.get<ApiResponse<ClassScheduleSummary[]>>('/admin/class-schedules/classes')
  return unwrapResponse(data, 'تعذر تحميل قوائم الجداول')
}

export async function fetchClassSchedule(grade: string, className: string): Promise<ClassScheduleResult> {
  const { data } = await apiClient.get<ApiResponse<ClassScheduleResult>>(
    `/admin/class-schedules/${encodeURIComponent(grade)}/${encodeURIComponent(className)}`,
  )
  return unwrapResponse(data, 'تعذر تحميل جدول الفصل')
}

export async function addQuickClassSession(payload: Record<string, unknown>): Promise<ClassSessionRecord> {
  const { data } = await apiClient.post<ApiResponse<ClassSessionRecord>>('/admin/class-schedules/quick-session', payload)
  return unwrapResponse(data, 'تعذر إضافة الحصة السريعة')
}

export async function applyScheduleToClass(payload: Record<string, unknown>): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>('/admin/class-schedules/apply-schedule', payload)
  unwrapResponse(data, 'تعذر تطبيق الجدول على الفصل')
}

export async function deleteClassScheduleSession(sessionId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/class-schedules/sessions/${sessionId}`)
  unwrapResponse(data, 'تعذر حذف الحصة من جدول الفصل')
}

export async function fetchScheduleSessionData(): Promise<ClassScheduleSessionData> {
  const { data } = await apiClient.get<ApiResponse<ClassScheduleSessionData>>(
    '/admin/class-schedules/session-data',
  )
  return unwrapResponse(data, 'تعذر تحميل بيانات نماذج الحصص')
}

type SchedulePayload = {
  name: string
  type: ScheduleType
  target_level?: string | null
  description?: string | null
  periods: Array<Omit<SchedulePeriod, 'id'>>
}

type ScheduleTemplatesResponse = Record<
  string,
  {
    name: string
    type: ScheduleType
    target_level?: string | null
    periods: Array<Omit<SchedulePeriod, 'id'>>
  }
>

export async function fetchSchedules(): Promise<ScheduleRecord[]> {
  const { data } = await apiClient.get<ApiResponse<ScheduleRecord[]>>('/admin/schedules')
  return unwrapResponse(data, 'تعذر تحميل الجداول الزمنية')
}

export async function fetchScheduleDetails(scheduleId: number): Promise<ScheduleRecord> {
  const { data } = await apiClient.get<ApiResponse<ScheduleRecord>>(`/admin/schedules/${scheduleId}`)
  return unwrapResponse(data, 'تعذر تحميل تفاصيل الجدول')
}

export async function createSchedule(payload: SchedulePayload): Promise<ScheduleRecord> {
  const { data } = await apiClient.post<ApiResponse<ScheduleRecord>>('/admin/schedules', payload)
  return unwrapResponse(data, 'تعذر إنشاء الجدول')
}

export async function updateSchedule(scheduleId: number, payload: SchedulePayload): Promise<ScheduleRecord> {
  const { data } = await apiClient.put<ApiResponse<ScheduleRecord>>(`/admin/schedules/${scheduleId}`, payload)
  return unwrapResponse(data, 'تعذر تحديث الجدول')
}

export async function activateSchedule(scheduleId: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/admin/schedules/${scheduleId}/activate`)
  unwrapResponse(data, 'تعذر تفعيل الجدول')
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/schedules/${scheduleId}`)
  unwrapResponse(data, 'تعذر حذف الجدول')
}

export async function fetchScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const { data } = await apiClient.get<ApiResponse<ScheduleTemplatesResponse>>('/admin/schedules/templates')
  const templates = unwrapResponse(data, 'تعذر تحميل قوالب الجداول')

  return Object.entries(templates).map(([key, value]) => ({
    key,
    name: value.name,
    type: value.type,
    target_level: value.target_level ?? null,
    periods: value.periods.map((period) => ({
      period_number: period.period_number,
      start_time: period.start_time,
      end_time: period.end_time,
      is_break: Boolean(period.is_break),
      break_duration: period.break_duration ?? null,
      period_name: period.period_name ?? null,
    })),
  }))
}

type AttendanceManagementResponse = {
  data: AttendanceReportRecord[]
  current_page: number
  last_page: number
}

export async function fetchAttendanceReports(filters: Filters = {}): Promise<AttendanceReportRecord[]> {
  const { data } = await apiClient.get<AttendanceManagementResponse>('/admin/attendance-management', {
    params: filters,
  })

  return data?.data ?? []
}

export async function fetchAttendanceReportMatrix(
  filters: AttendanceReportFiltersPayload,
): Promise<AttendanceReportMatrix> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/attendance/report', {
    params: filters,
  })
  const payload = unwrapResponse(data, 'تعذر تحميل كشف الغياب')
  return normalizeAttendanceReportMatrix(payload, filters)
}

export async function fetchPendingApprovals(): Promise<PendingApprovalRecord[]> {
  const { data } = await apiClient.get<ApiResponse<PendingApprovalRecord[]>>(
    '/admin/attendance-reports/pending-approvals',
  )
  return unwrapResponse(data, 'تعذر تحميل التحضير المعلق')
}

export async function approveAttendanceRecord(attendanceId: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/admin/attendance-reports/${attendanceId}/approve`)
  unwrapResponse(data, 'تعذر اعتماد سجل الحضور')
}

export async function rejectAttendanceRecord(attendanceId: number, reason?: string): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/admin/attendance-reports/${attendanceId}/reject`, {
    reason,
  })
  unwrapResponse(data, 'تعذر رفض سجل الحضور')
}

export async function approveAttendanceSession(payload: { session_id: number; date: string }): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>('/admin/attendance-reports/approve-session', payload)
  unwrapResponse(data, 'تعذر اعتماد التحضير')
}

export async function rejectAttendanceSession(payload: {
  session_id: number
  date: string
  reason?: string | null
}): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>('/admin/attendance-reports/reject-session', payload)
  unwrapResponse(data, 'تعذر رفض التحضير')
}

export async function approveAllPendingSessions(): Promise<{ approved_count: number; failed_count: number }> {
  const { data } = await apiClient.post<ApiResponse<{ approved_count: number; failed_count: number }>>(
    '/admin/attendance-reports/approve-all-pending',
  )
  return unwrapResponse(data, 'تعذر اعتماد جميع الجلسات')
}

export async function fetchAttendanceSessionDetails(attendanceId: number): Promise<AttendanceSessionDetails> {
  const { data } = await apiClient.get<ApiResponse<AttendanceSessionDetails>>(
    `/admin/attendance-reports/${attendanceId}/details`,
  )
  return unwrapResponse(data, 'تعذر تحميل تفاصيل الجلسة')
}

export async function exportAttendanceReport(format: 'excel' | 'pdf', filters: Filters = {}): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/admin/attendance-reports/export/${format}` as const, {
    params: filters,
    responseType: 'blob',
  })
  return data
}

export async function fetchLateArrivals(
  filters: { date?: string; className?: string; studentId?: number } = {},
): Promise<LateArrivalRecord[]> {
  const params: Filters = {}
  if (filters.date) params.date = filters.date
  if (filters.className) params.className = filters.className
  if (typeof filters.studentId === 'number') params.student_id = filters.studentId

  const { data } = await apiClient.get<ApiResponse<LateArrivalRecord[]>>('/admin/late-arrivals', { params })
  const records = unwrapCollectionResponse<LateArrivalRecord>(data, 'تعذر تحميل سجلات التأخير', ['late_arrivals', 'data'])
  return records
}

export async function fetchLateArrivalStats(): Promise<LateArrivalStats> {
  const { data } = await apiClient.get<ApiResponse<LateArrivalStats>>('/admin/late-arrivals/stats')
  return unwrapResponse(data, 'تعذر تحميل إحصائيات التأخير')
}

export async function fetchLeaveRequests(filters: LeaveRequestFilters = {}): Promise<LeaveRequestListResult> {
  const params: Filters = {}

  if (filters.status && filters.status !== 'all') params.status = filters.status
  if (filters.grade) params.grade = filters.grade
  if (filters.class_name) params.class_name = filters.class_name
  if (filters.submitted_by_type && filters.submitted_by_type !== 'all') params.submitted_by_type = filters.submitted_by_type
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  if (filters.page) params.page = filters.page
  if (filters.per_page) params.per_page = filters.per_page
  if (typeof filters.student_id === 'number' && filters.student_id > 0) params.student_id = filters.student_id

  const { data } = await apiClient.get<PaginatedResponse<unknown[]>>('/admin/leave-requests', {
    params,
  })

  const { items, meta } = unwrapPaginatedArray(data, 'تعذر تحميل طلبات الاستئذان')
  const normalized = (items as unknown[])
    .map((item) => normalizeLeaveRequestRecord(item))
    .filter((item): item is LeaveRequestRecord => item !== null)

  return {
    items: normalized,
    meta,
  }
}

export async function createLeaveRequest(payload: LeaveRequestCreatePayload): Promise<LeaveRequestRecord> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestRecord>>('/admin/leave-requests', payload)
  const record = unwrapResponse(data, 'تعذر إنشاء طلب الاستئذان')
  return normalizeLeaveRequestRecord(record as unknown) ?? record
}

export async function updateLeaveRequest(
  id: number,
  payload: LeaveRequestUpdatePayload,
): Promise<LeaveRequestRecord> {
  const { data } = await apiClient.put<ApiResponse<LeaveRequestRecord>>(`/admin/leave-requests/${id}`, payload)
  const record = unwrapResponse(data, 'تعذر تحديث طلب الاستئذان')
  return normalizeLeaveRequestRecord(record as unknown) ?? record
}

export async function approveLeaveRequest(
  id: number,
  payload: { decision_notes?: string | null } = {},
): Promise<LeaveRequestRecord> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestRecord>>(
    `/admin/leave-requests/${id}/approve`,
    payload,
  )
  const record = unwrapResponse(data, 'تعذر الموافقة على طلب الاستئذان')
  return normalizeLeaveRequestRecord(record as unknown) ?? record
}

export async function rejectLeaveRequest(id: number, decision_notes: string): Promise<LeaveRequestRecord> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestRecord>>(`/admin/leave-requests/${id}/reject`, {
    decision_notes,
  })
  const record = unwrapResponse(data, 'تعذر رفض طلب الاستئذان')
  return normalizeLeaveRequestRecord(record as unknown) ?? record
}

export async function cancelLeaveRequest(
  id: number,
  payload: { decision_notes?: string | null } = {},
): Promise<LeaveRequestRecord> {
  const { data } = await apiClient.post<ApiResponse<LeaveRequestRecord>>(`/admin/leave-requests/${id}/cancel`, payload)
  const record = unwrapResponse(data, 'تعذر إلغاء طلب الاستئذان')
  return normalizeLeaveRequestRecord(record as unknown) ?? record
}

export async function createLateArrival(payload: {
  student_ids: number[]
  late_date: string
  notes?: string | null
}): Promise<LateArrivalCreateResponse> {
  const { data } = await apiClient.post<ApiResponse<LateArrivalCreateResponse>>('/admin/late-arrivals', payload)
  return unwrapResponse(data, 'تعذر تسجيل التأخير')
}

export async function deleteLateArrival(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/late-arrivals/${id}`)
  unwrapResponse(data, 'تعذر حذف سجل التأخير')
}

export async function sendLateArrivalMessage(id: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<{ success: boolean }>>(
    `/admin/late-arrivals/${id}/send-message`,
  )
  unwrapResponse(data, 'تعذر إرسال رسالة التأخر')
}

export async function previewImportStudents(formData: FormData): Promise<ImportStudentsPreview> {
  const { data } = await apiClient.post<ApiResponse<ImportStudentsPreview>>(
    '/admin/import/students/preview',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return unwrapResponse(data, 'تعذر تحليل ملف الطلاب')
}

export async function importStudents(formData: FormData, options: ImportStudentsPayload = {}): Promise<ImportSummary> {
  if (options.update_existing) {
    formData.append('update_existing', options.update_existing ? '1' : '0')
  }
  if (options.delete_missing) {
    formData.append('delete_missing', options.delete_missing ? '1' : '0')
  }

  const { data } = await apiClient.post<ApiResponse<ImportSummary>>('/admin/import/students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapResponse(data, 'تعذر استيراد الطلاب')
}

export async function importTeachers(formData: FormData): Promise<ImportTeachersSummary> {
  const { data } = await apiClient.post<ApiResponse<ImportTeachersSummary>>('/admin/import/teachers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapResponse(data, 'تعذر استيراد المعلمين')
}

export async function downloadStudentsTemplate(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/admin/import/students/template', {
    responseType: 'blob',
  })
  return data
}

export async function downloadTeachersTemplate(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/admin/import/teachers/template', {
    responseType: 'blob',
  })
  return data
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
  const { data } = await apiClient.get<ApiResponse<AdminSettings>>('/admin/settings')
  return unwrapResponse(data, 'تعذر تحميل إعدادات النظام')
}

export async function updateAdminSettings(payload: Partial<AdminSettings>): Promise<AdminSettings> {
  const { data } = await apiClient.put<ApiResponse<AdminSettings>>('/admin/settings', payload)
  return unwrapResponse(data, 'تعذر حفظ إعدادات النظام')
}

export async function testWebhook(): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ success: boolean }>>('/admin/settings/test-webhook')
  return unwrapResponse(data, 'تعذر اختبار الويب هوك')
}

export async function fetchWhatsappStatistics(): Promise<WhatsappStatistics> {
  const { data } = await apiClient.get<ApiResponse<WhatsappStatistics>>('/admin/whatsapp/statistics')
  return unwrapResponse(data, 'تعذر تحميل إحصائيات الواتساب')
}

export async function fetchWhatsappStudents(): Promise<WhatsappTargetStudent[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/students/all')
  
  const records = unwrapCollectionResponse<Record<string, unknown>>(
    data,
    'تعذر تحميل قائمة الطلاب المخصصة للواتساب',
    ['students'],
  )

  const students = records
    .map((record) => normalizeWhatsappStudentRecord(record))
    .filter((record): record is WhatsappTargetStudent => record !== null)

  return students.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}

export async function fetchWhatsappAbsentStudents(days: number): Promise<WhatsappTargetStudent[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/students/absent', {
    params: { days },
  })

  const records = unwrapCollectionResponse<Record<string, unknown>>(
    data,
    'تعذر تحميل الطلاب الغائبين',
    ['students'],
  )

  const students = records
    .map((record) => normalizeWhatsappStudentRecord(record))
    .filter((record): record is WhatsappTargetStudent => record !== null)

  return students.sort((a, b) => (b.absence_days ?? 0) - (a.absence_days ?? 0) || a.name.localeCompare(b.name, 'ar'))
}

export async function fetchWhatsappQueue(): Promise<WhatsappQueueItem[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/whatsapp/queue')
  return unwrapCollectionResponse<WhatsappQueueItem>(data, 'تعذر تحميل قائمة انتظار الواتساب', ['data', 'items', 'queue'])
}

export async function deleteWhatsappQueueItem(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/whatsapp/queue/${id}`)
  unwrapResponse(data, 'تعذر حذف رسالة الواتساب')
}

export async function sendPendingWhatsappMessages(): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>('/admin/whatsapp/send-pending')
  unwrapResponse(data, 'تعذر إرسال الرسائل المعلقة')
}

export async function sendSingleWhatsappMessage(id: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/admin/whatsapp/send-single/${id}`)
  unwrapResponse(data, 'تعذر إرسال الرسالة')
}

export async function fetchWhatsappHistory(filters?: {
  student_id?: number
  date_from?: string
  date_to?: string
  status?: string
  per_page?: number
}): Promise<WhatsappHistoryItem[]> {
  const params: Record<string, string | number> = {}
  
  if (filters?.student_id) params.student_id = filters.student_id
  if (filters?.date_from) params.date_from = filters.date_from
  if (filters?.date_to) params.date_to = filters.date_to
  if (filters?.status) params.status = filters.status
  if (filters?.per_page) params.per_page = filters.per_page

  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/whatsapp/history', {
    params: Object.keys(params).length > 0 ? params : undefined
  })
  return unwrapCollectionResponse<WhatsappHistoryItem>(data, 'تعذر تحميل سجل الواتساب', ['data', 'history', 'items', 'records'])
}

export async function fetchWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/whatsapp/templates')
  const rawTemplates = unwrapCollectionResponse<RawWhatsappTemplateRecord>(
    data,
    'تعذر تحميل قوالب الواتساب',
    ['data', 'templates', 'items'],
  )

  return rawTemplates
    .map((template) => normalizeWhatsappTemplateRecord(template))
    .filter((template): template is WhatsappTemplate => template !== null)
}

export async function sendWhatsappBulkMessages(payload: WhatsappBulkMessagePayload): Promise<{ queued: number }> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown> | null>>('/admin/whatsapp/send-bulk', payload)
  const response = unwrapResponse<Record<string, unknown> | null>(data, 'تعذر إرسال رسائل الواتساب')

  if (response && typeof response === 'object') {
    const queued = coerceNumber(
      response.queued ?? response.created ?? response.count ?? response.total ?? payload.messages.length,
      payload.messages.length,
    )

    return { queued }
  }

  return { queued: payload.messages.length }
}

export async function createWhatsappTemplate(payload: Partial<WhatsappTemplate>): Promise<WhatsappTemplate> {
  const requestPayload = serializeWhatsappTemplatePayload(payload)
  const { data } = await apiClient.post<ApiResponse<unknown>>('/admin/whatsapp/templates', requestPayload)
  const response = unwrapResponse<unknown>(data, 'تعذر إنشاء قالب الواتساب')

  const templateRecord = isRecord(response)
    ? (isRecord(response.template) ? (response.template as RawWhatsappTemplateRecord) : (response as RawWhatsappTemplateRecord))
    : null

  if (templateRecord) {
    const normalized = normalizeWhatsappTemplateRecord(templateRecord)
    if (normalized) {
      return normalized
    }
  }

  throw new Error('استجابة غير متوقعة من الخادم بعد إنشاء القالب')
}

export async function updateWhatsappTemplate(id: number, payload: Partial<WhatsappTemplate>): Promise<WhatsappTemplate> {
  const requestPayload = serializeWhatsappTemplatePayload(payload)
  const { data } = await apiClient.put<ApiResponse<unknown>>(`/admin/whatsapp/templates/${id}`, requestPayload)
  const response = unwrapResponse<unknown>(data, 'تعذر تحديث قالب الواتساب')

  const templateRecord = isRecord(response)
    ? (isRecord(response.template) ? (response.template as RawWhatsappTemplateRecord) : (response as RawWhatsappTemplateRecord))
    : null

  if (templateRecord) {
    const normalized = normalizeWhatsappTemplateRecord(templateRecord)
    if (normalized) {
      return normalized
    }
  }

  throw new Error('استجابة غير متوقعة من الخادم بعد تحديث القالب')
}

export async function deleteWhatsappTemplate(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/whatsapp/templates/${id}`)
  unwrapResponse(data, 'تعذر حذف قالب الواتساب')
}

export async function fetchWhatsappSettings(): Promise<WhatsappSettings> {
  const { data } = await apiClient.get<ApiResponse<WhatsappSettings>>('/admin/whatsapp/settings')
  return unwrapResponse(data, 'تعذر تحميل إعدادات الواتساب')
}

export async function updateWhatsappSettings(payload: Partial<WhatsappSettings>): Promise<WhatsappSettings> {
  const { data } = await apiClient.put<ApiResponse<WhatsappSettings>>('/admin/whatsapp/settings', payload)
  return unwrapResponse(data, 'تعذر تحديث إعدادات الواتساب')
}

export async function fetchPointSettings(): Promise<PointSettingsRecord> {
  const { data } = await apiClient.get<ApiResponse<PointSettingsRecord>>('/admin/points/settings')
  return unwrapResponse(data, 'تعذر تحميل إعدادات برنامج النقاط')
}

export async function updatePointSettings(payload: PointSettingsUpdatePayload): Promise<PointSettingsRecord> {
  const { data } = await apiClient.put<ApiResponse<PointSettingsRecord>>('/admin/points/settings', payload)
  return unwrapResponse(data, 'تعذر تحديث إعدادات برنامج النقاط')
}

export async function fetchPointReasons(params?: { type?: 'reward' | 'violation'; only_active?: boolean; search?: string }): Promise<PointReasonRecord[]> {
  const { data } = await apiClient.get<ApiResponse<PointReasonRecord[]>>('/admin/points/reasons', {
    params,
  })
  return unwrapResponse(data, 'تعذر تحميل أسباب النقاط')
}

export async function createPointReason(payload: PointReasonPayload): Promise<PointReasonRecord> {
  const { data } = await apiClient.post<ApiResponse<PointReasonRecord>>('/admin/points/reasons', payload)
  return unwrapResponse(data, 'تعذر إنشاء سبب النقاط')
}

export async function updatePointReason(id: number, payload: PointReasonPayload): Promise<PointReasonRecord> {
  const { data } = await apiClient.put<ApiResponse<PointReasonRecord>>(`/admin/points/reasons/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث سبب النقاط')
}

export async function deactivatePointReason(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/points/reasons/${id}`)
  unwrapResponse(data, 'تعذر تعطيل سبب النقاط')
}

export async function fetchPointTransactions(filters: PointTransactionFilters = {}): Promise<PointTransactionsResponse> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/points/transactions', {
    params: filters,
  })

  const collection = unwrapCollectionResponse<PointTransactionRecord>(data, 'تعذر تحميل سجل العمليات', ['data', 'items', 'transactions'])

  const metaPayload = isRecord(data) && 'meta' in data ? (data.meta as Record<string, unknown>) : {}

  const meta: PaginationMeta = {
    current_page: coerceNumber(metaPayload.current_page, 1),
    last_page: coerceNumber(metaPayload.last_page, 1),
    per_page: coerceNumber(metaPayload.per_page, filters.per_page ?? 15),
    total: coerceNumber(metaPayload.total, collection.length),
  }

  return {
    items: collection,
    meta,
  }
}

export async function createManualPointTransaction(payload: PointManualTransactionPayload): Promise<PointTransactionRecord> {
  const { data } = await apiClient.post<ApiResponse<PointTransactionRecord>>('/admin/points/transactions/manual', payload)
  return unwrapResponse(data, 'تعذر تسجيل العملية اليدوية')
}

export async function undoPointTransaction(id: number): Promise<PointTransactionRecord> {
  const { data } = await apiClient.post<ApiResponse<PointTransactionRecord>>(`/admin/points/transactions/${id}/undo`)
  return unwrapResponse(data, 'تعذر إلغاء العملية')
}

export async function fetchPointLeaderboard(filters: PointLeaderboardFilters = {}): Promise<PointLeaderboardResponse> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/points/leaderboard', {
    params: filters,
  })

  const collection = unwrapCollectionResponse<PointLeaderboardEntry>(data, 'تعذر تحميل لوحة الشرف', ['data', 'items', 'leaderboard'])

  const metaPayload = isRecord(data) && 'meta' in data ? (data.meta as Record<string, unknown>) : {}

  const meta: PaginationMeta = {
    current_page: coerceNumber(metaPayload.current_page, 1),
    last_page: coerceNumber(metaPayload.last_page, 1),
    per_page: coerceNumber(metaPayload.per_page, filters.per_page ?? 10),
    total: coerceNumber(metaPayload.total, collection.length),
  }

  return {
    items: collection,
    meta,
  }
}

export async function fetchPointCards(filters: PointCardFilters = {}): Promise<PointCardsResponse> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/admin/points/cards', {
    params: filters,
  })

  const items = unwrapCollectionResponse<PointCardRecord>(data, 'تعذر تحميل بطاقات الطلاب', ['data', 'items', 'cards'])
  
  // Extract pagination metadata
  const metaPayload = isRecord(data) && 'meta' in data ? (data.meta as Record<string, unknown>) : {}

  const meta: PaginationMeta = {
    current_page: coerceNumber(metaPayload.current_page, 1),
    last_page: coerceNumber(metaPayload.last_page, 1),
    per_page: coerceNumber(metaPayload.per_page, filters.per_page ?? 20),
    total: coerceNumber(metaPayload.total, items.length),
  }
  
  return { items, meta }
}

export async function regeneratePointCard(studentId: number): Promise<PointCardRecord['card']> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>('/admin/points/cards/regenerate', {
    student_id: studentId,
  })

  const response = unwrapResponse<Record<string, unknown>>(data, 'تعذر توليد البطاقة')

  return {
    id: coerceNumber(response.id, 0),
    token: typeof response.token === 'string' ? response.token : '',
    version: typeof response.version === 'string' ? response.version : 'v1',
    is_active: Boolean(response.is_active ?? true),
    issued_at: typeof response.issued_at === 'string' ? response.issued_at : null,
    revoked_at: typeof response.revoked_at === 'string' ? response.revoked_at : null,
  }
}

export async function testWhatsappConnection(): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.post<ApiResponse<{ success: boolean; message?: string }>>(
    '/admin/whatsapp/test-connection',
  )
  return unwrapResponse(data, 'تعذر اختبار اتصال الواتساب')
}

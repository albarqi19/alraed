import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  AttendanceFormState,
  AttendanceStatus,
  SessionAttendancePayload,
  SubmitAttendanceResponse,
  SubmittedAttendanceRecord,
  TeacherSession,
  TeacherSessionsPayload,
  TeacherSessionStudent,
  TeacherSessionStudentsPayload,
} from './types'

interface RawTeacherSessionsResponse extends ApiResponse<TeacherSession[]> {
  current_day?: string
  saudi_time?: string
}

export async function fetchTeacherSessions(): Promise<TeacherSessionsPayload> {
  const { data } = await apiClient.get<RawTeacherSessionsResponse>('/teacher/sessions')
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الحصص')
  }
  return {
    sessions: data.data ?? [],
    currentDay: data.current_day ?? 'اليوم',
    saudiTime: data.saudi_time,
  }
}

interface RawTeacherSessionStudentsResponse extends ApiResponse<TeacherSessionStudent[]> {
  session: TeacherSession
}

export async function fetchTeacherSessionStudents(sessionId: number): Promise<TeacherSessionStudentsPayload> {
  const { data } = await apiClient.get<RawTeacherSessionStudentsResponse>(`/teacher/sessions/${sessionId}/students`)
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل طلاب الحصة')
  }

  return {
    session: data.session,
    students: data.data ?? [],
  }
}

interface RawSubmitAttendanceResponse {
  success: boolean
  message?: string
  saved_count?: number
  errors?: string[]
}

export async function submitTeacherAttendance(
  sessionId: number,
  attendance: AttendanceFormState,
  date?: string,
): Promise<SubmitAttendanceResponse> {
  const payload = {
    attendance,
    ...(date ? { date } : {}),
  }

  try {
    const { data } = await apiClient.post<RawSubmitAttendanceResponse>(
      `/teacher/sessions/${sessionId}/attendance`,
      payload,
    )

    if (!data.success) {
      throw new Error(data.message ?? 'تعذر حفظ التحضير')
    }

    return {
      saved_count: data.saved_count ?? Object.keys(attendance).length,
      errors: data.errors,
    }
  } catch (error) {
    if (isAxiosError(error) && error.response?.data) {
      const response = error.response.data as RawSubmitAttendanceResponse
      if (response.message) {
        throw new Error(response.message)
      }
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error('تعذر حفظ التحضير')
  }
}

interface RawSubmittedAttendanceResponse {
  success: boolean
  submitted?: boolean
  message?: string
  attendance_data?: Record<
    number | string,
    {
      student_name: string
      status: AttendanceStatus
      is_approved: boolean | null
      submitted_at: string
    }
  >
  submitted_date?: string
  approval_status?: boolean | null
}

export async function fetchSubmittedAttendance(
  sessionId: number,
  date?: string,
): Promise<SessionAttendancePayload> {
  const { data } = await apiClient.get<RawSubmittedAttendanceResponse>(
    `/teacher/sessions/${sessionId}/submitted-attendance`,
    {
      params: date ? { date } : undefined,
    },
  )

  if (!data.success) {
    throw new Error(data.message ?? 'تعذر جلب بيانات التحضير السابقة')
  }

  if (!data.submitted) {
    return { submitted: false }
  }

  const attendanceRecords: NonNullable<RawSubmittedAttendanceResponse['attendance_data']> =
    data.attendance_data ?? {}

  const attendance: Record<number, SubmittedAttendanceRecord> = {}

  Object.entries(attendanceRecords).forEach(([studentId, record]) => {
    const numericId = Number.parseInt(String(studentId), 10)
    if (Number.isInteger(numericId)) {
      attendance[numericId] = record
    }
  })

  return {
    submitted: true,
    attendance,
    date: data.submitted_date ?? date ?? '',
    approvalStatus: data.approval_status ?? null,
  }
}

interface SendTeacherMessagesPayload {
  class_id: number
  template_key?: string
  student_ids: number[]
  custom_message?: string
}

interface RawSendTeacherMessagesResponse {
  success: boolean
  message?: string
  data?: {
    sent_count?: number
    failed_count?: number
  }
  summary?: {
    sent?: number
    failed?: number
  }
}

export interface SendTeacherMessagesResult {
  sentCount: number
  failedCount: number
  message?: string
}

export async function sendTeacherMessages(
  payload: SendTeacherMessagesPayload,
): Promise<SendTeacherMessagesResult> {
  try {
    const { data } = await apiClient.post<RawSendTeacherMessagesResponse>('/teacher/messages/send', payload)

    if (!data.success) {
      throw new Error(data.message ?? 'تعذر إرسال الرسائل')
    }

    const sentCount =
      data.data?.sent_count ?? data.summary?.sent ?? (Array.isArray(payload.student_ids) ? payload.student_ids.length : 0)
    const failedCount = data.data?.failed_count ?? data.summary?.failed ?? 0

    return {
      sentCount,
      failedCount,
      message: data.message,
    }
  } catch (error) {
    if (isAxiosError(error) && error.response?.data) {
      const response = error.response.data as { message?: string; error?: string }
      if (response.message) {
        throw new Error(response.message)
      }
      if (response.error) {
        throw new Error(response.error)
      }
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error('تعذر إرسال الرسائل')
  }
}

export interface TeacherSession {
  id: number
  subject?: {
    id: number
    name: string
  }
  subject_id?: number
  grade: string
  class_name: string
  period_number?: number
  day?: string
  start_time?: string
  end_time?: string
  formatted_start_time?: string
  formatted_end_time?: string
  is_today?: boolean
  is_current?: boolean
  is_past?: boolean
  can_take_attendance?: boolean
}

export interface TeacherSessionsPayload {
  sessions: TeacherSession[]
  currentDay: string
  saudiTime?: string
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface TeacherSessionStudent {
  id: number
  name: string
  national_id?: string | null
  student_number?: string | null
  parent_phone?: string | null
  parent_name?: string | null
  grade: string
  class_name: string
  status?: AttendanceStatus
}

export interface TeacherSessionStudentsPayload {
  session: TeacherSession
  students: TeacherSessionStudent[]
}

export type AttendanceFormState = Record<number, AttendanceStatus>

export interface SubmitAttendanceResponse {
  saved_count: number
  errors?: string[]
}

export interface SubmittedAttendanceRecord {
  student_name: string
  status: AttendanceStatus
  is_approved: boolean | null
  submitted_at: string
}

export interface SubmittedAttendancePayload {
  submitted: true
  attendance: Record<number, SubmittedAttendanceRecord>
  date: string
  approvalStatus: boolean | null
}

export interface NotSubmittedAttendancePayload {
  submitted: false
}

export type SessionAttendancePayload = SubmittedAttendancePayload | NotSubmittedAttendancePayload

// Teacher Messages Types
export interface MessageTemplate {
  id: string
  title: string
  icon: string
  content: string
  color: string
  is_active: boolean
}

export interface TeacherClass {
  id: number
  grade: string
  class_name: string
  subject_name: string
  subject_id?: number
}

export interface MessageStudent {
  id: number
  name: string
  parent_name: string
  parent_phone: string
  grade: string
  class_name: string
}

export interface SendMessagePayload {
  class_id: number
  student_ids: number[]
  template_id: string
  subject_name?: string
}

export interface MessageSettings {
  is_enabled: boolean
  daily_limit_per_teacher: number
  allowed_start_hour: number // 7
  allowed_end_hour: number // 11
}

export interface SentMessage {
  id: number
  teacher_id: number
  teacher_name: string
  student_id: number
  student_name: string
  parent_phone: string
  template_id: string
  template_title: string
  message_content: string
  sent_at: string
  status: 'sent' | 'failed'
}

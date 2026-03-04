export interface RemoteDayOverview {
  id: number
  date: string
  date_formatted: string
  note: string | null
  activated_by: string
  uploads_count: number
  total_participants: number
}

export interface RemoteDayStats {
  total_teachers: number
  teachers_uploaded: number
  teachers_not_uploaded: number
  total_participants: number
}

export interface RemoteDaySession {
  session_id: number
  teacher_id: number
  teacher_name: string
  subject_name: string
  grade: string
  class_name: string
  period_number: number | null
  is_uploaded: boolean
  upload_status: 'processing' | 'completed' | 'failed' | null
  upload_id: number | null
  total_participants: number
  avg_duration_seconds: number
  meeting_title: string | null
}

export interface RemoteDayDetails {
  remote_day: {
    date: string
    date_formatted: string
    note: string | null
    activated_by: string
  }
  stats: RemoteDayStats
  sessions: RemoteDaySession[]
}

export interface RemoteUploadDetails {
  upload: {
    id: number
    teacher_name: string
    original_filename: string
    meeting_title: string | null
    meeting_start_time: string | null
    meeting_end_time: string | null
    meeting_duration: string | null
    total_participants: number
    status: string
  }
  session: {
    subject_name: string
    grade: string | null
    class_name: string | null
    period_number: number | null
  }
  participants: Array<{
    id: number
    name: string
    email: string | null
    role: 'organizer' | 'attendee'
    first_join_time: string | null
    last_leave_time: string | null
    total_duration_seconds: number
    duration_text: string | null
    formatted_duration: string
    join_leave_count: number
  }>
  stats: {
    total_attendees: number
    avg_duration_seconds: number
    organizer: string | null
  }
}

export interface RemoteDay {
  id: number
  date: string
  note: string | null
}

export interface RemoteSessionStatus {
  id: number
  subject_name: string
  grade: string
  class_name: string
  period_number: number | null
  start_time: string | null
  end_time: string | null
  is_uploaded: boolean
  upload_status: 'processing' | 'completed' | 'failed' | null
  total_participants: number
}

export interface RemoteAttendanceStatusResponse {
  is_remote_day: boolean
  remote_day?: RemoteDay
  sessions: RemoteSessionStatus[]
}

export interface RemoteParticipant {
  id?: number
  name: string
  email: string | null
  role: 'organizer' | 'attendee'
  first_join_time: string | null
  last_leave_time: string | null
  total_duration_seconds: number
  duration_text: string | null
  formatted_duration?: string
  join_leave_count: number
}

export interface RemoteMeetingInfo {
  title: string | null
  total_participants: number
  start_time: string | null
  end_time: string | null
  duration: string | null
  average_attendance: string | null
}

export interface RemoteUploadResponse {
  upload_id: number
  meeting: RemoteMeetingInfo
  participants_count: number
  participants: RemoteParticipant[]
}

export interface RemoteReportData {
  upload: {
    id: number
    status: string
    original_filename: string
    meeting_title: string | null
    meeting_start_time: string | null
    meeting_end_time: string | null
    meeting_duration: string | null
    total_participants: number
  }
  session: {
    id: number
    subject_name: string
    grade: string
    class_name: string
    period_number: number | null
  }
  participants: RemoteParticipant[]
  stats: {
    total_attendees: number
    avg_duration_seconds: number
    organizer: string | null
  }
}

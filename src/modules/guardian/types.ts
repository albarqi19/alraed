import type { LeaveRequestStatus } from '@/modules/admin/types'

export interface GuardianStudentSummary {
  student_id: number
  name: string
  grade: string
  class_name: string
  parent_name: string
  parent_phone: string
}

export interface GuardianLeaveRequestRecord {
  id: number
  status: LeaveRequestStatus
  reason: string
  pickup_person_name: string
  expected_pickup_time?: string | null
  decision_notes?: string | null
  submitted_at: string
  decision_at?: string | null
}

export interface GuardianLeaveRequestPayload {
  national_id: string
  guardian_name: string
  guardian_phone: string
  reason: string
  pickup_person_name: string
  pickup_person_relation?: string | null
  pickup_person_phone?: string | null
  expected_pickup_time: string
}

export interface GuardianPortalSettings {
  school_name: string
  school_phone?: string | null
  school_id?: number | null
  auto_call_school_id?: string | number | null
  auto_call_enabled?: boolean | null
  auto_call_geofence?: {
    latitude: number
    longitude: number
    radius_meters: number
  } | null
  auto_call_open_from?: string | null
  auto_call_open_until?: string | null
  auto_call_repeat_seconds?: number | null
  auto_call_block_threshold?: number | null
  auto_call_block_duration_minutes?: number | null
}

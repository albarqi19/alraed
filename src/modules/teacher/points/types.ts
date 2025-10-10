export type TeacherPointMode = 'reward' | 'violation'

export interface TeacherPointSettings {
  daily_teacher_cap: number
  per_student_cap: number
  daily_violation_cap: number
  rewards_enabled: boolean
  violations_enabled: boolean
  require_camera_confirmation: boolean
  undo_timeout_seconds: number
  reward_values: number[]
  violation_values: number[]
}

export interface TeacherPointReason {
  id: number
  title: string
  type: TeacherPointMode
  value: number
  category?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export interface TeacherPointCounter {
  rewards_given: number
  violations_given: number
  unique_students_rewarded: number
  unique_students_penalized: number
}

export interface TeacherPointStudent {
  id: number
  name: string
  grade?: string | null
  class_name?: string | null
  card_token?: string | null
  card_issued_at?: string | null
  total_points?: number | null
}

export interface TeacherPointTransaction {
  id: number
  type: TeacherPointMode
  amount: number
  source?: string | null
  context?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string
  undoable_until?: string | null
  undone_at?: string | null
  is_undoable: boolean
  student?: TeacherPointStudent
  reason?: TeacherPointReason | null
}

export interface TeacherPointSummary {
  settings: TeacherPointSettings
  counter: TeacherPointCounter
  recent_transactions: TeacherPointTransaction[]
  students?: TeacherPointStudent[]
}

export interface TeacherPointConfigPayload {
  settings: TeacherPointSettings
  reasons: Record<TeacherPointMode, TeacherPointReason[]>
  summary: TeacherPointSummary
  students: TeacherPointStudent[]
}

export interface TeacherPointTransactionPayload {
  reason_id: number
  student_token: string
  notes?: string
  context?: string
}

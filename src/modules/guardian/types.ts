import type { LeaveRequestStatus, StoreOrderStatus, StoreStatus } from '@/modules/admin/types'

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

export interface GuardianStoreOverview {
  student: GuardianStudentSummary
  points: {
    total: number
    lifetime_rewards: number
    lifetime_violations: number
    lifetime_redemptions: number
    last_transaction_at?: string | null
  }
  store: {
    status: StoreStatus
    status_message?: string | null
    allow_student_notes: boolean
    allow_student_cancellations: boolean
    allow_waitlist_when_closed: boolean
  }
}

export interface GuardianStoreCategory {
  id: number
  name: string
  description?: string | null
  icon?: string | null
}

export interface GuardianStoreItem {
  id: number
  store_category_id?: number | null
  category_name?: string | null
  name: string
  description?: string | null
  image_url?: string | null
  points_cost: number
  max_per_student?: number | null
  unlimited_stock: boolean
  available_quantity?: number | null
  in_stock: boolean
  available_from?: string | null
  available_until?: string | null
  metadata?: Record<string, unknown> | null
}

export interface GuardianStoreCatalog {
  categories: GuardianStoreCategory[]
  items: GuardianStoreItem[]
}

export interface GuardianStoreOrderItemRecord {
  id: number
  store_item_id?: number | null
  name: string
  description?: string | null
  image_url?: string | null
  quantity: number
  unit_points: number
  total_points: number
}

export interface GuardianStoreOrderRecord {
  id: number
  reference_number?: string | null
  status: StoreOrderStatus
  total_points: number
  points_charged: number
  items_count: number
  student_notes?: string | null
  admin_notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  approved_at?: string | null
  fulfilled_at?: string | null
  cancelled_at?: string | null
  items: GuardianStoreOrderItemRecord[]
}

export interface GuardianStoreOrderPayload {
  national_id: string
  guardian_name: string
  guardian_phone: string
  notes?: string
  items: Array<{
    item_id: number
    quantity: number
  }>
}

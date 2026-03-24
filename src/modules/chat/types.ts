// ─── Conversation ───────────────────────────────

export interface Conversation {
  id: number
  guardian_id: number | null
  participant_id: number
  admin_user_id: number | null
  participant_role: string
  context_type: 'teacher' | 'counselor' | 'admin' | 'staff'
  student_id: number | null
  status: 'active' | 'archived' | 'closed'
  last_message_at: string | null
  last_message_preview: string | null
  guardian_unread_count: number
  participant_unread_count: number
  created_at: string
  // Relations (loaded via with())
  guardian?: {
    id: number
    parent_name: string | null
    parent_phone: string
  }
  participant?: {
    id: number
    name: string
    role: string
  }
  admin_user?: {
    id: number
    name: string
    role: string
  }
  student?: {
    id: number
    name: string
    grade: string
    class_name: string
  }
}

// ─── Message ────────────────────────────────────

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system'

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_type: 'guardian' | 'user'
  sender_id: number
  body: string | null
  type: MessageType
  metadata: Record<string, unknown> | null
  delivered_at: string | null
  read_at: string | null
  is_deleted: boolean
  created_at: string
}

// ─── Contact ────────────────────────────────────

export interface ChatContact {
  user_id: number
  name: string
  role: string
  role_label: string
  is_available: boolean
  subject_name?: string | null
  student: {
    id: number
    name: string
    grade: string
    class_name: string
  } | null
}

// ─── Availability ───────────────────────────────

export interface ChatAvailability {
  is_available: boolean
  unavailable_message: string | null
}

// ─── Settings ───────────────────────────────────

export interface ChatSettings {
  chat_enabled: boolean
  parent_can_initiate: boolean
  max_message_length: number
}

// ─── Stats ──────────────────────────────────────

export interface ChatStats {
  total_conversations: number
  active_conversations: number
  closed_conversations: number
  archived_conversations: number
  messages_today: number
  total_guardians: number
  blocked_guardians: number
}

// ─── Guardian Auth ──────────────────────────────

export interface GuardianLoginPayload {
  national_id: string
  phone_last4: string
}

export interface GuardianAuthResponse {
  token: string
  token_type: string
  expires_in: number
  guardian: {
    id: number
    parent_name: string | null
    parent_phone: string
    school_id: number
  }
  students: Array<{
    id: number
    name: string
    grade: string
    class_name: string
    national_id: string
  }>
}

// ─── Blocked Guardian ───────────────────────────

export interface BlockedGuardian {
  id: number
  parent_name: string | null
  parent_phone: string
  is_chat_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
}

// ─── Counselor Assignment ───────────────────────

export interface CounselorAssignment {
  id: number
  user_id: number
  grade: string | null
  class_name: string | null
  user?: {
    id: number
    name: string
    role: string
  }
}

// ─── Paginated ──────────────────────────────────

export interface PaginatedData<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  next_cursor?: string | null
  prev_cursor?: string | null
}

// ─── Start Conversation ─────────────────────────

export interface StartConversationPayload {
  participant_id: number
  student_id?: number | null
}

export interface AppNotificationStats {
  total_teachers: number
  with_app: number
  without_app: number
  app_install_rate: number
  delivery_rate_30d: number
  total_notifications_30d: number
  platforms: { web: number; android: number; ios: number }
}

export interface TeacherAppStatus {
  id: number
  name: string
  role: string
  has_app: boolean
  devices_count: number
  platforms: ('web' | 'android' | 'ios')[]
  last_active_at: string | null
}

export interface NotificationRecipient {
  id: number
  name: string
}

export interface NotificationLogEntry {
  id: number
  title: string
  body: string
  image: string | null
  recipient_type: 'individual' | 'bulk_selected' | 'bulk_all'
  total_recipients: number
  total_tokens: number
  delivered_count: number
  failed_count: number
  status: 'pending' | 'sending' | 'completed' | 'failed'
  sender: { id: number; name: string } | null
  recipients: NotificationRecipient[]
  completed_at: string | null
  created_at: string
}

export interface SendNotificationPayload {
  title: string
  body: string
  image?: string
  recipient_type: 'individual' | 'bulk_selected' | 'bulk_all'
  user_ids?: number[]
}

export type TeacherFilterStatus = 'all' | 'installed' | 'not_installed'

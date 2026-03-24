import { guardianClient } from '@/services/api/guardian-client'
import { apiClient } from '@/services/api/client'
import type {
  Conversation,
  ChatMessage,
  ChatContact,
  ChatAvailability,
  ChatSettings,
  ChatStats,
  GuardianLoginPayload,
  GuardianAuthResponse,
  BlockedGuardian,
  CounselorAssignment,
  PaginatedData,
  StartConversationPayload,
} from './types'

// ─── Guardian Auth ──────────────────────────────

export async function guardianLogin(payload: GuardianLoginPayload): Promise<GuardianAuthResponse> {
  const { data } = await guardianClient.post<GuardianAuthResponse>('/guardian-auth/login', payload)
  return data
}

export async function guardianRefresh(): Promise<{ token: string }> {
  const { data } = await guardianClient.post<{ token: string }>('/guardian-auth/refresh')
  return data
}

// ─── Guardian Chat ──────────────────────────────

export async function fetchGuardianConversations(page = 1): Promise<PaginatedData<Conversation>> {
  const { data } = await guardianClient.get<PaginatedData<Conversation>>('/guardian/chat/conversations', { params: { page } })
  return data
}

export async function fetchGuardianMessages(conversationId: number, cursor?: string): Promise<PaginatedData<ChatMessage>> {
  const { data } = await guardianClient.get<PaginatedData<ChatMessage>>(`/guardian/chat/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : undefined,
  })
  return data
}

export async function sendGuardianMessage(conversationId: number, body: string): Promise<{ message: ChatMessage }> {
  const { data } = await guardianClient.post<{ message: ChatMessage }>(`/guardian/chat/conversations/${conversationId}/messages`, { body })
  return data
}

export async function markGuardianMessagesRead(conversationId: number): Promise<void> {
  await guardianClient.post(`/guardian/chat/conversations/${conversationId}/read`)
}

export async function markGuardianMessageDelivered(messageId: number): Promise<void> {
  await guardianClient.post(`/guardian/chat/messages/${messageId}/delivered`)
}

export async function fetchGuardianContacts(): Promise<{ contacts: ChatContact[] }> {
  const { data } = await guardianClient.get<{ contacts: ChatContact[] }>('/guardian/chat/contacts')
  return data
}

export async function startGuardianConversation(payload: StartConversationPayload): Promise<{ conversation: Conversation }> {
  const { data } = await guardianClient.post<{ conversation: Conversation }>('/guardian/chat/conversations', payload)
  return data
}

export async function fetchGuardianUnreadTotal(): Promise<{ unread_total: number }> {
  const { data } = await guardianClient.get<{ unread_total: number }>('/guardian/chat/unread-total')
  return data
}

export async function fetchGuardianMe(): Promise<GuardianAuthResponse['guardian'] & { students: GuardianAuthResponse['students'] }> {
  const { data } = await guardianClient.get('/guardian/chat/me')
  return data
}

// ─── Guardian FCM ───────────────────────────────

export async function registerGuardianFcmToken(token: string, platform = 'web'): Promise<void> {
  await guardianClient.post('/guardian/chat/fcm-token', { token, platform })
}

export async function removeGuardianFcmToken(token: string): Promise<void> {
  await guardianClient.delete('/guardian/chat/fcm-token', { data: { token } })
}

// ─── Staff Chat ─────────────────────────────────

export async function fetchStaffConversations(page = 1): Promise<PaginatedData<Conversation>> {
  const { data } = await apiClient.get<PaginatedData<Conversation>>('/chat/conversations', { params: { page } })
  return data
}

export async function fetchStaffMessages(conversationId: number, cursor?: string): Promise<PaginatedData<ChatMessage>> {
  const { data } = await apiClient.get<PaginatedData<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : undefined,
  })
  return data
}

export async function sendStaffMessage(conversationId: number, body: string): Promise<{ message: ChatMessage }> {
  const { data } = await apiClient.post<{ message: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, { body })
  return data
}

export async function markStaffMessagesRead(conversationId: number): Promise<void> {
  await apiClient.post(`/chat/conversations/${conversationId}/read`)
}

export async function markStaffMessageDelivered(messageId: number): Promise<void> {
  await apiClient.post(`/chat/messages/${messageId}/delivered`)
}

export async function fetchStaffAvailability(): Promise<ChatAvailability> {
  const { data } = await apiClient.get<ChatAvailability>('/chat/availability')
  return data
}

export async function toggleStaffAvailability(payload: { is_available: boolean; unavailable_message?: string }): Promise<ChatAvailability> {
  const { data } = await apiClient.post<ChatAvailability>('/chat/availability', payload)
  return data
}

export async function fetchStaffUnreadTotal(): Promise<{ unread_total: number }> {
  const { data } = await apiClient.get<{ unread_total: number }>('/chat/unread-total')
  return data
}

export async function fetchStaffMyStudents(): Promise<{
  guardians: Array<{
    parent_phone: string
    parent_name: string | null
    students: Array<{ id: number; name: string; grade: string; class_name: string }>
  }>
}> {
  const { data } = await apiClient.get('/chat/my-students')
  return data
}

export async function startStaffConversation(studentId: number): Promise<{ conversation: Conversation }> {
  const { data } = await apiClient.post<{ conversation: Conversation }>('/chat/conversations', { student_id: studentId })
  return data
}

// ─── Admin Chat Management ──────────────────────

export async function fetchAdminConversations(params?: {
  page?: number
  status?: string
  context_type?: string
  participant_id?: number
  search?: string
}): Promise<PaginatedData<Conversation>> {
  const { data } = await apiClient.get<PaginatedData<Conversation>>('/admin/chat/conversations', { params })
  return data
}

export async function fetchAdminMessages(conversationId: number, cursor?: string): Promise<PaginatedData<ChatMessage>> {
  const { data } = await apiClient.get<PaginatedData<ChatMessage>>(`/admin/chat/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : undefined,
  })
  return data
}

export async function closeAdminConversation(conversationId: number): Promise<void> {
  await apiClient.post(`/admin/chat/conversations/${conversationId}/close`)
}

export async function archiveAdminConversation(conversationId: number): Promise<void> {
  await apiClient.post(`/admin/chat/conversations/${conversationId}/archive`)
}

export async function reopenAdminConversation(conversationId: number): Promise<void> {
  await apiClient.post(`/admin/chat/conversations/${conversationId}/reopen`)
}

export async function deleteAdminConversation(conversationId: number): Promise<void> {
  await apiClient.delete(`/admin/chat/conversations/${conversationId}`)
}

export async function deleteAdminMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/admin/chat/messages/${messageId}`)
}

export async function blockGuardian(guardianId: number, reason?: string): Promise<void> {
  await apiClient.post(`/admin/chat/guardians/${guardianId}/block`, { reason })
}

export async function unblockGuardian(guardianId: number): Promise<void> {
  await apiClient.delete(`/admin/chat/guardians/${guardianId}/block`)
}

export async function fetchBlockedGuardians(page = 1): Promise<PaginatedData<BlockedGuardian>> {
  const { data } = await apiClient.get<PaginatedData<BlockedGuardian>>('/admin/chat/guardians/blocked', { params: { page } })
  return data
}

export async function fetchChatSettings(): Promise<ChatSettings> {
  const { data } = await apiClient.get<ChatSettings>('/admin/chat/settings')
  return data
}

export async function updateChatSettings(settings: Partial<ChatSettings>): Promise<void> {
  await apiClient.put('/admin/chat/settings', settings)
}

export async function fetchChatStats(): Promise<ChatStats> {
  const { data } = await apiClient.get<ChatStats>('/admin/chat/stats')
  return data
}

export async function fetchAdminContacts(): Promise<{
  teachers: Array<{ id: number; name: string; type: string; phone: string }>
  counselors: Array<{ id: number; name: string; type: string; phone: string }>
  guardians: Array<{ parent_phone: string; parent_name: string | null; student_names: string; first_student_id: number; type: string }>
}> {
  const { data } = await apiClient.get('/admin/chat/contacts')
  return data
}

export async function startAdminConversation(studentId: number): Promise<{ conversation: Conversation }> {
  const { data } = await apiClient.post<{ conversation: Conversation }>('/admin/chat/conversations', { student_id: studentId })
  return data
}

export async function sendAdminMessage(conversationId: number, body: string): Promise<{ message: ChatMessage }> {
  const { data } = await apiClient.post<{ message: ChatMessage }>(`/admin/chat/conversations/${conversationId}/send`, { body })
  return data
}

export async function startAdminStaffConversation(userId: number): Promise<{ conversation: Conversation }> {
  const { data } = await apiClient.post<{ conversation: Conversation }>('/admin/chat/conversations/staff', { user_id: userId })
  return data
}

// ─── Counselor Assignments ──────────────────────

export async function fetchCounselorAssignments(): Promise<{ assignments: CounselorAssignment[] }> {
  const { data } = await apiClient.get<{ assignments: CounselorAssignment[] }>('/admin/counselor-assignments')
  return data
}

export async function createCounselorAssignment(payload: {
  user_id: number
  grade?: string | null
  class_name?: string | null
}): Promise<{ assignment: CounselorAssignment }> {
  const { data } = await apiClient.post<{ assignment: CounselorAssignment }>('/admin/counselor-assignments', payload)
  return data
}

export async function updateCounselorAssignment(
  id: number,
  payload: { grade?: string | null; class_name?: string | null },
): Promise<{ assignment: CounselorAssignment }> {
  const { data } = await apiClient.put<{ assignment: CounselorAssignment }>(`/admin/counselor-assignments/${id}`, payload)
  return data
}

export async function deleteCounselorAssignment(id: number): Promise<void> {
  await apiClient.delete(`/admin/counselor-assignments/${id}`)
}

export async function fetchCounselors(): Promise<{ counselors: Array<{ id: number; name: string; role: string; phone: string }> }> {
  const { data } = await apiClient.get('/admin/counselor-assignments/counselors')
  return data
}

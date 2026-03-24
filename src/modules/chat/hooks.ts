import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { chatQueryKeys } from './query-keys'
import * as api from './api'
import type { StartConversationPayload } from './types'

// ─── Guardian Hooks ─────────────────────────────

export function useGuardianConversationsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.guardianConversations,
    queryFn: () => api.fetchGuardianConversations(),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000, // fallback polling
    staleTime: 10_000,
  })
}

export function useGuardianMessagesQuery(conversationId: number | null) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.guardianMessages(conversationId!),
    queryFn: ({ pageParam }) => api.fetchGuardianMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!conversationId,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    staleTime: 5_000,
  })
}

export function useGuardianContactsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.guardianContacts,
    queryFn: () => api.fetchGuardianContacts(),
    staleTime: 60_000,
  })
}

export function useGuardianUnreadTotalQuery() {
  return useQuery({
    queryKey: chatQueryKeys.guardianUnreadTotal,
    queryFn: () => api.fetchGuardianUnreadTotal(),
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  })
}

export function useSendGuardianMessageMutation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.sendGuardianMessage(conversationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
    },
  })
}

export function useMarkGuardianReadMutation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.markGuardianMessagesRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianUnreadTotal })
    },
  })
}

export function useStartGuardianConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StartConversationPayload) => api.startGuardianConversation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
    },
  })
}

// ─── Staff Hooks ────────────────────────────────

export function useStaffConversationsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.staffConversations,
    queryFn: () => api.fetchStaffConversations(),
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}

export function useStaffMessagesQuery(conversationId: number | null) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.staffMessages(conversationId!),
    queryFn: ({ pageParam }) => api.fetchStaffMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!conversationId,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
    staleTime: 5_000,
  })
}

export function useSendStaffMessageMutation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.sendStaffMessage(conversationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
    },
  })
}

export function useMarkStaffReadMutation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.markStaffMessagesRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffUnreadTotal })
    },
  })
}

export function useStaffAvailabilityQuery() {
  return useQuery({
    queryKey: chatQueryKeys.staffAvailability,
    queryFn: () => api.fetchStaffAvailability(),
    staleTime: 60_000,
  })
}

export function useToggleStaffAvailabilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { is_available: boolean; unavailable_message?: string }) => api.toggleStaffAvailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffAvailability })
    },
  })
}

export function useStaffUnreadTotalQuery() {
  return useQuery({
    queryKey: chatQueryKeys.staffUnreadTotal,
    queryFn: () => api.fetchStaffUnreadTotal(),
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  })
}

export function useStaffMyStudentsQuery() {
  return useQuery({
    queryKey: ['staff', 'chat', 'my-students'] as const,
    queryFn: () => api.fetchStaffMyStudents(),
    staleTime: 120_000,
  })
}

export function useStartStaffConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => api.startStaffConversation(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
    },
  })
}

// ─── Admin Hooks ────────────────────────────────

export function useAdminConversationsQuery(params?: {
  status?: string
  context_type?: string
  search?: string
}) {
  return useQuery({
    queryKey: [...chatQueryKeys.adminConversations, params],
    queryFn: () => api.fetchAdminConversations(params),
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  })
}

export function useAdminMessagesQuery(conversationId: number | null) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.adminMessages(conversationId!),
    queryFn: ({ pageParam }) => api.fetchAdminMessages(conversationId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!conversationId,
    staleTime: 10_000,
  })
}

export function useChatSettingsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.adminSettings,
    queryFn: () => api.fetchChatSettings(),
    staleTime: 120_000,
  })
}

export function useUpdateChatSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.updateChatSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminSettings })
    },
  })
}

export function useChatStatsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.adminStats,
    queryFn: () => api.fetchChatStats(),
    staleTime: 30_000,
  })
}

export function useBlockedGuardiansQuery() {
  return useQuery({
    queryKey: chatQueryKeys.adminBlockedGuardians,
    queryFn: () => api.fetchBlockedGuardians(),
  })
}

export function useAdminContactsQuery() {
  return useQuery({
    queryKey: ['admin', 'chat', 'contacts'] as const,
    queryFn: () => api.fetchAdminContacts(),
    staleTime: 120_000,
  })
}

export function useStartAdminStaffConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api.startAdminStaffConversation(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
    },
  })
}

export function useStartAdminConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => api.startAdminConversation(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminStats })
    },
  })
}

export function useSendAdminMessageMutation(conversationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.sendAdminMessage(conversationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
    },
  })
}

export function useBlockGuardianMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ guardianId, reason }: { guardianId: number; reason?: string }) => api.blockGuardian(guardianId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminBlockedGuardians })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
    },
  })
}

export function useUnblockGuardianMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (guardianId: number) => api.unblockGuardian(guardianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminBlockedGuardians })
    },
  })
}

// ─── Admin Conversation Actions ─────────────────

export function useCloseConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) => api.closeAdminConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminStats })
    },
  })
}

export function useArchiveConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) => api.archiveAdminConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminStats })
    },
  })
}

export function useReopenConversationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) => api.reopenAdminConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminStats })
    },
  })
}

// ─── Counselor Assignments ──────────────────────

export function useCounselorAssignmentsQuery() {
  return useQuery({
    queryKey: chatQueryKeys.counselorAssignments,
    queryFn: () => api.fetchCounselorAssignments(),
    staleTime: 60_000,
  })
}

export function useCounselorsListQuery() {
  return useQuery({
    queryKey: chatQueryKeys.counselorsList,
    queryFn: () => api.fetchCounselors(),
    staleTime: 60_000,
  })
}

export function useCreateCounselorAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createCounselorAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.counselorAssignments })
    },
  })
}

export function useDeleteCounselorAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteCounselorAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.counselorAssignments })
    },
  })
}

export const chatQueryKeys = {
  // Guardian
  guardianConversations: ['guardian', 'chat', 'conversations'] as const,
  guardianMessages: (conversationId: number) => ['guardian', 'chat', 'messages', conversationId] as const,
  guardianContacts: ['guardian', 'chat', 'contacts'] as const,
  guardianUnreadTotal: ['guardian', 'chat', 'unread-total'] as const,
  guardianMe: ['guardian', 'chat', 'me'] as const,

  // Staff
  staffConversations: ['staff', 'chat', 'conversations'] as const,
  staffMessages: (conversationId: number) => ['staff', 'chat', 'messages', conversationId] as const,
  staffAvailability: ['staff', 'chat', 'availability'] as const,
  staffUnreadTotal: ['staff', 'chat', 'unread-total'] as const,

  // Admin
  adminConversations: ['admin', 'chat', 'conversations'] as const,
  adminMessages: (conversationId: number) => ['admin', 'chat', 'messages', conversationId] as const,
  adminSettings: ['admin', 'chat', 'settings'] as const,
  adminStats: ['admin', 'chat', 'stats'] as const,
  adminBlockedGuardians: ['admin', 'chat', 'blocked-guardians'] as const,
  counselorAssignments: ['admin', 'counselor-assignments'] as const,
  counselorsList: ['admin', 'counselor-assignments', 'counselors'] as const,
}

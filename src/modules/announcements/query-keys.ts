export const announcementQueryKeys = {
  active: () => ['announcements', 'active'] as const,
  platformList: (status?: string | null) => ['announcements', 'platform', status ?? 'all'] as const,
}

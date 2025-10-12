export const platformQueryKeys = {
  overview: () => ['platform', 'overview'] as const,
  revenue: () => ['platform', 'revenue-trends'] as const,
  invoices: () => ['platform', 'invoices'] as const,
  filters: () => ['platform', 'filters'] as const,
  schools: (params: { page?: number; search?: string; status?: string | null; plan?: string | null }) =>
    ['platform', 'schools', params] as const,
}

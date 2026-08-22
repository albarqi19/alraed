export const platformQueryKeys = {
  overview: () => ['platform', 'overview'] as const,
  revenue: () => ['platform', 'revenue-trends'] as const,
  invoices: () => ['platform', 'invoices'] as const,
  filters: () => ['platform', 'filters'] as const,
  schools: (params: { page?: number; search?: string; status?: string | null; plan?: string | null }) =>
    ['platform', 'schools', params] as const,
  referralCodes: () => ['platform', 'referral-codes'] as const,
  referralCodeSchools: (id: number) => ['platform', 'referral-codes', id, 'schools'] as const,
}

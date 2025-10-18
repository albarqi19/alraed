export const formQueryKeys = {
  adminList: (filters: Record<string, unknown> = {}) => ['forms', 'admin', 'list', filters] as const,
  adminDetail: (formId: number | null) => ['forms', 'admin', 'detail', formId] as const,
  adminSubmissions: (formId: number, filters: Record<string, unknown> = {}) =>
    ['forms', 'admin', 'submissions', formId, filters] as const,
  adminSubmission: (formId: number, submissionId: number | null) =>
    ['forms', 'admin', 'submission', formId, submissionId] as const,
  guardianList: (nationalId: string) => ['forms', 'guardian', nationalId] as const,
}

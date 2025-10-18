import type { FormSubmission } from './types'

export const FORM_SUBMISSION_STATUS_LABELS: Record<FormSubmission['status'], string> = {
  draft: 'مسودة',
  submitted: 'تم الإرسال',
  reviewed: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

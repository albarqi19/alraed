export type FormStatus = 'draft' | 'published' | 'archived'

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'phone'
  | 'email'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'yesno'
  | 'rating'
  | 'signature'
  | 'file'
  | 'section_break'
  | 'repeater'
  | 'matrix'

export type FormAssignmentScope = 'all_students' | 'grade' | 'class' | 'student' | 'group'

export interface FormFieldOption {
  label: string
  value: string
  description?: string | null
}

export interface FormFieldSettings {
  options?: FormFieldOption[]
  maxLength?: number | null
  minLength?: number | null
  maxValue?: number | null
  minValue?: number | null
  maxSizeKb?: number | null
  allowedTypes?: string[]
  maxFiles?: number | null
  [key: string]: unknown
}

export interface FormFieldValidationRules {
  pattern?: string | null
  message?: string | null
  [key: string]: unknown
}

export interface FormVisibilityRule {
  field_key: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains'
  value: string | number | boolean | Array<string | number | boolean>
}

export interface FormField {
  id: number
  section_id: number | null
  field_key: string
  type: FormFieldType
  label: string
  description?: string | null
  placeholder?: string | null
  helper_text?: string | null
  is_required: boolean
  settings?: FormFieldSettings
  validation?: FormFieldValidationRules
  visibility_rules?: FormVisibilityRule[]
  sort_order: number
}

export interface FormSection {
  id: number
  title: string
  description?: string | null
  sort_order: number
  fields: FormField[]
}

export interface FormAssignmentMetadata {
  student_ids?: number[]
  [key: string]: unknown
}

export interface FormAssignment {
  id: number
  scope: FormAssignmentScope
  grade?: string | null
  class_name?: string | null
  student_id?: number | null
  metadata?: FormAssignmentMetadata | null
}

export interface FormFieldInput extends Omit<FormField, 'id' | 'section_id'> {
  id?: number
  section_id?: number | null
}

export interface FormSectionInput extends Omit<FormSection, 'id' | 'fields'> {
  id?: number
  fields: FormFieldInput[]
}

export interface FormAssignmentInput extends Omit<FormAssignment, 'id'> {
  id?: number
}

export interface FormUpsertPayload {
  title: string
  slug?: string
  category?: string | null
  status?: FormStatus
  target_audience?: FormAssignmentScope
  description?: string | null
  settings?: Record<string, unknown> | null
  start_at?: string | null
  end_at?: string | null
  max_responses?: number | null
  allow_multiple_submissions?: boolean
  allow_edit_after_submit?: boolean
  sections?: FormSectionInput[]
  fields?: FormFieldInput[]
  assignments?: FormAssignmentInput[]
}

export interface FormSummary {
  id: number
  title: string
  slug: string
  category?: string | null
  status: FormStatus
  target_audience: FormAssignmentScope
  description?: string | null
  settings?: Record<string, unknown> | null
  start_at?: string | null
  end_at?: string | null
  max_responses?: number | null
  allow_multiple_submissions: boolean
  allow_edit_after_submit: boolean
  created_at: string
  updated_at: string
  submissions_count?: number
  sections?: FormSection[]
  fields?: FormField[]
  assignments?: FormAssignment[]
}

export interface FormListResponse {
  success: boolean
  data: FormSummary[]
  meta?: {
    current_page: number
    per_page: number
    last_page: number
    total: number
  }
}

export interface FormSubmissionAnswer {
  id: number
  field_id: number
  value_text?: string | null
  value_json?: unknown
  value_number?: number | null
  value_date?: string | null
  value_datetime?: string | null
  value_boolean?: boolean | null
}

export interface FormSubmissionFile {
  id: number
  field_id: number
  disk: string
  path: string
  filename: string
  extension?: string | null
  mime_type?: string | null
  size?: number | null
}

export type FormSubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected'

export interface FormSubmission {
  id: number
  form_id: number
  student_id: number | null
  student_national_id?: string | null
  guardian_name?: string | null
  guardian_phone?: string | null
  status: FormSubmissionStatus
  submitted_by_type: 'guardian' | 'admin' | 'system'
  submitted_by_id?: number | null
  submitted_at?: string | null
  reviewed_by?: number | null
  reviewed_at?: string | null
  review_notes?: string | null
  metadata?: Record<string, unknown> | null
  answers?: FormSubmissionAnswer[]
  files?: FormSubmissionFile[]
}

export interface FormSubmissionListResponse {
  success: boolean
  data: FormSubmission[]
  meta?: {
    current_page: number
    per_page: number
    last_page: number
    total: number
  }
}

export interface PublicFormDetails {
  id: number
  title: string
  slug: string
  description?: string | null
  category?: string | null
  start_at?: string | null
  end_at?: string | null
  allow_multiple_submissions: boolean
  allow_edit_after_submit: boolean
  sections: FormSection[]
  fields: FormField[]
}

export interface PublicFormsResponse {
  success: boolean
  data: PublicFormDetails[]
  message?: string
}

export type FormResponseValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null

export type FormResponsesPayload = Record<string, FormResponseValue>

export interface GuardianFormSubmissionPayload {
  national_id: string
  guardian_name?: string | null
  guardian_phone?: string | null
  responses: FormResponsesPayload
  files?: Record<string, File | File[]>
}

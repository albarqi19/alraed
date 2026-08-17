export type FormStatus = 'draft' | 'published' | 'archived'

/**
 * أنواع الحقول العشرون. الترتيب هنا هو ترتيب العقد نفسه، ويطابق
 * `FormController::FIELD_TYPES` في الباك — فلا يُعاد ترتيبه في طرفٍ دون الآخر.
 *
 * `image` يخزَّن ويُرفع كـ`file` تماماً (نفس جدول form_submission_files ونفس
 * المسار)، ولا يفارقه إلا في ثلاثة: افتراضاتُ الإعدادات، ومعاينةٌ مصغّرة في
 * واجهة وليّ الأمر مع accept="image/*"، وعرضُ الأدمن له صورةً لا رابطاً.
 */
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
  | 'file'
  | 'image'
  | 'signature'
  | 'section_break'
  | 'repeater'
  | 'matrix'

export type FormAssignmentScope = 'all_students' | 'grade' | 'class' | 'student' | 'group'

export interface FormFieldOption {
  label: string
  value: string
  description?: string | null
}

/**
 * إعدادات الحقل كما تُخزَّن في `form_fields.settings` وكما يقرؤها الباك حرفياً
 * (`FormPublicController::validateFiles` يقرأ max_size_kb/allowed_types/max_files).
 * المفاتيح **snake_case بلا استثناء**: كانت الواجهة تكتب maxSizeKb/allowedTypes/
 * maxFiles فلا يراها الباك أصلاً، فتسقط كلُّ الحدود إلى الافتراضات صامتةً.
 *
 * ولا نُبقي `[key: string]: unknown`: فتحُ الشكل هو ما سمح بالانشقاق ابتداءً،
 * وإغلاقه يجعل المترجم يكشف كلّ مفتاحٍ مخالف.
 */
export interface FormFieldSettings {
  /** خيارات select/multi_select/radio — الباك يطابق الإجابة بقيم هذه الخيارات */
  options?: FormFieldOption[]
  /** حدود طول النصّ — تُطبَّق في الواجهة (الباك لا يفرضها بعد) */
  min_length?: number | null
  max_length?: number | null
  /** حدود الرقم وخطوته */
  min?: number | null
  max?: number | null
  step?: number | null
  /** أقصى درجات التقييم، وافتراضه خمس */
  max_rating?: number | null
  /** امتدادات مسموحة بلا نقطة وبحروفٍ صغيرة — للمرفقات (file/image) */
  allowed_types?: string[]
  max_size_kb?: number | null
  max_files?: number | null
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
  /**
   * مفتاحُ سمةٍ في معجم الطالب — `null` لسؤالٍ عابرٍ لا يصير سجلّاً دائماً.
   *
   * هذا الحقلُ وحده هو ما يحلّ التوتر بين «نموذجٍ معتمدٍ لا يتغيّر» و«مدرسةٍ
   * تريد نموذجها»: الصياغةُ والترتيب حرّان، والمفتاحُ ثابتٌ عند الجميع — فيهبط
   * الجوابُ في نفس خانة ملفّ الطالب مهما اختلف السؤال.
   */
  maps_to?: string | null
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

/**
 * البيانات الملحقة بالإسناد. الباك يقرأ منها مفتاحاً واحداً فقط
 * (`whereJsonContains('metadata->student_ids', …)` لنطاق `group`)، فلا نُبقي
 * الشكل مفتوحاً على مفاتيح لا يقرؤها أحد.
 */
export interface FormAssignmentMetadata {
  student_ids?: number[]
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
  requires_approval?: boolean
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
  requires_approval: boolean
  created_at: string
  updated_at: string
  submissions_count?: number
  /** عدد الأسئلة الحقيقي (كل الحقول لا المستقلة) — يصل عبر withCount في index */
  fields_count?: number
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
  field?: FormField
  value_text?: string | null
  value_json?: unknown
  value_number?: number | null
  value_date?: string | null
  value_datetime?: string | null
  value_boolean?: boolean | null
  /**
   * الإجابةُ محجوبةٌ عن صاحب الطلب.
   *
   * حين تكون `true` تصل كلُّ حقول `value_*` فارغةً **من الخادم**: لا شرطَ إخفاءٍ
   * هنا يُخفي قيمةً موجودة، لأن ذلك يعني أنها في المتصفّح فعلاً ويقرؤها من يفتح
   * أدوات المطوّر. الواجهة ترسم الطمس، ولا تملك ما تطمسه.
   */
  is_redacted?: boolean
}

/**
 * مورد الملفّ كما يُصدِّره `FormSubmissionFileResource`.
 *
 * `disk` و`path` حُذفا عمداً: كانت الواجهة تبني الرابط بيدها من المسار
 * (`${VITE_STORAGE_BASE_URL}/${path}`) وهو رابطٌ لا يعمل إلا لو فُتح قرص local
 * للعالم — وفتحُه يكشف معه الأعذار ووثائق الحالات والإحالات. فالرابط اليوم
 * يولّده الباك موقَّعاً ومؤقّتاً (ثلاثين دقيقة)، ولا تبنيه الواجهة أبداً.
 */
export interface FormSubmissionFile {
  id: number
  field_id: number
  filename: string
  extension: string | null
  mime_type: string | null
  size: number | null
  /** أهو صورةٌ تُعرض <img>؟ يحسبه الباك من الامتداد (jpg/jpeg/png/webp/heic/gif) */
  is_image: boolean
  /** رابطٌ موقَّعٌ مؤقّت، و`null` إن تعذّر توليده (قرصٌ لا يدعم التوقيع مثلاً) */
  url: string | null
}

export interface FormSubmissionStudentSummary {
  id: number
  name: string
  grade?: string | null
  class_name?: string | null
  national_id?: string | null
  parent_name?: string | null
  parent_phone?: string | null
}

export type FormSubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected'

export interface FormSubmission {
  id: number
  form_id: number
  student_id: number | null
  student_national_id?: string | null
  student?: FormSubmissionStudentSummary | null
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

/* ======================================================
   نموذج بيانات مصمّم النموذج — الحالة المحلّية ومحوّلاتها
   ------------------------------------------------------
   لا رسمَ هنا ولا استعلامات: تحويلاتٌ صرفة بين ثلاث صورٍ للبيانات —
   ما يصل من الخادم (FormSummary)، وما يحرّره المصمّم (DraftField)،
   وما يُرسَل في العقد (FormUpsertPayload). وفصلُها يجعل كلَّ قاعدةٍ
   مقروءةً في موضعٍ واحد بدل أن تتناثر داخل الرسم.
   ====================================================== */
import { getFieldTypeDefaults, getFieldTypeMeta, fieldTypeHasOptions } from '@/modules/forms/constants'
import type {
  FormAssignment,
  FormAssignmentInput,
  FormAssignmentScope,
  FormField,
  FormFieldInput,
  FormFieldType,
  FormStatus,
  FormSummary,
  PublicFormDetails,
} from '@/modules/forms/types'

/** حقلٌ تحت التحرير: حقلُ العقد ومعه ما يلزم المصمّم وحده */
export interface DraftField extends FormFieldInput {
  /** هويّةٌ محلّية تعيش ما دام المصمّم مفتوحاً — الحقل الجديد بلا معرّفٍ من الخادم */
  localId: string
  /** أيتبع المفتاحُ التسميةَ تلقائياً؟ يُكسر أوّل ما يحرّر المستخدمُ المفتاحَ بيده */
  autoKey: boolean
}

export type FieldError = Partial<Record<'label' | 'field_key' | 'options', string>>

export type GeneralError = Partial<Record<'title' | 'fields' | 'assignments' | 'dates', string>>

export interface GeneralState {
  title: string
  description: string
  status: FormStatus
  target_audience: FormAssignmentScope
  category: string
  max_responses: string
  allow_multiple_submissions: boolean
  allow_edit_after_submit: boolean
  requires_approval: boolean
  start_at: string
  end_at: string
}

/**
 * المستهدَفون كما يختارهم المصمّم. `studentIds` واحدةٌ للنطاقين `student`
 * و`group` عمداً: كلاهما اختيارُ طلابٍ بأعيانهم، ولا يفترقان إلا في شكل
 * التخزين (صفٌّ لكلّ طالب، أو صفٌّ واحد يحمل قائمتهم في metadata).
 */
export interface AudienceSelection {
  grades: string[]
  classes: Array<{ grade: string; class_name: string }>
  studentIds: number[]
}

export const EMPTY_SELECTION: AudienceSelection = { grades: [], classes: [], studentIds: [] }

export const FORM_STATUS_OPTIONS: Array<{ value: FormStatus; label: string }> = [
  { value: 'draft', label: 'مسودة' },
  { value: 'published', label: 'منشور' },
  { value: 'archived', label: 'مؤرشف' },
]

export const AUDIENCE_OPTIONS: Array<{ value: FormAssignmentScope; label: string; hint: string }> = [
  { value: 'all_students', label: 'جميع الطلاب', hint: 'كل طالب في المدرسة يرى النموذج' },
  { value: 'grade', label: 'صفوف', hint: 'صفٌّ أو أكثر بكامل فصوله' },
  { value: 'class', label: 'فصول', hint: 'فصلٌ بعينه داخل صفّه' },
  { value: 'student', label: 'طلاب', hint: 'طلابٌ مختارون بأعيانهم' },
  { value: 'group', label: 'مجموعة', hint: 'قائمةُ طلابٍ تُحفَظ إسناداً واحداً' },
]

/* ── المفاتيح ── */

/**
 * مفتاحُ الحقل لاتينيٌّ لأنّه يصير اسمَ الحقل في حمولة الإرسال ومفتاحَ الإجابة.
 * تردّ فراغاً حين لا يبقى من النصّ حرفٌ لاتينيّ — والفراغُ إشارةٌ للمستدعي أن
 * يُبقي المفتاح السابق، لا أن يولّد مفتاحاً عشوائياً في كلّ ضغطة زرّ.
 */
export function slugifyKey(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  if (!cleaned) return ''

  return /^[0-9]/.test(cleaned) ? `f_${cleaned}` : cleaned
}

/** يُبعد التصادم بلاحقةٍ رقمية — المفتاح المكرَّر يُعيد الخادم تسميته صامتاً */
export function uniqueKey(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base

  let counter = 2
  while (taken.has(`${base}_${counter}`)) counter += 1

  return `${base}_${counter}`
}

function takenKeys(fields: DraftField[], exceptLocalId?: string): Set<string> {
  return new Set(
    fields
      .filter((field) => field.localId !== exceptLocalId)
      .map((field) => field.field_key.trim())
      .filter(Boolean),
  )
}

let localIdCounter = 0

function nextLocalId(): string {
  localIdCounter += 1
  return `draft-${Date.now().toString(36)}-${localIdCounter}`
}

/* ── إنشاء الحقول ونسخها ── */

export function createDraftField(type: FormFieldType, existing: DraftField[]): DraftField {
  const meta = getFieldTypeMeta(type)
  const taken = takenKeys(existing)

  return {
    localId: nextLocalId(),
    autoKey: true,
    field_key: uniqueKey(`${type}_${existing.length + 1}`, taken),
    type,
    label: meta?.label ?? 'حقل جديد',
    description: '',
    placeholder: '',
    helper_text: '',
    is_required: false,
    // نسخةٌ طازجة من الافتراضات — الثابت المشترك لو مُرِّر لتسرّبت خيارات حقلٍ لغيره
    settings: getFieldTypeDefaults(type),
    validation: {},
    visibility_rules: [],
    sort_order: existing.length,
  }
}

export function duplicateDraftField(field: DraftField, existing: DraftField[]): DraftField {
  const taken = takenKeys(existing)

  return {
    ...field,
    localId: nextLocalId(),
    autoKey: false,
    // النسخة حقلٌ جديد لا معرّف له: توريثُ معرّف الأصل يجعلها تبدو الحقلَ نفسه
    id: undefined,
    field_key: uniqueKey(`${field.field_key}_copy`, taken),
    label: `${field.label} (نسخة)`,
    // نسخٌ عميق للإعدادات: مشاركةُ المرجع تجعل تحرير خيارات النسخة يعدّل الأصل
    settings: structuredClone(field.settings ?? {}),
    validation: structuredClone(field.validation ?? {}),
    visibility_rules: structuredClone(field.visibility_rules ?? []),
  }
}

/**
 * تبديلُ نوع الحقل يُبدّل إعداداته معه: إعداداتُ «رفع ملف» لا معنى لها في
 * «تقييم»، وبقاؤها يُرسل للخادم حشواً يضلّل من يقرأ الصفّ. والخياراتُ وحدها
 * تُنقَل حين يبقى النوعان من عائلة الاختيار (قائمة ← أزرار مثلاً).
 */
export function retypeDraftField(field: DraftField, type: FormFieldType): DraftField {
  const defaults = getFieldTypeDefaults(type)
  const keepOptions = fieldTypeHasOptions(field.type) && fieldTypeHasOptions(type)

  return {
    ...field,
    type,
    settings: keepOptions ? { ...defaults, options: field.settings?.options ?? [] } : defaults,
  }
}

/* ── القراءة من الخادم ── */

function toDraft(field: FormField): DraftField {
  return {
    localId: `stored-${field.id}`,
    autoKey: false,
    id: field.id,
    field_key: field.field_key,
    type: field.type,
    label: field.label,
    description: field.description ?? '',
    placeholder: field.placeholder ?? '',
    helper_text: field.helper_text ?? '',
    is_required: Boolean(field.is_required),
    // **لا تُحقَن الافتراضات هنا**: حقنُها يجعل كلَّ نموذجٍ قديم يبدو «متغيّر
    // البنية» لحظة فتحه، فيرتدّ حفظُ عنوانه بـ٤٢٢ متى وصله ردٌّ واحد.
    settings: field.settings ?? {},
    validation: field.validation ?? {},
    visibility_rules: field.visibility_rules ?? [],
    sort_order: field.sort_order,
  }
}

/**
 * ترتيبُ الحقول هنا هو ترتيبُ الخادم نفسه (`allFieldsOf`): المستقلّة أوّلاً ثمّ
 * حقولُ الأقسام — كي يرى الأدمن في اللوح ما يراه وليّ الأمر في الاستمارة.
 */
export function mapFormToDraftFields(form?: FormSummary | null): DraftField[] {
  if (!form) return []

  const standalone = [...(form.fields ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const sectionFields = [...(form.sections ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((section) => [...section.fields].sort((a, b) => a.sort_order - b.sort_order))

  return [...standalone, ...sectionFields].map(toDraft)
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function toISOStringFromLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * `requires_approval` عمودٌ في الجدول ومفتاحٌ في `settings` معاً في نماذج قديمة،
 * فنقرأ العمود أوّلاً ثمّ نلتمس المفتاح بصوره الأربع التي كُتب بها عبر السنين.
 */
export function readRequiresApproval(form?: FormSummary | null): boolean {
  if (!form) return false
  if (typeof form.requires_approval === 'boolean') return form.requires_approval

  const settings = (form.settings ?? {}) as Record<string, unknown>

  for (const key of ['requires_approval', 'requiresApproval', 'require_approval', 'requireApproval']) {
    if (typeof settings[key] === 'boolean') return settings[key] as boolean
  }

  return false
}

export function getDefaultGeneralState(mode: 'create' | 'edit', form?: FormSummary | null): GeneralState {
  if (mode === 'edit' && form) {
    return {
      title: form.title,
      description: form.description ?? '',
      status: form.status,
      target_audience: form.target_audience ?? 'all_students',
      category: form.category ?? '',
      max_responses: form.max_responses ? String(form.max_responses) : '',
      allow_multiple_submissions: Boolean(form.allow_multiple_submissions),
      allow_edit_after_submit: Boolean(form.allow_edit_after_submit),
      requires_approval: readRequiresApproval(form),
      start_at: toDateTimeLocal(form.start_at),
      end_at: toDateTimeLocal(form.end_at),
    }
  }

  return {
    title: '',
    description: '',
    status: 'draft',
    target_audience: 'all_students',
    category: '',
    max_responses: '',
    allow_multiple_submissions: false,
    allow_edit_after_submit: false,
    requires_approval: false,
    start_at: '',
    end_at: '',
  }
}

/* ── الكتابة إلى العقد ── */

function trimmedOrNull(value?: string | null): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

/**
 * حقولُ الحمولة بترتيب اللوح. `id` يُسقَط عمداً: `syncStructure` يمسح الحقول
 * كلَّها ثمّ يعيد إنشاءها، فإرسالُ معرّفاتٍ قديمة يوهم بتحديثٍ جزئيّ لا وجود له.
 */
export function buildFieldsPayload(fields: DraftField[]): FormFieldInput[] {
  return fields.map((field, index) => {
    const settings = field.settings ?? {}

    return {
      field_key: field.field_key.trim(),
      type: field.type,
      label: field.label.trim(),
      description: trimmedOrNull(field.description),
      placeholder: trimmedOrNull(field.placeholder),
      helper_text: trimmedOrNull(field.helper_text),
      is_required: Boolean(field.is_required),
      settings: Object.keys(settings).length > 0 ? settings : undefined,
      validation:
        field.validation && Object.keys(field.validation).length > 0 ? field.validation : undefined,
      visibility_rules: field.visibility_rules?.length ? field.visibility_rules : undefined,
      sort_order: index,
      section_id: null,
    }
  })
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonical(source[key])
        return acc
      }, {})
  }

  return value ?? null
}

function fieldSignature(field: FormFieldInput, index: number): unknown {
  return {
    type: field.type,
    field_key: trimmedOrNull(field.field_key),
    label: trimmedOrNull(field.label),
    description: trimmedOrNull(field.description),
    placeholder: trimmedOrNull(field.placeholder),
    helper_text: trimmedOrNull(field.helper_text),
    is_required: Boolean(field.is_required),
    sort_order: index,
    settings: canonical(field.settings ?? {}),
    validation: canonical(field.validation ?? {}),
    visibility_rules: canonical(field.visibility_rules ?? []),
  }
}

/**
 * بصمةُ البنية — تُقارَن بها المُحرَّرةُ بالمحفوظة قبل الإرسال.
 *
 * الخادم يمسح الحقول ويعيد إنشاءها عند كلّ مزامنة، و`form_submission_answers`
 * مربوطةٌ بها بحذفٍ متتالٍ، فيرفض تغيير البنية بعد أوّل ردّ. وكان المصمّم يرسل
 * `fields` مع كلّ حفظٍ ولو لم يُلمس سؤال، فيرتدّ تصحيحُ حرفٍ في العنوان بـ٤٢٢.
 * فنحن لا نرسل البنية إلّا إذا تغيّرت فعلاً. (الخادم يقارن أيضاً — حارسان مقصودان.)
 */
export function structureSignature(fields: FormFieldInput[]): string {
  return JSON.stringify(fields.map(fieldSignature))
}

/**
 * هل بنيةُ اللوح مطابقةٌ لما في الخادم؟
 *
 * وجودُ أقسامٍ محفوظة يُسقط التطابق دائماً: المصمّم يسطّح الأقسام في قائمةٍ
 * واحدة، فإعادةُ إرسالها تعني حذفَ الأقسام — وهذا تغييرُ بنيةٍ لا تجميل.
 */
export function structureUnchanged(form: FormSummary | null | undefined, fields: DraftField[]): boolean {
  if (!form) return false
  if ((form.sections ?? []).length > 0) return false

  const stored = mapFormToDraftFields({ ...form, sections: [] })

  return structureSignature(buildFieldsPayload(stored)) === structureSignature(buildFieldsPayload(fields))
}

/* ── الإسناد ── */

export function mapAssignmentsToSelection(assignments: FormAssignment[] = []): AudienceSelection {
  const grades = new Set<string>()
  const classes = new Map<string, { grade: string; class_name: string }>()
  const studentIds = new Set<number>()

  for (const assignment of assignments) {
    switch (assignment.scope) {
      case 'grade':
        if (assignment.grade) grades.add(assignment.grade)
        break
      case 'class':
        if (assignment.grade && assignment.class_name) {
          classes.set(`${assignment.grade}|${assignment.class_name}`, {
            grade: assignment.grade,
            class_name: assignment.class_name,
          })
        }
        break
      case 'student':
        if (typeof assignment.student_id === 'number') studentIds.add(assignment.student_id)
        break
      case 'group':
        for (const id of assignment.metadata?.student_ids ?? []) {
          if (typeof id === 'number') studentIds.add(id)
        }
        break
      default:
        break
    }
  }

  return {
    grades: [...grades],
    classes: [...classes.values()],
    studentIds: [...studentIds],
  }
}

/**
 * يبني صفوف `form_assignments` من الجمهور والمستهدَفين. التنظيف النهائي
 * (إسقاطُ الأجوف ونزعُ الحشو والاختصار إلى «جميع الطلاب») مسؤولية
 * `prepareAssignmentPayload` في api.ts، فلا نكرّره هنا.
 */
export function buildAssignmentInputs(
  audience: FormAssignmentScope,
  selection: AudienceSelection,
): FormAssignmentInput[] {
  switch (audience) {
    case 'all_students':
      return [{ scope: 'all_students' }]
    case 'grade':
      return selection.grades.map((grade) => ({ scope: 'grade' as const, grade }))
    case 'class':
      return selection.classes.map((item) => ({
        scope: 'class' as const,
        grade: item.grade,
        class_name: item.class_name,
      }))
    case 'student':
      return selection.studentIds.map((student_id) => ({ scope: 'student' as const, student_id }))
    case 'group':
      return selection.studentIds.length
        ? [{ scope: 'group', metadata: { student_ids: selection.studentIds } }]
        : []
    default:
      return []
  }
}

/** عددُ المستهدَفين المختارين — عليه يقوم حارسُ «جمهورٌ محدَّد بلا مستهدَف» */
export function countSelectedTargets(audience: FormAssignmentScope, selection: AudienceSelection): number {
  switch (audience) {
    case 'all_students':
      return 1
    case 'grade':
      return selection.grades.length
    case 'class':
      return selection.classes.length
    case 'student':
    case 'group':
      return selection.studentIds.length
    default:
      return 0
  }
}

/* ── التحقّق ── */

export interface ValidationResult {
  general: GeneralError
  fields: Record<string, FieldError>
  ok: boolean
}

export function validateDraft(
  general: GeneralState,
  fields: DraftField[],
  selection: AudienceSelection,
): ValidationResult {
  const generalErrors: GeneralError = {}
  const fieldErrors: Record<string, FieldError> = {}

  if (!general.title.trim()) {
    generalErrors.title = 'أدخل عنواناً واضحاً للنموذج'
  }

  if (fields.length === 0) {
    generalErrors.fields = 'أضف سؤالاً واحداً على الأقل قبل الحفظ'
  }

  if (general.start_at && general.end_at && general.end_at < general.start_at) {
    generalErrors.dates = 'تاريخ الانتهاء قبل تاريخ البداية — النموذج لن يُفتح أبداً'
  }

  // نفسُ حارس الخادم (`guardAudienceHasAssignments`) في الواجهة: جمهورٌ محدَّد
  // بلا مستهدَفٍ واحد يعني نموذجاً يُحفَظ ويُنشَر ولا يراه إنسان.
  if (countSelectedTargets(general.target_audience, selection) === 0) {
    generalErrors.assignments =
      'اخترت جمهوراً محدداً ولم تحدد مستهدفاً واحداً، فلن يظهر النموذج لأحد. حدد المستهدفين أو اجعل الجمهور «جميع الطلاب».'
  }

  const seenKeys = new Set<string>()

  for (const field of fields) {
    const errors: FieldError = {}

    if (!field.label.trim()) {
      errors.label = 'العنوان مطلوب'
    }

    const key = field.field_key.trim()
    if (!key) {
      errors.field_key = 'مفتاح الحقل مطلوب'
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      errors.field_key = 'أحرف لاتينية وأرقام وشرطة سفلية فقط، ولا يبدأ برقم'
    } else if (seenKeys.has(key)) {
      errors.field_key = 'المفتاح مستخدم في سؤال آخر'
    } else {
      seenKeys.add(key)
    }

    // قائمةٌ بلا خيارات تصل وليَّ الأمر فارغةً: يراها ولا يستطيع الإجابة عليها
    if (fieldTypeHasOptions(field.type) && (field.settings?.options ?? []).length === 0) {
      errors.options = 'أضف خياراً واحداً على الأقل'
    }

    if (Object.keys(errors).length > 0) {
      fieldErrors[field.localId] = errors
    }
  }

  return {
    general: generalErrors,
    fields: fieldErrors,
    ok: Object.keys(generalErrors).length === 0 && Object.keys(fieldErrors).length === 0,
  }
}

/* ── المعاينة ── */

/**
 * يبني من المسودّة نموذجاً عامّاً بشكل `PublicFormDetails` كي يرسمه **راسمُ وليّ
 * الأمر نفسه** — فيرى الأدمن ما يراه وليّ الأمر بالحرف، لا محاكاةً تكذب.
 * المعرّفات هنا اصطناعية (موضعُ الحقل) لأنّ الحقل الجديد لا معرّف له بعد.
 */
export function buildPreviewForm(
  general: GeneralState,
  fields: DraftField[],
  formId: number,
): PublicFormDetails {
  return {
    id: formId,
    title: general.title.trim() || 'نموذج بلا عنوان',
    slug: 'preview',
    description: trimmedOrNull(general.description),
    category: trimmedOrNull(general.category),
    start_at: toISOStringFromLocal(general.start_at),
    end_at: toISOStringFromLocal(general.end_at),
    allow_multiple_submissions: general.allow_multiple_submissions,
    allow_edit_after_submit: general.allow_edit_after_submit,
    sections: [],
    fields: fields.map((field, index) => ({
      id: index + 1,
      section_id: null,
      field_key: field.field_key,
      type: field.type,
      label: field.label,
      description: field.description ?? null,
      placeholder: field.placeholder ?? null,
      helper_text: field.helper_text ?? null,
      is_required: Boolean(field.is_required),
      settings: field.settings ?? {},
      validation: field.validation ?? {},
      visibility_rules: field.visibility_rules ?? [],
      sort_order: index,
    })),
  }
}

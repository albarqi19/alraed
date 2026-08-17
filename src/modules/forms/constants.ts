import {
  AlignLeft,
  Calendar,
  CalendarClock,
  CircleDot,
  Clock,
  Grid3x3,
  Hash,
  ImageIcon,
  List,
  ListChecks,
  Mail,
  Paperclip,
  Phone,
  Repeat2,
  SeparatorHorizontal,
  Signature,
  SquareCheck,
  Star,
  ToggleLeft,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FormFieldSettings, FormFieldType, FormSubmission } from './types'

export const FORM_SUBMISSION_STATUS_LABELS: Record<FormSubmission['status'], string> = {
  draft: 'مسودة',
  submitted: 'تم الإرسال',
  reviewed: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  returned: 'مُعاد للتعديل',
}

/** مجموعات لوحة الأنواع في المصمّم */
export type FormFieldGroup = 'text' | 'choice' | 'datetime' | 'attachment' | 'layout'

export const FORM_FIELD_GROUP_LABELS: Record<FormFieldGroup, string> = {
  text: 'نصّ وأرقام',
  choice: 'اختيار',
  datetime: 'زمن',
  attachment: 'مرفقات',
  layout: 'تخطيط',
}

/** ترتيب عرض المجموعات في لوحة المصمّم */
export const FORM_FIELD_GROUP_ORDER: readonly FormFieldGroup[] = [
  'text',
  'choice',
  'datetime',
  'attachment',
  'layout',
]

/**
 * وصفُ نوعِ حقلٍ واحد. مفاتيحُ هذا الوصف camelCase لأنّها لا تعبر الشبكة أبداً —
 * وحدها مفاتيح `defaults` تُخزَّن في `form_fields.settings` فتلزمها snake_case.
 */
export interface FormFieldTypeMeta {
  value: FormFieldType
  /** التسمية العربية المعروضة في اللوحة وفي رأس السؤال */
  label: string
  /** جملةٌ تشرح للمصمّم ما يفعله النوع */
  description: string
  icon: LucideIcon
  group: FormFieldGroup
  /** أيحتاج النوع قائمة خيارات؟ المصمّم يُظهر محرّر الخيارات بناءً عليها */
  hasOptions: boolean
  /** أيجمع النوع ملفّات في `form_submission_files`؟ */
  isAttachment: boolean
  /**
   * أيحمل النوع إجابةً من المستخدم أصلاً؟ `section_break` وحده لا يحملها، فلا
   * يُعدّ سؤالاً ولا يُطلَب ولا يُحسب في عدّاد الأسئلة. حتى `file`/`image` يحملان
   * إجابةً: الباك ينشئ لهما صفّاً في `form_submission_answers` بمراجع الملفّات.
   */
  storesAnswer: boolean
  /** أيُعرض في لوحة المصمّم؟ انظر تعليق الأنواع المحجوبة أدناه */
  paletteVisible: boolean
  /** الإعدادات الابتدائية عند إضافة الحقل — snake_case لأنّها تُرسَل كما هي */
  defaults: FormFieldSettings
}

/**
 * **مصدر الحقيقة الوحيد لأنواع الحقول.** المصمّم يبني لوحته منه، والراسم يقرأ
 * الافتراضات منه، وصفحة الردود تقرأ التسميات منه. الترتيب ترتيبُ العقد.
 *
 * قرارُ الأنواع الثلاثة الأخيرة:
 *  • `section_break` — **معروض**: فاصلٌ بصريّ بلا قيمة، وهو ما تحتاجه النماذج
 *    الطويلة فعلاً. على الراسم أن يرسمه عنواناً/خطّاً فاصلاً ولا يعدّه سؤالاً.
 *  • `repeater` و`matrix` — **محجوبان**: الراسم لا يرسمهما، فلو أضافهما مصمّمٌ
 *    لظهر لوليّ الأمر نموذجٌ فيه سؤالٌ لا يستطيع الإجابة عليه — وإن كان مطلوباً
 *    حجب النموذجَ كلَّه عنه. يبقيان في اتّحاد `FormFieldType` لأنّ الباك يقبلهما
 *    وقد تحملهما نماذجُ قديمة، فتُقرأ ولا تُنشأ. يُرفع الحجب يوم يرسمهما الراسم.
 */
export const FORM_FIELD_TYPES: readonly FormFieldTypeMeta[] = [
  {
    value: 'text',
    label: 'نص قصير',
    description: 'إجابة نصية في سطر واحد',
    icon: Type,
    group: 'text',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { max_length: 255 },
  },
  {
    value: 'textarea',
    label: 'نص طويل',
    description: 'إجابة نصية موسعة في عدة أسطر',
    icon: AlignLeft,
    group: 'text',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { max_length: 2000 },
  },
  {
    value: 'number',
    label: 'رقم',
    description: 'أرقام فقط مع حدٍّ أدنى وأعلى وخطوة',
    icon: Hash,
    group: 'text',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { min: null, max: null, step: 1 },
  },
  {
    value: 'phone',
    label: 'رقم جوال',
    description: 'يتحقق من صيغة رقم الجوال السعودي',
    icon: Phone,
    group: 'text',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'email',
    label: 'بريد إلكتروني',
    description: 'يتحقق من صيغة البريد',
    icon: Mail,
    group: 'text',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'date',
    label: 'تاريخ',
    description: 'اختيار تاريخ فقط',
    icon: Calendar,
    group: 'datetime',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'time',
    label: 'وقت',
    description: 'اختيار وقت فقط',
    icon: Clock,
    group: 'datetime',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'datetime',
    label: 'تاريخ ووقت',
    description: 'اختيار تاريخ ووقت معاً',
    icon: CalendarClock,
    group: 'datetime',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'select',
    label: 'قائمة منسدلة',
    description: 'اختيار عنصر واحد من قائمة',
    icon: List,
    group: 'choice',
    hasOptions: true,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { options: [] },
  },
  {
    value: 'multi_select',
    label: 'قائمة متعددة',
    description: 'اختيار عدة عناصر من قائمة',
    icon: ListChecks,
    group: 'choice',
    hasOptions: true,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { options: [] },
  },
  {
    value: 'radio',
    label: 'أزرار اختيار',
    description: 'اختيار عنصر واحد عبر أزرار ظاهرة',
    icon: CircleDot,
    group: 'choice',
    hasOptions: true,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { options: [] },
  },
  {
    value: 'checkbox',
    label: 'خانة موافقة',
    description: 'خانة واحدة تُعلَّم أو تُترك — للإقرارات',
    icon: SquareCheck,
    group: 'choice',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'yesno',
    label: 'نعم / لا',
    description: 'سؤال بجوابين لا ثالث لهما',
    icon: ToggleLeft,
    group: 'choice',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'rating',
    label: 'تقييم بالنجوم',
    description: 'تقييم عددي من واحد إلى الحد الأعلى',
    icon: Star,
    group: 'choice',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: { max_rating: 5 },
  },
  {
    value: 'file',
    label: 'رفع ملف',
    description: 'مرفقات صور أو ملفات PDF',
    icon: Paperclip,
    group: 'attachment',
    hasOptions: false,
    isAttachment: true,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {
      allowed_types: ['jpg', 'jpeg', 'png', 'pdf'],
      max_files: 5,
      max_size_kb: 5120,
    },
  },
  {
    value: 'image',
    label: 'رفع صورة',
    description: 'صورة واحدة مع معاينة قبل الإرسال',
    icon: ImageIcon,
    group: 'attachment',
    hasOptions: false,
    isAttachment: true,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {
      allowed_types: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      max_files: 1,
      max_size_kb: 5120,
    },
  },
  {
    value: 'signature',
    label: 'توقيع رقمي',
    description: 'التقاط توقيع وليّ الأمر بالإصبع أو الفأرة',
    icon: Signature,
    group: 'attachment',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'section_break',
    label: 'فاصل قسم',
    description: 'عنوان يفصل مجموعة أسئلة عمّا بعدها، بلا إجابة',
    icon: SeparatorHorizontal,
    group: 'layout',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: false,
    paletteVisible: true,
    defaults: {},
  },
  {
    value: 'repeater',
    label: 'مجموعة مكرَّرة',
    description: 'مجموعة حقول تتكرر — غير مدعومة في واجهة وليّ الأمر بعد',
    icon: Repeat2,
    group: 'layout',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: false,
    defaults: {},
  },
  {
    value: 'matrix',
    label: 'جدول تقاطعي',
    description: 'صفوف وأعمدة تُملأ تقاطعاتها — غير مدعومة في واجهة وليّ الأمر بعد',
    icon: Grid3x3,
    group: 'layout',
    hasOptions: false,
    isAttachment: false,
    storesAnswer: true,
    paletteVisible: false,
    defaults: {},
  },
]

/** بحثٌ بالنوع بلا مسحٍ خطّيّ في كل رسمة */
export const FORM_FIELD_TYPE_MAP: Record<FormFieldType, FormFieldTypeMeta> = FORM_FIELD_TYPES.reduce(
  (map, meta) => {
    map[meta.value] = meta
    return map
  },
  {} as Record<FormFieldType, FormFieldTypeMeta>,
)

/** التسميات وحدها — لصفحة الردود ورأس السؤال حيث لا حاجة لبقية الوصف */
export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = FORM_FIELD_TYPES.reduce(
  (map, meta) => {
    map[meta.value] = meta.label
    return map
  },
  {} as Record<FormFieldType, string>,
)

/** ما يُعرض في لوحة المصمّم، مقسوماً على مجموعاته وبترتيبها */
export const FORM_FIELD_PALETTE: ReadonlyArray<{
  group: FormFieldGroup
  label: string
  types: FormFieldTypeMeta[]
}> = FORM_FIELD_GROUP_ORDER.map((group) => ({
  group,
  label: FORM_FIELD_GROUP_LABELS[group],
  types: FORM_FIELD_TYPES.filter((meta) => meta.group === group && meta.paletteVisible),
})).filter((section) => section.types.length > 0)

export function getFieldTypeMeta(type: FormFieldType): FormFieldTypeMeta | undefined {
  return FORM_FIELD_TYPE_MAP[type]
}

/**
 * نسخةٌ **طازجة** من افتراضات النوع. النسخ ضروريّ لا تجميليّ: لو أُعيد كائن
 * `defaults` نفسه لصار محرِّرُ الخيارات في المصمّم يعدّل الثابت المشترك، فتُسرَّب
 * خيارات حقلٍ إلى كلّ حقلٍ يُنشأ بعده.
 */
export function getFieldTypeDefaults(type: FormFieldType): FormFieldSettings {
  const defaults = FORM_FIELD_TYPE_MAP[type]?.defaults ?? {}

  return {
    ...defaults,
    ...(defaults.options ? { options: defaults.options.map((option) => ({ ...option })) } : {}),
    ...(defaults.allowed_types ? { allowed_types: [...defaults.allowed_types] } : {}),
  }
}

export function fieldTypeHasOptions(type: FormFieldType): boolean {
  return FORM_FIELD_TYPE_MAP[type]?.hasOptions ?? false
}

/** الأنواع التي ترفع ملفّات: `file` و`image` — وهما وحدهما من يملأ `files[...]` */
export function isAttachmentFieldType(type: FormFieldType): type is 'file' | 'image' {
  return FORM_FIELD_TYPE_MAP[type]?.isAttachment ?? false
}

/** يميّز السؤالَ من الزينة: ما لا يحمل إجابةً لا يُطلَب ولا يُحسب في عدّاد الأسئلة */
export function fieldTypeStoresAnswer(type: FormFieldType): boolean {
  return FORM_FIELD_TYPE_MAP[type]?.storesAnswer ?? true
}

/** سمة `accept` لمُدخل الملفّ، مبنيّةٌ من `allowed_types` لا من تخمين النوع */
export function buildFileAccept(type: FormFieldType, allowedTypes?: string[] | null): string {
  const extensions = allowedTypes?.length
    ? allowedTypes
    : (getFieldTypeDefaults(type).allowed_types ?? [])

  const list = extensions.map((extension) => `.${extension.replace(/^\./, '').toLowerCase()}`)

  // الصورة تقبل ما تلتقطه الكاميرا أيضاً، وامتدادُ الجوال قد يخرج عن القائمة
  return type === 'image' ? ['image/*', ...list].join(',') : list.join(',')
}

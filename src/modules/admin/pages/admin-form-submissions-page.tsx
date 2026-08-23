import cx from 'classnames'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  ImageIcon,
  Inbox,
  Lock,
  MessageCircle,
  Paperclip,
  Percent,
  Printer,
  RotateCcw,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsModal,
  WsPage,
  WsProgress,
  WsSpinner,
  WsTable,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'
import { useToast } from '@/shared/feedback/use-toast'
import {
  useAdminForm,
  useAdminFormSubmission,
  useAdminFormSubmissions,
  useDeleteAdminSubmissionMutation,
  useReviewAdminSubmissionMutation,
} from '@/modules/forms/hooks'
import { fetchAdminFormSubmission, fetchAdminFormSubmissions } from '@/modules/forms/api'
import { FORM_SUBMISSION_STATUS_LABELS, isAttachmentFieldType } from '@/modules/forms/constants'
import type {
  FormFieldSettings,
  FormFieldType,
  FormSubmission,
  FormSubmissionAnswer,
  FormSubmissionFile,
  FormSummary,
} from '@/modules/forms/types'
import type { StudentRecord } from '@/modules/admin/types'
import { useStudentsQuery } from '@/modules/admin/hooks'

const DEFAULT_PAGE_SIZE = 20
const MAX_FETCH_PAGE_SIZE = 100

const STATUS_ORDER: FormSubmission['status'][] = ['submitted', 'reviewed', 'approved', 'rejected', 'draft']

const REVIEWABLE_STATUSES: Array<
  Extract<FormSubmission['status'], 'approved' | 'rejected' | 'reviewed' | 'returned'>
> = [
  'approved',
  'rejected',
  'reviewed',
  // الإعادةُ ليست رفضاً: تفتح النموذجَ لوليّ الأمر محمَّلاً بإجاباته ومعه سببُ
  // الإعادة، فيصحّح ما نُبّه إليه وحده
  'returned',
]

type StatusFilter = FormSubmission['status'] | 'all'

const STATUS_FILTERS: StatusFilter[] = ['all', ...STATUS_ORDER]

/** الرمادي (بلا tone) للمسودّة عمداً: حالةٌ محايدة لا تستدعي انتباهاً */
const SUBMISSION_STATUS_TONE: Record<FormSubmission['status'], WsChipTone | undefined> = {
  approved: 'green',
  reviewed: 'sky',
  rejected: 'red',
  submitted: 'amber',
  // المُعاد سماويٌّ لا أحمر: الكرةُ في ملعب وليّ الأمر لا في ملعب الإدارة،
  // فهو حالةُ انتظارٍ لا حالةُ رفض
  returned: 'sky',
  draft: undefined,
}

const FORM_STATUS_LABELS: Record<FormSummary['status'], string> = {
  draft: 'مسودة',
  published: 'منشور',
  archived: 'مؤرشف',
}

const FORM_STATUS_TONE: Record<FormSummary['status'], WsChipTone | undefined> = {
  draft: undefined,
  published: 'green',
  archived: 'amber',
}

/** كلُّ الردود بلا صفحات — قاعدةُ الإحصائيات وحدها، لا مصدر الجدول المُصفَّى */
type AggregateState = {
  loading: boolean
  data: FormSubmission[]
}

interface FormFieldWithSection {
  id: number
  field_key: string
  /** مفتاحُ السمة إن كان الحقل مربوطاً بملفّ الطالب — تعرف منه الطباعةُ الصورةَ الشخصية */
  maps_to?: string | null
  type: FormFieldType
  label: string
  sectionTitle: string | null
  sort_order: number
  settings?: FormFieldSettings
}

const nf = (value: number): string => value.toLocaleString('ar-SA-u-nu-latn')

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
  }
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['بايت', 'ك.ب', 'م.ب']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

/**
 * تسطيح قيمة `value_json` إلى نصٍّ صالحٍ للعرض والتصدير والطباعة.
 *
 * إجابةُ حقل المرفق تُخزَّن مصفوفةَ كائنات `{id, filename, path}`
 * (FormPublicController::storeAnswers)، وإجابةُ المصفوفة والمكرِّر كائناتٍ كذلك —
 * و`String(كائن)` عليها يطبع `[object Object]`. كان ذلك يقع في أربعة مواضع
 * (التصدير والطباعة ودرج التفاصيل والمُنسِّق)، فجُعل التسطيح هنا وحده كي يرثه
 * الأربعة صحيحاً بدل أن يُرقَّع كلٌّ منها على حدة فينشقّ.
 */
function stringifyJsonValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyJsonValue(item))
      .filter((part) => part.length > 0)
      .join('، ')
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    // اسمُ الملفّ هو كلُّ ما يعني الأدمن من كائن المرفق؛ وما دونه (id/path) ضجيجٌ داخلي
    if (typeof record.filename === 'string' && record.filename.length > 0) {
      return record.filename
    }
    return Object.entries(record)
      .map(([key, item]) => {
        const part = stringifyJsonValue(item)
        return part.length > 0 ? `${key}: ${part}` : ''
      })
      .filter((part) => part.length > 0)
      .join(' · ')
  }

  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا'
  }

  return String(value)
}

/** ما يُعرض مكان قيمةٍ لم يرسلها الخادم أصلاً. */
export const REDACTED_LABEL = 'محجوب'

function resolveSubmissionAnswerValue(answer?: FormSubmissionAnswer | null): string {
  if (!answer) {
    return '—'
  }

  /*
   * الإجابةُ المحجوبة تصل بكل حقول `value_*` فارغةً من الخادم — لا نُخفي هنا
   * قيمةً موجودة، بل نرسم مكانَ ما لم يصل. ولولا هذا الشرط لعُرضت «—» فيظنّها
   * القارئُ سؤالاً لم يُجَب.
   */
  if (answer.is_redacted) {
    return REDACTED_LABEL
  }

  /*
   * `value_json` يسبق `value_text` عمداً: حين يكتب الباك الأوّل يكون الثاني مجرّد
   * `json_encode` له (FormPublicController::buildAnswerPayload)، فقراءةُ النصّ أوّلاً
   * كانت تعرض على الأدمن `["أ","ب"]` خاماً بدل «أ، ب».
   */
  if (answer.value_json !== null && answer.value_json !== undefined && typeof answer.value_json === 'object') {
    const flattened = stringifyJsonValue(answer.value_json)
    if (flattened.length > 0) {
      return flattened
    }
  }

  if (answer.value_text !== null && answer.value_text !== undefined) {
    return String(answer.value_text)
  }

  if (answer.value_number !== null && answer.value_number !== undefined) {
    return String(answer.value_number)
  }

  if (answer.value_datetime !== null && answer.value_datetime !== undefined) {
    return formatDateTime(answer.value_datetime)
  }

  if (answer.value_date !== null && answer.value_date !== undefined) {
    return answer.value_date
  }

  if (answer.value_boolean !== null && answer.value_boolean !== undefined) {
    return answer.value_boolean ? 'نعم' : 'لا'
  }

  if (answer.value_json !== null && answer.value_json !== undefined) {
    return stringifyJsonValue(answer.value_json) || '—'
  }

  return '—'
}

function mapFormFields(form?: FormSummary | null): FormFieldWithSection[] {
  if (!form) return []

  const sections = form.sections ?? []
  const standalone = form.fields ?? []

  const sectionFields = sections.flatMap((section) =>
    (section.fields ?? []).map<FormFieldWithSection>((field) => ({
      id: field.id,
      field_key: field.field_key,
      maps_to: field.maps_to ?? null,
      type: field.type,
      label: field.label,
      sectionTitle: section.title ?? null,
      sort_order: field.sort_order ?? 0,
      settings: field.settings,
    })),
  )

  const standaloneFields = standalone.map<FormFieldWithSection>((field) => ({
    id: field.id,
    field_key: field.field_key,
    maps_to: field.maps_to ?? null,
    type: field.type,
    label: field.label,
    sectionTitle: null,
    sort_order: field.sort_order ?? 0,
    settings: field.settings,
  }))

  return [...sectionFields, ...standaloneFields].sort((a, b) => a.sort_order - b.sort_order)
}

function buildFieldMap(definitions: FormFieldWithSection[]): Map<number, FormFieldWithSection> {
  const map = new Map<number, FormFieldWithSection>()
  definitions.forEach((definition) => {
    map.set(definition.id, definition)
  })
  return map
}

function fieldLabelOf(field: FormFieldWithSection): string {
  return field.sectionTitle ? `${field.sectionTitle} — ${field.label}` : field.label
}

/**
 * قيمة الإجابة معروضةً في سياق حقلها.
 *
 * التقييم وحده يحتاج سياقاً اليوم: «٣» مجرَّدةً لا تقول شيئاً حتى يُذكر سقفها،
 * والسقف في `settings.max_rating` بافتراض خمس. وتمرُّ من هنا المواضعُ الثلاثة
 * (التصدير والطباعة والدرج) كي لا يختلف رقمُ الملفّ عن رقم الشاشة.
 */
function formatAnswerForField(field: FormFieldWithSection, answer?: FormSubmissionAnswer | null): string {
  if (answer?.is_redacted) {
    return REDACTED_LABEL
  }

  /*
   * البوليانيّ يُقرأ بنوع حقله لا بترتيب الأعمدة.
   *
   * `resolveSubmissionAnswerValue` تبدأ بـ`value_json` ثمّ `value_text`، ولا تصل
   * إلى `value_boolean` أبداً حين يكون النصّ مملوءاً. وكان الخادم يكتب فيه
   * `"true"/"false"` — فتقرأ الإدارةُ «false» تحت سؤالٍ عربيّ. أُصلح التخزين،
   * ويبقى في الإنتاج صفوفٌ قديمةٌ بالحرفَين الإنجليزيَّين وأخرى بـ`["1"]` من يوم
   * كان `checkbox` مصنَّفاً متعدّدَ الاختيار — فنقرأها كلَّها هنا صحيحةً.
   */
  if (field.type === 'yesno' || field.type === 'checkbox') {
    const decided = decideBoolean(answer)
    if (decided !== null) {
      return field.type === 'checkbox' ? (decided ? 'موافق' : 'غير موافق') : decided ? 'نعم' : 'لا'
    }
    return '—'
  }

  const value = resolveSubmissionAnswerValue(answer)

  if (field.type === 'rating' && value !== '—') {
    return `${value} / ${field.settings?.max_rating ?? 5}`
  }

  return value
}

/** يستخرج البوليانيّ من أيٍّ من صيغ التخزين الثلاث — الحاليةِ والقديمتَين. */
function decideBoolean(answer?: FormSubmissionAnswer | null): boolean | null {
  if (!answer) return null

  if (typeof answer.value_boolean === 'boolean') {
    return answer.value_boolean
  }

  // `checkbox` القديم: `["1"]` أو `["0"]`
  if (Array.isArray(answer.value_json) && answer.value_json.length > 0) {
    const first = String(answer.value_json[0]).trim().toLowerCase()
    return first === '1' || first === 'true' || first === 'نعم'
  }

  if (typeof answer.value_text === 'string' && answer.value_text.trim() !== '') {
    const text = answer.value_text.trim().toLowerCase()
    if (['true', '1', 'نعم', 'موافق', '["1"]'].includes(text)) return true
    if (['false', '0', 'لا', 'غير موافق', '["0"]'].includes(text)) return false
  }

  return null
}

/**
 * يُسقط أعمدةَ الحقول المحجوبة إسقاطاً — لا يطمسها.
 *
 * عمودٌ اسمه «الأمراض المزمنة» مملوءٌ بـ«محجوب» في ملفٍّ يُرسَل بالبريد أسوأ من
 * غيابه: هو يُعلن أنّ لهذا الطالب أمراضاً وإن لم يقل ما هي. أمّا على الشاشة
 * فالطمسُ صحيح، لأن غيابَ السطر يدفع القارئ للسؤال عمّا غاب.
 *
 * والحجبُ على مستوى الدور لا الطالب: إجابةٌ واحدةٌ محجوبةٌ في هذا الحقل تعني
 * أنّ صاحبَ الطلب لا يرى هذا الحقل عند أحد.
 */
function withoutRedactedColumns(
  fieldDefinitions: FormFieldWithSection[],
  submissions: FormSubmission[],
): FormFieldWithSection[] {
  const redactedFieldIds = new Set<number>()

  for (const submission of submissions) {
    for (const answer of submission.answers ?? []) {
      if (answer.is_redacted) {
        redactedFieldIds.add(answer.field_id)
      }
    }
  }

  if (redactedFieldIds.size === 0) {
    return fieldDefinitions
  }

  return fieldDefinitions.filter((field) => !redactedFieldIds.has(field.id))
}

function sanitizeForExcel(value: string): string {
  return value.replace(/\t|\r?\n/g, ' ').trim()
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildExcelWorkbook(
  submissions: FormSubmission[],
  form: FormSummary,
  allFieldDefinitions: FormFieldWithSection[],
): void {
  if (!submissions.length) {
    return
  }

  // الفلترةُ هنا لا عند الاستدعاء: التصديرُ بابٌ يخرج منه كل شيء دفعةً واحدة،
  // ووضعُ الحارس داخله يجعله يمرّ على كل من يستدعيه
  const fieldDefinitions = withoutRedactedColumns(allFieldDefinitions, submissions)

  const headers = [
    '#',
    'اسم الطالب',
    'الصف',
    'الفصل',
    'ولي الأمر',
    'هاتف ولي الأمر',
    'الحالة',
    'تاريخ الإرسال',
    ...fieldDefinitions.map((field) => fieldLabelOf(field)),
  ]

  const tbody = submissions
    .map((submission, index) => {
      const answers = fieldDefinitions.map((field) => {
        const answer = submission.answers?.find((item) => item.field_id === field.id)
        return escapeHtml(sanitizeForExcel(formatAnswerForField(field, answer)))
      })

      const studentName = submission.student?.name ?? '—'
      const grade = submission.student?.grade ?? '—'
      const className = submission.student?.class_name ?? '—'
      const guardianName = submission.guardian_name ?? submission.student?.parent_name ?? '—'
      const guardianPhone = submission.guardian_phone ?? submission.student?.parent_phone ?? '—'
      const statusLabel = FORM_SUBMISSION_STATUS_LABELS[submission.status]
      const submittedAt = formatDateTime(submission.submitted_at)

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(studentName)}</td>
          <td>${escapeHtml(grade)}</td>
          <td>${escapeHtml(className)}</td>
          <td>${escapeHtml(guardianName)}</td>
          <td>${escapeHtml(guardianPhone)}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>${escapeHtml(submittedAt)}</td>
          ${answers.map((value) => `<td>${value}</td>`).join('')}
        </tr>
      `
    })
    .join('')

  const tableHtml = `
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(form.title)} - الردود</title>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </body>
    </html>
  `

  // U+FEFF علامةُ ترتيب البايتات: بدونها يقرأ إكسل الملفَّ بترميز النظام
  // فتصير العربية طلاسم. وتُكتب هروباً لا حرفاً منظوراً — الحرفُ المنظور مسافةٌ
  // شاذّة لا تُرى في المحرّر ويرفضها `no-irregular-whitespace`.
  const blob = new Blob([`\uFEFF${tableHtml}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${form.title.replace(/\s+/g, '-')}-responses.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * لوحةُ ألوان الأقسام — منقولةٌ من النموذج الورقيّ نفسه.
 *
 * اللونُ يُشتقّ من قسم المعجم الذي تنتمي إليه حقولُ القسم (`maps_to`)، فقسمٌ
 * حقولُه صحّيةٌ يخرج أخضرَ كما في الورقة تماماً. والنماذجُ التي لا تلمس المعجم
 * تأخذ لوناً محايداً بالدور — فتبقى الورقةُ مقسَّمةً بصريّاً ولو لم تكن بطاقةَ
 * معلومات.
 */
const PRINT_SECTION_TONES: Record<string, { head: string; body: string }> = {
  profile: { head: '#C5DCE8', body: '#EDF5F9' },
  social: { head: '#E8C8CE', body: '#FAF0F2' },
  financial: { head: '#F5E7B8', body: '#FDF9EC' },
  health: { head: '#CFE5C3', body: '#F1F8ED' },
  military: { head: '#DCDCDC', body: '#F5F5F5' },
}

const PRINT_NEUTRAL_TONES = [
  { head: '#C5DCE8', body: '#EDF5F9' },
  { head: '#E8C8CE', body: '#FAF0F2' },
  { head: '#F5E7B8', body: '#FDF9EC' },
  { head: '#CFE5C3', body: '#F1F8ED' },
  { head: '#DCDCDC', body: '#F5F5F5' },
]

/** القسمُ الغالبُ على حقولٍ ما — أكثرُ أقسام المعجم تكراراً بينها. */
function dominantDictionarySection(fields: FormFieldWithSection[]): string | null {
  const tally = new Map<string, number>()

  fields.forEach((field) => {
    const section = field.maps_to?.split('.')[0]
    if (section) tally.set(section, (tally.get(section) ?? 0) + 1)
  })

  if (tally.size === 0) return null

  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * ورقةُ الردّ للطباعة — بمرآةِ النموذج الورقيّ لا بتصميمٍ جديد.
 *
 * الورقةُ التي تُحفظ في ملفّ الطالب لها شكلٌ يعرفه الموجّه: جدولٌ متلاصقٌ
 * بأقسامٍ ملوَّنة، كلُّ صفٍّ فيه تسميتان وقيمتاهما، والطويلُ يمتدّ عرض الصفحة.
 * والبطاقاتُ المتباعدة — وإن بدت أنظف على الشاشة — تُخرج ثلاثَ صفحاتٍ حيث
 * تكفي واحدة، وتُفقد الورقةَ طابعَها الرسميّ الذي يعرفه من يحفظها في ملفّ.
 */
/** سببُ التعطيل — نصٌّ واحدٌ يُقرأ في كل زرٍّ محجوب. */
const CONFIDENTIAL_HINT = 'نموذجٌ سرّي — لا يقرأ ردودَه ولا يصدّرها إلا الموجّه الطلابي'

function buildPrintableMarkup(
  submission: FormSubmission,
  form: FormSummary,
  allFieldDefinitions: FormFieldWithSection[],
): string {
  // الورقةُ المطبوعة تُنسى على طاولة، فحكمُها حكمُ الملفّ المصدَّر: يُسقط المحجوب
  // ولا يُذكر أنه كان
  const fieldDefinitions = withoutRedactedColumns(allFieldDefinitions, [submission])

  /*
   * الصورةُ الشخصية ترتفع إلى الترويسة ولا تبقى صفّاً باسم ملفّ.
   *
   * والتعرّفُ عليها لا يكتفي بـ`maps_to`: نماذجُ المدارس المبنيّةُ يدوياً لا
   * تربط حقولَها بالمعجم أصلاً — فحقلُ «الصورة الشخصية» في نموذجٍ حقيقيّ فحصناه
   * بلا `maps_to` — ولو اكتفينا به لهبطت صورةُ الطالب صفحةً مستقلّةً بين
   * المرفقات بدل أن تُعرّف بصاحب الورقة في صدرها.
   *
   * فنسقط إلى التسمية: هي ما يكتبه بانٍ النموذج، وهي ثابتةٌ عملياً في هذا السؤال.
   */
  const isPersonalPhotoField = (field?: FormFieldWithSection | null): boolean => {
    if (!field) return false
    if (field.maps_to === 'profile.photo') return true
    const label = field.label ?? ''
    return /الصورة\s*الشخصي|صورة\s*شخصي|صورة\s*الطالب/.test(label)
  }

  const photoFile = submission.files?.find((file) => {
    if (!file.is_image || !file.url) return false
    return isPersonalPhotoField(allFieldDefinitions.find((item) => item.id === file.field_id))
  })

  const printableFields = fieldDefinitions.filter((field) => field.id !== photoFile?.field_id)

  // التوقيعُ الرقميّ يُرسم صورةً في موضع التوقيع لا نصّاً في خليّة جدول
  const signatureField = printableFields.find((field) => field.type === 'signature')
  const signatureAnswer = signatureField
    ? submission.answers?.find((item) => item.field_id === signatureField.id)
    : undefined
  const signatureData =
    typeof signatureAnswer?.value_text === 'string' && signatureAnswer.value_text.startsWith('data:')
      ? signatureAnswer.value_text
      : null

  /*
   * المرفقاتُ تُنزع من الجدول وتُطبع صفحاتٍ بعده.
   *
   * صفٌّ مكتوبٌ فيه «صك-البيت.jpg» لا يقول شيئاً لمن يقرأ الورقة — الصورةُ هي
   * الجواب لا اسمُ ملفّها. فيُحذف الصفُّ من الجدول، وتُفرَد لكلّ مرفقٍ صفحةٌ
   * عنوانُها السؤالُ نفسُه.
   *
   * والصورةُ الشخصية مستثناة: موضعُها الترويسةُ حيث تُعرّف بصاحب الورقة.
   */
  const attachmentPages = (submission.files ?? [])
    .filter((file) => file.url && file.field_id !== photoFile?.field_id)
    .map((file) => ({
      file,
      field: allFieldDefinitions.find((item) => item.id === file.field_id) ?? null,
    }))
    // المحجوبُ لا يُطبع: المصفاةُ أسقطت حقلَه من `fieldDefinitions`، والمرفقُ
    // يتبع حقلَه — وإلّا طُمس النصُّ وسُلّم المرفقُ كاملاً في الورقة نفسها
    .filter((entry) => entry.field !== null && fieldDefinitions.some((f) => f.id === entry.field?.id))

  const attachmentFieldIds = new Set(
    printableFields.filter((field) => isAttachmentFieldType(field.type)).map((field) => field.id),
  )

  const bodyFields = printableFields.filter(
    (field) => field.id !== signatureField?.id && !attachmentFieldIds.has(field.id),
  )

  /*
   * تقسيمُ الورقة يقرأ مصدرَين لا واحداً.
   *
   * النموذجُ قد يُقسَّم بأقسامٍ حقيقية (`form_sections`) وقد يُقسَّم بحقولٍ من نوع
   * `section_break` — وهو ما تفعله أغلبُ المدارس، لأنّ المصمّمَ يعرض «فاصل قسم»
   * في لوحته ولا يعرض الأقسامَ الحقيقية أصلاً. وكانت الطباعةُ تقرأ الأول وحده،
   * فتجمع نموذجاً كاملاً تحت عنوانٍ واحدٍ اسمه «الإجابات» وتطبع الفواصلَ صفوفاً
   * فارغةً بين الأسئلة.
   *
   * فالفاصلُ هنا يفتح قسماً بعنوانه، وما بعده ينتمي إليه حتى الفاصل التالي.
   */
  type PrintSection = { title: string; fields: FormFieldWithSection[] }

  const sections: PrintSection[] = []

  const sectionFor = (title: string): PrintSection => {
    const last = sections[sections.length - 1]
    if (last && last.title === title) return last
    const created: PrintSection = { title, fields: [] }
    sections.push(created)
    return created
  }

  let breakTitle: string | null = null

  bodyFields.forEach((field) => {
    if (field.type === 'section_break') {
      // الفاصلُ عنوانٌ لا سؤال: يفتح قسماً ولا يشغل صفّاً
      breakTitle = field.label?.trim() || null
      if (breakTitle) sectionFor(breakTitle)
      return
    }

    // القسمُ الحقيقيّ يسبق الفاصل: هو بنيةٌ في القاعدة لا مجرّد عنوانٍ مكتوب
    sectionFor(field.sectionTitle?.trim() || breakTitle || 'الإجابات').fields.push(field)
  })

  const sectionsHtml = sections
    .filter((section) => section.fields.length > 0)
    .map((section, index) => {
      const dictionarySection = dominantDictionarySection(section.fields)
      const tone =
        (dictionarySection ? PRINT_SECTION_TONES[dictionarySection] : undefined) ??
        PRINT_NEUTRAL_TONES[index % PRINT_NEUTRAL_TONES.length]

      /*
       * سؤالان في الصفّ كما في الورقة، والطويلُ يبتلع الصفَّ كلَّه.
       * `pending` يحمل الخليّةَ الفردية حتى تجد قرينتَها — وإن لم تجدها خُتم
       * الصفُّ بخليّتَين فارغتَين، فلا تنكسر الشبكة.
       */
      const rows: string[] = []
      let pending: string | null = null

      const flushPending = () => {
        if (pending) {
          rows.push('<tr>' + pending + '<td class="k"></td><td class="v"></td></tr>')
          pending = null
        }
      }

      section.fields.forEach((field) => {
        const answer = submission.answers?.find((item) => item.field_id === field.id)
        const value = formatAnswerForField(field, answer)
        const isLong =
          value.length > 40 || field.type === 'textarea' || field.type === 'multi_select'
        const label = escapeHtml(field.label)
        const safeValue = escapeHtml(value)

        if (isLong) {
          flushPending()
          rows.push(
            '<tr><td class="k">' + label + '</td><td class="v" colspan="3">' + safeValue + '</td></tr>',
          )
          return
        }

        const cell = '<td class="k">' + label + '</td><td class="v">' + safeValue + '</td>'

        if (pending) {
          rows.push('<tr>' + pending + cell + '</tr>')
          pending = null
        } else {
          pending = cell
        }
      })

      flushPending()

      return (
        '<table class="sec" style="--head:' + tone.head + ';--body:' + tone.body + '">' +
        '<thead><tr><th colspan="4">' + escapeHtml(section.title) + '</th></tr></thead>' +
        '<tbody>' + rows.join('') + '</tbody>' +
        '</table>'
      )
    })
    .join('')
  /*
   * صفحةٌ لكلّ مرفق: عنوانُ السؤال في أعلاها ثمّ الصورة.
   *
   * `page-break-before: always` يفتح صفحةً جديدة، و`max-height: 235mm` يضمن أنّ
   * الصورةَ الطويلةَ تنكمش لتسع الصفحةَ بعد ترويستها بدل أن تُقصّ عند حافّتها.
   *
   * وما ليس صورةً (PDF مثلاً) لا يُطبع صفحةً فارغة: يُذكر في ذيل الورقة الأولى
   * أنّ للسؤال مرفقاً يُفتح من النظام — فيعرف القارئُ بوجوده ولا يظنّ السؤالَ
   * بلا جواب.
   */
  const imagePages = attachmentPages.filter((entry) => entry.file.is_image)
  const otherAttachments = attachmentPages.filter((entry) => !entry.file.is_image)

  const attachmentsHtml = imagePages
    .map(
      (entry) =>
        '<section class="attach">' +
        '<div class="attach__q">' + escapeHtml(entry.field?.label ?? 'مرفق') + '</div>' +
        '<img src="' + escapeHtml(entry.file.url ?? '') + '" alt="" />' +
        '<div class="attach__f">' + escapeHtml(entry.file.filename ?? '') + '</div>' +
        '</section>',
    )
    .join('')

  const otherAttachmentsHtml = otherAttachments.length
    ? '<div class="attach-note"><strong>مرفقاتٌ غير قابلة للطباعة:</strong> ' +
      otherAttachments
        .map((entry) => escapeHtml((entry.field?.label ?? 'مرفق') + ' — ' + (entry.file.filename ?? '')))
        .join(' · ') +
      ' (تُفتح من النظام)</div>'
    : ''

  const student = submission.student
  const photoHtml = photoFile?.url
    ? '<img class="head__photo" src="' + escapeHtml(photoFile.url) + '" alt="" />'
    : ''
  const spacerHtml = photoFile?.url ? '<div class="head__spacer"></div>' : ''
  const signatureHtml = signatureData
    ? '<img src="' + escapeHtml(signatureData) + '" alt="" />'
    : ''
  const nationalIdHtml = student?.national_id
    ? ' · هوية ' + escapeHtml(student.national_id)
    : ''

  return `
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(form.title)} — ${escapeHtml(student?.name ?? '')}</title>
        <style>
          @page { size: A4; margin: 10mm 9mm; }

          * { box-sizing: border-box; }

          body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            margin: 0;
            color: #111827;
            font-size: 11px;
            line-height: 1.55;
          }

          /* ── الترويسة ── */
          .head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
          .head__photo {
            width: 74px; height: 92px; object-fit: cover;
            border: 1px solid #9ca3af; border-radius: 3px;
            flex-shrink: 0; background: #f3f4f6;
          }
          .head__mid { flex: 1; text-align: center; }
          .head__mid h1 { margin: 0; font-size: 17px; font-weight: 800; }
          .head__mid .who { margin-top: 3px; font-size: 13px; font-weight: 700; }
          .head__mid .sub { font-size: 10.5px; color: #4b5563; }
          /* موازنةٌ بصرية: بلا هذا ينزاح العنوانُ عن مركز الورقة حين توجد صورة */
          .head__spacer { width: 74px; flex-shrink: 0; }

          .confidential {
            border: 1px solid #dc2626;
            background: #fef2f2;
            color: #b91c1c;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 3px;
            margin-bottom: 8px;
            text-align: center;
          }

          /* ── جداول الأقسام ── */
          table.sec {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            /*
             * «fixed» لا «auto»: بلا هذا يوزّع المحرّكُ الأعمدةَ على أطول محتوى،
             * فصفٌّ فيه colspan يزحزح أعمدةَ الجدول كلِّه ويمطّ ارتفاعاتِ ما
             * حوله. والعرضُ المعلَن على الخليّة أدناه لا يُحترم إلا معه.
             */
            table-layout: fixed;
            break-inside: avoid;
          }
          table.sec th {
            background: var(--head);
            border: 1px solid #9ca3af;
            padding: 3px 8px;
            text-align: right;
            font-size: 11.5px;
            font-weight: 800;
          }
          table.sec td {
            border: 1px solid #b6bcc4;
            padding: 3px 7px;
            vertical-align: top;
            /* لا يرتفع الصفُّ عن سطرِه إلا بمحتوىً حقيقيّ */
            height: auto;
          }
          /*
           * التسميةُ ربعُ العرض والقيمةُ ما بقي. و«nowrap» مرفوضٌ هنا: تسميةٌ
           * طويلة («ما الذي يجب فعله عند حدوث نوبة؟») كانت تفرض عرضاً يزيح
           * العمودَ المقابل ويمطّ الصفّ. تُلفّ التسميةُ في سطرَين ولا تُشوّه الشبكة.
           */
          td.k {
            background: var(--body);
            font-weight: 700;
            font-size: 10.5px;
            width: 25%;
            word-break: break-word;
          }
          td.v { width: 25%; word-break: break-word; white-space: pre-line; }
          /* القيمةُ الممتدّة تأخذ ثلاثةَ أرباع الصفّ */
          td.v[colspan="3"] { width: 75%; }

          /* ── الإقرار والتوقيع ── */
          .consent {
            border: 1px solid #6b7280;
            padding: 7px 10px;
            font-size: 10.5px;
            line-height: 1.75;
            margin-top: 8px;
            break-inside: avoid;
          }
          .sign {
            display: flex;
            gap: 22px;
            align-items: flex-end;
            margin-top: 10px;
            break-inside: avoid;
          }
          .sign > div { flex: 1; font-size: 10.5px; color: #374151; text-align: center; }
          .sign .line { margin-top: 22px; border-bottom: 1px solid #6b7280; }
          .sign img { max-height: 46px; max-width: 100%; display: block; margin: 0 auto 2px; }

          .foot {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6b7280;
            border-top: 1px solid #d1d5db;
            padding-top: 3px;
          }

          /* ── صفحاتُ المرفقات ── */
          .attach-note {
            margin-top: 8px;
            border: 1px dashed #9ca3af;
            background: #f9fafb;
            padding: 5px 9px;
            font-size: 10px;
            color: #374151;
            border-radius: 3px;
          }
          .attach {
            page-break-before: always;
            break-before: page;
            text-align: center;
          }
          .attach__q {
            font-size: 13px;
            font-weight: 800;
            border: 1px solid #9ca3af;
            background: #EDF5F9;
            padding: 5px 10px;
            margin-bottom: 8px;
            text-align: right;
          }
          .attach img {
            max-width: 100%;
            /* ارتفاعُ A4 ناقصَ الهوامشِ والترويسة — فتنكمش الصورةُ الطويلةُ
               لتسع الصفحةَ بدل أن تُقصّ عند حافّتها */
            max-height: 235mm;
            object-fit: contain;
            border: 1px solid #d1d5db;
          }
          .attach__f {
            margin-top: 4px;
            font-size: 9px;
            color: #6b7280;
          }

          /* الطابعاتُ تُسقط ألوانَ الخلفية افتراضياً، وبإسقاطها تضيع أقسامُ الورقة */
          @media print {
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <header class="head">
          ${photoHtml}
          <div class="head__mid">
            <h1>${escapeHtml(form.title)}</h1>
            <div class="who">${escapeHtml(student?.name ?? '—')}</div>
            <div class="sub">
              ${escapeHtml(student?.grade ?? '—')} · ${escapeHtml(student?.class_name ?? '—')}${nationalIdHtml}
            </div>
          </div>
          ${spacerHtml}
        </header>

        <div class="confidential">
          المعلومات المدوَّنة في هذا النموذج تُحاط بالسرّية التامة حفاظاً على خصوصية الطالب وأسرته
        </div>

        ${sectionsHtml}

        <div class="consent">
          <strong>إقرار ولي الأمر:</strong>
          أقرّ أنا ولي أمر الطالب المذكور أعلاه بأن المعلومات المدوَّنة صحيحة، وأتحمّل أي معلومات
          غير مكتملة أو ناقصة، وأفوّض إدارة المدرسة في تقديم الإسعافات الضرورية داخل المدرسة أو
          خارجها واتخاذ الإجراءات اللازمة عند حدوث أي طارئ لابني، ونقله إلى المستشفى إذا دعت
          الحاجة إلى ذلك.
        </div>

        <div class="sign">
          <div>
            ${signatureHtml}
            <div class="line"></div>
            توقيع ولي الأمر
          </div>
          <div><div class="line"></div>التاريخ</div>
          <div><div class="line"></div>الموجّه الطلابي</div>
        </div>

        ${otherAttachmentsHtml}

        <div class="foot">
          <span>رد رقم ${submission.id.toString()} · ${escapeHtml(FORM_SUBMISSION_STATUS_LABELS[submission.status])}</span>
          <span>أُرسل: ${escapeHtml(formatDateTime(submission.submitted_at))}</span>
        </div>

        ${attachmentsHtml}
      </body>
    </html>
  `
}

interface AudienceResolution {
  /** الطلاب الذين يبلغهم النموذج فعلاً وفق منطق الباك نفسه */
  students: StudentRecord[]
  /** لا يبلغ أحداً: جمهوره ليس «جميع الطلاب» ولا فيه إسنادٌ واحدٌ قابلٌ للمطابقة */
  unreachable: boolean
}

/**
 * مَن يبلغهم النموذج — بمرآةِ `FormPublicController::applyAudienceFilter` حرفياً.
 *
 * كان الفراغ يُقرأ «كلُّ الطلاب»، وهي قراءةٌ مقلوبة: الباك يُظهر النموذج للطالب
 * إن كان `forms.target_audience = all_students` **أو** طابقه إسنادٌ ما. فنموذجٌ
 * جمهوره «صف» بلا إسنادٍ واحد لا يراه أحد، وكانت الصفحة تسرد له كلَّ طلّاب
 * المدرسة «غير مستجيبين» وتحسب نسبة استجابةٍ على قاعدةٍ كاذبة، فيطارد المرشدُ
 * أولياءَ أمورٍ لم يصلهم شيءٌ أصلاً.
 *
 * ولذلك أيضاً لا يُقرأ `metadata.student_ids` إلا في نطاق `group` وحده: نطاق
 * `student` يطابقه الباك بعمود `student_id` لا بالبيانات الملحقة.
 */
function resolveTargetedStudents(form: FormSummary | undefined, students: StudentRecord[]): AudienceResolution {
  if (!form) {
    return { students: [], unreachable: false }
  }

  const assignments = form.assignments ?? []

  if (form.target_audience === 'all_students' || assignments.some((item) => item.scope === 'all_students')) {
    return { students, unreachable: false }
  }

  /*
   * الحكم على «بلا مستهدَفين» من شكل الإسنادات لا من نتيجتها: قائمةُ الطلاب قد
   * تكون لم تصل بعد، فالنتيجة الفارغة حينها ليست دليل فساد.
   */
  const hasReachableAssignment = assignments.some((assignment) => {
    switch (assignment.scope) {
      case 'grade':
        return Boolean(assignment.grade)
      case 'class':
        // الباك يطابق الصفَّ واسمَ الفصل بشرطين معاً — فأحدهما وحده إسنادٌ ميّت
        return Boolean(assignment.grade && assignment.class_name)
      case 'student':
        return Boolean(assignment.student_id)
      case 'group':
        return (assignment.metadata?.student_ids?.length ?? 0) > 0
      default:
        return false
    }
  })

  if (!hasReachableAssignment) {
    return { students: [], unreachable: true }
  }

  const selected = new Map<number, StudentRecord>()

  const includeByPredicate = (predicate: (student: StudentRecord) => boolean) => {
    students.forEach((student) => {
      if (predicate(student)) {
        selected.set(student.id, student)
      }
    })
  }

  const includeById = (id: number) => {
    const student = students.find((item) => item.id === id)
    if (student) {
      selected.set(student.id, student)
    }
  }

  assignments.forEach((assignment) => {
    switch (assignment.scope) {
      case 'grade':
        if (assignment.grade) {
          includeByPredicate((student) => student.grade === assignment.grade)
        }
        break
      case 'class':
        if (assignment.grade && assignment.class_name) {
          includeByPredicate(
            (student) => student.grade === assignment.grade && student.class_name === assignment.class_name,
          )
        }
        break
      case 'student':
        if (assignment.student_id) {
          includeById(assignment.student_id)
        }
        break
      case 'group': {
        const groupIds = assignment.metadata?.student_ids ?? []
        groupIds.forEach((id) => {
          const numericId = Number(id)
          if (Number.isFinite(numericId)) {
            includeById(numericId)
          }
        })
        break
      }
      default:
        break
    }
  })

  return { students: Array.from(selected.values()), unreachable: false }
}

export function AdminFormSubmissionsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const toastRef = useRef(toast)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const formId = Number(params.formId)
  const invalidFormId = !Number.isFinite(formId)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [guardianPhoneInput, setGuardianPhoneInput] = useState('')
  const [guardianPhoneFilter, setGuardianPhoneFilter] = useState<string | undefined>()
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [aggregate, setAggregate] = useState<AggregateState>({ loading: false, data: [] })

  useEffect(() => {
    if (invalidFormId) {
      navigate('/admin/forms')
    }
  }, [invalidFormId, navigate])

  const formQuery = useAdminForm(Number.isFinite(formId) ? formId : null)
  const studentsQuery = useStudentsQuery({ enabled: formQuery.isSuccess })

  const submissionFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      guardian_phone: guardianPhoneFilter,
      page,
      per_page: DEFAULT_PAGE_SIZE,
    }),
    [statusFilter, guardianPhoneFilter, page],
  )

  const submissionsQuery = useAdminFormSubmissions(formId, submissionFilters)

  const detailQuery = useAdminFormSubmission(formId, detailOpen ? selectedSubmissionId : null)

  const fieldDefinitions = useMemo(() => mapFormFields(formQuery.data), [formQuery.data])
  const fieldMap = useMemo(() => buildFieldMap(fieldDefinitions), [fieldDefinitions])

  const loadAllSubmissions = useCallback(async () => {
    if (!Number.isFinite(formId)) return

    setAggregate((current) => ({ ...current, loading: true }))
    try {
      const aggregated: FormSubmission[] = []
      let currentPage = 1
      let lastPage = 1

      do {
        const { data, meta } = await fetchAdminFormSubmissions(formId, {
          page: currentPage,
          per_page: MAX_FETCH_PAGE_SIZE,
        })
        aggregated.push(...data)
        lastPage = meta?.last_page ?? currentPage
        currentPage += 1
      } while (currentPage <= lastPage)

      setAggregate({ loading: false, data: aggregated })
    } catch (error) {
      console.error(error)
      setAggregate((current) => ({ ...current, loading: false }))
      const notify = toastRef.current
      notify?.({
        type: 'error',
        title: 'تعذر تحميل جميع الردود',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }, [formId])

  useEffect(() => {
    loadAllSubmissions()
  }, [loadAllSubmissions])

  const audience = useMemo(
    () => resolveTargetedStudents(formQuery.data, studentsQuery.data ?? []),
    [formQuery.data, studentsQuery.data],
  )

  const targetedStudents = audience.students

  /** لا تُعرض نِسَبٌ ولا قوائم قبل وصول الطلاب أو فوق جمهورٍ فاسد — الشرطة أصدق من صفر */
  const audienceMeasurable = studentsQuery.isSuccess && !audience.unreachable

  const respondedStudentIds = useMemo(() => {
    const ids = new Set<number>()
    aggregate.data.forEach((submission) => {
      const candidate = submission.student?.id ?? submission.student_id
      if (candidate) {
        ids.add(candidate)
      }
    })
    return ids
  }, [aggregate.data])

  const respondedStudents = useMemo(
    () =>
      targetedStudents
        .filter((student) => respondedStudentIds.has(student.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [targetedStudents, respondedStudentIds],
  )

  const pendingStudents = useMemo(
    () =>
      targetedStudents
        .filter((student) => !respondedStudentIds.has(student.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [targetedStudents, respondedStudentIds],
  )

  const responseRate = useMemo(() => {
    if (!targetedStudents.length) return 0
    return Math.round((respondedStudents.length / targetedStudents.length) * 100)
  }, [respondedStudents.length, targetedStudents.length])

  const statusSummary = useMemo(() => {
    const counts = new Map<FormSubmission['status'], number>()
    aggregate.data.forEach((submission) => {
      counts.set(submission.status, (counts.get(submission.status) ?? 0) + 1)
    })
    return counts
  }, [aggregate.data])

  const gradeSummary = useMemo(() => {
    const map = new Map<string, { total: number; responded: number }>()

    targetedStudents.forEach((student) => {
      const key = student.grade || 'غير محدد'
      if (!map.has(key)) {
        map.set(key, { total: 0, responded: 0 })
      }
      map.get(key)!.total += 1
      if (respondedStudentIds.has(student.id)) {
        map.get(key)!.responded += 1
      }
    })

    return Array.from(map.entries())
      .map(([grade, stats]) => ({
        grade,
        total: stats.total,
        responded: stats.responded,
        rate: stats.total ? Math.round((stats.responded / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade, 'ar'))
  }, [targetedStudents, respondedStudentIds])

  const submissions = submissionsQuery.data?.data ?? []
  const meta = submissionsQuery.data?.meta

  const reviewMutation = useReviewAdminSubmissionMutation(formId)
  const deleteMutation = useDeleteAdminSubmissionMutation(formId)

  const handleStatusFilterChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const applyGuardianFilter = () => {
    const trimmed = guardianPhoneInput.trim()
    setGuardianPhoneFilter(trimmed.length ? trimmed : undefined)
    setPage(1)
  }

  const handleClearGuardianFilter = () => {
    setGuardianPhoneInput('')
    setGuardianPhoneFilter(undefined)
    setPage(1)
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (!meta) return
    if (direction === 'prev' && page > 1) {
      setPage((current) => current - 1)
    }
    if (direction === 'next' && meta.last_page && page < meta.last_page) {
      setPage((current) => current + 1)
    }
  }

  const handleOpenDetail = (submissionId: number) => {
    setSelectedSubmissionId(submissionId)
    setDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedSubmissionId(null)
  }

  const refetchSelectedSubmission = detailQuery.refetch
  const refetchSubmissions = submissionsQuery.refetch

  const handleReviewAction = useCallback(
    async (submissionId: number, status: (typeof REVIEWABLE_STATUSES)[number]) => {
      let reviewNotes: string | undefined

      if (status === 'rejected') {
        const input = window.prompt('يمكنك إدخال سبب الرفض (اختياري):', '')
        if (input === null) {
          return
        }
        const trimmed = input.trim()
        reviewNotes = trimmed.length ? trimmed : undefined
      }

      // سببُ الإعادة إلزاميٌّ لا اختياريّ: وليُّ الأمر سيقرؤه ليعرف ما يصحّح،
      // وإعادةٌ صامتةٌ تُرجعه إلى نموذجٍ لا يدري ما العيب فيه
      if (status === 'returned') {
        const input = window.prompt('ما الذي يجب على ولي الأمر تصحيحه؟ (يظهر له نصّاً)', '')
        if (input === null) {
          return
        }
        const trimmed = input.trim()
        if (!trimmed.length) {
          toast({ type: 'warning', title: 'يلزم ذكرُ سبب الإعادة' })
          return
        }
        reviewNotes = trimmed
      }

      try {
        await reviewMutation.mutateAsync({ submissionId, status, review_notes: reviewNotes })
        refetchSelectedSubmission()
        refetchSubmissions()
        loadAllSubmissions()
      } catch {
        // الإشعار يُطلقه الـhook — ولا يُكرَّر هنا
      }
    },
    [loadAllSubmissions, refetchSelectedSubmission, refetchSubmissions, reviewMutation],
  )

  const handleExportExcel = useCallback(
    async (options: { filtered?: boolean } = {}) => {
      if (!formQuery.data) return
      if (exporting) return

      try {
        setExporting(true)

        const aggregated: FormSubmission[] = []
        let currentPage = 1
        let lastPage = 1

        do {
          const { data, meta: pagination } = await fetchAdminFormSubmissions(formId, {
            page: currentPage,
            per_page: MAX_FETCH_PAGE_SIZE,
            status: options.filtered && statusFilter !== 'all' ? statusFilter : undefined,
            guardian_phone: options.filtered ? guardianPhoneFilter : undefined,
          })
          aggregated.push(...data)
          lastPage = pagination?.last_page ?? currentPage
          currentPage += 1
        } while (currentPage <= lastPage)

        if (!aggregated.length) {
          toast({ type: 'info', title: 'لا توجد ردود لتصديرها وفق الفلتر الحالي' })
          return
        }

        buildExcelWorkbook(aggregated, formQuery.data, fieldDefinitions)
      } catch (error) {
        console.error(error)
        toast({
          type: 'error',
          title: 'تعذر تصدير الردود',
          description: error instanceof Error ? error.message : undefined,
        })
      } finally {
        setExporting(false)
      }
    },
    [exporting, fieldDefinitions, formId, formQuery.data, guardianPhoneFilter, statusFilter, toast],
  )

  const handlePrintSubmission = useCallback(
    async (submission: FormSubmission) => {
      if (!formQuery.data) return

      /*
       * صفُّ القائمة **لا يحمل إجاباتٍ ولا مرفقات**: `FormSubmissionController::index`
       * يحمّل `student` وحده. فالطباعةُ منه كانت تُخرج ورقةً كاملةَ التسميات
       * فارغةَ القيم — كلُّ خليّةٍ فيها «—» — بينما الشاشةُ تعرض الردَّ مملوءاً،
       * لأنّها تفتح الدرجَ الذي يجلب التفصيل.
       *
       * فنجلبه هنا قبل الرسم متى غاب، ونستعمل ما بين أيدينا متى حضر (الطباعةُ من
       * داخل الدرج).
       */
      let printable = submission

      if (!submission.answers) {
        try {
          printable = await fetchAdminFormSubmission(formId, submission.id)
        } catch {
          toast({ type: 'error', title: 'تعذّر تحميل تفاصيل الرد للطباعة' })
          return
        }
      }

      const markup = buildPrintableMarkup(printable, formQuery.data, fieldDefinitions)
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) {
        toast({ type: 'error', title: 'تعذر فتح نافذة الطباعة، تأكد من السماح بالنوافذ المنبثقة' })
        return
      }
      printWindow.document.write(markup)
      printWindow.document.close()
      printWindow.focus()

      /*
       * الطباعةُ تنتظر الصور.
       *
       * `print()` يلتقط الصفحةَ كما هي في تلك اللحظة، و`document.write` لا ينتظر
       * تحميلَ ما فيها. فمرفقاتُ الصور — وهي صفحةٌ لكلّ واحدة — كانت ستخرج بيضاء،
       * والصورةُ الشخصيةُ في الترويسة معها. وروابطُ المرفقات موقَّعةٌ من الخادم،
       * أي طلبُ شبكةٍ حقيقيّ لا شيء من الذاكرة.
       *
       * و`onerror` يُنهي الانتظارَ كما يُنهيه `onload`: رابطٌ منتهي الصلاحية يجب
       * أن يُخرج ورقةً ناقصةَ صورةٍ واحدة، لا أن يمنع الطباعةَ كلَّها. والمهلةُ
       * سقفٌ أخير لئلّا تعلق النافذةُ على شبكةٍ بطيئة.
       */
      const images = Array.from(printWindow.document.images)
      const pending = images
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true })
              image.addEventListener('error', () => resolve(), { once: true })
            }),
        )

      if (pending.length > 0) {
        await Promise.race([
          Promise.all(pending),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ])
      }

      printWindow.print()
    },
    [fieldDefinitions, formId, formQuery.data, toast],
  )

  const handleDeleteSubmission = useCallback(
    async (submissionId: number) => {
      const confirmed = window.confirm(
        'حذف هذا الرد نهائياً؟\n\nسيُحذف الرد وإجاباته ومرفقاته، ولا يمكن التراجع.',
      )
      if (!confirmed) return

      try {
        await deleteMutation.mutateAsync(submissionId)
        setDetailOpen(false)
        setSelectedSubmissionId(null)
        loadAllSubmissions()
      } catch {
        // الإشعار يُطلقه الـhook
      }
    },
    [deleteMutation, loadAllSubmissions],
  )

  if (invalidFormId) {
    return null
  }

  if (formQuery.isLoading) {
    return (
      <section className="ws-panel" dir="rtl">
        <div className="ws-panel__body">
          <WsEmpty loading>جارٍ تحميل النموذج...</WsEmpty>
        </div>
      </section>
    )
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <section className="ws-panel" dir="rtl">
        <div className="ws-panel__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WsAlert tone="error" boxed>
            تعذر تحميل بيانات النموذج.
          </WsAlert>
          <Link to="/admin/forms" className="ws-btn" style={{ alignSelf: 'flex-start' }}>
            <ArrowRight />
            العودة إلى قائمة النماذج
          </Link>
        </div>
      </section>
    )
  }

  const form = formQuery.data
  const requiresApproval = form.requires_approval

  /*
   * أيرى صاحبُ الشاشة الإجابات؟
   *
   * لا نسأل عن دوره — نسأل عمّا وصل. الخادمُ هو مَن يقرّر، وقراءةُ الدور هنا
   * تُنشئ مصدرَ حقيقةٍ ثانياً ينحرف عنه يوماً ما. ووصولُ `answers` معرَّفةً في
   * ردٍّ واحد يكفي دليلاً.
   */
  const answersVisible = !form.is_confidential || submissions.some((item) => item.answers !== undefined)
  /*
   * سقفُ ما يُمرَّر في الرابط.
   *
   * المعرّفات تسافر في سلسلة الاستعلام، فمدرسةٌ بألف غير مستجيبٍ تُنتج رابطاً
   * بستّة آلاف حرف. والسقفُ كان مئتين يقصّ صامتاً: الزرُّ يقول «تذكير ٤٥٠»
   * ويصل الصفحةَ مئتان، فيُرسل المديرُ ظانّاً أنه غطّى الجميع.
   */
  const MESSAGE_TARGET_CAP = 500
  const pendingMessageTargets = pendingStudents.slice(0, MESSAGE_TARGET_CAP)
  const pendingMessageTargetIds = pendingMessageTargets.map((student) => student.id).join(',')
  const pendingTargetsTruncated = pendingStudents.length > pendingMessageTargets.length
  const totalCount = meta?.total ?? submissions.length
  const lastPage = meta?.last_page ?? 1

  return (
    /*
     * مساحةُ عملٍ ملتصقةٌ بملء الشاشة.
     *
     * كان المسارُ مستثنىً من `WORKSPACE_ROUTE_PATTERNS` في admin-shell — الـregex
     * يطابق `/admin/forms/\d+$` وينتهي عند `$` فلا يشمل `/submissions`. فتسقط
     * الصفحةُ في الحاوية العادية بحشوتها وتمريرها الخارجيّ، وتظهر محاطةً بفراغٍ
     * من أطرافها الأربعة بينما أخواتُها تملأ الشاشة.
     *
     * وكان الالتفافُ هنا إطاراً مرسوماً بيدٍ (`border` و`borderRadius`) يزيد
     * الإحساسَ بالصندوق بدل أن يزيله. سُجّل المسارُ في الـregex وحُذف الالتفاف.
     */
    <WsPage dir="rtl">
      <WsHeader
        title={`ردود: ${form.title}`}
        actions={
          <>
            <Link to="/admin/forms" className="ws-btn">
              <ArrowRight />
              النماذج
            </Link>
            <Link to={`/admin/forms/${form.id}`} className="ws-btn">
              <Settings2 />
              إعداد النموذج
            </Link>
            <WsBtn
              icon={RefreshCw}
              onClick={loadAllSubmissions}
              disabled={aggregate.loading}
              title="إعادة حساب الإحصائيات من كل الردود"
            >
              {aggregate.loading ? 'جارٍ التحديث...' : 'تحديث الإحصائيات'}
            </WsBtn>
            {/*
              * التصديرُ يُعطَّل بتفسيرٍ لا يُخفى.
              *
              * الخادمُ لا يرسل الإجاباتِ في النموذج السرّيّ، فالزرُّ العامل كان
              * يُخرج ملفاً كاملَ الأعمدة فارغَ القيَم — يظنّه المستخدمُ عطلاً
              * ويعيد المحاولة. والتعطيلُ مع سببٍ في `title` أصدقُ من الإخفاء:
              * يعرف أنّ الزرّ موجودٌ ولماذا لا يعمل.
              */}
            <WsBtn
              icon={FileSpreadsheet}
              onClick={() => handleExportExcel({ filtered: true })}
              disabled={exporting || !answersVisible}
              title={answersVisible ? undefined : CONFIDENTIAL_HINT}
            >
              {exporting ? 'جارٍ التصدير...' : 'تصدير المعروض'}
            </WsBtn>
            <WsBtn
              icon={Download}
              onClick={() => handleExportExcel({ filtered: false })}
              disabled={exporting || !answersVisible}
              title={answersVisible ? undefined : CONFIDENTIAL_HINT}
            >
              تصدير الكل
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="المستهدفون:">
              {audienceMeasurable ? nf(targetedStudents.length) : '—'}
            </WsFact>
            <WsFact icon={UserCheck} label="استجابوا:">
              {audienceMeasurable ? nf(respondedStudents.length) : '—'}
            </WsFact>
            <WsFact icon={UserX} label="لم يستجيبوا:">
              {audienceMeasurable ? nf(pendingStudents.length) : '—'}
            </WsFact>
            <WsFact icon={Percent} label="نسبة الاستجابة:">
              {audienceMeasurable ? `${nf(responseRate)}٪` : '—'}
            </WsFact>
            <WsFact icon={Inbox} label="إجمالي الردود:">
              {aggregate.loading ? <WsSpinner /> : nf(aggregate.data.length)}
            </WsFact>
          </>
        }
      >
        <WsChip tone={FORM_STATUS_TONE[form.status]}>{FORM_STATUS_LABELS[form.status]}</WsChip>
        {requiresApproval ? <WsChip tone="sky">يتطلب اعتماداً</WsChip> : null}
        {form.is_confidential ? (
          <WsChip tone="red">
            <Lock style={{ width: 11, height: 11 }} /> سرّي
          </WsChip>
        ) : null}
      </WsHeader>

      {/*
       * تفسيرُ الحجب لمن لا يراه.
       *
       * الخادمُ يمنع الإجاباتِ عن غير الموجّه، فتصل القائمةُ بلا إجابة. وبلا هذه
       * اللافتة يظهر جدولٌ كامل الصفوف فارغُ القيَم فيبدو النظامُ معطوباً، أو
       * يُفتح ردٌّ فيرتدّ 403 بلا سبب.
       */}
      {form.is_confidential && !answersVisible ? (
        <WsAlert tone="warn">
          <strong>نموذجٌ سرّي.</strong> يحوي أسئلةً من الأقسام المحاطة بالسرّية، فلا تظهر إجاباتُه
          ولا مرفقاتُه ولا تُصدَّر إلا للموجّه الطلابي. وما تراه هنا متابعةٌ فقط: مَن ردّ ومَن لم
          يردّ.
        </WsAlert>
      ) : null}

      {audience.unreachable ? (
        <WsAlert tone="warn">
          هذا النموذج لا يبلغ أحداً: جمهوره ليس «جميع الطلاب» ولا يحمل إسناداً واحداً صالحاً، فلا يظهر لأيّ وليّ
          أمر. لذلك لا تُعرض هنا نسبةُ استجابةٍ ولا قائمةُ متبقّين — لا قاعدة تُقاس عليها حتى يُسنَد من{' '}
          <Link to={`/admin/forms/${form.id}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>
            صفحة إعداد النموذج
          </Link>
          .
        </WsAlert>
      ) : null}

      <WsToolbar>
        <WsField label="حالة الرد">
          <div className="ws-seg">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                className={cx('ws-seg__btn', statusFilter === status && 'is-active')}
                onClick={() => handleStatusFilterChange(status)}
              >
                {status === 'all' ? 'الكل' : FORM_SUBMISSION_STATUS_LABELS[status]}
                <span className="ws-count">
                  {nf(status === 'all' ? aggregate.data.length : statusSummary.get(status) ?? 0)}
                </span>
              </button>
            ))}
          </div>
        </WsField>

        <WsField label="رقم ولي الأمر" htmlFor="ws-fs-phone" grow>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <WsInput
              id="ws-fs-phone"
              type="tel"
              inputMode="numeric"
              value={guardianPhoneInput}
              onChange={(event) => setGuardianPhoneInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyGuardianFilter()
                }
              }}
              placeholder="ابحث برقم الجوال"
              style={{ maxWidth: 220 }}
            />
            <WsBtn icon={Search} onClick={applyGuardianFilter}>
              بحث
            </WsBtn>
            {guardianPhoneFilter ? (
              <WsIconBtn icon={X} label="إلغاء فلتر الجوال" onClick={handleClearGuardianFilter} />
            ) : null}
          </div>
        </WsField>
      </WsToolbar>

      {/*
       * حاويةُ التمرير الداخليّ.
       *
       * `.ws-page` و`.ws-main` كلاهما `overflow:hidden` — وهو جوهرُ «النمط
       * الملتصق»: الصفحةُ لا تتمرّر، بل يتمرّر جوفُها. فبلا هذه الحاوية تُقصّ
       * البلوكاتُ الثلاثةُ صامتةً عند حافّة الشاشة ولا يصل القارئُ إلى «متابعة
       * الطلاب» أبداً.
       */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <WsBlock
        title="قائمة الردود"
        icon={FileText}
        count={nf(totalCount)}
        tools={
          <>
            <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
              صفحة {nf(meta?.current_page ?? page)} من {nf(lastPage)}
            </span>
            <WsIconBtn
              icon={ChevronRight}
              label="الصفحة السابقة"
              onClick={() => handlePageChange('prev')}
              disabled={page <= 1}
            />
            <WsIconBtn
              icon={ChevronLeft}
              label="الصفحة التالية"
              onClick={() => handlePageChange('next')}
              disabled={page >= lastPage}
            />
          </>
        }
      >
        {submissionsQuery.isLoading ? (
          <WsEmpty loading>جارٍ تحميل الردود...</WsEmpty>
        ) : submissions.length === 0 ? (
          <WsEmpty icon={Inbox}>
            {form.is_confidential && !answersVisible
              ? 'لا ردود بعد. ولو وصلت فلن تُعرض هنا — نموذجٌ سرّي لا يقرأ ردودَه إلا الموجّه الطلابي.'
              : 'لا توجد ردود مطابقة للفلتر الحالي.'}
          </WsEmpty>
        ) : (
          <WsTable>
            <thead>
              <tr>
                <th scope="col">الطالب</th>
                <th scope="col">ولي الأمر</th>
                <th scope="col">الحالة</th>
                <th scope="col">تاريخ الإرسال</th>
                <th scope="col" style={{ width: 92 }}>
                  خيارات
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const student = submission.student
                const guardianName = submission.guardian_name ?? student?.parent_name ?? '—'
                const guardianPhone = submission.guardian_phone ?? student?.parent_phone ?? '—'
                return (
                  <tr
                    key={submission.id}
                    className={cx(
                      answersVisible && 'is-clickable',
                      selectedSubmissionId === submission.id && 'is-selected',
                    )}
                    onClick={answersVisible ? () => handleOpenDetail(submission.id) : undefined}
                  >
                    <td>
                      {student?.name ?? '—'}
                      <span className="ws-cell-sub">
                        {student?.grade ?? '—'} · {student?.class_name ?? '—'}
                      </span>
                    </td>
                    <td>
                      {guardianName}
                      <span className="ws-cell-sub">{guardianPhone}</span>
                    </td>
                    <td>
                      <WsChip tone={SUBMISSION_STATUS_TONE[submission.status]}>
                        {FORM_SUBMISSION_STATUS_LABELS[submission.status]}
                      </WsChip>
                    </td>
                    <td>{formatDateTime(submission.submitted_at)}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <WsIconBtn
                          icon={Eye}
                          label={answersVisible ? 'عرض الرد' : CONFIDENTIAL_HINT}
                          disabled={!answersVisible}
                          onClick={() => handleOpenDetail(submission.id)}
                        />
                        <WsIconBtn
                          icon={Printer}
                          label={answersVisible ? 'طباعة الرد' : CONFIDENTIAL_HINT}
                          disabled={!answersVisible}
                          onClick={() => handlePrintSubmission(submission)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </WsTable>
        )}
      </WsBlock>

      <WsBlock title="الاستجابة حسب الصف" icon={GraduationCap} count={nf(gradeSummary.length)}>
        {!audienceMeasurable ? (
          <WsEmpty icon={GraduationCap}>
            {audience.unreachable ? 'لا مستهدَفين لهذا النموذج.' : 'جارٍ تحديد المستهدفين...'}
          </WsEmpty>
        ) : gradeSummary.length === 0 ? (
          <WsEmpty icon={GraduationCap}>لا صفوف ضمن المستهدفين.</WsEmpty>
        ) : (
          <div className="ws-rows">
            {gradeSummary.map((entry) => (
              <div className="ws-row" key={entry.grade}>
                <span className="ws-row__name">{entry.grade}</span>
                <WsProgress
                  value={entry.rate}
                  label={`${nf(entry.responded)} / ${nf(entry.total)} · ${nf(entry.rate)}٪`}
                  style={{ maxWidth: 340, width: '100%' }}
                />
              </div>
            ))}
          </div>
        )}
      </WsBlock>

      <WsBlock
        title="متابعة الطلاب"
        icon={Users}
        tools={
          audienceMeasurable && pendingStudents.length > 0 ? (
            <Link
              to={
                pendingMessageTargetIds
                  ? `/admin/whatsapp-send?source=form&studentIds=${pendingMessageTargetIds}`
                  : '/admin/whatsapp-send'
              }
              className="ws-btn ws-btn--sm"
            >
              <MessageCircle />
              تذكير غير المستجيبين (
              {pendingTargetsTruncated
                ? `${nf(pendingMessageTargets.length)} من ${nf(pendingStudents.length)}`
                : nf(pendingStudents.length)}
              )
            </Link>
          ) : null
        }
      >
        {!audienceMeasurable ? (
          <WsEmpty icon={Users}>
            {audience.unreachable
              ? 'لا مستهدَفين — أسنِد النموذج أولاً لتظهر متابعة الطلاب.'
              : 'جارٍ تحميل الطلاب...'}
          </WsEmpty>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <StudentColumn
              title="استجابوا"
              icon={UserCheck}
              students={respondedStudents}
              emptyMessage="لم يصل أي رد حتى الآن."
            />
            <StudentColumn
              title="لم يستجيبوا"
              icon={UserX}
              students={pendingStudents}
              emptyMessage="جميع المستهدفين أكملوا النموذج."
            />
          </div>
        )}
        </WsBlock>
      </div>

      {detailOpen ? (
        <SubmissionDetail
          onClose={handleCloseDetail}
          submission={detailQuery.data ?? submissions.find((item) => item.id === selectedSubmissionId) ?? null}
          loading={detailQuery.isLoading}
          requiresApproval={requiresApproval}
          reviewing={reviewMutation.isPending}
          onReview={handleReviewAction}
          onPrint={handlePrintSubmission}
          onDelete={handleDeleteSubmission}
          fieldMap={fieldMap}
        />
      ) : null}
    </WsPage>
  )
}

function StudentColumn({
  title,
  icon: Icon,
  students,
  emptyMessage,
}: {
  title: string
  icon: LucideIcon
  students: StudentRecord[]
  emptyMessage: string
}) {
  return (
    <div>
      <div className="ws-block__head">
        <span className="ws-block__title">
          <Icon />
          {title}
          <span className="ws-count">{nf(students.length)}</span>
        </span>
      </div>
      {students.length === 0 ? (
        <WsEmpty icon={Icon}>{emptyMessage}</WsEmpty>
      ) : (
        <div className="ws-rows" style={{ maxHeight: 264, overflowY: 'auto' }}>
          {students.map((student) => (
            <div className="ws-row" key={student.id}>
              <span className="ws-row__name">{student.name}</span>
              <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>
                {student.grade} · {student.class_name}
                {student.parent_phone ? ` · ${student.parent_phone}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionDetail({
  onClose,
  submission,
  loading,
  requiresApproval,
  reviewing,
  onReview,
  onPrint,
  onDelete,
  fieldMap,
}: {
  onClose: () => void
  submission: FormSubmission | null
  loading: boolean
  requiresApproval: boolean
  reviewing: boolean
  onReview: (submissionId: number, status: (typeof REVIEWABLE_STATUSES)[number]) => void
  onPrint: (submission: FormSubmission) => void
  onDelete: (submissionId: number) => void
  fieldMap: Map<number, FormFieldWithSection>
}) {
  const [zoomed, setZoomed] = useState<FormSubmissionFile | null>(null)

  /** المرفقات مبوّبةٌ بحقلها كي تُعرض تحت سؤالها لا في كومةٍ في آخر الدرج */
  const filesByField = useMemo(() => {
    const map = new Map<number, FormSubmissionFile[]>()
    ;(submission?.files ?? []).forEach((file) => {
      const bucket = map.get(file.field_id)
      if (bucket) {
        bucket.push(file)
      } else {
        map.set(file.field_id, [file])
      }
    })
    return map
  }, [submission])

  const answers = submission?.answers ?? []

  /*
   * مرفقاتٌ لا سؤال لها في النموذج الحالي (حُذف الحقل بعد الإرسال مثلاً): تُعرض
   * وحدها بدل أن تختفي — والملفّ محفوظٌ على القرص فإخفاؤه كذبٌ على الأدمن.
   */
  const claimedFieldIds = new Set(
    answers
      .map((answer) => fieldMap.get(answer.field_id))
      .filter((field): field is FormFieldWithSection => Boolean(field && isAttachmentFieldType(field.type)))
      .map((field) => field.id),
  )
  const orphanFiles = (submission?.files ?? []).filter((file) => !claimedFieldIds.has(file.field_id))

  return (
    <>
      <WsModal
        open
        onClose={onClose}
        maxWidth={880}
        title="تفاصيل رد ولي الأمر"
        sub={submission ? `أُرسل بتاريخ ${formatDateTime(submission.submitted_at)}` : undefined}
        footer={
          submission ? (
            <>
              {requiresApproval ? (
                <>
                  <WsBtn
                    variant="primary"
                    icon={CheckCheck}
                    disabled={reviewing}
                    onClick={() => onReview(submission.id, 'approved')}
                  >
                    اعتماد
                  </WsBtn>
                  <WsBtn icon={Clock3} disabled={reviewing} onClick={() => onReview(submission.id, 'reviewed')}>
                    قيد المراجعة
                  </WsBtn>
                  <WsBtn
                    icon={RotateCcw}
                    disabled={reviewing}
                    onClick={() => onReview(submission.id, 'returned')}
                  >
                    إعادة للتعديل
                  </WsBtn>
                  <WsBtn
                    variant="danger"
                    icon={XCircle}
                    disabled={reviewing}
                    onClick={() => onReview(submission.id, 'rejected')}
                  >
                    رفض
                  </WsBtn>
                </>
              ) : null}
              <WsBtn icon={Printer} onClick={() => onPrint(submission)}>
                طباعة
              </WsBtn>
              <WsBtn icon={Trash2} onClick={() => onDelete(submission.id)}>
                حذف
              </WsBtn>
              <WsBtn onClick={onClose}>إغلاق</WsBtn>
            </>
          ) : (
            <WsBtn onClick={onClose}>إغلاق</WsBtn>
          )
        }
      >
        {loading && !submission ? (
          <WsEmpty loading>جارٍ تحميل الرد...</WsEmpty>
        ) : !submission ? (
          <WsAlert tone="error" boxed>
            تعذر تحميل بيانات الرد.
          </WsAlert>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <WsChip tone={SUBMISSION_STATUS_TONE[submission.status]}>
                {FORM_SUBMISSION_STATUS_LABELS[submission.status]}
              </WsChip>
              {submission.reviewed_at ? (
                <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                  رُوجع في {formatDateTime(submission.reviewed_at)}
                </span>
              ) : null}
            </div>

            <WsFactsList>
              <WsFactRow label="اسم الطالب">{submission.student?.name ?? '—'}</WsFactRow>
              <WsFactRow label="الصف والفصل">
                {submission.student?.grade ?? '—'} · {submission.student?.class_name ?? '—'}
              </WsFactRow>
              <WsFactRow label="رقم هوية الطالب">{submission.student?.national_id ?? '—'}</WsFactRow>
              <WsFactRow label="ولي الأمر">
                {submission.guardian_name ?? submission.student?.parent_name ?? '—'}
              </WsFactRow>
              <WsFactRow label="هاتف ولي الأمر">
                {submission.guardian_phone ?? submission.student?.parent_phone ?? '—'}
              </WsFactRow>
            </WsFactsList>

            {submission.review_notes ? (
              <WsAlert tone="info" boxed>
                ملاحظات المراجعة: {submission.review_notes}
              </WsAlert>
            ) : null}

            <div>
              <div className="ws-block__head" style={{ marginInline: -16 }}>
                <span className="ws-block__title">
                  <FileText />
                  الإجابات
                  <span className="ws-count">{nf(answers.length)}</span>
                </span>
              </div>
              {answers.length === 0 ? (
                <WsEmpty icon={FileText}>لا إجابات في هذا الرد.</WsEmpty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {answers.map((answer) => {
                    const field = fieldMap.get(answer.field_id)
                    if (!field) return null
                    const attachments = filesByField.get(field.id) ?? []
                    return (
                      <div
                        key={answer.id}
                        style={{ padding: '8px 0', borderBottom: '1px solid var(--ws-hairline)' }}
                      >
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--ws-text-2)' }}>
                          {fieldLabelOf(field)}
                        </p>
                        {answer.is_redacted ? (
                          /* شريطُ طمسٍ لا نصٌّ مموّه: لا قيمة تحته أصلاً — الخادم
                             لم يرسلها. والسطر يبقى ليعرف القارئُ أن هنا جواباً
                             ليس له، لا أن السؤال لم يُجَب. */
                          <p
                            style={{
                              margin: '6px 0 0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--ws-text-2)',
                            }}
                          >
                            <Lock style={{ width: 12, height: 12, flexShrink: 0 }} />
                            <span
                              aria-label="قيمة محجوبة"
                              style={{
                                display: 'inline-block',
                                minWidth: 96,
                                height: 14,
                                borderRadius: 2,
                                background:
                                  'repeating-linear-gradient(135deg, var(--ws-border-strong) 0 6px, var(--ws-border) 6px 12px)',
                              }}
                            />
                            <span>لا يظهر إلا للموجّه الطلابي</span>
                          </p>
                        ) : isAttachmentFieldType(field.type) ? (
                          attachments.length > 0 ? (
                            <AttachmentGrid files={attachments} onZoom={setZoomed} />
                          ) : (
                            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                              لم يُرفع مرفق.
                            </p>
                          )
                        ) : (
                          <p style={{ margin: '4px 0 0', fontSize: 12.5, whiteSpace: 'pre-line' }}>
                            {formatAnswerForField(field, answer)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {orphanFiles.length > 0 ? (
              <div>
                <div className="ws-block__head" style={{ marginInline: -16 }}>
                  <span className="ws-block__title">
                    <Paperclip />
                    مرفقات بلا سؤالٍ قائم
                    <span className="ws-count">{nf(orphanFiles.length)}</span>
                  </span>
                </div>
                <AttachmentGrid files={orphanFiles} onZoom={setZoomed} />
              </div>
            ) : null}
          </>
        )}
      </WsModal>

      {/* المكبِّر شقيقُ المودال لا ابنُه: `position:fixed` داخل لوحٍ متحرّكٍ بـtransform يُحبس فيه */}
      {zoomed?.url ? (
        <div
          role="presentation"
          onClick={() => setZoomed(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(0, 0, 0, 0.82)',
          }}
        >
          <img
            src={zoomed.url}
            alt={zoomed.filename}
            style={{ maxWidth: '100%', maxHeight: '84vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ position: 'absolute', top: 16, insetInlineStart: 16, display: 'flex', gap: 6 }}
          >
            <a href={zoomed.url} target="_blank" rel="noreferrer" className="ws-btn ws-btn--sm">
              <ExternalLink />
              فتح الأصل
            </a>
            <WsBtn size="sm" icon={X} onClick={() => setZoomed(null)}>
              إغلاق
            </WsBtn>
          </div>
        </div>
      ) : null}
    </>
  )
}

function AttachmentGrid({
  files,
  onZoom,
}: {
  files: FormSubmissionFile[]
  onZoom: (file: FormSubmissionFile) => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: 8,
        marginTop: 6,
      }}
    >
      {files.map((file) => (
        <AttachmentCard key={file.id} file={file} onZoom={onZoom} />
      ))}
    </div>
  )
}

const attachmentCardStyle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  border: '1px solid var(--ws-border)',
  borderRadius: 8,
  background: 'var(--ws-surface)',
}

const attachmentCaptionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  fontSize: 11,
  color: 'var(--ws-text-2)',
  minWidth: 0,
}

const attachmentNameStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--ws-text)',
  fontWeight: 600,
}

/**
 * بطاقة مرفق واحد.
 *
 * الرابط يصل موقَّعاً ومؤقّتاً من `FormSubmissionFileResource` ولا تبنيه الواجهة:
 * كانت تركّبه من `VITE_STORAGE_BASE_URL` والمسار، والمرفقات تنزل على قرص `local`
 * الخاصّ فكان كلُّ مرفقٍ ٤٠٤. و`is_image` يحسمه الباك من الامتداد، فما كان صورةً
 * يُعرض صورةً — لا اسمَ ملفٍّ يفتحه الأدمن ليرى ما كان يستطيع رؤيته في مكانه.
 */
function AttachmentCard({ file, onZoom }: { file: FormSubmissionFile; onZoom: (file: FormSubmissionFile) => void }) {
  const sizeLabel = formatFileSize(file.size)

  if (!file.url) {
    return (
      <div style={{ ...attachmentCardStyle, padding: '8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ws-red)' }}>
          <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
          تعذّر توليد رابطٍ لهذا المرفق
        </span>
        <span style={{ ...attachmentNameStyle, display: 'block', marginTop: 4, fontSize: 11 }}>{file.filename}</span>
      </div>
    )
  }

  if (file.is_image) {
    return (
      <figure style={{ ...attachmentCardStyle, margin: 0 }}>
        <button
          type="button"
          onClick={() => onZoom(file)}
          title="عرض بالحجم الكامل"
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'var(--ws-sunken)',
            cursor: 'zoom-in',
          }}
        >
          <img
            src={file.url}
            alt={file.filename}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: 118, objectFit: 'cover' }}
          />
        </button>
        <figcaption style={attachmentCaptionStyle}>
          <ImageIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
          <span style={attachmentNameStyle}>{file.filename}</span>
          {sizeLabel ? <span style={{ flexShrink: 0 }}>{sizeLabel}</span> : null}
          <ZoomIn style={{ width: 13, height: 13, flexShrink: 0, marginInlineStart: 'auto' }} />
        </figcaption>
      </figure>
    )
  }

  return (
    <a href={file.url} target="_blank" rel="noreferrer" style={attachmentCardStyle}>
      <span style={attachmentCaptionStyle}>
        <Paperclip style={{ width: 13, height: 13, flexShrink: 0 }} />
        <span style={attachmentNameStyle}>{file.filename}</span>
        {sizeLabel ? <span style={{ flexShrink: 0 }}>{sizeLabel}</span> : null}
        <ExternalLink style={{ width: 13, height: 13, flexShrink: 0, marginInlineStart: 'auto' }} />
      </span>
    </a>
  )
}

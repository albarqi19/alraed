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
import { fetchAdminFormSubmissions } from '@/modules/forms/api'
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

const REVIEWABLE_STATUSES: Array<Extract<FormSubmission['status'], 'approved' | 'rejected' | 'reviewed'>> = [
  'approved',
  'rejected',
  'reviewed',
]

type StatusFilter = FormSubmission['status'] | 'all'

const STATUS_FILTERS: StatusFilter[] = ['all', ...STATUS_ORDER]

/** الرمادي (بلا tone) للمسودّة عمداً: حالةٌ محايدة لا تستدعي انتباهاً */
const SUBMISSION_STATUS_TONE: Record<FormSubmission['status'], WsChipTone | undefined> = {
  approved: 'green',
  reviewed: 'sky',
  rejected: 'red',
  submitted: 'amber',
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
  const value = resolveSubmissionAnswerValue(answer)

  if (field.type === 'rating' && value !== '—') {
    return `${value} / ${field.settings?.max_rating ?? 5}`
  }

  return value
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

function buildPrintableMarkup(
  submission: FormSubmission,
  form: FormSummary,
  allFieldDefinitions: FormFieldWithSection[],
): string {
  // الورقةُ المطبوعة تُنسى على طاولة، فحكمُها حكمُ الملفّ المصدَّر: يُسقط المحجوب
  // ولا يُذكر أنه كان
  const fieldDefinitions = withoutRedactedColumns(allFieldDefinitions, [submission])

  const answers = fieldDefinitions
    .map((field) => {
      const answer = submission.answers?.find((item) => item.field_id === field.id)
      const value = formatAnswerForField(field, answer)
      return `
        <div class="answer-row">
          <div class="label">${escapeHtml(fieldLabelOf(field))}</div>
          <div class="value">${escapeHtml(value)}</div>
        </div>
      `
    })
    .join('')

  return `
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(form.title)} - رد رقم ${submission.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 24px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 20px; }
          .answers { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
          .answer-row { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; }
          .label { font-weight: 600; font-size: 12px; color: #4b5563; margin-bottom: 4px; }
          .value { font-size: 13px; color: #111827; white-space: pre-line; }
          .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
          .meta-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; }
          .meta-card .title { font-size: 11px; color: #6b7280; }
          .meta-card .data { font-size: 13px; font-weight: 600; }
          .section-title { font-size: 15px; font-weight: 700; margin: 20px 0 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(form.title)}</h1>
          <p>رد رقم ${submission.id.toString()}</p>
        </div>
        <div class="meta-grid">
          <div class="meta-card"><div class="title">اسم الطالب</div><div class="data">${escapeHtml(submission.student?.name ?? '—')}</div></div>
          <div class="meta-card"><div class="title">الصف</div><div class="data">${escapeHtml(submission.student?.grade ?? '—')}</div></div>
          <div class="meta-card"><div class="title">الفصل</div><div class="data">${escapeHtml(submission.student?.class_name ?? '—')}</div></div>
          <div class="meta-card"><div class="title">الحالة</div><div class="data">${escapeHtml(FORM_SUBMISSION_STATUS_LABELS[submission.status])}</div></div>
          <div class="meta-card"><div class="title">تاريخ الإرسال</div><div class="data">${escapeHtml(formatDateTime(submission.submitted_at))}</div></div>
          <div class="meta-card"><div class="title">ولي الأمر</div><div class="data">${escapeHtml(submission.guardian_name ?? submission.student?.parent_name ?? '—')}</div></div>
          <div class="meta-card"><div class="title">هاتف ولي الأمر</div><div class="data">${escapeHtml(submission.guardian_phone ?? submission.student?.parent_phone ?? '—')}</div></div>
        </div>
        <h2 class="section-title">الإجابات</h2>
        <div class="answers">${answers}</div>
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
    (submission: FormSubmission) => {
      if (!formQuery.data) return
      const markup = buildPrintableMarkup(submission, formQuery.data, fieldDefinitions)
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) {
        toast({ type: 'error', title: 'تعذر فتح نافذة الطباعة، تأكد من السماح بالنوافذ المنبثقة' })
        return
      }
      printWindow.document.write(markup)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    },
    [fieldDefinitions, formQuery.data, toast],
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
  const pendingMessageTargetIds = pendingStudents.slice(0, 200).map((student) => student.id).join(',')
  const totalCount = meta?.total ?? submissions.length
  const lastPage = meta?.last_page ?? 1

  return (
    /*
     * لوحٌ في التدفّق الطبيعي لا مساحةَ عملٍ ملتصقة: مسار
     * `/admin/forms/:formId/submissions` ليس مسجَّلاً في WORKSPACE_ROUTES بـ
     * admin-shell.tsx، فيسقط داخل حاويةٍ بحشوةٍ وبتمريرٍ خارجي وبلا ارتفاعٍ
     * محدَّد — و`flex:1` مع `overflow:hidden` هناك يقصّ الصفحة بلا مَخرج. فنُبقي
     * كلاس `ws-page` (لتَرِث الصفحةُ مفرداته وأشرطةَ تمريره) ونعطّل تمدّده
     * بـ`flex:none`. يوم يُسجَّل المسار: تُحذف هذه الأنماط ويُستبدل الوسم بـ
     * `WsPage`، ويُعطى بلوكُ الجدول `fill` و`scroll` ليتمرّر داخلياً.
     */
    <section
      dir="rtl"
      className="ws-page"
      style={{
        flex: 'none',
        border: '1px solid var(--ws-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--ws-surface)',
      }}
    >
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
            <WsBtn icon={FileSpreadsheet} onClick={() => handleExportExcel({ filtered: true })} disabled={exporting}>
              {exporting ? 'جارٍ التصدير...' : 'تصدير المعروض'}
            </WsBtn>
            <WsBtn icon={Download} onClick={() => handleExportExcel({ filtered: false })} disabled={exporting}>
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
      </WsHeader>

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
          <WsEmpty icon={Inbox}>لا توجد ردود مطابقة للفلتر الحالي.</WsEmpty>
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
                    className={cx('is-clickable', selectedSubmissionId === submission.id && 'is-selected')}
                    onClick={() => handleOpenDetail(submission.id)}
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
                        <WsIconBtn icon={Eye} label="عرض الرد" onClick={() => handleOpenDetail(submission.id)} />
                        <WsIconBtn
                          icon={Printer}
                          label="طباعة الرد"
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
                  ? `/admin/whatsapp/send?source=form&studentIds=${pendingMessageTargetIds}`
                  : '/admin/whatsapp/send'
              }
              className="ws-btn ws-btn--sm"
            >
              <MessageCircle />
              تذكير غير المستجيبين ({nf(pendingStudents.length)})
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
    </section>
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

import clsx from 'classnames'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/shared/feedback/use-toast'
import {
  useAdminForm,
  useAdminFormSubmission,
  useAdminFormSubmissions,
  useDeleteAdminSubmissionMutation,
  useReviewAdminSubmissionMutation,
} from '@/modules/forms/hooks'
import { fetchAdminFormSubmissions } from '@/modules/forms/api'
import { FORM_SUBMISSION_STATUS_LABELS } from '@/modules/forms/constants'
import type { FormSubmission, FormSubmissionAnswer, FormSummary } from '@/modules/forms/types'
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

type AggregateState = {
  loading: boolean
  error: unknown | null
  data: FormSubmission[]
  lastFetched: number
}

export interface FormFieldWithSection {
  id: number
  field_key: string
  type: string
  label: string
  sectionTitle: string | null
  sort_order: number
  settings?: Record<string, unknown>
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function resolveSubmissionAnswerValue(answer?: FormSubmissionAnswer | null): string {
  if (!answer) {
    return '—'
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
    if (Array.isArray(answer.value_json)) {
      return answer.value_json.map((item) => String(item)).join('، ')
    }

    if (typeof answer.value_json === 'object') {
      try {
        return JSON.stringify(answer.value_json)
      } catch {
        return String(answer.value_json)
      }
    }

    return String(answer.value_json)
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
      settings: field.settings ?? undefined,
    })),
  )

  const standaloneFields = standalone.map<FormFieldWithSection>((field) => ({
    id: field.id,
    field_key: field.field_key,
    type: field.type,
    label: field.label,
    sectionTitle: null,
    sort_order: field.sort_order ?? 0,
    settings: field.settings ?? undefined,
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

function createStatusTone(status: FormSubmission['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'reviewed':
      return 'bg-sky-50 text-sky-700 border border-sky-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border border-rose-200'
    case 'draft':
      return 'bg-slate-100 text-slate-600 border border-slate-200'
    case 'submitted':
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200'
  }
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
  fieldDefinitions: FormFieldWithSection[],
): void {
  if (!submissions.length) {
    return
  }

  const headers = [
    '#',
    'اسم الطالب',
    'الصف',
    'الفصل',
    'ولي الأمر',
    'هاتف ولي الأمر',
    'الحالة',
    'تاريخ الإرسال',
    ...fieldDefinitions.map((field) => (field.sectionTitle ? `${field.sectionTitle} - ${field.label}` : field.label)),
  ]

  const tbody = submissions
    .map((submission, index) => {
      const answers = fieldDefinitions.map((field) => {
        const answer = submission.answers?.find((item) => item.field_id === field.id)
        return escapeHtml(sanitizeForExcel(resolveSubmissionAnswerValue(answer)))
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

  const blob = new Blob([`\ufeff${tableHtml}`], {
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
  fieldDefinitions: FormFieldWithSection[],
): string {
  const answers = fieldDefinitions
    .map((field) => {
      const answer = submission.answers?.find((item) => item.field_id === field.id)
      const value = resolveSubmissionAnswerValue(answer)
      const label = field.sectionTitle ? `${field.sectionTitle} — ${field.label}` : field.label
      return `
        <div class="answer-row">
          <div class="label">${escapeHtml(label)}</div>
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
          body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 24px; }
          .header { text-align: center; margin-bottom: 24px; }
          .answers { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
          .answer-row { border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 16px; }
          .label { font-weight: 600; color: #1f2937; margin-bottom: 6px; }
          .value { color: #334155; white-space: pre-line; }
          .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
          .meta-card { background-color: #f1f5f9; border-radius: 12px; padding: 12px 16px; }
          .meta-card .title { font-size: 12px; color: #475569; }
          .meta-card .data { font-size: 14px; font-weight: 600; color: #0f172a; }
          .section-title { font-size: 18px; font-weight: 700; margin: 24px 0 12px; color: #0f172a; }
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

function collectTargetedStudents(form: FormSummary | undefined, students: StudentRecord[]): StudentRecord[] {
  if (!form || !students.length) {
    return []
  }

  const selected = new Map<number, StudentRecord>()
  const assignments = form.assignments ?? []

  const includeStudent = (student: StudentRecord | undefined | null) => {
    if (!student) return
    selected.set(student.id, student)
  }

  const includeByPredicate = (predicate: (student: StudentRecord) => boolean) => {
    students.forEach((student) => {
      if (predicate(student)) {
        selected.set(student.id, student)
      }
    })
  }

  if (!assignments.length) {
    students.forEach((student) => selected.set(student.id, student))
    return Array.from(selected.values())
  }

  assignments.forEach((assignment) => {
    switch (assignment.scope) {
      case 'all_students':
        students.forEach((student) => selected.set(student.id, student))
        break
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
          includeStudent(students.find((student) => student.id === assignment.student_id))
        }
        if (Array.isArray(assignment.metadata?.student_ids)) {
          assignment.metadata.student_ids.forEach((id) => {
            const numericId = Number(id)
            if (Number.isFinite(numericId)) {
              includeStudent(students.find((student) => student.id === numericId))
            }
          })
        }
        break
      case 'group':
        if (Array.isArray(assignment.metadata?.student_ids)) {
          assignment.metadata.student_ids.forEach((id) => {
            const numericId = Number(id)
            if (Number.isFinite(numericId)) {
              includeStudent(students.find((student) => student.id === numericId))
            }
          })
        }
        if (Array.isArray(assignment.metadata?.grades)) {
          assignment.metadata.grades.forEach((grade) => {
            includeByPredicate((student) => student.grade === grade)
          })
        }
        if (Array.isArray(assignment.metadata?.classes)) {
          assignment.metadata.classes.forEach((item) => {
            if (typeof item?.grade === 'string' && typeof item?.class_name === 'string') {
              includeByPredicate(
                (student) => student.grade === item.grade && student.class_name === item.class_name,
              )
            }
          })
        }
        break
      default:
        break
    }
  })

  return Array.from(selected.values())
}

function buildFileUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
  const normalizedApi = apiBase.replace(/\/?api\/?$/, '')
  const storageBase = import.meta.env.VITE_STORAGE_BASE_URL ?? `${normalizedApi}/storage`
  return `${storageBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
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
  const [aggregate, setAggregate] = useState<AggregateState>({ loading: false, error: null, data: [], lastFetched: 0 })

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

    setAggregate((current) => ({ ...current, loading: true, error: null }))
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

      setAggregate({ loading: false, error: null, data: aggregated, lastFetched: Date.now() })
    } catch (error) {
      console.error(error)
      setAggregate((current) => ({ ...current, loading: false, error }))
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

  const targetedStudents = useMemo(
    () => collectTargetedStudents(formQuery.data, studentsQuery.data ?? []),
    [formQuery.data, studentsQuery.data],
  )

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

  const respondedStudents = useMemo(() => {
    return targetedStudents
      .filter((student) => respondedStudentIds.has(student.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [targetedStudents, respondedStudentIds])

  const pendingStudents = useMemo(() => {
    return targetedStudents
      .filter((student) => !respondedStudentIds.has(student.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [targetedStudents, respondedStudentIds])

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

  const requiresApproval = Boolean(
    formQuery.data?.requires_approval ??
    (formQuery.data?.settings as Record<string, unknown> | undefined)?.requires_approval ??
      (formQuery.data?.settings as Record<string, unknown> | undefined)?.requiresApproval ??
      (formQuery.data?.settings as Record<string, unknown> | undefined)?.require_approval ??
      (formQuery.data?.settings as Record<string, unknown> | undefined)?.requireApproval ??
      false,
  )

  const reviewMutation = useReviewAdminSubmissionMutation(formId)

  const handleStatusFilterChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const handleGuardianFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
        // toast already handled inside mutation hook
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

  const perPage = MAX_FETCH_PAGE_SIZE
        const aggregated: FormSubmission[] = []
        let currentPage = 1
        let lastPage = 1

        do {
          const { data, meta: pagination } = await fetchAdminFormSubmissions(formId, {
            page: currentPage,
            per_page: perPage,
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

  const deleteMutation = useDeleteAdminSubmissionMutation(formId)

  const handleDeleteSubmission = useCallback(
    async (submissionId: number) => {
      const confirmed = window.confirm(
        '⚠️ تحذير!\n\nهل أنت متأكد من حذف هذا الرد؟\n\nسيتم حذف الرد وجميع البيانات المرتبطة به بشكل نهائي.\n\nلا يمكن التراجع عن هذا الإجراء.'
      )
      if (!confirmed) return

      try {
        await deleteMutation.mutateAsync(submissionId)
        setDetailOpen(false)
        setSelectedSubmissionId(null)
        loadAllSubmissions()
      } catch {
        // toast handled in hook
      }
    },
    [deleteMutation, loadAllSubmissions],
  )

  if (invalidFormId) {
    return null
  }

  if (formQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
      </section>
    )
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <section className="space-y-4 text-center">
        <p className="text-lg font-semibold text-rose-600">تعذر تحميل بيانات النموذج.</p>
        <Link
          to="/admin/forms"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
        >
          العودة إلى قائمة النماذج
        </Link>
      </section>
    )
  }

  const form = formQuery.data

  const pendingMessageTargetIds = pendingStudents.slice(0, 200).map((student) => student.id).join(',')

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ردود نموذج: {form.title}</h1>
          <p className="text-sm text-muted">
            تتبع الردود، اعتمد الطلبات، وصدّر النتائج كملف Excel مع إحصائيات تفصيلية حسب الصف.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <Link
            to={`/admin/forms/${form.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <i className="bi bi-pencil-square" /> إعدادات النموذج
          </Link>
          <button
            type="button"
            onClick={() => handleExportExcel({ filtered: true })}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800"
            disabled={exporting}
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                جاري التصدير...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <i className="bi bi-file-earmark-spreadsheet" />
                تصدير (حسب الفلتر)
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleExportExcel({ filtered: false })}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-slate-300"
            disabled={exporting}
          >
            <i className="bi bi-download" /> تصدير كل الردود
          </button>
          <button
            type="button"
            onClick={loadAllSubmissions}
            className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sky-700 transition hover:border-sky-400 hover:text-sky-800"
            disabled={aggregate.loading}
          >
            {aggregate.loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                تحديث الإحصائيات
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <i className="bi bi-arrow-repeat" /> تحديث الإحصائيات
              </span>
            )}
          </button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        <StatsCard title="إجمالي المستهدفين" value={targetedStudents.length} tone="slate" subtitle="عدد الطلاب المطلوب منهم الرد" />
        <StatsCard
          title="الردود المستلمة"
          value={respondedStudents.length}
          tone="emerald"
          subtitle={`تمثل ${responseRate.toLocaleString('ar-SA')}٪ من المستهدفين`}
        />
        <StatsCard
          title="ردود قيد المتابعة"
          value={pendingStudents.length}
          tone="amber"
          subtitle="طلاب لم يكملوا النموذج بعد"
        />
        <StatsCard
          title="إجمالي الردود"
          value={aggregate.data.length}
          tone="sky"
          subtitle="بصرف النظر عن الحالة الحالية"
        />
      </section>

      <section className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">إحصائيات حسب الحالة</h2>
            <p className="text-xs text-muted">راقب تقدّم الاعتماد والتدقيق بسهولة.</p>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const total = statusSummary.get(status) ?? 0
            const percent = aggregate.data.length ? Math.round((total / aggregate.data.length) * 100) : 0
            return (
              <div key={status} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">{FORM_SUBMISSION_STATUS_LABELS[status]}</p>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', createStatusTone(status))}>
                    {percent.toLocaleString('ar-SA')}٪
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{total.toLocaleString('ar-SA')}</p>
              </div>
            )
          })}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">حسب الصف</h3>
          <div className="space-y-2">
            {gradeSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-muted">
                لا تتوفر بيانات للصفوف حتى الآن.
              </div>
            ) : (
              gradeSummary.map((entry) => (
                <div key={entry.grade} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 font-semibold text-indigo-700">
                        {entry.grade}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{entry.responded.toLocaleString('ar-SA')} رد</p>
                        <p className="text-[11px] text-muted">
                          من أصل {entry.total.toLocaleString('ar-SA')} طالب | نسبة الاستجابة {entry.rate.toLocaleString('ar-SA')}٪
                        </p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 md:w-48">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(entry.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ResponseList
          title="المستجيبون"
          description="الطلاب الذين أكملوا النموذج"
          emptyMessage="لم يصل أي رد حتى الآن."
          students={respondedStudents}
          tone="emerald"
        />
        <div className="space-y-3">
          <ResponseList
            title="غير المستجيبين"
            description="يمكنك إرسال تذكير لهم عبر واتساب"
            emptyMessage="جميع الطلاب أكملوا النموذج."
            students={pendingStudents}
            tone="rose"
          />
          {pendingStudents.length > 0 ? (
            <Link
              to={pendingMessageTargetIds ? `/admin/whatsapp/send?source=form&studentIds=${pendingMessageTargetIds}` : '/admin/whatsapp/send'}
              className="flex items-center justify-center gap-2 rounded-3xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800"
            >
              <i className="bi bi-whatsapp" />
              إرسال تذكير للطلاب غير المستجيبين ({pendingStudents.length.toLocaleString('ar-SA')})
            </Link>
          ) : null}
        </div>
      </section>

      <section className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">قائمة الردود</h2>
            <p className="text-xs text-muted">استخدم الفلاتر للبحث عن ردود محددة أو مراجعة حالة كل ولي أمر.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(['all', 'submitted', 'reviewed', 'approved', 'rejected', 'draft'] as StatusFilter[]).map((status) => {
              const active = statusFilter === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusFilterChange(status)}
                  className={clsx(
                    'rounded-full border px-4 py-2 transition',
                    active
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600',
                  )}
                >
                  {status === 'all' ? 'الكل' : FORM_SUBMISSION_STATUS_LABELS[status]}
                </button>
              )
            })}
          </div>
        </header>

        <form onSubmit={handleGuardianFilterSubmit} className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-500" htmlFor="guardian-phone-filter">
            رقم ولي الأمر
          </label>
          <input
            id="guardian-phone-filter"
            type="tel"
            value={guardianPhoneInput}
            onChange={(event) => setGuardianPhoneInput(event.target.value)}
            placeholder="ابحث برقم الجوال"
            className="w-full max-w-xs rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            تطبيق الفلتر
          </button>
          {guardianPhoneFilter ? (
            <button
              type="button"
              onClick={handleClearGuardianFilter}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
            >
              إعادة التعيين
            </button>
          ) : null}
        </form>

        {submissionsQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-muted">
            لا توجد ردود مطابقة للفلتر الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    الطالب
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    ولي الأمر
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    الحالة
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    تاريخ الإرسال
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    خيارات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {submissions.map((submission) => {
                  const student = submission.student
                  const guardianName = submission.guardian_name ?? student?.parent_name ?? '—'
                  const guardianPhone = submission.guardian_phone ?? student?.parent_phone ?? '—'
                  return (
                    <tr key={submission.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{student?.name ?? '—'}</p>
                          <p className="text-xs text-muted">
                            {student?.grade ?? '—'} | {student?.class_name ?? '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800">{guardianName}</p>
                          <p className="text-xs text-muted">{guardianPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', createStatusTone(submission.status))}>
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {FORM_SUBMISSION_STATUS_LABELS[submission.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{formatDateTime(submission.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(submission.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                          >
                            <i className="bi bi-eye" /> عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSubmission(submission)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-slate-300"
                          >
                            <i className="bi bi-printer" /> طباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <p>
            صفحة {meta?.current_page ?? 1} من {meta?.last_page ?? 1} | إجمالي {meta?.total?.toLocaleString('ar-SA') ?? submissions.length.toLocaleString('ar-SA')} رد
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange('prev')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-slate-300"
              disabled={!meta || page <= 1}
            >
              <i className="bi bi-arrow-right" /> السابق
            </button>
            <button
              type="button"
              onClick={() => handlePageChange('next')}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-slate-300"
              disabled={!meta || !meta.last_page || page >= meta.last_page}
            >
              التالي <i className="bi bi-arrow-left" />
            </button>
          </div>
        </footer>
      </section>

      {detailOpen ? (
        <SubmissionDetailDrawer
          open={detailOpen}
          onClose={handleCloseDetail}
          submission={detailQuery.data ?? submissions.find((item) => item.id === selectedSubmissionId) ?? null}
          loading={detailQuery.isLoading}
          requiresApproval={requiresApproval}
          onReview={handleReviewAction}
          onPrint={handlePrintSubmission}
          onDelete={handleDeleteSubmission}
          fieldMap={fieldMap}
        />
      ) : null}
    </section>
  )
}

function StatsCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string
  value: number
  subtitle?: string
  tone: 'slate' | 'emerald' | 'amber' | 'sky'
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: 'from-slate-500 to-slate-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    sky: 'from-sky-500 to-sky-600',
  }

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value.toLocaleString('ar-SA')}</p>
          {subtitle ? <p className="mt-1 text-[11px] text-muted">{subtitle}</p> : null}
        </div>
        <div className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white', toneClasses[tone])}>
          <i className="bi bi-graph-up" />
        </div>
      </div>
    </article>
  )
}

function ResponseList({
  title,
  description,
  emptyMessage,
  students,
  tone,
}: {
  title: string
  description: string
  emptyMessage: string
  students: StudentRecord[]
  tone: 'emerald' | 'rose'
}) {
  const accent = tone === 'emerald' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-muted">{description}</p>
        </div>
        <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold', accent)}>
          <span className="h-2 w-2 rounded-full bg-current" />
          {students.length.toLocaleString('ar-SA')}
        </span>
      </header>
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {students.map((student) => (
            <div key={student.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">{student.name}</p>
              <p className="text-[11px] text-muted">
                {student.grade} | {student.class_name}
              </p>
              {student.parent_phone ? (
                <p className="text-[11px] text-muted">جوال ولي الأمر: {student.parent_phone}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionDetailDrawer({
  open,
  onClose,
  submission,
  loading,
  requiresApproval,
  onReview,
  onPrint,
  onDelete,
  fieldMap,
}: {
  open: boolean
  onClose: () => void
  submission: FormSubmission | null
  loading: boolean
  requiresApproval: boolean
  onReview: (submissionId: number, status: (typeof REVIEWABLE_STATUSES)[number]) => void
  onPrint: (submission: FormSubmission) => void
  onDelete: (submissionId: number) => void
  fieldMap: Map<number, FormFieldWithSection>
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="h-full w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded-full bg-slate-100" />
            <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : submission ? (
          <>
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">تفاصيل رد ولي الأمر</h3>
                <p className="text-xs text-muted">أُرسل بتاريخ {formatDateTime(submission.submitted_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1', createStatusTone(submission.status))}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {FORM_SUBMISSION_STATUS_LABELS[submission.status]}
                </span>
                <button
                  type="button"
                  onClick={() => onPrint(submission)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-300"
                >
                  <i className="bi bi-printer" /> طباعة
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(submission.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                >
                  <i className="bi bi-trash" /> حذف
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-300"
                >
                  إغلاق
                </button>
              </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="اسم الطالب" value={submission.student?.name ?? '—'} />
              <InfoCard label="الصف" value={submission.student?.grade ?? '—'} />
              <InfoCard label="الفصل" value={submission.student?.class_name ?? '—'} />
              <InfoCard label="رقم هوية الطالب" value={submission.student?.national_id ?? '—'} />
              <InfoCard label="اسم ولي الأمر" value={submission.guardian_name ?? submission.student?.parent_name ?? '—'} />
              <InfoCard label="هاتف ولي الأمر" value={submission.guardian_phone ?? submission.student?.parent_phone ?? '—'} />
            </section>

            {requiresApproval ? (
              <section className="mt-5 space-y-3 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4">
                <h4 className="text-sm font-semibold text-indigo-700">إجراءات الاعتماد</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => onReview(submission.id, 'approved')}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800"
                  >
                    <i className="bi bi-check-circle" /> اعتماد الرد
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(submission.id, 'reviewed')}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-sky-700 transition hover:border-sky-400 hover:text-sky-800"
                  >
                    <i className="bi bi-hourglass-split" /> قيد المراجعة
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(submission.id, 'rejected')}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-700 transition hover:border-rose-400 hover:text-rose-800"
                  >
                    <i className="bi bi-x-circle" /> رفض الرد
                  </button>
                </div>
                {submission.review_notes ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">ملاحظات سابقة:</p>
                    <p className="mt-1 whitespace-pre-line">{submission.review_notes}</p>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">الإجابات</h4>
              <div className="space-y-2">
                {(submission.answers ?? []).map((answer) => {
                  const field = fieldMap.get(answer.field_id)
                  if (!field) return null
                  return (
                    <div key={answer.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {field.sectionTitle ? `${field.sectionTitle} — ${field.label}` : field.label}
                      </p>
                      <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">{resolveSubmissionAnswerValue(answer)}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            {submission.files && submission.files.length ? (
              <section className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">المرفقات</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {submission.files.map((file) => {
                    const url = buildFileUrl(file.path)
                    return (
                      <a
                        key={file.id}
                        href={url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        <span className="flex items-center gap-2">
                          <i className="bi bi-paperclip text-base" />
                          {file.filename}
                        </span>
                        <i className="bi bi-box-arrow-up-right" />
                      </a>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted">
            تعذر تحميل بيانات الرد.
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  )
}

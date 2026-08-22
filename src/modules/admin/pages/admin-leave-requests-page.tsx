import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  useAdminSettingsQuery,
  useApproveLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useLeaveRequestsQuery,
  useRejectLeaveRequestMutation,
  useStudentsQuery,
} from '../hooks'
import type {
  LeaveRequestFilters,
  LeaveRequestRecord,
  LeaveRequestStatus,
  LeaveRequestSubmittedBy,
  StudentRecord,
} from '../types'
import {
  Ban,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock3,
  DoorOpen,
  Inbox,
  Info,
  ListChecks,
  Plus,
  Printer,
  RefreshCw,
  UserRound,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useYearScope, YearScopeSelect, YearScopeEmptyNote } from '@/modules/admin/academic-years'
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
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsTextarea,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
}

const STATUS_TONES: Record<LeaveRequestStatus, WsChipTone | undefined> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: undefined,
}

const STATUS_ICONS: Record<LeaveRequestStatus, LucideIcon> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: Ban,
}

const STATUS_OPTIONS: Array<{ value: LeaveRequestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'approved', label: STATUS_LABELS.approved },
  { value: 'rejected', label: STATUS_LABELS.rejected },
  { value: 'cancelled', label: STATUS_LABELS.cancelled },
]

const SUBMITTER_LABELS: Record<LeaveRequestSubmittedBy, string> = {
  guardian: 'ولي الأمر',
  admin: 'الإدارة',
}

const SUBMITTER_OPTIONS: Array<{ value: LeaveRequestSubmittedBy | 'all'; label: string }> = [
  { value: 'all', label: 'كل المصادر' },
  { value: 'guardian', label: SUBMITTER_LABELS.guardian },
  { value: 'admin', label: SUBMITTER_LABELS.admin },
]

const PAGE_SIZE = 20

type ActionType = 'approve' | 'reject' | 'cancel'

type ActionDialogState = {
  type: ActionType
  request: LeaveRequestRecord
} | null

type CreateRequestFormValues = {
  student_id: number | ''
  reason: string
  pickup_person_name: string
  pickup_person_relation: string
  pickup_person_phone: string
  expected_pickup_time: string
  guardian_name: string
  guardian_phone: string
  status: LeaveRequestStatus
  decision_notes: string
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn', options)
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusChip({ status }: { status: LeaveRequestStatus }) {
  return (
    <WsChip tone={STATUS_TONES[status]} icon={STATUS_ICONS[status]}>
      {STATUS_LABELS[status]}
    </WsChip>
  )
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return <span style={{ fontSize: 11, color: 'var(--ws-red)', fontWeight: 600 }}>{message}</span>
}

interface CreateLeaveRequestDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: CreateRequestFormValues) => Promise<void>
  isSubmitting: boolean
  students: StudentRecord[] | undefined
  isLoadingStudents: boolean
  onRefreshStudents: () => void
}

// مودال إنشاء طلب استئذان — نموذج بعمودين (كلاسات ws-modal الخام لأنه form)
function CreateLeaveRequestDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  students,
  isLoadingStudents,
  onRefreshStudents,
}: CreateLeaveRequestDialogProps) {
  const [values, setValues] = useState<CreateRequestFormValues>({
    student_id: '',
    reason: '',
    pickup_person_name: '',
    pickup_person_relation: '',
    pickup_person_phone: '',
    expected_pickup_time: '',
    guardian_name: '',
    guardian_phone: '',
    status: 'approved',
    decision_notes: '',
  })
  const [errors, setErrors] = useState<Record<keyof CreateRequestFormValues, string | null>>({
    student_id: null,
    reason: null,
    pickup_person_name: null,
    pickup_person_relation: null,
    pickup_person_phone: null,
    expected_pickup_time: null,
    guardian_name: null,
    guardian_phone: null,
    status: null,
    decision_notes: null,
  })

  const [studentSearch, setStudentSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')

  useEffect(() => {
    if (!open) return
    setValues({
      student_id: '',
      reason: '',
      pickup_person_name: '',
      pickup_person_relation: '',
      pickup_person_phone: '',
      expected_pickup_time: '',
      guardian_name: '',
      guardian_phone: '',
      status: 'approved',
      decision_notes: '',
    })
    setErrors({
      student_id: null,
      reason: null,
      pickup_person_name: null,
      pickup_person_relation: null,
      pickup_person_phone: null,
      expected_pickup_time: null,
      guardian_name: null,
      guardian_phone: null,
      status: null,
      decision_notes: null,
    })
    setStudentSearch('')
    setGradeFilter('')
    setClassFilter('')
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!students || !Array.isArray(students)) return
    const selected = students.find((student) => student.id === values.student_id)
    if (!selected) return

    setValues((prev) => ({
      ...prev,
      guardian_name: selected.parent_name ?? prev.guardian_name,
      guardian_phone: selected.parent_phone ?? prev.guardian_phone,
    }))
  }, [open, students, values.student_id])

  if (!open) return null

  const allStudents = (students ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  const grades = [...new Set(allStudents.map((s) => s.grade))].sort((a, b) => a.localeCompare(b, 'ar'))
  const classes = [...new Set(
    allStudents
      .filter((s) => !gradeFilter || s.grade === gradeFilter)
      .map((s) => s.class_name),
  )].sort((a, b) => a.localeCompare(b, 'ar'))

  const studentOptions = allStudents.filter((s) => {
    if (gradeFilter && s.grade !== gradeFilter) return false
    if (classFilter && s.class_name !== classFilter) return false
    if (studentSearch) {
      const q = studentSearch.trim().toLowerCase()
      return s.name.toLowerCase().includes(q) || s.national_id?.includes(q)
    }
    return true
  })

  const handleChange = <K extends keyof CreateRequestFormValues>(field: K, value: CreateRequestFormValues[K]) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }))
    setErrors((prev) => ({
      ...prev,
      [field]: null,
    }))
  }

  const validate = (): boolean => {
    const nextErrors: typeof errors = { ...errors }
    let hasError = false

    if (!values.student_id) {
      nextErrors.student_id = 'يرجى اختيار الطالب'
      hasError = true
    }
    if (!values.reason.trim()) {
      nextErrors.reason = 'اذكر سبب الاستئذان'
      hasError = true
    }
    if (!values.pickup_person_name.trim()) {
      nextErrors.pickup_person_name = 'اسم الشخص المستلم مطلوب'
      hasError = true
    }
    if (!values.expected_pickup_time) {
      nextErrors.expected_pickup_time = 'حدد وقت الانصراف المتوقع'
      hasError = true
    }
    if (values.status === 'approved' && !values.decision_notes.trim()) {
      nextErrors.decision_notes = 'أدخل ملاحظات الموافقة'
      hasError = true
    }

    if (hasError) {
      setErrors(nextErrors)
    }

    return !hasError
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    await onSubmit(values)
  }

  const errorStyle = { borderColor: 'var(--ws-red)' }

  return (
    <div className="ws-modal" onClick={() => !isSubmitting && onClose()}>
      <form
        className="ws-modal__panel"
        style={{ maxWidth: 720 }}
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
      >
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">طلب استئذان جديد</h3>
          <p className="ws-modal__sub">
            اختر الطالب، عرّف المستلم من المدرسة، وحدد وقت الانصراف المتوقع. يمكن اعتماد الطلب مباشرة أثناء الإنشاء.
          </p>
        </header>

        <div className="ws-modal__body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="ws-label">الطالب</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <WsSelect
                    value={gradeFilter}
                    onChange={(event) => { setGradeFilter(event.target.value); setClassFilter(''); handleChange('student_id', '') }}
                    disabled={isSubmitting}
                  >
                    <option value="">كل الصفوف</option>
                    {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                  </WsSelect>
                  <WsSelect
                    value={classFilter}
                    onChange={(event) => { setClassFilter(event.target.value); handleChange('student_id', '') }}
                    disabled={isSubmitting}
                  >
                    <option value="">كل الفصول</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </WsSelect>
                </div>
                <WsInput
                  type="text"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب أو رقم الهوية..."
                  disabled={isSubmitting}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <WsSelect
                    value={values.student_id}
                    onChange={(event) => handleChange('student_id', Number(event.target.value) || '')}
                    disabled={isSubmitting || isLoadingStudents}
                    style={{ flex: 1, ...(errors.student_id ? errorStyle : null) }}
                  >
                    <option value="">اختر الطالب ({studentOptions.length})</option>
                    {studentOptions.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} • {student.grade} - {student.class_name}
                      </option>
                    ))}
                  </WsSelect>
                  <WsBtn icon={RefreshCw} onClick={onRefreshStudents} disabled={isSubmitting}>
                    تحديث
                  </WsBtn>
                </div>
                <FieldError message={errors.student_id} />
              </div>

              <WsField label="سبب الاستئذان">
                <WsTextarea
                  value={values.reason}
                  onChange={(event) => handleChange('reason', event.target.value)}
                  rows={4}
                  placeholder="مثال: مراجعة طبية في مستشفى المدينة"
                  disabled={isSubmitting}
                  style={errors.reason ? errorStyle : undefined}
                />
                <FieldError message={errors.reason} />
              </WsField>

              <WsField label="موعد الانصراف">
                <WsInput
                  type="datetime-local"
                  value={values.expected_pickup_time}
                  onChange={(event) => handleChange('expected_pickup_time', event.target.value)}
                  disabled={isSubmitting}
                  style={errors.expected_pickup_time ? errorStyle : undefined}
                />
                <FieldError message={errors.expected_pickup_time} />
              </WsField>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <WsField label="ولي الأمر">
                  <WsInput
                    type="text"
                    value={values.guardian_name}
                    onChange={(event) => handleChange('guardian_name', event.target.value)}
                    placeholder="اسم ولي الأمر"
                    disabled={isSubmitting}
                  />
                </WsField>
                <WsField label="هاتف ولي الأمر">
                  <WsInput
                    type="tel"
                    value={values.guardian_phone}
                    onChange={(event) => handleChange('guardian_phone', event.target.value)}
                    placeholder="05xxxxxxxx"
                    disabled={isSubmitting}
                  />
                </WsField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <WsField label="اسم المستلم">
                  <WsInput
                    type="text"
                    value={values.pickup_person_name}
                    onChange={(event) => handleChange('pickup_person_name', event.target.value)}
                    placeholder="من سيستلم الطالب"
                    disabled={isSubmitting}
                    style={errors.pickup_person_name ? errorStyle : undefined}
                  />
                  <FieldError message={errors.pickup_person_name} />
                </WsField>
                <WsField label="صلة القرابة">
                  <WsInput
                    type="text"
                    value={values.pickup_person_relation}
                    onChange={(event) => handleChange('pickup_person_relation', event.target.value)}
                    placeholder="مثال: الأب / العم"
                    disabled={isSubmitting}
                  />
                </WsField>
              </div>

              <WsField label="هاتف المستلم">
                <WsInput
                  type="tel"
                  value={values.pickup_person_phone}
                  onChange={(event) => handleChange('pickup_person_phone', event.target.value)}
                  placeholder="رقم للتواصل"
                  disabled={isSubmitting}
                />
              </WsField>

              <WsField label="حالة الطلب عند الإنشاء">
                <WsSelect
                  value={values.status}
                  onChange={(event) => handleChange('status', event.target.value as LeaveRequestStatus)}
                  disabled={isSubmitting}
                >
                  <option value="pending">بانتظار الموافقة</option>
                  <option value="approved">معتمد فوراً</option>
                </WsSelect>
              </WsField>

              {values.status === 'approved' ? (
                <WsField label="ملاحظات القرار">
                  <WsTextarea
                    value={values.decision_notes}
                    onChange={(event) => handleChange('decision_notes', event.target.value)}
                    rows={3}
                    placeholder="مثال: تم التحقق من الاتصال بولي الأمر"
                    disabled={isSubmitting}
                    style={errors.decision_notes ? errorStyle : undefined}
                  />
                  <FieldError message={errors.decision_notes} />
                </WsField>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </WsBtn>
          <WsBtn variant="primary" icon={DoorOpen} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب'}
          </WsBtn>
        </footer>
      </form>
    </div>
  )
}

interface DecisionDialogProps {
  state: ActionDialogState
  onClose: () => void
  onConfirm: (notes: string) => Promise<void>
  isSubmitting: boolean
}

function DecisionDialog({ state, onClose, onConfirm, isSubmitting }: DecisionDialogProps) {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state) {
      setNotes('')
      setError(null)
      return
    }
    setNotes('')
    setError(null)
  }, [state])

  if (!state) return null

  const isReject = state.type === 'reject'

  const title =
    state.type === 'approve'
      ? 'اعتماد طلب الاستئذان'
      : state.type === 'reject'
        ? 'رفض طلب الاستئذان'
        : 'إلغاء طلب الاستئذان'

  const description =
    state.type === 'approve'
      ? 'يمكن إضافة ملاحظات ترسل لولي الأمر بعد اعتماد الطلب.'
      : state.type === 'reject'
        ? 'يرجى كتابة سبب واضح لرفض الطلب، سيظهر لولي الأمر.'
        : 'يمكن كتابة سبب الإلغاء، وسيتم إشعار ولي الأمر في حال توفر رقم.'

  const handleConfirm = async () => {
    if (isReject && !notes.trim()) {
      setError('سبب الرفض مطلوب')
      return
    }
    setError(null)
    await onConfirm(notes.trim())
  }

  return (
    <WsModal
      open
      onClose={() => !isSubmitting && onClose()}
      title={title}
      sub={`${state.request.student.name} — ${description}`}
      footer={
        <>
          <WsBtn onClick={onClose} disabled={isSubmitting}>
            تراجع
          </WsBtn>
          <WsBtn
            variant={isReject ? 'danger' : 'primary'}
            icon={isReject ? XCircle : state.type === 'approve' ? CheckCircle2 : Ban}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري التنفيذ...' : state.type === 'approve' ? 'اعتماد' : isReject ? 'رفض' : 'إلغاء الطلب'}
          </WsBtn>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="ws-label" htmlFor="decision-notes">
          الملاحظات
        </label>
        <WsTextarea
          id="decision-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={isReject ? 4 : 3}
          placeholder={isReject ? 'اذكر سبب الرفض بالتفصيل' : 'أضف ملاحظات للقرار (اختياري)'}
          disabled={isSubmitting}
          style={error ? { borderColor: 'var(--ws-red)' } : undefined}
        />
        <FieldError message={error} />
      </div>
    </WsModal>
  )
}

export function AdminLeaveRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'all'>('pending')
  const [submittedByFilter, setSubmittedByFilter] = useState<LeaveRequestSubmittedBy | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<ActionDialogState>(null)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestRecord | null>(null)
  const [isGeneratingPrintSheet, setIsGeneratingPrintSheet] = useState(false)
  const adminSettingsQuery = useAdminSettingsQuery()

  const { scope: yearScope, setScope: setYearScope } = useYearScope()

  /* تبديلُ العام يُعيد الترقيمَ للأولى كسائر المرشِّحات: الصفحةُ السابعةُ
     من عامٍ فيه ألفُ طلبٍ لا وجودَ لها في عامٍ فيه عشرة. */
  useEffect(() => {
    setPage(1)
  }, [statusFilter, submittedByFilter, fromDate, toDate, yearScope])

  const filters = useMemo<LeaveRequestFilters>(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      submitted_by_type: submittedByFilter === 'all' ? undefined : submittedByFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page,
      per_page: PAGE_SIZE,
      academic_year: yearScope,
    }),
    [fromDate, page, statusFilter, submittedByFilter, toDate, yearScope],
  )

  const { data, isLoading, isError, refetch } = useLeaveRequestsQuery(filters)
  const requests = data?.items ?? []
  const totalPages = data?.meta.last_page ?? 1

  useEffect(() => {
    if (!selectedRequest) return
    const updated = requests.find((request) => request.id === selectedRequest.id)
    if (updated) {
      setSelectedRequest(updated)
    }
  }, [requests, selectedRequest])

  const studentsQuery = useStudentsQuery()

  const createMutation = useCreateLeaveRequestMutation()
  const approveMutation = useApproveLeaveRequestMutation()
  const rejectMutation = useRejectLeaveRequestMutation()
  const cancelMutation = useCancelLeaveRequestMutation()

  const handleCreateSubmit = async (values: CreateRequestFormValues) => {
    await createMutation.mutateAsync({
      student_id: Number(values.student_id),
      reason: values.reason.trim(),
      pickup_person_name: values.pickup_person_name.trim(),
      pickup_person_relation: values.pickup_person_relation.trim() || undefined,
      pickup_person_phone: values.pickup_person_phone.trim() || undefined,
      expected_pickup_time: values.expected_pickup_time,
      guardian_name: values.guardian_name.trim() || undefined,
      guardian_phone: values.guardian_phone.trim() || undefined,
      status: values.status,
      decision_notes: values.status === 'approved' ? values.decision_notes.trim() : undefined,
    })
    setCreateDialogOpen(false)
    setPage(1)
    await refetch()
  }

  const handleActionConfirm = async (notes: string) => {
    if (!actionDialog) return
    const { type, request } = actionDialog
    if (type === 'approve') {
      await approveMutation.mutateAsync({ id: request.id, decision_notes: notes || undefined })
    } else if (type === 'reject') {
      await rejectMutation.mutateAsync({ id: request.id, decision_notes: notes })
    } else {
      await cancelMutation.mutateAsync({ id: request.id, decision_notes: notes || undefined })
    }
    setActionDialog(null)
    await refetch()
  }

  const isActionSubmitting = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending

  const stats = useMemo(() => {
    if (data?.stats) {
      return data.stats
    }
    const counts: Record<LeaveRequestStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    }
    for (const request of requests) {
      counts[request.status] += 1
    }
    return counts
  }, [data?.stats, requests])

  const handlePrintGuardianSheet = async () => {
    if (typeof window === 'undefined' || isGeneratingPrintSheet) return

    setIsGeneratingPrintSheet(true)

    const printWindow = window.open('about:blank', '_blank', 'width=900,height=1100')
    if (!printWindow) {
      setIsGeneratingPrintSheet(false)
      window.alert('تعذر فتح نافذة الطباعة. يرجى السماح للنوافذ المنبثقة من إعدادات المتصفح.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>جاري تجهيز الصفحة...</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 32px; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .loading { text-align: center; max-width: 420px; }
            h1 { font-size: 22px; margin-bottom: 12px; }
            p { font-size: 15px; line-height: 1.7; }
          </style>
        </head>
        <body>
          <div class="loading">
            <h1>جاري تجهيز تعليمات أولياء الأمور...</h1>
            <p>لحظات وسيتم عرض الصفحة كاملة للطباعة. في حال لم تظهر خلال ثوانٍ، يرجى تحديث الصفحة وحاول مرة أخرى.</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()

    try {
      setIsGeneratingPrintSheet(true)
      const guardianUrl = new URL('/guardian/leave-request', window.location.origin).toString()

      let adminSettings = adminSettingsQuery.data
      if (!adminSettings) {
        const result = await adminSettingsQuery.refetch()
        if (result.data) {
          adminSettings = result.data
        }
      }

      const schoolName = adminSettings?.school_name?.trim()?.length ? adminSettings.school_name : 'المدرسة'

      const qrDataUrl = await QRCode.toDataURL(guardianUrl, {
        margin: 2,
        width: 840,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      })

      const today = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { dateStyle: 'long' }).format(new Date())

      const finalHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>تعليمات الاستئذان - ${schoolName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
    .sheet { max-width: 210mm; margin: 0 auto; background: #ffffff; padding: 15mm; min-height: 297mm; }
    h1 { font-size: 24px; margin: 0 0 8px 0; color: #1e293b; }
    h2 { font-size: 18px; margin: 20px 0 8px 0; color: #1e293b; }
    p, li { font-size: 14px; line-height: 1.6; margin: 0; }
    .qr-container { display: flex; align-items: center; justify-content: center; margin: 20px 0; }
    .qr-card { text-align: center; border-radius: 16px; border: 2px dashed #c7d2fe; padding: 16px; background: #eef2ff; }
    .qr-card img { width: 440px; height: 440px; object-fit: contain; }
    .footer { margin-top: 28px; text-align: center; font-size: 12px; color: #475569; }
    ol { margin: 8px 0; padding-right: 20px; }
    ul { margin: 8px 0; padding-right: 20px; }
    ol li, ul li { margin-bottom: 6px; }
    .actions-toolbar { position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%); backdrop-filter: blur(12px); border-top: 1px solid rgba(99,102,241,0.3); padding: 16px; display: flex; justify-content: center; gap: 12px; z-index: 9999; }
    .actions-toolbar button { background: #6366f1; color: #ffffff; border: none; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
    .actions-toolbar button:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(99,102,241,0.4); }
    .actions-toolbar button:active { transform: translateY(0); }
    .actions-toolbar button:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
    @media print {
      body { background: #ffffff; }
      .sheet { padding: 10mm; }
      .actions-toolbar { display: none !important; }
    }
    @page { size: A4; margin: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js"></script>
</head>
<body>
  <div class="sheet" id="printable-content">
    <header>
      <p style="font-size:12px; color:#6366f1; margin-bottom: 8px;">${today}</p>
      <h1>بوابة أولياء الأمور للاستئذان - ${schoolName}</h1>
    </header>
    <section>
      <h2>خطوات الاستخدام</h2>
      <ol>
        <li>يقوم ولي الأمر بمسح رمز QR أدناه بكاميرا الجوال.</li>
        <li>إدخال رقم هوية الطالب وآخر 4 أرقام من جوال ولي الأمر المسجل لدى المدرسة.</li>
        <li>مراجعة بيانات الطالب (الاسم، الصف، الفصل) والتأكد من صحتها، ثم اختيار "طلب الاستئذان".</li>
        <li>تعبئة سبب الاستئذان، واسم الشخص الذي سيستلم الطالب، وموعد الانصراف المتوقع.</li>
        <li>إرسال الطلب ومتابعة حالته (بانتظار المراجعة / موافقة / رفض) من نفس الصفحة.</li>
      </ol>
    </section>
    <div class="qr-container">
      <div class="qr-card">
        <img src="${qrDataUrl}" alt="رمز QR لبوابة ولي الأمر" id="qr-image" />
      </div>
    </div>
    <section>
      <h2>ملاحظات مهمة</h2>
      <ul style="list-style: disc;">
        <li>سيتم إشعار الإدارة فور وصول الطلب، وستظهر حالة الطلب بعد المراجعة.</li>
        <li>في حال تعذر إكمال الطلب إلكترونياً، يمكن التواصل مع الإدارة لتقديمه بالنيابة عن ولي الأمر.</li>
        <li>التأكد من دقة أرقام التواصل لتسهيل المتابعة وإرسال الإشعارات.</li>
      </ul>
    </section>
    <footer class="footer">
      تم إعداد هذه الصفحة لأولياء الأمور من خلال نظام المتابعة المدرسية.
    </footer>
  </div>

  <div class="actions-toolbar">
    <button onclick="window.print()">🖨️ طباعة</button>
    <button onclick="downloadAsImage()" id="btn-image">📸 تنزيل كصورة</button>
    <button onclick="downloadAsPDF()" id="btn-pdf">📄 تنزيل PDF</button>
  </div>

  <script>
    async function downloadAsImage() {
      const btn = document.getElementById('btn-image');
      btn.disabled = true;
      btn.textContent = 'جاري التجهيز...';
      try {
        const element = document.getElementById('printable-content');
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123
        });
        const link = document.createElement('a');
        link.download = 'تعليمات_الاستئذان_${schoolName.replace(/\s+/g, '_')}.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        alert('حدث خطأ أثناء تصدير الصورة');
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = '📸 تنزيل كصورة';
      }
    }

    async function downloadAsPDF() {
      const btn = document.getElementById('btn-pdf');
      btn.disabled = true;
      btn.textContent = 'جاري التجهيز...';
      try {
        const { jsPDF } = window.jspdf;
        const element = document.getElementById('printable-content');
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('تعليمات_الاستئذان_${schoolName.replace(/\s+/g, '_')}.pdf');
      } catch (err) {
        alert('حدث خطأ أثناء تصدير PDF');
        console.error(err);
      } finally {
        btn.disabled = false;
        btn.textContent = '📄 تنزيل PDF';
      }
    }
  </script>
</body>
</html>
      `

      printWindow.document.open()
      printWindow.document.write(finalHtml)
      printWindow.document.close()
      printWindow.focus()
    } catch (error) {
      console.error(error)
      printWindow.document.open()
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>حدث خطأ</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #fef2f2; color: #7f1d1d; margin: 0; padding: 32px; }
              .error { max-width: 540px; margin: 0 auto; background: #fee2e2; border: 1px solid #fecaca; border-radius: 16px; padding: 32px; text-align: center; }
              h1 { font-size: 22px; margin-bottom: 12px; }
              p { font-size: 15px; line-height: 1.7; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>تعذر تجهيز صفحة الطباعة</h1>
              <p>حدث خطأ غير متوقع أثناء إنشاء الصفحة. يرجى إغلاق هذه النافذة والمحاولة مرة أخرى.</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      window.alert('تعذر إنشاء ملف الطباعة، يرجى المحاولة مرة أخرى.')
    } finally {
      setIsGeneratingPrintSheet(false)
    }
  }

  return (
    <WsPage>
      <WsHeader
        title="طلبات الاستئذان"
        badge="خروج الطلاب"
        actions={
          <>
            <YearScopeSelect scope={yearScope} onChange={setYearScope} />
            <WsBtn icon={Printer} onClick={handlePrintGuardianSheet} disabled={isGeneratingPrintSheet}>
              {isGeneratingPrintSheet ? 'جاري التجهيز...' : 'تعليمات أولياء الأمور'}
            </WsBtn>
            <WsBtn icon={RefreshCw} onClick={() => refetch()} disabled={isLoading}>
              تحديث القائمة
            </WsBtn>
            <WsBtn variant="primary" icon={Plus} onClick={() => setCreateDialogOpen(true)}>
              إضافة طلب جديد
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Clock3} label="بانتظار المراجعة:">
              {stats.pending.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={CheckCircle2} label="تمت الموافقة:">
              {stats.approved.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={XCircle} label="مرفوض:">
              {stats.rejected.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={Ban} label="ملغى:">
              {stats.cancelled.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="الحالة" htmlFor="ws-leave-status">
          <WsSelect
            id="ws-leave-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeaveRequestStatus | 'all')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="مصدر الطلب" htmlFor="ws-leave-submitter">
          <WsSelect
            id="ws-leave-submitter"
            value={submittedByFilter}
            onChange={(event) => setSubmittedByFilter(event.target.value as LeaveRequestSubmittedBy | 'all')}
          >
            {SUBMITTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="من تاريخ" htmlFor="ws-leave-from">
          <WsInput id="ws-leave-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </WsField>

        <WsField label="إلى تاريخ" htmlFor="ws-leave-to">
          <WsInput id="ws-leave-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </WsField>
      </WsToolbar>

      {isError && (
        <WsAlert>
          تعذر تحميل البيانات.
          <WsBtn size="sm" icon={RefreshCw} onClick={() => refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}

      <WsLayout>
        <WsMain>
          <WsBlock title="الطلبات" icon={DoorOpen} count={requests.length.toLocaleString('ar-SA-u-nu-latn')} fill>
            {isLoading ? (
              <WsEmpty loading>جاري تحميل طلبات الاستئذان...</WsEmpty>
            ) : requests.length === 0 ? (
              <WsEmpty icon={Inbox}>
                لا توجد طلبات استئذان مطابقة للمرشحات الحالية.
                <YearScopeEmptyNote scope={yearScope} onShowAll={() => setYearScope('all')} />
              </WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>موعد الانصراف</th>
                    <th>المستلم</th>
                    <th>المصدر</th>
                    <th>الحالة</th>
                    <th>تاريخ الطلب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const isSelected = request.id === selectedRequest?.id
                    return (
                      <tr
                        key={request.id}
                        onClick={() => setSelectedRequest(request)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{request.student.name}</span>
                          <span className="ws-cell-sub">
                            {request.student.grade} • {request.student.class_name}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(request.expected_pickup_time)}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{request.pickup_person_name}</span>
                          <span className="ws-cell-sub">
                            {request.pickup_person_relation || '—'} • {request.pickup_person_phone || '—'}
                          </span>
                        </td>
                        <td>
                          <WsChip tone={request.submitted_by_type === 'guardian' ? 'sky' : undefined} icon={UserRound}>
                            {SUBMITTER_LABELS[request.submitted_by_type]}
                          </WsChip>
                          {request.submitted_by_type === 'admin' && request.submitted_by_admin ? (
                            <span className="ws-cell-sub">{request.submitted_by_admin.name}</span>
                          ) : null}
                        </td>
                        <td>
                          <StatusChip status={request.status} />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(request.created_at)}</td>
                        <td onClick={(event) => event.stopPropagation()}>
                          {request.status === 'pending' ? (
                            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                              <WsBtn size="sm" icon={CheckCircle2} onClick={() => setActionDialog({ type: 'approve', request })}>
                                اعتماد
                              </WsBtn>
                              <WsBtn size="sm" icon={XCircle} onClick={() => setActionDialog({ type: 'reject', request })}>
                                رفض
                              </WsBtn>
                              <WsBtn size="sm" icon={Ban} onClick={() => setActionDialog({ type: 'cancel', request })}>
                                إلغاء
                              </WsBtn>
                            </span>
                          ) : request.status === 'approved' ? (
                            <WsBtn size="sm" icon={Ban} onClick={() => setActionDialog({ type: 'cancel', request })}>
                              إلغاء الموافقة
                            </WsBtn>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>لا توجد إجراءات</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}

            {/* ترقيم الصفحات — شريط مدمج أسفل الجدول */}
            {totalPages > 1 && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderTop: '1px solid var(--ws-hairline)',
                }}
              >
                <WsBtn size="sm" icon={ChevronRight} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  السابق
                </WsBtn>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(0, 10)
                  .map((pageNumber) => (
                    <WsBtn
                      key={pageNumber}
                      size="sm"
                      variant={pageNumber === Math.min(page, totalPages) ? 'primary' : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </WsBtn>
                  ))}
                <WsBtn
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  التالي
                </WsBtn>
              </div>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol title="تفاصيل الطلب" icon={ListChecks} storageKey="ws:leave-requests:sidecol">
          {selectedRequest ? (
            <>
              <WsBlock padded>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{selectedRequest.student.name}</span>
                  <StatusChip status={selectedRequest.status} />
                </div>
                <WsFactsList>
                  <WsFactRow label="الصف والفصل">
                    {selectedRequest.student.grade} • {selectedRequest.student.class_name}
                  </WsFactRow>
                  <WsFactRow label="رقم الهوية">{selectedRequest.student.national_id || '—'}</WsFactRow>
                  <WsFactRow label="موعد الانصراف">{formatDateTime(selectedRequest.expected_pickup_time)}</WsFactRow>
                  <WsFactRow label="تاريخ الطلب">{formatDateTime(selectedRequest.created_at)}</WsFactRow>
                </WsFactsList>
              </WsBlock>

              <WsBlock title="سبب الاستئذان" padded>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedRequest.reason}
                </p>
              </WsBlock>

              <WsBlock title="ولي الأمر والمستلم" padded>
                <WsFactsList>
                  <WsFactRow label="ولي الأمر">{selectedRequest.guardian_name || '—'}</WsFactRow>
                  <WsFactRow label="هاتفه">{selectedRequest.guardian_phone || '—'}</WsFactRow>
                  <WsFactRow label="المستلم">{selectedRequest.pickup_person_name}</WsFactRow>
                  <WsFactRow label="الصلة والهاتف">
                    {selectedRequest.pickup_person_relation || '—'} • {selectedRequest.pickup_person_phone || '—'}
                  </WsFactRow>
                </WsFactsList>
              </WsBlock>

              <WsBlock title="قرار الإدارة" padded fill style={{ background: 'var(--ws-accent-softer)' }}>
                <WsFactsList>
                  <WsFactRow label="القرار بواسطة">
                    {selectedRequest.decision_by_admin ? selectedRequest.decision_by_admin.name : 'بانتظار القرار'}
                  </WsFactRow>
                  <WsFactRow label="تاريخ القرار">
                    {selectedRequest.decision_at ? formatDateTime(selectedRequest.decision_at) : '—'}
                  </WsFactRow>
                </WsFactsList>
                {selectedRequest.decision_notes ? (
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 12,
                      lineHeight: 1.7,
                      padding: '6px 10px',
                      background: 'var(--ws-surface)',
                      border: '1px solid var(--ws-hairline)',
                      borderRadius: 7,
                    }}
                  >
                    {selectedRequest.decision_notes}
                  </p>
                ) : null}
              </WsBlock>
            </>
          ) : (
            <WsEmpty icon={Info}>اختر طلباً من الجدول لعرض تفاصيل الاستئذان.</WsEmpty>
          )}
        </WsSideCol>
      </WsLayout>

      <CreateLeaveRequestDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createMutation.isPending}
        students={studentsQuery.data}
        isLoadingStudents={studentsQuery.isLoading}
        onRefreshStudents={() => studentsQuery.refetch()}
      />

      <DecisionDialog
        state={actionDialog}
        onClose={() => setActionDialog(null)}
        onConfirm={handleActionConfirm}
        isSubmitting={isActionSubmitting}
      />
    </WsPage>
  )
}

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

const STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
}

const STATUS_STYLES: Record<LeaveRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
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
    return new Intl.DateTimeFormat('ar-SA', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA', options)
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function DetailsCard({ request }: { request: LeaveRequestRecord | null }) {
  if (!request) {
    return (
      <aside className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
        <p>اختر طلباً من الجدول لعرض تفاصيل الاستئذان.</p>
      </aside>
    )
  }

  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">الطالب</p>
          <h3 className="text-lg font-bold text-slate-900">{request.student.name}</h3>
          <p className="text-sm text-muted">
            {request.student.grade} • {request.student.class_name} • هوية {request.student.national_id || '—'}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </header>

      <section className="rounded-2xl bg-slate-50/80 p-4 text-right">
        <p className="text-xs font-semibold text-slate-500">سبب الاستئذان</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.reason}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm">
          <p className="text-xs font-semibold text-slate-500">ولي الأمر</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.guardian_name || '—'}</p>
          <p className="text-xs text-muted">{request.guardian_phone || '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm">
          <p className="text-xs font-semibold text-slate-500">من سيستلم الطالب</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{request.pickup_person_name}</p>
          <p className="text-xs text-muted">{request.pickup_person_relation || '—'} • {request.pickup_person_phone || '—'}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm">
          <p className="text-xs font-semibold text-slate-500">موعد الانصراف المتوقع</p>
          <p className="mt-1 text-sm text-slate-900">{formatDateTime(request.expected_pickup_time)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm">
          <p className="text-xs font-semibold text-slate-500">تاريخ الطلب</p>
          <p className="mt-1 text-sm text-slate-900">{formatDateTime(request.created_at)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-right">
        <p className="text-xs font-semibold text-indigo-600">قرار الإدارة</p>
        <p className="mt-1 text-sm text-slate-800">
          {request.decision_by_admin ? `${request.decision_by_admin.name}` : 'بانتظار القرار'}
        </p>
        <p className="text-xs text-muted">
          {request.decision_at ? formatDateTime(request.decision_at) : '—'}
        </p>
        {request.decision_notes ? (
          <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            {request.decision_notes}
          </p>
        ) : null}
      </section>
    </aside>
  )
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
    status: 'pending',
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
      status: 'pending',
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

  const studentOptions = (students ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'))

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <form
        className="relative w-full max-w-3xl rounded-3xl bg-white p-6 text-right shadow-xl"
        onSubmit={handleSubmit}
        noValidate
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-5 top-5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
          disabled={isSubmitting}
        >
          إغلاق
        </button>

        <header className="mb-6 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">طلب استئذان جديد</p>
          <h2 className="text-2xl font-bold text-slate-900">سجّل إذن خروج لطالب وحدد المسؤولين عنه</h2>
          <p className="text-sm text-muted">
            اختر الطالب، عرّف المستلم من المدرسة، وحدد وقت الانصراف المتوقع. يمكن اعتماد الطلب مباشرة أثناء الإنشاء.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">الطالب</label>
              <div className="flex items-center gap-2">
                <select
                  value={values.student_id}
                  onChange={(event) => handleChange('student_id', Number(event.target.value) || '')}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.student_id ? 'border-rose-300' : 'border-slate-200'}`}
                  disabled={isSubmitting || isLoadingStudents}
                >
                  <option value="">اختر الطالب</option>
                  {studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} • {student.class_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onRefreshStudents}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                  disabled={isSubmitting}
                >
                  تحديث
                </button>
              </div>
              {errors.student_id ? <p className="text-xs text-rose-600">{errors.student_id}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">سبب الاستئذان</label>
              <textarea
                value={values.reason}
                onChange={(event) => handleChange('reason', event.target.value)}
                rows={4}
                className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.reason ? 'border-rose-300' : 'border-slate-200'}`}
                placeholder="مثال: مراجعة طبية في مستشفى المدينة"
                disabled={isSubmitting}
              />
              {errors.reason ? <p className="text-xs text-rose-600">{errors.reason}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">موعد الانصراف</label>
              <input
                type="datetime-local"
                value={values.expected_pickup_time}
                onChange={(event) => handleChange('expected_pickup_time', event.target.value)}
                className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.expected_pickup_time ? 'border-rose-300' : 'border-slate-200'}`}
                disabled={isSubmitting}
              />
              {errors.expected_pickup_time ? <p className="text-xs text-rose-600">{errors.expected_pickup_time}</p> : null}
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">ولي الأمر</label>
                <input
                  type="text"
                  value={values.guardian_name}
                  onChange={(event) => handleChange('guardian_name', event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.guardian_name ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="اسم ولي الأمر"
                  disabled={isSubmitting}
                />
                {errors.guardian_name ? <p className="text-xs text-rose-600">{errors.guardian_name}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">هاتف ولي الأمر</label>
                <input
                  type="tel"
                  value={values.guardian_phone}
                  onChange={(event) => handleChange('guardian_phone', event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.guardian_phone ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="05xxxxxxxx"
                  disabled={isSubmitting}
                />
                {errors.guardian_phone ? <p className="text-xs text-rose-600">{errors.guardian_phone}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">اسم المستلم</label>
                <input
                  type="text"
                  value={values.pickup_person_name}
                  onChange={(event) => handleChange('pickup_person_name', event.target.value)}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.pickup_person_name ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="اسم الشخص الذي سيستلم الطالب"
                  disabled={isSubmitting}
                />
                {errors.pickup_person_name ? <p className="text-xs text-rose-600">{errors.pickup_person_name}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">صلة القرابة</label>
                <input
                  type="text"
                  value={values.pickup_person_relation}
                  onChange={(event) => handleChange('pickup_person_relation', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="مثال: الأب / العم"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">هاتف المستلم</label>
              <input
                type="tel"
                value={values.pickup_person_phone}
                onChange={(event) => handleChange('pickup_person_phone', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="رقم للتواصل"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">حالة الطلب عند الإنشاء</label>
              <select
                value={values.status}
                onChange={(event) => handleChange('status', event.target.value as LeaveRequestStatus)}
                className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.status ? 'border-rose-300' : 'border-slate-200'}`}
                disabled={isSubmitting}
              >
                <option value="pending">بانتظار الموافقة</option>
                <option value="approved">معتمد فوراً</option>
              </select>
            </div>

            {values.status === 'approved' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">ملاحظات القرار</label>
                <textarea
                  value={values.decision_notes}
                  onChange={(event) => handleChange('decision_notes', event.target.value)}
                  rows={3}
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.decision_notes ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="مثال: تم التحقق من الاتصال بولي الأمر"
                  disabled={isSubmitting}
                />
                {errors.decision_notes ? <p className="text-xs text-rose-600">{errors.decision_notes}</p> : null}
              </div>
            ) : null}
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب'}
          </button>
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isReject && !notes.trim()) {
      setError('سبب الرفض مطلوب')
      return
    }
    setError(null)
    await onConfirm(notes.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" role="dialog">
      <form className="w-full max-w-lg rounded-3xl bg-white p-6 text-right shadow-xl" onSubmit={handleSubmit}>
        <header className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{title}</p>
          <h3 className="text-xl font-bold text-slate-900">{state.request.student.name}</h3>
          <p className="text-sm text-muted">{description}</p>
        </header>

        <section className="space-y-2">
          <label className="text-xs font-semibold text-slate-600" htmlFor="decision-notes">
            الملاحظات
          </label>
          <textarea
            id="decision-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={isReject ? 4 : 3}
            placeholder={isReject ? 'اذكر سبب الرفض بالتفصيل' : 'أضف ملاحظات للقرار (اختياري)'}
            className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${error ? 'border-rose-300' : 'border-slate-200'}`}
            disabled={isSubmitting}
          />
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </section>

        <footer className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            disabled={isSubmitting}
          >
            تراجع
          </button>
          <button
            type="submit"
            className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed ${
              state.type === 'approve'
                ? 'bg-emerald-600 disabled:bg-emerald-300'
                : isReject
                  ? 'bg-rose-600 disabled:bg-rose-300'
                  : 'bg-slate-500 disabled:bg-slate-300'
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري التنفيذ...' : state.type === 'approve' ? 'اعتماد' : isReject ? 'رفض' : 'إلغاء'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function LeaveRequestsTable({
  requests,
  onSelect,
  selectedId,
  onApprove,
  onReject,
  onCancel,
}: {
  requests: LeaveRequestRecord[]
  selectedId: number | null
  onSelect: (request: LeaveRequestRecord) => void
  onApprove: (request: LeaveRequestRecord) => void
  onReject: (request: LeaveRequestRecord) => void
  onCancel: (request: LeaveRequestRecord) => void
}) {
  if (!requests.length) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 text-center text-sm text-muted">
        <i className="bi bi-inbox text-3xl text-slate-300" />
        لا توجد طلبات استئذان مطابقة للمرشحات الحالية.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-right text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">الطالب</th>
            <th className="px-4 py-3">موعد الانصراف</th>
            <th className="px-4 py-3">المستلم</th>
            <th className="px-4 py-3">المصدر</th>
            <th className="px-4 py-3">الحالة</th>
            <th className="px-4 py-3">تاريخ الطلب</th>
            <th className="px-4 py-3">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => {
            const isSelected = request.id === selectedId
            return (
              <tr
                key={request.id}
                className={`transition hover:bg-indigo-50/40 ${isSelected ? 'bg-indigo-50/40' : 'bg-white'}`}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(request)}
                    className="text-right"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{request.student.name}</p>
                      <p className="text-xs text-muted">
                        {request.student.grade} • {request.student.class_name}
                      </p>
                      <p className="text-xs text-muted">سبب: {request.reason.slice(0, 80)}{request.reason.length > 80 ? '…' : ''}</p>
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(request.expected_pickup_time)}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{request.pickup_person_name}</p>
                    <p>{request.pickup_person_relation || '—'}</p>
                    <p>{request.pickup_person_phone || '—'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {SUBMITTER_LABELS[request.submitted_by_type]}
                  {request.submitted_by_type === 'admin' && request.submitted_by_admin ? (
                    <span className="block text-[11px] text-slate-400">{request.submitted_by_admin.name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(request.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(request)}
                          className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 transition hover:bg-emerald-200"
                        >
                          اعتماد
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(request)}
                          className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          رفض
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancel(request)}
                          className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-200"
                        >
                          إلغاء
                        </button>
                      </>
                    ) : request.status === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => onCancel(request)}
                        className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        إلغاء الموافقة
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted">لا توجد إجراءات</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 10)
  const clampedCurrent = Math.min(currentPage, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold text-slate-600">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, clampedCurrent - 1))}
        className="rounded-full border border-slate-200 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-600"
        disabled={clampedCurrent === 1}
      >
        السابق
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`rounded-full px-3 py-1 transition ${
            page === clampedCurrent
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, clampedCurrent + 1))}
        className="rounded-full border border-slate-200 px-3 py-1 transition hover:border-indigo-200 hover:text-indigo-600"
        disabled={clampedCurrent === totalPages}
      >
        التالي
      </button>
    </div>
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

  useEffect(() => {
    setPage(1)
  }, [statusFilter, submittedByFilter, fromDate, toDate])

  const filters = useMemo<LeaveRequestFilters>(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      submitted_by_type: submittedByFilter === 'all' ? undefined : submittedByFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      page,
      per_page: PAGE_SIZE,
    }),
    [fromDate, page, statusFilter, submittedByFilter, toDate],
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
  }, [requests])

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

      const today = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date())

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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 text-right">
          <h1 className="text-2xl font-bold text-slate-900">طلبات الاستئذان</h1>
          <p className="text-sm text-muted">تابع طلبات خروج الطلاب واعتمدها أو ارفضها بملاحظات واضحة.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintGuardianSheet}
            className="rounded-2xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isGeneratingPrintSheet}
          >
            {isGeneratingPrintSheet ? 'جاري تجهيز الصفحة...' : 'طباعة تعليمات أولياء الأمور'}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            disabled={isLoading}
          >
            تحديث القائمة
          </button>
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            إضافة طلب جديد
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        {(Object.keys(stats) as LeaveRequestStatus[]).map((status) => (
          <article key={status} className="rounded-3xl border border-slate-100 bg-white/70 p-4 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{STATUS_LABELS[status]}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats[status].toLocaleString('ar-SA')}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">الحالة</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LeaveRequestStatus | 'all')}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">مصدر الطلب</label>
            <select
              value={submittedByFilter}
              onChange={(event) => setSubmittedByFilter(event.target.value as LeaveRequestSubmittedBy | 'all')}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {SUBMITTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">الصفحة</label>
            <input
              type="number"
              min={1}
              value={page}
              onChange={(event) => setPage(Math.max(1, Number(event.target.value) || 1))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 text-sm text-muted">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              جاري تحميل طلبات الاستئذان...
            </div>
          ) : isError ? (
            <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-rose-200 bg-rose-50/70 text-center text-sm text-rose-700">
              <i className="bi bi-exclamation-triangle text-3xl" />
              تعذر تحميل البيانات
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <LeaveRequestsTable
              requests={requests}
              selectedId={selectedRequest?.id ?? null}
              onSelect={setSelectedRequest}
              onApprove={(request) => setActionDialog({ type: 'approve', request })}
              onReject={(request) => setActionDialog({ type: 'reject', request })}
              onCancel={(request) => setActionDialog({ type: 'cancel', request })}
            />
          )}

          <PaginationControls currentPage={page} totalPages={totalPages} onChange={setPage} />
        </div>

        <DetailsCard request={selectedRequest} />
      </div>

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
    </div>
  )
}

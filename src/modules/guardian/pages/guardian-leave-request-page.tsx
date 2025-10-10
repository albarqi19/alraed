import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useGuardianLeaveRequestSubmissionMutation,
  useGuardianLeaveRequestsQuery,
  useGuardianStudentLookupMutation,
} from '../hooks'
import type { GuardianLeaveRequestRecord, GuardianStudentSummary } from '../types'

const STATUS_LABELS = {
  pending: 'بانتظار المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
} as const

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
} as const

type StatusKey = keyof typeof STATUS_LABELS

type FormValues = {
  guardian_name: string
  guardian_phone: string
  reason: string
  pickup_person_name: string
  pickup_person_relation: string
  pickup_person_phone: string
  expected_pickup_time: string
}

type FormErrors = Partial<Record<keyof FormValues, string>> & { national_id?: string }

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function normalizeDateTimeInput(value: string) {
  if (!value) return value
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return value
  const [hours = '00', minutes = '00'] = timePart.split(':')
  const normalizedHours = hours.padStart(2, '0')
  const normalizedMinutes = minutes.padStart(2, '0')
  return `${datePart} ${normalizedHours}:${normalizedMinutes}:00`
}

function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function RequestsList({ requests }: { requests: GuardianLeaveRequestRecord[] }) {
  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
        لا توجد طلبات سابقة، يمكنك إرسال طلب جديد الآن.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">طلب رقم #{request.id}</h3>
            <StatusBadge status={request.status as StatusKey} />
          </header>

          <p className="text-sm text-slate-700">{request.reason}</p>

          <dl className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-500">موعد الانصراف</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(request.expected_pickup_time)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">تاريخ التقديم</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(request.submitted_at)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">قرار الإدارة</dt>
              <dd className="mt-1 text-slate-800">{request.decision_notes ? request.decision_notes : 'بانتظار القرار'}</dd>
            </div>
          </dl>

          {request.decision_at ? (
            <p className="mt-3 text-xs text-muted">تاريخ القرار: {formatDateTime(request.decision_at)}</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function GuardianLeaveRequestPage() {
  const [nationalIdInput, setNationalIdInput] = useState('')
  const [currentNationalId, setCurrentNationalId] = useState<string | null>(null)
  const [studentSummary, setStudentSummary] = useState<GuardianStudentSummary | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({
    guardian_name: '',
    guardian_phone: '',
    reason: '',
    pickup_person_name: '',
    pickup_person_relation: '',
    pickup_person_phone: '',
    expected_pickup_time: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const lookupMutation = useGuardianStudentLookupMutation()
  const requestsQuery = useGuardianLeaveRequestsQuery(currentNationalId)
  const submitMutation = useGuardianLeaveRequestSubmissionMutation()

  const requests = requestsQuery.data ?? []
  const isLoadingRequests = requestsQuery.isFetching
  const requestsErrorMessage = requestsQuery.isError
    ? resolveErrorMessage(requestsQuery.error, 'تعذر تحميل طلبات الاستئذان السابقة')
    : null

  useEffect(() => {
    if (!studentSummary) {
      return
    }
    setFormValues((previous) => ({
      ...previous,
      guardian_name: studentSummary.parent_name,
      guardian_phone: studentSummary.parent_phone,
    }))
  }, [studentSummary])

  const hasStudent = Boolean(studentSummary && currentNationalId)

  const studentCard = useMemo(() => {
    if (!studentSummary) {
      return null
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">الطالب</p>
            <h2 className="text-lg font-bold text-slate-900">{studentSummary.name}</h2>
            <p className="text-xs text-muted">
              الصف {studentSummary.grade} • الفصل {studentSummary.class_name}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600">
            رقم هوية الطالب: {currentNationalId}
          </div>
        </header>
        <section className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <p className="font-semibold text-slate-500">اسم ولي الأمر</p>
            <p className="mt-1 text-sm text-slate-800">{studentSummary.parent_name}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <p className="font-semibold text-slate-500">هاتف ولي الأمر</p>
            <p className="mt-1 text-sm text-slate-800">{studentSummary.parent_phone}</p>
          </div>
        </section>
      </div>
    )
  }, [studentSummary, currentNationalId])

  function validateForm(): FormErrors | null {
    if (!currentNationalId) {
      return { national_id: 'يرجى التحقق من رقم الهوية قبل إرسال الطلب' }
    }

    const errors: FormErrors = {}

    if (!formValues.guardian_name.trim()) {
      errors.guardian_name = 'هذا الحقل مطلوب'
    }
    if (!formValues.guardian_phone.trim()) {
      errors.guardian_phone = 'هذا الحقل مطلوب'
    }
    if (!formValues.reason.trim()) {
      errors.reason = 'يرجى كتابة سبب الاستئذان'
    }
    if (!formValues.pickup_person_name.trim()) {
      errors.pickup_person_name = 'يرجى إدخال اسم الشخص الذي سيستلم الطالب'
    }
    if (!formValues.expected_pickup_time) {
      errors.expected_pickup_time = 'حدد موعد الانصراف المتوقع'
    }

    return Object.keys(errors).length ? errors : null
  }

  function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nationalId = nationalIdInput.trim()
    if (!nationalId) {
      setFormErrors({ national_id: 'يرجى إدخال رقم هوية الطالب المكون من 10 أرقام' })
      return
    }

    setFormErrors({})
    lookupMutation.mutate(nationalId, {
      onSuccess: (summary) => {
        setStudentSummary(summary)
        setCurrentNationalId(nationalId)
      },
      onError: () => {
        setStudentSummary(null)
        setCurrentNationalId(null)
      },
    })
  }

  function handleFormChange<Field extends keyof FormValues>(field: Field, value: FormValues[Field]) {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateForm()
    if (validation) {
      setFormErrors(validation)
      return
    }

    if (!currentNationalId) {
      setFormErrors({ national_id: 'يرجى التحقق من الطالب قبل إرسال الطلب' })
      return
    }

    setFormErrors({})

    const payload = {
      national_id: currentNationalId,
      guardian_name: formValues.guardian_name.trim(),
      guardian_phone: formValues.guardian_phone.trim(),
      reason: formValues.reason.trim(),
      pickup_person_name: formValues.pickup_person_name.trim(),
      pickup_person_relation: formValues.pickup_person_relation.trim() || null,
      pickup_person_phone: formValues.pickup_person_phone.trim() || null,
      expected_pickup_time: normalizeDateTimeInput(formValues.expected_pickup_time),
    }

    try {
      await submitMutation.mutateAsync(payload)
      setFormValues((previous) => ({
        ...previous,
        reason: '',
        pickup_person_name: '',
        pickup_person_relation: '',
        pickup_person_phone: '',
        expected_pickup_time: '',
      }))
    } catch (error) {
      console.error('فشل إرسال طلب الاستئذان', error)
    }
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold text-slate-900">طلب الاستئذان لولي الأمر</h1>
        <p className="mx-auto max-w-2xl text-sm text-muted">
          يمكن لولي الأمر تقديم طلب استئذان للطالب بإدخال رقم الهوية الوطنية، ثم تعبئة تفاصيل الطلب وإرساله للمراجعة.
        </p>
      </header>

      <div className="glass-card space-y-6">
        <form className="space-y-3" onSubmit={handleLookupSubmit}>
          <label className="block text-right text-xs font-semibold text-slate-600">رقم هوية الطالب</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.national_id ? 'border-rose-300' : 'border-slate-200'}`}
              placeholder="أدخل رقم هوية الطالب"
              value={nationalIdInput}
              onChange={(event) => setNationalIdInput(event.target.value)}
              disabled={lookupMutation.isPending}
            />
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={lookupMutation.isPending}
            >
              {lookupMutation.isPending ? 'جاري التحميل...' : 'تحقق من البيانات'}
            </button>
          </div>
          {formErrors.national_id ? <p className="text-xs text-rose-600">{formErrors.national_id}</p> : null}
        </form>

        {studentCard}
      </div>

      {hasStudent ? (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <form className="glass-card space-y-5" onSubmit={handleSubmit}>
            <header className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">إرسال طلب جديد</h2>
              <p className="text-xs text-muted">يرجى تعبئة جميع الحقول الإلزامية لإرسال الطلب.</p>
            </header>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">سبب الاستئذان *</label>
              <textarea
                className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.reason ? 'border-rose-300' : 'border-slate-200'}`}
                rows={4}
                value={formValues.reason}
                onChange={(event) => handleFormChange('reason', event.target.value)}
                placeholder="مثال: موعد طبي عاجل"
                disabled={submitMutation.isPending}
              />
              {formErrors.reason ? <p className="text-xs text-rose-600">{formErrors.reason}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">اسم ولي الأمر *</label>
                <input
                  type="text"
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.guardian_name ? 'border-rose-300' : 'border-slate-200'}`}
                  value={formValues.guardian_name}
                  onChange={(event) => handleFormChange('guardian_name', event.target.value)}
                  disabled={submitMutation.isPending}
                />
                {formErrors.guardian_name ? <p className="text-xs text-rose-600">{formErrors.guardian_name}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">هاتف ولي الأمر *</label>
                <input
                  type="tel"
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.guardian_phone ? 'border-rose-300' : 'border-slate-200'}`}
                  value={formValues.guardian_phone}
                  onChange={(event) => handleFormChange('guardian_phone', event.target.value)}
                  disabled={submitMutation.isPending}
                />
                {formErrors.guardian_phone ? <p className="text-xs text-rose-600">{formErrors.guardian_phone}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">اسم المستلم *</label>
                <input
                  type="text"
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.pickup_person_name ? 'border-rose-300' : 'border-slate-200'}`}
                  value={formValues.pickup_person_name}
                  onChange={(event) => handleFormChange('pickup_person_name', event.target.value)}
                  disabled={submitMutation.isPending}
                />
                {formErrors.pickup_person_name ? <p className="text-xs text-rose-600">{formErrors.pickup_person_name}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">صلة القرابة</label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formValues.pickup_person_relation}
                  onChange={(event) => handleFormChange('pickup_person_relation', event.target.value)}
                  disabled={submitMutation.isPending}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">هاتف المستلم</label>
                <input
                  type="tel"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={formValues.pickup_person_phone}
                  onChange={(event) => handleFormChange('pickup_person_phone', event.target.value)}
                  disabled={submitMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">موعد الانصراف المتوقع *</label>
                <input
                  type="datetime-local"
                  className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.expected_pickup_time ? 'border-rose-300' : 'border-slate-200'}`}
                  value={formValues.expected_pickup_time}
                  onChange={(event) => handleFormChange('expected_pickup_time', event.target.value)}
                  disabled={submitMutation.isPending}
                />
                {formErrors.expected_pickup_time ? (
                  <p className="text-xs text-rose-600">{formErrors.expected_pickup_time}</p>
                ) : null}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="submit"
                className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </footer>
          </form>

          <aside className="glass-card space-y-4">
            <header>
              <h2 className="text-lg font-semibold text-slate-900">الطلبات السابقة</h2>
              <p className="text-xs text-muted">يمكنك متابعة حالة طلبات الاستئذان السابقة.</p>
            </header>

            {isLoadingRequests ? (
              <p className="text-sm text-muted">جاري تحميل الطلبات...</p>
            ) : requestsErrorMessage ? (
              <p className="text-sm text-rose-600">{requestsErrorMessage}</p>
            ) : (
              <RequestsList requests={requests} />
            )}
          </aside>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
          يرجى إدخال رقم الهوية للتحقق من بيانات الطالب قبل إرسال الطلب.
        </div>
      )}
    </section>
  )
}

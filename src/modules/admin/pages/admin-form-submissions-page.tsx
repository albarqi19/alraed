import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useAdminForm,
  useAdminFormSubmissions,
  useReviewAdminSubmissionMutation,
} from '@/modules/forms/hooks'
import type { FormSubmission } from '@/modules/forms/types'

const STATUS_LABELS: Record<FormSubmission['status'], string> = {
  draft: 'مسودة',
  submitted: 'تم الإرسال',
  reviewed: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

type StatusFilter = FormSubmission['status'] | 'all'

function formatDate(value?: string | null) {
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

export function AdminFormSubmissionsPage() {
  const params = useParams()
  const navigate = useNavigate()
  const formId = Number(params.formId)
  const invalidFormId = !Number.isFinite(formId)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [guardianPhoneInput, setGuardianPhoneInput] = useState('')
  const [guardianPhoneFilter, setGuardianPhoneFilter] = useState<string | undefined>()

  useEffect(() => {
    if (invalidFormId) {
      navigate('/admin/forms')
    }
  }, [invalidFormId, navigate])

  if (invalidFormId) {
    return null
  }

  const formQuery = useAdminForm(formId)
  const submissionsQuery = useAdminFormSubmissions(formId, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    guardian_phone: guardianPhoneFilter,
    page,
    per_page: 20,
  })
  const reviewMutation = useReviewAdminSubmissionMutation(formId)

  const submissions = submissionsQuery.data?.data ?? []
  const meta = submissionsQuery.data?.meta

  const statusSummary = useMemo(() => {
    const counts: Partial<Record<FormSubmission['status'], number>> = {}
    submissions.forEach((submission) => {
      counts[submission.status] = (counts[submission.status] ?? 0) + 1
    })
    return counts
  }, [submissions])

  const handleStatusFilterChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const handleGuardianFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = guardianPhoneInput.trim()
    setGuardianPhoneFilter(trimmed.length > 0 ? trimmed : undefined)
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
      setPage((prev) => prev - 1)
    }
    if (direction === 'next' && meta.last_page && page < meta.last_page) {
      setPage((prev) => prev + 1)
    }
  }

  const handleReviewAction = async (
    submissionId: number,
    status: Extract<FormSubmission['status'], 'approved' | 'rejected' | 'reviewed'>,
  ) => {
    let reviewNotes: string | undefined
    if (status === 'rejected') {
      const input = window.prompt('يمكنك إدخال سبب الرفض (اختياري):', '')
      reviewNotes = input ? input.trim() : undefined
    }

    try {
      await reviewMutation.mutateAsync({ submissionId, status, review_notes: reviewNotes })
    } catch {
      // Toast handled inside mutation hook
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">ردود النموذج</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {formQuery.data?.title ?? 'سجل الردود'}
          </h1>
          <p className="text-sm text-muted">
            تابع حالة الطلبات والردود المرسلة من أولياء الأمور أو من النظام الداخلي.
          </p>
        </div>
        <Link
          to={`/admin/forms/${formId}`}
          className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
        >
          الرجوع إلى إعداد النموذج
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="إجمالي الردود" value={meta?.total ?? submissions.length} tone="bg-slate-50 text-slate-700 border-slate-200" />
        <SummaryCard title="تم الاعتماد" value={statusSummary.approved ?? 0} tone="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <SummaryCard title="مرفوض" value={statusSummary.rejected ?? 0} tone="bg-rose-50 text-rose-700 border-rose-200" />
        <SummaryCard title="بانتظار المراجعة" value={(statusSummary.submitted ?? 0) + (statusSummary.reviewed ?? 0)} tone="bg-amber-50 text-amber-700 border-amber-200" />
      </section>

      <div className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">قائمة الردود</h2>
            <p className="text-xs text-muted">استخدم الفلاتر للبحث عن ردود محددة حسب الحالة أو رقم ولي الأمر.</p>
          </div>
          <form onSubmit={handleGuardianFilterSubmit} className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="tel"
              value={guardianPhoneInput}
              onChange={(event) => setGuardianPhoneInput(event.target.value)}
              className="h-10 w-40 rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="رقم ولي الأمر"
            />
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              بحث
            </button>
            <button
              type="button"
              onClick={handleClearGuardianFilter}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              تصفية الكل
            </button>
          </form>
        </header>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {(['all', 'submitted', 'reviewed', 'approved', 'rejected'] as StatusFilter[]).map((status) => {
            const isActive = statusFilter === status
            return (
              <button
                type="button"
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={`rounded-full border px-4 py-2 transition ${
                  isActive ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {status === 'all' ? 'كل الحالات' : STATUS_LABELS[status]}
              </button>
            )
          })}
        </div>

        {submissionsQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-muted">
            لا توجد ردود مطابقة للفلتر الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الطالب</th>
                  <th className="px-4 py-3 text-right font-semibold">ولي الأمر</th>
                  <th className="px-4 py-3 text-right font-semibold">تاريخ الإرسال</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">ملاحظات</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900">{submission.student_id ? `طالب #${submission.student_id}` : '—'}</p>
                        <p className="text-xs text-muted">هوية: {submission.student_national_id ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900">{submission.guardian_name ?? '—'}</p>
                        <p className="text-xs text-muted">{submission.guardian_phone ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(submission.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {submission.review_notes ? submission.review_notes : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <select
                        defaultValue=""
                        onChange={async (event) => {
                          const selectElement = event.currentTarget
                          const value = selectElement.value as '' | 'approved' | 'rejected' | 'reviewed'
                          if (!value) return
                          await handleReviewAction(submission.id, value)
                          selectElement.value = ''
                        }}
                        className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                        disabled={reviewMutation.isPending}
                      >
                        <option value="">تغيير الحالة</option>
                        <option value="approved">اعتماد الرد</option>
                        <option value="reviewed">وضع تحت المراجعة</option>
                        <option value="rejected">رفض مع ملاحظة</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
          <span className="font-semibold text-slate-500">
            الصفحة الحالية: {page} / {meta?.last_page ?? 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange('prev')}
              className="rounded-full border border-slate-200 px-4 py-1 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={page <= 1 || submissionsQuery.isLoading}
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => handlePageChange('next')}
              className="rounded-full border border-slate-200 px-4 py-1 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={Boolean(meta?.last_page) ? page >= (meta?.last_page ?? 1) || submissionsQuery.isLoading : submissions.length === 0}
            >
              التالي
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}

interface SummaryCardProps {
  title: string
  value: number
  tone: string
}

function SummaryCard({ title, value, tone }: SummaryCardProps) {
  return (
    <article className={`rounded-2xl border bg-white/80 p-5 shadow-sm ${tone}`}>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value.toLocaleString('en-US')}</p>
    </article>
  )
}

function StatusBadge({ status }: { status: FormSubmission['status'] }) {
  const toneMap: Record<FormSubmission['status'], string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    reviewed: 'bg-sky-50 text-sky-700 border-sky-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[status]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  )
}

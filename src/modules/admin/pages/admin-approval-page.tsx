import { useEffect, useMemo, useState } from 'react'
import {
  useApproveAllPendingSessionsMutation,
  useApproveAttendanceSessionMutation,
  useAttendanceSessionDetailsQuery,
  usePendingApprovalsQuery,
  useRejectAttendanceSessionMutation,
} from '../hooks'
import type { PendingApprovalRecord } from '../types'
import { MissingSessionsModal } from '../components/missing-sessions-modal'

type FilterState = {
  grade: string
  className: string
  teacher: string
  subject: string
}

function SummaryBadge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className={`rounded-2xl px-4 py-4 text-right shadow-sm ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString('ar-SA')}</p>
    </article>
  )
}

interface RejectDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isSubmitting: boolean
}

function RejectDialog({ open, onClose, onConfirm, isSubmitting }: RejectDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">رفض التحضير</p>
          <h2 className="text-xl font-semibold text-slate-900">اذكر سبب الرفض</h2>
          <p className="text-sm text-muted">سيتم مشاركة السبب مع المعلم في شاشة المتابعة.</p>
        </header>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-4 h-32 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          placeholder="مثال: لم يتم توقيع محضر الحصة من المعلم المسؤول"
          disabled={isSubmitting}
        />
        <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() => onConfirm(reason.trim())}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

export function AdminApprovalPage() {
  const [filters, setFilters] = useState<FilterState>({ grade: '', className: '', teacher: '', subject: '' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingApprovalRecord | null>(null)
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false)
  const [showMissingSessionsModal, setShowMissingSessionsModal] = useState(false)

  const approvalsQuery = usePendingApprovalsQuery()
  const approvals = useMemo(() => approvalsQuery.data ?? [], [approvalsQuery.data])

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const matchesGrade = filters.grade ? item.grade.includes(filters.grade) : true
      const matchesClass = filters.className ? item.class_name.includes(filters.className) : true
      const matchesTeacher = filters.teacher ? item.teacher_name.includes(filters.teacher) : true
      const matchesSubject = filters.subject ? item.subject_name.includes(filters.subject) : true
      return matchesGrade && matchesClass && matchesTeacher && matchesSubject
    })
  }, [approvals, filters])

  useEffect(() => {
    if (filteredApprovals.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredApprovals.some((item) => item.id === selectedId)) {
      setSelectedId(filteredApprovals[0].id)
    }
  }, [filteredApprovals, selectedId])

  const selectedApproval = useMemo(() => {
    if (!selectedId) return null
    return approvals.find((item) => item.id === selectedId) ?? null
  }, [approvals, selectedId])

  const detailsQuery = useAttendanceSessionDetailsQuery(selectedApproval?.id)
  const approveMutation = useApproveAttendanceSessionMutation()
  const rejectMutation = useRejectAttendanceSessionMutation()
  const approveAllMutation = useApproveAllPendingSessionsMutation()

  const totals = useMemo(() => {
    const totalStudents = approvals.reduce((sum, item) => sum + (item.student_count ?? 0), 0)
    const totalPresent = approvals.reduce((sum, item) => sum + item.present_count, 0)
    const totalAbsent = approvals.reduce((sum, item) => sum + item.absent_count, 0)
    const totalLate = approvals.reduce((sum, item) => sum + (item.late_count ?? 0), 0)
    return { totalSessions: approvals.length, totalStudents, totalPresent, totalAbsent, totalLate }
  }, [approvals])

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleApprove = (approval: PendingApprovalRecord) => {
    approveMutation.mutate(
      { session_id: approval.class_session_id, date: approval.attendance_date },
      {
        onSuccess: () => {
          setSelectedId(null)
        },
      },
    )
  }

  const handleReject = (approval: PendingApprovalRecord, reason?: string) => {
    rejectMutation.mutate(
      { session_id: approval.class_session_id, date: approval.attendance_date, reason: reason ?? null },
      {
        onSuccess: () => {
          setRejectTarget(null)
          setSelectedId(null)
        },
      },
    )
  }

  const handleApproveAll = () => {
    approveAllMutation.mutate(undefined, {
      onSuccess: () => {
        setShowApproveAllDialog(false)
        setSelectedId(null)
      },
    })
  }

  const isBusy = approveMutation.isPending || rejectMutation.isPending || approveAllMutation.isPending

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">اعتماد التحضير</h1>
            <p className="text-sm text-muted">
              راجع التحضير المرسل من المعلمين، اعتمد الحصص المطابقة، ودوّن أسباب الرفض عند الحاجة.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMissingSessionsModal(true)}
              className="button-secondary flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              الفصول التي لم ترسل
            </button>
            {filteredApprovals.length > 0 && (
              <button
                type="button"
                onClick={() => setShowApproveAllDialog(true)}
                disabled={isBusy}
                className="button-primary flex items-center gap-2"
              >
                <i className="bi bi-check2-all" />
                اعتماد الجميع ({filteredApprovals.length})
              </button>
            )}
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              يتم التحديث تلقائيًا كل 30 ثانية
            </div>
          </div>
        </div>
        {approvalsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            تعذر تحميل قائمة التحضير المعلق.
            <button
              type="button"
              onClick={() => approvalsQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section className="glass-card space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryBadge label="جلسات معلّقة" value={totals.totalSessions} tone="bg-amber-50 text-amber-700 border border-amber-200" />
          <SummaryBadge label="إجمالي الطلاب" value={totals.totalStudents} tone="bg-slate-100 text-slate-700 border border-slate-200" />
          <SummaryBadge label="محضرين" value={totals.totalPresent} tone="bg-emerald-50 text-emerald-700 border border-emerald-200" />
          <SummaryBadge label="غياب" value={totals.totalAbsent} tone="bg-rose-50 text-rose-700 border border-rose-200" />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">الصف الدراسي</label>
            <input
              type="text"
              value={filters.grade}
              onChange={(event) => handleFilterChange('grade', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="مثال: ثاني ثانوي"
            />
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">الفصل</label>
            <input
              type="text"
              value={filters.className}
              onChange={(event) => handleFilterChange('className', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="مثال: (ب)"
            />
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">اسم المعلم</label>
            <input
              type="search"
              value={filters.teacher}
              onChange={(event) => handleFilterChange('teacher', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="بحث بالاسم"
            />
          </div>
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">المادة</label>
            <input
              type="search"
              value={filters.subject}
              onChange={(event) => handleFilterChange('subject', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="مثال: رياضيات"
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),420px]">
          <div className="rounded-3xl border border-slate-100 bg-white/80 shadow-sm">
            {approvalsQuery.isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                جاري تحميل التحضير المعلق...
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-inboxes text-3xl text-slate-300" />
                لا توجد حصص معلقة بالمعايير الحالية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[880px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">المعلم</th>
                      <th className="px-4 py-3 font-semibold">المادة</th>
                      <th className="px-4 py-3 font-semibold">الصف / الفصل</th>
                      <th className="px-4 py-3 font-semibold">التاريخ</th>
                      <th className="px-4 py-3 font-semibold">ملخص الحالة</th>
                      <th className="px-4 py-3 font-semibold">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovals.map((item) => {
                      const isSelected = item.id === selectedId
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-slate-100 transition ${
                            isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectedId(item.id)}
                              className="text-sm font-semibold text-slate-900 transition hover:text-indigo-600"
                            >
                              {item.teacher_name}
                            </button>
                            <p className="text-xs text-muted">مسجل بتاريخ {formatDate(item.recorded_at)}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{item.subject_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {item.grade} — {item.class_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.attendance_date)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                                حاضر: {item.present_count}
                              </span>
                              <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
                                غائب: {item.absent_count}
                              </span>
                              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                                متأخر: {item.late_count ?? 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="button-secondary"
                                onClick={() => handleApprove(item)}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending && selectedId === item.id ? 'جارٍ الاعتماد...' : 'اعتماد'}
                              </button>
                              <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setRejectTarget(item)}
                                disabled={rejectMutation.isPending}
                              >
                                رفض
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
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-100 bg-white/70 p-5 shadow-sm">
            {selectedApproval ? (
              <div className="space-y-4">
                <header className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تفاصيل الحصة</p>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedApproval.subject_name}</h3>
                  <p className="text-xs text-muted">
                    {selectedApproval.teacher_name} • {selectedApproval.grade} — {selectedApproval.class_name}
                  </p>
                  <p className="text-xs text-muted">تاريخ الحصة: {formatDate(selectedApproval.attendance_date)}</p>
                </header>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => handleApprove(selectedApproval)}
                    disabled={isBusy}
                  >
                    <i className="bi bi-check2-circle" /> اعتماد التحضير
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setRejectTarget(selectedApproval)}
                    disabled={isBusy}
                  >
                    <i className="bi bi-x-circle" /> رفض التحضير
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                  {detailsQuery.isLoading ? (
                    <div className="space-y-2 text-xs text-muted">
                      <p className="font-semibold text-slate-500">جارٍ تحميل تفاصيل الجلسة...</p>
                      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                    </div>
                  ) : detailsQuery.isError ? (
                    <p className="text-xs text-rose-600">تعذر تحميل التفاصيل. حاول مرة أخرى.</p>
                  ) : detailsQuery.data ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold text-slate-500">إحصائيات الحصة</p>
                        <div className="grid grid-cols-2 gap-2">
                          <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-center font-semibold text-emerald-700">
                            حاضر: {detailsQuery.data.statistics.present_count.toLocaleString('ar-SA')}
                          </span>
                          <span className="rounded-2xl bg-rose-50 px-3 py-2 text-center font-semibold text-rose-700">
                            غائب: {detailsQuery.data.statistics.absent_count.toLocaleString('ar-SA')}
                          </span>
                          <span className="rounded-2xl bg-amber-50 px-3 py-2 text-center font-semibold text-amber-700">
                            متأخر: {detailsQuery.data.statistics.late_count.toLocaleString('ar-SA')}
                          </span>
                          <span className="rounded-2xl bg-sky-50 px-3 py-2 text-center font-semibold text-sky-700">
                            مستأذن: {detailsQuery.data.statistics.excused_count.toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-center text-[11px] text-muted">
                          نسبة الحضور: {Math.round(detailsQuery.data.statistics.attendance_rate)}%
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500">
                          أبرز الطلاب ({Math.min(detailsQuery.data.students.length, 6)}/{
                            detailsQuery.data.students.length.toLocaleString('ar-SA')
                          })
                        </p>
                        <ul className="space-y-2">
                          {detailsQuery.data.students.slice(0, 6).map((student) => (
                            <li
                              key={student.attendance_id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2"
                            >
                              <span className="text-[11px] font-semibold text-slate-700">{student.name}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {student.status === 'present'
                                  ? 'حاضر'
                                  : student.status === 'absent'
                                  ? 'غائب'
                                  : student.status === 'late'
                                  ? 'متأخر'
                                  : 'مستأذن'}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {detailsQuery.data.students.length > 6 ? (
                          <p className="text-center text-[11px] text-muted">
                            يوجد تفاصيل إضافية يمكن الاطلاع عليها من التقرير التفصيلي.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">اختر حصة لمراجعة التفاصيل.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-info-circle text-3xl text-slate-300" />
                اختر حصة من الجدول لمراجعة تفاصيلها والموافقة عليها.
              </div>
            )}
          </aside>
        </div>
      </section>

      <RejectDialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        isSubmitting={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          handleReject(rejectTarget, reason || undefined)
        }}
      />

      {showApproveAllDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-right shadow-xl">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تأكيد الإجراء</p>
              <h2 className="text-xl font-semibold text-slate-900">اعتماد جميع الجلسات المعلقة</h2>
              <p className="text-sm text-muted">
                سيتم اعتماد {filteredApprovals.length > 0 ? filteredApprovals.length : 15} جلسة معلقة. قد تستغرق هذه العملية بعض الوقت.
              </p>
            </header>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill mt-0.5 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">تنبيه مهم</p>
                  <p className="mt-1">
                    لا يمكن التراجع عن هذا الإجراء. سيتم اعتماد جميع الجلسات المعروضة حاليًا (حسب الفلاتر المطبقة).
                  </p>
                  <p className="mt-2 font-semibold text-amber-900">
                    ⚠️ يرجى عدم إغلاق المتصفح أو الصفحة حتى اكتمال العملية
                  </p>
                </div>
              </div>
            </div>

            {approveAllMutation.isPending && (
              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <p className="text-sm font-semibold text-indigo-900">جاري اعتماد الجلسات...</p>
                </div>
                <p className="mt-2 text-xs text-indigo-700">
                  يرجى الانتظار حتى اكتمال العملية. <strong>لا تغلق هذه النافذة.</strong>
                </p>
              </div>
            )}

            <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowApproveAllDialog(false)}
                disabled={approveAllMutation.isPending}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={handleApproveAll}
                disabled={approveAllMutation.isPending}
              >
                {approveAllMutation.isPending ? 'جارٍ الاعتماد...' : 'تأكيد اعتماد الجميع'}
              </button>
            </footer>
          </div>
        </div>
      )}

      <MissingSessionsModal 
        open={showMissingSessionsModal} 
        onClose={() => setShowMissingSessionsModal(false)} 
      />
    </section>
  )
}

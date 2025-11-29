import { useEffect, useMemo, useState, useRef } from 'react'
import {
  useApproveAllPendingSessionsMutation,
  useApproveAttendanceSessionMutation,
  useAttendanceSessionDetailsQuery,
  usePendingApprovalsQuery,
  useRejectAttendanceSessionMutation,
  useUpdateAttendanceStatusMutation,
} from '../hooks'
import type { PendingApprovalRecord, AttendanceSessionDetails } from '../types'
import { MissingSessionsModal } from '../components/missing-sessions-modal'
import { Clock, Loader2, AlertCircle } from 'lucide-react'

interface ApprovalProgress {
  totalRecords: number
  approvedRecords: number
  sentMessages: number
  skippedMessages: number
  isOnBreak: boolean
  breakTimeRemaining: number
  currentOffset: number
  isCompleted: boolean
}

type FilterState = {
  grade: string
  className: string
  teacher: string
  subject: string
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'مستأذن',
}

const attendanceStatusTone: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  absent: 'bg-rose-50 text-rose-700 border border-rose-200',
  late: 'bg-amber-50 text-amber-700 border border-amber-200',
  excused: 'bg-sky-50 text-sky-700 border border-sky-200',
}

const attendanceStatusOptions: Array<{ value: AttendanceStatus; label: string }> = (
  Object.keys(attendanceStatusLabels) as AttendanceStatus[]
).map((value) => ({ value, label: attendanceStatusLabels[value] }))

function normalizeAttendanceDate(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : value
}

function SummaryBadge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-3xl px-4 py-3 text-right shadow-sm ${tone}`}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value.toLocaleString('ar-SA')}</p>
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

type RejectDialogProps = {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (reason: string | null) => void
}

function RejectDialog({ open, isSubmitting, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = () => {
    const trimmed = reason.trim()
    onConfirm(trimmed === '' ? null : trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 text-right shadow-xl">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">رفض التحضير</p>
          <h2 className="text-lg font-semibold text-slate-900">هل ترغب في رفض التحضير؟</h2>
          <p className="text-sm text-muted">
            يمكنك إضافة سبب الرفض لمساعدة المعلم على فهم القرار. هذا الحقل اختياري.
          </p>
        </header>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600" htmlFor="reject-reason">
            سبب الرفض (اختياري)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            placeholder="اكتب ملاحظاتك هنا..."
            disabled={isSubmitting}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>
            تراجع
          </button>
          <button type="button" className="button-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export function AdminApprovalPage() {
  const [filters, setFilters] = useState<FilterState>({ grade: '', className: '', teacher: '', subject: '' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingApprovalRecord | null>(null)
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false)
  const [showMissingSessionsModal, setShowMissingSessionsModal] = useState(false)
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<number | null>(null)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [progress, setProgress] = useState<ApprovalProgress>({
    totalRecords: 0,
    approvedRecords: 0,
    sentMessages: 0,
    skippedMessages: 0,
    isOnBreak: false,
    breakTimeRemaining: 0,
    currentOffset: 0,
    isCompleted: false,
  })

  const breakTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
      }
    }
  }, [])

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
  const updateStatusMutation = useUpdateAttendanceStatusMutation()

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

  const handleApprove = async (approval: PendingApprovalRecord) => {
    const attendanceDate = normalizeAttendanceDate(approval.attendance_date)
    
    setProgress({
      totalRecords: 0,
      approvedRecords: 0,
      sentMessages: 0,
      skippedMessages: 0,
      isOnBreak: false,
      breakTimeRemaining: 0,
      currentOffset: 0,
      isCompleted: false,
    })
    
    setIsApproving(true)
    await approveInBatches(approval.class_session_id, attendanceDate, 0)
  }

  const approveInBatches = async (sessionId: number, date: string, offset = 0, totalSent = 0) => {
    try {
      const result = await approveMutation.mutateAsync({
        session_id: sessionId,
        date,
        offset,
        total_sent: totalSent,
      })

      setProgress((prev) => ({
        ...prev,
        totalRecords: prev.totalRecords + result.records_approved,
        approvedRecords: prev.approvedRecords + result.records_approved,
        sentMessages: result.total_messages_sent,
        skippedMessages: prev.skippedMessages + result.messages_skipped,
        currentOffset: result.next_offset,
        isCompleted: !result.has_more,
      }))

      if (result.has_more) {
        if (result.needs_break) {
          const breakDuration = Math.floor(Math.random() * 61) + 120
          
          setProgress((prev) => ({
            ...prev,
            isOnBreak: true,
            breakTimeRemaining: breakDuration,
          }))

          let remainingTime = breakDuration
          breakTimerRef.current = setInterval(() => {
            remainingTime -= 1
            setProgress((prev) => ({
              ...prev,
              breakTimeRemaining: remainingTime,
            }))

            if (remainingTime <= 0) {
              if (breakTimerRef.current) {
                clearInterval(breakTimerRef.current)
              }
              setProgress((prev) => ({
                ...prev,
                isOnBreak: false,
                breakTimeRemaining: 0,
              }))
              approveInBatches(sessionId, date, result.next_offset, result.total_messages_sent)
            }
          }, 1000)
        } else {
          approveInBatches(sessionId, date, result.next_offset, result.total_messages_sent)
        }
      } else {
        if (breakTimerRef.current) {
          clearInterval(breakTimerRef.current)
          breakTimerRef.current = null
        }
        
        setIsApproving(false)
        setSelectedId(null)
      }
    } catch {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
        breakTimerRef.current = null
      }
      
      setIsApproving(false)
      setProgress((prev) => ({ ...prev, isOnBreak: false, breakTimeRemaining: 0 }))
    }
  }

  const handleReject = (approval: PendingApprovalRecord, reason?: string) => {
    const attendanceDate = normalizeAttendanceDate(approval.attendance_date)
    rejectMutation.mutate(
      { session_id: approval.class_session_id, date: attendanceDate, reason: reason ?? null },
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

  const handleStudentStatusChange = (
    student: AttendanceSessionDetails['students'][number],
    nextStatus: AttendanceStatus,
  ) => {
    if (!selectedApproval || !selectedApproval.id) return
    if (student.status === nextStatus) return

    setUpdatingAttendanceId(student.attendance_id)
    updateStatusMutation.mutate(
      {
        attendanceId: student.attendance_id,
        sessionDetailId: selectedApproval.id,
        status: nextStatus,
      },
      {
        onSettled: () => setUpdatingAttendanceId(null),
      },
    )
  }

  const isBusy =
    approveMutation.isPending || rejectMutation.isPending || approveAllMutation.isPending || updateStatusMutation.isPending

  return (
    <section className="space-y-6">
      {/* شريط التقدم */}
      {isApproving && (
        <div className="fixed left-0 right-0 top-0 z-50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
            <div className="container mx-auto">
              <div className="flex items-start gap-4">
                <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-white" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-white">⚠️ جاري الاعتماد الآمن - لا تغلق النافذة</p>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-white">
                        {progress.approvedRecords}
                      </p>
                      <p className="text-xs text-indigo-50">سجل معتمد</p>
                    </div>
                  </div>

                  {progress.isOnBreak && (
                    <div className="rounded-xl border-2 border-white/40 bg-white/20 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 animate-pulse text-white" />
                        <div className="flex-1">
                          <p className="font-semibold text-white">استراحة أمان - سيتم الاستئناف تلقائياً</p>
                          <p className="mt-1 text-sm text-indigo-50">
                            متبقي: {Math.floor(progress.breakTimeRemaining / 60)} دقيقة و {progress.breakTimeRemaining % 60} ثانية
                          </p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                      <p className="mt-2 text-xs text-indigo-50">
                        💡 تأخير 10-15 ثانية بين كل رسالة • استراحة 2-3 دقائق كل 20 رسالة
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="glass-card space-y-4" style={{ marginTop: isApproving ? '120px' : '0' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-right">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">مراجعة التحضير</p>
            <h1 className="text-2xl font-semibold text-slate-900">إدارة التحضير المعلّق</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowMissingSessionsModal(true)}
              disabled={approvalsQuery.isLoading}
            >
              <i className="bi bi-calendar-x" /> الحصص المفقودة
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => setShowApproveAllDialog(true)}
              disabled={filteredApprovals.length === 0 || approveAllMutation.isPending}
            >
              {approveAllMutation.isPending ? 'جارٍ الاعتماد...' : 'اعتماد الجميع'}
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">
          راجع سجل الحضور، حرر حالات الطلاب مباشرة، ثم اعتمد أو ارفض التحضير بحسب البيانات المتوفرة.
        </p>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(880px,1fr),420px]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white/80 shadow-sm">
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
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-inner">
                <table className="w-full min-w-[880px] text-right text-sm">
                  <thead className="bg-slate-50/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-semibold sm:px-4">المعلم</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">المادة</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">الصف / الفصل</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">التاريخ</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">ملخص الحالة</th>
                      <th className="px-3 py-3 font-semibold sm:px-4">الإجراء</th>
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
                          <td className="px-3 py-3 sm:px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedId(item.id)}
                              className="text-xs font-semibold text-slate-900 transition hover:text-indigo-600 sm:text-sm"
                            >
                              {item.teacher_name}
                            </button>
                            <p className="text-[10px] text-muted sm:text-xs">مسجل {formatDate(item.recorded_at)}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm">{item.subject_name}</td>
                          <td className="px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm">
                            {item.grade} — {item.class_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm">{formatDate(item.attendance_date)}</td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 sm:px-3 sm:py-1">
                                حاضر: {item.present_count}
                              </span>
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 sm:px-3 sm:py-1">
                                غائب: {item.absent_count}
                              </span>
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 sm:px-3 sm:py-1">
                                متأخر: {item.late_count ?? 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                              <button
                                type="button"
                                className="button-secondary text-xs sm:text-sm"
                                onClick={() => handleApprove(item)}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending && selectedId === item.id ? 'جارِ ...' : 'اعتماد'}
                              </button>
                              <button
                                type="button"
                                className="button-secondary text-xs sm:text-sm"
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
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-slate-500">
                            قائمة الطلاب ({detailsQuery.data.students.length.toLocaleString('ar-SA')})
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowStudentsModal(true)}
                            className="rounded-xl bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
                          >
                            <i className="bi bi-pencil-square" /> تعديل الحالات
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {detailsQuery.data.students.slice(0, 6).map((student) => (
                            <li
                              key={student.attendance_id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2"
                            >
                              <span className="text-[11px] font-semibold text-slate-700">{student.name}</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {attendanceStatusLabels[student.status as AttendanceStatus]}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {detailsQuery.data.students.length > 6 ? (
                          <p className="text-center text-[11px] text-muted">
                            انقر على "تعديل الحالات" لعرض جميع الطلاب ({detailsQuery.data.students.length})
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

      {showStudentsModal && detailsQuery.data && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 text-right shadow-xl">
            <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
              <button
                type="button"
                onClick={() => setShowStudentsModal(false)}
                className="rounded-xl bg-slate-100 p-2 transition hover:bg-slate-200"
                disabled={updateStatusMutation.isPending}
              >
                <i className="bi bi-x-lg text-slate-600" />
              </button>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">تعديل حالات الطلاب</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedApproval.subject_name}</h2>
                <p className="text-xs text-muted">
                  {selectedApproval.teacher_name} • {selectedApproval.grade} — {selectedApproval.class_name}
                </p>
              </div>
            </header>

            <div className="mb-4 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center text-xs">
              <div>
                <p className="font-semibold text-emerald-700">حاضر</p>
                <p className="text-lg font-bold text-emerald-900">{detailsQuery.data.statistics.present_count}</p>
              </div>
              <div>
                <p className="font-semibold text-rose-700">غائب</p>
                <p className="text-lg font-bold text-rose-900">{detailsQuery.data.statistics.absent_count}</p>
              </div>
              <div>
                <p className="font-semibold text-amber-700">متأخر</p>
                <p className="text-lg font-bold text-amber-900">{detailsQuery.data.statistics.late_count}</p>
              </div>
              <div>
                <p className="font-semibold text-sky-700">مستأذن</p>
                <p className="text-lg font-bold text-sky-900">{detailsQuery.data.statistics.excused_count}</p>
              </div>
            </div>

            {updateStatusMutation.isPending && (
              <div className="mb-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                <div className="flex items-center gap-2 text-sm text-indigo-900">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  جاري تحديث الحالة...
                </div>
              </div>
            )}

            <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">اسم الطالب</th>
                    <th className="px-4 py-3 font-semibold">الحالة الحالية</th>
                    <th className="px-4 py-3 font-semibold">ملاحظات</th>
                    <th className="px-4 py-3 font-semibold">تغيير الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsQuery.data.students.map((student) => {
                    const isUpdating = updatingAttendanceId === student.attendance_id
                    const status = student.status as AttendanceStatus

                    return (
                      <tr
                        key={student.attendance_id}
                        className={`border-t border-slate-100 transition ${
                          isUpdating ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${attendanceStatusTone[status]}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {attendanceStatusLabels[status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{student.notes ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={student.status}
                              onChange={(event) =>
                                handleStudentStatusChange(student, event.target.value as AttendanceStatus)
                              }
                              disabled={isBusy || isUpdating}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              {attendanceStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-xs text-muted">
                إجمالي الطلاب: {detailsQuery.data.students.length.toLocaleString('ar-SA')}
              </p>
              <button
                type="button"
                onClick={() => setShowStudentsModal(false)}
                className="button-primary"
                disabled={updateStatusMutation.isPending}
              >
                إغلاق
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}

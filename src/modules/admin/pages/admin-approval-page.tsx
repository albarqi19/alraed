import { useEffect, useMemo, useState, useRef } from 'react'
import {
  useApproveAllPendingSessionsMutation,
  useApproveAttendanceSessionMutation,
  useAttendanceSessionDetailsQuery,
  usePendingApprovalsQuery,
  useRejectAttendanceSessionMutation,
  useUpdateAttendanceStatusMutation,
  useAbsenceSmsSettingsQuery,
  useUpdateAbsenceSmsSettingsMutation,
  useGradesWithClassesQuery,
} from '../hooks'
import type { PendingApprovalRecord, AttendanceSessionDetails } from '../types'
import { MissingSessionsPanel } from '../components/missing-sessions-panel'
import { ManualAbsenceModal } from '../components/manual-absence-modal'
import {
  AlertTriangle,
  CalendarX,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DoorOpen,
  Inbox,
  Info,
  ListChecks,
  MessageSquare,
  MessageSquareOff,
  Pencil,
  Plus,
  Users,
  XCircle,
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
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsProgress,
  WsSelect,
  WsSideCol,
  WsSpinner,
  WsSwitch,
  WsTable,
  WsTextarea,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'

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

const attendanceStatusTone: Record<AttendanceStatus, WsChipTone> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  excused: 'sky',
}

const attendanceStatusIcon: Record<AttendanceStatus, LucideIcon> = {
  present: CheckCircle2,
  absent: XCircle,
  late: Clock3,
  excused: DoorOpen,
}

const attendanceStatusOptions: Array<{ value: AttendanceStatus; label: string }> = (
  Object.keys(attendanceStatusLabels) as AttendanceStatus[]
).map((value) => ({ value, label: attendanceStatusLabels[value] }))

function normalizeAttendanceDate(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : value
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
    <WsModal
      open={open}
      onClose={onClose}
      title="رفض التحضير"
      sub="يمكنك إضافة سبب الرفض لمساعدة المعلم على فهم القرار — الحقل اختياري."
      footer={
        <>
          <WsBtn onClick={onClose} disabled={isSubmitting}>
            تراجع
          </WsBtn>
          <WsBtn variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
          </WsBtn>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="ws-label" htmlFor="reject-reason">
          سبب الرفض (اختياري)
        </label>
        <WsTextarea
          id="reject-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="اكتب ملاحظاتك هنا..."
          disabled={isSubmitting}
        />
      </div>
    </WsModal>
  )
}

export function AdminApprovalPage() {
  const [filters, setFilters] = useState<FilterState>({ grade: '', className: '', teacher: '', subject: '' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingApprovalRecord | null>(null)
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false)
  const [showManualAbsenceModal, setShowManualAbsenceModal] = useState(false)
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

  const gradesWithClassesQuery = useGradesWithClassesQuery()
  const gradeOptions = useMemo(() => gradesWithClassesQuery.data ?? [], [gradesWithClassesQuery.data])
  const classOptions = useMemo(() => {
    if (!filters.grade) return []
    const found = gradeOptions.find((g) => g.grade === filters.grade)
    return found?.classes ?? []
  }, [gradeOptions, filters.grade])

  const approvalsQuery = usePendingApprovalsQuery()
  const approvals = useMemo(() => approvalsQuery.data ?? [], [approvalsQuery.data])

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const matchesGrade = filters.grade ? item.grade === filters.grade : true
      const matchesClass = filters.className ? item.class_name === filters.className : true
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

  // إعدادات إرسال رسائل الغياب
  const smsSettingsQuery = useAbsenceSmsSettingsQuery()
  const updateSmsMutation = useUpdateAbsenceSmsSettingsMutation()
  const sendAbsenceSms = smsSettingsQuery.data?.send_absence_sms ?? false

  const totals = useMemo(() => {
    const totalStudents = approvals.reduce((sum, item) => sum + (item.student_count ?? 0), 0)
    const totalPresent = approvals.reduce((sum, item) => sum + item.present_count, 0)
    const totalAbsent = approvals.reduce((sum, item) => sum + item.absent_count, 0)
    const totalLate = approvals.reduce((sum, item) => sum + (item.late_count ?? 0), 0)
    return { totalSessions: approvals.length, totalStudents, totalPresent, totalAbsent, totalLate }
  }, [approvals])

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'grade') next.className = ''
      return next
    })
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
    await approveInBatches(approval.class_session_id, attendanceDate, 0, 0, approval.grade, approval.class_name)
  }

  const approveInBatches = async (sessionId: number, date: string, offset = 0, totalSent = 0, grade?: string, className?: string) => {
    try {
      const result = await approveMutation.mutateAsync({
        session_id: sessionId,
        date,
        offset,
        total_sent: totalSent,
        grade,
        class_name: className,
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
              approveInBatches(sessionId, date, result.next_offset, result.total_messages_sent, grade, className)
            }
          }, 1000)
        } else {
          approveInBatches(sessionId, date, result.next_offset, result.total_messages_sent, grade, className)
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
      {
        session_id: approval.class_session_id,
        date: attendanceDate,
        reason: reason ?? null,
        grade: approval.grade,
        class_name: approval.class_name,
      },
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
    <WsPage>
      <WsHeader
        title="اعتماد التحضير"
        badge="مراجعة يومية"
        actions={
          <>
            {/* مفتاح إرسال رسائل الغياب — لمسة خاصة بالصفحة */}
            <span
              className="ws-fact"
              title={
                sendAbsenceSms
                  ? 'سيتم إرسال رسائل واتساب تلقائياً عند اعتماد التحضير'
                  : 'لن يتم إرسال أي رسائل عند اعتماد التحضير'
              }
            >
              {sendAbsenceSms ? <MessageSquare /> : <MessageSquareOff />}
              <span>رسائل الغياب</span>
              <WsSwitch
                checked={sendAbsenceSms}
                onChange={() => updateSmsMutation.mutate({ send_absence_sms: !sendAbsenceSms })}
                disabled={updateSmsMutation.isPending || smsSettingsQuery.isLoading}
              />
            </span>
            <WsBtn icon={Plus} onClick={() => setShowManualAbsenceModal(true)} disabled={approvalsQuery.isLoading}>
              غياب يدوي
            </WsBtn>
            <WsBtn
              variant="primary"
              icon={CheckCheck}
              onClick={() => setShowApproveAllDialog(true)}
              disabled={filteredApprovals.length === 0 || approveAllMutation.isPending}
            >
              {approveAllMutation.isPending ? 'جارٍ الاعتماد...' : 'اعتماد الجميع'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardList} label="جلسات معلّقة:">
              {totals.totalSessions.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={Users} label="الطلاب:">
              {totals.totalStudents.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={CheckCircle2} label="حاضر:">
              {totals.totalPresent.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={XCircle} label="غائب:">
              {totals.totalAbsent.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={Clock3} label="متأخر:">
              {totals.totalLate.toLocaleString('ar-SA')}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="الصف الدراسي" htmlFor="ws-apr-grade">
          <WsSelect
            id="ws-apr-grade"
            value={filters.grade}
            onChange={(event) => handleFilterChange('grade', event.target.value)}
          >
            <option value="">جميع الصفوف</option>
            {gradeOptions.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.grade}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="الفصل" htmlFor="ws-apr-class">
          <WsSelect
            id="ws-apr-class"
            value={filters.className}
            onChange={(event) => handleFilterChange('className', event.target.value)}
            disabled={!filters.grade}
          >
            <option value="">جميع الفصول</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </WsSelect>
        </WsField>

        <WsField label="اسم المعلم" htmlFor="ws-apr-teacher" grow>
          <WsInput
            id="ws-apr-teacher"
            type="search"
            value={filters.teacher}
            onChange={(event) => handleFilterChange('teacher', event.target.value)}
            placeholder="بحث بالاسم"
          />
        </WsField>

        <WsField label="المادة" htmlFor="ws-apr-subject" grow>
          <WsInput
            id="ws-apr-subject"
            type="search"
            value={filters.subject}
            onChange={(event) => handleFilterChange('subject', event.target.value)}
            placeholder="مثال: رياضيات"
          />
        </WsField>
      </WsToolbar>

      {/* شريط الاعتماد الآمن — لمسة خاصة: شريط حي ملتصق بدل شريط عائم فوق الموقع */}
      {isApproving && (
        <WsAlert tone="info" icon={null}>
          <WsSpinner style={{ width: 14, height: 14 }} />
          <b>جاري الاعتماد الآمن — لا تغلق الصفحة</b>
          <span>
            معتمد: <b>{progress.approvedRecords.toLocaleString('ar-SA')}</b>
          </span>
          <span>
            رسائل مرسلة: <b>{progress.sentMessages.toLocaleString('ar-SA')}</b>
          </span>
          {progress.isOnBreak && (
            <span className="ws-chip ws-chip--amber">
              <Clock3 />
              استراحة أمان — متبقي {Math.floor(progress.breakTimeRemaining / 60)}:
              {String(progress.breakTimeRemaining % 60).padStart(2, '0')}
            </span>
          )}
        </WsAlert>
      )}

      <WsLayout>
        {/* العمود الأيمن: الحصص المفقودة — بانل حي بدل المودال */}
        <WsSideCol
          title="الحصص المفقودة"
          icon={CalendarX}
          side="start"
          width={300}
          storageKey="ws:approval:missing"
        >
          <MissingSessionsPanel />
        </WsSideCol>

        <WsMain>
          <WsBlock
            title="التحضير المعلّق"
            icon={ClipboardList}
            count={filteredApprovals.length.toLocaleString('ar-SA')}
            fill
          >
            {approvalsQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل التحضير المعلق...</WsEmpty>
            ) : filteredApprovals.length === 0 ? (
              <WsEmpty icon={Inbox}>لا توجد حصص معلقة بالمعايير الحالية.</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th>المادة</th>
                    <th>الصف / الفصل</th>
                    <th>التاريخ</th>
                    <th>ملخص الحالة</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map((item) => {
                    const isSelected = item.id === selectedId
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{item.teacher_name}</span>
                          <span className="ws-cell-sub">مسجل {formatDate(item.recorded_at)}</span>
                        </td>
                        <td>{item.subject_name}</td>
                        <td>
                          {item.grade} — {item.class_name}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.attendance_date)}</td>
                        <td>
                          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                            <WsChip tone="green">حاضر {item.present_count}</WsChip>
                            <WsChip tone="red">غائب {item.absent_count}</WsChip>
                            <WsChip tone="amber">متأخر {item.late_count ?? 0}</WsChip>
                          </span>
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <WsBtn
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => handleApprove(item)}
                              disabled={isApproving || approveMutation.isPending}
                            >
                              اعتماد
                            </WsBtn>
                            <WsBtn
                              size="sm"
                              icon={XCircle}
                              onClick={() => setRejectTarget(item)}
                              disabled={rejectMutation.isPending}
                            >
                              رفض
                            </WsBtn>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol title="تفاصيل الحصة" icon={ListChecks} storageKey="ws:approval:sidecol">
          {selectedApproval ? (
            <>
              <WsBlock padded>
                <WsFactsList>
                  <WsFactRow label="المادة">{selectedApproval.subject_name}</WsFactRow>
                  <WsFactRow label="المعلم">{selectedApproval.teacher_name}</WsFactRow>
                  <WsFactRow label="الصف والفصل">
                    {selectedApproval.grade} — {selectedApproval.class_name}
                  </WsFactRow>
                  <WsFactRow label="تاريخ الحصة">{formatDate(selectedApproval.attendance_date)}</WsFactRow>
                </WsFactsList>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <WsBtn
                    variant="primary"
                    icon={CheckCircle2}
                    onClick={() => handleApprove(selectedApproval)}
                    disabled={isBusy || isApproving}
                    style={{ flex: 1 }}
                  >
                    اعتماد التحضير
                  </WsBtn>
                  <WsBtn icon={XCircle} onClick={() => setRejectTarget(selectedApproval)} disabled={isBusy} style={{ flex: 1 }}>
                    رفض التحضير
                  </WsBtn>
                </div>
              </WsBlock>

              {detailsQuery.isLoading ? (
                <WsEmpty loading>جارٍ تحميل تفاصيل الجلسة...</WsEmpty>
              ) : detailsQuery.isError ? (
                <WsEmpty icon={AlertTriangle}>تعذر تحميل التفاصيل. حاول مرة أخرى.</WsEmpty>
              ) : detailsQuery.data ? (
                <>
                  <WsBlock title="إحصائيات الحصة" padded>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        <WsChip tone="green" icon={CheckCircle2}>
                          حاضر {detailsQuery.data.statistics.present_count.toLocaleString('ar-SA')}
                        </WsChip>
                        <WsChip tone="red" icon={XCircle}>
                          غائب {detailsQuery.data.statistics.absent_count.toLocaleString('ar-SA')}
                        </WsChip>
                        <WsChip tone="amber" icon={Clock3}>
                          متأخر {detailsQuery.data.statistics.late_count.toLocaleString('ar-SA')}
                        </WsChip>
                        <WsChip tone="sky" icon={DoorOpen}>
                          مستأذن {detailsQuery.data.statistics.excused_count.toLocaleString('ar-SA')}
                        </WsChip>
                      </div>
                      <WsProgress
                        value={detailsQuery.data.statistics.attendance_rate}
                        label={
                          <>
                            نسبة الحضور: <b>{Math.round(detailsQuery.data.statistics.attendance_rate)}%</b>
                          </>
                        }
                      />
                    </div>
                  </WsBlock>

                  <WsBlock
                    title="قائمة الطلاب"
                    count={detailsQuery.data.students.length.toLocaleString('ar-SA')}
                    tools={
                      <WsBtn size="sm" icon={Pencil} onClick={() => setShowStudentsModal(true)}>
                        تعديل الحالات
                      </WsBtn>
                    }
                    fill
                    scroll
                  >
                    <ul className="ws-rows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {detailsQuery.data.students.map((student) => {
                        const status = student.status as AttendanceStatus
                        return (
                          <li key={student.attendance_id} className="ws-row">
                            <span className="ws-row__name">{student.name}</span>
                            <WsChip tone={attendanceStatusTone[status]} icon={attendanceStatusIcon[status]}>
                              {attendanceStatusLabels[status]}
                            </WsChip>
                          </li>
                        )
                      })}
                    </ul>
                  </WsBlock>
                </>
              ) : null}
            </>
          ) : (
            <WsEmpty icon={Info}>اختر حصة من الجدول لمراجعة تفاصيلها والموافقة عليها.</WsEmpty>
          )}
        </WsSideCol>
      </WsLayout>

      <RejectDialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        isSubmitting={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          handleReject(rejectTarget, reason || undefined)
        }}
      />

      <WsModal
        open={showApproveAllDialog}
        onClose={() => !approveAllMutation.isPending && setShowApproveAllDialog(false)}
        title="اعتماد جميع الجلسات المعلقة"
        sub={`سيتم اعتماد ${filteredApprovals.length > 0 ? filteredApprovals.length : 15} جلسة معلقة. قد تستغرق هذه العملية بعض الوقت.`}
        footer={
          <>
            <WsBtn onClick={() => setShowApproveAllDialog(false)} disabled={approveAllMutation.isPending}>
              إلغاء
            </WsBtn>
            <WsBtn variant="primary" icon={CheckCheck} onClick={handleApproveAll} disabled={approveAllMutation.isPending}>
              {approveAllMutation.isPending ? 'جارٍ الاعتماد...' : 'تأكيد اعتماد الجميع'}
            </WsBtn>
          </>
        }
      >
        <WsAlert tone="warn" boxed>
          <span>
            <b>تنبيه مهم:</b> لا يمكن التراجع عن هذا الإجراء. سيتم اعتماد جميع الجلسات المعروضة حاليًا (حسب الفلاتر
            المطبقة). <b>يرجى عدم إغلاق المتصفح أو الصفحة حتى اكتمال العملية.</b>
          </span>
        </WsAlert>
        {approveAllMutation.isPending && (
          <WsAlert tone="info" icon={null} boxed>
            <WsSpinner style={{ width: 14, height: 14 }} />
            جاري اعتماد الجلسات... يرجى الانتظار حتى اكتمال العملية.
          </WsAlert>
        )}
      </WsModal>

      {detailsQuery.data && selectedApproval && (
        <WsModal
          open={showStudentsModal}
          onClose={() => !updateStatusMutation.isPending && setShowStudentsModal(false)}
          title={`تعديل حالات الطلاب — ${selectedApproval.subject_name}`}
          sub={`${selectedApproval.teacher_name} • ${selectedApproval.grade} — ${selectedApproval.class_name}`}
          maxWidth={760}
          footer={
            <>
              <span className="ws-fact" style={{ marginInlineEnd: 'auto' }}>
                إجمالي الطلاب: <b>{detailsQuery.data.students.length.toLocaleString('ar-SA')}</b>
              </span>
              <WsBtn variant="primary" onClick={() => setShowStudentsModal(false)} disabled={updateStatusMutation.isPending}>
                إغلاق
              </WsBtn>
            </>
          }
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <WsChip tone="green" icon={CheckCircle2}>
              حاضر {detailsQuery.data.statistics.present_count}
            </WsChip>
            <WsChip tone="red" icon={XCircle}>
              غائب {detailsQuery.data.statistics.absent_count}
            </WsChip>
            <WsChip tone="amber" icon={Clock3}>
              متأخر {detailsQuery.data.statistics.late_count}
            </WsChip>
            <WsChip tone="sky" icon={DoorOpen}>
              مستأذن {detailsQuery.data.statistics.excused_count}
            </WsChip>
          </div>

          {updateStatusMutation.isPending && (
            <WsAlert tone="info" icon={null} boxed>
              <WsSpinner style={{ width: 13, height: 13 }} />
              جاري تحديث الحالة...
            </WsAlert>
          )}

          <div style={{ maxHeight: '48vh', overflowY: 'auto', border: '1px solid var(--ws-hairline)', borderRadius: 8 }}>
            <WsTable>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>الحالة الحالية</th>
                  <th>ملاحظات</th>
                  <th>تغيير الحالة</th>
                </tr>
              </thead>
              <tbody>
                {detailsQuery.data.students.map((student) => {
                  const isUpdating = updatingAttendanceId === student.attendance_id
                  const status = student.status as AttendanceStatus

                  return (
                    <tr key={student.attendance_id} className={isUpdating ? 'is-selected' : undefined}>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>
                        <WsChip tone={attendanceStatusTone[status]} icon={attendanceStatusIcon[status]}>
                          {attendanceStatusLabels[status]}
                        </WsChip>
                      </td>
                      <td style={{ color: 'var(--ws-text-2)' }}>{student.notes ?? '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <WsSelect
                            value={student.status}
                            onChange={(event) =>
                              handleStudentStatusChange(student, event.target.value as AttendanceStatus)
                            }
                            disabled={isBusy || isUpdating}
                          >
                            {attendanceStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </WsSelect>
                          {isUpdating && <WsSpinner style={{ width: 14, height: 14 }} />}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </WsTable>
          </div>
        </WsModal>
      )}

      <ManualAbsenceModal
        open={showManualAbsenceModal}
        onClose={() => setShowManualAbsenceModal(false)}
      />
    </WsPage>
  )
}

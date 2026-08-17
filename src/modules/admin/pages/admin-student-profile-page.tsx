import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Printer,
  RotateCcw,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { StudentAttributesPanel } from '@/modules/student-attributes/components/student-attributes-panel'
import {
  useAttendanceReportMatrixQuery,
  useLateArrivalsQuery,
  useLeaveRequestsQuery,
  useStudentsQuery,
  useWhatsappHistoryQuery,
} from '../hooks'
import { StudentReportPrintDialog } from '../components/student-report-print-dialog'
import { academicCalendarApi, type AcademicSemesterSummary } from '@/services/api/academic-calendar'
import type {
  AttendanceReportStudentAttendance,
  AttendanceReportStudentRow,
  LateArrivalRecord,
  LeaveRequestRecord,
  WhatsappHistoryItem,
} from '../types'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsProgress,
  WsSideCol,
} from '@/shared/workspace'
import type { WsChipTone } from '@/shared/workspace'

type PeriodKey = 'semester' | '7d' | '30d' | '90d' | 'custom'

type SectionKey = 'overview' | 'records' | 'communications' | 'extended'

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: 'semester', label: 'الفصل الدراسي' },
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يومًا' },
  { value: '90d', label: 'آخر 90 يومًا' },
  { value: 'custom', label: 'فترة مخصصة' },
]

const LEAVE_STATUS_META: Record<LeaveRequestRecord['status'] | 'pending', { label: string; tone: WsChipTone | undefined }> = {
  pending: { label: 'بانتظار المعالجة', tone: 'amber' },
  approved: { label: 'معتمد', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
  cancelled: { label: 'ملغى', tone: undefined },
}

const ATTENDANCE_STATUS_META: Record<string, { label: string; tone: WsChipTone; color: string }> = {
  present: { label: 'حاضر', tone: 'green', color: 'var(--ws-green)' },
  absent: { label: 'غائب', tone: 'red', color: 'var(--ws-red)' },
  late: { label: 'متأخر', tone: 'amber', color: 'var(--ws-amber)' },
  excused: { label: 'مستأذن', tone: 'sky', color: 'var(--ws-sky)' },
}

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', options).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
  }
}

function formatDateTime(value?: string | null) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })
}

function toISODate(date: Date) {
  return date.toISOString().split('T')[0]
}

function normalizeArabicText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function selectAttendanceRow(matrix?: AttendanceReportStudentRow[]): AttendanceReportStudentRow | null {
  if (!matrix || matrix.length === 0) return null
  return matrix[0]
}

function sortAttendanceRecords(attendance?: AttendanceReportStudentAttendance[]) {
  if (!attendance) return []
  return [...attendance].sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function AdminStudentProfilePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [period, setPeriod] = useState<PeriodKey>('semester')
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [activeSection, setActiveSection] = useState<SectionKey>('overview')
  const [selectedMessage, setSelectedMessage] = useState<WhatsappHistoryItem | null>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  // جلب بيانات الفصول الدراسية
  const semestersQuery = useQuery({
    queryKey: ['academic-calendar', 'semesters'],
    queryFn: academicCalendarApi.getSemesters,
  })

  // الحصول على الفصل الدراسي الحالي
  const currentSemester = useMemo<AcademicSemesterSummary | null>(() => {
    const semesters = semestersQuery.data
    if (!semesters || semesters.length === 0) return null
    return semesters.find((s) => s.is_current) ?? semesters[0]
  }, [semestersQuery.data])

  const studentsQuery = useStudentsQuery()
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])

  const filteredStudents = useMemo(() => {
    const query = normalizeArabicText(searchTerm)
    if (!query) {
      return students
    }

    return students.filter((student) => {
      const nameMatch = normalizeArabicText(student.name).includes(query)
      const gradeMatch = normalizeArabicText(student.grade).includes(query)
      const classMatch = normalizeArabicText(student.class_name).includes(query)
      const nationalMatch = student.national_id.includes(searchTerm.trim())
      return nameMatch || gradeMatch || classMatch || nationalMatch
    })
  }, [students, searchTerm])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  )

  useEffect(() => {
    setActiveSection('overview')
  }, [selectedStudentId])

  const dateRange = useMemo(() => {
    const today = new Date()
    const end = toISODate(today)

    // إذا كانت الفترة هي الفصل الدراسي
    if (period === 'semester') {
      if (currentSemester) {
        const semesterStart = new Date(currentSemester.start_date)
        const semesterEnd = new Date(currentSemester.end_date)

        // الفصل الجاري قد يكون **مستقبلياً**.
        //
        // `AcademicSemester::current()` تُرجّح الفصل القادم فيما بين فصلين —
        // فبين العامين (أغسطس مثلاً) تكون بدايته بعد اليوم. وهذا الكود كان
        // يقصّ النهاية عند اليوم ولا يقصّ البداية، فينتج مدىً مقلوباً
        // (start = 2026-08-23 بينما end = 2026-08-13) يردّه الخادم بـ422
        // ويظهر للمستخدم «تعذّر تحميل بيانات الحضور».
        //
        // ولا معنى لعرض «حضور هذا الفصل» قبل أن يبدأ: لا صفّ واحد فيه. فبدل
        // مدىً مقلوب أو صفرٍ صامت، نسقط إلى آخر ثلاثين يوماً — وهي نافذةٌ
        // فيها بياناتٌ حقيقية من الفصل المنصرم.
        if (semesterStart > today) {
          const recentStart = new Date()
          recentStart.setDate(recentStart.getDate() - 29)
          return { start: toISODate(recentStart), end }
        }

        const effectiveEnd = semesterEnd > today ? today : semesterEnd
        return {
          start: currentSemester.start_date,
          end: toISODate(effectiveEnd),
        }
      }
      // إذا لم يتوفر الفصل الدراسي, نستخدم آخر 30 يوماً كافتراضي
      const fallbackStart = new Date()
      fallbackStart.setDate(fallbackStart.getDate() - 29)
      return {
        start: toISODate(fallbackStart),
        end,
      }
    }

    if (period === 'custom') {
      // المدى المخصَّص يأتي من حقلَي تاريخ لا يمنعان قلبه: يكفي أن يختار
      // المستخدم النهاية قبل البداية ليرتدّ 422 برسالةٍ لا تدلّه على شيء.
      const rawStart = customRange.start || end
      const rawEnd = customRange.end || end

      return rawStart > rawEnd
        ? { start: rawEnd, end: rawStart }
        : { start: rawStart, end: rawEnd }
    }

    const periodDays: Record<'7d' | '30d' | '90d', number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }

    const days = periodDays[period]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))

    return {
      start: toISODate(startDate),
      end,
    }
  }, [period, customRange.end, customRange.start, currentSemester])

  const attendanceFilters = useMemo(() => {
    if (!selectedStudentId) return null
    return {
      type: 'student' as const,
      student_id: selectedStudentId,
      start_date: dateRange.start,
      end_date: dateRange.end,
    }
  }, [selectedStudentId, dateRange.end, dateRange.start])

  const attendanceQuery = useAttendanceReportMatrixQuery(attendanceFilters, {
    enabled: Boolean(attendanceFilters),
  })

  const attendanceRow = selectAttendanceRow(attendanceQuery.data?.students)
  const attendanceTimeline = useMemo(
    () => sortAttendanceRecords(attendanceRow?.attendance).slice(0, 20),
    [attendanceRow?.attendance],
  )

  const lateFilters = useMemo(() => (selectedStudentId ? { studentId: selectedStudentId } : {}), [selectedStudentId])
  const lateArrivalsQuery = useLateArrivalsQuery(lateFilters, { enabled: Boolean(selectedStudentId) })
  const lateArrivalRecords = useMemo(() => lateArrivalsQuery.data ?? [], [lateArrivalsQuery.data])
  const studentLateArrivals = useMemo(() => {
    if (!selectedStudentId) return []
    return lateArrivalRecords.filter((record) => record.student_id === selectedStudentId)
  }, [lateArrivalRecords, selectedStudentId])

  const leaveFilters = useMemo(
    () => ({
      status: 'all' as const,
      page: 1,
      per_page: 20,
      ...(selectedStudentId ? { student_id: selectedStudentId } : {}),
    }),
    [selectedStudentId],
  )

  const leaveRequestsQuery = useLeaveRequestsQuery(leaveFilters, {
    enabled: Boolean(selectedStudentId),
  })

  const leaveRequests = useMemo(() => leaveRequestsQuery.data?.items ?? [], [leaveRequestsQuery.data?.items])

  const whatsappFilters = useMemo(
    () => (selectedStudentId ? { student_id: selectedStudentId, per_page: 20 } : undefined),
    [selectedStudentId],
  )
  const whatsappHistoryQuery = useWhatsappHistoryQuery(whatsappFilters, {
    enabled: Boolean(selectedStudentId),
  })
  const studentWhatsappMessages = useMemo(() => whatsappHistoryQuery.data ?? [], [whatsappHistoryQuery.data])

  const latestLateArrival = studentLateArrivals[0] ?? null
  const latestLeaveRequest = leaveRequests[0] ?? null
  const latestWhatsappMessage = studentWhatsappMessages[0] ?? null

  const profileSections = useMemo<Array<{ id: SectionKey; label: string; icon: LucideIcon }>>(
    () => [
      { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
      { id: 'records', label: 'السجلات', icon: ClipboardList },
      { id: 'communications', label: 'التواصل', icon: MessageSquare },
      { id: 'extended', label: 'بيانات تفصيلية', icon: UserCog },
    ],
    [],
  )

  const attendanceStats = useMemo(() => {
    const present = attendanceRow?.total_present ?? 0
    const absent = attendanceRow?.total_absent ?? 0
    const excusedAbsent = attendanceRow?.total_excused_absent ?? 0
    const unexcusedAbsent = attendanceRow?.total_unexcused_absent ?? 0
    const late = attendanceRow?.total_late ?? 0
    const excused = attendanceRow?.total_excused ?? 0
    const totalDays = present + absent + late + excused

    return {
      present,
      absent,
      excusedAbsent,
      unexcusedAbsent,
      late,
      excused,
      totalDays,
    }
  }, [attendanceRow])

  const attendanceRate =
    attendanceStats.totalDays > 0 ? Math.round((attendanceStats.present / attendanceStats.totalDays) * 100) : null

  // إيقاع الحضور: من الأقدم إلى الأحدث للعرض البصري
  const rhythmRecords = useMemo(() => [...attendanceTimeline].reverse(), [attendanceTimeline])

  const handlePeriodChange = (value: PeriodKey) => {
    setPeriod(value)
    if (value !== 'custom') return

    setCustomRange((prev) => {
      if (prev.start && prev.end) return prev
      const lastThirty = new Date()
      lastThirty.setDate(lastThirty.getDate() - 29)
      return {
        start: toISODate(lastThirty),
        end: toISODate(new Date()),
      }
    })
  }

  const handleReset = () => {
    setSelectedStudentId(null)
    setSearchTerm('')
    setPeriod('semester')
    setCustomRange({ start: '', end: '' })
  }

  const isLoadingAny =
    attendanceQuery.isLoading ||
    lateArrivalsQuery.isLoading ||
    leaveRequestsQuery.isLoading ||
    (selectedStudent && whatsappHistoryQuery.isLoading)

  return (
    <WsPage>
      <WsHeader
        title="ملف الطالب"
        badge={selectedStudent ? selectedStudent.name : 'لم يُحدد طالب'}
        actions={
          <>
            <WsBtn icon={RotateCcw} onClick={handleReset}>
              إعادة تعيين
            </WsBtn>
            {selectedStudent && (
              <WsBtn variant="primary" icon={Printer} onClick={() => setPrintDialogOpen(true)}>
                طباعة تقرير شامل
              </WsBtn>
            )}
          </>
        }
        facts={
          selectedStudent ? (
            <>
              <WsFact icon={CalendarDays} label="الحضور:">
                {attendanceStats.present.toLocaleString('ar-SA-u-nu-latn')}
              </WsFact>
              <WsFact label="الغياب:">{attendanceStats.absent.toLocaleString('ar-SA-u-nu-latn')}</WsFact>
              <WsFact label="التأخير:">{attendanceStats.late.toLocaleString('ar-SA-u-nu-latn')}</WsFact>
              <WsFact label="الاستئذان:">{attendanceStats.excused.toLocaleString('ar-SA-u-nu-latn')}</WsFact>
              {attendanceRate !== null && <WsFact label="نسبة الحضور:">{attendanceRate}٪</WsFact>}
            </>
          ) : (
            <WsFact icon={Users} label="الطلاب:">
              {students.length.toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          )
        }
      >
        {isLoadingAny ? <WsChip tone="sky">جارٍ تحديث البيانات...</WsChip> : null}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: قائمة الطلاب */}
        <WsSideCol title="الطلاب" icon={Users} side="start" width={260} storageKey="ws:student-profile:list">
          <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
            <WsInput
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="اسم، هوية، صف..."
            />
          </div>
          <WsBlock title="النتائج" count={filteredStudents.length.toLocaleString('ar-SA-u-nu-latn')} fill scroll>
            {studentsQuery.isLoading ? (
              <WsEmpty loading>جارٍ تحميل الطلاب...</WsEmpty>
            ) : filteredStudents.length === 0 ? (
              <WsEmpty icon={Users}>لا توجد نتائج مطابقة.</WsEmpty>
            ) : (
              <div>
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentId === student.id
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '7px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)' }}>
                        {student.name}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 2 }}>
                        {student.grade} - {student.class_name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: التبويبات والمحتوى */}
        <WsMain>
          <WsBlock
            title={
              <span className="ws-seg" style={{ display: 'inline-flex' }}>
                {profileSections.map((section) => {
                  const SectionIcon = section.icon
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`ws-seg__btn ${activeSection === section.id ? 'is-active' : ''}`}
                      disabled={!selectedStudent}
                    >
                      <SectionIcon style={{ width: 12, height: 12 }} />
                      {section.label}
                    </button>
                  )
                })}
              </span>
            }
            tools={
              selectedStudent ? (
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  الفترة: {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                </span>
              ) : undefined
            }
            fill
            scroll
          >
            {!selectedStudent ? (
              <WsEmpty icon={UserRound}>
                اختر طالبًا من القائمة اليمنى لعرض ملفه الكامل — الحضور، السجلات، والمراسلات.
              </WsEmpty>
            ) : (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* ══ نظرة عامة ══ */}
                {activeSection === 'overview' && (
                  <>
                    {/* إيقاع الحضور */}
                    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>إيقاع الحضور — آخر {attendanceTimeline.length} يوم مسجل</span>
                        <span style={{ display: 'inline-flex', gap: 8, fontSize: 10 }}>
                          {Object.values(ATTENDANCE_STATUS_META).map(({ label, color }) => (
                            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--ws-text-2)' }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                              {label}
                            </span>
                          ))}
                        </span>
                      </div>

                      {attendanceQuery.isError ? (
                        <WsAlert boxed style={{ marginTop: 10 }}>تعذر تحميل بيانات الحضور. يرجى المحاولة لاحقًا.</WsAlert>
                      ) : rhythmRecords.length === 0 ? (
                        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ws-text-2)' }}>
                          لا توجد سجلات حضور في هذه الفترة.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                          {rhythmRecords.map((record, index) => {
                            const meta = ATTENDANCE_STATUS_META[record.status] ?? ATTENDANCE_STATUS_META.excused
                            return (
                              <span
                                key={`${record.date}-${index}`}
                                title={`${formatDate(record.date)} — ${meta.label}${record.notes ? ` (${record.notes})` : ''}`}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 5,
                                  background: meta.color,
                                  opacity: record.status === 'present' ? 0.85 : 1,
                                  cursor: 'default',
                                }}
                              />
                            )
                          })}
                        </div>
                      )}

                      {attendanceRate !== null && (
                        <div style={{ marginTop: 12 }}>
                          <WsProgress value={attendanceRate} label={`نسبة الحضور ${attendanceRate}٪`} />
                          <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.8, color: 'var(--ws-text-2)' }}>
                            إجمالي الأيام المسجلة <b style={{ color: 'var(--ws-text)' }}>{attendanceStats.totalDays.toLocaleString('ar-SA-u-nu-latn')}</b> يومًا
                            {attendanceStats.absent > 0 && (
                              <>
                                {' '}— الغياب <b style={{ color: 'var(--ws-red)' }}>{attendanceStats.absent}</b>
                                {' '}({attendanceStats.excusedAbsent} بعذر، {attendanceStats.unexcusedAbsent} بدون عذر)
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* سجلات الحضور */}
                    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 10, overflow: 'hidden' }}>
                      <div className="ws-block__head">
                        <span className="ws-block__title">
                          سجلات الحضور
                          <span className="ws-count">{attendanceTimeline.length}</span>
                        </span>
                      </div>
                      {attendanceTimeline.length === 0 ? (
                        <p style={{ margin: 0, padding: 14, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد سجلات.</p>
                      ) : (
                        <div>
                          {attendanceTimeline.map((record, index) => {
                            const meta = ATTENDANCE_STATUS_META[record.status] ?? ATTENDANCE_STATUS_META.excused
                            return (
                              <div
                                key={`${record.date}-${record.status}-${index}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  padding: '7px 12px',
                                  borderBottom: index === attendanceTimeline.length - 1 ? 'none' : '1px solid var(--ws-hairline)',
                                }}
                              >
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{formatDate(record.date)}</span>
                                  {record.notes ? <span className="ws-cell-sub">{record.notes}</span> : null}
                                </span>
                                <WsChip tone={meta.tone}>{meta.label}</WsChip>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ══ السجلات ══ */}
                {activeSection === 'records' && (
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                    {/* التأخير */}
                    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 10, overflow: 'hidden' }}>
                      <div className="ws-block__head">
                        <span className="ws-block__title">
                          سجلات التأخير
                          <span className="ws-count">{studentLateArrivals.length.toLocaleString('ar-SA-u-nu-latn')}</span>
                        </span>
                      </div>
                      {lateArrivalsQuery.isError ? (
                        <WsAlert boxed style={{ margin: 12 }}>تعذر تحميل سجلات التأخير.</WsAlert>
                      ) : studentLateArrivals.length === 0 ? (
                        <p style={{ margin: 0, padding: 14, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد سجلات تأخير للطالب.</p>
                      ) : (
                        <div>
                          {studentLateArrivals.map((record: LateArrivalRecord, index) => (
                            <div
                              key={record.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '8px 12px',
                                borderBottom: index === studentLateArrivals.length - 1 ? 'none' : '1px solid var(--ws-hairline)',
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{formatDate(record.late_date)}</span>
                                <span className="ws-cell-sub">تم التسجيل: {formatDateTime(record.recorded_at)}</span>
                                {record.notes ? <span className="ws-cell-sub" style={{ display: 'block' }}>{record.notes}</span> : null}
                              </span>
                              <WsChip tone={record.whatsapp_sent ? 'green' : undefined}>
                                {record.whatsapp_sent ? 'تم إشعار ولي الأمر' : 'لم يتم الإشعار'}
                              </WsChip>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* الاستئذان */}
                    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 10, overflow: 'hidden' }}>
                      <div className="ws-block__head">
                        <span className="ws-block__title">
                          طلبات الاستئذان
                          <span className="ws-count">{leaveRequests.length.toLocaleString('ar-SA-u-nu-latn')}</span>
                        </span>
                      </div>
                      {leaveRequestsQuery.isError ? (
                        <WsAlert boxed style={{ margin: 12 }}>تعذر تحميل طلبات الاستئذان.</WsAlert>
                      ) : leaveRequests.length === 0 ? (
                        <p style={{ margin: 0, padding: 14, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد طلبات استئذان مسجلة.</p>
                      ) : (
                        <div>
                          {leaveRequests.map((request: LeaveRequestRecord, index) => {
                            const statusMeta = LEAVE_STATUS_META[request.status ?? 'pending']
                            return (
                              <div
                                key={request.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  padding: '8px 12px',
                                  borderBottom: index === leaveRequests.length - 1 ? 'none' : '1px solid var(--ws-hairline)',
                                }}
                              >
                                <span style={{ minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{request.reason}</span>
                                  <span className="ws-cell-sub">تاريخ الطلب: {formatDateTime(request.created_at)}</span>
                                  {request.decision_notes ? (
                                    <span className="ws-cell-sub" style={{ display: 'block' }}>ملاحظات: {request.decision_notes}</span>
                                  ) : null}
                                </span>
                                <WsChip tone={statusMeta.tone}>{statusMeta.label}</WsChip>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ التواصل ══ */}
                {activeSection === 'communications' && (
                  <>
                    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 10, overflow: 'hidden' }}>
                      <div className="ws-block__head">
                        <span className="ws-block__title">
                          <MessageSquare style={{ width: 13, height: 13 }} />
                          رسائل الواتساب
                          <span className="ws-count">{studentWhatsappMessages.length.toLocaleString('ar-SA-u-nu-latn')}</span>
                        </span>
                        <span className="ws-block__tools" style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                          انقر أي رسالة للتفاصيل
                        </span>
                      </div>
                      {whatsappHistoryQuery.isError ? (
                        <WsAlert boxed style={{ margin: 12 }}>تعذر تحميل سجل الواتساب.</WsAlert>
                      ) : studentWhatsappMessages.length === 0 ? (
                        <p style={{ margin: 0, padding: 14, fontSize: 12, color: 'var(--ws-text-2)' }}>
                          لا توجد رسائل واتساب مرتبطة بالطالب ضمن البيانات الحالية.
                        </p>
                      ) : (
                        <div>
                          {studentWhatsappMessages.map((message, index) => (
                            <button
                              key={message.id}
                              type="button"
                              onClick={() => setSelectedMessage(message)}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'right',
                                padding: '8px 12px',
                                border: 'none',
                                borderBottom: index === studentWhatsappMessages.length - 1 ? 'none' : '1px solid var(--ws-hairline)',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-text)', minWidth: 0 }}>
                                  {message.template_name ?? 'رسالة مخصصة'}
                                </span>
                                <WsChip tone={message.status === 'sent' ? 'green' : 'red'}>
                                  {message.status === 'sent' ? 'مرسلة' : 'فشلت'}
                                </WsChip>
                              </span>
                              <span
                                className="ws-cell-sub"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  marginTop: 3,
                                }}
                              >
                                {message.message_content ?? message.message_body ?? message.message_preview ?? 'لا يوجد محتوى'}
                              </span>
                              <span className="ws-cell-sub" style={{ display: 'block', marginTop: 3 }}>
                                {formatDateTime(message.sent_at ?? message.created_at)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <WsAlert tone="info" boxed>
                      رسائل المعلمين حول الطالب — قريبًا: سيتم تفعيل هذا القسم فور توفر الواجهة البرمجية، والبنية جاهزة للدمج.
                    </WsAlert>
                  </>
                )}

                {/* ══ بيانات تفصيلية ══ */}
                {activeSection === 'extended' && (
                  <div style={{ display: 'grid', gap: 18 }}>
                    {/* بطاقةُ حصر المعلومات — تهبط من ردٍّ اعتمده الموجّه، وتُعرض
                        مطموسةً لمن لا يحقّ له. لا شرطَ إخفاءٍ هنا: المحجوب لم يصل. */}
                    <StudentAttributesPanel studentId={selectedStudentId} />

                    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {[
                      { title: 'السلوك والانضباط', text: 'سيتضمن تنبيهات السلوك والمخالفات وخطط المعالجة عبر التكامل مع نظام المتابعة السلوكية.' },
                      { title: 'النقاط والمكافآت', text: 'بمجرد ربط نظام التحفيز سيعرض هذا القسم النقاط المكتسبة والجوائز وسجل المكافآت مع التصفية والتحليل.' },
                    ].map(({ title, text }) => (
                      <div
                        key={title}
                        style={{
                          border: '1px dashed var(--ws-border)',
                          borderRadius: 10,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</span>
                          <WsChip tone="sky">قريبًا</WsChip>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.8, color: 'var(--ws-text-2)' }}>{text}</p>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* العمود الأيسر: هوية الطالب + الفترة + الملخص السريع */}
        <WsSideCol title="بطاقة الطالب" icon={UserRound} width={300} storageKey="ws:student-profile:card">
          {!selectedStudent ? (
            <WsBlock fill>
              <WsEmpty icon={UserRound}>بانتظار اختيار طالب...</WsEmpty>
            </WsBlock>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {/* الهوية */}
              <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--ws-hairline)', textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--ws-accent-soft)',
                    color: 'var(--ws-accent-2)',
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {selectedStudent.name.trim().charAt(0)}
                </span>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800 }}>{selectedStudent.name}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  <WsChip icon={GraduationCap}>{selectedStudent.grade}</WsChip>
                  <WsChip>{selectedStudent.class_name}</WsChip>
                </div>
                <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--ws-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedStudent.national_id}
                </div>
              </div>

              {/* ولي الأمر */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ws-hairline)' }}>
                <WsFactsList>
                  <WsFactRow label="ولي الأمر">{selectedStudent.parent_name || 'غير مسجل'}</WsFactRow>
                  <WsFactRow label="رقم التواصل">
                    <span dir="ltr" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Phone style={{ width: 11, height: 11, color: 'var(--ws-text-2)' }} />
                      {selectedStudent.parent_phone || '—'}
                    </span>
                  </WsFactRow>
                </WsFactsList>
              </div>

              {/* الفترة الزمنية */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--ws-hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                  <CalendarRange style={{ width: 12, height: 12, color: 'var(--ws-accent-2)' }} />
                  الفترة الزمنية
                </div>
                <div className="ws-choice-grid">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePeriodChange(option.value)}
                      className={`ws-choice ${period === option.value ? 'is-selected' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {period === 'semester' && currentSemester && (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 8,
                      background: 'var(--ws-accent-soft)',
                      padding: '7px 10px',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700 }}>
                      <GraduationCap style={{ width: 12, height: 12 }} />
                      {currentSemester.name}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 10, color: 'var(--ws-text-2)' }}>
                      {formatDate(currentSemester.start_date)} — {formatDate(currentSemester.end_date)}
                    </div>
                  </div>
                )}

                {period === 'custom' && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <label style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                      من
                      <WsInput
                        type="date"
                        value={customRange.start}
                        onChange={(event) => setCustomRange((prev) => ({ ...prev, start: event.target.value }))}
                        style={{ marginTop: 3, width: '100%' }}
                      />
                    </label>
                    <label style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>
                      إلى
                      <WsInput
                        type="date"
                        value={customRange.end}
                        onChange={(event) => setCustomRange((prev) => ({ ...prev, end: event.target.value }))}
                        style={{ marginTop: 3, width: '100%' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* الملخص السريع */}
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>الملخص السريع</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    {
                      label: 'آخر رسالة واتساب',
                      value: latestWhatsappMessage?.template_name ?? latestWhatsappMessage?.message_preview ?? '—',
                      sub: latestWhatsappMessage
                        ? formatDateTime(latestWhatsappMessage.sent_at ?? latestWhatsappMessage.created_at)
                        : '—',
                    },
                    {
                      label: 'آخر تأخير مسجل',
                      value: latestLateArrival ? formatDate(latestLateArrival.late_date) : '—',
                      sub: latestLateArrival?.notes ?? '—',
                    },
                    {
                      label: 'آخر طلب استئذان',
                      value: latestLeaveRequest ? formatDateTime(latestLeaveRequest.created_at) : '—',
                      sub: latestLeaveRequest?.reason ?? '—',
                    },
                  ].map(({ label, value, sub }) => (
                    <div
                      key={label}
                      style={{ border: '1px solid var(--ws-hairline)', borderRadius: 8, padding: '7px 10px' }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ws-text-2)' }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{value}</div>
                      <div className="ws-cell-sub" style={{ marginTop: 1 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </WsSideCol>
      </WsLayout>

      {/* مودال تفاصيل الرسالة */}
      <WsModal
        open={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        title={selectedMessage?.template_name ?? 'رسالة مخصصة'}
        sub={selectedMessage ? formatDateTime(selectedMessage.sent_at ?? selectedMessage.created_at) : undefined}
        maxWidth={560}
        footer={
          <WsBtn onClick={() => setSelectedMessage(null)}>إغلاق</WsBtn>
        }
      >
        {selectedMessage ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <WsChip tone={selectedMessage.status === 'sent' ? 'green' : 'red'}>
                {selectedMessage.status === 'sent' ? 'تم الإرسال بنجاح' : 'فشل الإرسال'}
              </WsChip>
            </div>
            <div
              style={{
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface-2)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.9,
                whiteSpace: 'pre-wrap',
              }}
            >
              {selectedMessage.message_content ??
                selectedMessage.message_body ??
                selectedMessage.message_preview ??
                'لا يوجد محتوى'}
            </div>
            <WsFactsList>
              <WsFactRow label="تاريخ الإرسال">
                {formatDateTime(selectedMessage.sent_at ?? selectedMessage.created_at)}
              </WsFactRow>
              <WsFactRow label="رقم ولي الأمر">
                <span dir="ltr">{selectedMessage.recipient_phone ?? selectedMessage.phone_number ?? 'غير متوفر'}</span>
              </WsFactRow>
              <WsFactRow label="اسم المستلم">
                {selectedMessage.recipient_name ?? selectedMessage.recipient ?? 'غير محدد'}
              </WsFactRow>
              {(selectedMessage.student_grade || selectedMessage.student_class) && (
                <WsFactRow label="الصف والفصل">
                  {selectedMessage.student_grade} — {selectedMessage.student_class}
                </WsFactRow>
              )}
            </WsFactsList>
          </>
        ) : null}
      </WsModal>

      <StudentReportPrintDialog
        student={selectedStudent}
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
      />
    </WsPage>
  )
}

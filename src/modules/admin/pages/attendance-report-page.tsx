import { useEffect, useMemo, useState } from 'react'
import {
  useAttendanceReportMatrixQuery,
  useExportAttendanceReportMutation,
  useStudentsQuery,
  useGradesWithClassesQuery,
} from '../hooks'
import type {
  AttendanceReportFiltersPayload,
  AttendanceReportMatrix,
  AttendanceReportStudentRow,
} from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import { AbsentStudentsPDFModal } from '../components/absent-students-pdf-modal'
import { NoorSyncStatusModal } from '../components/noor-sync-status-modal'
import { NoorExcuseSyncStatusModal } from '../components/noor-excuse-sync-status-modal'
import { AttendanceStatsModal } from '../components/attendance-stats-modal'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileDown,
  FileSpreadsheet,
  FileText,
  Play,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  UserRoundCheck,
  Users,
  XCircle,
} from 'lucide-react'
import {
  WsBlock,
  WsBtn,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
} from '@/shared/workspace'

const REPORT_TYPES = [
  { value: 'class', label: 'كشف فصل كامل', description: 'حدد الصف والشعبة لعرض جميع الطلاب في الفصل.' },
  { value: 'student', label: 'كشف طالب واحد', description: 'ابحث باسم الطالب أو رقمه لعرض حضوره الشخصي.' },
  { value: 'grade', label: 'كشف حسب الصف', description: 'اعرض جميع شعب الصف المختار في تقرير واحد.' },
] as const

type ReportTypeValue = (typeof REPORT_TYPES)[number]['value']

const PERIOD_OPTIONS = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'آخر ٧ أيام' },
  { value: 'month', label: 'آخر ٣٠ يوم' },
  { value: 'custom', label: 'مخصصة' },
] as const

type ReportPeriod = (typeof PERIOD_OPTIONS)[number]['value']

// الصفوف والفصول تُجلب ديناميكياً من الـ API

const STATUS_ORDER = ['present', 'absent', 'late', 'excused'] as const

type StatusKey = (typeof STATUS_ORDER)[number]

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string
    symbol: string
    color: string
    bg: string
    border: string
  }
> = {
  present: { label: 'الحضور', symbol: '✓', color: 'var(--ws-green)', bg: 'var(--ws-green-bg)', border: 'var(--ws-green-bd)' },
  absent: { label: 'الغياب', symbol: '✗', color: 'var(--ws-red)', bg: 'var(--ws-red-bg)', border: 'var(--ws-red-bd)' },
  late: { label: 'التأخير', symbol: '⚠', color: 'var(--ws-amber)', bg: 'var(--ws-amber-bg)', border: 'var(--ws-amber-bd)' },
  excused: { label: 'الاستئذان', symbol: 'ℹ', color: 'var(--ws-sky)', bg: 'var(--ws-sky-bg)', border: 'var(--ws-sky-bd)' },
}

interface FilterState {
  reportType: ReportTypeValue
  grade: string
  className: string
  studentId: number | null
  studentSearch: string
  period: ReportPeriod
  startDate: string
  endDate: string
  showStatuses: Record<StatusKey, boolean>
  showTotals: Record<StatusKey, boolean>
}

const MAX_STUDENT_OPTIONS = 200
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

type DateRange = { start: string; end: string }

type AttendanceEntry = AttendanceReportStudentRow['attendance'][number]

type ReportMeta = {
  grade: string | null
  className: string | null
  studentName: string | null
}

function formatISO(date: Date) {
  const offset = date.getTimezoneOffset()
  const normalized = new Date(date.getTime() - offset * 60_000)
  return normalized.toISOString().slice(0, 10)
}

function getDefaultDateRange(period: ReportPeriod): DateRange {
  const today = new Date()

  switch (period) {
    case 'today':
      return { start: formatISO(today), end: formatISO(today) }
    case 'week': {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      return { start: formatISO(start), end: formatISO(today) }
    }
    case 'month': {
      const start = new Date(today)
      start.setDate(today.getDate() - 29)
      return { start: formatISO(start), end: formatISO(today) }
    }
    default:
      return { start: formatISO(today), end: formatISO(today) }
  }
}

function resolveDateRange(period: ReportPeriod, startDate: string, endDate: string): DateRange {
  if (period !== 'custom') {
    return getDefaultDateRange(period)
  }

  if (!startDate || !endDate) {
    throw new Error('يرجى تحديد تاريخ البداية والنهاية للفترة المخصصة')
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('تواريخ الفترة المخصصة غير صالحة')
  }

  if (start > end) {
    throw new Error('يجب أن يكون تاريخ البداية أسبق من تاريخ النهاية')
  }

  return { start: formatISO(start), end: formatISO(end) }
}

function buildDefaultFilterState(): FilterState {
  const range = getDefaultDateRange('week')

  return {
    reportType: 'class',
    grade: '',
    className: '',
    studentId: null,
    studentSearch: '',
    period: 'week',
    startDate: range.start,
    endDate: range.end,
    showStatuses: {
      present: true,
      absent: true,
      late: true,
      excused: true,
    },
    showTotals: {
      present: true,
      absent: true,
      late: true,
      excused: false,
    },
  }
}

function formatRange(start: string, end: string) {
  if (!start || !end) return '—'

  try {
    const formatter = new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return `${start} → ${end}`
    }

    if (start === end) {
      return formatter.format(startDate)
    }

    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
  } catch {
    if (start === end) return start
    return `${start} → ${end}`
  }
}

function formatDateLabel(date: string) {
  try {
    const target = new Date(date)
    if (Number.isNaN(target.getTime())) return date

    const weekday = new Intl.DateTimeFormat('ar-SA', { weekday: 'short' }).format(target)
    const dayMonth = new Intl.DateTimeFormat('ar-SA', { day: '2-digit', month: '2-digit' }).format(target)

    return `${weekday} ${dayMonth}`
  } catch {
    return date
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function getSummaryValue(summary: AttendanceReportMatrix['summary'], status: StatusKey) {
  switch (status) {
    case 'present':
      return summary.total_present
    case 'absent':
      return summary.total_absent
    case 'late':
      return summary.total_late
    case 'excused':
      return summary.total_excused ?? 0
    default:
      return 0
  }
}

function getRowTotal(student: AttendanceReportStudentRow, status: StatusKey) {
  switch (status) {
    case 'present':
      return student.total_present
    case 'absent':
      return student.total_absent
    case 'late':
      return student.total_late
    case 'excused':
      return student.total_excused ?? 0
    default:
      return 0
  }
}

function resolveReportMeta(
  report: AttendanceReportMatrix | null,
  filters: FilterState,
  submittedFilters: AttendanceReportFiltersPayload | null,
  fallbackStudentName: string | null,
): ReportMeta {
  const grade =
    report?.summary.grade ??
    report?.metadata?.grade ??
    submittedFilters?.grade ??
    (filters.grade || null)

  const className =
    report?.summary.class_name ??
    report?.metadata?.class_name ??
    submittedFilters?.class ??
    (filters.className || null)

  const studentName =
    report?.summary.student_name ??
    report?.metadata?.student?.name ??
    fallbackStudentName ??
    null

  return { grade, className, studentName }
}

function buildAttendanceIndex(row: AttendanceReportStudentRow) {
  const index: Record<string, AttendanceEntry> = {}
  row.attendance.forEach((entry) => {
    index[entry.date] = entry
  })
  return index
}

// شريحة تبديل حالة (تمييز/إجمالي) بألوان الحالة
function StatusToggleChip({
  status,
  active,
  onClick,
}: {
  status: StatusKey
  active: boolean
  onClick: () => void
}) {
  const config = STATUS_CONFIG[status]
  return (
    <button
      type="button"
      onClick={onClick}
      className="ws-chip"
      style={
        active
          ? { color: config.color, background: config.bg, borderColor: config.border }
          : undefined
      }
    >
      {config.symbol} {config.label}
    </button>
  )
}

export function AttendanceReportPage() {
  const [filters, setFilters] = useState<FilterState>(() => buildDefaultFilterState())
  const [submittedFilters, setSubmittedFilters] = useState<AttendanceReportFiltersPayload | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[1])
  const [showAbsentPDFModal, setShowAbsentPDFModal] = useState(false)
  const [showNoorSyncModal, setShowNoorSyncModal] = useState(false)
  const [showNoorExcuseSyncModal, setShowNoorExcuseSyncModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)

  const toast = useToast()
  const studentsQuery = useStudentsQuery()
  const exportMutation = useExportAttendanceReportMutation()
  const gradesWithClassesQuery = useGradesWithClassesQuery()

  // الصفوف والفصول ديناميكياً
  const gradeOptions = useMemo(() => gradesWithClassesQuery.data ?? [], [gradesWithClassesQuery.data])

  const classOptions = useMemo(() => {
    if (!filters.grade) return []
    const record = gradeOptions.find((g) => g.grade === filters.grade)
    return record ? record.classes : []
  }, [filters.grade, gradeOptions])

  const getClassesForGrade = (grade: string): string[] => {
    const record = gradeOptions.find((g) => g.grade === grade)
    return record ? record.classes : []
  }

  const filteredStudents = useMemo(() => {
    const list = studentsQuery.data ?? []
    const search = filters.studentSearch.trim()

    if (!search) {
      return list.slice(0, MAX_STUDENT_OPTIONS)
    }

    const normalized = search.toLowerCase()

    return list
      .filter((student) => {
        const nameMatch = student.name.toLowerCase().includes(normalized)
        const gradeMatch = student.grade?.toLowerCase?.().includes(normalized) ?? false
        const classMatch = student.class_name?.toLowerCase?.().includes(normalized) ?? false
        const nationalIdMatch = student.national_id?.includes(search) ?? false
        return nameMatch || gradeMatch || classMatch || nationalIdMatch
      })
      .slice(0, MAX_STUDENT_OPTIONS)
  }, [studentsQuery.data, filters.studentSearch])

  const submittedStudentId = submittedFilters?.student_id ?? null

  const fallbackStudentName = useMemo(() => {
    const id = submittedStudentId ?? filters.studentId
    if (!id) return null
    const list = studentsQuery.data ?? []
    const match = list.find((student) => student.id === id)
    return match ? match.name : null
  }, [submittedStudentId, filters.studentId, studentsQuery.data])

  const reportQuery = useAttendanceReportMatrixQuery(submittedFilters, { enabled: Boolean(submittedFilters) })
  const report = reportQuery.data ?? null

  const reportMeta = resolveReportMeta(report, filters, submittedFilters, fallbackStudentName)
  const activeRange = submittedFilters
    ? { start: submittedFilters.start_date, end: submittedFilters.end_date }
    : { start: filters.startDate, end: filters.endDate }
  const rangeLabel = formatRange(activeRange.start, activeRange.end)

  const isLoadingReport = reportQuery.isLoading || (reportQuery.isFetching && !report)
  const isRefetching = reportQuery.isFetching && Boolean(report)
  const hasData = Boolean(report && report.students.length > 0)
  const showNoData = Boolean(report && report.students.length === 0)

  const statusesForTotals = STATUS_ORDER.filter((status) => filters.showTotals[status])

  const totalStudents = report?.students.length ?? 0
  const totalPages = totalStudents ? Math.max(1, Math.ceil(totalStudents / pageSize)) : 1

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedFilters, report?.students?.length, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const startIndex = totalStudents ? (page - 1) * pageSize : 0
  const endIndex = totalStudents ? Math.min(startIndex + pageSize, totalStudents) : 0
  const paginatedStudents = report ? report.students.slice(startIndex, endIndex) : []

  const metaPieces: string[] = []
  if (reportMeta.studentName) metaPieces.push(`الطالب: ${reportMeta.studentName}`)
  if (reportMeta.grade) metaPieces.push(`الصف: ${reportMeta.grade}`)
  if (reportMeta.className) metaPieces.push(`الشعبة: ${reportMeta.className}`)

  const metaLabel = metaPieces.length ? metaPieces.join(' • ') : null

  const isExporting = exportMutation.isPending
  const canExport = hasData && Boolean(submittedFilters)
  const errorMessage = reportQuery.error instanceof Error ? reportQuery.error.message : 'حدث خطأ غير متوقع'

  const handleReportTypeChange = (type: ReportTypeValue) => {
    setFilters((prev) => ({
      ...prev,
      reportType: type,
      grade: type === 'student' ? '' : prev.grade,
      className: type === 'class' ? prev.className : '',
      studentId: type === 'student' ? prev.studentId : null,
      studentSearch: type === 'student' ? prev.studentSearch : '',
    }))
  }

  const handleGradeChange = (value: string) => {
    setFilters((prev) => {
      const classes = getClassesForGrade(value)
      return {
        ...prev,
        grade: value,
        className: classes.includes(prev.className) ? prev.className : '',
      }
    })
  }

  const handlePeriodChange = (value: ReportPeriod) => {
    setFilters((prev) => {
      const next: FilterState = { ...prev, period: value }
      if (value !== 'custom') {
        const range = getDefaultDateRange(value)
        next.startDate = range.start
        next.endDate = range.end
      }
      return next
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleToggleStatus = (status: StatusKey) => {
    setFilters((prev) => ({
      ...prev,
      showStatuses: { ...prev.showStatuses, [status]: !prev.showStatuses[status] },
    }))
  }

  const handleToggleTotals = (status: StatusKey) => {
    setFilters((prev) => ({
      ...prev,
      showTotals: { ...prev.showTotals, [status]: !prev.showTotals[status] },
    }))
  }

  const handleResetFilters = () => {
    setFilters(buildDefaultFilterState())
    setSubmittedFilters(null)
  }

  const handleGenerateReport = () => {
    try {
      if (filters.reportType === 'class') {
        if (!filters.grade || !filters.className) {
          toast({ type: 'warning', title: 'يرجى اختيار الصف والشعبة قبل إنشاء الكشف' })
          return
        }
      }

      if (filters.reportType === 'grade' && !filters.grade) {
        toast({ type: 'warning', title: 'يرجى اختيار الصف قبل إنشاء الكشف' })
        return
      }

      if (filters.reportType === 'student' && !filters.studentId) {
        toast({ type: 'warning', title: 'يرجى اختيار الطالب قبل إنشاء الكشف' })
        return
      }

      const range = resolveDateRange(filters.period, filters.startDate, filters.endDate)

      const payload: AttendanceReportFiltersPayload = {
        type: filters.reportType,
        start_date: range.start,
        end_date: range.end,
      }

      if ((filters.reportType === 'class' || filters.reportType === 'grade') && filters.grade) {
        payload.grade = filters.grade
      }

      if (filters.reportType === 'class' && filters.className) {
        payload.class = filters.className
      }

      if (filters.reportType === 'student' && filters.studentId) {
        payload.student_id = filters.studentId
      }

      setSubmittedFilters({ ...payload })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديد الفترة الزمنية'
      toast({ type: 'error', title: message })
    }
  }

  const handleExport = (format: 'excel' | 'pdf') => {
    if (!submittedFilters) {
      toast({ type: 'info', title: 'أنشئ التقرير أولاً قبل التصدير' })
      return
    }

    exportMutation.mutate(
      { format, filters: { ...submittedFilters } },
      {
        onSuccess: (blob) => {
          const filename = format === 'excel' ? `كشف-الغياب-${Date.now()}.xlsx` : `كشف-الغياب-${Date.now()}.pdf`
          downloadBlob(blob, filename)
        },
      },
    )
  }

  const handlePrint = () => {
    if (!hasData) {
      toast({ type: 'info', title: 'لا توجد بيانات لطباعتها' })
      return
    }
    window.print()
  }

  return (
    <WsPage>
      <WsHeader
        title="كشف الغياب"
        badge="مصفوفة الحضور"
        actions={
          <>
            <WsBtn icon={BarChart3} onClick={() => setShowStatsModal(true)}>
              الإحصائيات
            </WsBtn>
            <WsBtn icon={UserRoundCheck} onClick={() => setShowNoorSyncModal(true)}>
              رصد نور
            </WsBtn>
            <WsBtn icon={ClipboardCheck} onClick={() => setShowNoorExcuseSyncModal(true)}>
              رصد الأعذار
            </WsBtn>
            <WsBtn variant="primary" icon={FileDown} onClick={() => setShowAbsentPDFModal(true)}>
              كشف الغائبين
            </WsBtn>
          </>
        }
        facts={
          report ? (
            <>
              <WsFact icon={Users} label="الطلاب:">
                {totalStudents.toLocaleString('ar-SA')}
              </WsFact>
              {STATUS_ORDER.map((status) => (
                <WsFact
                  key={status}
                  icon={
                    status === 'present' ? CheckCircle2 : status === 'absent' ? XCircle : status === 'late' ? Clock3 : DoorOpen
                  }
                  label={`${STATUS_CONFIG[status].label}:`}
                >
                  {getSummaryValue(report.summary, status).toLocaleString('ar-SA')}
                </WsFact>
              ))}
              <WsFact icon={CalendarDays} label="الفترة:">
                {rangeLabel}
              </WsFact>
            </>
          ) : (
            <>
              <WsFact icon={CalendarDays} label="الفترة المحددة:">
                {rangeLabel}
              </WsFact>
              <WsFact icon={ClipboardList}>حدد نطاق الكشف من اليمين ثم اضغط «إنشاء التقرير»</WsFact>
            </>
          )
        }
      >
        {metaLabel && <span className="ws-chip">{metaLabel}</span>}
      </WsHeader>

      <WsLayout>
        {/* عمود إعدادات التقرير — يمين */}
        <WsSideCol
          title="إعدادات التقرير"
          icon={Settings2}
          side="start"
          width={300}
          storageKey="ws:attendance-report:builder"
        >
          <form
            className="ws-sidecol__scroll"
            onSubmit={(event) => {
              event.preventDefault()
              handleGenerateReport()
            }}
          >
            <WsBlock title="نوع الكشف" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {REPORT_TYPES.map((option) => {
                  const checked = filters.reportType === option.value
                  return (
                    <label key={option.value} className={`ws-pick ${checked ? 'is-checked' : ''}`}>
                      <span style={{ minWidth: 0 }}>
                        <span className="ws-pick__name">{option.label}</span>
                        <span className="ws-pick__sub" style={{ whiteSpace: 'normal' }}>
                          {option.description}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="report-type"
                        checked={checked}
                        onChange={() => handleReportTypeChange(option.value)}
                      />
                    </label>
                  )
                })}
              </div>
            </WsBlock>

            {(filters.reportType === 'class' || filters.reportType === 'grade') && (
              <WsBlock title="الصف والشعبة" padded>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <WsField label="الصف الدراسي" htmlFor="ws-rep-grade">
                    <WsSelect
                      id="ws-rep-grade"
                      value={filters.grade}
                      onChange={(event) => handleGradeChange(event.target.value)}
                    >
                      <option value="">اختر الصف</option>
                      {gradeOptions.map((g) => (
                        <option key={g.grade} value={g.grade}>
                          {g.grade}
                        </option>
                      ))}
                    </WsSelect>
                  </WsField>

                  {filters.reportType === 'class' && (
                    <WsField label="الشعبة" htmlFor="ws-rep-class">
                      <WsSelect
                        id="ws-rep-class"
                        value={filters.className}
                        onChange={(event) => setFilters((prev) => ({ ...prev, className: event.target.value }))}
                        disabled={!filters.grade}
                      >
                        <option value="">اختر الشعبة</option>
                        {classOptions.map((className) => (
                          <option key={className} value={className}>
                            {className}
                          </option>
                        ))}
                      </WsSelect>
                    </WsField>
                  )}
                </div>
              </WsBlock>
            )}

            {filters.reportType === 'student' && (
              <WsBlock title="البحث عن طالب" padded>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <WsField label="البحث بالاسم أو الهوية" htmlFor="ws-rep-student-search">
                    <WsInput
                      id="ws-rep-student-search"
                      type="text"
                      value={filters.studentSearch}
                      onChange={(event) => setFilters((prev) => ({ ...prev, studentSearch: event.target.value }))}
                      placeholder="جزء من الاسم أو الهوية"
                    />
                  </WsField>

                  <WsField label="قائمة الطلاب" htmlFor="ws-rep-student">
                    <WsSelect
                      id="ws-rep-student"
                      value={filters.studentId ?? ''}
                      onChange={(event) => {
                        const parsed = Number(event.target.value)
                        setFilters((prev) => ({
                          ...prev,
                          studentId: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                        }))
                      }}
                    >
                      <option value="">اختر الطالب</option>
                      {filteredStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} — {student.grade} ({student.class_name})
                        </option>
                      ))}
                    </WsSelect>
                    {studentsQuery.isLoading ? (
                      <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>جارٍ تحميل قائمة الطلاب...</span>
                    ) : null}
                    {studentsQuery.isError ? (
                      <span style={{ fontSize: 11, color: 'var(--ws-red)' }}>تعذر تحميل قائمة الطلاب.</span>
                    ) : null}
                  </WsField>
                </div>
              </WsBlock>
            )}

            <WsBlock title="الفترة الزمنية" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="ws-seg" style={{ alignSelf: 'stretch', display: 'flex' }}>
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePeriodChange(option.value)}
                      className={`ws-seg__btn ${filters.period === option.value ? 'is-active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {filters.period === 'custom' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <WsField label="البداية" htmlFor="ws-rep-start">
                      <WsInput
                        id="ws-rep-start"
                        type="date"
                        value={filters.startDate}
                        onChange={(event) => handleDateChange('startDate', event.target.value)}
                      />
                    </WsField>
                    <WsField label="النهاية" htmlFor="ws-rep-end">
                      <WsInput
                        id="ws-rep-end"
                        type="date"
                        value={filters.endDate}
                        onChange={(event) => handleDateChange('endDate', event.target.value)}
                      />
                    </WsField>
                  </div>
                ) : (
                  <span className="ws-fact">
                    <CalendarDays />
                    <span>الفترة:</span>
                    <b>{formatRange(filters.startDate, filters.endDate)}</b>
                  </span>
                )}
              </div>
            </WsBlock>

            <WsBlock padded>
              <div style={{ display: 'flex', gap: 6 }}>
                <WsBtn variant="primary" icon={Play} type="submit" style={{ flex: 1 }}>
                  إنشاء التقرير
                </WsBtn>
                <WsBtn icon={RotateCcw} onClick={handleResetFilters}>
                  تعيين
                </WsBtn>
              </div>
            </WsBlock>
          </form>
        </WsSideCol>

        <WsMain>
          <WsBlock
            title="نتيجة الكشف"
            icon={ClipboardList}
            count={hasData ? totalStudents.toLocaleString('ar-SA') : undefined}
            tools={
              <>
                {isRefetching && <span style={{ fontSize: 10.5, color: 'var(--ws-accent)' }}>يُحدَّث...</span>}
                <WsBtn size="sm" icon={FileSpreadsheet} onClick={() => handleExport('excel')} disabled={!canExport || isExporting}>
                  Excel
                </WsBtn>
                <WsBtn size="sm" icon={FileText} onClick={() => handleExport('pdf')} disabled={!canExport || isExporting}>
                  PDF
                </WsBtn>
                <WsBtn size="sm" icon={Printer} onClick={handlePrint} disabled={!hasData}>
                  طباعة
                </WsBtn>
              </>
            }
            fill
          >
            {/* شريط تبديل الحالات وأعمدة الإجمالي */}
            {hasData && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px 14px',
                  padding: '6px 14px',
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>تمييز الحالات:</span>
                  {STATUS_ORDER.map((status) => (
                    <StatusToggleChip
                      key={status}
                      status={status}
                      active={filters.showStatuses[status]}
                      onClick={() => handleToggleStatus(status)}
                    />
                  ))}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>أعمدة الإجمالي:</span>
                  {STATUS_ORDER.map((status) => (
                    <StatusToggleChip
                      key={`total-${status}`}
                      status={status}
                      active={filters.showTotals[status]}
                      onClick={() => handleToggleTotals(status)}
                    />
                  ))}
                </span>
              </div>
            )}

            {submittedFilters === null ? (
              <WsEmpty icon={ClipboardList}>
                ابدأ بتحديد نوع الكشف والفترة الزمنية من العمود الأيمن ثم اضغط «إنشاء التقرير».
              </WsEmpty>
            ) : isLoadingReport ? (
              <WsEmpty loading>جارٍ إنشاء الكشف، يرجى الانتظار...</WsEmpty>
            ) : reportQuery.isError ? (
              <WsEmpty icon={AlertTriangle}>{errorMessage}</WsEmpty>
            ) : showNoData ? (
              <WsEmpty icon={Search}>لا توجد سجلات حضور ضمن النطاق المحدد.</WsEmpty>
            ) : report ? (
              <>
                <div className="ws-tablewrap">
                  <table className="ws-matrix">
                    <thead>
                      <tr>
                        <th className="ws-matrix__stick">الطالب</th>
                        {report.dates.map((date) => (
                          <th key={date}>{formatDateLabel(date)}</th>
                        ))}
                        {statusesForTotals.map((status) => (
                          <th key={`total-header-${status}`} style={{ color: STATUS_CONFIG[status].color }}>
                            {STATUS_CONFIG[status].label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((student) => {
                        const attendanceIndex = buildAttendanceIndex(student)

                        return (
                          <tr key={student.student_id}>
                            <td className="ws-matrix__stick">
                              <span style={{ display: 'block', fontWeight: 600, fontSize: 12 }}>{student.name}</span>
                              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                {student.grade} — {student.class_name}
                                {student.national_id ? ` • ${student.national_id}` : ''}
                              </span>
                            </td>

                            {report.dates.map((date) => {
                              const entry = attendanceIndex[date]
                              if (!entry) {
                                return (
                                  <td key={`${student.student_id}-${date}`} style={{ color: 'var(--ws-text-2)' }}>
                                    —
                                  </td>
                                )
                              }

                              const status = entry.status
                              const isHighlighted = filters.showStatuses[status]

                              return (
                                <td
                                  key={`${student.student_id}-${date}`}
                                  style={
                                    isHighlighted
                                      ? {
                                          background: STATUS_CONFIG[status].bg,
                                          color: STATUS_CONFIG[status].color,
                                          fontWeight: 700,
                                        }
                                      : { color: 'var(--ws-text-2)' }
                                  }
                                  title={entry.notes ?? undefined}
                                >
                                  {STATUS_CONFIG[status].symbol}
                                </td>
                              )
                            })}

                            {statusesForTotals.map((status) => (
                              <td
                                key={`${student.student_id}-total-${status}`}
                                style={{ fontWeight: 700, color: STATUS_CONFIG[status].color }}
                              >
                                {getRowTotal(student, status)}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* شريط الترقيم وحجم الصفحة */}
                {totalStudents > 0 && (
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      padding: '7px 14px',
                      borderTop: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                      عرض
                      <WsSelect
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        style={{ height: 26, fontSize: 11.5 }}
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.toLocaleString('ar-SA')}
                          </option>
                        ))}
                      </WsSelect>
                      سجل — {startIndex + 1}-{endIndex} من {totalStudents.toLocaleString('ar-SA')}
                    </span>

                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <WsBtn size="sm" onClick={() => setPage(1)} disabled={page === 1}>
                        الأولى
                      </WsBtn>
                      <WsBtn size="sm" icon={ChevronRight} onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                        السابق
                      </WsBtn>
                      <span style={{ fontSize: 11.5, fontWeight: 700 }}>
                        {page} / {totalPages}
                      </span>
                      <WsBtn
                        size="sm"
                        icon={ChevronLeft}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                      >
                        التالي
                      </WsBtn>
                      <WsBtn size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                        الأخيرة
                      </WsBtn>
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </WsBlock>
        </WsMain>
      </WsLayout>

      <AbsentStudentsPDFModal
        open={showAbsentPDFModal}
        onClose={() => setShowAbsentPDFModal(false)}
      />

      <NoorSyncStatusModal
        isOpen={showNoorSyncModal}
        onClose={() => setShowNoorSyncModal(false)}
      />

      <NoorExcuseSyncStatusModal
        isOpen={showNoorExcuseSyncModal}
        onClose={() => setShowNoorExcuseSyncModal(false)}
      />

      <AttendanceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </WsPage>
  )
}

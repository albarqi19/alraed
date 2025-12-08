import { useEffect, useMemo, useState } from 'react'
import clsx from 'classnames'
import {
  useAttendanceReportMatrixQuery,
  useExportAttendanceReportMutation,
  useStudentsQuery,
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
import { BarChart3 } from 'lucide-react'

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
  { value: 'custom', label: 'فترة مخصصة' },
] as const

type ReportPeriod = (typeof PERIOD_OPTIONS)[number]['value']

const GRADE_OPTIONS: Array<{ value: string; label: string; classes: string[] }> = [
  { value: 'الصف الأول', label: 'الصف الأول', classes: ['1', '2', '3', '4', '5'] },
  { value: 'الصف الثاني', label: 'الصف الثاني', classes: ['1', '2', '3', '4'] },
  { value: 'الصف الثالث', label: 'الصف الثالث', classes: ['1', '2', '3', '4'] },
  { value: 'الصف الرابع', label: 'الصف الرابع', classes: ['1', '2', '3', '4', '5', '6'] },
  { value: 'الصف الخامس', label: 'الصف الخامس', classes: ['1', '2', '3', '4', '5'] },
  { value: 'الصف السادس', label: 'الصف السادس', classes: ['1', '2', '3', '4'] },
]

const STATUS_ORDER = ['present', 'absent', 'late', 'excused'] as const

type StatusKey = (typeof STATUS_ORDER)[number]

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string
    symbol: string
    cellClass: string
    toggleActiveClass: string
    toggleInactiveClass: string
    summaryClass: string
  }
> = {
  present: {
    label: 'الحضور',
    symbol: '✓',
    cellClass: 'bg-emerald-50 text-emerald-700',
    toggleActiveClass: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    toggleInactiveClass: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    summaryClass: 'text-emerald-600',
  },
  absent: {
    label: 'الغياب',
    symbol: '✗',
    cellClass: 'bg-rose-50 text-rose-700',
    toggleActiveClass: 'border-rose-300 bg-rose-50 text-rose-700',
    toggleInactiveClass: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    summaryClass: 'text-rose-600',
  },
  late: {
    label: 'التأخير',
    symbol: '⚠',
    cellClass: 'bg-amber-50 text-amber-700',
    toggleActiveClass: 'border-amber-300 bg-amber-50 text-amber-700',
    toggleInactiveClass: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    summaryClass: 'text-amber-600',
  },
  excused: {
    label: 'الاستئذان',
    symbol: 'ℹ',
    cellClass: 'bg-sky-50 text-sky-700',
    toggleActiveClass: 'border-sky-300 bg-sky-50 text-sky-700',
    toggleInactiveClass: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
    summaryClass: 'text-sky-600',
  },
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

function getClassesForGrade(grade: string) {
  if (!grade) return []
  const record = GRADE_OPTIONS.find((option) => option.value === grade)
  return record ? record.classes : []
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

  const classOptions = useMemo(() => getClassesForGrade(filters.grade), [filters.grade])

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

  const summaryItems = report
    ? STATUS_ORDER.map((status) => ({
        status,
        value: getSummaryValue(report.summary, status),
        label: STATUS_CONFIG[status].label,
      }))
    : []

  const totalStudents = report?.students.length ?? 0
  const totalPages = totalStudents ? Math.max(1, Math.ceil(totalStudents / pageSize)) : 1

  useEffect(() => {
    if (page !== 1) {
      setPage(1)
    }
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

  const metaLabel = metaPieces.length ? metaPieces.join(' • ') : 'حدد نطاق الكشف ثم اضغط على زر "إنشاء التقرير".'

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

  const handleClassChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      className: value,
    }))
  }

  const handleStudentSearchChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      studentSearch: value,
    }))
  }

  const handleStudentSelect = (value: string) => {
    const parsed = Number(value)
    setFilters((prev) => ({
      ...prev,
      studentId: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    }))
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
  <section className="w-full space-y-8">
      <header className="flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">كشف الغياب</h1>
          <p className="text-sm text-muted">
            أنشئ كشف حضور وغياب شامل مع إمكان التصفية حسب الصف، الشعبة، الطالب، والفترة الزمنية، ثم صدّره إلى PDF أو Excel بسهولة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="button-secondary flex items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm"
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">الإحصائيات</span>
            <span className="sm:hidden">إحصائيات</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNoorSyncModal(true)}
            className="button-secondary flex items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">حالة الرصد في نور</span>
            <span className="sm:hidden">نور</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNoorExcuseSyncModal(true)}
            className="button-secondary flex items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="hidden sm:inline">حالة رصد الأعذار</span>
            <span className="sm:hidden">أعذار</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAbsentPDFModal(true)}
            className="button-primary flex items-center gap-1.5 whitespace-nowrap text-xs sm:gap-2 sm:text-sm"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">كشف الغائبين</span>
            <span className="sm:hidden">الغائبين</span>
          </button>
        </div>
      </header>

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

  <div className="grid gap-6 lg:grid-cols-[minmax(320px,360px),1fr] xl:grid-cols-[minmax(320px,380px),1fr]">
        <form
          className="glass-card space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            handleGenerateReport()
          }}
        >
          <header className="space-y-1 text-right">
            <h2 className="text-xl font-semibold text-slate-900">إعدادات التقرير</h2>
            <p className="text-sm text-muted">اختر نوع الكشف وحدد الفترة الزمنية قبل إنشاء التقرير.</p>
          </header>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">نوع الكشف</p>
            <div className="grid gap-2">
              {REPORT_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleReportTypeChange(option.value)}
                  className={clsx(
                    'flex items-center justify-between rounded-2xl border px-4 py-3 text-right transition',
                    filters.reportType === option.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-muted">{option.description}</p>
                  </div>
                  {filters.reportType === option.value ? <i className="bi bi-check-circle-fill text-lg" /> : null}
                </button>
              ))}
            </div>
          </section>

          {(filters.reportType === 'class' || filters.reportType === 'grade') && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">الصف والشعبة</p>
              <div className="grid gap-3">
                <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                  <span>الصف الدراسي</span>
                  <select
                    value={filters.grade}
                    onChange={(event) => handleGradeChange(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">اختر الصف</option>
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                </label>

                {filters.reportType === 'class' && (
                  <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                    <span>الشعبة</span>
                    <select
                      value={filters.className}
                      onChange={(event) => handleClassChange(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      disabled={!filters.grade}
                    >
                      <option value="">اختر الشعبة</option>
                      {classOptions.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </section>
          )}

          {filters.reportType === 'student' && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">البحث عن طالب</p>
              <div className="grid gap-3">
                <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                  <span>البحث بالاسم أو الهوية</span>
                  <input
                    type="text"
                    value={filters.studentSearch}
                    onChange={(event) => handleStudentSearchChange(event.target.value)}
                    placeholder="أدخل جزءًا من اسم الطالب أو الهوية الوطنية"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>

                <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                  <span>قائمة الطلاب</span>
                  <select
                    value={filters.studentId ?? ''}
                    onChange={(event) => handleStudentSelect(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">اختر الطالب</option>
                    {filteredStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} — {student.grade} ({student.class_name})
                      </option>
                    ))}
                  </select>
                  {studentsQuery.isLoading ? <span className="text-xs text-muted">جارٍ تحميل قائمة الطلاب...</span> : null}
                  {studentsQuery.isError ? (
                    <span className="text-xs text-rose-600">تعذر تحميل قائمة الطلاب، يرجى المحاولة لاحقًا.</span>
                  ) : null}
                </label>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">الفترة الزمنية</p>
            <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
              <span>نوع الفترة</span>
              <select
                value={filters.period}
                onChange={(event) => handlePeriodChange(event.target.value as ReportPeriod)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {filters.period === 'custom' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                  <span>تاريخ البداية</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => handleDateChange('startDate', event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
                <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
                  <span>تاريخ النهاية</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => handleDateChange('endDate', event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </label>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                سيتم استخدام الفترة: {formatRange(filters.startDate, filters.endDate)}
              </p>
            )}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              إعادة التعيين
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-teal-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              إنشاء التقرير
            </button>
          </footer>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl bg-white/60 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{metaLabel}</p>
              <p className="text-xs text-slate-500">الفترة: {rangeLabel}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleExport('excel')}
                disabled={!canExport || isExporting}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="تصدير Excel"
              >
                <i className="bi bi-file-earmark-excel" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={!canExport || isExporting}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="تصدير PDF"
              >
                <i className="bi bi-filetype-pdf" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!hasData}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="طباعة"
              >
                <i className="bi bi-printer" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
            </div>
          </div>

          <div className="glass-card space-y-5">
            {submittedFilters === null ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-slate-500">
                <i className="bi bi-clipboard-data text-4xl text-slate-300" />
                <p className="text-sm">ابدأ بتحديد نوع الكشف والفترة الزمنية ثم اضغط على "إنشاء التقرير" لعرض البيانات.</p>
              </div>
            ) : isLoadingReport ? (
              <div className="grid place-items-center gap-3 py-12 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" />
                <p className="text-sm text-slate-500">جارٍ إنشاء الكشف، يرجى الانتظار...</p>
              </div>
            ) : reportQuery.isError ? (
              <div className="grid place-items-center gap-2 py-12 text-center">
                <i className="bi bi-exclamation-triangle text-4xl text-rose-400" />
                <p className="text-sm text-rose-600">{errorMessage}</p>
              </div>
            ) : showNoData ? (
              <div className="grid place-items-center gap-2 py-12 text-center text-slate-500">
                <i className="bi bi-search text-4xl text-slate-300" />
                <p className="text-sm">لا توجد سجلات حضور ضمن النطاق المحدد.</p>
              </div>
            ) : report ? (
              <div className="space-y-5">
                {isRefetching ? (
                  <p className="text-xs text-teal-600">جارٍ تحديث التقرير بالبيانات الأحدث...</p>
                ) : null}

                <section className="space-y-3">
                  <h3 className="text-right text-sm font-semibold text-slate-700">ملخص سريع</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {summaryItems.map((item) => (
                      <div
                        key={item.status}
                        className={clsx(
                          'rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right shadow-sm',
                          STATUS_CONFIG[item.status].summaryClass,
                        )}
                      >
                        <p className="text-xs text-slate-600">{STATUS_CONFIG[item.status].label}</p>
                        <p className="text-2xl font-bold">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
                    <span>تمييز حالات التتبع:</span>
                    {STATUS_ORDER.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleToggleStatus(status)}
                        className={clsx(
                          'rounded-2xl border px-3 py-1 transition',
                          filters.showStatuses[status]
                            ? STATUS_CONFIG[status].toggleActiveClass
                            : STATUS_CONFIG[status].toggleInactiveClass,
                        )}
                      >
                        {STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
                    <span>أعمدة الإجمالي:</span>
                    {STATUS_ORDER.map((status) => (
                      <button
                        key={`total-${status}`}
                        type="button"
                        onClick={() => handleToggleTotals(status)}
                        className={clsx(
                          'rounded-2xl border px-3 py-1 transition',
                          filters.showTotals[status]
                            ? 'border-teal-400 bg-teal-50 text-teal-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {STATUS_CONFIG[status].label}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 shadow-inner">
                  <div className="inline-block min-w-full">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                          <th className="sticky right-0 top-0 z-30 w-48 border-b border-l border-slate-200 bg-slate-100 px-3 py-3 shadow-[2px_0_8px_rgba(0,0,0,0.08)] sm:w-56 lg:w-64">
                            الطالب
                          </th>
                          {report.dates.map((date) => (
                            <th
                              key={date}
                              className="sticky top-0 z-10 min-w-[80px] border-b border-slate-200 bg-slate-100 px-2 py-3 text-center shadow-sm sm:min-w-[100px] sm:px-3"
                            >
                              {formatDateLabel(date)}
                            </th>
                          ))}
                          {statusesForTotals.map((status) => (
                            <th
                              key={`total-header-${status}`}
                              className="sticky top-0 z-10 min-w-[70px] border-b border-slate-200 bg-slate-100 px-2 py-3 text-center shadow-sm sm:min-w-[80px] sm:px-3"
                            >
                              <span className="hidden sm:inline">{STATUS_CONFIG[status].label}</span>
                              <span className="sm:hidden">{STATUS_CONFIG[status].symbol}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map((student) => {
                          const attendanceIndex = buildAttendanceIndex(student)

                          return (
                            <tr key={student.student_id} className="border-b border-slate-100 last:border-b-0">
                              <td className="sticky right-0 z-20 border-l border-slate-100 bg-white px-3 py-3 text-right shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-slate-800 sm:text-sm">{student.name}</p>
                                <p className="text-[10px] text-slate-500 sm:text-xs">
                                  {student.grade} — {student.class_name}
                                </p>
                                {student.national_id ? (
                                  <p className="hidden text-xs text-slate-400 lg:block">{student.national_id}</p>
                                ) : null}
                              </div>
                            </td>

                            {report.dates.map((date) => {
                              const entry = attendanceIndex[date]
                              if (!entry) {
                                return (
                                  <td key={`${student.student_id}-${date}`} className="px-2 py-2 text-center text-xs text-slate-400 sm:px-3">
                                    —
                                  </td>
                                )
                              }

                              const status = entry.status
                              const isHighlighted = filters.showStatuses[status]

                              return (
                                <td
                                  key={`${student.student_id}-${date}`}
                                  className={clsx(
                                    'px-2 py-2 text-center text-sm transition sm:px-3',
                                    isHighlighted ? STATUS_CONFIG[status].cellClass : 'text-slate-500',
                                  )}
                                  title={entry.notes ?? undefined}
                                >
                                  {STATUS_CONFIG[status].symbol}
                                </td>
                              )
                            })}

                            {statusesForTotals.map((status) => (
                              <td key={`${student.student_id}-total-${status}`} className="px-2 py-2 text-center text-xs font-semibold text-slate-700 sm:px-3 sm:text-sm">
                                {getRowTotal(student, status)}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>

                {totalStudents > 0 ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/70 px-4 py-4 text-sm text-slate-600 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <span className="hidden sm:inline">عرض</span>
                      <select
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                        className="rounded-2xl border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:px-3 sm:text-sm"
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.toLocaleString('ar-SA')}
                          </option>
                        ))}
                      </select>
                      <span className="hidden sm:inline">سجل</span>
                      <span className="text-xs text-slate-400 sm:text-sm">
                        {startIndex + 1}-{endIndex} من {totalStudents.toLocaleString('ar-SA')}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                        className="hidden rounded-2xl border border-slate-200 px-3 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-block sm:text-sm"
                      >
                        الأولى
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                        className="rounded-2xl border border-slate-200 px-2.5 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                      >
                        <span className="hidden sm:inline">السابق</span>
                        <span className="sm:hidden">←</span>
                      </button>
                      <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:px-4 sm:text-sm">
                        <span className="hidden sm:inline">الصفحة </span>{page}<span className="hidden sm:inline"> من {totalPages}</span><span className="sm:hidden">/{totalPages}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages}
                        className="rounded-2xl border border-slate-200 px-2.5 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                      >
                        <span className="hidden sm:inline">التالي</span>
                        <span className="sm:hidden">→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                        className="hidden rounded-2xl border border-slate-200 px-3 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-block sm:text-sm"
                      >
                        الأخيرة
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      
      <AttendanceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </section>
  )
}

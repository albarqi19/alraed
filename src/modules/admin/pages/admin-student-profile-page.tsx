import { useEffect, useMemo, useState } from 'react'
import clsx from 'classnames'
import {
  useAttendanceReportMatrixQuery,
  useLateArrivalsQuery,
  useLeaveRequestsQuery,
  useStudentsQuery,
  useWhatsappHistoryQuery,
} from '../hooks'
import type {
  AttendanceReportStudentAttendance,
  AttendanceReportStudentRow,
  LateArrivalRecord,
  LeaveRequestRecord,
  WhatsappHistoryItem,
} from '../types'

type PeriodKey = '7d' | '30d' | '90d' | 'custom'

type SectionKey = 'overview' | 'attendance' | 'records' | 'communications' | 'extended'

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يومًا' },
  { value: '90d', label: 'آخر 90 يومًا' },
  { value: 'custom', label: 'فترة مخصصة' },
]

type LeaveStatusMeta = {
  label: string
  tone: string
}

const LEAVE_STATUS_META: Record<LeaveRequestRecord['status'] | 'pending', LeaveStatusMeta> = {
  pending: {
    label: 'بانتظار المعالجة',
    tone: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  approved: {
    label: 'معتمد',
    tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  rejected: {
    label: 'مرفوض',
    tone: 'bg-rose-50 text-rose-700 border border-rose-200',
  },
  cancelled: {
    label: 'ملغى',
    tone: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
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
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [activeSection, setActiveSection] = useState<SectionKey>('overview')
  const [selectedMessage, setSelectedMessage] = useState<WhatsappHistoryItem | null>(null)

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

    if (period === 'custom') {
      return {
        start: customRange.start || end,
        end: customRange.end || end,
      }
    }

    const periodDays: Record<Exclude<PeriodKey, 'custom'>, number> = {
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
  }, [period, customRange.end, customRange.start])

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

  const latestAttendanceRecords = useMemo(() => attendanceTimeline.slice(0, 5), [attendanceTimeline])
  const latestLateArrival = studentLateArrivals[0] ?? null
  const latestLeaveRequest = leaveRequests[0] ?? null
  const latestWhatsappMessage = studentWhatsappMessages[0] ?? null

  const profileSections = useMemo<Array<{ id: SectionKey; label: string; description: string }>>(
    () => [
      { id: 'overview', label: 'الملخص العام', description: 'نظرة سريعة على أهم المؤشرات.' },
      { id: 'attendance', label: 'الحضور والالتزام', description: 'تفاصيل الحضور والغياب اليومية.' },
      { id: 'records', label: 'السجلات التفصيلية', description: 'التأخيرات وطلبات الاستئذان المرتبطة بالطالب.' },
      { id: 'communications', label: 'الاتصالات والرسائل', description: 'تاريخ رسائل الواتساب والملاحظات.' },
      { id: 'extended', label: 'بيانات الطالب المتقدمة', description: 'الصحة، الاجتماعية، السلوك، المكافآت.' },
    ],
    [],
  )

  const attendanceStats = useMemo(() => {
    const present = attendanceRow?.total_present ?? 0
    const absent = attendanceRow?.total_absent ?? 0
    const late = attendanceRow?.total_late ?? 0
    const excused = attendanceRow?.total_excused ?? 0
    const totalDays = present + absent + late + excused

    return {
      present,
      absent,
      late,
      excused,
      totalDays,
    }
  }, [attendanceRow?.total_absent, attendanceRow?.total_excused, attendanceRow?.total_late, attendanceRow?.total_present])

  const handleSelectStudent = (value: string) => {
    if (!value) {
      setSelectedStudentId(null)
      return
    }
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      setSelectedStudentId(parsed)
    }
  }

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

  const isLoadingAny =
    attendanceQuery.isLoading ||
    lateArrivalsQuery.isLoading ||
    leaveRequestsQuery.isLoading ||
    (selectedStudent && whatsappHistoryQuery.isLoading)

  return (
    <section className="space-y-6">
      <header className="space-y-1 text-right">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">إدارة الطلاب</p>
        <h1 className="text-3xl font-bold text-slate-900">ملف الطالب</h1>
        <p className="text-sm text-muted">اختر طالبًا لاستعراض حضوره، غياباته، طلبات الاستئذان ورسائل الواتساب المرتبطة به.</p>
      </header>

      <section className="glass-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <h2 className="text-xl font-semibold text-slate-900">تحديد الطالب والفترة الزمنية</h2>
            <p className="text-sm text-muted">ابحث عن الطالب المناسب، ثم اختر الفترة المراد تحليلها.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStudentId(null)
              setSearchTerm('')
              setPeriod('30d')
              setCustomRange({ start: '', end: '' })
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            إعادة التعيين
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
            <span>البحث عن طالب</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="اسم الطالب، الصف، أو رقم الهوية"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          <label className="grid gap-2 text-right text-sm font-medium text-slate-800 lg:col-span-2">
            <span>قائمة الطلاب</span>
            <select
              value={selectedStudentId ?? ''}
              onChange={(event) => handleSelectStudent(event.target.value)}
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

        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-2 text-right text-sm font-medium text-slate-800 lg:col-span-2">
            <span>الفترة الزمنية</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePeriodChange(option.value)}
                  className={clsx(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    period === option.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>

          <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
            <span>تاريخ البداية</span>
            <input
              type="date"
              value={period === 'custom' ? customRange.start : dateRange.start}
              onChange={(event) =>
                setCustomRange((prev) => ({ ...prev, start: event.target.value || prev.start }))
              }
              disabled={period !== 'custom'}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>

          <label className="grid gap-2 text-right text-sm font-medium text-slate-800">
            <span>تاريخ النهاية</span>
            <input
              type="date"
              value={period === 'custom' ? customRange.end : dateRange.end}
              onChange={(event) =>
                setCustomRange((prev) => ({ ...prev, end: event.target.value || prev.end }))
              }
              disabled={period !== 'custom'}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </label>
        </div>

        {selectedStudent ? (
          <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">الطالب المحدد</p>
                <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.name}</h3>
                <p className="text-sm text-slate-600">
                  {selectedStudent.grade} — {selectedStudent.class_name}
                </p>
              </div>
              <dl className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <dt className="text-[11px] font-semibold text-teal-600">رقم الهوية</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{selectedStudent.national_id}</dd>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <dt className="text-[11px] font-semibold text-teal-600">ولي الأمر</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{selectedStudent.parent_name || '—'}</dd>
                  <dd className="mt-0.5 text-xs text-muted">{selectedStudent.parent_phone || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
            اختر طالبًا من القائمة لعرض التفاصيل الكاملة.
          </div>
        )}
      </section>

      {selectedStudent ? (
        <div className="space-y-6">
          <nav className="glass-card">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {profileSections.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'min-w-[180px] rounded-full border px-4 py-2 text-right text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500/30',
                      isActive
                        ? 'border-transparent bg-teal-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <span className="block">{section.label}</span>
                    <span
                      className={clsx(
                        'block text-[11px] font-normal leading-snug',
                        isActive ? 'text-white/80' : 'text-slate-400',
                      )}
                    >
                      {section.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>

          {activeSection === 'overview' ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="glass-card space-y-4 xl:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-slate-900">الالتزام العام</h2>
                    <p className="text-sm text-muted">نظرة موجزة على حضور الطالب خلال الفترة المحددة.</p>
                  </div>
                  <div className="text-xs text-muted">
                    الفترة: {formatDate(dateRange.start, { dateStyle: 'medium' })} —{' '}
                    {formatDate(dateRange.end, { dateStyle: 'medium' })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'أيام الحضور', value: attendanceStats.present, tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
                    { label: 'أيام الغياب', value: attendanceStats.absent, tone: 'bg-rose-50 text-rose-700 border border-rose-200' },
                    { label: 'حالات التأخير', value: attendanceStats.late, tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
                    { label: 'الاستئذانات', value: attendanceStats.excused, tone: 'bg-sky-50 text-sky-700 border border-sky-200' },
                  ].map((stat) => (
                    <div key={stat.label} className={clsx('rounded-2xl px-4 py-3 text-right shadow-sm', stat.tone)}>
                      <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold">{stat.value.toLocaleString('ar-SA')}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white/70 p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    آخر سجلات الحضور
                  </p>
                  {attendanceQuery.isError ? (
                    <p className="text-sm text-rose-600">تعذر تحميل بيانات الحضور. يرجى المحاولة لاحقًا.</p>
                  ) : latestAttendanceRecords.length === 0 ? (
                    <p className="text-sm text-muted">لا توجد سجلات للحضور في هذه الفترة.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {latestAttendanceRecords.map((record, index) => (
                        <li
                          key={`${record.date}-${record.status}-${index}`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">{formatDate(record.date)}</p>
                              {record.notes ? <p className="mt-1 text-xs text-muted">{record.notes}</p> : null}
                            </div>
                            <span
                              className={clsx(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                                record.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : record.status === 'absent'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : record.status === 'late'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-sky-50 text-sky-700 border border-sky-200',
                              )}
                            >
                              {record.status === 'present'
                                ? 'حاضر'
                                : record.status === 'absent'
                                  ? 'غائب'
                                  : record.status === 'late'
                                    ? 'متأخر'
                                    : 'مستأذن'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="glass-card space-y-4">
                <div className="border-b border-slate-100 pb-3 text-right">
                  <h3 className="text-lg font-semibold text-slate-900">الملخص السريع</h3>
                  <p className="text-sm text-muted">أحدث الأنشطة المتعلقة بالطالب.</p>
                </div>
                <dl className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 shadow-sm">
                    <dt className="text-xs font-semibold text-slate-500">آخر رسالة واتساب</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {latestWhatsappMessage?.template_name ?? latestWhatsappMessage?.message_preview ?? '—'}
                    </dd>
                    <dd className="mt-1 text-xs text-muted">
                      {latestWhatsappMessage
                        ? formatDateTime(latestWhatsappMessage.sent_at ?? latestWhatsappMessage.created_at)
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 shadow-sm">
                    <dt className="text-xs font-semibold text-slate-500">آخر تأخير مسجل</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {latestLateArrival ? formatDate(latestLateArrival.late_date) : '—'}
                    </dd>
                    <dd className="mt-1 text-xs text-muted">{latestLateArrival?.notes ?? '—'}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 shadow-sm">
                    <dt className="text-xs font-semibold text-slate-500">آخر طلب استئذان</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {latestLeaveRequest ? formatDateTime(latestLeaveRequest.created_at) : '—'}
                    </dd>
                    <dd className="mt-1 text-xs text-muted">{latestLeaveRequest?.reason ?? '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : null}

          {activeSection === 'attendance' ? (
            <section className="glass-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-slate-900">تفاصيل الحضور اليومية</h2>
                  <p className="text-sm text-muted">عرض موسع لكل حالات الحضور، الغياب، التأخير والاستئذان.</p>
                </div>
                <div className="text-xs text-muted">
                  الفترة: {formatDate(dateRange.start, { dateStyle: 'medium' })} —{' '}
                  {formatDate(dateRange.end, { dateStyle: 'medium' })}
                </div>
              </div>

              {attendanceQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
                  تعذر تحميل بيانات الحضور. يرجى التحقق من الاتصال أو المحاولة لاحقًا.
                </div>
              ) : attendanceRow ? (
                <div className="grid gap-4 pt-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: 'أيام الحضور', value: attendanceStats.present, tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
                        { label: 'أيام الغياب', value: attendanceStats.absent, tone: 'bg-rose-50 text-rose-700 border border-rose-200' },
                        { label: 'حالات التأخير', value: attendanceStats.late, tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
                        { label: 'الاستئذانات', value: attendanceStats.excused, tone: 'bg-sky-50 text-sky-700 border border-sky-200' },
                      ].map((stat) => (
                        <div key={stat.label} className={clsx('rounded-2xl px-4 py-3 text-right shadow-sm', stat.tone)}>
                          <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
                          <p className="mt-1 text-2xl font-bold">{stat.value.toLocaleString('ar-SA')}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-3xl border border-slate-100 bg-white/70 p-4 text-sm text-slate-600 shadow-sm">
                      <p className="text-xs font-semibold text-slate-500">ملخص الفترة</p>
                      <p className="mt-2 leading-relaxed">
                        إجمالي الأيام المسجلة:
                        <span className="mx-1 font-bold text-slate-900">
                          {attendanceStats.totalDays.toLocaleString('ar-SA')}
                        </span>
                        يومًا، ونسبة الغياب بلغت
                        <span className="mx-1 font-bold text-rose-600">
                          {attendanceStats.totalDays
                            ? Math.round((attendanceStats.absent / attendanceStats.totalDays) * 100)
                            : 0}
                          %
                        </span>
                        خلال هذه الفترة.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      آخر سجلات الحضور
                    </p>
                    {attendanceTimeline.length === 0 ? (
                      <p className="text-sm text-muted">لا توجد سجلات للحضور في هذه الفترة.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {attendanceTimeline.map((record, index) => (
                          <li
                            key={`${record.date}-${record.status}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">{formatDate(record.date)}</p>
                                {record.notes ? (
                                  <p className="mt-1 text-xs text-muted">{record.notes}</p>
                                ) : null}
                              </div>
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                                  record.status === 'present'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : record.status === 'absent'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : record.status === 'late'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-sky-50 text-sky-700 border border-sky-200',
                                )}
                              >
                                {record.status === 'present'
                                  ? 'حاضر'
                                  : record.status === 'absent'
                                    ? 'غائب'
                                    : record.status === 'late'
                                      ? 'متأخر'
                                      : 'مستأذن'}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                  لا توجد بيانات حضور متاحة للطالب في الفترة المحددة.
                </div>
              )}
            </section>
          ) : null}

          {activeSection === 'records' ? (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="glass-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-slate-900">سجلات التأخير</h2>
                    <p className="text-sm text-muted">أحدث التأخيرات المسجلة على الطالب.</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {studentLateArrivals.length.toLocaleString('ar-SA')} تأخير
                  </span>
                </div>
                {lateArrivalsQuery.isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
                    تعذر تحميل سجلات التأخير.
                  </div>
                ) : studentLateArrivals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                    لا توجد سجلات تأخير للطالب.
                  </div>
                ) : (
                  <ul className="space-y-3 pt-4">
                    {studentLateArrivals.map((record: LateArrivalRecord) => (
                      <li key={record.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatDate(record.late_date)}</p>
                            <p className="text-xs text-muted">تم التسجيل: {formatDateTime(record.recorded_at)}</p>
                            {record.notes ? <p className="mt-1 text-xs text-slate-600">{record.notes}</p> : null}
                          </div>
                          <span
                            className={clsx(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                              record.whatsapp_sent
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200',
                            )}
                          >
                            {record.whatsapp_sent ? 'تم إشعار ولي الأمر' : 'لم يتم الإشعار'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-slate-900">طلبات الاستئذان</h2>
                    <p className="text-sm text-muted">قائمة بالطلبات الخاصة بالطالب.</p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {leaveRequests.length.toLocaleString('ar-SA')} طلب
                  </span>
                </div>
                {leaveRequestsQuery.isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
                    تعذر تحميل طلبات الاستئذان.
                  </div>
                ) : leaveRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                    لا توجد طلبات استئذان مسجلة للطالب.
                  </div>
                ) : (
                  <ul className="space-y-3 pt-4">
                    {leaveRequests.map((request: LeaveRequestRecord) => {
                      const statusMeta = LEAVE_STATUS_META[request.status ?? 'pending']
                      return (
                        <li key={request.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">{request.reason}</p>
                              <p className="text-xs text-muted">تاريخ الطلب: {formatDateTime(request.created_at)}</p>
                              {request.decision_notes ? (
                                <p className="mt-1 text-xs text-slate-600">ملاحظات: {request.decision_notes}</p>
                              ) : null}
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </section>
          ) : null}

          {activeSection === 'communications' ? (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="glass-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-slate-900">رسائل الواتساب</h2>
                    <p className="text-sm text-muted">أحدث الرسائل المرسلة المتعلقة بالطالب أو ولي أمره.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {studentWhatsappMessages.length.toLocaleString('ar-SA')} رسالة
                  </span>
                </div>
                {whatsappHistoryQuery.isError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
                    تعذر تحميل سجل الواتساب.
                  </div>
                ) : studentWhatsappMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-muted">
                    لا توجد رسائل واتساب مرتبطة بالطالب ضمن البيانات الحالية.
                  </div>
                ) : (
                  <ul className="space-y-3 pt-4 text-sm">
                    {studentWhatsappMessages.map((message) => (
                      <li
                        key={message.id}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-teal-300 hover:shadow-md"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-2 text-right">
                            <p className="font-semibold text-slate-900">{message.template_name ?? 'رسالة مخصصة'}</p>
                            <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                              {message.message_content ?? message.message_body ?? message.message_preview ?? 'لا يوجد محتوى'}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                              message.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200',
                            )}
                          >
                            {message.status === 'sent' ? 'مرسلة' : 'فشلت'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                          <span>{formatDateTime(message.sent_at ?? message.created_at)}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium">
                            انقر للتفاصيل
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="text-right">
                    <h2 className="text-xl font-semibold text-slate-900">رسائل المعلمين</h2>
                    <p className="text-sm text-muted">مساحة مخصصة لرسائل المعلمين حول الطالب.</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">قريبًا</span>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm leading-relaxed text-muted">
                  لم يتم ربط رسائل المعلمين بعد. يمكن تفعيل هذا القسم بمجرد توفر واجهة برمجية تعرض الرسائل المرتبطة بكل
                  طالب. البنية جاهزة للدمج وسيتم تحديثها فور توفر البيانات.
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === 'extended' ? (
            <section className="grid gap-4 xl:grid-cols-2">
              <div className="glass-card">
                <div className="border-b border-slate-100 pb-4 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">المعلومات الصحية</h2>
                  <p className="text-sm text-muted">سيتم ربط التطعيمات، الحساسية، والحالات المزمنة قريبًا.</p>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm leading-relaxed text-muted">
                  هذا القسم جاهز لتجميع السجل الطبي للطالب (المواعيد، العلاجات، إشعارات الطوارئ). يرجى تجهيز مصدر البيانات
                  ليتم دمجه لاحقًا.
                </div>
              </div>

              <div className="glass-card">
                <div className="border-b border-slate-100 pb-4 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">البيانات الاجتماعية</h2>
                  <p className="text-sm text-muted">متابعة الظروف الاجتماعية والدعم الأسري.</p>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm leading-relaxed text-muted">
                  أضف هنا معلومات عن الحالة الاجتماعية، عدد الإخوة، مشاركات الطالب في الأنشطة، وأي ملاحظات تخص المرشد
                  الطلابي.
                </div>
              </div>

              <div className="glass-card">
                <div className="border-b border-slate-100 pb-4 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">السلوك والانضباط</h2>
                  <p className="text-sm text-muted">سيتضمن تنبيهات السلوك، المخالفات، وخطط المعالجة.</p>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm leading-relaxed text-muted">
                  قم بتجهيز تكامل مع نظام المتابعة السلوكية لتظهر هنا تقارير الانضباط، الإنذارات، وخطط التحسين الخاصة بالطالب.
                </div>
              </div>

              <div className="glass-card">
                <div className="border-b border-slate-100 pb-4 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">النقاط والمكافآت</h2>
                  <p className="text-sm text-muted">متابعة إنجازات الطالب، النقاط، والمكافآت المحفزة.</p>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm leading-relaxed text-muted">
                  بمجرد ربط نظام التحفيز، سيعرض هذا القسم النقاط المكتسبة، الجوائز، وسجل المكافآت مع إمكانيات التصفية
                  والتحليل.
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {selectedStudent && isLoadingAny ? (
        <div className="fixed inset-x-0 bottom-6 mx-auto w-full max-w-sm rounded-full border border-slate-200 bg-white/90 px-5 py-2 text-center text-sm text-slate-600 shadow-lg">
          <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          جارٍ تحديث بيانات الطالب...
        </div>
      ) : null}

      {selectedMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header مع gradient جميل */}
            <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 px-6 py-8">
              {/* نمط خلفية ديناميكي */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white"></div>
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white"></div>
              </div>
              
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex-1 text-right">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wider text-white">تفاصيل الرسالة</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                    {selectedMessage.template_name ?? 'رسالة مخصصة'}
                  </h2>
                  <p className="mt-2 text-sm text-white/90">
                    {formatDateTime(selectedMessage.sent_at ?? selectedMessage.created_at)}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20 hover:rotate-90"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="relative mt-4">
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg',
                    selectedMessage.status === 'sent'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white',
                  )}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    {selectedMessage.status === 'sent' ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    )}
                  </svg>
                  {selectedMessage.status === 'sent' ? 'تم الإرسال بنجاح' : 'فشل الإرسال'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[calc(85vh-180px)] space-y-4 overflow-y-auto p-6">
              {/* محتوى الرسالة */}
              <div className="rounded-2xl border-2 border-teal-100 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-right">
                  <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <p className="text-sm font-bold uppercase tracking-wide text-teal-700">محتوى الرسالة</p>
                </div>
                <div className="rounded-xl bg-white/80 p-4 shadow-inner">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {selectedMessage.message_content ??
                      selectedMessage.message_body ??
                      selectedMessage.message_preview ??
                      'لا يوجد محتوى'}
                  </p>
                </div>
              </div>

              {/* بطاقات المعلومات */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-lg bg-indigo-100 p-1.5">
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">تاريخ الإرسال</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {formatDateTime(selectedMessage.sent_at ?? selectedMessage.created_at)}
                  </p>
                </div>

                <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-1.5">
                      <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">رقم ولي الأمر</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900" dir="ltr">
                    {selectedMessage.recipient_phone ?? selectedMessage.phone_number ?? 'غير متوفر'}
                  </p>
                </div>

                <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded-lg bg-violet-100 p-1.5">
                      <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">اسم المستلم</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedMessage.recipient_name ?? selectedMessage.recipient ?? 'غير محدد'}
                  </p>
                </div>

                {selectedMessage.student_grade || selectedMessage.student_class ? (
                  <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="rounded-lg bg-amber-100 p-1.5">
                        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">الصف والفصل</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedMessage.student_grade} — {selectedMessage.student_class}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

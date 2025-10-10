import { useEffect, useMemo, useState } from 'react'
import {
  useAttendanceReportsQuery,
  useAttendanceSessionDetailsQuery,
  useExportAttendanceReportMutation,
} from '../hooks'
import type { AttendanceReportRecord } from '../types'

type FilterState = {
  grade: string
  className: string
  status: 'all' | 'present' | 'absent' | 'late' | 'excused'
  fromDate: string
  toDate: string
  search: string
}

type StatusKey = 'present' | 'absent' | 'late' | 'excused'

const statusMeta: Record<StatusKey, { label: string; tone: string }> = {
  present: { label: 'حاضر', tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  absent: { label: 'غائب', tone: 'bg-rose-50 text-rose-700 border border-rose-200' },
  late: { label: 'متأخر', tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
  excused: { label: 'مستأذن', tone: 'bg-sky-50 text-sky-700 border border-sky-200' },
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

function StatusBadge({ status }: { status: StatusKey }) {
  const meta = statusMeta[status]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
      <span className={`h-2 w-2 rounded-full ${status === 'present' ? 'bg-emerald-500' : status === 'absent' ? 'bg-rose-500' : status === 'late' ? 'bg-amber-500' : 'bg-sky-500'}`} />
      {meta.label}
    </span>
  )
}

function StatsGrid({ records }: { records: AttendanceReportRecord[] }) {
  const totalSessions = records.length
  const totalStudents = records.reduce((sum, record) => sum + (record.students_count || 0), 0)

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <article className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 text-right shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">إجمالي السجلات</p>
        <p className="mt-2 text-2xl font-bold text-teal-700">{totalSessions.toLocaleString('ar-SA')}</p>
      </article>
      <article className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-right shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">إجمالي الطلاب</p>
        <p className="mt-2 text-2xl font-bold text-blue-700">{totalStudents.toLocaleString('ar-SA')}</p>
      </article>
      <article className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-4 text-right shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">المعلمين النشطين</p>
        <p className="mt-2 text-2xl font-bold text-purple-700">{new Set(records.map(r => r.teacher_id)).size.toLocaleString('ar-SA')}</p>
      </article>
    </div>
  )
}

export function AdminAttendancePage() {
  const today = new Date().toISOString().split('T')[0] // تاريخ اليوم بصيغة YYYY-MM-DD
  
  const [filters, setFilters] = useState<FilterState>({
    grade: '',
    className: '',
    status: 'all',
    fromDate: today,
    toDate: today,
    search: '',
  })
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)

  const queryFilters = useMemo(() => {
    const entries: Record<string, string> = {}
    if (filters.grade) entries.grade = filters.grade
    if (filters.className) entries.class_name = filters.className
    if (filters.status !== 'all') entries.status = filters.status
    if (filters.fromDate) entries.date = filters.fromDate // استخدام 'date' بدلاً من 'from_date'
    if (filters.toDate && filters.toDate !== filters.fromDate) entries.to_date = filters.toDate
    if (filters.search.trim()) entries.search = filters.search.trim()
    return entries
  }, [filters])

  const reportsQuery = useAttendanceReportsQuery(queryFilters)
  const exportMutation = useExportAttendanceReportMutation()

  const records = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])

  useEffect(() => {
    if (records.length === 0) {
      setSelectedRecordId(null)
      return
    }
    if (!selectedRecordId || !records.some((record) => record.first_id === selectedRecordId || record.id === selectedRecordId)) {
      setSelectedRecordId(records[0].first_id || records[0].id || null)
    }
  }, [records, selectedRecordId])

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null
    return records.find((record) => (record.first_id || record.id) === selectedRecordId) ?? null
  }, [records, selectedRecordId])

  const detailsQuery = useAttendanceSessionDetailsQuery(selectedRecord?.first_id || selectedRecord?.id)

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0]
    setFilters({ grade: '', className: '', status: 'all', fromDate: today, toDate: today, search: '' })
  }

  const handleSelectRecord = (recordId: number) => {
    setSelectedRecordId(recordId)
  }

  const handleExport = (format: 'excel' | 'pdf') => {
    exportMutation.mutate(
      { format, filters: queryFilters },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = format === 'excel' ? 'attendance-report.xlsx' : 'attendance-report.pdf'
          document.body.appendChild(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
        },
      },
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">تقارير الحضور</h1>
            <p className="text-sm text-muted">
              استعرض سجلات الحضور اليومية وقم بالتصفية والتصدير حسب الحاجة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('excel')}
              className="button-secondary"
              disabled={exportMutation.isPending}
            >
              <i className="bi bi-file-earmark-spreadsheet" /> تصدير Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="button-secondary"
              disabled={exportMutation.isPending}
            >
              <i className="bi bi-filetype-pdf" /> تصدير PDF
            </button>
          </div>
        </div>
        {reportsQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
            حدث خطأ أثناء تحميل السجلات. حاول مجددًا أو تحقق من الاتصال.
            <button
              type="button"
              onClick={() => reportsQuery.refetch()}
              className="mr-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
            >
              <i className="bi bi-arrow-repeat" /> إعادة المحاولة
            </button>
          </div>
        ) : null}
      </header>

      <section className="glass-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <h2 className="text-xl font-semibold text-slate-900">البحث والتصفية</h2>
            <p className="text-sm text-muted">اضبط المعايير لعرض نطاق محدد من السجلات.</p>
          </div>
          <button type="button" className="button-secondary" onClick={handleResetFilters}>
            <i className="bi bi-arrow-counterclockwise" /> إعادة التعيين
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">الصف الدراسي</label>
            <input
              type="text"
              value={filters.grade}
              onChange={(event) => handleFilterChange('grade', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="مثال: الأول متوسط"
            />
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">الفصل</label>
            <input
              type="text"
              value={filters.className}
              onChange={(event) => handleFilterChange('className', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="مثال: (أ)"
            />
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">حالة السجل</label>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value as FilterState['status'])}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="excused">مستأذن</option>
            </select>
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">من تاريخ</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => handleFilterChange('fromDate', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">إلى تاريخ</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => handleFilterChange('toDate', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="space-y-2 text-right">
            <label className="text-xs font-semibold text-slate-600">بحث سريع</label>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder="اسم الطالب أو المعلم"
            />
          </div>
        </div>

        <StatsGrid records={records} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),420px]">
          <div className="rounded-3xl border border-slate-100 bg-white/80 shadow-sm">
            {reportsQuery.isLoading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                جاري تحميل سجلات الحضور...
              </div>
            ) : records.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-sm text-muted">
                <i className="bi bi-clipboard-x text-3xl text-slate-300" />
                لا توجد سجلات مطابقة لمعايير البحث الحالية.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[960px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">المعلم</th>
                      <th className="px-4 py-3 font-semibold">الصف / الشعبة</th>
                      <th className="px-4 py-3 font-semibold">عدد الطلاب</th>
                      <th className="px-4 py-3 font-semibold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => {
                      const recordId = record.first_id || record.id || 0
                      const isSelected = recordId === selectedRecordId
                      return (
                        <tr
                          key={recordId}
                          onClick={() => handleSelectRecord(recordId)}
                          className={`cursor-pointer border-t border-slate-100 transition ${
                            isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">{record.teacher_name}</p>
                              <p className="text-xs text-muted">رقم الهوية: {record.teacher_id_number}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {record.grade} - {record.class_name}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                              <i className="bi bi-people-fill" />
                              {record.students_count} طالب
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(record.attendance_date)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-3xl border border-slate-100 bg-white/70 p-5 shadow-sm">
            {selectedRecord ? (
              <div className="space-y-4">
                <header className="space-y-1 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">تفاصيل السجل</p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {selectedRecord.grade} - {selectedRecord.class_name}
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedRecord.teacher_name}
                  </p>
                  {selectedRecord.students_count && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      <i className="bi bi-people-fill" />
                      {selectedRecord.students_count} طالب
                    </span>
                  )}
                </header>

                <dl className="grid gap-2 text-xs text-muted">
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">التاريخ:</dt>
                    <dd>{formatDate(selectedRecord.attendance_date, { dateStyle: 'full' })}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">رقم هوية المعلم:</dt>
                    <dd className="font-medium text-slate-900">{selectedRecord.teacher_id_number || '-'}</dd>
                  </div>
                </dl>

                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                  {detailsQuery.isLoading ? (
                    <div className="space-y-2 text-xs text-muted">
                      <p className="font-semibold text-slate-500">جاري تحميل قائمة الطلاب...</p>
                      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                    </div>
                  ) : detailsQuery.isError ? (
                    <p className="text-xs text-rose-600">تعذر تحميل قائمة الطلاب. حاول مرة أخرى.</p>
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
                        <p className="text-[11px] font-semibold text-slate-500">قائمة الطلاب ({detailsQuery.data.students.length.toLocaleString('ar-SA')} طالب)</p>
                        <ul className="space-y-2 max-h-96 overflow-y-auto">
                          {detailsQuery.data.students.map((student) => (
                            <li
                              key={student.attendance_id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2"
                            >
                              <span className="text-[11px] font-semibold text-slate-700">{student.name}</span>
                              <StatusBadge status={student.status} />
                            </li>
                          ))}
                        </ul>
                        {detailsQuery.data.students.length > 6 ? (
                          <p className="text-center text-[11px] text-muted">
                            يوجد سجلات إضافية يمكن مراجعتها من تقرير التفصيلي الكامل.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">اختر سجلًا لعرض التفاصيل.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted">
                <i className="bi bi-info-circle text-3xl text-slate-300" />
                اختر سجلًا من الجدول لعرض التفاصيل هنا.
              </div>
            )}
          </aside>
        </div>
      </section>
    </section>
  )
}

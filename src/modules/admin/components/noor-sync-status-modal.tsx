import { useEffect, useMemo, useState } from 'react'
import { useNoorSyncRecordsQuery } from '../hooks'

type FilterState = {
  date: string
  grade: string
  status: 'all' | 'completed' | 'failed' | 'in_progress' | 'pending'
}

interface NoorSyncStatusModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return value
  }
}

function StatusBadge({ status }: { status: string }) {
  const badges: Record<string, { label: string; tone: string }> = {
    completed: { label: 'مكتمل', tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    failed: { label: 'فاشل', tone: 'bg-rose-50 text-rose-700 border border-rose-200' },
    in_progress: { label: 'جاري التنفيذ', tone: 'bg-amber-50 text-amber-700 border border-amber-200' },
    pending: { label: 'معلق', tone: 'bg-slate-50 text-slate-700 border border-slate-200' },
  }
  const meta = badges[status] || badges.pending
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>
      {meta.label}
    </span>
  )
}

function StatsCard({ icon, label, value, tone }: { icon: string; label: string; value: number | string; tone: string }) {
  return (
    <article className={`rounded-2xl border ${tone} px-4 py-3 text-right shadow-sm bg-white`}>
      <div className="flex items-center justify-between">
        <i className={`${icon} text-2xl`} />
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</p>
        </div>
      </div>
    </article>
  )
}

function StudentsList({ students }: { students: any[] }) {
  if (!students || students.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">لا توجد بيانات طلاب</p>
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
      <table className="w-full text-right text-sm">
        <thead className="sticky top-0 bg-slate-100 text-xs font-semibold text-slate-700">
          <tr>
            <th className="px-3 py-2 text-right">#</th>
            <th className="px-3 py-2 text-right">اسم الطالب</th>
            <th className="px-3 py-2 text-right">رقم الطالب</th>
            <th className="px-3 py-2 text-right">نوع الغياب</th>
            <th className="px-3 py-2 text-center">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 text-muted">{idx + 1}</td>
              <td className="px-3 py-2 font-medium text-slate-800">{student.student_name || '—'}</td>
              <td className="px-3 py-2 text-muted">{student.student_number || '—'}</td>
              <td className="px-3 py-2 text-xs text-slate-600">{student.absence_type || '—'}</td>
              <td className="px-3 py-2 text-center">
                {student.status === 'processed' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <i className="bi bi-check-circle-fill" /> تم الرصد
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                    <i className="bi bi-x-circle-fill" /> فشل
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NoorSyncStatusModal({ isOpen, onClose }: NoorSyncStatusModalProps) {
  const today = new Date().toISOString().split('T')[0]
  
  const [filters, setFilters] = useState<FilterState>({
    date: today,
    grade: '',
    status: 'all',
  })
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null)

  const queryFilters = useMemo(() => {
    const entries: Record<string, string> = {}
    if (filters.date) entries.date = filters.date
    if (filters.grade) entries.grade = filters.grade
    if (filters.status !== 'all') entries.status = filters.status
    return entries
  }, [filters])

  const recordsQuery = useNoorSyncRecordsQuery(queryFilters)
  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])

  const stats = useMemo(() => {
    const total = records.length
    const totalStudents = records.reduce((sum, r) => sum + (r.total_students || 0), 0)
    const processed = records.reduce((sum, r) => sum + (r.processed_students || 0), 0)
    const failed = records.reduce((sum, r) => sum + (r.failed_students || 0), 0)
    const successRate = totalStudents > 0 ? ((processed / totalStudents) * 100).toFixed(1) : '0'
    
    return { total, totalStudents, processed, failed, successRate }
  }, [records])

  const grades = useMemo(() => {
    const uniqueGrades = new Set(records.map(r => r.grade).filter(Boolean))
    return Array.from(uniqueGrades).sort()
  }, [records])

  useEffect(() => {
    if (!isOpen) {
      setExpandedRecordId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const toggleExpanded = (id: number) => {
    setExpandedRecordId(prev => prev === id ? null : id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl glass-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-900">حالة الرصد في نور</h2>
              <p className="mt-1 text-sm text-muted">
                تقرير شامل لعمليات إدخال الغياب في نظام نور
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            >
              <i className="bi bi-x-lg text-xl" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 88px)' }}>
          {/* Filters */}
          <section className="mb-6 glass-card p-4">
            <div className="mb-3 flex items-center gap-2 text-right">
              <i className="bi bi-funnel text-slate-600" />
              <h3 className="font-semibold text-slate-900">الفلاتر</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">التاريخ</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">الصف</label>
                <select
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">جميع الصفوف</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value as any)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="all">الكل</option>
                  <option value="completed">مكتمل</option>
                  <option value="in_progress">جاري التنفيذ</option>
                  <option value="failed">فاشل</option>
                  <option value="pending">معلق</option>
                </select>
              </div>
            </div>
          </section>

          {/* Stats */}
          {recordsQuery.isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
              <p className="mt-3 text-sm text-muted">جاري التحميل...</p>
            </div>
          ) : recordsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <i className="bi bi-exclamation-triangle text-3xl text-rose-600" />
              <p className="mt-2 font-semibold text-rose-700">حدث خطأ أثناء تحميل البيانات</p>
              <button
                type="button"
                onClick={() => recordsQuery.refetch()}
                className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
              <i className="bi bi-inbox text-5xl text-slate-300" />
              <p className="mt-3 text-lg font-semibold text-slate-600">لا توجد سجلات</p>
              <p className="mt-1 text-sm text-muted">لم يتم العثور على عمليات رصد لهذا التاريخ</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="mb-6 grid gap-3 md:grid-cols-5">
                <StatsCard
                  icon="bi bi-list-check"
                  label="إجمالي العمليات"
                  value={stats.total}
                  tone="border-slate-200"
                />
                <StatsCard
                  icon="bi bi-people"
                  label="إجمالي الطلاب"
                  value={stats.totalStudents}
                  tone="border-slate-200"
                />
                <StatsCard
                  icon="bi bi-check-circle"
                  label="تم معالجتهم"
                  value={stats.processed}
                  tone="border-emerald-200"
                />
                <StatsCard
                  icon="bi bi-x-circle"
                  label="فشلوا"
                  value={stats.failed}
                  tone="border-rose-200"
                />
                <StatsCard
                  icon="bi bi-graph-up"
                  label="نسبة النجاح"
                  value={`${stats.successRate}%`}
                  tone="border-slate-200"
                />
              </div>

              {/* Records Table */}
              <div className="space-y-3">
                {records.map((record) => {
                  const isExpanded = expandedRecordId === record.id
                  // Handle student_data - it might already be an object or a JSON string
                  let studentData: any[] = []
                  try {
                    if (typeof record.student_data === 'string') {
                      studentData = JSON.parse(record.student_data)
                    } else if (Array.isArray(record.student_data)) {
                      studentData = record.student_data
                    } else if (record.student_data) {
                      studentData = [record.student_data]
                    }
                  } catch (error) {
                    console.error('Failed to parse student_data:', error, record.student_data)
                    studentData = []
                  }
                  
                  return (
                    <article
                      key={record.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(record.id)}
                        className="w-full px-6 py-4 text-right transition hover:bg-slate-50/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={record.status || 'pending'} />
                            {record.noor_sync_status === 'completed' && (
                              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                                <i className="bi bi-cloud-check" /> مزامن مع نور
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">{record.grade}</p>
                              <p className="text-xs text-muted">الشعب: {record.class_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                {record.processed_students} / {record.total_students} طالب
                              </p>
                              <p className="text-xs text-muted">
                                {record.failed_students > 0 && (
                                  <span className="text-rose-600">
                                    {record.failed_students} فشل
                                  </span>
                                )}
                              </p>
                            </div>
                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-slate-400`} />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4">
                          <div className="mb-4 grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-500">تاريخ الرصد</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {formatDate(record.attendance_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500">وقت المزامنة</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {formatDate(record.synced_at)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500">إصدار الإضافة</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {record.extension_version || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="font-semibold text-slate-900">قائمة الطلاب الغائبين</h4>
                              <span className="text-sm text-muted">
                                {studentData.length} طالب
                              </span>
                            </div>
                            <StudentsList students={studentData} />
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

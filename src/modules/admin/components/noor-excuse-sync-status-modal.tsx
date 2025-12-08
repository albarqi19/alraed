import { useEffect, useMemo, useState } from 'react'
import { useNoorExcuseSyncRecordsQuery, type NoorExcuseSyncRecord } from '../hooks'

type FilterState = {
  date: string
  grade: string
}

interface NoorExcuseSyncStatusModalProps {
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

function formatDateOnly(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full' }).format(date)
  } catch {
    return value
  }
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

function ExcuseCard({ record }: { record: NoorExcuseSyncRecord }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {/* معلومات الطالب */}
        <div className="flex-1 text-right">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <i className="bi bi-person-check text-lg text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{record.student?.name || 'غير معروف'}</h4>
              <p className="text-xs text-slate-500">
                {record.student?.grade} / {record.student?.class_name}
              </p>
            </div>
          </div>
          
          {/* تفاصيل العذر */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <i className="bi bi-calendar3 text-slate-400" />
              <span className="text-slate-600">تاريخ الغياب:</span>
              <span className="font-medium text-slate-800">{formatDateOnly(record.absence_date)}</span>
            </div>
          </div>
        </div>
        
        {/* حالة المزامنة */}
        <div className="text-left">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <i className="bi bi-cloud-check" /> تم التعديل في نور
          </span>
          <p className="mt-2 text-xs text-slate-500">
            {formatDate(record.synced_to_noor_at)}
          </p>
          {record.synced_by_user && (
            <p className="text-xs text-slate-400">
              بواسطة: {record.synced_by_user.name}
            </p>
          )}
        </div>
      </div>
      
      {/* ملاحظات المزامنة */}
      {record.sync_notes && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <i className="bi bi-info-circle ml-1" />
          {record.sync_notes}
        </div>
      )}
    </div>
  )
}

export function NoorExcuseSyncStatusModal({ isOpen, onClose }: NoorExcuseSyncStatusModalProps) {
  const today = new Date().toISOString().split('T')[0]
  
  const [filters, setFilters] = useState<FilterState>({
    date: '',
    grade: '',
  })

  const queryFilters = useMemo(() => {
    const entries: Record<string, string> = {}
    if (filters.date) entries.date = filters.date
    if (filters.grade) entries.grade = filters.grade
    return entries
  }, [filters])

  const recordsQuery = useNoorExcuseSyncRecordsQuery(queryFilters)
  const data = recordsQuery.data

  useEffect(() => {
    if (!isOpen) return
  }, [isOpen])

  if (!isOpen) return null

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl glass-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-900">حالة رصد الأعذار في نور</h2>
              <p className="mt-1 text-sm text-muted">
                الأعذار التي تم تغيير حالتها في نور من "غائب بدون عذر" إلى "غائب بعذر"
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
                <label className="mb-1 block text-sm font-medium text-slate-700">تاريخ المزامنة</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">الصف</label>
                <select
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">جميع الصفوف</option>
                  {data?.filters?.grades?.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleFilterChange('date', today)}
                  className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
                >
                  <i className="bi bi-calendar-event ml-1" />
                  اليوم فقط
                </button>
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
          ) : !data || data.data.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
              <i className="bi bi-inbox text-5xl text-slate-300" />
              <p className="mt-3 text-lg font-semibold text-slate-600">لا توجد سجلات مزامنة</p>
              <p className="mt-1 text-sm text-muted">لم يتم تسجيل أي أعذار تم تعديلها في نور</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <StatsCard
                  icon="bi bi-check-circle"
                  label="إجمالي المزامنات"
                  value={data.stats.total_synced}
                  tone="border-emerald-200"
                />
                <StatsCard
                  icon="bi bi-calendar-check"
                  label="مزامنات اليوم"
                  value={data.stats.today_synced}
                  tone="border-teal-200"
                />
                <StatsCard
                  icon="bi bi-hourglass-split"
                  label="بانتظار المزامنة"
                  value={data.stats.pending_sync}
                  tone="border-amber-200"
                />
              </div>

              {/* Records grouped by date */}
              <div className="space-y-6">
                {Object.entries(data.grouped_by_date).map(([date, records]) => (
                  <div key={date} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                      <i className="bi bi-calendar3 text-lg text-teal-600" />
                      <h3 className="font-bold text-slate-800">{formatDateOnly(date)}</h3>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                        {records.length} عذر
                      </span>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      {records.map((record) => (
                        <ExcuseCard key={record.id} record={record} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

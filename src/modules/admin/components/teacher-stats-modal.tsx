import { useQuery } from '@tanstack/react-query'
import {
  X,
  User,
  Phone,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sunset,
} from 'lucide-react'
import { fetchTeacherFullStats } from '@/modules/admin/api'

interface TeacherStatsModalProps {
  open: boolean
  onClose: () => void
  userId: number | null
  userName?: string
}

export function TeacherStatsModal({ open, onClose, userId, userName }: TeacherStatsModalProps) {
  const statsQuery = useQuery({
    queryKey: ['teacher-stats', userId],
    queryFn: () => fetchTeacherFullStats(userId!),
    enabled: open && !!userId,
    staleTime: 30_000,
  })

  if (!open || !userId) return null

  const stats = statsQuery.data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <User className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {stats?.user.name ?? userName ?? 'إحصائيات المعلم'}
              </h2>
              <p className="text-sm text-muted">إحصائيات الإشراف والمناوبة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {statsQuery.isLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              جارٍ تحميل الإحصائيات...
            </div>
          ) : statsQuery.isError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-rose-600">
              <AlertCircle className="h-8 w-8" />
              <p>حدث خطأ في تحميل الإحصائيات</p>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* معلومات المعلم */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{stats.user.name}</h3>
                    {stats.user.phone && (
                      <p className="flex items-center gap-1 text-sm text-muted">
                        <Phone className="h-4 w-4" />
                        {stats.user.phone}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      الفصل: {stats.semester.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* إحصائيات المناوبة */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Sunset className="h-4 w-4 text-orange-500" />
                  المناوبة الفصلية
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-orange-50 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.duties.total}</p>
                    <p className="text-xs text-orange-600">إجمالي المناوبات</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{stats.duties.completed}</p>
                    <p className="text-xs text-emerald-600">تم حضورها</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-4 text-center">
                    <p className="text-2xl font-bold text-rose-600">{stats.duties.absent}</p>
                    <p className="text-xs text-rose-600">لم يحضرها</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4 text-center">
                    <p className="text-xl font-bold text-slate-700">{stats.duties.upcoming}</p>
                    <p className="text-xs text-muted">متبقية</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 text-center">
                    <p className="text-xl font-bold text-slate-700">{stats.duties.attendance_rate}%</p>
                    <p className="text-xs text-muted">نسبة الحضور</p>
                  </div>
                </div>
              </div>

              {/* إحصائيات الإشراف */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  الإشراف اليومي
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-indigo-50 p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{stats.supervisions.weekly_count}</p>
                    <p className="text-xs text-indigo-600">إشراف أسبوعي</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{stats.supervisions.expected_total}</p>
                    <p className="text-xs text-emerald-600">متوقع للآن</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-4 text-center">
                    <p className="text-2xl font-bold text-rose-600">{stats.supervisions.absences}</p>
                    <p className="text-xs text-rose-600">مرات الغياب</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-center">
                  <p className="text-xl font-bold text-slate-700">{stats.supervisions.attendance_rate}%</p>
                  <p className="text-xs text-muted">نسبة الحضور للإشراف</p>
                </div>
              </div>

              {/* ملخص الحضور */}
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-900">الحضور العام</span>
                  </div>
                  <div className="text-left">
                    {(() => {
                      const totalExpected = stats.duties.total + stats.supervisions.expected_total
                      const totalAbsent = stats.duties.absent + stats.supervisions.absences
                      const rate = totalExpected > 0 
                        ? Math.round(((totalExpected - totalAbsent) / totalExpected) * 100) 
                        : 100
                      return (
                        <span className={`text-2xl font-bold ${
                          rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {rate}%
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  )
}

export default TeacherStatsModal

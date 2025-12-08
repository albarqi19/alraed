import { useState } from 'react'
import { useActivities, useActivityStats, useAvailableGrades, useDeleteActivity } from '../hooks'
import { ActivityCreateModal } from '../components/activity-create-modal'
import { ActivityDetailsModal } from '../components/activity-details-modal'
import type { ActivityStatus } from '../types'

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: 'مسودة',
  active: 'نشط',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const STATUS_COLORS: Record<ActivityStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminActivitiesPage() {
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: activitiesData, isLoading: isLoadingActivities } = useActivities({ 
    status: statusFilter === 'all' ? undefined : statusFilter 
  })
  const { data: stats, isLoading: isLoadingStats } = useActivityStats()
  const { data: grades } = useAvailableGrades()
  const deleteActivity = useDeleteActivity()

  const activities = activitiesData?.data ?? []

  const handleDelete = async (activityId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا النشاط؟')) return
    
    setDeletingId(activityId)
    try {
      await deleteActivity.mutateAsync(activityId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">إدارة الأنشطة</h1>
          <p className="text-sm text-muted">
            أنشئ الأنشطة وتابع تقارير المعلمين وقم بمراجعتها
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <i className="bi bi-plus-circle" /> نشاط جديد
        </button>
      </header>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="إجمالي الأنشطة"
          value={stats?.total_activities ?? 0}
          tone="bg-slate-50 text-slate-700 border-slate-200"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="أنشطة نشطة"
          value={stats?.active_activities ?? 0}
          tone="bg-emerald-50 text-emerald-700 border-emerald-200"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="تقارير معلقة"
          value={stats?.pending_reports ?? 0}
          tone="bg-amber-50 text-amber-700 border-amber-200"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="تقارير معتمدة"
          value={stats?.approved_reports ?? 0}
          tone="bg-sky-50 text-sky-700 border-sky-200"
          isLoading={isLoadingStats}
        />
      </section>

      {/* Activities List */}
      <div className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">قائمة الأنشطة</h2>
            <p className="text-xs text-muted">اضغط على النشاط لعرض التفاصيل ومراجعة التقارير</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {(['all', 'active', 'draft', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-4 py-2 transition ${
                  statusFilter === status
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {status === 'all' ? 'الكل' : STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </header>

        {isLoadingActivities ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100/80" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-muted">
            <i className="bi bi-calendar-event text-4xl text-slate-300 mb-3 block" />
            لا توجد أنشطة مطابقة للفلتر الحالي
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th scope="col" className="px-4 py-3 text-right font-semibold">العنوان</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">الفترة</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">الصفوف</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">التقارير</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">خيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activities.map((activity) => (
                  <tr 
                    key={activity.id} 
                    onClick={() => setSelectedActivityId(activity.id)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{activity.title}</p>
                        <p className="text-xs text-muted line-clamp-1">
                          {activity.description || 'بدون وصف'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[activity.status]}`}>
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {STATUS_LABELS[activity.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span>من: {formatDate(activity.start_date)}</span>
                        <span>إلى: {formatDate(activity.end_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {activity.target_grades?.slice(0, 3).map((grade) => (
                          <span
                            key={grade}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {grade}
                          </span>
                        ))}
                        {(activity.target_grades?.length ?? 0) > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{(activity.target_grades?.length ?? 0) - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-amber-600">
                          <i className="bi bi-clock" />
                          {activity.pending_reports_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600">
                          <i className="bi bi-check-circle" />
                          {activity.approved_reports_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <i className="bi bi-x-circle" />
                          {activity.rejected_reports_count ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDelete(activity.id)}
                          disabled={deletingId === activity.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === activity.id ? (
                            <i className="bi bi-arrow-repeat animate-spin" />
                          ) : (
                            <i className="bi bi-trash" />
                          )}
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ActivityCreateModal
          grades={grades ?? []}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Details Modal */}
      {selectedActivityId && (
        <ActivityDetailsModal
          activityId={selectedActivityId}
          onClose={() => setSelectedActivityId(null)}
        />
      )}
    </section>
  )
}

interface StatCardProps {
  title: string
  value: number
  tone: string
  isLoading?: boolean
}

function StatCard({ title, value, tone, isLoading }: StatCardProps) {
  return (
    <article className={`rounded-2xl border bg-white/80 p-5 shadow-sm ${tone}`}>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {isLoading ? (
        <div className="mt-3 h-9 w-16 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-3 text-3xl font-bold">{value.toLocaleString('en-US')}</p>
      )}
    </article>
  )
}

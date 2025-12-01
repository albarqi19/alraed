import { useState } from 'react'
import { useTeacherActivities } from '../hooks'
import { TeacherActivityModal } from '../components/teacher-activity-modal'
import type { TeacherActivityView, ReportStatus } from '../types'

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'تحت المراجعة',
  approved: 'تم الاعتماد',
  rejected: 'مرفوض',
}

const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

function isActivityExpired(endDate: string): boolean {
  return new Date(endDate) < new Date()
}

export function TeacherActivitiesPage() {
  const { data, isLoading, error } = useTeacherActivities()
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null)

  const activities = data?.data ?? []
  const teacherGrades = data?.teacher_grades ?? []

  // فصل الأنشطة حسب حالة التقرير
  const pendingActivities = activities.filter((a) => !a.report || a.report.status === 'rejected')
  const submittedActivities = activities.filter((a) => a.report && a.report.status !== 'rejected')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="bi bi-arrow-repeat animate-spin text-4xl text-indigo-600" />
          <p className="mt-3 text-muted">جاري تحميل الأنشطة...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
        <i className="bi bi-exclamation-triangle text-4xl text-red-500 mb-3" />
        <p className="text-red-700">{error instanceof Error ? error.message : 'حدث خطأ'}</p>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-slate-900">الأنشطة</h1>
        <p className="text-sm text-muted">
          الأنشطة المخصصة لك بناءً على الصفوف التي تدرسها: {teacherGrades.join(', ')}
        </p>
      </header>

      {activities.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <i className="bi bi-calendar-event text-5xl text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">لا توجد أنشطة</h3>
          <p className="text-sm text-muted">
            لا توجد أنشطة مخصصة لك حالياً
          </p>
        </div>
      ) : (
        <>
          {/* Pending Activities */}
          {pendingActivities.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <i className="bi bi-clock text-amber-500" />
                أنشطة بانتظار تسليم التقرير
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {pendingActivities.length}
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => setSelectedActivityId(activity.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submitted Activities */}
          {submittedActivities.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <i className="bi bi-check-circle text-emerald-500" />
                أنشطة تم تسليمها
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  {submittedActivities.length}
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {submittedActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => setSelectedActivityId(activity.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Activity Modal */}
      {selectedActivityId && (
        <TeacherActivityModal
          activityId={selectedActivityId}
          onClose={() => setSelectedActivityId(null)}
        />
      )}
    </section>
  )
}

interface ActivityCardProps {
  activity: TeacherActivityView
  onClick: () => void
}

function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const isExpired = isActivityExpired(activity.end_date)
  const hasRejectedReport = activity.report?.status === 'rejected'

  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card group w-full text-right transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Status Badge */}
      <div className="flex items-start justify-between mb-3">
        {activity.report ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${REPORT_STATUS_COLORS[activity.report.status]}`}
          >
            {activity.report.status === 'pending' && <i className="bi bi-clock" />}
            {activity.report.status === 'approved' && <i className="bi bi-check-circle" />}
            {activity.report.status === 'rejected' && <i className="bi bi-x-circle" />}
            {REPORT_STATUS_LABELS[activity.report.status]}
          </span>
        ) : isExpired ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <i className="bi bi-exclamation-triangle" />
            منتهي
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <i className="bi bi-file-earmark-plus" />
            يتطلب تسليم
          </span>
        )}
        <i className="bi bi-chevron-left text-slate-300 group-hover:text-indigo-500 transition" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{activity.title}</h3>

      {/* Description */}
      {activity.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{activity.description}</p>
      )}

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <i className="bi bi-calendar-event" />
          {formatDate(activity.start_date)}
        </span>
        <span className="text-slate-300">→</span>
        <span className="flex items-center gap-1">
          <i className="bi bi-calendar-check" />
          {formatDate(activity.end_date)}
        </span>
      </div>

      {/* Target Grades */}
      <div className="mt-3 flex flex-wrap gap-1">
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

      {/* Rejection Reason Warning */}
      {hasRejectedReport && activity.report?.rejection_reason && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2">
          <p className="text-xs text-red-700 font-medium">
            <i className="bi bi-exclamation-circle ml-1" />
            سبب الرفض: {activity.report.rejection_reason}
          </p>
          <p className="text-xs text-red-600 mt-1">اضغط لإعادة تعديل التقرير</p>
        </div>
      )}
    </button>
  )
}

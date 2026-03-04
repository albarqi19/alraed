import { useState } from 'react'
import {
  useRemoteDaysOverview,
  useRemoteDayDetails,
  useRemoteUploadDetails,
} from '../remote-attendance/hooks'
import type { RemoteDaySession } from '../remote-attendance/types'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} س`)
  if (m > 0) parts.push(`${m} د`)
  if (s > 0 || parts.length === 0) parts.push(`${s} ث`)
  return parts.join(' ')
}

export default function AdminRemoteAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedUploadId, setSelectedUploadId] = useState<number | undefined>()

  const overviewQuery = useRemoteDaysOverview()
  const dayDetailsQuery = useRemoteDayDetails(selectedDate)
  const uploadDetailsQuery = useRemoteUploadDetails(selectedUploadId)

  // عند اختيار يوم من القائمة
  const handleSelectDay = (date: string) => {
    setSelectedDate(date)
    setSelectedUploadId(undefined)
  }

  // عند اختيار أول يوم عن بعد تلقائياً
  const overview = overviewQuery.data
  if (overview?.length && !selectedDate) {
    setSelectedDate(overview[0].date)
  }

  const dayDetails = dayDetailsQuery.data
  const uploadDetails = uploadDetailsQuery.data

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <i className="bi bi-laptop ml-2 text-purple-500" />
            متابعة الدوام عن بعد
          </h1>
          <p className="text-sm text-slate-500">
            متابعة رفع ملفات حضور التيمز من المعلمين
          </p>
        </div>
      </header>

      {/* قائمة الأيام */}
      {overviewQuery.isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <i className="bi bi-hourglass-split animate-spin text-2xl" />
        </div>
      ) : !overview?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <i className="bi bi-laptop text-5xl text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            لا توجد أيام دوام عن بعد حتى الآن
          </p>
          <p className="mt-1 text-xs text-slate-400">
            يمكنك تحويل الدوام من صفحة حضور المعلمين
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* الشريط الجانبي - الأيام */}
          <div className="w-56 flex-shrink-0 space-y-2">
            <h3 className="text-xs font-semibold text-slate-400">
              أيام الدوام عن بعد
            </h3>
            {overview.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => handleSelectDay(day.date)}
                className={`w-full rounded-xl p-3 text-right transition-colors ${
                  selectedDate === day.date
                    ? 'bg-purple-50 border border-purple-200 text-purple-800'
                    : 'bg-white border border-slate-100 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-semibold">{day.date_formatted}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-purple-500">
                    <i className="bi bi-upload ml-0.5" />
                    {day.uploads_count} رفع
                  </span>
                  <span className="text-slate-400">
                    <i className="bi bi-people ml-0.5" />
                    {day.total_participants} مشارك
                  </span>
                </div>
                {day.note && (
                  <p className="mt-1 text-xs text-slate-400 truncate">
                    {day.note}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* المحتوى الرئيسي */}
          <div className="min-w-0 flex-1 space-y-4">
            {dayDetailsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <i className="bi bi-hourglass-split animate-spin text-2xl" />
              </div>
            ) : dayDetails ? (
              <>
                {/* بطاقات إحصائية */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    icon="bi-people"
                    color="purple"
                    label="المعلمون الكلي"
                    value={dayDetails.stats.total_teachers}
                  />
                  <StatCard
                    icon="bi-cloud-check"
                    color="emerald"
                    label="رفعوا الملفات"
                    value={dayDetails.stats.teachers_uploaded}
                  />
                  <StatCard
                    icon="bi-cloud-slash"
                    color="rose"
                    label="لم يرفعوا"
                    value={dayDetails.stats.teachers_not_uploaded}
                  />
                  <StatCard
                    icon="bi-person-check"
                    color="blue"
                    label="إجمالي المشاركين"
                    value={dayDetails.stats.total_participants}
                  />
                </div>

                {/* جدول المعلمين */}
                <div className="rounded-2xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                      <i className="bi bi-table ml-1 text-purple-500" />
                      حصص المعلمين
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-right font-medium">
                            المعلم
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            المادة
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            الصف/الفصل
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            الحصة
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            الحالة
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            المشاركون
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            متوسط المدة
                          </th>
                          <th className="px-4 py-3 text-right font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dayDetails.sessions.map((session) => (
                          <SessionRow
                            key={session.session_id}
                            session={session}
                            isSelected={
                              selectedUploadId === session.upload_id
                            }
                            onViewDetails={() =>
                              setSelectedUploadId(
                                session.upload_id ?? undefined,
                              )
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* تفاصيل الرفع */}
                {selectedUploadId && uploadDetails && (
                  <UploadDetailsPanel
                    details={uploadDetails}
                    onClose={() => setSelectedUploadId(undefined)}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: string
  color: 'purple' | 'emerald' | 'rose' | 'blue'
  label: string
  value: number
}) {
  const colors = {
    purple: 'border-purple-100 bg-purple-50/50 text-purple-600',
    emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-600',
    rose: 'border-rose-100 bg-rose-50/50 text-rose-600',
    blue: 'border-blue-100 bg-blue-50/50 text-blue-600',
  }
  const iconColors = {
    purple: 'bg-purple-100/80 text-purple-600',
    emerald: 'bg-emerald-100/80 text-emerald-600',
    rose: 'bg-rose-100/80 text-rose-600',
    blue: 'bg-blue-100/80 text-blue-600',
  }
  const valueColors = {
    purple: 'text-purple-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    blue: 'text-blue-700',
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 ${colors[color]}`}
    >
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconColors[color]}`}
      >
        <i className={`bi ${icon} text-lg`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold opacity-80">{label}</p>
        <p className={`text-lg font-bold ${valueColors[color]}`}>
          {value.toLocaleString('ar-SA')}
        </p>
      </div>
    </div>
  )
}

function SessionRow({
  session,
  isSelected,
  onViewDetails,
}: {
  session: RemoteDaySession
  isSelected: boolean
  onViewDetails: () => void
}) {
  return (
    <tr className={`hover:bg-slate-50/50 ${isSelected ? 'bg-purple-50/30' : ''}`}>
      <td className="px-4 py-3 font-medium text-slate-700">
        {session.teacher_name}
      </td>
      <td className="px-4 py-3 text-slate-600">{session.subject_name}</td>
      <td className="px-4 py-3 text-slate-600">
        {session.grade} - {session.class_name}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {session.period_number ?? '-'}
      </td>
      <td className="px-4 py-3">
        {session.is_uploaded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <i className="bi bi-check-circle-fill" /> تم الرفع
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            <i className="bi bi-clock" /> لم يُرفع
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {session.is_uploaded ? session.total_participants : '-'}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {session.avg_duration_seconds
          ? formatDuration(session.avg_duration_seconds)
          : '-'}
      </td>
      <td className="px-4 py-3">
        {session.is_uploaded && session.upload_id && (
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs font-medium text-purple-600 hover:text-purple-800"
          >
            عرض التفاصيل
          </button>
        )}
      </td>
    </tr>
  )
}

function UploadDetailsPanel({
  details,
  onClose,
}: {
  details: NonNullable<ReturnType<typeof useRemoteUploadDetails>['data']>
  onClose: () => void
}) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-purple-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <i className="bi bi-camera-video text-lg" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              {details.upload.meeting_title ?? 'تفاصيل الاجتماع'}
            </h4>
            <p className="text-xs text-slate-400">
              {details.upload.teacher_name} - {details.session.subject_name} (
              {details.session.grade} - {details.session.class_name})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-3 border-b border-slate-50 p-4">
        <div className="text-center">
          <p className="text-lg font-bold text-purple-700">
            {details.stats.total_attendees}
          </p>
          <p className="text-xs text-slate-400">مشارك</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-700">
            {formatDuration(details.stats.avg_duration_seconds)}
          </p>
          <p className="text-xs text-slate-400">متوسط المدة</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-700">
            {details.upload.meeting_duration ?? '-'}
          </p>
          <p className="text-xs text-slate-400">مدة الاجتماع</p>
        </div>
      </div>

      {/* جدول المشاركين */}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 text-right font-medium">الاسم</th>
              <th className="px-4 py-2 text-right font-medium">البريد</th>
              <th className="px-4 py-2 text-right font-medium">المدة</th>
              <th className="px-4 py-2 text-right font-medium">أول دخول</th>
              <th className="px-4 py-2 text-right font-medium">آخر خروج</th>
              <th className="px-4 py-2 text-right font-medium">
                مرات الدخول
              </th>
              <th className="px-4 py-2 text-right font-medium">الدور</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {details.participants.map((p) => {
              const formatTime = (dt: string | null) => {
                if (!dt) return '-'
                return new Date(dt).toLocaleTimeString('ar-SA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }

              return (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 font-medium text-slate-700">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400 ltr">
                    {p.email ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {p.formatted_duration}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {formatTime(p.first_join_time)}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {formatTime(p.last_leave_time)}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-600">
                    {p.join_leave_count}
                  </td>
                  <td className="px-4 py-2">
                    {p.role === 'organizer' ? (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                        منظم
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        حضور
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

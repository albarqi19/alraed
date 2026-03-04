import { useMemo, useState } from 'react'
import {
  useRemoteDaysOverview,
  useRemoteDayDetails,
  useRemoteUploadDetails,
} from '../remote-attendance/hooks'
import { RemoteDayActivationModal } from '../components/remote-day-activation-modal'
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

interface TeacherSummary {
  teacher_id: number
  teacher_name: string
  total_sessions: number
  uploaded_sessions: number
  total_participants: number
  sessions: RemoteDaySession[]
}

export default function AdminRemoteAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>()
  const [selectedUploadId, setSelectedUploadId] = useState<number | undefined>()
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false)

  const overviewQuery = useRemoteDaysOverview()
  const dayDetailsQuery = useRemoteDayDetails(selectedDate)
  const uploadDetailsQuery = useRemoteUploadDetails(selectedUploadId)

  const handleSelectDay = (date: string) => {
    setSelectedDate(date)
    setSelectedTeacherId(undefined)
    setSelectedUploadId(undefined)
  }

  const overview = overviewQuery.data
  if (overview?.length && !selectedDate) {
    setSelectedDate(overview[0].date)
  }

  const dayDetails = dayDetailsQuery.data

  // تجميع الحصص حسب المعلم
  const teacherSummaries = useMemo<TeacherSummary[]>(() => {
    if (!dayDetails?.sessions) return []
    const map = new Map<number, TeacherSummary>()
    for (const s of dayDetails.sessions) {
      let t = map.get(s.teacher_id)
      if (!t) {
        t = {
          teacher_id: s.teacher_id,
          teacher_name: s.teacher_name,
          total_sessions: 0,
          uploaded_sessions: 0,
          total_participants: 0,
          sessions: [],
        }
        map.set(s.teacher_id, t)
      }
      t.total_sessions++
      if (s.is_uploaded) {
        t.uploaded_sessions++
        t.total_participants += s.total_participants
      }
      t.sessions.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      // اللي ما رفعوا أولاً
      const aRatio = a.total_sessions ? a.uploaded_sessions / a.total_sessions : 0
      const bRatio = b.total_sessions ? b.uploaded_sessions / b.total_sessions : 0
      return aRatio - bRatio
    })
  }, [dayDetails?.sessions])

  const selectedTeacher = teacherSummaries.find(
    (t) => t.teacher_id === selectedTeacherId,
  )

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <i className="bi bi-laptop ml-2 text-purple-500" />
            متابعة الدوام عن بعد
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            متابعة رفع ملفات حضور التيمز من المعلمين
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsActivateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
        >
          <i className="bi bi-laptop" />
          تحويل يوم إلى عن بعد
        </button>
      </header>

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
          {/* الشريط الجانبي */}
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

                {/* قائمة المعلمين */}
                <div className="rounded-2xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-700">
                      <i className="bi bi-people ml-1 text-purple-500" />
                      المعلمون ({teacherSummaries.length})
                    </h3>
                  </div>
                  <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {teacherSummaries.map((teacher) => (
                      <TeacherCard
                        key={teacher.teacher_id}
                        teacher={teacher}
                        onClick={() =>
                          setSelectedTeacherId(teacher.teacher_id)
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* نافذة حصص المعلم */}
      {selectedTeacher && (
        <TeacherSessionsModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacherId(undefined)}
          onViewUpload={(uploadId) => setSelectedUploadId(uploadId)}
        />
      )}

      {/* نافذة تفاصيل الرفع */}
      {selectedUploadId && uploadDetailsQuery.data && (
        <UploadDetailsModal
          details={uploadDetailsQuery.data}
          onClose={() => setSelectedUploadId(undefined)}
        />
      )}
      {selectedUploadId && uploadDetailsQuery.isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-8">
            <i className="bi bi-hourglass-split animate-spin text-3xl text-purple-500" />
          </div>
        </div>
      )}

      {/* نافذة تحويل الدوام عن بعد */}
      <RemoteDayActivationModal
        isOpen={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        date={new Date().toISOString().slice(0, 10)}
        allowDateChange
        onSuccess={() => overviewQuery.refetch()}
      />
    </div>
  )
}

/* ========== بطاقة إحصائية ========== */
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

/* ========== بطاقة معلم ========== */
function TeacherCard({
  teacher,
  onClick,
}: {
  teacher: TeacherSummary
  onClick: () => void
}) {
  const ratio =
    teacher.total_sessions > 0
      ? teacher.uploaded_sessions / teacher.total_sessions
      : 0
  const pct = Math.round(ratio * 100)

  let statusColor: string
  let statusBg: string
  let statusIcon: string
  if (ratio === 1) {
    statusColor = 'text-emerald-700'
    statusBg = 'bg-emerald-50 border-emerald-200'
    statusIcon = 'bi-check-circle-fill text-emerald-500'
  } else if (ratio > 0) {
    statusColor = 'text-amber-700'
    statusBg = 'bg-amber-50 border-amber-200'
    statusIcon = 'bi-exclamation-circle-fill text-amber-500'
  } else {
    statusColor = 'text-rose-700'
    statusBg = 'bg-rose-50 border-rose-200'
    statusIcon = 'bi-x-circle-fill text-rose-500'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all hover:shadow-sm ${statusBg}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/80">
        <i className={`bi ${statusIcon} text-lg`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold truncate ${statusColor}`}>
          {teacher.teacher_name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {/* شريط التقدم */}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full transition-all ${
                ratio === 1
                  ? 'bg-emerald-400'
                  : ratio > 0
                    ? 'bg-amber-400'
                    : 'bg-rose-300'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="flex-shrink-0 text-[11px] font-medium opacity-70">
            {teacher.uploaded_sessions}/{teacher.total_sessions}
          </span>
        </div>
        {teacher.total_participants > 0 && (
          <p className="mt-0.5 text-[11px] opacity-60">
            <i className="bi bi-people ml-0.5" />
            {teacher.total_participants} مشارك
          </p>
        )}
      </div>
    </button>
  )
}

/* ========== نافذة حصص المعلم ========== */
function TeacherSessionsModal({
  teacher,
  onClose,
  onViewUpload,
}: {
  teacher: TeacherSummary
  onClose: () => void
  onViewUpload: (uploadId: number) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <i className="bi bi-person text-xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {teacher.teacher_name}
              </h2>
              <p className="text-xs text-slate-500">
                {teacher.uploaded_sessions} من {teacher.total_sessions} حصص تم
                رفعها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* قائمة الحصص */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {teacher.sessions
              .sort(
                (a, b) => (a.period_number ?? 0) - (b.period_number ?? 0),
              )
              .map((session) => (
                <div
                  key={session.session_id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    session.is_uploaded
                      ? 'border-emerald-100 bg-emerald-50/30'
                      : 'border-slate-100 bg-slate-50/30'
                  }`}
                >
                  {/* رقم الحصة */}
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      session.is_uploaded
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {session.period_number ?? '-'}
                  </div>

                  {/* المعلومات */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {session.subject_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.grade} - {session.class_name}
                    </p>
                  </div>

                  {/* الحالة والتفاصيل */}
                  <div className="flex items-center gap-2">
                    {session.is_uploaded ? (
                      <>
                        <div className="text-left">
                          <p className="text-xs font-medium text-emerald-700">
                            <i className="bi bi-people ml-0.5" />
                            {session.total_participants} مشارك
                          </p>
                          {session.avg_duration_seconds > 0 && (
                            <p className="text-[11px] text-slate-400">
                              {formatDuration(session.avg_duration_seconds)}
                            </p>
                          )}
                        </div>
                        {session.upload_id && (
                          <button
                            type="button"
                            onClick={() =>
                              onViewUpload(session.upload_id!)
                            }
                            className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200"
                          >
                            <i className="bi bi-eye ml-0.5" />
                            عرض
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        <i className="bi bi-clock ml-0.5" />
                        لم يُرفع
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========== نافذة تفاصيل الرفع (المشاركون) ========== */
function UploadDetailsModal({
  details,
  onClose,
}: {
  details: NonNullable<ReturnType<typeof useRemoteUploadDetails>['data']>
  onClose: () => void
}) {
  const formatTime = (dt: string | null) => {
    if (!dt) return '-'
    return new Date(dt).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const attendees = details.participants.filter((p) => p.role === 'attendee')
  const organizer = details.participants.find((p) => p.role === 'organizer')

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <i className="bi bi-camera-video text-xl" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {details.upload.meeting_title ?? 'تفاصيل الاجتماع'}
              </h2>
              <p className="text-xs text-slate-500">
                {details.upload.teacher_name} - {details.session.subject_name} (
                {details.session.grade} - {details.session.class_name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-3 gap-3 border-b border-slate-50 p-4">
          <div className="rounded-xl bg-purple-50 p-3 text-center">
            <p className="text-lg font-bold text-purple-700">
              {details.stats.total_attendees}
            </p>
            <p className="text-xs text-purple-500">مشارك</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-center">
            <p className="text-lg font-bold text-blue-700">
              {formatDuration(details.stats.avg_duration_seconds)}
            </p>
            <p className="text-xs text-blue-500">متوسط المدة</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-lg font-bold text-emerald-700">
              {details.upload.meeting_duration ?? '-'}
            </p>
            <p className="text-xs text-emerald-500">مدة الاجتماع</p>
          </div>
        </div>

        {/* المنظم */}
        {organizer && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700">
            <i className="bi bi-star-fill" />
            <span className="font-medium">المنظم:</span> {organizer.name}
          </div>
        )}

        {/* جدول المشاركين */}
        <div className="p-4">
          <h4 className="mb-2 text-xs font-semibold text-slate-500">
            المشاركون ({attendees.length})
          </h4>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">#</th>
                  <th className="px-3 py-2 text-right font-medium">الاسم</th>
                  <th className="px-3 py-2 text-right font-medium">المدة</th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    أول دخول
                  </th>
                  <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    آخر خروج
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    مرات الدخول
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendees.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-700">{p.name}</p>
                      {p.email && (
                        <p className="text-[11px] text-slate-400 ltr">
                          {p.email}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {p.duration_text ?? formatDuration(p.total_duration_seconds)}
                    </td>
                    <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">
                      {formatTime(p.first_join_time)}
                    </td>
                    <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">
                      {formatTime(p.last_leave_time)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.join_leave_count > 1 ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                          {p.join_leave_count}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">1</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

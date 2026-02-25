import { Badge } from '@/components/ui/badge'
import { EmptyState } from './empty-state'
import { Calendar, BookOpen, Users } from 'lucide-react'
import type { TeacherScheduleResponse, TeacherStudentAttendanceStats } from '../types'

const DAY_ORDER = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

const DAY_COLORS: Record<string, string> = {
  'الأحد': 'border-blue-200 bg-blue-50',
  'الاثنين': 'border-emerald-200 bg-emerald-50',
  'الثلاثاء': 'border-violet-200 bg-violet-50',
  'الأربعاء': 'border-amber-200 bg-amber-50',
  'الخميس': 'border-rose-200 bg-rose-50',
}

interface ScheduleSectionProps {
  schedule: TeacherScheduleResponse
  studentStats: TeacherStudentAttendanceStats | undefined
}

export function ScheduleSection({ schedule, studentStats }: ScheduleSectionProps) {
  if (schedule.sessions.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="لا يوجد جدول دراسي"
        description="لم يتم تعيين حصص لهذا المعلم"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* ملخص */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{schedule.summary.total_sessions}</p>
          <p className="text-xs text-slate-500">حصة أسبوعياً</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{schedule.summary.subjects_count}</p>
          <p className="text-xs text-slate-500">مادة</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{schedule.summary.classes_count}</p>
          <p className="text-xs text-slate-500">فصل</p>
        </div>
        {studentStats && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{studentStats.daily.days_recorded}</p>
            <p className="text-xs text-slate-500">يوم حضّر الطلاب</p>
          </div>
        )}
      </div>

      {/* المواد والفصول */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BookOpen className="h-4 w-4 text-violet-500" />
            المواد
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {schedule.subjects.map((subject) => (
              <Badge key={subject} variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                {subject}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4 text-blue-500" />
            الفصول
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {schedule.classes.map((cls) => (
              <Badge key={cls} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                {cls}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* الجدول الأسبوعي */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">الجدول الأسبوعي</h4>
        {DAY_ORDER.map((day) => {
          const sessions = schedule.by_day[day]
          if (!sessions || sessions.length === 0) return null

          return (
            <div key={day} className={`rounded-xl border p-3 ${DAY_COLORS[day] ?? 'border-slate-200 bg-slate-50'}`}>
              <p className="mb-2 text-sm font-bold text-slate-700">{day}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-white/50 bg-white/70 p-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">ح{session.period_number}</span>
                      {session.start_time && (
                        <span className="text-xs text-slate-400">
                          {session.start_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{session.subject_name}</p>
                    <p className="text-xs text-slate-500">{session.grade} - {session.class_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* إحصائيات تحضير الطلاب */}
      {studentStats && (studentStats.daily.total > 0 || studentStats.period.total > 0) && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">إحصائيات تحضير الطلاب بواسطة المعلم</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs font-semibold text-slate-500">تحضير يومي</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{studentStats.daily.total}</p>
              <p className="text-xs text-slate-500">
                حاضر: {studentStats.daily.present} · غائب: {studentStats.daily.absent}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-slate-500">تحضير حصصي</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{studentStats.period.total}</p>
              <p className="text-xs text-slate-500">
                حاضر: {studentStats.period.present} · غائب: {studentStats.period.absent}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

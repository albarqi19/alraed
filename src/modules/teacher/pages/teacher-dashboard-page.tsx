import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'classnames'
import { useTeacherSessionsQuery } from '../hooks'
import type { TeacherSession } from '../types'
import { HolidayBanner } from '@/shared/components/holiday-banner'
import { useTodayStatus } from '@/hooks/use-academic-calendar'

function formatTime(time?: string) {
  if (!time) return 'غير محدد'
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number.parseInt(hourStr ?? '0', 10)
  if (Number.isNaN(hour)) return time
  const period = hour >= 12 ? 'م' : 'ص'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minuteStr ?? '00'} ${period}`
}

function getSubjectName(session: TeacherSession): string {
  // محاولة الحصول على اسم المادة من مصادر متعددة
  if (session.subject && typeof session.subject === 'object' && 'name' in session.subject) {
    return session.subject.name || 'مادة غير محددة'
  }
  return 'مادة غير محددة'
}

function classifySession(session: TeacherSession) {
  // إذا كانت حصة انتظار، نضيف علامة مميزة
  const isStandby = session.is_standby === true

  if (session.is_current) {
    return {
      badge: isStandby ? 'انتظار - جارية' : 'جارية الآن',
      tone: isStandby ? 'text-orange-600' : 'text-emerald-600',
      accent: isStandby ? 'bg-orange-50' : 'bg-emerald-50',
      isStandby
    }
  }
  if (session.is_past) {
    return {
      badge: isStandby ? 'انتظار - منتهية' : 'منتهية',
      tone: 'text-slate-500',
      accent: 'bg-slate-100',
      isStandby
    }
  }
  if (session.can_take_attendance) {
    return {
      badge: isStandby ? 'انتظار - متاح' : 'متاح للتحضير',
      tone: isStandby ? 'text-orange-600' : 'text-amber-600',
      accent: isStandby ? 'bg-orange-50' : 'bg-amber-50',
      isStandby
    }
  }
  return {
    badge: isStandby ? 'انتظار - قادمة' : 'قادمة',
    tone: 'text-slate-500',
    accent: 'bg-white',
    isStandby
  }
}

export function TeacherDashboardPage() {
  const { data, isLoading, isError, refetch } = useTeacherSessionsQuery()
  const { data: todayStatus } = useTodayStatus()
  const [showStats, setShowStats] = useState(false)
  const [alertModal, setAlertModal] = useState<{ type: 'error' | 'warning'; text: string; icon: string } | null>(null)

  // التحقق من أن اليوم إجازة
  const isHoliday = todayStatus && !todayStatus.is_working_day

  const sessions: TeacherSession[] = useMemo(() => {
    // فلترة الحصص لعرض حصص اليوم فقط
    const allSessions = data?.sessions ?? []
    return allSessions.filter((session) => session.is_today === true)
  }, [data?.sessions])

  const handleSessionClick = (session: TeacherSession, event: React.MouseEvent) => {
    if (session.is_past) {
      event.preventDefault()
      setAlertModal({
        type: 'error',
        icon: '⏰',
        text: 'هذه الحصة قد انتهت بالفعل. لا يمكن فتح صفحة التحضير للحصص المنتهية.'
      })
      return
    }

    if (!session.can_take_attendance && !session.is_current) {
      event.preventDefault()
      setAlertModal({
        type: 'warning',
        icon: '⏳',
        text: 'لم يحن وقت هذه الحصة بعد. يمكنك فتح صفحة التحضير قبل بداية الحصة بـ 15 دقيقة.'
      })
      return
    }
  }

  const todaySummary = useMemo(() => {
    const total = sessions.length
    const current = sessions.filter((s) => s.is_current).length
    
    // حساب عدد المواد الفريدة
    const uniqueSubjects = new Set(
      sessions.map((s) => getSubjectName(s)).filter((name) => name !== 'مادة غير محددة')
    ).size
    
    // حساب عدد الفصول الفريدة
    const uniqueClasses = new Set(sessions.map((s) => `${s.grade}-${s.class_name}`)).size

    return [
      { label: 'إجمالي الحصص', value: total.toString(), tone: 'bg-white' },
      { label: 'حصص اليوم', value: current.toString(), tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'عدد المواد', value: uniqueSubjects.toString(), tone: 'bg-blue-50 text-blue-700' },
      { label: 'عدد الفصول', value: uniqueClasses.toString(), tone: 'bg-purple-50 text-purple-700' },
    ]
  }, [sessions])

  const actionableSession = useMemo(() => {
    if (sessions.length === 0) return null
    // أولاً: ابحث عن الحصة الحالية
    const currentSession = sessions.find((session) => session.is_current)
    if (currentSession) return currentSession
    // ثانياً: ابحث عن أول حصة يمكن التحضير لها
    const readySession = sessions.find((session) => session.can_take_attendance)
    if (readySession) return readySession
    // لا توجد حصة متاحة للتحضير الآن
    return null
  }, [sessions])

  const highlightedSessionId = actionableSession?.id ?? null

  if (isLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-4 text-sm text-muted">جاري تحميل بيانات الحصص...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="glass-card text-center">
        <p className="text-sm font-semibold text-rose-600">تعذر تحميل بيانات اليوم</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="button-secondary mt-4"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  return (
    <>
      {alertModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setAlertModal(null)}
        >
          <div
            className={clsx(
              'w-full max-w-md rounded-t-3xl border-t-4 bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300',
              alertModal.type === 'error' ? 'border-rose-500' : 'border-amber-500'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4 text-center">
              <div className="text-5xl">{alertModal.icon}</div>
              <p className="text-lg font-semibold text-slate-900">{alertModal.text}</p>
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                className="button-primary w-full"
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-8">
        {/* Holiday Banner */}
        <HolidayBanner />
        
        <header className="space-y-3 text-right">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {isHoliday ? 'لوحة المعلم' : 'حصص اليوم'}
            </h1>
            <Link
              to="/teacher/points"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 sm:px-4 sm:py-2 sm:text-sm"
            >
              <i className="bi bi-stars text-sm" aria-hidden></i>
              <span>نقاطي</span>
            </Link>
          </div>
          {!isHoliday && (
            <p className="text-sm text-muted">
              {data?.currentDay ?? '—'}{' '}
              {data?.saudiTime ? `— ${new Date(data.saudiTime).toLocaleString('ar-SA')}` : null}
            </p>
          )}
        </header>

      {/* إخفاء الحصص أثناء الإجازة */}
      {!isHoliday && actionableSession ? (
        <article className={clsx(
          'rounded-3xl border bg-white p-6 text-right',
          actionableSession.is_standby ? 'border-orange-300' : 'border-emerald-300'
        )}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className={clsx(
                  'text-sm font-semibold',
                  actionableSession.is_standby ? 'text-orange-700' : 'text-emerald-700'
                )}>
                  {actionableSession.is_standby ? 'حصة انتظار متاحة للتحضير' : 'الحصة المتاحة للتحضير الآن'}
                </p>
                {actionableSession.is_standby && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                    انتظار
                  </span>
                )}
              </div>
              <h2 className={clsx(
                'text-2xl font-bold',
                actionableSession.is_standby ? 'text-orange-900' : 'text-emerald-900'
              )}>
                {getSubjectName(actionableSession)}
              </h2>
              <p className={clsx(
                'text-sm',
                actionableSession.is_standby ? 'text-orange-700' : 'text-emerald-700'
              )}>
                {actionableSession.grade} — {actionableSession.class_name} • الحصة رقم{' '}
                {actionableSession.period_number ?? '--'}
              </p>
              {actionableSession.is_standby && actionableSession.replacing_teacher_name && (
                <p className="text-sm font-medium text-orange-600">
                  <i className="bi bi-arrow-left-right ml-1" aria-hidden></i>
                  بديلاً عن أ. {actionableSession.replacing_teacher_name}
                </p>
              )}
              <p className={clsx(
                'text-xs',
                actionableSession.is_standby ? 'text-orange-600' : 'text-emerald-600'
              )}>
                من {formatTime(actionableSession.formatted_start_time ?? actionableSession.start_time)} إلى{' '}
                {formatTime(actionableSession.formatted_end_time ?? actionableSession.end_time)}
              </p>
            </div>
            <Link
              to={`/teacher/sessions/${actionableSession.id}`}
              className={clsx(
                'w-full lg:w-auto',
                actionableSession.is_standby ? 'button-primary !bg-orange-600 hover:!bg-orange-700' : 'button-primary'
              )}
              onClick={(e) => handleSessionClick(actionableSession, e)}
            >
              {actionableSession.is_current ? 'ابدأ التحضير الآن' : 'فتح صفحة التحضير'}
            </Link>
          </div>
        </article>
      ) : !isHoliday ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-muted">
          لا توجد حصص متاحة للتحضير في الوقت الحالي.
        </div>
      ) : null}

      {/* سجل حصص اليوم - يختفي أثناء الإجازة */}
      {!isHoliday && (
      <div className="glass-card space-y-4">
        <div className="text-right">
          <h2 className="text-xl font-semibold text-slate-900">سجل حصص اليوم</h2>
          <p className="text-sm text-muted">
            {sessions.length > 0
              ? `لديك ${sessions.length.toLocaleString('ar-SA')} حصص مجدولة لليوم.`
              : 'لا توجد حصص مسجلة لهذا اليوم.'}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted">
            لا توجد حصص مسجلة لهذا اليوم.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sessions.map((session) => {
              const status = classifySession(session)
              const isHighlighted = highlightedSessionId === session.id
              const isStandby = session.is_standby === true
              return (
                <article
                  key={`${session.id}-${isStandby ? 'standby' : 'original'}`}
                  className={clsx(
                    'flex h-full flex-col gap-3 rounded-3xl border bg-white p-5 transition',
                    isHighlighted
                      ? isStandby ? 'border-orange-300' : 'border-emerald-300'
                      : isStandby ? 'border-orange-200 hover:border-orange-300' : 'border-slate-200 hover:border-emerald-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 text-right">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {getSubjectName(session)}
                      </h3>
                      <p className="text-xs text-muted">
                        {session.grade} — {session.class_name}
                      </p>
                      {isStandby && session.replacing_teacher_name && (
                        <p className="text-xs font-medium text-orange-600">
                          <i className="bi bi-arrow-left-right ml-1" aria-hidden></i>
                          بديلاً عن أ. {session.replacing_teacher_name}
                        </p>
                      )}
                    </div>
                    <span className={clsx(
                      'rounded-full px-3 py-1 text-xs font-semibold border',
                      status.accent,
                      status.tone,
                      isStandby && 'border-orange-200'
                    )}>
                      {status.badge}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                    <span>
                      من {formatTime(session.formatted_start_time ?? session.start_time)} إلى{' '}
                      {formatTime(session.formatted_end_time ?? session.end_time)}
                    </span>
                    <span>الحصة رقم {session.period_number ?? '--'}</span>
                  </div>
                  {session.is_current || session.can_take_attendance ? (
                    <Link
                      to={`/teacher/sessions/${session.id}`}
                      className={clsx(
                        'mt-auto w-full',
                        isStandby ? 'button-primary !bg-orange-600 hover:!bg-orange-700' : 'button-primary'
                      )}
                      onClick={(e) => handleSessionClick(session, e)}
                    >
                      فتح صفحة التحضير
                    </Link>
                  ) : (
                    <Link
                      to={`/teacher/sessions/${session.id}`}
                      className="button-secondary mt-auto w-full opacity-70"
                      onClick={(e) => handleSessionClick(session, e)}
                    >
                      فتح صفحة التحضير
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* إحصائيات اليوم - تظهر دائماً */}
      <div className="glass-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">إحصائيات اليوم</h2>
          <button
            type="button"
            onClick={() => setShowStats((prev) => !prev)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
          >
            {showStats ? 'إخفاء الإحصائيات' : 'عرض الإحصائيات'}
          </button>
        </div>

        {showStats ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {todaySummary.map((stat) => (
              <div key={stat.label} className={clsx('rounded-2xl border px-5 py-4 text-center', stat.tone)}>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-muted">
            اضغط على "عرض الإحصائيات" للاطلاع على ملخص سريع لليوم.
          </div>
        )}
      </div>
      </section>
    </>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'classnames'
import { useTeacherSessionsQuery } from '../hooks'
import type { TeacherSession } from '../types'

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
  if (session.is_current) return { badge: 'جارية الآن', tone: 'text-emerald-600', accent: 'bg-emerald-50' }
  if (session.is_past) return { badge: 'منتهية', tone: 'text-slate-500', accent: 'bg-slate-100' }
  if (session.can_take_attendance) return { badge: 'متاح للتحضير', tone: 'text-amber-600', accent: 'bg-amber-50' }
  return { badge: 'قادمة', tone: 'text-slate-500', accent: 'bg-white' }
}

export function TeacherDashboardPage() {
  const { data, isLoading, isError, refetch } = useTeacherSessionsQuery()
  const [showStats, setShowStats] = useState(false)
  const [alertModal, setAlertModal] = useState<{ type: 'error' | 'warning'; text: string; icon: string } | null>(null)

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
        <header className="space-y-1 text-right">
          <h1 className="text-3xl font-bold text-slate-900">حصص اليوم</h1>
          <p className="text-sm text-muted">
            {data?.currentDay ?? '—'}{' '}
            {data?.saudiTime ? `— ${new Date(data.saudiTime).toLocaleString('ar-SA')}` : null}
          </p>
        </header>

      {actionableSession ? (
        <article className="rounded-3xl border border-emerald-300 bg-white p-6 text-right">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-emerald-700">الحصة المتاحة للتحضير الآن</p>
              <h2 className="text-2xl font-bold text-emerald-900">
                {getSubjectName(actionableSession)}
              </h2>
              <p className="text-sm text-emerald-700">
                {actionableSession.grade} — {actionableSession.class_name} • الحصة رقم{' '}
                {actionableSession.period_number ?? '--'}
              </p>
              <p className="text-xs text-emerald-600">
                من {formatTime(actionableSession.formatted_start_time ?? actionableSession.start_time)} إلى{' '}
                {formatTime(actionableSession.formatted_end_time ?? actionableSession.end_time)}
              </p>
            </div>
            <Link 
              to={`/teacher/sessions/${actionableSession.id}`} 
              className="button-primary w-full lg:w-auto"
              onClick={(e) => handleSessionClick(actionableSession, e)}
            >
              {actionableSession.is_current ? 'ابدأ التحضير الآن' : 'فتح صفحة التحضير'}
            </Link>
          </div>
        </article>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-muted">
          لا توجد حصص متاحة للتحضير في الوقت الحالي.
        </div>
      )}

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
              return (
                <article
                  key={session.id}
                  className={clsx(
                    'flex h-full flex-col gap-3 rounded-3xl border bg-white p-5 transition',
                    isHighlighted ? 'border-emerald-300' : 'border-slate-200 hover:border-emerald-200',
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
                    </div>
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold border', status.accent, status.tone)}>
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
                      className="button-primary mt-auto w-full"
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

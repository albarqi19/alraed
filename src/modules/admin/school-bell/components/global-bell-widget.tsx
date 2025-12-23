import { useMemo, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarClock, Clock3, Volume2, X, Bell } from 'lucide-react'
import { useBellManager } from '../context/bell-manager-context'
import { formatClock, formatRelative, formatTime } from '../utils'
import { useToast } from '@/shared/feedback/use-toast'

const ADMIN_BELL_PATH = '/admin/school-tools/bell'
const WIDGET_VISIBILITY_KEY = 'bell-widget-visible'

export function GlobalBellWidget() {
  const {
    state,
    currentTime,
    upcomingEvent,
    activeSchedule,
    activeToneProfile,
    isAnyAudioReady,
    readySoundIds,
    schedulerEnabled,
    toneProfileMap,
  } = useBellManager()
  const location = useLocation()
  const pushToast = useToast()

  // حالة إظهار/إخفاء الويدجت - مخفي بشكل افتراضي
  const [isWidgetVisible, setIsWidgetVisible] = useState(() => {
    const saved = localStorage.getItem(WIDGET_VISIBILITY_KEY)
    return saved === 'true' // افتراضياً false
  })

  // حفظ حالة الرؤية في localStorage
  useEffect(() => {
    localStorage.setItem(WIDGET_VISIBILITY_KEY, String(isWidgetVisible))
  }, [isWidgetVisible])

  const countdownLabel = useMemo(() => {
    if (!upcomingEvent) return null
    const diff = formatRelative(upcomingEvent.occurrence, currentTime)
    return diff === 'الآن' ? diff : `بعد ${diff}`
  }, [currentTime, upcomingEvent])

  const toneProfileName = useMemo(() => {
    if (activeToneProfile) return activeToneProfile.name
    if (activeSchedule?.toneProfileId) {
      const fallbackProfile = toneProfileMap.get(activeSchedule.toneProfileId)
      if (fallbackProfile) return fallbackProfile.name
    }

    const defaultProfileId = state.toneProfiles[0]?.id
    if (defaultProfileId) {
      const firstProfile = toneProfileMap.get(defaultProfileId)
      if (firstProfile) return firstProfile.name
    }

    return 'نبرة افتراضية'
  }, [activeSchedule?.toneProfileId, activeToneProfile, state.toneProfiles, toneProfileMap])

  const isInsideAdmin = location.pathname.startsWith('/admin')
  const shouldRenderWidget = isInsideAdmin && state.showWidget

  if (!shouldRenderWidget) {
    return null
  }

  const isOnBellPage = location.pathname === ADMIN_BELL_PATH

  const scheduleName = activeSchedule?.name ?? state.schedules.find((schedule) => schedule.isEnabled)?.name
  const statusLabel = schedulerEnabled ? 'مفعل' : 'معطل'
  const statusClasses = schedulerEnabled
    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
    : 'bg-white/10 text-white/80 hover:bg-white/20'

  // زر صغير لإظهار الويدجت عندما يكون مغلقاً
  if (!isWidgetVisible) {
    return (
      <div className="pointer-events-none fixed bottom-6 left-6 z-[9999]">
        <button
          type="button"
          onClick={() => setIsWidgetVisible(true)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/95 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition hover:bg-slate-800 hover:scale-105"
          title="إظهار ويدجت الجرس"
        >
          <Bell className="h-6 w-6 text-emerald-300" />
          {schedulerEnabled && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500"></span>
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[9999] max-w-xs">
      <div className="pointer-events-auto flex flex-col gap-3 rounded-3xl bg-slate-900/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={() => setIsWidgetVisible(false)}
          className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
          title="إخفاء الويدجت"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-300">
            الوقت الآن
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/60">
            <Volume2 className="h-3.5 w-3.5 text-emerald-300" />
            {toneProfileName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-3xl font-bold">
          <Clock3 className="h-7 w-7 text-emerald-300" />
          <span style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{formatClock(currentTime)}</span>
        </div>
        <div className="rounded-2xl bg-white/5 p-3 text-xs">
          {upcomingEvent ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/90">
                <CalendarClock className="h-4 w-4 text-emerald-300" />
                <span className="font-semibold">{upcomingEvent.event.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-white/70">
                <span>{countdownLabel}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                  {formatTime(upcomingEvent.event.time)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-white/70">
              <p>{scheduleName ? `لا توجد أحداث قادمة في جدول "${scheduleName}".` : 'لا يوجد جدول نشط حاليًا.'}</p>
              <p className="text-white/50">يمكنك إدارة الجداول من صفحة الجرس المدرسي.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
          <span className="flex items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isAnyAudioReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
            ></span>
            {isAnyAudioReady ? `${readySoundIds.length} صوت جاهز` : 'جاري تهيئة المكتبة الصوتية'}
          </span>
          {isOnBellPage ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/70">
              صفحة التحكم مفتوحة
            </span>
          ) : (
            <Link
              to={ADMIN_BELL_PATH}
              className="rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-500"
            >
              إدارة الجرس
            </Link>
          )}
        </div>
        <button
          type="button"
          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${statusClasses}`}
          onClick={() => {
            if (schedulerEnabled) {
              pushToast({
                title: 'الجرس يعمل',
                description: scheduleName
                  ? `سيستمر جدول "${scheduleName}" في العمل تلقائيًا.`
                  : 'لا يوجد جدول محدد، ولكن الجرس في وضع التشغيل.',
                type: 'success',
              })
            } else {
              pushToast({
                title: 'الجرس معطل',
                description: 'قم بزيارة صفحة الجرس المدرسي لتفعيل الجداول وتشغيل التنبيهات.',
                type: 'warning',
              })
            }
          }}
        >
          {statusLabel}
        </button>
      </div>
    </div>
  )
}

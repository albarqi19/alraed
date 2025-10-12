import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'classnames'
import {
  AlarmClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  Mic2,
  TimerReset,
  Users,
} from 'lucide-react'
import {
  AutoCallProvider,
  DEFAULT_AUTO_CALL_SETTINGS,
  useAutoCall,
  type AutoCallHistoryEntry,
  type AutoCallQueueEntry,
} from '@/modules/auto-call'

interface AutoCallDisplayScreenProps {
  customTitle?: string | null
}

export function AutoCallDisplayPage() {
  const [searchParams] = useSearchParams()
  const schoolParam = searchParams.get('school')
  const titleParam = searchParams.get('title')

  return (
    <AutoCallProvider schoolIdOverride={schoolParam}>
      <AutoCallDisplayScreen customTitle={titleParam} />
    </AutoCallProvider>
  )
}

function AutoCallDisplayScreen({ customTitle }: AutoCallDisplayScreenProps) {
  const { settings, queue, history, loading, schoolId } = useAutoCall()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!settings?.enableSpeech || !('speechSynthesis' in window)) {
      return
    }

    const announcing = queue.find((entry) => entry.status === 'announcing')
    if (!announcing) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(announcing.studentName)
    utterance.lang = settings.voiceLocale || 'ar-SA'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find((voice) => {
      if (settings.voiceGender === 'male') {
        return voice.lang.startsWith('ar') && voice.name.toLowerCase().includes('male')
      }
      if (settings.voiceGender === 'female') {
        return voice.lang.startsWith('ar') && voice.name.toLowerCase().includes('female')
      }
      return voice.lang.startsWith('ar')
    })

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    console.log('🔊 Speaking student name:', announcing.studentName, {
      voice: utterance.voice?.name,
      lang: utterance.lang,
      gender: settings.voiceGender,
    })

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [queue, settings])

  const { activeCall, upcomingCalls, recentlyAcknowledged, stats, secondsRemaining } = useMemo(() => {
    const sortedQueue = [...queue].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const announcing = sortedQueue.find((entry) => entry.status === 'announcing')
    const pending = sortedQueue.find((entry) => entry.status === 'pending')
    const active = announcing ?? pending ?? null
    const upcoming = sortedQueue
      .filter((entry) => entry.id !== active?.id && entry.status === 'pending')
      .slice(0, 5)

    const acknowledged = history
      .filter((entry) => entry.status === 'acknowledged')
      .sort((a, b) => new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime())
      .slice(0, 6)

    const anchoredAt = active?.status === 'announcing' ? active.lastAnnouncedAt ?? active.createdAt : active?.createdAt
    const duration = settings?.announcementDurationSeconds ?? DEFAULT_AUTO_CALL_SETTINGS.announcementDurationSeconds
    const secondsRemaining = anchoredAt ? Math.max(0, duration - diffSeconds(now, anchoredAt)) : duration

    const stats = {
      queueSize: sortedQueue.length,
      announcingCount: sortedQueue.filter((entry) => entry.status === 'announcing').length,
      pendingCount: sortedQueue.filter((entry) => entry.status === 'pending').length,
      acknowledgedToday: countAcknowledgedToday(history, new Date(now)),
    }

    return {
      activeCall: active,
      upcomingCalls: upcoming,
  recentlyAcknowledged: acknowledged,
      stats,
      secondsRemaining,
    }
  }, [history, now, queue, settings])

  const theme = settings?.displayTheme === 'light'
    ? {
        background: 'from-slate-100 via-white to-slate-100',
        card: 'bg-white/85 border-slate-200 text-slate-900',
        accent: 'bg-indigo-100 text-indigo-700',
        muted: 'text-slate-500',
        gridBorder: 'border-slate-200/60',
      }
    : {
        background: 'from-slate-950 via-slate-900 to-slate-950',
        card: 'bg-slate-900/70 border-slate-700 text-slate-100',
        accent: 'bg-indigo-500/20 text-indigo-100',
        muted: 'text-slate-400',
        gridBorder: 'border-slate-700/60',
      }

  const title = customTitle ?? 'النداء الآلي للطلاب'
  const subTitle = settings?.enabled === false ? 'النظام متوقف حالياً' : `رمز المدرسة: ${schoolId ?? 'غير محدد'}`

  return (
    <main
      className={clsx(
        'min-h-screen w-full bg-gradient-to-br font-[\'Cairo\'] text-white transition-colors duration-700',
        theme.background,
      )}
    >
      <div className="flex min-h-screen w-full flex-col px-6 py-10 md:px-12">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-10">
          <header className="flex flex-col items-center gap-2 text-center">
          <p className={clsx('text-xs font-semibold uppercase tracking-[0.35em]', theme.muted)}>مركز النداء</p>
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-sm md:text-5xl">{title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-100 md:text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Clock3 className="h-4 w-4" />
              {new Intl.DateTimeFormat('ar-SA', {
                dateStyle: 'full',
                timeStyle: 'short',
              }).format(now)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Mic2 className="h-4 w-4" />
              {settings?.enableSpeech ? 'النطق الآلي مفعل' : 'النطق الآلي متوقف'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <AlarmClock className="h-4 w-4" />
              {subTitle}
            </span>
          </div>
        </header>

        <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="في الطابور"
            value={stats.queueSize}
            icon={<Users className="h-6 w-6" />}
            theme={theme}
            caption="إجمالي الطلبات النشطة"
          />
          <StatCard
            title="قيد التشغيل"
            value={stats.announcingCount}
            icon={<Megaphone className="h-6 w-6" />}
            theme={theme}
            caption="يتم عرضها على الفور"
          />
          <StatCard
            title="بانتظار النداء"
            value={stats.pendingCount}
            icon={<TimerReset className="h-6 w-6" />}
            theme={theme}
            caption="من المتوقع مناداتها قريباً"
          />
          <StatCard
            title="تم الاستلام اليوم"
            value={stats.acknowledgedToday}
            icon={<CheckCircle2 className="h-6 w-6" />}
            theme={theme}
            caption="الطلبات المكتملة"
          />
        </section>

        <section className="w-full">
          <ActiveCallCard
            activeCall={activeCall}
            secondsRemaining={secondsRemaining}
            theme={theme}
            loading={loading.queue}
          />
        </section>

        <section className="grid w-full flex-1 gap-6 pb-12 lg:grid-cols-2">
          <UpcomingCallsCard upcoming={upcomingCalls} theme={theme} loading={loading.queue} />
          <RecentAcknowledgements acknowledged={recentlyAcknowledged} theme={theme} loading={loading.history} />
        </section>
        </div>
      </div>
    </main>
  )
}

interface DisplayThemePalette {
  background: string
  card: string
  accent: string
  muted: string
  gridBorder: string
}

interface StatCardProps {
  title: string
  value: number
  icon: ReactNode
  theme: DisplayThemePalette
  caption: string
}

function StatCard({ title, value, icon, theme, caption }: StatCardProps) {
  return (
    <article
      className={clsx(
        'flex flex-col justify-between gap-3 rounded-2xl border p-4 text-right shadow-md shadow-black/10 backdrop-blur-md transition',
        theme.card,
      )}
    >
      <header className="flex items-center justify-between">
        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full', theme.accent)}>{icon}</div>
        <span className="text-3xl font-extrabold">{value}</span>
      </header>
      <footer>
        <p className="text-base font-semibold">{title}</p>
        <p className={clsx('text-xs', theme.muted)}>{caption}</p>
      </footer>
    </article>
  )
}

interface ActiveCallCardProps {
  activeCall: AutoCallQueueEntry | null
  secondsRemaining: number
  theme: DisplayThemePalette
  loading: boolean
}

function ActiveCallCard({ activeCall, secondsRemaining, theme, loading }: ActiveCallCardProps) {
  if (loading && !activeCall) {
    return (
      <article className={clsx('flex h-full items-center justify-center rounded-[36px] border p-12 text-center shadow-2xl', theme.card)}>
        <Loader2 className="h-10 w-10 animate-spin" />
      </article>
    )
  }

  if (!activeCall) {
    return (
      <article className={clsx('flex h-full flex-col items-center justify-center gap-4 rounded-[36px] border p-12 text-center shadow-2xl', theme.card)}>
        <Megaphone className="h-16 w-16 opacity-80" />
        <h2 className="text-3xl font-semibold">لا توجد مناداة حالياً</h2>
        <p className={clsx('max-w-md text-sm', theme.muted)}>سيظهر هنا أول طالب يتم مناداته عند وجود طلبات جديدة.</p>
      </article>
    )
  }

  const chips: Array<{ id: string; label: string; value: string; icon: ReactNode }> = [
    {
      id: 'guardian',
      label: 'ولي الأمر',
      value: activeCall.guardianName ?? '—',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'phone',
      label: 'الهاتف',
      value: activeCall.guardianPhone ?? '—',
      icon: <Mic2 className="h-4 w-4" />,
    },
    {
      id: 'time',
      label: 'وقت الطلب',
      value: formatRelative(activeCall.createdAt),
      icon: <Clock3 className="h-4 w-4" />,
    },
  ]

  if (activeCall.notes) {
    chips.push({
      id: 'notes',
      label: 'ملاحظات',
      value: activeCall.notes,
      icon: <Megaphone className="h-4 w-4" />,
    })
  }

  return (
    <article className={clsx('mx-auto w-full rounded-[40px] border px-8 py-12 text-center shadow-2xl shadow-black/30 backdrop-blur-md', theme.card)}>
      <p className={clsx('text-xs font-semibold uppercase tracking-[0.45em]', theme.muted)}>
        {activeCall.status === 'announcing' ? 'جاري النداء' : 'بانتظار النداء'}
      </p>
      <h2 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">{activeCall.studentName}</h2>
      {activeCall.classLabel ? <p className="mt-2 text-lg font-semibold text-indigo-200">{activeCall.classLabel}</p> : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', theme.accent)}>
          <Megaphone className="h-4 w-4" />
          رقم الطلب: {activeCall.studentNationalId || activeCall.id}
        </span>
        {chips.map((chip) => (
          <span
            key={chip.id}
            className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', theme.accent)}
          >
            {chip.icon}
            <span>{chip.label}</span>
            <span className="text-sm font-bold">{chip.value}</span>
          </span>
        ))}
      </div>

      <div className="mt-10 flex items-center justify_center">
        <div className={clsx('grid h-28 w-28 place-items-center rounded-full border-2 text-3xl font-black', theme.accent)}>
          {formatCountdown(secondsRemaining)}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-300">الوقت المتبقي قبل إعادة النداء</p>
    </article>
  )
}

interface UpcomingCallsCardProps {
  upcoming: AutoCallQueueEntry[]
  theme: DisplayThemePalette
  loading: boolean
}

function UpcomingCallsCard({ upcoming, theme, loading }: UpcomingCallsCardProps) {
  return (
    <article className={clsx('flex h-full flex-col gap-4 rounded-3xl border p-6', theme.card)}>
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">القادمون</h3>
        <span className={clsx('text-xs font-semibold uppercase tracking-[0.35em]', theme.muted)}>الطابور</span>
      </header>
      <div className={clsx('flex-1 space-y-3 overflow-hidden', loading ? 'opacity-75' : 'opacity-100')}>
        {loading && upcoming.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : null}
        {upcoming.length === 0 && !loading ? (
          <p className={clsx('text-sm', theme.muted)}>لا يوجد طابور انتظار حالياً.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((entry) => (
              <li key={entry.id} className={clsx('rounded-2xl border p-3 text-right shadow-sm', theme.gridBorder)}>
                <p className="text-base font-semibold">{entry.studentName}</p>
                <p className={clsx('text-xs', theme.muted)}>{entry.classLabel ?? '—'}</p>
                <p className={clsx('text-[11px]', theme.muted)}>{formatRelative(entry.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

interface RecentAcknowledgementsProps {
  acknowledged: AutoCallHistoryEntry[]
  theme: DisplayThemePalette
  loading: boolean
}

function RecentAcknowledgements({ acknowledged, theme, loading }: RecentAcknowledgementsProps) {
  return (
    <article className={clsx('flex h-full flex-col gap-4 rounded-3xl border p-6', theme.card)}>
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">آخر من تم استلامهم</h3>
        <CheckCircle2 className="h-5 w-5" />
      </header>
      <div className={clsx('grid gap-3 text-sm', loading ? 'opacity-75' : 'opacity-100')}>
        {loading && acknowledged.length === 0 ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : null}
        {acknowledged.length === 0 && !loading ? (
          <p className={clsx('text-sm', theme.muted)}>لم يتم تسجيل عمليات استلام بعد.</p>
        ) : (
          <ul className="space-y-2">
            {acknowledged.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-transparent bg-black/10 px-3 py-2">
                <div className="text-right">
                  <p className="text-sm font-semibold">{entry.studentName}</p>
                  <p className={clsx('text-xs', theme.muted)}>{entry.classLabel ?? '—'}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-300">{formatRelative(entry.resolvedAt ?? entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

function diffSeconds(now: number, value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 0
  return Math.floor((now - date.getTime()) / 1000)
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return remainingSeconds.toString().padStart(2, '0')
}

function formatRelative(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const formatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(-diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(-diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return formatter.format(-diffDays, 'day')
}

function countAcknowledgedToday(entries: AutoCallHistoryEntry[], now: Date) {
  return entries.filter((entry) => {
    if (entry.status !== 'acknowledged') return false
    const resolvedAt = entry.resolvedAt ?? entry.acknowledgedAt ?? entry.createdAt
    if (!resolvedAt) return false
    const date = new Date(resolvedAt)
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }).length
}

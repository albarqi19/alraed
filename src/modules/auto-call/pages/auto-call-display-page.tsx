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
  Radio,
  RefreshCcw,
  TimerReset,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react'
import {
  AutoCallProvider,
  useAutoCall,
  type AutoCallHistoryEntry,
  type AutoCallQueueEntry,
  type AutoCallSettings,
} from '@/modules/auto-call'
import { useAnnouncementEngine } from '../hooks/use-announcement-engine'
import { useAudioGate, useScreenWakeLock } from '../hooks/use-display-runtime'
import { useDisplayFeed } from '../hooks/use-display-feed'
import type { DisplayAcknowledgement } from '../api/display-api'

/**
 * شاشةُ النداء عند بوّابة المدرسة.
 *
 * لها وضعان يشتركان في كلّ ما يُرى، ويختلفان في مصدر البيانات وحده:
 *
 * · **وضعُ الرمز** (`?token=…`) — الوضعُ المقصود لجهازٍ معلّقٍ عند المدخل: لا
 *   جلسةَ ولا تسجيلَ دخول، فلا ينقطع بانتهاء رمزِ موظّف. وهو الأنظفُ خصوصيّةً
 *   أيضاً: مسارُه العامّ لا يرسل هويّةَ طالبٍ ولا هاتفَ وليّ أمر.
 *
 * · **وضعُ الجلسة** (بلا رمز) — يعمل داخل لوحة المدرسة لمن أراد معاينة الشاشة
 *   من حسابه، ويستفيد من البثّ اللحظيّ.
 *
 * والفصلُ بمكوّنين لا بشرطٍ داخل مكوّنٍ واحد: الـhooks لا تُستدعى شرطيّاً.
 */

interface AutoCallDisplayScreenProps {
  customTitle?: string | null
}

export function AutoCallDisplayPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const schoolParam = searchParams.get('school')
  const titleParam = searchParams.get('title')

  if (token) {
    return <TokenDisplayScreen token={token} customTitle={titleParam} />
  }

  return (
    <AutoCallProvider schoolIdOverride={schoolParam}>
      <SessionDisplayScreen customTitle={titleParam} />
    </AutoCallProvider>
  )
}

// ═══════════════════════ وضعُ الرمز ═══════════════════════

function TokenDisplayScreen({ token, customTitle }: { token: string; customTitle?: string | null }) {
  const feed = useDisplayFeed(token)
  const audio = useAudioGate()
  useScreenWakeLock(true)

  // مدرسةٌ أطفأت النطق (مُكبِّرُ صوتٍ منفصلٌ عندها، أو شاشةٌ صامتةٌ عمداً) لا
  // تُحجب خلف تراكب «تفعيل الصوت»: لا صوتَ يُنتظر إذنُه أصلاً، والحجبُ يعني
  // شاشةً معتمةً عند البوّابة حتى يأتي من ينقرها لغير سبب.
  const isAudioReady = audio.isAudioReady || feed.settings?.enableSpeech === false

  const engine = useAnnouncementEngine({
    settings: feed.settings,
    queue: feed.queue,
    announceNext: feed.announceNext,
    finishAnnouncement: feed.finishAnnouncement,
    isAudioReady,
    clockSkewMs: feed.clockSkewMs,
  })

  const acknowledged = useMemo<AcknowledgedRow[]>(
    () =>
      feed.recentAcknowledged.map((row: DisplayAcknowledgement) => ({
        id: row.id,
        studentName: row.studentName,
        classLabel: row.classLabel,
        resolvedAt: row.resolvedAt,
      })),
    [feed.recentAcknowledged]
  )

  return (
    <DisplayView
      customTitle={customTitle}
      subtitle={feed.schoolName ?? 'شاشة النداء'}
      settings={feed.settings}
      queue={feed.queue}
      acknowledged={acknowledged}
      isLoading={feed.isLoading}
      engine={engine}
      audio={audio}
      needsAudioUnlock={!isAudioReady}
      connection={feed.error ? 'error' : 'polling'}
      connectionMessage={feed.error}
      clockSkewMs={feed.clockSkewMs}
      onRefresh={() => void feed.refresh()}
    />
  )
}

// ═══════════════════════ وضعُ الجلسة ═══════════════════════

function SessionDisplayScreen({ customTitle }: AutoCallDisplayScreenProps) {
  const {
    settings,
    queue,
    history,
    loading,
    schoolId,
    announceNext,
    finishAnnouncement,
    isRealtimeConnected,
    refresh,
  } = useAutoCall()

  const audio = useAudioGate()
  useScreenWakeLock(true)

  const isAudioReady = audio.isAudioReady || settings?.enableSpeech === false

  const engine = useAnnouncementEngine({
    settings,
    queue,
    announceNext,
    finishAnnouncement,
    isAudioReady,
  })

  const acknowledged = useMemo<AcknowledgedRow[]>(
    () =>
      history
        .filter((entry: AutoCallHistoryEntry) => entry.status === 'acknowledged')
        .sort(
          (a, b) =>
            new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime()
        )
        .slice(0, 8)
        .map((entry) => ({
          id: entry.id,
          studentName: entry.studentName,
          classLabel: entry.classLabel ?? null,
          resolvedAt: entry.resolvedAt ?? entry.acknowledgedAt ?? entry.createdAt,
        })),
    [history]
  )

  return (
    <DisplayView
      customTitle={customTitle}
      subtitle={`رمز المدرسة: ${schoolId ?? 'غير محدد'}`}
      settings={settings}
      queue={queue}
      acknowledged={acknowledged}
      isLoading={loading.queue}
      engine={engine}
      audio={audio}
      needsAudioUnlock={!isAudioReady}
      connection={isRealtimeConnected ? 'live' : 'polling'}
      connectionMessage={null}
      clockSkewMs={0}
      onRefresh={() => void refresh()}
    />
  )
}

// ═══════════════════════ العرضُ المشترك ═══════════════════════

interface AcknowledgedRow {
  id: string
  studentName: string
  classLabel: string | null
  resolvedAt: string | null
}

interface DisplayViewProps {
  customTitle?: string | null
  subtitle: string
  settings: AutoCallSettings | null
  queue: AutoCallQueueEntry[]
  acknowledged: AcknowledgedRow[]
  isLoading: boolean
  engine: ReturnType<typeof useAnnouncementEngine>
  audio: ReturnType<typeof useAudioGate>
  /** هل تُحجب الشاشة بتراكبٍ يطلب لمسةً تفتح الصوت؟ */
  needsAudioUnlock: boolean
  connection: 'live' | 'polling' | 'error'
  connectionMessage: string | null
  clockSkewMs: number
  onRefresh: () => void
}

function DisplayView({
  customTitle,
  subtitle,
  settings,
  queue,
  acknowledged,
  isLoading,
  engine,
  audio,
  needsAudioUnlock,
  connection,
  connectionMessage,
  clockSkewMs,
  onRefresh,
}: DisplayViewProps) {
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // كلُّ زمنٍ معروضٍ يُقاس بساعة الخادم لا بساعة الصندوق: جهازُ عرضٍ فقد ضبط
  // وقته بعد انقطاع كهرباء كان يعرض «قبل ساعة» لنداءٍ وصل للتوّ — رقمٌ يبدو
  // معقولاً وهو كاذب، وذلك أسوأ من عطبٍ ظاهر.
  const now = tick + clockSkewMs

  const { activeCall, upcomingCalls, stats } = useMemo(() => {
    const sorted = [...queue].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const pending = sorted.find((entry) => entry.status === 'pending')
    const active = engine.announcing ?? pending ?? null

    return {
      activeCall: active,
      upcomingCalls: sorted.filter((entry) => entry.id !== active?.id && entry.status === 'pending').slice(0, 5),
      stats: {
        queueSize: sorted.length,
        announcingCount: sorted.filter((entry) => entry.status === 'announcing').length,
        pendingCount: sorted.filter((entry) => entry.status === 'pending').length,
        acknowledgedToday: countAcknowledgedToday(acknowledged, new Date(now)),
      },
    }
  }, [acknowledged, engine.announcing, now, queue])

  // ألوانُ النصّ في السمة لا خارجها: كانت `text-white` مثبَّتةً على الجذر
  // والعنوان واسم الطالب، بينما الوضعُ الفاتح خلفيّتُه شبه بيضاء — فمن اختاره
  // (وهو خيارٌ معروضٌ في اللوحة) وجد صفحةً بيضاء لا نصَّ فيها البتّة.
  const theme = settings?.displayTheme === 'light' ? LIGHT_THEME : DARK_THEME

  const title = customTitle ?? 'النداء الآلي للطلاب'

  return (
    <main
      className={clsx(
        'min-h-screen w-full bg-gradient-to-br font-[\'Cairo\'] transition-colors duration-700',
        theme.background,
        theme.text,
      )}
    >
      <div className="flex min-h-screen w-full flex-col px-6 py-8 md:px-12">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <p className={clsx('text-xs font-semibold uppercase tracking-[0.35em]', theme.muted)}>مركز النداء</p>
            <h1 className={clsx('text-4xl font-black tracking-tight md:text-5xl', theme.heading)}>{title}</h1>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium md:text-sm">
              <Chip theme={theme} icon={<Clock3 className="h-4 w-4" />}>
                {SCREEN_CLOCK.format(now)}
              </Chip>

              {/*
                وضعُ المحرّك معروضٌ لا مخفيّ: الفرق بين «الشاشة تنادي وحدها»
                و«تنتظر موظّفاً يضغط» هو الفرق بين خدمةٍ تعمل وأخرى تبدو أنها
                تعمل — ومن يقف أمامها يجب أن يعرف أيَّهما أمامه.
              */}
              <Chip
                theme={theme}
                tone={engine.mode === 'auto' ? 'good' : engine.mode === 'manual' ? 'warn' : 'plain'}
                icon={<Megaphone className="h-4 w-4" />}
              >
                {engine.mode === 'auto'
                  ? 'النداء التلقائي يعمل'
                  : engine.mode === 'manual'
                    ? 'النداء يدوي'
                    : 'الخدمة متوقفة الآن'}
              </Chip>

              <Chip
                theme={theme}
                tone={settings?.enableSpeech === false ? 'plain' : audio.isAudioReady ? 'plain' : 'bad'}
                icon={settings?.enableSpeech === false ? <VolumeX className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />}
              >
                {settings?.enableSpeech === false
                  ? 'النطق متوقف (عرض فقط)'
                  : audio.isAudioReady
                    ? engine.isSpeaking
                      ? 'يتحدث الآن…'
                      : 'النطق جاهز'
                    : 'الصوت بانتظار التفعيل'}
              </Chip>

              {connection === 'error' ? (
                <Chip theme={theme} tone="bad" icon={<WifiOff className="h-4 w-4" />}>
                  {connectionMessage ?? 'انقطع الاتصال بالخادم'}
                </Chip>
              ) : connection === 'live' ? (
                <Chip theme={theme} icon={<Radio className="h-4 w-4" />}>
                  متصل لحظياً
                </Chip>
              ) : (
                <Chip theme={theme} tone="warn" icon={<RefreshCcw className="h-4 w-4" />}>
                  تحديث دوري
                </Chip>
              )}

              <Chip theme={theme} icon={<AlarmClock className="h-4 w-4" />}>
                {settings?.enabled === false ? 'النظام متوقف حالياً' : subtitle}
              </Chip>
            </div>
          </header>

          <section className="grid w-full grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="في الطابور" value={stats.queueSize} icon={<Users />} theme={theme} caption="الطلبات النشطة" />
            <StatCard title="قيد النداء" value={stats.announcingCount} icon={<Megaphone />} theme={theme} caption="يُنادى عليه الآن" />
            <StatCard title="بانتظار النداء" value={stats.pendingCount} icon={<TimerReset />} theme={theme} caption="سيُنادى عليهم تباعاً" />
            <StatCard title="تم الاستلام اليوم" value={stats.acknowledgedToday} icon={<CheckCircle2 />} theme={theme} caption="الطلبات المكتملة" />
          </section>

          <section className="w-full">
            <ActiveCallCard
              activeCall={activeCall}
              secondsRemaining={engine.secondsRemaining}
              theme={theme}
              loading={isLoading}
              lastSpokenText={engine.lastSpokenText}
              now={now}
            />
          </section>

          {/*
            أزرارُ الاحتياط: الشاشةُ تعمل وحدها في الوضع التلقائيّ، لكنّ من يقف
            عندها يحتاج أحياناً أن يعيد النداء لأبٍ لم يسمع، أو أن ينادي التالي
            بنفسه حين تكون المدرسة قد اختارت الوضع اليدويّ — وبلا هذه الأزرار لا
            يكون للوضع اليدويّ سبيلٌ من الشاشة أصلاً.
          */}
          <section className="flex w-full flex-wrap items-center justify-center gap-3">
            <ActionButton
              theme={theme}
              onClick={() => (activeCall ? engine.speakNow(activeCall) : undefined)}
              disabled={!activeCall || !audio.isAudioReady || settings?.enableSpeech === false}
              icon={<Volume2 className="h-4 w-4" />}
            >
              أعد النداء
            </ActionButton>

            <ActionButton
              theme={theme}
              onClick={() => void engine.triggerNext()}
              disabled={stats.pendingCount === 0 || settings?.enabled === false}
              icon={<Megaphone className="h-4 w-4" />}
            >
              نادِ التالي
            </ActionButton>

            <ActionButton theme={theme} onClick={onRefresh} icon={<RefreshCcw className="h-4 w-4" />}>
              تحديث
            </ActionButton>
          </section>

          <section className="grid w-full flex-1 gap-6 pb-10 lg:grid-cols-2">
            <UpcomingCallsCard upcoming={upcomingCalls} theme={theme} loading={isLoading} now={now} />
            <RecentAcknowledgements acknowledged={acknowledged} theme={theme} loading={isLoading} now={now} />
          </section>
        </div>
      </div>

      {needsAudioUnlock ? (
        <AudioUnlockOverlay onUnlock={audio.unlock} isUnlocking={audio.isUnlocking} error={audio.error} />
      ) : null}
    </main>
  )
}

// ═══════════════════════ السمة ═══════════════════════

interface DisplayThemePalette {
  background: string
  card: string
  accent: string
  muted: string
  gridBorder: string
  text: string
  heading: string
  chip: string
  chipGood: string
  chipWarn: string
  chipBad: string
}

const DARK_THEME: DisplayThemePalette = {
  background: 'from-slate-950 via-slate-900 to-slate-950',
  card: 'bg-slate-900/70 border-slate-700',
  accent: 'bg-indigo-500/20 text-indigo-100',
  muted: 'text-slate-400',
  gridBorder: 'border-slate-700/60',
  text: 'text-slate-100',
  heading: 'text-white',
  chip: 'bg-white/10 text-slate-100',
  chipGood: 'bg-emerald-500/20 text-emerald-100',
  chipWarn: 'bg-amber-500/20 text-amber-100',
  chipBad: 'bg-rose-500/25 text-rose-50',
}

const LIGHT_THEME: DisplayThemePalette = {
  background: 'from-slate-100 via-white to-slate-100',
  card: 'bg-white/85 border-slate-200',
  accent: 'bg-indigo-100 text-indigo-700',
  muted: 'text-slate-500',
  gridBorder: 'border-slate-200/60',
  text: 'text-slate-800',
  heading: 'text-slate-900',
  chip: 'bg-slate-900/5 text-slate-700',
  chipGood: 'bg-emerald-100 text-emerald-800',
  chipWarn: 'bg-amber-100 text-amber-800',
  chipBad: 'bg-rose-100 text-rose-800',
}

function Chip({
  theme,
  icon,
  children,
  tone = 'plain',
}: {
  theme: DisplayThemePalette
  icon: ReactNode
  children: ReactNode
  tone?: 'plain' | 'good' | 'warn' | 'bad'
}) {
  const toneClass =
    tone === 'good' ? theme.chipGood : tone === 'warn' ? theme.chipWarn : tone === 'bad' ? theme.chipBad : theme.chip

  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-1.5', toneClass)}>
      {icon}
      {children}
    </span>
  )
}

function ActionButton({
  theme,
  onClick,
  disabled,
  icon,
  children,
}: {
  theme: DisplayThemePalette
  onClick: () => void
  disabled?: boolean
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40',
        theme.chip,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

// ═══════════════════════ البطاقات ═══════════════════════

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
        <div className={clsx('grid h-10 w-10 place-items-center rounded-full', theme.accent)}>
          <span className="[&>svg]:h-6 [&>svg]:w-6">{icon}</span>
        </div>
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
  lastSpokenText: string | null
  now: number
}

function ActiveCallCard({ activeCall, secondsRemaining, theme, loading, lastSpokenText, now }: ActiveCallCardProps) {
  if (loading && !activeCall) {
    return (
      <article className={clsx('flex h-full items-center justify-center rounded-[36px] border p-12 text-center shadow-2xl', theme.card)}>
        <Loader2 className="h-10 w-10 animate-spin" />
      </article>
    )
  }

  if (!activeCall) {
    return (
      <article
        className={clsx(
          'flex min-h-[32vh] flex-col items-center justify-center gap-4 rounded-[36px] border p-12 text-center shadow-2xl',
          theme.card,
        )}
      >
        <Megaphone className="h-16 w-16 opacity-80" />
        <h2 className="text-3xl font-semibold">لا توجد مناداة حالياً</h2>
        <p className={clsx('max-w-md text-sm', theme.muted)}>سيظهر هنا اسم الطالب فور وصول طلب من ولي أمره.</p>
      </article>
    )
  }

  const isAnnouncing = activeCall.status === 'announcing'

  return (
    <article
      className={clsx(
        'mx-auto flex w-full flex-col items-center rounded-[40px] border px-8 py-10 text-center shadow-2xl shadow-black/30 backdrop-blur-md',
        theme.card,
      )}
    >
      <p className={clsx('text-xs font-semibold uppercase tracking-[0.45em]', theme.muted)}>
        {isAnnouncing ? 'جاري النداء' : 'بانتظار النداء'}
      </p>

      {/*
        الاسمُ هو الشاشة كلُّها: يُقرأ من آخر الفناء لا من مكتب. و`break-words`
        مع سطرين حدّاً أقصى يمنعان الاسمَ الرباعيَّ الطويل من دفع العدّاد
        والقوائم تحت الطيّة — على شاشةٍ لا فأرةَ لها ولا من يمرّرها.
      */}
      <h2
        className={clsx(
          'mt-4 line-clamp-2 break-words text-5xl font-black leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl',
          theme.heading,
        )}
      >
        {activeCall.studentName || '—'}
      </h2>

      {/* الصفُّ دائمُ الظهور وبارز: هو المميِّزُ الوحيد بين متشابهي الأسماء. */}
      <p className="mt-3 text-2xl font-bold text-indigo-400">{activeCall.classLabel ?? '—'}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/*
          لا رقمَ هويّةٍ ولا رقمَ جوّالٍ هنا.
          كانت الشاشة تعرض «رقم الطلب: {الهويّة الوطنيّة للطالب}» وشريحةَ هاتفِ
          وليّ الأمر كاملاً — على جهازٍ معلّقٍ عند مدخلٍ عامّ يقف أمامه عشراتٌ
          ويصوّره من شاء. نشرُ هويّةِ قاصرٍ وهاتفِ وليّه لا يخدم غرضَ الشاشة في
          شيء: الغرضُ أن يعرف الطالبُ أنّ اسمه نودي.
        */}
        <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold', theme.accent)}>
          <Clock3 className="h-4 w-4" />
          وقت الطلب: {formatRelative(activeCall.createdAt, now)}
        </span>

        {activeCall.announcedCount > 0 ? (
          <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold', theme.accent)}>
            <Megaphone className="h-4 w-4" />
            نودي {activeCall.announcedCount} {activeCall.announcedCount === 1 ? 'مرة' : 'مرات'}
          </span>
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-center">
        <div className={clsx('grid h-28 w-28 place-items-center rounded-full border-2 text-3xl font-black', theme.accent)}>
          {formatCountdown(secondsRemaining)}
        </div>
      </div>

      <p className={clsx('mt-3 text-xs', theme.muted)}>
        {isAnnouncing ? 'الوقت المتبقي قبل الانتقال إلى التالي' : 'بانتظار بدء النداء'}
      </p>

      {lastSpokenText ? (
        <p className={clsx('mt-3 text-[11px]', theme.muted)}>آخر ما نُطق: «{lastSpokenText}»</p>
      ) : null}
    </article>
  )
}

interface UpcomingCallsCardProps {
  upcoming: AutoCallQueueEntry[]
  theme: DisplayThemePalette
  loading: boolean
  now: number
}

function UpcomingCallsCard({ upcoming, theme, loading, now }: UpcomingCallsCardProps) {
  return (
    <article className={clsx('flex h-full flex-col gap-4 rounded-3xl border p-6', theme.card)}>
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">القادمون</h3>
        <span className={clsx('text-xs font-semibold uppercase tracking-[0.35em]', theme.muted)}>الطابور</span>
      </header>

      <div className={clsx('flex-1 space-y-3', loading ? 'opacity-75' : 'opacity-100')}>
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
                <p className="break-words text-base font-semibold">{entry.studentName}</p>
                <p className={clsx('text-xs', theme.muted)}>{entry.classLabel ?? '—'}</p>
                <p className={clsx('text-[11px]', theme.muted)}>{formatRelative(entry.createdAt, now)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

interface RecentAcknowledgementsProps {
  acknowledged: AcknowledgedRow[]
  theme: DisplayThemePalette
  loading: boolean
  now: number
}

function RecentAcknowledgements({ acknowledged, theme, loading, now }: RecentAcknowledgementsProps) {
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
          <p className={clsx('text-sm', theme.muted)}>لم يُسجَّل استلام بعد اليوم.</p>
        ) : (
          <ul className="space-y-2">
            {acknowledged.map((entry) => (
              <li
                key={entry.id}
                className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-3 py-2', theme.gridBorder)}
              >
                <div className="text-right">
                  <p className="break-words text-sm font-semibold">{entry.studentName}</p>
                  <p className={clsx('text-xs', theme.muted)}>{entry.classLabel ?? '—'}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-emerald-500">
                  {formatRelative(entry.resolvedAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

interface AudioUnlockOverlayProps {
  onUnlock: () => void
  isUnlocking: boolean
  error: string | null
}

/**
 * لمسةٌ واحدةٌ تفتح الصوت.
 *
 * ليست تحذيراً مهذّباً: المتصفّحات تمنع النطق في صفحةٍ لم يلمسها أحد، وشاشةُ
 * البوّابة لا يلمسها أحدٌ بطبيعتها. فكان النظامُ يعمل كاملاً — الطلبُ يصل،
 * والاسمُ يظهر، والعدّادُ يدور — ولا صوت، ولا شيء يقول لمن فتح الشاشة صباحاً
 * إنّ عليه أن ينقر.
 */
function AudioUnlockOverlay({ onUnlock, isUnlocking, error }: AudioUnlockOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900/90 p-10 text-center shadow-2xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-indigo-500/20 text-indigo-100">
          <Volume2 className="h-10 w-10" />
        </div>

        <h2 className="mt-6 text-3xl font-black text-white">تفعيل صوت النداء</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          المتصفح يمنع تشغيل الصوت تلقائياً قبل أول لمسة. اضغط الزر مرة واحدة عند بداية اليوم الدراسي، ثم اترك
          الشاشة تعمل وحدها.
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-100">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={onUnlock}
          disabled={isUnlocking}
          className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-500 px-6 py-4 text-lg font-bold text-white transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {isUnlocking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
          {isUnlocking ? 'جارٍ التفعيل…' : 'تشغيل الشاشة'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════ أدوات ═══════════════════════

/**
 * ساعةُ الشاشة: منسّقٌ واحدٌ يُبنى مرّةً، بتوقيت المدرسة.
 *
 * بناؤه داخل الرسم كان يعني كائنَ `Intl` جديداً كلَّ ثانيةٍ طَوال يومٍ دراسيّ
 * على جهازٍ ضعيف. و`timeZone` صريحةٌ لأن الخادم يحكم بـ`Asia/Riyadh`، وصندوقُ
 * العرض قد يكون مضبوطاً على غيرها فيعرض ساعةً تخالف نافذةَ الخدمة المعلنة.
 */
const SCREEN_CLOCK = new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Asia/Riyadh',
})

const RELATIVE_TIME = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return remainingSeconds.toString().padStart(2, '0')
}

/** «منذ كذا» مقيسةً بساعة الخادم — انظر `clockSkewMs`. */
function formatRelative(value: string | null | undefined, now: number) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMinutes = Math.round((now - date.getTime()) / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_TIME.format(-diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_TIME.format(-diffHours, 'hour')
  }

  return RELATIVE_TIME.format(-Math.round(diffHours / 24), 'day')
}

function countAcknowledgedToday(entries: AcknowledgedRow[], now: Date) {
  return entries.filter((entry) => {
    if (!entry.resolvedAt) return false

    const date = new Date(entry.resolvedAt)
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }).length
}

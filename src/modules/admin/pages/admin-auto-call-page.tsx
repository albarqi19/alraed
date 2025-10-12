import { useEffect, useMemo, useState, type ReactNode } from 'react'
import clsx from 'classnames'
import {
  AlarmClock,
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
  Megaphone,
  MonitorPlay,
  Pause,
  RefreshCcw,
  Settings2,
  ShieldAlert,
  Timer,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useAutoCall, type AutoCallGuardianStatus, type AutoCallQueueEntry, type AutoCallSettings } from '@/modules/auto-call'
import { useToast } from '@/shared/feedback/use-toast'

type AdminAutoCallTab = 'queue' | 'settings' | 'history' | 'guardians'

const VOICE_OPTIONS = [
  { value: 'auto', label: 'تلقائي' },
  { value: 'male', label: 'صوت رجل' },
  { value: 'female', label: 'صوت امرأة' },
]

type HighlightTone = 'success' | 'warning' | 'info'

const HIGHLIGHT_TONES: Record<HighlightTone, { container: string; icon: string; accent: string }> = {
  success: {
    container: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    icon: 'text-emerald-500',
    accent: 'text-emerald-700',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50/70 text-amber-900',
    icon: 'text-amber-500',
    accent: 'text-amber-700',
  },
  info: {
    container: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'text-slate-500',
    accent: 'text-slate-600',
  },
}

interface SettingsDraft {
  enabled: boolean
  repeatIntervalSeconds: number
  announcementDurationSeconds: number
  openFrom: string | null
  openUntil: string | null
  enableSpeech: boolean
  voiceGender: AutoCallSettings['voiceGender']
  allowGuardianAcknowledgement: boolean
  maxStrikesBeforeBlock: number
  blockDurationMinutes: number
  displayTheme: AutoCallSettings['displayTheme']
  geofence: {
    latitude: string
    longitude: string
    radiusMeters: string
  } | null
}

function createDraftFromSettings(settings: AutoCallSettings | null): SettingsDraft {
  return {
    enabled: settings?.enabled ?? false,
    repeatIntervalSeconds: settings?.repeatIntervalSeconds ?? 120,
    announcementDurationSeconds: settings?.announcementDurationSeconds ?? 45,
    openFrom: settings?.openFrom ?? null,
    openUntil: settings?.openUntil ?? null,
    enableSpeech: settings?.enableSpeech ?? true,
    voiceGender: settings?.voiceGender ?? 'auto',
    allowGuardianAcknowledgement: settings?.allowGuardianAcknowledgement ?? true,
    maxStrikesBeforeBlock: settings?.maxStrikesBeforeBlock ?? 3,
    blockDurationMinutes: settings?.blockDurationMinutes ?? 1440,
    displayTheme: settings?.displayTheme ?? 'dark',
    geofence: settings?.geofence
      ? {
          latitude: settings.geofence.latitude.toString(),
          longitude: settings.geofence.longitude.toString(),
          radiusMeters: settings.geofence.radiusMeters.toString(),
        }
      : null,
  }
}

function analyzeGeofenceSetting(settings: AutoCallSettings | null) {
  if (!settings?.geofence) {
    return {
      ok: false,
      message: 'لم يتم ضبط إحداثيات المدرسة بعد. أدخل خط العرض، خط الطول ونطاق التغطية لتفعيل التحقق الجغرافي.',
    }
  }

  const { latitude, longitude, radiusMeters } = settings.geofence

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      ok: false,
      message: 'الإحداثيات الحالية غير رقمية. يرجى التحقق من القيم المدخلة.',
    }
  }

  if (latitude === 0 && longitude === 0) {
    return {
      ok: false,
      message: 'الإحداثيات الحالية تساوي (0,0) ولا تمثل موقع المدرسة. قم بإدخال الموقع الصحيح.',
    }
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return {
      ok: false,
      message: 'نطاق التغطية يجب أن يكون رقماً أكبر من الصفر حتى يتم قبول الإحداثيات.',
    }
  }

  return {
    ok: true,
    message: `الإحداثيات مضبوطة عند (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) بنطاق ${Math.round(radiusMeters)} م.`,
  }
}

export function AdminAutoCallPage() {
  const toast = useToast()
  const {
    schoolId,
    settings,
    queue,
    history,
    guardianStatuses,
    loading,
    updateSettings,
    updateCallStatus,
    acknowledgeCall,
    recordGuardianStrike,
    blockGuardian,
    unblockGuardian,
  } = useAutoCall()

  const [activeTab, setActiveTab] = useState<AdminAutoCallTab>('queue')
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() => createDraftFromSettings(settings))

  useEffect(() => {
    setSettingsDraft(createDraftFromSettings(settings))
  }, [settings])

  const sortedQueue = useMemo(() => {
    return [...queue].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [queue])

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime())
  }, [history])

  const stats = useMemo(() => {
    const now = new Date()
    let announcing = 0
    let pending = 0
    let totalWaitMs = 0
    let waitSamples = 0

    for (const call of queue) {
      if (call.status === 'announcing') {
        announcing += 1
      }
      if (call.status === 'pending') {
        pending += 1
      }
      if (call.status === 'pending' || call.status === 'announcing') {
        const createdAt = safeParseDate(call.createdAt)
        if (createdAt) {
          totalWaitMs += now.getTime() - createdAt.getTime()
          waitSamples += 1
        }
      }
    }

    let acknowledgedToday = 0
    for (const entry of history) {
      if (entry.status !== 'acknowledged') continue
      const resolvedAt = safeParseDate(entry.resolvedAt ?? entry.acknowledgedAt ?? entry.createdAt)
      if (!resolvedAt) continue
      if (isSameDay(resolvedAt, now)) {
        acknowledgedToday += 1
      }
    }

    let blockedGuardians = 0
    guardianStatuses.forEach((status) => {
      if (!status.blockedUntil) return
      const blockedUntil = safeParseDate(status.blockedUntil)
      if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
        blockedGuardians += 1
      }
    })

    const averageWaitMinutes = waitSamples > 0 ? Math.max(0, Math.round(totalWaitMs / waitSamples / 60000)) : 0

    return {
      announcing,
      pending,
      acknowledgedToday,
      blockedGuardians,
      averageWaitMinutes,
    }
  }, [guardianStatuses, history, queue])

  const geofenceStatus = useMemo(() => analyzeGeofenceSetting(settings), [settings])
  const configurationHighlights = useMemo(() => {
    if (!settings) {
      return [
        {
          key: 'speech-loading',
          tone: 'info' as HighlightTone,
          title: 'جاري تحميل إعدادات النداء الصوتي',
          description: 'انتظر لحظات للتأكد من حالة النطق الآلي.',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
        },
        {
          key: 'geofence-loading',
          tone: 'info' as HighlightTone,
          title: 'جاري التحقق من إحداثيات المدرسة',
          description: 'سيتم عرض الحالة بمجرد تحميل الإعدادات.',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
        },
      ]
    }

    const speechEnabled = settings.enableSpeech === true
    const voiceHighlight = speechEnabled
      ? {
          key: 'speech-enabled',
          tone: 'success' as HighlightTone,
          title: 'النداء الصوتي مفعل',
          description: 'سيتم تشغيل نداء صوتي داخل المدرسة بالتزامن مع عرض الاسم على الشاشة.',
          icon: <Volume2 className="h-4 w-4" />,
        }
      : {
          key: 'speech-disabled',
          tone: 'warning' as HighlightTone,
          title: 'تفعيل النداء الصوتي',
          description: 'قم بتفعيل خيار النطق الآلي ليتم تشغيل النداء الصوتي مع كل مناداة.',
          icon: <VolumeX className="h-4 w-4" />,
        }

    const geofenceHighlight = geofenceStatus.ok
      ? {
          key: 'geofence-ready',
          tone: 'success' as HighlightTone,
          title: 'إحداثيات المدرسة مكتملة',
          description: geofenceStatus.message,
          icon: <MapPin className="h-4 w-4" />,
        }
      : {
          key: 'geofence-missing',
          tone: 'warning' as HighlightTone,
          title: 'إكمال إعداد موقع المدرسة',
          description: geofenceStatus.message,
          icon: <AlertTriangle className="h-4 w-4" />,
        }

    return [voiceHighlight, geofenceHighlight]
  }, [geofenceStatus, settings])

  function handleDraftChange<Field extends keyof SettingsDraft>(field: Field, value: SettingsDraft[Field]) {
    setSettingsDraft((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handleGeofenceChange(field: keyof NonNullable<SettingsDraft['geofence']>, value: string) {
    setSettingsDraft((prev) => ({
      ...prev,
      geofence: {
        latitude: prev.geofence?.latitude ?? '',
        longitude: prev.geofence?.longitude ?? '',
        radiusMeters: prev.geofence?.radiusMeters ?? '',
        ...prev.geofence,
        [field]: value,
      },
    }))
  }

  async function submitSettings() {
    setIsSavingSettings(true)
    try {
      const payload: Partial<AutoCallSettings> = {
        enabled: settingsDraft.enabled,
        repeatIntervalSeconds: Number.isFinite(settingsDraft.repeatIntervalSeconds)
          ? settingsDraft.repeatIntervalSeconds
          : 120,
        announcementDurationSeconds: Number.isFinite(settingsDraft.announcementDurationSeconds)
          ? settingsDraft.announcementDurationSeconds
          : 45,
        openFrom: settingsDraft.openFrom || null,
        openUntil: settingsDraft.openUntil || null,
        enableSpeech: settingsDraft.enableSpeech,
        voiceGender: settingsDraft.voiceGender,
        allowGuardianAcknowledgement: settingsDraft.allowGuardianAcknowledgement,
        maxStrikesBeforeBlock: Number.isFinite(settingsDraft.maxStrikesBeforeBlock)
          ? settingsDraft.maxStrikesBeforeBlock
          : 3,
        blockDurationMinutes: Number.isFinite(settingsDraft.blockDurationMinutes)
          ? settingsDraft.blockDurationMinutes
          : 1440,
        displayTheme: settingsDraft.displayTheme,
      }

      if (settingsDraft.geofence) {
        const lat = Number(settingsDraft.geofence.latitude)
        const lng = Number(settingsDraft.geofence.longitude)
        const radius = Number(settingsDraft.geofence.radiusMeters)
        payload.geofence =
          Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radius)
            ? { latitude: lat, longitude: lng, radiusMeters: radius }
            : null
      } else {
        payload.geofence = null
      }

      await updateSettings(payload)
      toast({ type: 'success', title: 'تم حفظ إعدادات النداء الآلي' })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر حفظ الإعدادات' })
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function handleAcknowledge(call: AutoCallQueueEntry, by: 'admin' | 'guardian') {
    try {
      await acknowledgeCall(call.id, by)
      toast({ type: 'success', title: `تم تأكيد استلام ${call.studentName}` })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر تأكيد الاستلام' })
    }
  }

  async function handleStatusUpdate(call: AutoCallQueueEntry, status: AutoCallQueueEntry['status']) {
    try {
      await updateCallStatus(call.id, { status })
      toast({ type: 'info', title: `تم تحديث حالة ${call.studentName}` })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر تحديث الحالة' })
    }
  }

  async function handleGuardianStrike(status: AutoCallGuardianStatus, reason: string) {
    try {
      await recordGuardianStrike(status.guardianNationalId, reason)
      toast({ type: 'warning', title: 'تم تسجيل مخالفة على حساب ولي الأمر' })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر تسجيل المخالفة' })
    }
  }

  async function handleBlockGuardian(status: AutoCallGuardianStatus, minutes: number) {
    const until = new Date(Date.now() + minutes * 60 * 1000)
    try {
      await blockGuardian(status.guardianNationalId, until)
      toast({ type: 'warning', title: 'تم إيقاف الخدمة لولي الأمر مؤقتاً' })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر تنفيذ الإيقاف' })
    }
  }

  async function handleUnblockGuardian(status: AutoCallGuardianStatus) {
    try {
      await unblockGuardian(status.guardianNationalId)
      toast({ type: 'success', title: 'تم إعادة تفعيل الخدمة لولي الأمر' })
    } catch (error) {
      toast({ type: 'error', title: error instanceof Error ? error.message : 'تعذر إعادة التفعيل' })
    }
  }

  function renderTabNav() {
  const tabs: { id: AdminAutoCallTab; label: string; icon: ReactNode }[] = [
      { id: 'queue', label: 'طابور النداءات', icon: <Megaphone className="h-4 w-4" /> },
      { id: 'settings', label: 'الإعدادات', icon: <Settings2 className="h-4 w-4" /> },
      { id: 'history', label: 'السجل', icon: <RefreshCcw className="h-4 w-4" /> },
      { id: 'guardians', label: 'حسابات أولياء الأمور', icon: <Users className="h-4 w-4" /> },
    ]

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    )
  }

  function renderSummaryCards() {
    const cards = [
      {
        id: 'announcing',
        label: 'نداءات قيد التشغيل',
        value: stats.announcing,
        icon: <Megaphone className="h-5 w-5" />,
        tone: 'bg-indigo-100 text-indigo-700 ring-indigo-200/70',
        helper:
          stats.announcing > 0
            ? 'تأكد من مراقبة الشاشة العامة للتذكير المتكرر.'
            : 'لا توجد نداءات قيد التشغيل حالياً.',
      },
      {
        id: 'pending',
        label: 'بانتظار النداء',
        value: stats.pending,
        icon: <Timer className="h-5 w-5" />,
        tone: 'bg-amber-100 text-amber-700 ring-amber-200/70',
        helper:
          stats.pending > 0
            ? stats.averageWaitMinutes <= 1
              ? 'متوسط الانتظار أقل من دقيقة.'
              : `متوسط الانتظار ${stats.averageWaitMinutes} دقيقة.`
            : 'تمت معالجة جميع الطلبات فوراً.',
      },
      {
        id: 'acknowledged',
        label: 'تم الاستلام اليوم',
        value: stats.acknowledgedToday,
        icon: <TrendingUp className="h-5 w-5" />,
        tone: 'bg-emerald-100 text-emerald-700 ring-emerald-200/70',
        helper:
          stats.acknowledgedToday > 0
            ? 'يبدو أن أولياء الأمور متجاوبون اليوم.'
            : 'لم يتم تسجيل تأكيدات خلال هذا اليوم بعد.',
      },
      {
        id: 'blocked',
        label: 'أولياء محظورون',
        value: stats.blockedGuardians,
        icon: <ShieldAlert className="h-5 w-5" />,
        tone: 'bg-rose-100 text-rose-700 ring-rose-200/70',
        helper:
          stats.blockedGuardians > 0
            ? 'راجع المخالفات وتواصل مع أولياء الأمور إذا لزم.'
            : 'لا توجد حالات إيقاف حالياً.',
      },
    ]

    return (
      <section className="grid gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm ring-1 ring-inset ring-transparent backdrop-blur-md"
          >
            <header className="flex items-center justify-between gap-3">
              <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full', card.tone)}>{card.icon}</div>
              <span className="text-2xl font-bold text-slate-900">{card.value}</span>
            </header>
            <footer className="space-y-1 text-right">
              <h3 className="text-sm font-semibold text-slate-700">{card.label}</h3>
              <p className="text-xs text-muted">{card.helper}</p>
            </footer>
          </article>
        ))}
      </section>
    )
  }

  function renderQueue() {
    if (loading.queue) {
      return (
        <div className="flex items-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جاري تحميل النداءات الحالية...</span>
        </div>
      )
    }

    if (!sortedQueue.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
          لا توجد نداءات جارية في الوقت الحالي.
        </div>
      )
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {sortedQueue.map((call) => (
          <article key={call.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex items-center justify-between gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500">الطالب</p>
                <h3 className="text-lg font-bold text-slate-900">{call.studentName}</h3>
                {call.classLabel ? <p className="text-xs text-muted">{call.classLabel}</p> : null}
              </div>
              <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', getStatusTone(call.status))}>
                {getStatusLabel(call.status)}
              </span>
            </header>

            <div className="grid gap-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-500">وقت الطلب:</span> {formatDate(call.createdAt)}
              </p>
              {call.announcedCount ? (
                <p>
                  <span className="font-semibold text-slate-500">عدد مرات النداء:</span> {call.announcedCount}
                </p>
              ) : null}
              {call.lastAnnouncedAt ? (
                <p>
                  <span className="font-semibold text-slate-500">آخر نداء:</span> {formatDate(call.lastAnnouncedAt)}
                </p>
              ) : null}
              {call.guardianPhone ? (
                <p>
                  <span className="font-semibold text-slate-500">هاتف ولي الأمر:</span> {call.guardianPhone}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleStatusUpdate(call, 'announcing')}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
              >
                <Megaphone className="h-3.5 w-3.5" />
                بدء النداء الآن
              </button>
              <button
                type="button"
                onClick={() => handleAcknowledge(call, 'admin')}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                <Check className="h-3.5 w-3.5" />
                تم الاستلام
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate(call, 'expired')}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
              >
                <Pause className="h-3.5 w-3.5" />
                انتهى الوقت
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  function renderHistory() {
    if (loading.history) {
      return (
        <div className="flex items-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جاري تحميل السجل...</span>
        </div>
      )
    }

    if (!sortedHistory.length) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
          لا توجد سجلات محفوظة حالياً.
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-right text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">الطالب</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">وقت البدء</th>
              <th className="px-4 py-3 font-semibold">وقت الإنهاء</th>
              <th className="px-4 py-3 font-semibold">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sortedHistory.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{entry.studentName}</div>
                  {entry.classLabel ? <div className="text-[11px] text-muted">{entry.classLabel}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', getStatusTone(entry.status))}>
                    {getStatusLabel(entry.status)}
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(entry.createdAt)}</td>
                <td className="px-4 py-3">{entry.resolvedAt ? formatDate(entry.resolvedAt) : '—'}</td>
                <td className="px-4 py-3 text-slate-500">{entry.resolutionNotes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderGuardians() {
    if (loading.guardians) {
      return (
        <div className="flex items-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جاري تحميل حالة أولياء الأمور...</span>
        </div>
      )
    }

    if (!guardianStatuses.size) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
          لا توجد مخالفات أو حالات حظر مسجلة.
        </div>
      )
    }

    const entries = [...guardianStatuses.values()].sort((a, b) => (b.strikeCount ?? 0) - (a.strikeCount ?? 0))

    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-right text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">رقم الهوية</th>
              <th className="px-4 py-3 font-semibold">عدد المخالفات</th>
              <th className="px-4 py-3 font-semibold">آخر مخالفة</th>
              <th className="px-4 py-3 font-semibold">حالة الحظر</th>
              <th className="px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {entries.map((status) => {
              const blockedUntil = status.blockedUntil ? new Date(status.blockedUntil) : null
              const isCurrentlyBlocked = blockedUntil ? blockedUntil.getTime() > Date.now() : false
              return (
                <tr key={status.guardianNationalId}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{status.guardianNationalId}</td>
                  <td className="px-4 py-3">{status.strikeCount}</td>
                  <td className="px-4 py-3">{status.lastViolationAt ? formatDate(status.lastViolationAt) : '—'}</td>
                  <td className="px-4 py-3">
                    {blockedUntil ? (
                      <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', isCurrentlyBlocked ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>
                        {isCurrentlyBlocked ? `محظور حتى ${formatDate(blockedUntil.toISOString())}` : 'غير محظور'}
                      </span>
                    ) : (
                      'غير محظور'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleGuardianStrike(status, 'عدم تأكيد استلام الطالب في الوقت المحدد')}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-100"
                      >
                        <AlertCircle className="h-3 w-3" /> مخالفة إضافية
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBlockGuardian(status, settingsDraft.blockDurationMinutes)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                      >
                        <ShieldAlert className="h-3 w-3" /> إيقاف الخدمة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnblockGuardian(status)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100"
                      >
                        إعادة التفعيل
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderSettings() {
    return (
      <form
        className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          submitSettings()
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold text-slate-500">حالة الخدمة</p>
            <h2 className="text-xl font-bold text-slate-900">{settingsDraft.enabled ? 'النظام مفعل' : 'النظام متوقف'}</h2>
            <p className="text-xs text-muted">المدرسة الحالية: {schoolId ?? '—'}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDraftChange('enabled', !settingsDraft.enabled)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
              settingsDraft.enabled ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
            )}
          >
            {settingsDraft.enabled ? <Check className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {settingsDraft.enabled ? 'إيقاف مؤقت' : 'تفعيل الخدمة'}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {configurationHighlights.map((highlight) => {
            const tone = HIGHLIGHT_TONES[highlight.tone]
            return (
              <div
                key={highlight.key}
                className={clsx('flex items-start gap-3 rounded-2xl border p-3 text-sm shadow-sm', tone.container)}
              >
                <span className={clsx('inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/60', tone.icon)}>
                  {highlight.icon}
                </span>
                <div className="space-y-1">
                  <p className={clsx('text-sm font-semibold', tone.accent)}>{highlight.title}</p>
                  <p className="text-xs text-slate-600">{highlight.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl bg-slate-50/60 p-4">
            <h3 className="flex items-center justify-between text-sm font-semibold text-slate-700">
              الإعدادات الزمنية
              <AlarmClock className="h-4 w-4 text-slate-500" />
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">الفاصل بين النداءات (ثانية)</span>
                <input
                  type="number"
                  min={30}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.repeatIntervalSeconds}
                  onChange={(event) => handleDraftChange('repeatIntervalSeconds', Number(event.target.value))}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">مدة عرض النداء (ثانية)</span>
                <input
                  type="number"
                  min={10}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.announcementDurationSeconds}
                  onChange={(event) => handleDraftChange('announcementDurationSeconds', Number(event.target.value))}
                />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">وقت البدء المسموح</span>
                <input
                  type="time"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.openFrom ?? ''}
                  onChange={(event) => handleDraftChange('openFrom', event.target.value || null)}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">وقت الإغلاق</span>
                <input
                  type="time"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.openUntil ?? ''}
                  onChange={(event) => handleDraftChange('openUntil', event.target.value || null)}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-slate-50/60 p-4">
            <h3 className="flex items-center justify-between text-sm font-semibold text-slate-700">
              الصوت والواجهة
              <MonitorPlay className="h-4 w-4 text-slate-500" />
            </h3>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <span>تشغيل النطق الآلي</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={settingsDraft.enableSpeech}
                onChange={(event) => handleDraftChange('enableSpeech', event.target.checked)}
              />
            </label>

            <label className="space-y-1 text-xs text-slate-600">
              <span className="font-semibold">اختيار نوع الصوت</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={settingsDraft.voiceGender}
                onChange={(event) => handleDraftChange('voiceGender', event.target.value as SettingsDraft['voiceGender'])}
              >
                {VOICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-slate-600">
              <span className="font-semibold">نمط شاشة العرض</span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={settingsDraft.displayTheme}
                onChange={(event) => handleDraftChange('displayTheme', event.target.value as SettingsDraft['displayTheme'])}
              >
                <option value="dark">نمط داكن</option>
                <option value="light">نمط فاتح</option>
              </select>
            </label>
          </section>

          <section className="space-y-3 rounded-2xl bg-slate-50/60 p-4">
            <h3 className="flex items-center justify-between text-sm font-semibold text-slate-700">
              التحكم في أولياء الأمور
              <ShieldAlert className="h-4 w-4 text-slate-500" />
            </h3>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <span>السماح بتأكيد الاستلام من ولي الأمر</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={settingsDraft.allowGuardianAcknowledgement}
                onChange={(event) => handleDraftChange('allowGuardianAcknowledgement', event.target.checked)}
              />
            </label>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">عدد المخالفات قبل الحظر</span>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.maxStrikesBeforeBlock}
                  onChange={(event) => handleDraftChange('maxStrikesBeforeBlock', Number(event.target.value))}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">مدة الحظر (دقائق)</span>
                <input
                  type="number"
                  min={30}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.blockDurationMinutes}
                  onChange={(event) => handleDraftChange('blockDurationMinutes', Number(event.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-slate-50/60 p-4">
            <h3 className="flex items-center justify-between text-sm font-semibold text-slate-700">
              نطاق المدرسة (Geofence)
              <MapPin className="h-4 w-4 text-slate-500" />
            </h3>
            <p className="text-xs text-muted">
              يتم إيقاف خيار النداء لولي الأمر إذا كان خارج نطاق المدرسة. اترك الحقول فارغة لتعطيل التحقق الجغرافي.
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">خط العرض Latitude</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.geofence?.latitude ?? ''}
                  onChange={(event) => handleGeofenceChange('latitude', event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">خط الطول Longitude</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.geofence?.longitude ?? ''}
                  onChange={(event) => handleGeofenceChange('longitude', event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-semibold">نصف القطر (متر)</span>
                <input
                  type="number"
                  min={50}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
                  value={settingsDraft.geofence?.radiusMeters ?? ''}
                  onChange={(event) => handleGeofenceChange('radiusMeters', event.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.open(`/display/auto-call${schoolId ? `?school=${schoolId}` : ''}`, '_blank', 'noopener')}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
          >
            <MonitorPlay className="h-4 w-4" />
            فتح شاشة العرض
          </button>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            حفظ التغييرات
          </button>
        </div>
      </form>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 text-right">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600">أدوات المدرسة</p>
          <h1 className="text-3xl font-bold text-slate-900">مركز النداء الآلي</h1>
          <p className="text-sm text-muted">
            إدارة طابور النداءات، ضبط الأوقات والنطق، ومراقبة التزام أولياء الأمور باستلام الطلاب في الوقت المحدد.
          </p>
        </div>
        {renderTabNav()}
      </header>

      {renderSummaryCards()}

      {activeTab === 'queue' ? renderQueue() : null}
      {activeTab === 'settings' ? renderSettings() : null}
      {activeTab === 'history' ? renderHistory() : null}
      {activeTab === 'guardians' ? renderGuardians() : null}
    </section>
  )
}

function getStatusLabel(status: AutoCallQueueEntry['status']) {
  switch (status) {
    case 'pending':
      return 'بانتظار النداء'
    case 'announcing':
      return 'جاري النداء'
    case 'acknowledged':
      return 'تم الاستلام'
    case 'expired':
      return 'انتهى الوقت'
    case 'cancelled':
      return 'ملغي'
    default:
      return status
  }
}

function getStatusTone(status: AutoCallQueueEntry['status']) {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-600'
    case 'announcing':
      return 'bg-indigo-50 text-indigo-600'
    case 'acknowledged':
      return 'bg-emerald-50 text-emerald-600'
    case 'expired':
      return 'bg-rose-50 text-rose-600'
    case 'cancelled':
      return 'bg-slate-100 text-slate-500'
    default:
      return 'bg-slate-100 text-slate-500'
  }
}

function formatDate(value: string) {
  try {
    const date = new Date(value)
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return value
  }
}

function safeParseDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

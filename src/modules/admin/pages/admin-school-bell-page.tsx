import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import clsx from 'classnames'
import {
  AlarmClock,
  AlertCircle,
  ArrowLeftRight,
  Bell,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  DownloadCloud,
  Edit,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Volume2,
  Waves,
} from 'lucide-react'
import type {
  BellAudioAsset,
  BellEvent,
  BellSchedule,
  RuntimeLogEntry,
  ToneProfile,
  Weekday,
} from '@/modules/admin/school-bell/types'
import type { PlaybackOutcome } from '@/modules/admin/school-bell/use-school-bell-engine'
import { useBellManager } from '@/modules/admin/school-bell/context/bell-manager-context'
import {
  DEFAULT_TONE_PROFILES,
  WEEKDAYS,
  applyToneProfileToEvents,
  assignEventSound,
  createId,
  findToneProfile,
  formatClock,
  formatCountdown,
  formatRelative,
  formatTime,
} from '@/modules/admin/school-bell/utils'

const EVENT_CATEGORY_LABEL: Record<BellEvent['category'], string> = {
  lesson_start: 'بداية الحصة',
  lesson_end: 'نهاية الحصة',
  break: 'فسحة/استراحة',
  prayer: 'أذان/صلاة',
  custom: 'حدث مخصص',
}

const RUNTIME_SOURCE_LABEL: Record<RuntimeLogEntry['source'], string> = {
  foreground: 'تشغيل مباشر',
  background: 'تشغيل بالخلفية',
  manual: 'تشغيل يدوي',
}


export function AdminSchoolBellPage() {
  const {
    state,
    updateState,
    toggleWidgetVisibility,
    currentTime,
    runtimeLog,
    upcomingEvent,
    previewSound,
    handleManualTrigger,
    toneProfileMap,
    audioAssetMap,
    readySoundIds,
    isAnyAudioReady,
    lastError,
    activeSchedule,
    activeToneProfile,
  } = useBellManager()

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(() => {
    return state.activeScheduleId ?? state.schedules[0]?.id ?? null
  })
  const [manageScheduleDialogOpen, setManageScheduleDialogOpen] = useState(false)
  const [scheduleFormMode, setScheduleFormMode] = useState<'create' | 'edit'>('create')
  const [scheduleDraft, setScheduleDraft] = useState<BellSchedule | null>(null)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [eventDraft, setEventDraft] = useState<{
    mode: 'create' | 'edit'
    scheduleId: string
    event: BellEvent | null
  } | null>(null)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)

  useEffect(() => {
    if (!selectedScheduleId && state.schedules.length) {
      setSelectedScheduleId(state.schedules[0].id)
    }
  }, [state.schedules, selectedScheduleId])

  const selectedSchedule = useMemo(() => {
    return state.schedules.find((schedule) => schedule.id === (selectedScheduleId ?? state.activeScheduleId)) ?? null
  }, [state.schedules, selectedScheduleId, state.activeScheduleId])

  const selectedToneProfile = useMemo(() => findToneProfile(state.toneProfiles, selectedSchedule?.toneProfileId), [
    state.toneProfiles,
    selectedSchedule?.toneProfileId,
  ])

  const handleSelectSchedule = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId)
  }

  const handleSetActiveSchedule = (scheduleId: string) => {
    updateState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? { ...schedule, isEnabled: true, updatedAt: new Date().toISOString() }
          : { ...schedule, isEnabled: schedule.id === prev.activeScheduleId ? false : schedule.isEnabled },
      ),
      activeScheduleId: scheduleId,
    }))
  }

  const handleToggleSchedule = (scheduleId: string, enabled: boolean) => {
    updateState((prev) => {
      const schedules = prev.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? { ...schedule, isEnabled: enabled, updatedAt: new Date().toISOString() }
          : schedule,
      )
      const activeScheduleId = enabled ? scheduleId : prev.activeScheduleId === scheduleId ? null : prev.activeScheduleId
      return {
        ...prev,
        schedules,
        activeScheduleId,
      }
    })
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    updateState((prev) => {
      const schedules = prev.schedules.filter((schedule) => schedule.id !== scheduleId)
      const activeScheduleId = prev.activeScheduleId === scheduleId ? schedules[0]?.id ?? null : prev.activeScheduleId
      return {
        ...prev,
        schedules,
        activeScheduleId,
      }
    })
    if (selectedScheduleId === scheduleId) {
      setSelectedScheduleId((prev) => (prev === scheduleId ? null : prev))
    }
  }

  const handleAddEvent = (scheduleId: string, event: Omit<BellEvent, 'id' | 'soundId'>) => {
    updateState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? {
              ...schedule,
              events: [
                ...schedule.events,
                assignEventSound(
                  { ...event, id: createId(), soundId: '' },
                  schedule.toneProfileId,
                  prev.toneProfiles,
                  prev.audioAssets,
                ),
              ].sort((a, b) => a.time.localeCompare(b.time)),
              updatedAt: new Date().toISOString(),
            }
          : schedule,
      ),
    }))
  }

  const handleUpdateEvent = (scheduleId: string, updatedEvent: Omit<BellEvent, 'soundId'>) => {
    updateState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? {
              ...schedule,
              events: schedule.events
                .map((event) =>
                  event.id === updatedEvent.id
                    ? assignEventSound(
                        { ...event, ...updatedEvent },
                        schedule.toneProfileId,
                        prev.toneProfiles,
                        prev.audioAssets,
                      )
                    : event,
                )
                .sort((a, b) => a.time.localeCompare(b.time)),
              updatedAt: new Date().toISOString(),
            }
          : schedule,
      ),
    }))
  }

  const handleDeleteEvent = (scheduleId: string, eventId: string) => {
    updateState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((schedule) =>
        schedule.id === scheduleId
          ? {
              ...schedule,
              events: schedule.events.filter((event) => event.id !== eventId),
              updatedAt: new Date().toISOString(),
            }
          : schedule,
      ),
    }))
  }

  const handleUpdateAudioStatus = (assetId: string, status: BellAudioAsset['status']) => {
    updateState((prev) => ({
      ...prev,
      audioAssets: prev.audioAssets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              status,
              lastSyncedAt: new Date().toISOString(),
            }
          : asset,
      ),
    }))
  }

  const handleBackgroundToggle = (value: boolean) => {
    updateState((prev) => ({
      ...prev,
      backgroundExecution: value,
    }))
  }

  const handleDismissInstallReminder = () => {
    updateState((prev) => ({
      ...prev,
      installReminderDismissed: true,
    }))
  }

  const handleScheduleFormSubmit = (payload: ScheduleFormSubmitPayload) => {
    if (scheduleFormMode === 'create') {
      const newScheduleId = createId()
      updateState((prev) => {
        const toneProfileId = payload.toneProfileId ?? prev.toneProfiles[0]?.id ?? DEFAULT_TONE_PROFILES[0]?.id ?? ''
        const clonedEvents = payload.cloneFromScheduleId
          ? prev.schedules
              .find((schedule) => schedule.id === payload.cloneFromScheduleId)?.events.map((event) => ({
                ...event,
                id: createId(),
              })) ?? []
          : []
        const toneProfile = findToneProfile(prev.toneProfiles, toneProfileId)
        const normalizedEvents = applyToneProfileToEvents(clonedEvents, toneProfile, prev.audioAssets)

        const newSchedule: BellSchedule = {
          id: newScheduleId,
          name: payload.name,
          description: payload.description,
          isEnabled: payload.autoActivate,
          allowBackgroundExecution: payload.allowBackground,
          toneProfileId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          events: normalizedEvents,
        }

        return {
          ...prev,
          schedules: [...prev.schedules, newSchedule],
          activeScheduleId: payload.autoActivate ? newSchedule.id : prev.activeScheduleId,
        }
      })
      setSelectedScheduleId(newScheduleId)
    } else if (scheduleDraft) {
      updateState((prev) => {
        const toneProfileId = payload.toneProfileId ?? scheduleDraft.toneProfileId
        const toneProfile = findToneProfile(prev.toneProfiles, toneProfileId)
        const updated: BellSchedule = {
          ...scheduleDraft,
          name: payload.name,
          description: payload.description,
          allowBackgroundExecution: payload.allowBackground,
          isEnabled: payload.autoActivate,
          toneProfileId: toneProfile?.id ?? scheduleDraft.toneProfileId,
          events: applyToneProfileToEvents(scheduleDraft.events, toneProfile, prev.audioAssets),
          updatedAt: new Date().toISOString(),
        }

        return {
          ...prev,
          schedules: prev.schedules.map((schedule) => (schedule.id === updated.id ? updated : schedule)),
          activeScheduleId:
            payload.autoActivate && prev.activeScheduleId !== updated.id ? updated.id : prev.activeScheduleId,
        }
      })
      setSelectedScheduleId(scheduleDraft.id)
    }

    setManageScheduleDialogOpen(false)
    setScheduleDraft(null)
  }

  const nextEventCountdownMs = useMemo(() => {
    if (!upcomingEvent) return null
    return Math.max(upcomingEvent.occurrence.getTime() - currentTime.getTime(), 0)
  }, [upcomingEvent, currentTime])

  const handlePreviewSound = useCallback(
    async (soundId: string, title: string) => {
      if (!soundId) return

      let outcome: PlaybackOutcome = 'failed'
      try {
        outcome = await previewSound(soundId)
      } catch (error) {
        console.error('تعذر تشغيل معاينة الصوت', error)
      }

      if (outcome === 'failed') {
        alert(`تعذر تشغيل النغمة "${title}". تأكد من تحميل الملف أو حالة الاتصال.`)
      } else if (outcome === 'fallback-played') {
        alert(`تم تشغيل نغمة احتياطية بديلة لملف "${title}".`)
      }
    },
    [previewSound],
  )

  const handlePreviewToneProfile = useCallback(
    async (toneProfileId: string) => {
      const profile = toneProfileMap.get(toneProfileId)
      if (!profile) return
      await handlePreviewSound(profile.previewAssetId, profile.name)
    },
    [handlePreviewSound, toneProfileMap],
  )

  return (
    <section className="space-y-6">
      {/* Mobile Warning - Show only on mobile devices */}
      <div className="block lg:hidden">
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-900">يُفضل استخدام الكمبيوتر</h2>
          <p className="mx-auto mb-4 max-w-md text-base leading-relaxed text-slate-700">
            صفحة الجرس المدرسي مُصممة للعمل على الشاشات الكبيرة للحصول على أفضل تجربة في إدارة الجداول والتحكم في الأحداث.
          </p>
          <p className="text-sm font-semibold text-amber-700">
            يُرجى فتح هذه الصفحة من جهاز كمبيوتر للحصول على تجربة مثالية
          </p>
        </div>
      </div>

      {/* Main Content - Hidden on mobile */}
      <div className="hidden lg:block space-y-6">
      <header className="space-y-2 text-right">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">أدوات المدرسة</p>
            <h1 className="text-3xl font-bold text-slate-900">مركز التحكم في الجرس المدرسي</h1>
            <p className="text-sm text-muted">
              قم بإدارة جداول الرنين لكل فترات العام، اختر النغمات المناسبة، واضمن تشغيل الجرس حتى في حال عمل التطبيق بالخلفية.
            </p>
          </div>
          <div className="flex flex-col items-end justify-center rounded-3xl bg-slate-900 px-6 py-4 text-white shadow-lg">
            <span className="text-xs uppercase tracking-[0.35em] text-emerald-300">الوقت الآن</span>
            <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
              <Clock3 className="h-7 w-7 text-emerald-300" />
              <span style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{formatClock(currentTime)}</span>
            </div>
            {upcomingEvent ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-white/80">
                <CalendarClock className="h-4 w-4 text-emerald-300" />
                التالي: {upcomingEvent.event.title} بعد {formatRelative(upcomingEvent.occurrence, currentTime)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-white/70">لا توجد أحداث مجدولة في الساعات القادمة.</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-right shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">الويدجت العائم</p>
          <p className="text-sm text-slate-700">
            {state.showWidget ? 'الويدجت ظاهر لجميع صفحات الإدارة لتسهيل الوصول السريع.' : 'الويدجت مخفي حاليًا ولا يظهر في صفحات الإدارة.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleWidgetVisibility}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
            state.showWidget ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          <Bell className="h-4 w-4" />
          {state.showWidget ? 'إخفاء الويدجت العائم' : 'إظهار الويدجت العائم'}
        </button>
      </div>

      {!state.installReminderDismissed ? (
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-right shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-900">ثبت التطبيق يضمن استمرار الجرس حتى في الخلفية</h2>
            </div>
            <p className="text-xs text-slate-600">
              التطبيق يعمل كتطبيق ويب تقدمي (PWA). ننصح بتثبيته على جهاز الجرس لضمان تشغيل النغمات بدون انقطاع.
            </p>
            <ul className="list-disc space-y-1 pr-5 text-xs text-slate-600">
              <li>تحميل الأصوات محليًا لضمان السرعة وعدم الاعتماد على الاتصال.</li>
              <li>تشغيل الجرس حتى لو تم إغلاق المتصفح (مع تمكين الخدمة الخلفية).</li>
              <li>إرسال تنبيه مرئي عند اقتراب موعد الرنين.</li>
            </ul>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              onClick={() => alert('سيتم توفير تعليمات التثبيت حسب الجهاز لاحقًا.')}
            >
              إرشادات التثبيت
            </button>
            <button
              type="button"
              className="text-xs text-slate-500 underline"
              onClick={handleDismissInstallReminder}
            >
              عدم الإظهار مرة أخرى
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <section className="space-y-6">
          <div className="glass-card space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-right">
                <h2 className="text-xl font-semibold text-slate-900">الجداول الزمنية للجرس</h2>
                <p className="text-sm text-muted">أنشئ جدولًا لكل فترة (شتوي، صيفي، رمضان، اختبارات) وحدد فيه مواعيد الأحداث والنغمات.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                  onClick={() => {
                    setScheduleFormMode('create')
                    setScheduleDraft(null)
                    setManageScheduleDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  إنشاء جدول زمني جديد
                </button>
                {selectedSchedule ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                    onClick={() => {
                      setScheduleFormMode('edit')
                      setScheduleDraft(selectedSchedule)
                      setManageScheduleDialogOpen(true)
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    إعدادات الجدول الحالي
                  </button>
                ) : null}
              </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              {state.schedules.map((schedule) => {
                const isActive = state.activeScheduleId === schedule.id
                const scheduleToneProfile = toneProfileMap.get(schedule.toneProfileId)
                return (
                  <article
                    key={schedule.id}
                    className={clsx(
                      'group relative flex flex-col gap-3 rounded-3xl border p-4 transition shadow-sm hover:shadow-lg',
                      isActive
                        ? 'border-emerald-400 bg-emerald-50/70'
                        : selectedScheduleId === schedule.id
                        ? 'border-indigo-200 bg-white'
                        : 'border-slate-200 bg-white',
                    )}
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <AlarmClock className={clsx('h-5 w-5', isActive ? 'text-emerald-600' : 'text-slate-400')} />
                          <h3 className="text-lg font-semibold text-slate-900">{schedule.name}</h3>
                        </div>
                        {schedule.description ? (
                          <p className="text-xs text-muted">{schedule.description}</p>
                        ) : (
                          <p className="text-xs text-muted">لم تتم إضافة وصف بعد.</p>
                        )}
                        <p className="text-[11px] text-slate-500">
                          نبرة الصوت: <span className="font-semibold text-slate-800">{scheduleToneProfile?.name ?? 'غير محددة'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">آخر تحديث: {new Intl.DateTimeFormat('ar-SA', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(schedule.updatedAt))}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectSchedule(schedule.id)}
                          className={clsx(
                            'rounded-full border px-3 py-1 text-xs font-semibold transition',
                            selectedScheduleId === schedule.id
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                              : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600',
                          )}
                        >
                          عرض الأحداث
                        </button>
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
                            checked={schedule.isEnabled}
                            onChange={(event) => handleToggleSchedule(schedule.id, event.target.checked)}
                          />
                          تفعيل الجدول
                        </label>
                      </div>
                    </header>

                    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        <span>{schedule.events.length} حدث مجدول</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {scheduleToneProfile ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                            onClick={() => handlePreviewToneProfile(scheduleToneProfile.id)}
                          >
                            <Play className="h-3.5 w-3.5" /> معاينة النبرة
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> حذف
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                          onClick={() => {
                            setScheduleFormMode('edit')
                            setScheduleDraft(schedule)
                            setManageScheduleDialogOpen(true)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" /> تحرير
                        </button>
                        {!isActive ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100"
                            onClick={() => handleSetActiveSchedule(schedule.id)}
                          >
                            <Play className="h-3.5 w-3.5" /> تعيين كجدول نشط
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-medium text-white">
                            <Check className="h-3.5 w-3.5" /> الجدول النشط
                          </span>
                        )}
                      </div>
                    </footer>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="glass-card space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-right">
                <h2 className="text-xl font-semibold text-slate-900">
                  الأحداث المجدولة {selectedSchedule ? `— ${selectedSchedule.name}` : ''}
                </h2>
                <p className="text-sm text-muted">حدد توقيت كل حدث وسيتم ربطه تلقائيًا بنغمة من مكتبة النبرة المختارة.</p>
              </div>
              {selectedSchedule ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                    onClick={() => {
                      setEventDraft({ mode: 'create', scheduleId: selectedSchedule.id, event: null })
                      setEventDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" /> حدث جديد
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                    onClick={() => {
                      if (!selectedSchedule) return
                      const duplicated: BellSchedule = {
                        ...selectedSchedule,
                        id: createId(),
                        name: `${selectedSchedule.name} (نسخة)` ,
                        isEnabled: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        events: selectedSchedule.events.map((event) => ({ ...event, id: createId() })),
                      }
                      updateState((prev) => ({
                        ...prev,
                        schedules: [...prev.schedules, duplicated],
                      }))
                    }}
                  >
                    <Copy className="h-4 w-4" /> نسخ الجدول
                  </button>
                </div>
              ) : null}
            </header>

            {selectedSchedule ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    نبرة هذا الجدول:
                    <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600">
                      <Volume2 className="h-3.5 w-3.5" /> {selectedToneProfile?.name ?? 'غير محددة'}
                    </span>
                  </span>
                  <span>
                    يمكن تغيير النبرة من خلال زر «إعدادات الجدول الحالي».
                  </span>
                </div>
                <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="min-w-[720px] table-fixed text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">الوقت</th>
                      <th className="px-4 py-3 font-semibold">الحدث</th>
                      <th className="px-4 py-3 font-semibold">الفئة</th>
                      <th className="px-4 py-3 font-semibold">التكرار</th>
                      <th className="px-4 py-3 font-semibold">الصوت</th>
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                      <th className="px-4 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSchedule.events.length ? (
                      selectedSchedule.events.map((event) => (
                        <tr key={event.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-800">{formatTime(event.time)}</td>
                          <td className="px-4 py-3 text-slate-700">{event.title}</td>
                          <td className="px-4 py-3 text-slate-600">{EVENT_CATEGORY_LABEL[event.category]}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {event.repeatType === 'daily' ? (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">يوميًا</span>
                            ) : event.repeatDays?.length ? (
                              <span className="flex flex-wrap justify-end gap-1">
                                {WEEKDAYS.filter((weekday) => event.repeatDays?.includes(weekday.value)).map((weekday) => (
                                  <span
                                    key={weekday.value}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                  >
                                    {weekday.short}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-xs text-rose-500">لم يتم اختيار أيام</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(() => {
                              const asset = audioAssetMap.get(event.soundId)
                              if (!asset) return 'سيتم استخدام النغمة الافتراضية'
                              return `${asset.title}${asset.status === 'ready' ? '' : asset.status === 'pending' ? ' • بانتظار التحميل' : ' • غير متوفر'}`
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                event.enabled
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              <span className="inline-block h-2 w-2 rounded-full" style={{
                                backgroundColor: event.enabled ? '#047857' : '#94a3b8',
                              }} />
                              {event.enabled ? 'مفعل' : 'متوقف'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                                onClick={() => {
                                  setEventDraft({ mode: 'edit', scheduleId: selectedSchedule.id, event })
                                  setEventDialogOpen(true)
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" /> تحرير
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-500 transition hover:bg-rose-50"
                                onClick={() => handleDeleteEvent(selectedSchedule.id, event.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> حذف
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600"
                                onClick={() => handleManualTrigger(event)}
                              >
                                <Play className="h-3.5 w-3.5" /> تجربة
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">
                          لم يتم إضافة أي أحداث بعد. ابدأ بإضافة حدث جديد لتحديد توقيت الجرس.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-muted">
                <Bell className="h-10 w-10 text-slate-300" />
                <p>اختر جدولًا من القائمة أعلى الصفحة لعرض أحداثه أو قم بإنشاء جدول جديد.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="glass-card space-y-4">
            <header className="flex items-center justify-between">
              <div className="space-y-1 text-right">
                <h2 className="text-lg font-semibold text-slate-900">حالة الجرس اللحظية</h2>
                <p className="text-xs text-muted">راقب الجدول النشط، الحدث التالي، وحالة التشغيل.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                {state.activeScheduleId ? 'نشط' : 'متوقف'}
              </span>
            </header>

            {activeSchedule ? (
              <div className="space-y-3 rounded-2xl bg-slate-100/70 p-4 text-right">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">الجدول الحالي</p>
                    <p className="text-sm font-semibold text-slate-800">{activeSchedule.name}</p>
                    {activeToneProfile ? (
                      <p className="text-[11px] text-slate-500">
                        نبرة الصوت: <span className="font-semibold text-slate-700">{activeToneProfile.name}</span>
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-500"
                    onClick={() => handleToggleSchedule(activeSchedule.id, false)}
                  >
                    <Pause className="h-3.5 w-3.5" /> إيقاف مؤقت
                  </button>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-inner">
                  {upcomingEvent ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>الحدث التالي</span>
                        <span>{formatRelative(upcomingEvent.occurrence, currentTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">{upcomingEvent.event.title}</p>
                          <p className="text-xs text-slate-500">{EVENT_CATEGORY_LABEL[upcomingEvent.event.category]}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-800">{formatTime(upcomingEvent.event.time)}</p>
                          <p className="text-xs text-slate-500">{new Intl.DateTimeFormat('ar-SA', {
                            weekday: 'long',
                          }).format(upcomingEvent.occurrence)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted">
                      <Bell className="h-5 w-5 text-slate-400" />
                      <p>لا توجد أحداث قادمة خلال الـ 24 ساعة المقبلة.</p>
                    </div>
                  )}
                </div>
                {upcomingEvent && nextEventCountdownMs !== null ? (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    <span>العد التنازلي حتى الرنين</span>
                    <span className="font-mono text-sm font-semibold text-slate-800">{formatCountdown(nextEventCountdownMs)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>إجمالي الأحداث اليوم</span>
                  <span>
                    {activeSchedule.events.filter((event) => {
                      if (!event.enabled) return false
                      if (event.repeatType === 'daily') return true
                      const todaysDay = currentTime.getDay() as Weekday
                      return event.repeatDays?.includes(todaysDay)
                    }).length.toLocaleString('ar-SA')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>النغمات الجاهزة للتشغيل</span>
                  <span>
                    {readySoundIds.length.toLocaleString('ar-SA')} / {state.audioAssets.length.toLocaleString('ar-SA')}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-right">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>السجل التجريبي للتشغيل</span>
                    <span>{runtimeLog.length ? `${runtimeLog.length} حدث` : 'لا يوجد بعد'}</span>
                  </div>
                  <ul className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {runtimeLog.length ? (
                      runtimeLog.map((log) => (
                        <li key={log.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{log.title}</span>
                            <span className={clsx(
                              'rounded-full px-2 py-0.5',
                              log.status === 'pending-playback'
                                ? 'bg-indigo-50 text-indigo-600'
                                : log.status === 'played'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600',
                            )}>
                              {log.status === 'pending-playback'
                                ? 'بانتظار التشغيل'
                                : log.status === 'played'
                                ? 'تم التشغيل'
                                : 'تخطي'}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Intl.DateTimeFormat('ar-SA', {
                              dateStyle: 'medium',
                              timeStyle: 'medium',
                            }).format(new Date(log.executedAt))}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">{RUNTIME_SOURCE_LABEL[log.source]}</p>
                          {log.notes ? (
                            <p className="mt-1 text-[10px] text-slate-500">{log.notes}</p>
                          ) : null}
                        </li>
                      ))
                    ) : (
                      <li className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
                        سيتم تسجيل الأحداث هنا عند اقتراب موعد الرنين وتشغيله.
                      </li>
                    )}
                  </ul>
                  {lastError ? (
                    <p className="mt-2 text-[11px] text-rose-500">حدث خطأ صوتي أخيرًا: {lastError}</p>
                  ) : null}
                </div>
                {!isAnyAudioReady ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
                    لا توجد نغمات جاهزة حاليًا، سيعمل النظام على تشغيل النغمة الاحتياطية حتى يتم تحميل ملفات الصوت.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted">
                قم بتفعيل أحد الجداول الزمنية ليبدأ الجرس في العمل تلقائيًا.
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">تشغيل في الخلفية</h3>
              </div>
              <p className="mt-2 text-xs text-muted">
                تفعيل هذا الخيار يسمح للنظام بمراقبة الوقت وتشغيل الجرس حتى لو تم تصغير النافذة. قد يتطلب أذونات متقدمة في بعض الأجهزة.
              </p>
              <label className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span>تشغيل الخدمة التجريبية في الخلفية</span>
                <input
                  type="checkbox"
                  className="h-4 w-8 rounded-full border-slate-300 bg-slate-200 accent-emerald-500"
                  checked={state.backgroundExecution}
                  onChange={(event) => handleBackgroundToggle(event.target.checked)}
                />
              </label>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600"
                onClick={() => alert('سيتم توصيل الخدمة الخلفية بعمال الويب (Service Workers) لاحقًا.')}
              >
                <RefreshCw className="h-4 w-4" /> تحديث حالة الخدمة
              </button>
              {state.backgroundExecution && activeSchedule && !activeSchedule.allowBackgroundExecution ? (
                <p className="mt-2 text-[11px] text-amber-500">
                  الجدول الحالي لا يسمح تشغيله في الخلفية. قم بتفعيل خيار "السماح بالتشغيل في الخلفية" من إعدادات الجدول.
                </p>
              ) : null}
            </div>
          </div>

          <div className="glass-card space-y-4">
            <header className="flex items-center justify-between">
              <div className="space-y-1 text-right">
                <h2 className="text-lg font-semibold text-slate-900">مكتبة الأصوات</h2>
                <p className="text-xs text-muted">
                  قم بإدارة النغمات المتاحة لكل حدث، وتأكد من تحميلها محليًا عند تثبيت التطبيق.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                onClick={() => setAudioDialogOpen(true)}
              >
                <Settings className="h-4 w-4" /> إدارة الأصوات
              </button>
            </header>

            <ul className="space-y-3">
              {state.audioAssets.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-slate-400" />
                      <p className="font-semibold text-slate-800">{asset.title}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {Math.round(asset.durationSeconds / 60)}:{(asset.durationSeconds % 60).toString().padStart(2, '0')} دقيقة • {asset.sizeKb.toLocaleString('ar-SA')} ك.ب
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold',
                      asset.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-600'
                        : asset.status === 'pending'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-600',
                    )}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{
                      backgroundColor:
                        asset.status === 'ready' ? '#047857' : asset.status === 'pending' ? '#d97706' : '#dc2626',
                    }} />
                    {asset.status === 'ready'
                      ? 'محمل محليًا'
                      : asset.status === 'pending'
                      ? 'جاهز للتنزيل'
                      : 'مفقود'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">نصيحة</p>
              <p className="mt-1">
                عند تثبيت التطبيق كـ PWA، سيتم تحميل الأصوات تلقائيًا وتخزينها في الجهاز. يمكنك تحديث النغمات أو رفع نغمات جديدة من خلال لوحة الملفات القادمة.
              </p>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600"
                onClick={() => alert('سيتم ربط هذه العملية بخدمة المزامنة عند تنفيذ التكامل مع الخادم.')}
              >
                <DownloadCloud className="h-4 w-4" /> مزامنة الصوتيات الآن
              </button>
            </div>
          </div>

          <div className="glass-card space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ArrowLeftRight className="h-4 w-4 text-indigo-500" />
              تكامل وميزات قادمة
            </div>
            <ul className="space-y-2 pr-5">
              <li className="list-disc">ربط الجداول تلقائيًا بخطط الحصص من وحدة الجداول.</li>
              <li className="list-disc">دعم تشغيل الجرس من خلال الأجهزة الذكية مع سيناريوهات طوارئ.</li>
              <li className="list-disc">إرسال تنبيه للقيادة المدرسية عند تعطل النغمة أو تأخرها.</li>
              <li className="list-disc">جدولة نغمات مختلفة لأيام محددة (مثل يوم الاختبارات) تلقائيًا.</li>
            </ul>
          </div>
        </aside>
      </div>

      {manageScheduleDialogOpen ? (
        <ScheduleDialog
          mode={scheduleFormMode}
          schedules={state.schedules}
          draft={scheduleDraft}
          toneProfiles={state.toneProfiles}
          onPreviewToneProfile={handlePreviewToneProfile}
          onClose={() => {
            setManageScheduleDialogOpen(false)
            setScheduleDraft(null)
          }}
          onSubmit={handleScheduleFormSubmit}
        />
      ) : null}

      {eventDialogOpen && eventDraft && selectedSchedule ? (
        <EventDialog
          mode={eventDraft.mode}
          initialEvent={eventDraft.event}
          toneProfile={selectedToneProfile}
          audioAssetMap={audioAssetMap}
          onClose={() => {
            setEventDialogOpen(false)
            setEventDraft(null)
          }}
          onSubmit={(payload) => {
            if (eventDraft.mode === 'create') {
              handleAddEvent(eventDraft.scheduleId, payload)
            } else if (eventDraft.mode === 'edit' && eventDraft.event) {
              handleUpdateEvent(eventDraft.scheduleId, { ...eventDraft.event, ...payload })
            }
            setEventDialogOpen(false)
            setEventDraft(null)
          }}
        />
      ) : null}

      {audioDialogOpen ? (
        <AudioLibraryDialog
          assets={state.audioAssets}
          onClose={() => setAudioDialogOpen(false)}
          onUpdateStatus={handleUpdateAudioStatus}
          onPreviewSound={handlePreviewSound}
        />
      ) : null}
      </div>
    </section>
  )
}

interface ScheduleFormSubmitPayload {
  name: string
  description?: string
  autoActivate: boolean
  allowBackground: boolean
  cloneFromScheduleId?: string
  toneProfileId?: string
}

interface ScheduleDialogProps {
  mode: 'create' | 'edit'
  schedules: BellSchedule[]
  draft: BellSchedule | null
  toneProfiles: ToneProfile[]
  onPreviewToneProfile: (toneProfileId: string) => void
  onClose: () => void
  onSubmit: (payload: ScheduleFormSubmitPayload) => void
}

function ScheduleDialog({ mode, schedules, draft, toneProfiles, onPreviewToneProfile, onClose, onSubmit }: ScheduleDialogProps) {
  const [name, setName] = useState(draft?.name ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [autoActivate, setAutoActivate] = useState(draft?.isEnabled ?? mode === 'create')
  const [allowBackground, setAllowBackground] = useState(draft?.allowBackgroundExecution ?? true)
  const [cloneFromScheduleId, setCloneFromScheduleId] = useState<string>('')
  const [toneProfileId, setToneProfileId] = useState(draft?.toneProfileId ?? toneProfiles[0]?.id ?? '')

  useEffect(() => {
    if (!toneProfileId && toneProfiles[0]) {
      setToneProfileId(toneProfiles[0].id)
    }
  }, [toneProfileId, toneProfiles])

  const selectedToneProfile = useMemo(() => toneProfiles.find((profile) => profile.id === toneProfileId) ?? null, [
    toneProfiles,
    toneProfileId,
  ])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      autoActivate,
      allowBackground,
      toneProfileId,
      cloneFromScheduleId: cloneFromScheduleId || undefined,
    })
  }

  return (
    <DialogBase onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 text-right shadow-2xl"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'إنشاء جدول زمني جديد' : 'تعديل الجدول الزمني'}
          </h2>
          <p className="text-sm text-muted">
            اختر اسمًا واضحًا (شتوي، صيفي، رمضان، اختبارات..) ويسهل على الفريق التعرف عليه لاحقًا.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">اسم الجدول</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="مثال: الجدول الصيفي"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">وصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="مثال: يستخدم خلال الفترة الصيفية بدءًا من الأسبوع الثالث من الفصل الدراسي"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">اختر نبرة الجرس</label>
            <div className="space-y-2">
              {toneProfiles.map((profile) => {
                const isSelected = profile.id === toneProfileId
                return (
                  <label
                    key={profile.id}
                    className={clsx(
                      'flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-3 text-right transition',
                      isSelected ? 'border-indigo-300 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-white',
                    )}
                  >
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-800">{profile.name}</span>
                      <span className="text-[11px] text-slate-500">{profile.description}</span>
                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">{profile.intensity === 'soft' ? 'هادئ' : profile.intensity === 'energetic' ? 'حماسي' : 'متوازن'}</span>
                        {profile.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600"
                        onClick={() => onPreviewToneProfile(profile.id)}
                      >
                        <Play className="h-3.5 w-3.5" /> معاينة
                      </button>
                      <input
                        type="radio"
                        name="tone-profile"
                        value={profile.id}
                        checked={isSelected}
                        onChange={() => setToneProfileId(profile.id)}
                        className="h-4 w-4 accent-indigo-500"
                      />
                    </div>
                  </label>
                )
              })}
            </div>
            {selectedToneProfile ? (
              <p className="text-[11px] text-slate-500">
                سيتم تطبيق هذه النبرة على جميع الأحداث داخل الجدول تلقائيًا.
              </p>
            ) : null}
          </div>

          {mode === 'create' && schedules.length ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">بدءًا من جدول موجود (اختياري)</label>
              <select
                value={cloneFromScheduleId}
                onChange={(event) => setCloneFromScheduleId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">إنشاء جدول فارغ</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name} ({schedule.events.length} حدث)
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>تفعيل الجدول مباشرة بعد الحفظ</span>
              <input
                type="checkbox"
                className="h-4 w-8 rounded-full border-slate-300 bg-slate-200 accent-emerald-500"
                checked={autoActivate}
                onChange={(event) => setAutoActivate(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>السماح بالتشغيل في الخلفية لهذا الجدول</span>
              <input
                type="checkbox"
                className="h-4 w-8 rounded-full border-slate-300 bg-slate-200 accent-indigo-500"
                checked={allowBackground}
                onChange={(event) => setAllowBackground(event.target.checked)}
              />
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            {mode === 'create' ? 'إنشاء الجدول' : 'حفظ التعديلات'}
          </button>
        </footer>
      </form>
    </DialogBase>
  )
}

interface EventDialogProps {
  mode: 'create' | 'edit'
  initialEvent: BellEvent | null
  toneProfile: ToneProfile | null
  audioAssetMap: Map<string, BellAudioAsset>
  onClose: () => void
  onSubmit: (payload: Omit<BellEvent, 'id' | 'soundId'>) => void
}

function EventDialog({ mode, initialEvent, toneProfile, audioAssetMap, onClose, onSubmit }: EventDialogProps) {
  const [title, setTitle] = useState(initialEvent?.title ?? '')
  const [time, setTime] = useState(initialEvent?.time ?? '07:00')
  const [category, setCategory] = useState<BellEvent['category']>(initialEvent?.category ?? 'lesson_start')
  const [repeatType, setRepeatType] = useState<BellEvent['repeatType']>(initialEvent?.repeatType ?? 'daily')
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(initialEvent?.repeatDays ?? WEEKDAYS.map((weekday) => weekday.value))
  const [enabled, setEnabled] = useState(initialEvent?.enabled ?? true)
  const [notes, setNotes] = useState(initialEvent?.notes ?? '')

  useEffect(() => {
    if (repeatType === 'daily') {
      setRepeatDays(WEEKDAYS.map((weekday) => weekday.value))
    }
  }, [repeatType])

  const assignedSoundId = useMemo(() => {
    if (!toneProfile) return undefined
    return toneProfile.mapping[category] ?? toneProfile.mapping.generic ?? toneProfile.previewAssetId
  }, [category, toneProfile])

  const assignedAsset = useMemo(() => (assignedSoundId ? audioAssetMap.get(assignedSoundId) ?? null : null), [
    assignedSoundId,
    audioAssetMap,
  ])

  const toggleRepeatDay = (weekday: Weekday) => {
    setRepeatDays((prev) =>
      prev.includes(weekday) ? prev.filter((day) => day !== weekday) : [...prev, weekday].sort((a, b) => a - b),
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    if (!time) return
    if (repeatType === 'custom' && !repeatDays.length) return

    onSubmit({
      title: title.trim(),
      time,
      category,
      repeatType,
      repeatDays: repeatType === 'custom' ? repeatDays : undefined,
      enabled,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <DialogBase onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 text-right shadow-2xl"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'إضافة حدث جديد' : 'تعديل الحدث'}
          </h2>
          <p className="text-sm text-muted">
            اختر نوع الحدث، الوقت، والصوت المناسب. يمكنك لاحقًا ربط الحدث بالتنبيهات الذكية.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">عنوان الحدث</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="مثال: بداية الحصة الأولى"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">الوقت</label>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">نوع الحدث</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as BellEvent['category'])}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {Object.entries(EVENT_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">خيار التكرار</label>
            <div className="grid grid-cols-2 rounded-2xl border border-slate-200 p-1 text-xs text-slate-600">
              <button
                type="button"
                className={clsx(
                  'rounded-2xl px-3 py-2 font-semibold transition',
                  repeatType === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100',
                )}
                onClick={() => setRepeatType('daily')}
              >
                يوميًا
              </button>
              <button
                type="button"
                className={clsx(
                  'rounded-2xl px-3 py-2 font-semibold transition',
                  repeatType === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100',
                )}
                onClick={() => setRepeatType('custom')}
              >
                أيام محددة
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">حالة الحدث</label>
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>تشغيل الحدث</span>
              <input
                type="checkbox"
                className="h-4 w-8 rounded-full border-slate-300 bg-slate-200 accent-emerald-500"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
            </label>
          </div>
        </div>

        {repeatType === 'custom' ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">حدد الأيام</label>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((weekday) => (
                <button
                  key={weekday.value}
                  type="button"
                  className={clsx(
                    'rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                    repeatDays.includes(weekday.value)
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600',
                  )}
                  onClick={() => toggleRepeatDay(weekday.value)}
                >
                  {weekday.label}
                </button>
              ))}
            </div>
            {!repeatDays.length ? (
              <p className="text-[11px] text-rose-500">يجب اختيار يوم واحد على الأقل.</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">النغمة المرتبطة</p>
          {toneProfile ? (
            <div className="space-y-1">
              <p>
                سيتم تشغيل نبرة <span className="font-semibold text-indigo-600">{toneProfile.name}</span> لهذا الحدث.
              </p>
              <p className="text-[11px] text-slate-500">
                {assignedAsset ? (
                  <>
                    ملف الصوت: <span className="font-semibold text-slate-700">{assignedAsset.title}</span>{' '}
                    {assignedAsset.status === 'ready'
                      ? '(محمل)'
                      : assignedAsset.status === 'pending'
                      ? '(يجري تحضيره)'
                      : '(غير متوفر حاليًا، سيتم استخدام النغمة الاحتياطية)'}
                  </>
                ) : (
                  'سيتم استخدام النغمة الاحتياطية في حالة عدم توفر ملف صوتي مطابق.'
                )}
              </p>
            </div>
          ) : (
            <p>اختر نبرة للجدول من الإعدادات لتفعيل الربط التلقائي بالصوت.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="معلومات إضافية حول الحدث أو التنبيهات الخاصة به"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <footer className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            {mode === 'create' ? 'إضافة الحدث' : 'حفظ التعديلات'}
          </button>
        </footer>
      </form>
    </DialogBase>
  )
}

interface AudioLibraryDialogProps {
  assets: BellAudioAsset[]
  onClose: () => void
  onUpdateStatus: (assetId: string, status: BellAudioAsset['status']) => void
  onPreviewSound: (assetId: string, title: string) => void
}

function AudioLibraryDialog({ assets, onClose, onUpdateStatus, onPreviewSound }: AudioLibraryDialogProps) {
  return (
    <DialogBase onClose={onClose}>
      <div className="w-full max-w-3xl space-y-5 rounded-3xl bg-white p-6 text-right shadow-2xl">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">إدارة مكتبة الأصوات</h2>
          <p className="text-sm text-muted">
            تحكم في حالة كل نغمة، تابع حالة التنزيل، وحرّك الأصوات إلى وضع الاستعداد قبل المناسبات المهمة.
          </p>
        </header>

        <div className="space-y-4">
          {assets.map((asset) => (
            <div key={asset.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-indigo-500" />
                    <span className="text-base font-semibold text-slate-900">{asset.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {asset.durationSeconds} ثانية • {asset.sizeKb.toLocaleString('ar-SA')} ك.ب
                  </p>
                  {asset.lastSyncedAt ? (
                    <p className="text-[10px] text-slate-400">
                      آخر مزامنة: {new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(asset.lastSyncedAt))}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                      asset.status === 'missing'
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600',
                    )}
                    onClick={() => onPreviewSound(asset.id, asset.title)}
                    disabled={asset.status === 'missing'}
                  >
                    <Play className="h-3.5 w-3.5" /> معاينة
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-emerald-200 hover:text-emerald-600"
                    onClick={() => onUpdateStatus(asset.id, 'ready')}
                  >
                    <DownloadCloud className="h-3.5 w-3.5" /> تحديد كمحمل
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-amber-200 hover:text-amber-600"
                    onClick={() => onUpdateStatus(asset.id, 'pending')}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> وضع الانتظار
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                    onClick={() => onUpdateStatus(asset.id, 'missing')}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> إلغاء التحميل
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold">
                <span>الحالة الحالية</span>
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1',
                    asset.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-600'
                      : asset.status === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-rose-50 text-rose-600',
                  )}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{
                    backgroundColor:
                      asset.status === 'ready' ? '#047857' : asset.status === 'pending' ? '#d97706' : '#dc2626',
                  }} />
                  {asset.status === 'ready'
                    ? 'محمل' : asset.status === 'pending' ? 'بانتظار التحميل' : 'غير متوفر'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <footer className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            onClick={onClose}
          >
            إغلاق
          </button>
          <button
            type="button"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            onClick={() => alert('سيتم ربط هذا الزر بعملية رفع الصوتيات الجديدة عند توفر الواجهة الخلفية.')}
          >
            رفع صوت جديد
          </button>
        </footer>
      </div>
    </DialogBase>
  )
}

function DialogBase({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto">{children}</div>
    </div>
  )
}

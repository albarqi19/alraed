import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'classnames'
import {
  AlarmClock,
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  Chrome,
  Clock3,
  Copy,
  Edit,
  ExternalLink,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type {
  BellAudioAsset,
  BellEvent,
  BellSchedule,
  ToneProfile,
  Weekday,
} from '@/modules/admin/school-bell/types'
import {
  getBellSettings,
  getBellSchedules,
  createBellSchedule,
  updateBellSchedule,
  deleteBellSchedule,
  activateBellSchedule,
  deactivateBellSchedule,
  duplicateBellSchedule,
  createBellEvent,
  updateBellEvent,
  deleteBellEvent,
  getBellAudioAssets,
  getActiveSchedules,
  createBellScheduleFromSchedule,
  reapplyToneProfile,
  getExtensionStatus,
  sendManualRing,
  type ActiveScheduleInfo,
  type ExtensionStatus,
} from '@/modules/admin/school-bell/api/bell-api'
import { WEEKDAYS, formatTime } from '@/modules/admin/school-bell/utils'

const EVENT_CATEGORY_LABEL: Record<BellEvent['category'], string> = {
  lesson_start: 'بداية الحصة',
  lesson_end: 'نهاية الحصة',
  break: 'فسحة/استراحة',
  prayer: 'أذان/صلاة',
  custom: 'حدث مخصص',
}

export function AdminSchoolBellPage() {
  const queryClient = useQueryClient()
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [createScheduleDialogOpen, setCreateScheduleDialogOpen] = useState(false)
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [eventDraft, setEventDraft] = useState<{
    mode: 'create' | 'edit'
    scheduleId: string
    event: BellEvent | null
  } | null>(null)

  // Data fetching
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['bell-settings'],
    queryFn: getBellSettings,
  })

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['bell-schedules'],
    queryFn: getBellSchedules,
  })

  const { data: audioAssets = [] } = useQuery({
    queryKey: ['bell-audio-assets'],
    queryFn: getBellAudioAssets,
  })

  const { data: extensionStatus, refetch: refetchExtensionStatus } = useQuery({
    queryKey: ['extension-status'],
    queryFn: getExtensionStatus,
    refetchInterval: 30000, // كل 30 ثانية
  })

  const { data: activeSchedules = [] } = useQuery({
    queryKey: ['active-schedules'],
    queryFn: getActiveSchedules,
  })

  // Mutations
  const activateScheduleMutation = useMutation({
    mutationFn: activateBellSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['bell-settings'] })
    },
  })

  const deactivateScheduleMutation = useMutation({
    mutationFn: deactivateBellSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['bell-settings'] })
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteBellSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
    },
  })

  const duplicateScheduleMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => duplicateBellSchedule(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: ({ scheduleId, eventId }: { scheduleId: string; eventId: string }) =>
      deleteBellEvent(scheduleId, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
    },
  })

  // Derived state
  const toneProfiles = settingsData?.toneProfiles ?? []
  const activeScheduleId = settingsData?.settings?.activeScheduleId
  const audioAssetMap = useMemo(() => new Map(audioAssets.map((a) => [a.id, a])), [audioAssets])
  const toneProfileMap = useMemo(() => new Map(toneProfiles.map((p) => [p.id, p])), [toneProfiles])

  const selectedSchedule = useMemo(() => {
    return schedules.find((s) => s.id === selectedScheduleId) ?? null
  }, [schedules, selectedScheduleId])

  const selectedToneProfile = useMemo(() => {
    return selectedSchedule?.toneProfileId
      ? toneProfileMap.get(selectedSchedule.toneProfileId) ?? null
      : null
  }, [selectedSchedule, toneProfileMap])

  useEffect(() => {
    if (!selectedScheduleId && schedules.length > 0) {
      setSelectedScheduleId(schedules[0].id)
    }
  }, [schedules, selectedScheduleId])

  // Handlers
  const handleToggleSchedule = (scheduleId: string, enabled: boolean) => {
    if (enabled) {
      activateScheduleMutation.mutate(scheduleId)
    } else {
      deactivateScheduleMutation.mutate(scheduleId)
    }
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الجدول؟')) {
      deleteScheduleMutation.mutate(scheduleId)
      if (selectedScheduleId === scheduleId) {
        setSelectedScheduleId(null)
      }
    }
  }

  const handleDuplicateSchedule = (schedule: BellSchedule) => {
    duplicateScheduleMutation.mutate({
      id: schedule.id,
      name: `${schedule.name} (نسخة)`,
    })
  }

  const handleDeleteEvent = (scheduleId: string, eventId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الحدث؟')) {
      deleteEventMutation.mutate({ scheduleId, eventId })
    }
  }

  const isLoading = isLoadingSettings || isLoadingSchedules

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-600">جاري تحميل بيانات الجرس...</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {/* Mobile Warning */}
      <div className="block lg:hidden">
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-10 w-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-900">يُفضل استخدام الكمبيوتر</h2>
          <p className="mx-auto mb-4 max-w-md text-base leading-relaxed text-slate-700">
            صفحة الجرس المدرسي مُصممة للعمل على الشاشات الكبيرة.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="hidden lg:block space-y-6">
        <header className="space-y-2 text-right">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">أدوات المدرسة</p>
              <h1 className="text-3xl font-bold text-slate-900">مركز التحكم في الجرس المدرسي</h1>
              <p className="text-sm text-muted">
                قم بإدارة جداول الرنين والتحكم في إضافة Chrome للتشغيل.
              </p>
            </div>
            <div className="flex flex-col items-end justify-center rounded-3xl bg-slate-900 px-6 py-4 text-white shadow-lg">
              <span className="text-xs uppercase tracking-[0.35em] text-emerald-300">الوقت الآن</span>
              <div className="mt-2 flex items-center gap-2 text-3xl font-bold">
                <Clock3 className="h-7 w-7 text-emerald-300" />
                <CurrentTime />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          {/* Left Column - Schedules and Events */}
          <section className="space-y-6">
            {/* Schedules */}
            <div className="glass-card space-y-5">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">الجداول الزمنية للجرس</h2>
                  <p className="text-sm text-muted">أنشئ جدولًا لكل فترة وحدد فيه مواعيد الأحداث والنغمات.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    onClick={() => setCreateScheduleDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    إنشاء جدول جديد
                  </button>
                  {selectedSchedule && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                      onClick={() => setEditScheduleDialogOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                      إعدادات الجدول
                    </button>
                  )}
                </div>
              </header>

              {schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                  <Bell className="h-10 w-10 text-slate-300" />
                  <p className="text-sm text-muted">لا توجد جداول بعد. ابدأ بإنشاء جدول جديد.</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {schedules.map((schedule) => {
                    const isActive = activeScheduleId === schedule.id
                    const isSelected = selectedScheduleId === schedule.id
                    const scheduleToneProfile = toneProfileMap.get(schedule.toneProfileId)

                    return (
                      <article
                        key={schedule.id}
                        className={clsx(
                          'group relative flex flex-col gap-3 rounded-3xl border p-4 transition shadow-sm hover:shadow-lg cursor-pointer',
                          isActive
                            ? 'border-emerald-400 bg-emerald-50/70'
                            : isSelected
                            ? 'border-indigo-200 bg-white'
                            : 'border-slate-200 bg-white',
                        )}
                        onClick={() => setSelectedScheduleId(schedule.id)}
                      >
                        <header className="flex items-start justify-between gap-3">
                          <div className="space-y-1 text-right">
                            <div className="flex items-center gap-2">
                              <AlarmClock className={clsx('h-5 w-5', isActive ? 'text-emerald-600' : 'text-slate-400')} />
                              <h3 className="text-lg font-semibold text-slate-900">{schedule.name}</h3>
                            </div>
                            {schedule.description && (
                              <p className="text-xs text-muted">{schedule.description}</p>
                            )}
                            <p className="text-[11px] text-slate-500">
                              نبرة الصوت: <span className="font-semibold text-slate-800">{scheduleToneProfile?.name ?? 'غير محددة'}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <label className="flex items-center gap-2 text-xs text-slate-600" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
                                checked={schedule.isEnabled}
                                onChange={(e) => handleToggleSchedule(schedule.id, e.target.checked)}
                              />
                              تفعيل
                            </label>
                          </div>
                        </header>

                        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-slate-400" />
                            <span>{schedule.events.length} حدث</span>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                              onClick={() => handleDuplicateSchedule(schedule)}
                            >
                              <Copy className="h-3.5 w-3.5" /> نسخ
                            </button>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-medium text-white">
                                <Check className="h-3.5 w-3.5" /> نشط
                              </span>
                            ) : null}
                          </div>
                        </footer>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Events */}
            <div className="glass-card space-y-5">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">
                    الأحداث المجدولة {selectedSchedule ? `— ${selectedSchedule.name}` : ''}
                  </h2>
                  <p className="text-sm text-muted">حدد توقيت كل حدث وسيتم ربطه تلقائياً بنغمة من ملف النغمات.</p>
                </div>
                {selectedSchedule && (
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
                )}
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
                                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">يومياً</span>
                                ) : event.repeatDays?.length ? (
                                  <span className="flex flex-wrap justify-end gap-1">
                                    {WEEKDAYS.filter((w) => event.repeatDays?.includes(w.value)).map((w) => (
                                      <span key={w.value} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {w.short}
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
                                  if (!asset) return 'نغمة افتراضية'
                                  return asset.title
                                })()}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={clsx(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                    event.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500',
                                  )}
                                >
                                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: event.enabled ? '#047857' : '#94a3b8' }} />
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
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted">
                              لم يتم إضافة أي أحداث بعد. ابدأ بإضافة حدث جديد.
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
                  <p>اختر جدولاً من القائمة أعلاه لعرض أحداثه.</p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column - Extension Status & Manual Ring */}
          <aside className="space-y-6">
            {/* Extension Status */}
            <ExtensionStatusCard
              status={extensionStatus}
              onRefresh={() => refetchExtensionStatus()}
            />

            {/* Manual Ring */}
            <ManualRingCard audioAssets={audioAssets} />

            {/* Tone Profiles Summary */}
            <div className="glass-card space-y-4">
              <header className="flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <h2 className="text-lg font-semibold text-slate-900">ملفات النغمات</h2>
                  <p className="text-xs text-muted">ملفات النغمات المتاحة للربط بالجداول.</p>
                </div>
                <a
                  href="/admin/bell-tone-profiles"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <Settings className="h-4 w-4" /> إدارة النغمات
                </a>
              </header>
              <ul className="space-y-2">
                {toneProfiles.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-indigo-500" />
                        <p className="font-semibold text-slate-800">{profile.name}</p>
                      </div>
                      {profile.description && (
                        <p className="text-xs text-slate-500">{profile.description}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                      {profile.intensity === 'soft' ? 'هادئ' : profile.intensity === 'energetic' ? 'حماسي' : 'متوازن'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Audio Assets Summary */}
            <div className="glass-card space-y-4">
              <header className="flex items-center justify-between">
                <div className="space-y-1 text-right">
                  <h2 className="text-lg font-semibold text-slate-900">مكتبة الأصوات</h2>
                  <p className="text-xs text-muted">{audioAssets.length} صوت متاح</p>
                </div>
                <a
                  href="/admin/bell-audio-assets"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <Settings className="h-4 w-4" /> إدارة الأصوات
                </a>
              </header>
              <div className="text-xs text-slate-500">
                <div className="flex items-center justify-between py-1">
                  <span>جاهزة</span>
                  <span className="font-semibold text-emerald-600">
                    {audioAssets.filter((a) => a.status === 'ready').length}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>قيد التحميل</span>
                  <span className="font-semibold text-amber-600">
                    {audioAssets.filter((a) => a.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Dialogs */}
        {createScheduleDialogOpen && (
          <CreateScheduleDialog
            activeSchedules={activeSchedules}
            toneProfiles={toneProfiles}
            onClose={() => setCreateScheduleDialogOpen(false)}
            onSuccess={() => {
              setCreateScheduleDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
            }}
          />
        )}

        {editScheduleDialogOpen && selectedSchedule && (
          <EditScheduleDialog
            schedule={selectedSchedule}
            toneProfiles={toneProfiles}
            onClose={() => setEditScheduleDialogOpen(false)}
            onSuccess={() => {
              setEditScheduleDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
            }}
          />
        )}

        {eventDialogOpen && eventDraft && selectedSchedule && (
          <EventDialog
            mode={eventDraft.mode}
            initialEvent={eventDraft.event}
            scheduleId={eventDraft.scheduleId}
            toneProfile={selectedToneProfile}
            audioAssetMap={audioAssetMap}
            onClose={() => {
              setEventDialogOpen(false)
              setEventDraft(null)
            }}
            onSuccess={() => {
              setEventDialogOpen(false)
              setEventDraft(null)
              queryClient.invalidateQueries({ queryKey: ['bell-schedules'] })
            }}
          />
        )}
      </div>
    </section>
  )
}

// ============ Components ============

function CurrentTime() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
      {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

function ExtensionStatusCard({
  status,
  onRefresh,
}: {
  status: ExtensionStatus | undefined
  onRefresh: () => void
}) {
  const isConnected = status?.connected ?? false
  const lastSeen = status?.lastSeen ? new Date(status.lastSeen) : null
  const timeSinceLastSeen = lastSeen
    ? Math.floor((Date.now() - lastSeen.getTime()) / 1000)
    : null

  return (
    <div className="glass-card space-y-4">
      <header className="flex items-center justify-between">
        <div className="space-y-1 text-right">
          <h2 className="text-lg font-semibold text-slate-900">إضافة Chrome</h2>
          <p className="text-xs text-muted">حالة اتصال الإضافة بالخادم.</p>
        </div>
        <span
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-semibold',
            isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600',
          )}
        >
          {isConnected ? 'متصل' : 'غير متصل'}
        </span>
      </header>

      <div className="space-y-3 rounded-2xl bg-slate-100/70 p-4 text-right">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Wifi className="h-8 w-8 text-emerald-500" />
          ) : (
            <WifiOff className="h-8 w-8 text-rose-400" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              {isConnected ? 'الإضافة متصلة' : 'الإضافة غير متصلة'}
            </p>
            {status?.version && (
              <p className="text-xs text-slate-500">الإصدار: {status.version}</p>
            )}
            {timeSinceLastSeen !== null && (
              <p className="text-xs text-slate-500">
                آخر نبضة: منذ {timeSinceLastSeen < 60 ? `${timeSinceLastSeen} ثانية` : `${Math.floor(timeSinceLastSeen / 60)} دقيقة`}
              </p>
            )}
          </div>
        </div>

        {status?.nextEvent && (
          <div className="rounded-2xl bg-white p-3 text-xs">
            <span className="text-slate-500">الحدث التالي: </span>
            <span className="font-semibold text-slate-800">{status.nextEvent}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
        >
          <RefreshCw className="h-4 w-4" /> تحديث الحالة
        </button>
        <a
          href="/admin/bell-extension-download"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
        >
          <Chrome className="h-4 w-4" /> تحميل الإضافة
        </a>
      </div>

      {!isConnected && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">الإضافة غير متصلة</span>
          </div>
          <p className="mt-1">
            تأكد من تثبيت إضافة Chrome وتسجيل الدخول بها. الجرس لن يعمل بدون الإضافة.
          </p>
        </div>
      )}
    </div>
  )
}

function ManualRingCard({ audioAssets }: { audioAssets: BellAudioAsset[] }) {
  const [selectedAudioId, setSelectedAudioId] = useState<string>('')
  const [isRinging, setIsRinging] = useState(false)
  const [lastRingStatus, setLastRingStatus] = useState<'success' | 'error' | null>(null)

  const readyAssets = audioAssets.filter((a) => a.status === 'ready')

  const handleRing = async () => {
    if (!selectedAudioId) return

    setIsRinging(true)
    setLastRingStatus(null)

    try {
      await sendManualRing(selectedAudioId)
      setLastRingStatus('success')
    } catch (error) {
      console.error('Failed to send manual ring:', error)
      setLastRingStatus('error')
    } finally {
      setIsRinging(false)
    }
  }

  return (
    <div className="glass-card space-y-4">
      <header className="flex items-center justify-between">
        <div className="space-y-1 text-right">
          <h2 className="text-lg font-semibold text-slate-900">رن الآن</h2>
          <p className="text-xs text-muted">تشغيل الجرس يدوياً (عبر الإضافة).</p>
        </div>
        <Bell className="h-6 w-6 text-amber-500" />
      </header>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">اختر الصوت</label>
          <select
            value={selectedAudioId}
            onChange={(e) => setSelectedAudioId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">-- اختر صوت --</option>
            {readyAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRing}
          disabled={!selectedAudioId || isRinging}
          className={clsx(
            'w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-sm transition',
            !selectedAudioId || isRinging
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-amber-500 text-white hover:bg-amber-600',
          )}
        >
          {isRinging ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              رن الآن
            </>
          )}
        </button>

        {lastRingStatus === 'success' && (
          <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-700 text-center">
            تم إرسال أمر الرنين بنجاح. سيتم التشغيل عبر الإضافة.
          </div>
        )}

        {lastRingStatus === 'error' && (
          <div className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-700 text-center">
            حدث خطأ أثناء إرسال الأمر. حاول مرة أخرى.
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Dialogs ============

function CreateScheduleDialog({
  activeSchedules,
  toneProfiles,
  onClose,
  onSuccess,
}: {
  activeSchedules: ActiveScheduleInfo[]
  toneProfiles: ToneProfile[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [mode, setMode] = useState<'from-schedule' | 'empty'>('from-schedule')
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    activeSchedules[0]?.id ?? null
  )
  const [name, setName] = useState('')
  const [toneProfileId, setToneProfileId] = useState(toneProfiles[0]?.id ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedActiveSchedule = activeSchedules.find((s) => s.id === selectedScheduleId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'from-schedule' && selectedScheduleId) {
        await createBellScheduleFromSchedule({
          scheduleId: selectedScheduleId,
          name: name || undefined,
          toneProfileId: toneProfileId || undefined,
        })
      } else {
        await createBellSchedule({
          name: name || 'جدول جديد',
          toneProfileId: toneProfileId || undefined,
        })
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to create schedule:', error)
      alert('حدث خطأ أثناء إنشاء الجدول')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogBase onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 text-right shadow-2xl"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">إنشاء جدول جرس جديد</h2>
          <p className="text-sm text-muted">
            يمكنك إنشاء جدول من توقيت مفعل أو إنشاء جدول فارغ.
          </p>
        </header>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 rounded-2xl border border-slate-200 p-1 text-xs text-slate-600">
            <button
              type="button"
              className={clsx(
                'rounded-2xl px-3 py-2 font-semibold transition',
                mode === 'from-schedule' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100',
              )}
              onClick={() => setMode('from-schedule')}
            >
              من توقيت مفعل
            </button>
            <button
              type="button"
              className={clsx(
                'rounded-2xl px-3 py-2 font-semibold transition',
                mode === 'empty' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100',
              )}
              onClick={() => setMode('empty')}
            >
              جدول فارغ
            </button>
          </div>

          {mode === 'from-schedule' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">اختر التوقيت المفعل</label>
              {activeSchedules.length === 0 ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
                  لا توجد توقيتات مفعلة حالياً. قم بتفعيل توقيت من إدارة التوقيتات أولاً.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSchedules.map((schedule) => (
                    <label
                      key={schedule.id}
                      className={clsx(
                        'flex items-center justify-between gap-3 rounded-3xl border px-4 py-3 transition cursor-pointer',
                        selectedScheduleId === schedule.id
                          ? 'border-indigo-300 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-slate-800">{schedule.name}</span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {schedule.lessonsCount} حصة
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">
                            {schedule.breaksCount} فسحة
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="active-schedule"
                        value={schedule.id}
                        checked={selectedScheduleId === schedule.id}
                        onChange={() => setSelectedScheduleId(schedule.id)}
                        className="h-4 w-4 accent-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">
              اسم الجدول {mode === 'from-schedule' && '(اختياري)'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === 'from-schedule' && selectedActiveSchedule
                  ? `جدول جرس - ${selectedActiveSchedule.name}`
                  : 'مثال: الجدول الصيفي'
              }
              required={mode === 'empty'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Tone Profile */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">ملف النغمات</label>
            <select
              value={toneProfileId}
              onChange={(e) => setToneProfileId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- بدون ملف نغمات --</option>
              {toneProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              سيتم ربط الأصوات تلقائياً حسب نوع الحدث (بداية حصة، نهاية حصة، فسحة).
            </p>
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
            disabled={isSubmitting || (mode === 'from-schedule' && !selectedScheduleId)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition',
              isSubmitting || (mode === 'from-schedule' && !selectedScheduleId)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700',
            )}
          >
            {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الجدول'}
          </button>
        </footer>
      </form>
    </DialogBase>
  )
}

function EditScheduleDialog({
  schedule,
  toneProfiles,
  onClose,
  onSuccess,
}: {
  schedule: BellSchedule
  toneProfiles: ToneProfile[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(schedule.name)
  const [description, setDescription] = useState(schedule.description ?? '')
  const [toneProfileId, setToneProfileId] = useState(schedule.toneProfileId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)

    try {
      await updateBellSchedule(schedule.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        toneProfileId: toneProfileId || undefined,
      })

      // إعادة تطبيق النغمات إذا تغير ملف النغمات
      if (toneProfileId && toneProfileId !== schedule.toneProfileId) {
        await reapplyToneProfile(schedule.id)
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to update schedule:', error)
      alert('حدث خطأ أثناء تحديث الجدول')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogBase onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 text-right shadow-2xl"
      >
        <header className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">تعديل الجدول</h2>
          <p className="text-sm text-muted">تعديل إعدادات الجدول وملف النغمات.</p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">اسم الجدول</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">الوصف (اختياري)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">ملف النغمات</label>
            <select
              value={toneProfileId}
              onChange={(e) => setToneProfileId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">-- بدون ملف نغمات --</option>
              {toneProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            {toneProfileId !== schedule.toneProfileId && toneProfileId && (
              <p className="text-[11px] text-amber-600">
                سيتم إعادة تطبيق الأصوات على جميع الأحداث عند الحفظ.
              </p>
            )}
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
            disabled={isSubmitting}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition',
              isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700',
            )}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </footer>
      </form>
    </DialogBase>
  )
}

function EventDialog({
  mode,
  initialEvent,
  scheduleId,
  toneProfile,
  audioAssetMap,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit'
  initialEvent: BellEvent | null
  scheduleId: string
  toneProfile: ToneProfile | null
  audioAssetMap: Map<string, BellAudioAsset>
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState(initialEvent?.title ?? '')
  const [time, setTime] = useState(initialEvent?.time ?? '07:00')
  const [category, setCategory] = useState<BellEvent['category']>(initialEvent?.category ?? 'lesson_start')
  const [repeatType, setRepeatType] = useState<BellEvent['repeatType']>(initialEvent?.repeatType ?? 'daily')
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(
    initialEvent?.repeatDays ?? WEEKDAYS.map((w) => w.value)
  )
  const [enabled, setEnabled] = useState(initialEvent?.enabled ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (repeatType === 'daily') {
      setRepeatDays(WEEKDAYS.map((w) => w.value))
    }
  }, [repeatType])

  const toggleRepeatDay = (weekday: Weekday) => {
    setRepeatDays((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday].sort((a, b) => a - b)
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !time) return
    if (repeatType === 'custom' && !repeatDays.length) return

    setIsSubmitting(true)

    try {
      const payload = {
        title: title.trim(),
        time,
        category,
        repeatType,
        repeatDays: repeatType === 'custom' ? repeatDays : undefined,
        enabled,
        soundId: '', // سيتم تعيينه من ملف النغمات
      }

      if (mode === 'create') {
        await createBellEvent(scheduleId, payload)
      } else if (initialEvent) {
        await updateBellEvent(scheduleId, initialEvent.id, payload)
      }

      onSuccess()
    } catch (error) {
      console.error('Failed to save event:', error)
      alert('حدث خطأ أثناء حفظ الحدث')
    } finally {
      setIsSubmitting(false)
    }
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
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">عنوان الحدث</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">نوع الحدث</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BellEvent['category'])}
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
                يومياً
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
                onChange={(e) => setEnabled(e.target.checked)}
              />
            </label>
          </div>
        </div>

        {repeatType === 'custom' && (
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
            {!repeatDays.length && (
              <p className="text-[11px] text-rose-500">يجب اختيار يوم واحد على الأقل.</p>
            )}
          </div>
        )}

        <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">النغمة المرتبطة</p>
          {toneProfile ? (
            <p>
              سيتم تشغيل نبرة <span className="font-semibold text-indigo-600">{toneProfile.name}</span> لهذا الحدث
              حسب نوعه ({EVENT_CATEGORY_LABEL[category]}).
            </p>
          ) : (
            <p>اختر ملف نغمات للجدول من الإعدادات لتفعيل الربط التلقائي بالصوت.</p>
          )}
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
            disabled={isSubmitting}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition',
              isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600',
            )}
          >
            {isSubmitting ? 'جاري الحفظ...' : mode === 'create' ? 'إضافة الحدث' : 'حفظ التعديلات'}
          </button>
        </footer>
      </form>
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

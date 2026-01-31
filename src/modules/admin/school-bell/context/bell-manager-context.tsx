import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  BellAudioAsset,
  BellEvent,
  BellManagerState,
  BellSchedule,
  RuntimeLogEntry,
  ToneProfile,
} from '../types'
import { useSchoolBellEngine, type PlaybackOutcome } from '../use-school-bell-engine'
import { useBellScheduler, type UpcomingEventInfo } from '../use-bell-scheduler'
import {
  createId,
  findToneProfile,
  getNextOccurrence,
  loadInitialState,
  STORAGE_KEY,
} from '../utils'
import { getBellSettings, syncBellState } from '../api/bell-api'
import { isAudioCached, listCachedAudios, type CacheStatus } from '../audio-cache'

interface BellManagerContextValue {
  state: BellManagerState
  updateState: (updater: BellManagerState | ((prev: BellManagerState) => BellManagerState)) => void
  setWidgetVisibility: (show: boolean) => void
  toggleWidgetVisibility: () => void
  currentTime: Date
  runtimeLog: RuntimeLogEntry[]
  appendRuntimeLog: (entry: RuntimeLogEntry) => void
  updateRuntimeLogStatus: (logId: string, outcome: PlaybackOutcome) => void
  upcomingEvent: UpcomingEventInfo | null
  schedulerEnabled: boolean
  playEvent: (event: BellEvent) => Promise<PlaybackOutcome>
  previewSound: (soundId: string) => Promise<PlaybackOutcome>
  /** تحميل ملف صوتي وتخزينه للعمل offline */
  downloadAudio: (soundId: string, onProgress?: (progress: number) => void) => Promise<boolean>
  /** تحديث حالة التخزين المحلي لملف صوتي */
  updateAudioCacheStatus: (soundId: string, status: CacheStatus) => void
  handleManualTrigger: (event: BellEvent) => Promise<void>
  toneProfileMap: Map<string, ToneProfile>
  audioAssetMap: Map<string, BellAudioAsset>
  readySoundIds: string[]
  isAnyAudioReady: boolean
  lastError: string | null
  activeSchedule: BellSchedule | null
  activeToneProfile: ToneProfile | null
}

interface BellManagerProviderProps {
  children: ReactNode
  /** إذا كان true، لن يتم تفعيل الـ timer */
  disabled?: boolean
}

const BellManagerContext = createContext<BellManagerContextValue | null>(null)

export function BellManagerProvider({ children, disabled = false }: BellManagerProviderProps) {
  const initialStateRef = useRef<BellManagerState | null>(null)
  if (!initialStateRef.current) {
    initialStateRef.current = loadInitialState()
  }

  const [state, setState] = useState<BellManagerState>(() => initialStateRef.current as BellManagerState)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [runtimeLog, setRuntimeLog] = useState<RuntimeLogEntry[]>([])
  const [isServerLoaded, setIsServerLoaded] = useState(false)
  const isMountedRef = useRef(true)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // تحميل البيانات من الخادم عند البداية
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return

    async function loadFromServer() {
      try {
        const serverData = await getBellSettings()
        if (!isMountedRef.current) return

        setState((prev) => ({
          ...prev,
          ...serverData.settings,
          schedules: serverData.schedules.length > 0 ? serverData.schedules : prev.schedules,
          toneProfiles: serverData.toneProfiles.length > 0 ? serverData.toneProfiles : prev.toneProfiles,
          audioAssets: serverData.audioAssets.length > 0 ? serverData.audioAssets : prev.audioAssets,
        }))
        setIsServerLoaded(true)
        console.log('[BellManager] تم تحميل البيانات من الخادم بنجاح')
      } catch (error) {
        console.log('[BellManager] استخدام البيانات المحلية (الخادم غير متاح):', error)
        setIsServerLoaded(true) // نعتبرها محملة حتى لو فشل الاتصال
      }
    }

    loadFromServer()
  }, [disabled])

  // مزامنة مع الخادم (debounced)
  const syncToServer = useCallback((newState: BellManagerState) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await syncBellState(newState)
        console.log('[BellManager] تم مزامنة البيانات مع الخادم')
      } catch (error) {
        console.error('[BellManager] فشل مزامنة البيانات مع الخادم:', error)
      }
    }, 2000) // انتظار 2 ثانية قبل المزامنة
  }, [])

  const updateState = useCallback(
    (updater: BellManagerContextValue['state'] | ((prev: BellManagerState) => BellManagerState)) => {
      setState((prev) => {
        const newState = typeof updater === 'function' ? (updater as (prev: BellManagerState) => BellManagerState)(prev) : updater
        // مزامنة مع الخادم بعد التحديث
        if (isServerLoaded) {
          syncToServer(newState)
        }
        return newState
      })
    },
  [isServerLoaded, syncToServer]);

  const setWidgetVisibility = useCallback(
    (show: boolean) => {
      updateState((prev) => ({ ...prev, showWidget: show }))
    },
    [updateState],
  )

  const toggleWidgetVisibility = useCallback(() => {
    updateState((prev) => ({ ...prev, showWidget: !prev.showWidget }))
  }, [updateState])

  useEffect(() => {
    // لا تفعّل الـ timer إذا كان Provider معطلاً
    if (disabled || typeof window === 'undefined') return

    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [disabled])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const toneProfileMap = useMemo(() => {
    const map = new Map<string, ToneProfile>()
    state.toneProfiles.forEach((profile) => {
      map.set(profile.id, profile)
    })
    return map
  }, [state.toneProfiles])

  const audioAssetMap = useMemo(() => {
    const map = new Map<string, BellAudioAsset>()
    state.audioAssets.forEach((asset) => {
      map.set(asset.id, asset)
    })
    return map
  }, [state.audioAssets])

  const activeSchedule = useMemo(() => {
    return state.schedules.find((schedule) => schedule.id === state.activeScheduleId) ?? null
  }, [state.schedules, state.activeScheduleId])

  const activeToneProfile = useMemo(() => findToneProfile(state.toneProfiles, activeSchedule?.toneProfileId), [
    state.toneProfiles,
    activeSchedule?.toneProfileId,
  ])

  const upcomingEvent: UpcomingEventInfo | null = useMemo(() => {
    if (!activeSchedule) return null

    const occurrences: UpcomingEventInfo[] = activeSchedule.events
      .filter((event) => event.enabled)
      .map((event) => {
        const occurrence = getNextOccurrence(event, currentTime)
        return occurrence ? { event, occurrence, schedule: activeSchedule } : null
      })
      .filter((item): item is UpcomingEventInfo => Boolean(item))

    occurrences.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime())
    return occurrences[0] ?? null
  }, [activeSchedule, currentTime])

  const { playEvent, previewSound, downloadAudio: engineDownloadAudio, readySoundIds, isAnyAudioReady, lastError } = useSchoolBellEngine(state.audioAssets)

  // تحديث حالة التخزين المحلي للملف الصوتي
  const updateAudioCacheStatus = useCallback((soundId: string, status: CacheStatus) => {
    setState((prev) => ({
      ...prev,
      audioAssets: prev.audioAssets.map((asset) =>
        asset.id === soundId ? { ...asset, cacheStatus: status } : asset
      ),
    }))
  }, [])

  // تحميل ملف صوتي مع تتبع الحالة
  const downloadAudio = useCallback(
    async (soundId: string, onProgress?: (progress: number) => void): Promise<boolean> => {
      updateAudioCacheStatus(soundId, 'downloading')
      try {
        const success = await engineDownloadAudio(soundId, onProgress)
        updateAudioCacheStatus(soundId, success ? 'cached' : 'error')
        return success
      } catch {
        updateAudioCacheStatus(soundId, 'error')
        return false
      }
    },
    [engineDownloadAudio, updateAudioCacheStatus],
  )

  // التحقق من حالة التخزين المحلي عند تحميل الصفحة
  useEffect(() => {
    if (disabled || typeof window === 'undefined' || state.audioAssets.length === 0) return

    async function checkCacheStatus() {
      const cachedList = await listCachedAudios()
      const cachedIds = new Set(cachedList.map((entry) => entry.id))

      setState((prev) => ({
        ...prev,
        audioAssets: prev.audioAssets.map((asset) => ({
          ...asset,
          cacheStatus: cachedIds.has(asset.id) ? 'cached' : 'not-cached',
        })),
      }))
    }

    checkCacheStatus()
  }, [disabled, state.audioAssets.length])

  const appendRuntimeLog = useCallback((entry: RuntimeLogEntry) => {
    setRuntimeLog((prev) => [entry, ...prev].slice(0, 20))
  }, [])

  const updateRuntimeLogStatus = useCallback((logId: string, outcome: PlaybackOutcome) => {
    setRuntimeLog((prev) =>
      prev.map((entry) =>
        entry.id === logId
          ? {
              ...entry,
              status: outcome === 'failed' ? 'skipped' : 'played',
              notes:
                outcome === 'failed'
                  ? 'تعذر تشغيل النغمة المحددة.'
                  : outcome === 'fallback-played'
                  ? 'تم تشغيل النغمة الاحتياطية بسبب تعذر الوصول إلى الملف الأصلي.'
                  : 'تم تشغيل النغمة الأصلية بنجاح.',
            }
          : entry,
      ),
    )
  }, [])

  const handleScheduledTrigger = useCallback(
    async ({ event, occurrence, source }: { event: BellEvent; occurrence: Date; source: 'foreground' | 'background' }) => {
  const logId = createId()
      appendRuntimeLog({
        id: logId,
        eventId: event.id,
        title: event.title,
        executedAt: occurrence.toISOString(),
        status: 'pending-playback',
        source,
      })

      let outcome: PlaybackOutcome = 'failed'
      try {
        outcome = await playEvent(event)
      } catch (error) {
        console.error('تعذر تشغيل النغمة المجدولة', error)
      }

      if (!isMountedRef.current) return
      updateRuntimeLogStatus(logId, outcome)
    },
    [appendRuntimeLog, playEvent, updateRuntimeLogStatus],
  )

  const schedulerEnabled = Boolean(state.backgroundExecution && upcomingEvent?.schedule.allowBackgroundExecution)

  useBellScheduler({
    enabled: schedulerEnabled,
    upcomingEvent,
    onTrigger: handleScheduledTrigger,
  })

  const handleManualTrigger = useCallback(
    async (event: BellEvent) => {
      const occurrence = new Date()
      const logId = createId()
      appendRuntimeLog({
        id: logId,
        eventId: event.id,
        title: event.title,
        executedAt: occurrence.toISOString(),
        status: 'pending-playback',
        source: 'manual',
      })

      let outcome: PlaybackOutcome = 'failed'
      try {
        outcome = await playEvent(event)
      } catch (error) {
        console.error('تعذر تشغيل النغمة يدويًا', error)
      }

      if (!isMountedRef.current) return
      updateRuntimeLogStatus(logId, outcome)
    },
    [appendRuntimeLog, playEvent, updateRuntimeLogStatus],
  )

  const value = useMemo<BellManagerContextValue>(
    () => ({
      state,
      updateState,
      setWidgetVisibility,
      toggleWidgetVisibility,
      currentTime,
      runtimeLog,
      appendRuntimeLog,
      updateRuntimeLogStatus,
      upcomingEvent,
      schedulerEnabled,
      playEvent,
      previewSound,
      downloadAudio,
      updateAudioCacheStatus,
      handleManualTrigger,
      toneProfileMap,
      audioAssetMap,
      readySoundIds,
      isAnyAudioReady,
      lastError,
      activeSchedule,
      activeToneProfile,
    }),
    [
      state,
      updateState,
      currentTime,
      runtimeLog,
      appendRuntimeLog,
      updateRuntimeLogStatus,
      upcomingEvent,
      schedulerEnabled,
      playEvent,
      previewSound,
      downloadAudio,
      updateAudioCacheStatus,
      handleManualTrigger,
      toneProfileMap,
      audioAssetMap,
      readySoundIds,
      isAnyAudioReady,
      lastError,
      activeSchedule,
      activeToneProfile,
      setWidgetVisibility,
      toggleWidgetVisibility,
    ],
  )

  return <BellManagerContext.Provider value={value}>{children}</BellManagerContext.Provider>
}
// eslint-disable-next-line react-refresh/only-export-components
export function useBellManager() {
  const context = useContext(BellManagerContext)
  if (!context) {
    throw new Error('useBellManager يجب أن يُستخدم داخل BellManagerProvider')
  }
  return context
}

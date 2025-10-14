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
  handleManualTrigger: (event: BellEvent) => Promise<void>
  toneProfileMap: Map<string, ToneProfile>
  audioAssetMap: Map<string, BellAudioAsset>
  readySoundIds: string[]
  isAnyAudioReady: boolean
  lastError: string | null
  activeSchedule: BellSchedule | null
  activeToneProfile: ToneProfile | null
}

const BellManagerContext = createContext<BellManagerContextValue | null>(null)

export function BellManagerProvider({ children }: { children: ReactNode }) {
  const initialStateRef = useRef<BellManagerState | null>(null)
  if (!initialStateRef.current) {
    initialStateRef.current = loadInitialState()
  }

  const [state, setState] = useState<BellManagerState>(() => initialStateRef.current as BellManagerState)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [runtimeLog, setRuntimeLog] = useState<RuntimeLogEntry[]>([])
  const isMountedRef = useRef(true)

  const updateState = useCallback(
    (updater: BellManagerContextValue['state'] | ((prev: BellManagerState) => BellManagerState)) => {
      setState((prev) => (typeof updater === 'function' ? (updater as (prev: BellManagerState) => BellManagerState)(prev) : updater))
    },
  []);

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
    if (typeof window === 'undefined') return
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

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

  const { playEvent, previewSound, readySoundIds, isAnyAudioReady, lastError } = useSchoolBellEngine(state.audioAssets)

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

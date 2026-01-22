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
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { subscribeToAutoCallChannel } from '@/services/echo'
import { AUTO_CALL_HISTORY_LIMIT, DEFAULT_AUTO_CALL_SETTINGS } from '../constants'
import {
  getAutoCallSettings,
  updateAutoCallSettings as apiUpdateSettings,
  getAutoCallQueue,
  enqueueAutoCall as apiEnqueueCall,
  updateAutoCallStatus as apiUpdateStatus,
  acknowledgeAutoCall as apiAcknowledgeCall,
  getTodayAutoCallHistory,
  getGuardianStatuses,
  recordGuardianStrike as apiRecordStrike,
  unblockGuardian as apiUnblockGuardian,
  normalizeQueueEntryFromApi,
  normalizeSettingsFromApi,
} from '../api/auto-call-api'
import type {
  AutoCallGuardianStatus,
  AutoCallHistoryEntry,
  AutoCallQueueEntry,
  AutoCallSettings,
  EnqueueAutoCallPayload,
  UpdateAutoCallStatusOptions,
} from '../types'

interface AutoCallProviderProps {
  children: ReactNode
  schoolIdOverride?: string | null
  historyLimit?: number
  allowFallbackSchoolId?: boolean
  /** إذا كان true، لن يتم تفعيل الاستماع للـ API/Echo */
  disabled?: boolean
}

interface AutoCallLoadingState {
  settings: boolean
  queue: boolean
  history: boolean
  guardians: boolean
}

interface AutoCallContextValue {
  schoolId: string | null
  settings: AutoCallSettings | null
  queue: AutoCallQueueEntry[]
  history: AutoCallHistoryEntry[]
  guardianStatuses: Map<string, AutoCallGuardianStatus>
  loading: AutoCallLoadingState
  error: string | null
  updateSettings: (payload: Partial<AutoCallSettings>) => Promise<void>
  enqueueCall: (payload: EnqueueAutoCallPayload) => Promise<string>
  updateCallStatus: (callId: string, options: UpdateAutoCallStatusOptions) => Promise<void>
  acknowledgeCall: (callId: string, acknowledgedBy: 'guardian' | 'admin') => Promise<void>
  recordGuardianStrike: (guardianNationalId: string, reason?: string | null) => Promise<void>
  blockGuardian: (guardianNationalId: string, blockedUntil: Date | null) => Promise<void>
  unblockGuardian: (guardianNationalId: string) => Promise<void>
  isGuardianBlocked: (guardianNationalId: string, at?: Date) => boolean
  /** إعادة تحميل البيانات من الـ API */
  refresh: () => Promise<void>
}

const AutoCallContext = createContext<AutoCallContextValue | null>(null)

function resolveEnvGeofence(): AutoCallSettings['geofence'] | null {
  const rawLat = import.meta.env.VITE_AUTO_CALL_SCHOOL_LAT
  const rawLng = import.meta.env.VITE_AUTO_CALL_SCHOOL_LNG
  const rawRadius = import.meta.env.VITE_AUTO_CALL_ALLOWED_RADIUS_METERS

  if (rawLat == null || rawLat === '' || rawLng == null || rawLng === '') {
    return null
  }

  const lat = Number(rawLat)
  const lng = Number(rawLng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null
  }

  const radius = Number(rawRadius)

  return {
    latitude: lat,
    longitude: lng,
    radiusMeters: Number.isFinite(radius) && radius > 0 ? radius : 150,
  }
}

export function AutoCallProvider({
  children,
  schoolIdOverride = null,
  historyLimit = AUTO_CALL_HISTORY_LIMIT,
  allowFallbackSchoolId = true,
  disabled = false,
}: AutoCallProviderProps) {
  const authSchoolId = useAuthStore((state) => state.user?.school_id)
  const token = useAuthStore((state) => state.token)

  const fallbackSchoolId = useMemo(() => {
    if (!allowFallbackSchoolId) {
      return null
    }
    const raw = import.meta.env.VITE_AUTO_CALL_FALLBACK_SCHOOL_ID
    if (raw == null || raw === '') {
      return null
    }
    return String(raw)
  }, [allowFallbackSchoolId])

  const schoolId = useMemo(() => {
    return schoolIdOverride != null
      ? schoolIdOverride
      : authSchoolId != null
        ? String(authSchoolId)
        : fallbackSchoolId
  }, [authSchoolId, fallbackSchoolId, schoolIdOverride])

  const envGeofence = useMemo(resolveEnvGeofence, [])

  const [settings, setSettings] = useState<AutoCallSettings | null>(null)
  const [queue, setQueue] = useState<AutoCallQueueEntry[]>([])
  const [history, setHistory] = useState<AutoCallHistoryEntry[]>([])
  const [guardianStatuses, setGuardianStatuses] = useState<Map<string, AutoCallGuardianStatus>>(new Map())
  const [loading, setLoading] = useState<AutoCallLoadingState>({ settings: false, queue: false, history: false, guardians: false })
  const [error, setError] = useState<string | null>(null)

  // Track if initial load is done
  const initialLoadDone = useRef(false)

  // Fetch all data from API
  const fetchAllData = useCallback(async () => {
    if (disabled || !schoolId || !token) {
      setSettings(null)
      setQueue([])
      setHistory([])
      setGuardianStatuses(new Map())
      return
    }

    setLoading({ settings: true, queue: true, history: true, guardians: true })
    setError(null)

    try {
      // Fetch all data in parallel
      const [settingsData, queueData, historyData, guardiansData] = await Promise.all([
        getAutoCallSettings().catch(() => null),
        getAutoCallQueue().catch(() => []),
        getTodayAutoCallHistory().catch(() => []),
        getGuardianStatuses().catch(() => []),
      ])

      // Apply settings with env geofence fallback
      if (settingsData) {
        setSettings({
          ...settingsData,
          geofence: settingsData.geofence ?? envGeofence ?? null,
        })
      } else {
        setSettings({
          ...DEFAULT_AUTO_CALL_SETTINGS,
          geofence: envGeofence ?? null,
        })
      }

      setQueue(queueData)
      setHistory(historyData.slice(0, historyLimit))

      // Convert guardians array to Map
      const guardiansMap = new Map<string, AutoCallGuardianStatus>()
      guardiansData.forEach((g) => guardiansMap.set(g.guardianNationalId, g))
      setGuardianStatuses(guardiansMap)

      initialLoadDone.current = true
    } catch (err) {
      console.error('Failed to fetch auto-call data:', err)
      setError(err instanceof Error ? err.message : 'حدث خطأ في تحميل بيانات النداء الآلي')
    } finally {
      setLoading({ settings: false, queue: false, history: false, guardians: false })
    }
  }, [disabled, schoolId, token, envGeofence, historyLimit])

  // Initial data fetch
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Subscribe to Echo channel for real-time updates
  useEffect(() => {
    if (disabled || !schoolId || !token) {
      return
    }

    const unsubscribe = subscribeToAutoCallChannel(schoolId, {
      onEnqueued: (data) => {
        // Add new call to queue
        const newEntry = normalizeQueueEntryFromApi(data as Record<string, unknown>)
        setQueue((prev) => [...prev, newEntry].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ))
      },

      onStatusUpdated: (data) => {
        const updated = normalizeQueueEntryFromApi(data as Record<string, unknown>)

        // If status is terminal (expired, cancelled, acknowledged), remove from queue
        if (['expired', 'cancelled', 'acknowledged'].includes(updated.status)) {
          setQueue((prev) => prev.filter((q) => q.id !== updated.id))
          // Optionally add to history
          if (updated.status !== 'cancelled') {
            setHistory((prev) => [{
              ...updated,
              resolvedAt: new Date().toISOString(),
              resolutionNotes: null,
            }, ...prev].slice(0, historyLimit))
          }
        } else {
          // Update in queue
          setQueue((prev) => prev.map((q) => q.id === updated.id ? updated : q))
        }
      },

      onAcknowledged: (data) => {
        const updated = normalizeQueueEntryFromApi(data as Record<string, unknown>)
        // Remove from queue and add to history
        setQueue((prev) => prev.filter((q) => q.id !== updated.id))
        setHistory((prev) => [{
          ...updated,
          resolvedAt: updated.acknowledgedAt ?? new Date().toISOString(),
          resolutionNotes: null,
        }, ...prev].slice(0, historyLimit))
      },

      onSettingsUpdated: (data) => {
        const updated = normalizeSettingsFromApi(data as Record<string, unknown>)
        setSettings({
          ...updated,
          geofence: updated.geofence ?? envGeofence ?? null,
        })
      },
    })

    return () => {
      unsubscribe()
    }
  }, [disabled, schoolId, token, envGeofence, historyLimit])

  // ============ Actions ============

  const updateSettings = useCallback(async (payload: Partial<AutoCallSettings>) => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن تحديث الإعدادات قبل تحديد المدرسة')
    }

    const updated = await apiUpdateSettings(payload)
    setSettings({
      ...updated,
      geofence: updated.geofence ?? envGeofence ?? null,
    })
  }, [schoolId, token, envGeofence])

  const enqueueCall = useCallback(async (payload: EnqueueAutoCallPayload): Promise<string> => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن إنشاء مناداة بدون مدرسة محددة')
    }

    const newEntry = await apiEnqueueCall(payload)
    // Entry will be added via Echo event, but add optimistically
    setQueue((prev) => {
      if (prev.some((q) => q.id === newEntry.id)) {
        return prev
      }
      return [...prev, newEntry].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    })
    return newEntry.id
  }, [schoolId, token])

  const updateCallStatus = useCallback(async (callId: string, options: UpdateAutoCallStatusOptions) => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن تحديث حالة المناداة')
    }

    const updated = await apiUpdateStatus(callId, options.status, options.notes)

    // Optimistic update
    if (['expired', 'cancelled', 'acknowledged'].includes(updated.status)) {
      setQueue((prev) => prev.filter((q) => q.id !== callId))
    } else {
      setQueue((prev) => prev.map((q) => q.id === callId ? updated : q))
    }
  }, [schoolId, token])

  const acknowledgeCall = useCallback(async (callId: string, acknowledgedBy: 'guardian' | 'admin') => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن تأكيد استلام المناداة')
    }

    const updated = await apiAcknowledgeCall(callId, acknowledgedBy)

    // Optimistic update - remove from queue
    setQueue((prev) => prev.filter((q) => q.id !== callId))
    setHistory((prev) => [{
      ...updated,
      resolvedAt: updated.acknowledgedAt ?? new Date().toISOString(),
      resolutionNotes: null,
    }, ...prev].slice(0, historyLimit))
  }, [schoolId, token, historyLimit])

  const recordGuardianStrike = useCallback(async (guardianNationalId: string, reason?: string | null) => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن تسجيل المخالفة')
    }

    const updated = await apiRecordStrike(guardianNationalId, reason)
    setGuardianStatuses((prev) => {
      const next = new Map(prev)
      next.set(guardianNationalId, updated)
      return next
    })
  }, [schoolId, token])

  const blockGuardian = useCallback(async (_guardianNationalId: string, _blockedUntil: Date | null) => {
    // This functionality is handled server-side through strikes
    // Keeping the method for API compatibility
    console.warn('blockGuardian: Use recordGuardianStrike instead for automatic blocking')
  }, [])

  const unblockGuardian = useCallback(async (guardianNationalId: string) => {
    if (!schoolId || !token) {
      throw new Error('لا يمكن تعديل حالة الحظر')
    }

    await apiUnblockGuardian(guardianNationalId)
    setGuardianStatuses((prev) => {
      const next = new Map(prev)
      const existing = next.get(guardianNationalId)
      if (existing) {
        next.set(guardianNationalId, { ...existing, blockedUntil: null, strikeCount: 0 })
      }
      return next
    })
  }, [schoolId, token])

  const isGuardianBlocked = useCallback((guardianNationalId: string, at: Date = new Date()) => {
    const status = guardianStatuses.get(guardianNationalId)
    if (!status?.blockedUntil) {
      return false
    }
    const blockedUntilDate = new Date(status.blockedUntil)
    return blockedUntilDate.getTime() > at.getTime()
  }, [guardianStatuses])

  const refresh = useCallback(async () => {
    await fetchAllData()
  }, [fetchAllData])

  const value = useMemo<AutoCallContextValue>(() => ({
    schoolId,
    settings,
    queue,
    history,
    guardianStatuses,
    loading,
    error,
    updateSettings,
    enqueueCall,
    updateCallStatus,
    acknowledgeCall,
    recordGuardianStrike,
    blockGuardian,
    unblockGuardian,
    isGuardianBlocked,
    refresh,
  }), [
    acknowledgeCall,
    blockGuardian,
    enqueueCall,
    error,
    guardianStatuses,
    history,
    isGuardianBlocked,
    loading,
    queue,
    recordGuardianStrike,
    refresh,
    schoolId,
    settings,
    unblockGuardian,
    updateCallStatus,
    updateSettings,
  ])

  return <AutoCallContext.Provider value={value}>{children}</AutoCallContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAutoCall() {
  const context = useContext(AutoCallContext)
  if (!context) {
    throw new Error('useAutoCall يجب أن يُستخدم داخل AutoCallProvider')
  }
  return context
}

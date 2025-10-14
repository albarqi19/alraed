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
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import { getFirestoreClient } from '@/services/firebase'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { AUTO_CALL_HISTORY_LIMIT, DEFAULT_AUTO_CALL_SETTINGS } from '../constants'
import {
  autoCallGuardiansPath,
  autoCallHistoryPath,
  autoCallQueuePath,
  autoCallSettingsPath,
} from '../firestore-paths'
import type {
  AutoCallGuardianStatus,
  AutoCallHistoryEntry,
  AutoCallQueueEntry,
  AutoCallSettings,
  AutoCallStatus,
  EnqueueAutoCallPayload,
  UpdateAutoCallStatusOptions,
} from '../types'

interface AutoCallProviderProps {
  children: ReactNode
  schoolIdOverride?: string | null
  historyLimit?: number
  allowFallbackSchoolId?: boolean
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
}

const AutoCallContext = createContext<AutoCallContextValue | null>(null)

function normalizeTimestamp(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const date = (value as Timestamp).toDate()
      return date.toISOString()
    } catch (error) {
      console.warn('Failed to normalize timestamp', error)
    }
  }
  return null
}

function normalizeSettings(data: DocumentData | undefined, envGeofence: AutoCallSettings['geofence'] | null): AutoCallSettings {
  console.log('🔧 normalizeSettings called with:', { data, envGeofence })
  
  const base: AutoCallSettings = {
    ...DEFAULT_AUTO_CALL_SETTINGS,
    geofence: envGeofence ?? DEFAULT_AUTO_CALL_SETTINGS.geofence ?? null,
  }

  if (!data) {
    console.log('⚠️ No data provided, returning base settings:', base)
    return base
  }

  const geofenceRecord = data.geofence ?? envGeofence ?? null

  const normalized = {
    ...base,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : base.enabled,
    openFrom: typeof data.openFrom === 'string' ? data.openFrom : null,
    openUntil: typeof data.openUntil === 'string' ? data.openUntil : null,
    repeatIntervalSeconds: typeof data.repeatIntervalSeconds === 'number' ? data.repeatIntervalSeconds : base.repeatIntervalSeconds,
    announcementDurationSeconds:
      typeof data.announcementDurationSeconds === 'number'
        ? data.announcementDurationSeconds
        : base.announcementDurationSeconds,
    enableSpeech: typeof data.enableSpeech === 'boolean' ? data.enableSpeech : base.enableSpeech,
    voiceGender: data.voiceGender ?? base.voiceGender,
    voiceLocale: typeof data.voiceLocale === 'string' ? data.voiceLocale : base.voiceLocale,
    allowGuardianAcknowledgement:
      typeof data.allowGuardianAcknowledgement === 'boolean'
        ? data.allowGuardianAcknowledgement
        : base.allowGuardianAcknowledgement,
    geofence:
      geofenceRecord && typeof geofenceRecord === 'object'
        ? normalizeGeofence(geofenceRecord) ?? base.geofence ?? null
        : base.geofence ?? null,
    maxStrikesBeforeBlock:
      typeof data.maxStrikesBeforeBlock === 'number' ? data.maxStrikesBeforeBlock : base.maxStrikesBeforeBlock,
    blockDurationMinutes:
      typeof data.blockDurationMinutes === 'number' ? data.blockDurationMinutes : base.blockDurationMinutes,
    displayTheme: data.displayTheme === 'light' ? 'light' : base.displayTheme,
    updatedAt: normalizeTimestamp(data.updatedAt) ?? base.updatedAt ?? null,
    createdAt: normalizeTimestamp(data.createdAt) ?? base.createdAt ?? null,
  }
  
  console.log('✅ Returning normalized settings:', normalized)
  return normalized
}

function normalizeGeofence(value: unknown): AutoCallSettings['geofence'] | null {
  if (!value || typeof value !== 'object') return null
  const latitude = Number((value as Record<string, unknown>).latitude ?? (value as Record<string, unknown>).lat)
  const longitude = Number((value as Record<string, unknown>).longitude ?? (value as Record<string, unknown>).lng)
  const radiusMeters = Number((value as Record<string, unknown>).radiusMeters ?? (value as Record<string, unknown>).radius)

  if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(radiusMeters)) {
    return { latitude, longitude, radiusMeters }
  }
  return null
}

function normalizeQueueEntry(docId: string, data: DocumentData): AutoCallQueueEntry {
  return {
    id: docId,
    studentId: Number.isFinite(Number(data.studentId)) ? Number(data.studentId) : null,
    studentNationalId: typeof data.studentNationalId === 'string' ? data.studentNationalId : '',
    studentName: typeof data.studentName === 'string' ? data.studentName : '',
    classLabel: typeof data.classLabel === 'string' ? data.classLabel : null,
    guardianName: typeof data.guardianName === 'string' ? data.guardianName : null,
    guardianPhone: typeof data.guardianPhone === 'string' ? data.guardianPhone : null,
    createdAt: normalizeTimestamp(data.createdAt) ?? new Date().toISOString(),
    status: (['pending', 'announcing', 'acknowledged', 'expired', 'cancelled'] as AutoCallStatus[]).includes(data.status)
      ? (data.status as AutoCallStatus)
      : 'pending',
    lastAnnouncedAt: normalizeTimestamp(data.lastAnnouncedAt),
    announcedCount: typeof data.announcedCount === 'number' ? data.announcedCount : 0,
    acknowledgedAt: normalizeTimestamp(data.acknowledgedAt),
    acknowledgedBy:
      data.acknowledgedBy === 'guardian' || data.acknowledgedBy === 'admin' ? data.acknowledgedBy : null,
    expiresAt: normalizeTimestamp(data.expiresAt),
    notes: typeof data.notes === 'string' ? data.notes : null,
  }
}

function normalizeGuardianStatus(docId: string, data: DocumentData): AutoCallGuardianStatus {
  return {
    guardianNationalId: typeof data.guardianNationalId === 'string' ? data.guardianNationalId : docId,
    strikeCount: typeof data.strikeCount === 'number' ? data.strikeCount : 0,
    blockedUntil: normalizeTimestamp(data.blockedUntil),
    lastViolationAt: normalizeTimestamp(data.lastViolationAt),
    lastStrikeReason: typeof data.lastStrikeReason === 'string' ? data.lastStrikeReason : null,
  }
}

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
}: AutoCallProviderProps) {
  const authSchoolId = useAuthStore((state) => state.user?.school_id)
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
    const resolved = schoolIdOverride != null
      ? schoolIdOverride
      : authSchoolId != null
        ? String(authSchoolId)
        : fallbackSchoolId
    
    console.log('🏫 School ID resolution:', {
      schoolIdOverride,
      authSchoolId,
      fallbackSchoolId,
      allowFallbackSchoolId,
      'VITE_AUTO_CALL_FALLBACK_SCHOOL_ID': import.meta.env.VITE_AUTO_CALL_FALLBACK_SCHOOL_ID,
      resolved,
    })
    
    return resolved
  }, [allowFallbackSchoolId, authSchoolId, fallbackSchoolId, schoolIdOverride])

  const envGeofence = useMemo(resolveEnvGeofence, [])

  const [settings, setSettings] = useState<AutoCallSettings | null>(null)
  const [queue, setQueue] = useState<AutoCallQueueEntry[]>([])
  const [history, setHistory] = useState<AutoCallHistoryEntry[]>([])
  const [guardianStatuses, setGuardianStatuses] = useState<Map<string, AutoCallGuardianStatus>>(new Map())
  const [loading, setLoading] = useState<AutoCallLoadingState>({ settings: false, queue: false, history: false, guardians: false })
  const [error, setError] = useState<string | null>(null)
  const firestoreRef = useRef<Firestore | null>(null)

  useEffect(() => {
    try {
      firestoreRef.current = getFirestoreClient()
      setError(null)
    } catch (initializationError) {
      console.error('فشل تهيئة Firebase للاستخدام في النداء الآلي', initializationError)
      setError(initializationError instanceof Error ? initializationError.message : 'تعذر تهيئة Firebase')
    }
  }, [])

  useEffect(() => {
    if (!schoolId || !firestoreRef.current) {
      setSettings(null)
      return
    }

    const db = firestoreRef.current
    const settingsRef = doc(db, ...autoCallSettingsPath(schoolId))
    setLoading((prev) => ({ ...prev, settings: true }))

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        console.log('📡 Firestore settings snapshot received:', {
          exists: snapshot.exists(),
          data: snapshot.data(),
          path: settingsRef.path,
          schoolId,
        })
        setLoading((prev) => ({ ...prev, settings: false }))
        setError(null)
        const normalizedSettings = normalizeSettings(snapshot.data(), envGeofence)
        console.log('✨ Normalized settings:', normalizedSettings)
        setSettings(normalizedSettings)
      },
      (snapshotError) => {
        console.error('Failed to subscribe to auto-call settings', snapshotError)
        setLoading((prev) => ({ ...prev, settings: false }))
        setError(snapshotError.message)
      },
    )

    return () => unsubscribe()
  }, [envGeofence, schoolId])

  useEffect(() => {
    if (!schoolId || !firestoreRef.current) {
      setQueue([])
      return
    }

    const db = firestoreRef.current
    const queuePath = autoCallQueuePath(schoolId)
    setLoading((prev) => ({ ...prev, queue: true }))
    const queueQuery = query(
      collection(db, ...queuePath),
      orderBy('createdAt', 'asc'),
    )

    const unsubscribe = onSnapshot(
      queueQuery,
      (snapshot) => {
        setLoading((prev) => ({ ...prev, queue: false }))
        const entries = snapshot.docs.map((docSnapshot) => normalizeQueueEntry(docSnapshot.id, docSnapshot.data()))
        setQueue(entries)
      },
      (snapshotError) => {
        console.error('Failed to subscribe to auto-call queue', snapshotError)
        setLoading((prev) => ({ ...prev, queue: false }))
        setError(snapshotError.message)
      },
    )

    return () => unsubscribe()
  }, [schoolId])

  useEffect(() => {
    if (!schoolId || !firestoreRef.current) {
      setHistory([])
      return
    }

    const db = firestoreRef.current
    const historyPath = autoCallHistoryPath(schoolId)
    setLoading((prev) => ({ ...prev, history: true }))
    const historyQuery = query(
      collection(db, ...historyPath),
      orderBy('resolvedAt', 'desc'),
      limit(historyLimit),
    )

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        setLoading((prev) => ({ ...prev, history: false }))
        const entries = snapshot.docs.map((docSnapshot) => {
          const base = normalizeQueueEntry(docSnapshot.id, docSnapshot.data())
          return {
            ...base,
            resolvedAt: normalizeTimestamp(docSnapshot.data().resolvedAt),
            resolutionNotes: typeof docSnapshot.data().resolutionNotes === 'string' ? docSnapshot.data().resolutionNotes : null,
          }
        })
        setHistory(entries)
      },
      (snapshotError) => {
        console.error('Failed to subscribe to auto-call history', snapshotError)
        setLoading((prev) => ({ ...prev, history: false }))
        setError(snapshotError.message)
      },
    )

    return () => unsubscribe()
  }, [historyLimit, schoolId])

  useEffect(() => {
    if (!schoolId || !firestoreRef.current) {
      setGuardianStatuses(new Map())
      return
    }

    const db = firestoreRef.current
    const guardiansPath = autoCallGuardiansPath(schoolId)
    setLoading((prev) => ({ ...prev, guardians: true }))

    const unsubscribe = onSnapshot(
      collection(db, ...guardiansPath),
      (snapshot) => {
        setLoading((prev) => ({ ...prev, guardians: false }))
        const nextMap = new Map<string, AutoCallGuardianStatus>()
        snapshot.forEach((docSnapshot) => {
          const status = normalizeGuardianStatus(docSnapshot.id, docSnapshot.data())
          nextMap.set(status.guardianNationalId, status)
        })
        setGuardianStatuses(nextMap)
      },
      (snapshotError) => {
        console.error('Failed to subscribe to auto-call guardian statuses', snapshotError)
        setLoading((prev) => ({ ...prev, guardians: false }))
        setError(snapshotError.message)
      },
    )

    return () => unsubscribe()
  }, [schoolId])

  const updateSettings = useCallback(async (payload: Partial<AutoCallSettings>) => {
    if (!schoolId || !firestoreRef.current) {
      throw new Error('لا يمكن تحديث الإعدادات قبل تحديد المدرسة')
    }

    const db = firestoreRef.current
    const settingsRef = doc(db, ...autoCallSettingsPath(schoolId))
    
    // تحقق من وجود الوثيقة أولاً
    const snapshot = await getDoc(settingsRef)
    const exists = snapshot.exists()
    
    const { geofence, ...rest } = payload
    
    const updateData: Record<string, unknown> = {
      ...rest,
      ...(geofence !== undefined ? { geofence } : {}),
      updatedAt: serverTimestamp(),
    }
    
    // أضف createdAt فقط إذا كانت الوثيقة جديدة
    if (!exists) {
      updateData.createdAt = serverTimestamp()
    }

    await setDoc(settingsRef, updateData, { merge: true })
  }, [schoolId])

  const enqueueCall = useCallback(async (payload: EnqueueAutoCallPayload) => {
    if (!schoolId || !firestoreRef.current) {
      throw new Error('لا يمكن إنشاء مناداة بدون مدرسة محددة')
    }

    const db = firestoreRef.current
    const queuePath = autoCallQueuePath(schoolId)
    const nowIso = new Date().toISOString()

    const docRef = await addDoc(collection(db, ...queuePath), {
      studentId: payload.studentId ?? null,
      studentNationalId: payload.studentNationalId,
      studentName: payload.studentName,
      classLabel: payload.classLabel ?? null,
      guardianName: payload.guardianName ?? null,
      guardianPhone: payload.guardianPhone ?? null,
      createdAt: nowIso,
      status: 'pending',
      announcedCount: 0,
      requestedBy: payload.requestedBy,
      notes: payload.notes ?? null,
    })

    return docRef.id
  }, [schoolId])

  const updateCallStatus = useCallback(async (callId: string, options: UpdateAutoCallStatusOptions) => {
    if (!schoolId || !firestoreRef.current) {
      throw new Error('لا يمكن تحديث حالة المناداة')
    }

  const db = firestoreRef.current
  const callDoc = doc(db, ...autoCallQueuePath(schoolId), callId)

    await updateDoc(callDoc, {
      status: options.status,
      acknowledgedBy: options.acknowledgedBy ?? null,
      acknowledgedAt: options.acknowledgedBy ? new Date().toISOString() : null,
      notes: options.notes ?? null,
    })
  }, [schoolId])

  const acknowledgeCall = useCallback(async (callId: string, acknowledgedBy: 'guardian' | 'admin') => {
    await updateCallStatus(callId, { status: 'acknowledged', acknowledgedBy })
  }, [updateCallStatus])

  const recordGuardianStrike = useCallback(async (guardianNationalId: string, reason?: string | null) => {
    if (!schoolId || !firestoreRef.current) {
      throw new Error('لا يمكن تسجيل المخالفة')
    }

    const db = firestoreRef.current
    const guardiansPath = autoCallGuardiansPath(schoolId)
    const now = new Date()

    await runTransaction(db, async (transaction) => {
      const statusRef = doc(db, ...guardiansPath, guardianNationalId)
      const snapshot = await transaction.get(statusRef)
      const existing = snapshot.exists() ? normalizeGuardianStatus(snapshot.id, snapshot.data() ?? {}) : null
      const nextStrikeCount = (existing?.strikeCount ?? 0) + 1

      let blockedUntil: string | null = existing?.blockedUntil ?? null
      const lastViolationAt = now.toISOString()

      const strikesThreshold = settings?.maxStrikesBeforeBlock ?? DEFAULT_AUTO_CALL_SETTINGS.maxStrikesBeforeBlock
      const blockDurationMinutes = settings?.blockDurationMinutes ?? DEFAULT_AUTO_CALL_SETTINGS.blockDurationMinutes

      if (nextStrikeCount >= strikesThreshold) {
        blockedUntil = new Date(now.getTime() + blockDurationMinutes * 60 * 1000).toISOString()
      }

      transaction.set(
        statusRef,
        {
          guardianNationalId,
          strikeCount: nextStrikeCount,
          blockedUntil,
          lastViolationAt,
          lastStrikeReason: reason ?? null,
        },
        { merge: true },
      )
    })
  }, [schoolId, settings])

  const blockGuardian = useCallback(async (guardianNationalId: string, blockedUntil: Date | null) => {
    if (!schoolId || !firestoreRef.current) {
      throw new Error('لا يمكن تعديل حالة الحظر')
    }

    const db = firestoreRef.current
    const guardiansPath = autoCallGuardiansPath(schoolId)
    await setDoc(
      doc(db, ...guardiansPath, guardianNationalId),
      {
        guardianNationalId,
        blockedUntil: blockedUntil ? blockedUntil.toISOString() : null,
      },
      { merge: true },
    )
  }, [schoolId])

  const unblockGuardian = useCallback(async (guardianNationalId: string) => {
    await blockGuardian(guardianNationalId, null)
  }, [blockGuardian])

  const isGuardianBlocked = useCallback((guardianNationalId: string, at: Date = new Date()) => {
    const status = guardianStatuses.get(guardianNationalId)
    if (!status?.blockedUntil) {
      return false
    }
    const blockedUntilDate = new Date(status.blockedUntil)
    return blockedUntilDate.getTime() > at.getTime()
  }, [guardianStatuses])

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

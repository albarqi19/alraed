import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  useGuardianLeaveRequestSubmissionMutation,
  useGuardianLeaveRequestsQuery,
  useGuardianStudentLookupMutation,
  useGuardianSettingsQuery,
  useGuardianStoreOverviewQuery,
  useGuardianStoreCatalogQuery,
  useGuardianStoreOrdersQuery,
  useGuardianStoreOrderMutation,
} from '../hooks'
import type { GuardianLeaveRequestRecord, GuardianStudentSummary } from '../types'
import { GuardianStoreSection } from '../components/guardian-store-section'
import { AutoCallProvider, useAutoCall } from '@/modules/auto-call'
import type { AutoCallHistoryEntry, AutoCallQueueEntry } from '@/modules/auto-call'
import { useToast } from '@/shared/feedback/use-toast'
import { CheckCircle2, FileText, Gift, Loader2, MapPin, Megaphone, ShoppingCart } from 'lucide-react'

const STATUS_LABELS = {
  pending: 'بانتظار المراجعة',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
} as const

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
} as const

type StatusKey = keyof typeof STATUS_LABELS

type FormValues = {
  guardian_name: string
  guardian_phone: string
  reason: string
  pickup_person_name: string
  pickup_person_relation: string
  pickup_person_phone: string
  expected_pickup_time: string
}

type FormErrors = Partial<Record<keyof FormValues, string>> & { national_id?: string }

type PortalSection = 'none' | 'leave-request' | 'auto-call' | 'store'

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function normalizeDateTimeInput(value: string) {
  if (!value) return value
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return value
  const [hours = '00', minutes = '00'] = timePart.split(':')
  const normalizedHours = hours.padStart(2, '0')
  const normalizedMinutes = minutes.padStart(2, '0')
  return `${datePart} ${normalizedHours}:${normalizedMinutes}:00`
}

function computeDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

type GeofenceCoordinates = {
  latitude: number
  longitude: number
  radiusMeters: number
}

function sanitizeGeofenceInput(raw: unknown, source: 'firestore' | 'backend'): { geofence: GeofenceCoordinates | null; reason: string | null } {
  if (!raw || typeof raw !== 'object') {
    return { geofence: null, reason: 'لم يتم توفير إحداثيات صالحة.' }
  }

  const latitude = Number((raw as Record<string, unknown>).latitude ?? (raw as Record<string, unknown>).lat)
  const longitude = Number((raw as Record<string, unknown>).longitude ?? (raw as Record<string, unknown>).lng)
  const radiusSource =
    (raw as Record<string, unknown>).radiusMeters ??
    (raw as Record<string, unknown>).radius_meters ??
    (raw as Record<string, unknown>).radius
  const radiusMeters = Number(radiusSource)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusMeters)) {
    return { geofence: null, reason: 'الإحداثيات أو نصف القطر غير رقمية.' }
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { geofence: null, reason: 'قيم خطوط الطول أو العرض خارج النطاق المسموح.' }
  }

  if (radiusMeters <= 0) {
    return { geofence: null, reason: 'نطاق التغطية يجب أن يكون أكبر من الصفر.' }
  }

  if (latitude === 0 && longitude === 0) {
    const message = source === 'firestore' ? 'إحداثيات Firestore تساوي (0,0) ولا تبدو صحيحة.' : 'إحداثيات النظام الخلفي تساوي (0,0) ولا تبدو صحيحة.'
    return { geofence: null, reason: message }
  }

  return {
    geofence: {
      latitude,
      longitude,
      radiusMeters,
    },
    reason: null,
  }
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null
  const timeOnly = value.includes('T') ? value.split('T')[1]?.slice(0, 5) : value
  if (!timeOnly) return null
  const [hoursString, minutesString = '0'] = timeOnly.split(':')
  const hours = Number(hoursString)
  const minutes = Number(minutesString)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  return hours * 60 + minutes
}

function isWithinTimeWindow(options: { openFrom?: string | null; openUntil?: string | null }, reference: Date = new Date()) {
  const fromMinutes = parseTimeToMinutes(options.openFrom)
  const untilMinutes = parseTimeToMinutes(options.openUntil)
  if (fromMinutes == null && untilMinutes == null) {
    return true
  }

  const nowMinutes = reference.getHours() * 60 + reference.getMinutes()

  if (fromMinutes != null && untilMinutes != null) {
    if (fromMinutes <= untilMinutes) {
      return nowMinutes >= fromMinutes && nowMinutes <= untilMinutes
    }
    // Window crosses midnight
    return nowMinutes >= fromMinutes || nowMinutes <= untilMinutes
  }

  if (fromMinutes != null) {
    return nowMinutes >= fromMinutes
  }

  if (untilMinutes != null) {
    return nowMinutes <= untilMinutes
  }

  return true
}

function describeTimeWindow(options: { openFrom?: string | null; openUntil?: string | null }) {
  if (!options.openFrom && !options.openUntil) {
    return 'النداء متاح طوال اليوم الدراسي'
  }

  if (options.openFrom && options.openUntil) {
    return `النداء متاح من ${options.openFrom} حتى ${options.openUntil}`
  }

  if (options.openFrom) {
    return `النداء متاح ابتداءً من ${options.openFrom}`
  }

  if (options.openUntil) {
    return `النداء متاح حتى ${options.openUntil}`
  }

  return 'النداء متاح وفق الإعدادات الحالية'
}

function requestCurrentPosition(settings?: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('خدمة الموقع غير متاحة في هذا المتصفح'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, settings)
  })
}

function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function RequestsList({ requests }: { requests: GuardianLeaveRequestRecord[] }) {
  if (!requests.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
        لا توجد طلبات سابقة، يمكنك إرسال طلب جديد الآن.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">طلب رقم #{request.id}</h3>
            <StatusBadge status={request.status as StatusKey} />
          </header>

          <p className="text-sm text-slate-700">{request.reason}</p>

          <dl className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-500">موعد الانصراف</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(request.expected_pickup_time)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">تاريخ التقديم</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(request.submitted_at)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">قرار الإدارة</dt>
              <dd className="mt-1 text-slate-800">{request.decision_notes ? request.decision_notes : 'بانتظار القرار'}</dd>
            </div>
          </dl>

          {request.decision_at ? (
            <p className="mt-3 text-xs text-muted">تاريخ القرار: {formatDateTime(request.decision_at)}</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

type GuardianSettingsQueryResult = ReturnType<typeof useGuardianSettingsQuery>
type AutoCallContextValue = ReturnType<typeof useAutoCall>

interface GuardianLeaveRequestPageBaseProps {
  settingsQuery: GuardianSettingsQueryResult
  autoCall: AutoCallContextValue | null
  autoCallSchoolId: string | null
  activePortalSection: PortalSection
  onPortalSectionChange: (section: PortalSection) => void
  autoCallAvailabilityReason: string | null
}

function GuardianLeaveRequestPageBase({
  settingsQuery,
  autoCall,
  autoCallSchoolId,
  activePortalSection,
  onPortalSectionChange,
  autoCallAvailabilityReason,
}: GuardianLeaveRequestPageBaseProps) {
  const [nationalIdInput, setNationalIdInput] = useState('')
  const [currentNationalId, setCurrentNationalId] = useState<string | null>(null)
  const [studentSummary, setStudentSummary] = useState<GuardianStudentSummary | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({
    guardian_name: '',
    guardian_phone: '',
    reason: '',
    pickup_person_name: '',
    pickup_person_relation: '',
    pickup_person_phone: '',
    expected_pickup_time: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [autoCallStatus, setAutoCallStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle')
  const [autoCallError, setAutoCallError] = useState<string | null>(null)
  const [isCheckingLocation, setIsCheckingLocation] = useState(false)
  const leaveSectionRef = useRef<HTMLDivElement | null>(null)
  const autoCallSectionRef = useRef<HTMLElement | null>(null)
  const storeSectionRef = useRef<HTMLDivElement | null>(null)
  const [highlightSection, setHighlightSection] = useState<PortalSection>('none')

  const toast = useToast()
  const guardianSettings = settingsQuery.data
  const autoCallSettings = autoCall?.settings ?? null
  const autoCallQueue = autoCall?.queue ?? []
  const autoCallHistory = autoCall?.history ?? []
  const guardianStatuses = autoCall?.guardianStatuses ?? new Map()
  const isGuardianBlockedFn = autoCall?.isGuardianBlocked ?? (() => false)
  const acknowledgeCall = autoCall?.acknowledgeCall
  const enqueueAutoCall = autoCall?.enqueueCall

  const effectiveTimeWindow = useMemo(
    () => ({
      openFrom: autoCallSettings?.openFrom ?? guardianSettings?.auto_call_open_from ?? null,
      openUntil: autoCallSettings?.openUntil ?? guardianSettings?.auto_call_open_until ?? null,
    }),
    [autoCallSettings?.openFrom, autoCallSettings?.openUntil, guardianSettings?.auto_call_open_from, guardianSettings?.auto_call_open_until],
  )

  const geofenceInfo = useMemo(() => {
    console.log('🗺️ Geofence resolution:', {
      'autoCallSettings?.geofence': autoCallSettings?.geofence,
      'guardianSettings?.auto_call_geofence': guardianSettings?.auto_call_geofence,
    })

    const reasons: string[] = []

    if (autoCallSettings?.geofence) {
      const { geofence, reason } = sanitizeGeofenceInput(autoCallSettings.geofence, 'firestore')
      if (geofence) {
        console.log('✅ Using geofence from Firestore:', geofence)
        return { geofence, source: 'firestore' as const, reason: null }
      }
      if (reason) {
        reasons.push(`[firestore] ${reason}`)
      }
    }

    if (guardianSettings?.auto_call_geofence) {
      const backendGeofence = {
        latitude: guardianSettings.auto_call_geofence.latitude,
        longitude: guardianSettings.auto_call_geofence.longitude,
        radiusMeters: guardianSettings.auto_call_geofence.radius_meters,
      }
      const { geofence, reason } = sanitizeGeofenceInput(backendGeofence, 'backend')
      if (geofence) {
        console.log('✅ Using geofence from backend:', geofence)
        return { geofence, source: 'backend' as const, reason: null }
      }
      if (reason) {
        reasons.push(`[backend] ${reason}`)
      }
    }

    if (reasons.length) {
      console.warn('⚠️ Geofence configuration invalid:', reasons)
    } else {
      console.log('✅ No geofence configured - location check disabled')
    }

    return {
      geofence: null,
      source: null,
      reason: reasons[0] ?? 'لم يتم ضبط إحداثيات المدرسة لخدمة النداء.',
    }
  }, [autoCallSettings?.geofence, guardianSettings?.auto_call_geofence])

  const geofence = geofenceInfo.geofence

  const guardianBlocked = useMemo(() => {
    if (!currentNationalId) return false
    return isGuardianBlockedFn(currentNationalId)
  }, [currentNationalId, isGuardianBlockedFn])

  const guardianStrikeStatus = useMemo(() => {
    if (!currentNationalId) return null
    return guardianStatuses.get(currentNationalId) ?? null
  }, [currentNationalId, guardianStatuses])

  const activeAutoCalls = useMemo(() => {
    if (!currentNationalId) return [] as AutoCallQueueEntry[]
    return autoCallQueue.filter(
      (entry) => entry.studentNationalId === currentNationalId && entry.status !== 'acknowledged' && entry.status !== 'cancelled',
    )
  }, [autoCallQueue, currentNationalId])

  const { autoCallEnabled, autoCallDisabledReason } = useMemo(() => {
    console.log('🔍 Auto-call diagnosis:', {
      'autoCall exists': !!autoCall,
      'autoCall.settings': autoCall?.settings,
      'autoCall.settings.enabled': autoCall?.settings?.enabled,
      'guardianSettings': guardianSettings,
      'guardianSettings.auto_call_enabled': guardianSettings?.auto_call_enabled,
    })

    let enabled: boolean | null = null
    let reason: string | null = null

    if (!autoCall) {
      return {
        autoCallEnabled: false,
        autoCallDisabledReason: autoCallAvailabilityReason ?? 'جاري تهيئة خدمة النداء الآلي...'
      }
    }

    if (autoCall.settings?.enabled !== undefined) {
      enabled = autoCall.settings.enabled
      reason = enabled ? null : 'خدمة النداء متوقفة من إعدادات Firestore.'
      console.log('✅ Using autoCall.settings.enabled from Firestore:', enabled)
    } else if (guardianSettings?.auto_call_enabled !== undefined && guardianSettings?.auto_call_enabled !== null) {
      enabled = Boolean(guardianSettings.auto_call_enabled)
      reason = enabled ? null : 'خدمة النداء غير مفعّلة من إعدادات المدرسة.'
      console.log('✅ Using guardianSettings.auto_call_enabled from backend:', enabled)
    } else {
      enabled = true
      console.log('⚠️ No explicit enabled setting found, but autoCall provider exists - defaulting to true')
    }

    if (!enabled) {
      return { autoCallEnabled: false, autoCallDisabledReason: reason ?? 'خدمة النداء متوقفة حالياً.' }
    }

    if (!geofence) {
      console.info('ℹ️ Geofence missing or invalid - location check will be skipped:', geofenceInfo.reason)
    }

    return { autoCallEnabled: true, autoCallDisabledReason: null }
  }, [autoCall, autoCallAvailabilityReason, geofence, geofenceInfo.reason, guardianSettings])

  const autoCallWindowDescription = describeTimeWindow(effectiveTimeWindow)
  const isInsideTimeWindow = isWithinTimeWindow(effectiveTimeWindow)
  const hasActiveAutoCall = activeAutoCalls.length > 0
  const studentAcknowledgements = useMemo(() => {
    if (!currentNationalId) return [] as AutoCallHistoryEntry[]
    return autoCallHistory
      .filter((entry) => entry.studentNationalId === currentNationalId && entry.status === 'acknowledged')
      .slice(0, 5)
  }, [autoCallHistory, currentNationalId])
  const historyIsLoading = autoCall?.loading?.history ?? false
  const autoCallButtonDisabled =
    !autoCallEnabled ||
    autoCallStatus === 'requesting' ||
    isCheckingLocation ||
    guardianBlocked ||
    !isInsideTimeWindow ||
    hasActiveAutoCall

  useEffect(() => {
    setAutoCallStatus('idle')
    setAutoCallError(null)
    onPortalSectionChange('none')
  }, [currentNationalId, onPortalSectionChange])

  useEffect(() => {
    if (autoCallStatus === 'success' && !hasActiveAutoCall) {
      setAutoCallStatus('idle')
    }
  }, [autoCallStatus, hasActiveAutoCall])

  const lookupMutation = useGuardianStudentLookupMutation()
  const requestsQuery = useGuardianLeaveRequestsQuery(currentNationalId)
  const submitMutation = useGuardianLeaveRequestSubmissionMutation()
  const storeOverviewQuery = useGuardianStoreOverviewQuery(currentNationalId)
  const storeCatalogQuery = useGuardianStoreCatalogQuery(currentNationalId)
  const storeOrdersQuery = useGuardianStoreOrdersQuery(currentNationalId)
  const storeOrderMutation = useGuardianStoreOrderMutation()

  const requests = requestsQuery.data ?? []
  const isLoadingRequests = requestsQuery.isFetching
  const requestsErrorMessage = requestsQuery.isError
    ? resolveErrorMessage(requestsQuery.error, 'تعذر تحميل طلبات الاستئذان السابقة')
    : null

  useEffect(() => {
    if (!studentSummary) {
      return
    }
    setFormValues((previous) => ({
      ...previous,
      guardian_name: studentSummary.parent_name,
      guardian_phone: studentSummary.parent_phone,
    }))
  }, [studentSummary])

  const hasStudent = Boolean(studentSummary && currentNationalId)

  const activeSectionHint = useMemo(() => {
    switch (activePortalSection) {
      case 'leave-request':
        return 'تم فتح نموذج الاستئذان في الأسفل.'
      case 'auto-call':
        return 'تم تهيئة واجهة النداء الآلي أدناه.'
      case 'store':
        return 'تم فتح المتجر الإلكتروني واستعراض المنتجات في الأسفل.'
      default:
        return null
    }
  }, [activePortalSection])

  useEffect(() => {
    if (activePortalSection === 'none') {
      setHighlightSection('none')
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    let target: HTMLElement | null = null

    switch (activePortalSection) {
      case 'leave-request':
        target = leaveSectionRef.current
        break
      case 'auto-call':
        target = autoCallSectionRef.current
        break
      case 'store':
        target = storeSectionRef.current
        break
      default:
        target = null
    }

    if (!target) {
      return
    }

    window.requestAnimationFrame(() => {
      const offset = 120
      const top = target.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' })
    })

    setHighlightSection(activePortalSection)
    const timer = window.setTimeout(() => {
      setHighlightSection('none')
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [activePortalSection])

  const storeOverview = storeOverviewQuery.data ?? null
  const storeCatalogErrorMessage = storeCatalogQuery.isError
    ? resolveErrorMessage(storeCatalogQuery.error, 'تعذر تحميل منتجات المتجر')
    : null
  const storeOrdersErrorMessage = storeOrdersQuery.isError
    ? resolveErrorMessage(storeOrdersQuery.error, 'تعذر تحميل طلبات المتجر')
    : null

  const studentCard = useMemo(() => {
    if (!studentSummary) {
      return null
    }

    const pointsTotal = storeOverview?.points.total ?? null
    const storeStatus = storeOverview?.store.status
    const storeStatusMessage = storeOverview?.store.status_message

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">الطالب</p>
            <h2 className="text-lg font-bold text-slate-900">{studentSummary.name}</h2>
            <p className="text-xs text-muted">
              الصف {studentSummary.grade} • الفصل {studentSummary.class_name}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600">
            رقم هوية الطالب: {currentNationalId}
          </div>
        </header>
        <section className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <p className="font-semibold text-slate-500">اسم ولي الأمر</p>
            <p className="mt-1 text-sm text-slate-800">{studentSummary.parent_name}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <p className="font-semibold text-slate-500">هاتف ولي الأمر</p>
            <p className="mt-1 text-sm text-slate-800">{studentSummary.parent_phone}</p>
          </div>
        </section>
        {pointsTotal != null ? (
          <section className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-indigo-600">رصيد النقاط الحالي</p>
                <p className="mt-1 text-lg font-bold text-indigo-700">{pointsTotal}</p>
              </div>
              <Gift className="h-5 w-5 text-indigo-500" />
            </div>
            {storeStatus ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">حالة المتجر</p>
                <p className="mt-1 text-sm text-slate-800">
                  {storeStatus === 'open'
                    ? 'المتجر متاح للاستبدال'
                    : storeStatus === 'closed'
                      ? 'المتجر مغلق مؤقتاً'
                      : storeStatus === 'maintenance'
                        ? 'المتجر تحت الصيانة'
                        : storeStatus === 'inventory'
                          ? 'جرد المخزون جارٍ'
                          : storeStatus === 'paused'
                            ? 'المتجر متوقف مؤقتاً'
                            : 'لا توجد منتجات متاحة'}
                </p>
                {storeStatusMessage ? (
                  <p className="mt-1 text-[11px] text-slate-500">{storeStatusMessage}</p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    )
  }, [studentSummary, currentNationalId, storeOverview])

  function validateForm(): FormErrors | null {
    if (!currentNationalId) {
      return { national_id: 'يرجى التحقق من رقم الهوية قبل إرسال الطلب' }
    }

    const errors: FormErrors = {}

    if (!formValues.guardian_name.trim()) {
      errors.guardian_name = 'هذا الحقل مطلوب'
    } else if (formValues.guardian_name.trim().length < 3) {
      errors.guardian_name = 'اسم ولي الأمر يجب أن يكون 3 أحرف على الأقل'
    }
    
    if (!formValues.guardian_phone.trim()) {
      errors.guardian_phone = 'هذا الحقل مطلوب'
    } else if (!/^05\d{8}$/.test(formValues.guardian_phone.trim())) {
      errors.guardian_phone = 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'
    }
    
    if (!formValues.reason.trim()) {
      errors.reason = 'يرجى كتابة سبب الاستئذان'
    } else if (formValues.reason.trim().length < 5) {
      errors.reason = 'سبب الاستئذان يجب أن يكون 5 أحرف على الأقل'
    }
    
    if (!formValues.pickup_person_name.trim()) {
      errors.pickup_person_name = 'يرجى إدخال اسم الشخص الذي سيستلم الطالب'
    }
    
    if (!formValues.expected_pickup_time) {
      errors.expected_pickup_time = 'حدد موعد الانصراف المتوقع'
    }

    return Object.keys(errors).length ? errors : null
  }

  function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nationalId = nationalIdInput.trim()
    if (!nationalId) {
      setFormErrors({ national_id: 'يرجى إدخال رقم هوية الطالب المكون من 10 أرقام' })
      return
    }

    setFormErrors({})
    lookupMutation.mutate(nationalId, {
      onSuccess: (summary) => {
        setStudentSummary(summary)
        setCurrentNationalId(nationalId)
      },
      onError: () => {
        setStudentSummary(null)
        setCurrentNationalId(null)
      },
    })
  }

  function handleFormChange<Field extends keyof FormValues>(field: Field, value: FormValues[Field]) {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleAutoCallRequest = useCallback(async () => {
    if (!autoCall || !autoCallSettings || !enqueueAutoCall) {
      toast({ type: 'error', title: 'خدمة النداء غير متاحة حالياً. يرجى التواصل مع المدرسة.' })
      return
    }
    if (!autoCallEnabled) {
      toast({ type: 'error', title: autoCallDisabledReason ?? 'خدمة النداء غير متاحة حالياً.' })
      return
    }
    if (!currentNationalId || !studentSummary) {
      toast({ type: 'error', title: 'يرجى التحقق من بيانات الطالب قبل طلب النداء.' })
      return
    }
    if (guardianBlocked) {
      const blockedUntil = guardianStrikeStatus?.blockedUntil
        ? new Date(guardianStrikeStatus.blockedUntil).toLocaleString('ar-SA')
        : null
      toast({
        type: 'error',
        title: 'تم إيقاف خدمة النداء لهذا الحساب',
        description: blockedUntil ? `يمكنك المحاولة مجدداً بعد ${blockedUntil}.` : 'يرجى مراجعة الإدارة المدرسية.',
      })
      return
    }
    if (activeAutoCalls.length) {
      toast({ type: 'info', title: 'تم تسجيل النداء مسبقاً', description: 'يرجى الانتظار حتى يتم النداء الحالي.' })
      return
    }

    setAutoCallStatus('requesting')
    setAutoCallError(null)

    try {
      if (!isWithinTimeWindow(effectiveTimeWindow)) {
        throw new Error(`خدمة النداء متاحة فقط خلال الأوقات المحددة. ${autoCallWindowDescription}`)
      }

      if (geofence) {
        console.log('📍 Checking location against geofence:', geofence)
        setIsCheckingLocation(true)
        const position = await requestCurrentPosition({ enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 })
        console.log('📍 Current position:', position.coords)

        const distance = computeDistanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          geofence.latitude,
          geofence.longitude,
        )

        console.log('📍 Distance calculation:', {
          userLat: position.coords.latitude,
          userLng: position.coords.longitude,
          schoolLat: geofence.latitude,
          schoolLng: geofence.longitude,
          distance: Math.round(distance),
          allowedRadius: geofence.radiusMeters,
          withinRange: distance <= geofence.radiusMeters,
        })

        if (distance > geofence.radiusMeters) {
          throw new Error(
            `يجب أن تكون داخل نطاق ${geofence.radiusMeters} متر حول المدرسة لطلب النداء. المسافة الحالية ${Math.round(distance)} متر.`,
          )
        }
      } else {
        console.log('📍 Geofence missing or invalid - skipping location verification before enqueueing auto-call.')
      }

      await enqueueAutoCall({
        studentNationalId: currentNationalId,
        studentName: studentSummary.name,
        studentId: studentSummary.student_id,
        classLabel: `الصف ${studentSummary.grade} • الفصل ${studentSummary.class_name}`,
        guardianName: formValues.guardian_name.trim() || studentSummary.parent_name,
        guardianPhone: formValues.guardian_phone.trim() || studentSummary.parent_phone,
        notes: null,
        requestedBy: 'guardian',
      })

      setAutoCallStatus('success')
      toast({ type: 'success', title: 'تم إرسال طلب المناداة', description: 'سيتم عرض اسم الطالب فوراً على الشاشة.' })
    } catch (error) {
      let message = resolveErrorMessage(error, 'تعذر تنفيذ المناداة، يرجى المحاولة لاحقاً')
      if (typeof error === 'object' && error && 'code' in error && typeof (error as GeolocationPositionError).code === 'number') {
        const geolocationError = error as GeolocationPositionError
        if (geolocationError.code === 1) {
          message = 'يرجى السماح بالوصول إلى الموقع لإتمام المناداة.'
        } else if (geolocationError.code === 2) {
          message = 'تعذر تحديد موقعك الحالي. حاول مرة أخرى بالقرب من المدرسة.'
        } else if (geolocationError.code === 3) {
          message = 'استغرقت محاولة تحديد الموقع وقتاً طويلاً. يرجى إعادة المحاولة.'
        }
      }
      setAutoCallStatus('error')
      setAutoCallError(message)
      toast({ type: 'error', title: message })
    } finally {
      setIsCheckingLocation(false)
    }
  }, [
    activeAutoCalls.length,
      autoCall,
      autoCallDisabledReason,
      autoCallEnabled,
    autoCallSettings,
    enqueueAutoCall,
    effectiveTimeWindow,
    formValues.guardian_name,
    formValues.guardian_phone,
      geofence,
    guardianBlocked,
    guardianStrikeStatus?.blockedUntil,
    toast,
    currentNationalId,
    studentSummary,
    autoCallWindowDescription,
  ])

  const handleGuardianAcknowledge = useCallback(
    async (callId: string) => {
      if (!autoCall || !acknowledgeCall) {
        return
      }
      try {
        await acknowledgeCall(callId, 'guardian')
        toast({ type: 'success', title: 'تم تأكيد استلام الطالب' })
      } catch (error) {
        toast({ type: 'error', title: resolveErrorMessage(error, 'تعذر تأكيد الاستلام') })
      }
    },
    [acknowledgeCall, autoCall, toast],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateForm()
    if (validation) {
      setFormErrors(validation)
      return
    }

    if (!currentNationalId) {
      setFormErrors({ national_id: 'يرجى التحقق من الطالب قبل إرسال الطلب' })
      return
    }

    setFormErrors({})

    const payload = {
      national_id: currentNationalId,
      guardian_name: formValues.guardian_name.trim(),
      guardian_phone: formValues.guardian_phone.trim(),
      reason: formValues.reason.trim(),
      pickup_person_name: formValues.pickup_person_name.trim(),
      pickup_person_relation: formValues.pickup_person_relation.trim() || null,
      pickup_person_phone: formValues.pickup_person_phone.trim() || null,
      expected_pickup_time: normalizeDateTimeInput(formValues.expected_pickup_time),
    }

    try {
      await submitMutation.mutateAsync(payload)
      setFormValues((previous) => ({
        ...previous,
        reason: '',
        pickup_person_name: '',
        pickup_person_relation: '',
        pickup_person_phone: '',
        expected_pickup_time: '',
      }))
    } catch (error) {
      console.error('فشل إرسال طلب الاستئذان', error)
    }
  }

  return (
    <section className="guardian-portal-page space-y-6 sm:space-y-8">
      <header className="space-y-2 text-center sm:space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">بوابة ولي الأمر</h1>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-muted sm:text-base">
          أدخل رقم هوية الطالب للتحقق من البيانات، ثم اختر الخدمة المناسبة بين طلب الاستئذان، النداء الآلي، أو استبدال نقاط الطالب عبر المتجر الإلكتروني.
        </p>
      </header>

      <div className="glass-card space-y-5 sm:space-y-6">
        <form className="space-y-3" onSubmit={handleLookupSubmit}>
          <label className="block text-right text-xs font-semibold text-slate-600">رقم هوية الطالب</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.national_id ? 'border-rose-300' : 'border-slate-200'}`}
              placeholder="أدخل رقم هوية الطالب"
              value={nationalIdInput}
              onChange={(event) => setNationalIdInput(event.target.value)}
              disabled={lookupMutation.isPending}
            />
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={lookupMutation.isPending}
            >
              {lookupMutation.isPending ? 'جاري التحميل...' : 'تحقق من البيانات'}
            </button>
          </div>
          {formErrors.national_id ? <p className="text-xs text-rose-600">{formErrors.national_id}</p> : null}
        </form>

        {studentCard}
      </div>

      {hasStudent ? (
        <div className="space-y-6">
          <div className="glass-card space-y-4 sm:space-y-5">
            <header className="space-y-1 text-right">
              <h2 className="text-xl font-semibold text-slate-900">اختر الخدمة المطلوبة</h2>
              <p className="text-xs text-muted">يمكنك إرسال طلب استئذان أو تفعيل المناداة الآلية أو استبدال نقاط الطالب من المتجر الإلكتروني.</p>
            </header>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => onPortalSectionChange('leave-request')}
                className={`rounded-2xl border px-4 py-3 text-right transition ${
                  activePortalSection === 'leave-request'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">طلب الاستئذان</p>
                    <p className="text-xs text-muted">تعبئة نموذج الاستئذان ومتابعة حالة الطلبات السابقة.</p>
                  </div>
                  <FileText className="h-5 w-5" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => onPortalSectionChange('auto-call')}
                className={`rounded-2xl border px-4 py-3 text-right transition ${
                  activePortalSection === 'auto-call'
                    ? 'border-indigo-500 bg-indigo-50/60 text-indigo-600 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">النداء الآلي</p>
                    <p className="text-xs text-muted">طلب مناداة فورية لعرض اسم الطالب في لوحة الاستقبال.</p>
                  </div>
                  <Megaphone className="h-5 w-5" />
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onPortalSectionChange('store')}
              className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                activePortalSection === 'store'
                  ? 'border-indigo-500 bg-indigo-50/60 text-indigo-600 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">المتجر الإلكتروني</p>
                  <p className="text-xs text-muted">تصفح المنتجات واستبدل نقاط الطالب مباشرة.</p>
                </div>
                <ShoppingCart className="h-5 w-5" />
              </div>
            </button>

            {activeSectionHint ? (
              <p className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-2 text-xs font-semibold text-indigo-700">
                {activeSectionHint}
              </p>
            ) : null}
          </div>

          {activePortalSection === 'none' ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
              يرجى اختيار الخدمة التي ترغب بمتابعتها.
            </div>
          ) : null}

          {activePortalSection === 'leave-request' ? (
            <div
              ref={leaveSectionRef}
              className={`scroll-mt-32 transition-shadow duration-500 ${
                highlightSection === 'leave-request' ? 'rounded-[28px] ring-2 ring-indigo-200 ring-offset-2 ring-offset-white shadow-lg' : ''
              }`}
            >
              <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <form className="glass-card space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                <header className="space-y-1">
                  <h2 className="text-xl font-semibold text-slate-900">إرسال طلب جديد</h2>
                  <p className="text-xs text-muted">يرجى تعبئة جميع الحقول الإلزامية لإرسال الطلب.</p>
                </header>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">سبب الاستئذان *</label>
                  <textarea
                    className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.reason ? 'border-rose-300' : 'border-slate-200'}`}
                    rows={4}
                    value={formValues.reason}
                    onChange={(event) => handleFormChange('reason', event.target.value)}
                    placeholder="مثال: موعد طبي عاجل"
                    disabled={submitMutation.isPending}
                  />
                  {formErrors.reason ? <p className="text-xs text-rose-600">{formErrors.reason}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">اسم ولي الأمر *</label>
                    <input
                      type="text"
                      className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.guardian_name ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formValues.guardian_name}
                      onChange={(event) => handleFormChange('guardian_name', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                    {formErrors.guardian_name ? <p className="text-xs text-rose-600">{formErrors.guardian_name}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">هاتف ولي الأمر *</label>
                    <input
                      type="tel"
                      className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.guardian_phone ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formValues.guardian_phone}
                      onChange={(event) => handleFormChange('guardian_phone', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                    {formErrors.guardian_phone ? <p className="text-xs text-rose-600">{formErrors.guardian_phone}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">اسم المستلم *</label>
                    <input
                      type="text"
                      className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.pickup_person_name ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formValues.pickup_person_name}
                      onChange={(event) => handleFormChange('pickup_person_name', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                    {formErrors.pickup_person_name ? <p className="text-xs text-rose-600">{formErrors.pickup_person_name}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">صلة القرابة</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formValues.pickup_person_relation}
                      onChange={(event) => handleFormChange('pickup_person_relation', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">هاتف المستلم</label>
                    <input
                      type="tel"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formValues.pickup_person_phone}
                      onChange={(event) => handleFormChange('pickup_person_phone', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">موعد الانصراف المتوقع *</label>
                    <input
                      type="datetime-local"
                      className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.expected_pickup_time ? 'border-rose-300' : 'border-slate-200'}`}
                      value={formValues.expected_pickup_time}
                      onChange={(event) => handleFormChange('expected_pickup_time', event.target.value)}
                      disabled={submitMutation.isPending}
                    />
                    {formErrors.expected_pickup_time ? (
                      <p className="text-xs text-rose-600">{formErrors.expected_pickup_time}</p>
                    ) : null}
                  </div>
                </div>

                <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="submit"
                    className="rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                </footer>
              </form>

              <aside className="glass-card space-y-4 sm:space-y-5">
                <header>
                  <h2 className="text-lg font-semibold text-slate-900">الطلبات السابقة</h2>
                  <p className="text-xs text-muted">يمكنك متابعة حالة طلبات الاستئذان السابقة.</p>
                </header>

                {isLoadingRequests ? (
                  <p className="text-sm text-muted">جاري تحميل الطلبات...</p>
                ) : requestsErrorMessage ? (
                  <p className="text-sm text-rose-600">{requestsErrorMessage}</p>
                ) : (
                  <RequestsList requests={requests} />
                )}
              </aside>
              </div>
            </div>
          ) : null}

          {activePortalSection === 'auto-call' ? (
            <section
              ref={autoCallSectionRef}
              className={`glass-card space-y-4 sm:space-y-5 scroll-mt-32 transition-shadow duration-500 ${
                highlightSection === 'auto-call' ? 'ring-2 ring-indigo-200 ring-offset-2 ring-offset-white shadow-lg' : ''
              }`}
            >
              <header className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">النداء الآلي لاستلام الطالب</h2>
                    <p className="text-xs text-muted">يتم عرض اسم الطالب على شاشة الاستقبال حالاً.</p>
                  </div>
                  <Megaphone className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="text-xs text-slate-500">المدرسة المرتبطة: {guardianSettings?.school_name ?? (autoCallSchoolId ? `مدرسة رقم ${autoCallSchoolId}` : 'مدرسة غير محددة')}</p>
              </header>

              {settingsQuery.isLoading || (autoCall?.loading?.settings ?? false) ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري تحميل الإعدادات...</span>
                </div>
              ) : !autoCallEnabled ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
                  {autoCallDisabledReason ?? 'خدمة النداء متوقفة حالياً. يرجى التواصل مع إدارة المدرسة.'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-600">
                    <p className="font-semibold text-slate-500">أوقات السماح</p>
                    <p className="mt-1 text-sm text-slate-700">{autoCallWindowDescription}</p>
                  </div>

                  {geofence ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 text-rose-500" />
                      <div>
                        <p className="font-semibold text-slate-500">موقع المدرسة</p>
                        <p className="mt-1 text-sm text-slate-700">
                          يجب أن تكون ضمن مسافة {Math.round(geofence.radiusMeters)} م حول الموقع المحدد لإرسال مناداة.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {guardianBlocked ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
                      لقد تم إيقاف خدمة المناداة لهذا الحساب بسبب عدم تأكيد الاستلام في مرات سابقة.
                      {guardianStrikeStatus?.blockedUntil ? (
                        <span className="block text-xs text-rose-600">
                          يمكنك المحاولة بعد {new Date(guardianStrikeStatus.blockedUntil).toLocaleString('ar-SA')}.
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {activeAutoCalls.length ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-700">النداءات الحالية</p>
                      <ul className="space-y-2">
                        {activeAutoCalls.map((call) => (
                          <li key={call.id} className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-indigo-900">{call.studentName}</span>
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-600">
                                {call.status === 'announcing' ? 'جاري النداء' : 'بانتظار النداء'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                              <span>عدد مرات النداء: {call.announcedCount}</span>
                              <span>تم الإنشاء عند {formatDateTime(call.createdAt)}</span>
                            </div>
                            {autoCall?.settings?.allowGuardianAcknowledgement ? (
                              <button
                                type="button"
                                onClick={() => handleGuardianAcknowledge(call.id)}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed"
                              >
                                تم استلام الطالب
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {studentAcknowledgements.length > 0 || historyIsLoading ? (
                    <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <p className="text-sm font-semibold text-slate-700">آخر من تم استلامهم</p>
                        </div>
                        {historyIsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                      </div>
                      {studentAcknowledgements.length === 0 && !historyIsLoading ? (
                        <p className="text-xs text-muted">لم يتم تسجيل عمليات استلام لهذا الطالب حتى الآن.</p>
                      ) : null}
                      {studentAcknowledgements.length ? (
                        <ul className="space-y-2">
                          {studentAcknowledgements.map((entry) => {
                            const resolvedAt = entry.resolvedAt ?? entry.acknowledgedAt ?? entry.createdAt
                            return (
                              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                                <div className="text-right text-slate-700">
                                  <p className="text-sm font-semibold">{entry.studentName}</p>
                                  <p className="text-[11px] text-muted">{entry.classLabel ?? '—'}</p>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-600">{formatDateTime(resolvedAt)}</span>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleAutoCallRequest}
                    disabled={autoCallButtonDisabled}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {autoCallStatus === 'requesting' || isCheckingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Megaphone className="h-4 w-4" />
                    )}
                    {autoCallStatus === 'success' ? 'تم إرسال المناداة' : hasActiveAutoCall ? 'تم تسجيل مناداة' : 'طلب المناداة الآن'}
                  </button>

                  {!isInsideTimeWindow && autoCallEnabled ? (
                    <p className="text-xs text-amber-600">
                      النداء متاح فقط خلال الفترات المحددة. {autoCallWindowDescription}
                    </p>
                  ) : null}

                  {hasActiveAutoCall ? (
                    <p className="text-xs text-indigo-600">يوجد نداء جاري لهذا الطالب. يرجى الانتظار حتى يتم الاستلام.</p>
                  ) : null}

                  {autoCallError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700">
                      {autoCallError}
                    </div>
                  ) : null}

                  {guardianStrikeStatus ? (
                    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-500">سجل المخالفات</p>
                      <p className="mt-1 text-sm text-slate-700">
                        عدد المخالفات: {guardianStrikeStatus.strikeCount}
                        {autoCall?.settings?.maxStrikesBeforeBlock ? ` / الحد المسموح ${autoCall.settings.maxStrikesBeforeBlock}` : ''}
                      </p>
                      {guardianStrikeStatus.lastStrikeReason ? (
                        <p className="mt-1 text-xs text-slate-500">آخر سبب: {guardianStrikeStatus.lastStrikeReason}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          {activePortalSection === 'store' ? (
            <div
              ref={storeSectionRef}
              className={`scroll-mt-32 transition-shadow duration-500 ${
                highlightSection === 'store' ? 'rounded-[28px] ring-2 ring-indigo-200 ring-offset-2 ring-offset-white shadow-lg' : ''
              }`}
            >
              <GuardianStoreSection
                nationalId={currentNationalId ?? ''}
                overview={storeOverview}
                overviewLoading={storeOverviewQuery.isFetching || storeOverviewQuery.isLoading}
                catalog={storeCatalogQuery.data ?? null}
                catalogLoading={storeCatalogQuery.isFetching || storeCatalogQuery.isLoading}
                catalogError={storeCatalogErrorMessage}
                orders={storeOrdersQuery.data ?? []}
                ordersLoading={storeOrdersQuery.isFetching || storeOrdersQuery.isLoading}
                ordersError={storeOrdersErrorMessage}
                onSubmitOrder={storeOrderMutation.mutateAsync}
                submitPending={storeOrderMutation.isPending}
                guardianName={studentSummary?.parent_name}
                guardianPhone={studentSummary?.parent_phone}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-muted">
          يرجى إدخال رقم الهوية للتحقق من بيانات الطالب قبل إرسال الطلب.
        </div>
      )}
    </section>
  )
}

interface GuardianLeaveRequestAutoCallBridgeProps {
  settingsQuery: GuardianSettingsQueryResult
  autoCallSchoolId: string | null
  activePortalSection: PortalSection
  onPortalSectionChange: (section: PortalSection) => void
  autoCallAvailabilityReason: string | null
}

function GuardianLeaveRequestAutoCallBridge({
  settingsQuery,
  autoCallSchoolId,
  activePortalSection,
  onPortalSectionChange,
  autoCallAvailabilityReason,
}: GuardianLeaveRequestAutoCallBridgeProps) {
  const autoCall = useAutoCall()
  return (
    <GuardianLeaveRequestPageBase
      settingsQuery={settingsQuery}
      autoCall={autoCall}
      autoCallSchoolId={autoCallSchoolId}
      activePortalSection={activePortalSection}
      onPortalSectionChange={onPortalSectionChange}
      autoCallAvailabilityReason={autoCallAvailabilityReason}
    />
  )
}

export function GuardianLeaveRequestPage() {
  const settingsQuery = useGuardianSettingsQuery()
  const [activePortalSection, setActivePortalSection] = useState<PortalSection>('none')
  const rawSchoolId = settingsQuery.data?.auto_call_school_id
  const autoCallSchoolId = rawSchoolId != null && rawSchoolId !== '' ? String(rawSchoolId) : null

  const autoCallAvailabilityReason = settingsQuery.isLoading
    ? 'جاري تحميل بيانات المدرسة...'
    : settingsQuery.isError
      ? resolveErrorMessage(settingsQuery.error, 'تعذر تحميل إعدادات المدرسة المرتبطة بخدمة النداء.')
      : null

  // نمرر schoolIdOverride المسترجع من إعدادات ولي الأمر لضمان ارتباط الصفحة بالمدرسة الصحيحة في بيئة SaaS متعددة المدارس
  return (
    <AutoCallProvider schoolIdOverride={autoCallSchoolId} allowFallbackSchoolId={false}>
      <GuardianLeaveRequestAutoCallBridge
        settingsQuery={settingsQuery}
        autoCallSchoolId={autoCallSchoolId}
        activePortalSection={activePortalSection}
        onPortalSectionChange={setActivePortalSection}
        autoCallAvailabilityReason={autoCallAvailabilityReason}
      />
    </AutoCallProvider>
  )
}

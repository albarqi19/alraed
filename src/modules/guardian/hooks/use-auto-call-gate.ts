import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuardianAutoCallEntry, GuardianAutoCallSettings } from '../auto-call-api'
import { useGuardianAutoCallQueueQuery, useGuardianAutoCallSettingsQuery } from './use-guardian-auto-call'

/**
 * بوّابة زرّ «طلب المناداة الآن».
 *
 * طلب المالك حرفيّاً: «حتى اللوكيشن ما يظهر له الزر إلا وهو بالمكان». والقراءة
 * الحرفيّة —إخفاء الزرّ— أسوأ من العطل الذي نصلحه: مَن لا يرى زرّاً لا يعرف أن
 * الخدمة موجودة، ولا لماذا حُرم منها، فيتّصل بالمدرسة. لذلك الزرّ حاضرٌ دائماً،
 * وحالُه هو ما يتغيّر، ومعه سطرٌ يقول السبب والفعل المطلوب.
 *
 * والفحص هنا للإرشاد لا للأمان: كلّ ما تحسبه هذه الدالة يمكن تزويره من أدوات
 * المطوّر في ثوانٍ. الحَكَم هو `AutoCallService` في الخادم — التفعيل والنافذة
 * الزمنيّة والسياج والحظر والقرابة كلّها مفروضةٌ هناك، وهذه البوّابة تُجنّب
 * وليَّ الأمر رحلةً إلى الخادم تنتهي برفضٍ كان يمكن توقّعه.
 */

export type AutoCallGatePhase =
  /**
   * نداءٌ قائمٌ لهذا الطالب ينتظر إقرار الاستلام.
   *
   * تسبق هذه الحالة كلَّ ما عداها في الترتيب لأنها الوحيدة التي يترتّب على
   * إهمالها عقوبة: النداء الذي تنتهي مهلته بلا إقرار يُسجَّل مخالفةً على
   * وليّه، وثلاثٌ منها تحجب الخدمة عنه يوماً كاملاً. فلا يجوز أن تحجبها عنه
   * «الخدمة مطفأة» ولا «انتهت النافذة» ولا «أنت بعيد» — كلُّ أولئك تمنع نداءً
   * جديداً، ولا واحدة منها تلغي واجبَ إقرارِ نداءٍ ماضٍ.
   */
  | 'awaiting-acknowledgement'
  /** إعدادات المدرسة لم تصل بعد. */
  | 'loading'
  /** تعذّر جلب الإعدادات — نسمح بالمحاولة ونترك الحكم للخادم. */
  | 'settings-unavailable'
  /** الخدمة مطفأة في هذه المدرسة. */
  | 'disabled'
  /** خارج النافذة الزمنيّة المعلنة. */
  | 'outside-hours'
  /** يلزم إذن الموقع ولم يُطلب بعد. */
  | 'needs-permission'
  /** جارٍ تحديد الموقع. */
  | 'locating'
  /** رُفض إذن الموقع من المتصفّح. */
  | 'permission-denied'
  /** تعذّر تحديد الموقع (إشارة/مهلة/متصفّح لا يدعم). */
  | 'location-failed'
  /** خارج السياج الجغرافيّ. */
  | 'too-far'
  /** مستوفٍ — الزرّ يعمل. */
  | 'ready'

export interface AutoCallGateCoords {
  latitude: number
  longitude: number
}

export interface AutoCallGate {
  phase: AutoCallGatePhase
  settings: GuardianAutoCallSettings | null
  /** المسافة المقيسة بالأمتار، أو `null` قبل القياس أو حين لا سياج. */
  distanceMeters: number | null
  /** آخر موقعٍ مقيس — يُرسل مع الطلب ليطابقه الخادم بسياجه. */
  coords: AutoCallGateCoords | null
  /** سطر الشرح تحت الزرّ: يقول السبب والفعل المطلوب. */
  explanation: string
  /** نصّ الزرّ في هذه الحالة. */
  actionLabel: string
  /** هل الضغط يُرسل نداءً فعليّاً؟ */
  canRequest: boolean
  /** هل الضغط يطلب الموقع بدل إرسال النداء؟ */
  isLocationAction: boolean
  /** هل الزرّ معطَّل؟ */
  isBlocked: boolean
  /** طلب الموقع (أو إعادة قياسه). */
  measureLocation: () => void
  /** هل للمدرسة سياجٌ أصلاً؟ يفيد لإظهار «إعادة القياس». */
  hasGeofence: boolean
  /** النداء القائم للطالب المعروض — هو مصدر زرّ «استلمتُ ابني». */
  activeCall: GuardianAutoCallEntry | null
  /**
   * نداءاتٌ قائمةٌ لأبناءٍ آخرين لهذا الوليّ.
   *
   * تُعرض ولا تُهمل: اللوحة تتبع الابن المُختار وحده، ولو أخفينا نداء أخيه
   * لظلّ بلا إقرارٍ حتى تنتهي مهلته — وهي المخالفة نفسها التي جئنا نمنعها.
   */
  otherActiveCalls: GuardianAutoCallEntry[]
  /** هل ما زال الطابور يُقرأ من الخادم لأوّل مرّة؟ */
  isQueueLoading: boolean
}

/** المسافة بالأمتار بصيغة هافرساين — نفس ما يحسبه الخادم فلا يختلف الحكمان. */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusMeters = 6_371_008.8
  const toRadians = (value: number) => (value * Math.PI) / 180

  const deltaLat = toRadians(lat2 - lat1)
  const deltaLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** «١٤٠٠ متر» غير مقروءة؛ الكيلومتر أوضح لمن يقدّر إن كان يمشي أم يركب. */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} كم`
  }
  return `${Math.round(meters)} متراً`
}

function toMinutes(value?: string | null): number | null {
  if (!value) return null
  const [hours, minutes = '0'] = value.split(':')
  const h = Number(hours)
  const m = Number(minutes)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/**
 * هل الوقت الآن داخل نافذة النداء؟
 *
 * الحالة المنفصلة (`from > until`) ليست ترفاً: نافذةٌ تعبر منتصف الليل تجعل
 * المقارنة المتّصلة كاذبةً دائماً، فتُقفل الخدمة أربعاً وعشرين ساعة. ونافذةٌ
 * ناقصة الطرفين تعني «لا قيد» لا «مقفلة» — كما يفعل الخادم حرفيّاً.
 */
function isWithinOpenHours(settings: GuardianAutoCallSettings, now: Date = new Date()): boolean {
  const from = toMinutes(settings.openFrom)
  const until = toMinutes(settings.openUntil)

  if (from == null || until == null) {
    return true
  }

  const current = now.getHours() * 60 + now.getMinutes()

  if (from > until) {
    return current >= from || current <= until
  }

  return current >= from && current <= until
}

type PermissionPhase = 'unknown' | 'prompt' | 'granted' | 'denied'

/**
 * @param isActive  هل اللوحة مفتوحة؟ (الجلب وطلب الموقع خلف لوحةٍ مغلقة عبث)
 * @param studentNationalId  هويّة الابن المعروض — بها نميّز نداءه من نداء أخيه
 */
export function useAutoCallGate(isActive: boolean, studentNationalId?: string | null): AutoCallGate {
  const settingsQuery = useGuardianAutoCallSettingsQuery(isActive)

  // الطابور يُقرأ ما دامت اللوحة مفتوحة، ويشارك مفتاحَه مع الشريط المقيم في
  // هيكل البوّابة — فنسخةٌ واحدة تخدمهما ولا يتضاربان.
  const queueQuery = useGuardianAutoCallQueueQuery(isActive)

  const settings = settingsQuery.data ?? null
  const geofence = settings?.geofence ?? null

  const activeCalls = queueQuery.data ?? []
  const trackedNationalId = (studentNationalId ?? '').trim()

  // بلا هويّةِ طالبٍ نأخذ أوّل نداءٍ قائم: عرضُ زرِّ استلامٍ لنداءٍ لا نعرف
  // صاحبه أفضل من إخفائه، فالبديل مخالفةٌ صامتة.
  const activeCall =
    (trackedNationalId
      ? activeCalls.find((call) => call.studentNationalId === trackedNationalId)
      : activeCalls[0]) ?? null

  const otherActiveCalls = activeCalls.filter((call) => call.id !== activeCall?.id)

  const [permission, setPermission] = useState<PermissionPhase>('unknown')
  const [isLocating, setIsLocating] = useState(false)
  const [coords, setCoords] = useState<AutoCallGateCoords | null>(null)
  const [locationError, setLocationError] = useState<'denied' | 'failed' | null>(null)

  // القياس قد ينتهي بعد إغلاق اللوحة؛ الكتابة على مكوّن مُفكَّك تحذيرٌ في
  // التطوير وتسريبٌ في الإنتاج.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const measureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('failed')
      setPermission('denied')
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setPermission('granted')
        setIsLocating(false)
      },
      (error) => {
        if (!isMountedRef.current) return
        setIsLocating(false)
        // الرفض حالةٌ دائمة يعالجها المستخدم في إعدادات المتصفّح، والفشل
        // والمهلة حالتان عابرتان تُعالجان بإعادة المحاولة. خلطهما يعطي
        // إرشاداً خاطئاً في إحداهما دائماً.
        if (error.code === error.PERMISSION_DENIED) {
          setPermission('denied')
          setLocationError('denied')
          return
        }
        setLocationError('failed')
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  }, [])

  // قراءة حال الإذن قبل طلبه: إن كان ممنوحاً سلفاً نقيس تلقائيّاً فلا نطلب من
  // وليّ الأمر ضغطةً بلا معنى؛ وإن كان مرفوضاً نقول له ذلك بدل أن نعرض زرّاً
  // لا يفتح أيّ نافذة. و`navigator.permissions` غير مدعومة في كل المتصفّحات،
  // وغيابها يعني «اسأل» لا «امنع».
  useEffect(() => {
    if (!isActive || !geofence) {
      return
    }

    let cancelled = false

    if (!navigator.permissions?.query) {
      setPermission((current) => (current === 'unknown' ? 'prompt' : current))
      return
    }

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled || !isMountedRef.current) return
        if (status.state === 'granted') {
          setPermission('granted')
        } else if (status.state === 'denied') {
          setPermission('denied')
        } else {
          setPermission('prompt')
        }
      })
      .catch(() => {
        if (cancelled || !isMountedRef.current) return
        setPermission('prompt')
      })

    return () => {
      cancelled = true
    }
  }, [isActive, geofence])

  // إذنٌ ممنوح وسياجٌ مضبوط ولا موقع بعد ⇒ قِس بلا انتظار ضغطة.
  useEffect(() => {
    if (!isActive || !geofence) return
    if (permission !== 'granted') return
    if (coords || isLocating || locationError) return

    measureLocation()
  }, [isActive, geofence, permission, coords, isLocating, locationError, measureLocation])

  const measuredDistance =
    geofence && coords
      ? distanceMeters(coords.latitude, coords.longitude, geofence.latitude, geofence.longitude)
      : null

  const gate = resolveGate({
    activeCall,
    isSettingsLoading: settingsQuery.isLoading,
    isSettingsError: settingsQuery.isError,
    settings,
    geofence,
    permission,
    isLocating,
    locationError,
    measuredDistance,
  })

  return {
    ...gate,
    settings,
    distanceMeters: measuredDistance,
    coords,
    hasGeofence: Boolean(geofence),
    measureLocation,
    activeCall,
    otherActiveCalls,
    isQueueLoading: queueQuery.isLoading,
  }
}

interface GateInput {
  activeCall: GuardianAutoCallEntry | null
  isSettingsLoading: boolean
  isSettingsError: boolean
  settings: GuardianAutoCallSettings | null
  geofence: GuardianAutoCallGeofenceLike | null
  permission: PermissionPhase
  isLocating: boolean
  locationError: 'denied' | 'failed' | null
  measuredDistance: number | null
}

interface GuardianAutoCallGeofenceLike {
  latitude: number
  longitude: number
  radiusMeters: number
}

type GateShape = Pick<
  AutoCallGate,
  'phase' | 'explanation' | 'actionLabel' | 'canRequest' | 'isLocationAction' | 'isBlocked'
>

/**
 * ترتيب الفحوص هو ترتيب ما يستطيع وليّ الأمر فعله حياله.
 *
 * النداء القائم أوّلاً: هو الفعل الوحيد الذي يترتّب على إهماله عقوبة، ولا
 * يُلغيه إطفاءُ الخدمة ولا انقضاءُ النافذة ولا بُعدُ المسافة.
 *
 * ثم الخدمة المطفأة أو النافذة المغلقة — لا حيلة له فيهما، فتُقالان قبل أن
 * يُطلب موقعه بلا فائدة. ثم الإذن، ثم القياس، ثم المسافة — وكلٌّ منها يُظهر
 * الفعل التالي المطلوب منه لا وصفَ العطل.
 */
function resolveGate(input: GateInput): GateShape {
  const {
    activeCall,
    isSettingsLoading,
    isSettingsError,
    settings,
    geofence,
    permission,
    isLocating,
    locationError,
    measuredDistance,
  } = input

  // نداءٌ قائم ⇒ زرُّ «نادِ» يختفي وزرُّ «استلمت» يحلّ محلّه. وإخفاؤه لا
  // تعطيله: زرٌّ معطَّلٌ يوحي بأن على وليّ الأمر انتظار شيء، والحقيقة أن
  // المطلوب منه فعلٌ آخر ظاهرٌ تحته.
  if (activeCall) {
    const student = activeCall.studentName || 'ابنك'
    return {
      phase: 'awaiting-acknowledgement',
      explanation:
        activeCall.announcedCount > 0
          ? `نُودي على ${student} — أكّد استلامك حين يصل إليك.`
          : `طلبك في الطابور، وسيُنادى على ${student} — أكّد استلامك حين يصل إليك.`,
      actionLabel: 'بانتظار استلامك',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  if (isSettingsLoading) {
    return {
      phase: 'loading',
      explanation: 'جارٍ التحقّق من إتاحة الخدمة…',
      actionLabel: 'طلب المناداة الآن',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  // تعذّر جلب الإعدادات لا يعني منعاً: الخادم هو الحَكَم، ومنعُ المحاولة هنا
  // يحرم وليّ الأمر من خدمةٍ قد تكون متاحة بسبب عطلٍ عابر في طلبٍ ثانويّ.
  if (isSettingsError || !settings) {
    return {
      phase: 'settings-unavailable',
      explanation: 'تعذّر التحقّق من إعدادات المدرسة — يمكنك المحاولة وسيتحقّق النظام من طلبك.',
      actionLabel: 'طلب المناداة الآن',
      canRequest: true,
      isLocationAction: false,
      isBlocked: false,
    }
  }

  if (!settings.enabled) {
    return {
      phase: 'disabled',
      explanation: 'خدمة النداء الآلي غير مفعَّلة في مدرستك حالياً.',
      actionLabel: 'الخدمة غير متاحة',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  if (!isWithinOpenHours(settings)) {
    const window =
      settings.openFrom && settings.openUntil
        ? `النداء متاح من ${settings.openFrom} إلى ${settings.openUntil}.`
        : 'النداء غير متاح في هذا الوقت.'
    return {
      phase: 'outside-hours',
      explanation: window,
      actionLabel: 'خارج وقت الخدمة',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  // لا سياج ⇒ لا معنى لطلب الموقع: الخادم لن يقيس شيئاً، وطلب إذنٍ لا يُستعمل
  // إساءةٌ لثقة المستخدم.
  if (!geofence) {
    return {
      phase: 'ready',
      explanation: 'اضغط لعرض اسم الطالب على شاشة الاستقبال فوراً.',
      actionLabel: 'طلب المناداة الآن',
      canRequest: true,
      isLocationAction: false,
      isBlocked: false,
    }
  }

  if (isLocating) {
    return {
      phase: 'locating',
      explanation: 'جارٍ تحديد موقعك…',
      actionLabel: 'جارٍ تحديد الموقع…',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  if (locationError === 'denied' || permission === 'denied') {
    return {
      phase: 'permission-denied',
      explanation:
        'إذن الموقع مرفوض في هذا المتصفّح. فعّله من إعدادات الموقع للصفحة ثم أعد المحاولة.',
      actionLabel: 'إعادة محاولة تحديد الموقع',
      canRequest: false,
      isLocationAction: true,
      isBlocked: false,
    }
  }

  if (locationError === 'failed') {
    return {
      phase: 'location-failed',
      explanation: 'تعذّر تحديد موقعك. تأكّد من تشغيل خدمة الموقع في جهازك ثم أعد المحاولة.',
      actionLabel: 'إعادة محاولة تحديد الموقع',
      canRequest: false,
      isLocationAction: true,
      isBlocked: false,
    }
  }

  if (measuredDistance == null) {
    return {
      phase: 'needs-permission',
      explanation: `هذه الخدمة تعمل عند المدرسة فقط — نحتاج موقعك للتحقّق (النطاق ${geofence.radiusMeters} متر).`,
      actionLabel: 'السماح بالموقع لطلب النداء',
      canRequest: false,
      isLocationAction: true,
      isBlocked: false,
    }
  }

  if (measuredDistance > geofence.radiusMeters) {
    return {
      phase: 'too-far',
      explanation: `تبعد ${formatDistance(measuredDistance)} عن المدرسة — يلزم الاقتراب إلى ${geofence.radiusMeters} متر.`,
      actionLabel: 'طلب المناداة الآن',
      canRequest: false,
      isLocationAction: false,
      isBlocked: true,
    }
  }

  return {
    phase: 'ready',
    explanation: `أنت عند المدرسة (${formatDistance(measuredDistance)}) — اضغط لعرض اسم الطالب على شاشة الاستقبال.`,
    actionLabel: 'طلب المناداة الآن',
    canRequest: true,
    isLocationAction: false,
    isBlocked: false,
  }
}

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// تعريف Pusher على window للاستخدام مع Laravel Echo
declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<'reverb'>
  }
}

window.Pusher = Pusher

// Reverb configuration from environment
const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'local-app-key'
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || 'localhost'
const REVERB_PORT = import.meta.env.VITE_REVERB_PORT || 8080
const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || 'http'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/**
 * نقطة توثيق القنوات الخاصة.
 *
 * كان البناء يحذف `/api` ثم يُلحق `/broadcasting/auth`، فيصيب مساراً مسجّلاً
 * بوسيط `web` أي بحارس الجلسات والكوكيز — بينما Echo يرسل `Bearer` من
 * localStorage. جلسةٌ لا كوكي لها ⇒ 403 على كل قناة خاصة، والعرَض ليس خطأً
 * ظاهراً بل صمتٌ تام: الاشتراك يفشل والمستمعون لا يُستدعون أبداً.
 *
 * المسار الصحيح هو المسجَّل في `routes/api.php` بـ`Broadcast::routes(['middleware'
 * => ['auth:api,guardian']])`، وملفُّ مسارات الـAPI كله تحت بادئة `api`، فوجهته
 * `{API_BASE}/broadcasting/auth` **مع** `/api` لا بحذفها. وهو الوحيد الذي يقبل
 * حاملَ الرمز، ويقبل حارسَي الموظّف ووليّ الأمر معاً.
 *
 * الشرطة المائلة الزائدة في آخر `VITE_API_BASE_URL` تُقلَّم حتى لا يصير المسار
 * `//broadcasting/auth`.
 */
const AUTH_ENDPOINT = API_BASE_URL.replace(/\/+$/, '') + '/broadcasting/auth'

/**
 * أسماء أحداث النداء الآلي على السلك — المصدر الواحد لها في الواجهة.
 *
 * هذه الأسماء عقدٌ حرفيّ مع `broadcastAs()` في أحداث الخادم الأربعة
 * (`app/Events/AutoCall/*`). وقد انكسر العقد فعلاً قبل هذا الإصلاح: الخادم كان
 * يبثّ `call.enqueued` و`call.status_updated` و`settings.updated`، والواجهة
 * تستمع إلى `auto-call.enqueued` و`auto-call.status-updated`. أربعة أسماء
 * مكتوبة في موضعين، فافترقت — والانكسار **صامت** تماماً: القناة موثَّقة،
 * والحدث مبثوث، والمستمع مشترك، ولا شيء يُستدعى ولا خطأ في أيّ سجلّ.
 *
 * جمعها في ثابتٍ واحد لا يمنع افتراق الطرفين، لكنه يجعل للواجهة موضعاً واحداً
 * يُقارَن بالخادم ويُصلَح فيه — بدل اسمٍ متناثر في كل مستمع جديد يُضاف.
 */
export const AUTO_CALL_EVENTS = {
  enqueued: 'auto-call.enqueued',
  statusUpdated: 'auto-call.status-updated',
  acknowledged: 'auto-call.acknowledged',
  settingsUpdated: 'auto-call.settings-updated',
} as const

/**
 * النقطة البادئة في `channel.listen('.foo')` ليست جزءاً من اسم الحدث: هي إشارة
 * إلى Echo بأن الاسم خامٌّ فلا يُسبق بمساحة أسماء التطبيق (`App\Events\...`).
 * لذلك تُكتب الأسماء أعلاه بلا نقطة —كما في `broadcastAs()` حرفاً بحرف— وتُضاف
 * النقطة هنا وحدها. خلطُ الاثنين هو ما يجعل مقارنة الطرفين تخدع العين.
 */
function rawEventName(event: string): string {
  return `.${event}`
}

let echoInstance: Echo<'reverb'> | null = null

/**
 * إنشاء أو الحصول على instance من Laravel Echo
 */
export function getEchoInstance(): Echo<'reverb'> {
  if (echoInstance) {
    return echoInstance
  }

  const token = window.localStorage.getItem('auth_token')

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: Number(REVERB_PORT),
    wssPort: Number(REVERB_PORT),
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: AUTH_ENDPOINT,
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
      },
    },
  })

  window.Echo = echoInstance

  return echoInstance
}

/**
 * تحديث التوكن في Echo instance
 */
export function updateEchoToken(token: string | null): void {
  if (!echoInstance) {
    return
  }

  // تحديث الـ auth headers
  echoInstance.connector.options.auth = {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
  }
}

/**
 * إنهاء اتصال Echo
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

/**
 * الاشتراك في قناة النداء الآلي للمدرسة
 */
export function subscribeToAutoCallChannel(
  schoolId: string | number,
  callbacks: {
    onEnqueued?: (data: unknown) => void
    onStatusUpdated?: (data: unknown) => void
    onAcknowledged?: (data: unknown) => void
    onSettingsUpdated?: (data: unknown) => void
  }
): () => void {
  const echo = getEchoInstance()
  const channelName = `auto-call.${schoolId}`

  const channel = echo.private(channelName)

  if (callbacks.onEnqueued) {
    channel.listen(rawEventName(AUTO_CALL_EVENTS.enqueued), callbacks.onEnqueued)
  }

  if (callbacks.onStatusUpdated) {
    channel.listen(rawEventName(AUTO_CALL_EVENTS.statusUpdated), callbacks.onStatusUpdated)
  }

  if (callbacks.onAcknowledged) {
    channel.listen(rawEventName(AUTO_CALL_EVENTS.acknowledged), callbacks.onAcknowledged)
  }

  if (callbacks.onSettingsUpdated) {
    channel.listen(rawEventName(AUTO_CALL_EVENTS.settingsUpdated), callbacks.onSettingsUpdated)
  }

  // إرجاع دالة لإلغاء الاشتراك
  return () => {
    echo.leave(channelName)
  }
}

/**
 * التحقق من حالة الاتصال
 */
export function isEchoConnected(): boolean {
  if (!echoInstance) {
    return false
  }

  const connector = echoInstance.connector as { pusher?: { connection?: { state?: string } } }
  return connector.pusher?.connection?.state === 'connected'
}

/**
 * الحصول على حالة الاتصال
 */
export function getEchoConnectionState(): string {
  if (!echoInstance) {
    return 'disconnected'
  }

  const connector = echoInstance.connector as { pusher?: { connection?: { state?: string } } }
  return connector.pusher?.connection?.state || 'unknown'
}

export type { Echo }

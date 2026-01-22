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
const AUTH_ENDPOINT = API_BASE_URL.replace(/\/api\/?$/, '') + '/broadcasting/auth'

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
    channel.listen('.auto-call.enqueued', callbacks.onEnqueued)
  }

  if (callbacks.onStatusUpdated) {
    channel.listen('.auto-call.status-updated', callbacks.onStatusUpdated)
  }

  if (callbacks.onAcknowledged) {
    channel.listen('.auto-call.acknowledged', callbacks.onAcknowledged)
  }

  if (callbacks.onSettingsUpdated) {
    channel.listen('.auto-call.settings-updated', callbacks.onSettingsUpdated)
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

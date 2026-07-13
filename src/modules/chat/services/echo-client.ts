import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// تأكد من تعريف Pusher عالمياً لـ Laravel Echo
;(window as any).Pusher = Pusher

let echoInstance: any = null
let echoToken: string | null = null

export function createEchoInstance(token: string) {
  // أعِد استخدام النسخة فقط إن كان التوكن نفسه؛ وإلا أعد الإنشاء بالتوكن الجديد — B10
  if (echoInstance && echoToken === token) {
    return echoInstance
  }

  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }

  echoToken = token

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'app-key',
    wsHost: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_BASE_URL ?? 'https://api.brqq.site/api'}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return echoInstance
}

export function getEchoInstance(): any {
  return echoInstance
}

export function destroyEchoInstance(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
    echoToken = null
  }
}

import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// تأكد من تعريف Pusher عالمياً لـ Laravel Echo
;(window as any).Pusher = Pusher

let echoInstance: Echo | null = null

export function createEchoInstance(token: string): Echo {
  if (echoInstance) {
    return echoInstance
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'app-key',
    wsHost: import.meta.env.VITE_REVERB_HOST ?? window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
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

export function getEchoInstance(): Echo | null {
  return echoInstance
}

export function destroyEchoInstance(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { fcmService, type PushNotificationPayload } from '@/services/notifications/fcm-service'
import { useAuthStore } from '@/modules/auth/store/auth-store'

interface UsePushNotificationsResult {
  isSupported: boolean
  isEnabled: boolean
  isLoading: boolean
  permissionState: NotificationPermission
  fcmToken: string | null
  enableNotifications: () => Promise<boolean>
  disableNotifications: () => Promise<void>
}

/**
 * Hook لإدارة Push Notifications مع Firebase
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const user = useAuthStore((state) => state.user)
  const [isSupported] = useState(() => fcmService.isSupported())
  const [isEnabled, setIsEnabled] = useState(() => fcmService.isEnabled())
  const [isLoading, setIsLoading] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'default'
    }
    return Notification.permission
  })
  const [fcmToken, setFcmToken] = useState<string | null>(() => fcmService.getCurrentToken())
  const initializedRef = useRef(false)

  // تهيئة FCM عند التحميل (مرة واحدة فقط)
  useEffect(() => {
    if (!isSupported || initializedRef.current) return
    initializedRef.current = true

    let mounted = true

    const initFCM = async () => {
      const initialized = await fcmService.initialize()
      if (initialized && mounted) {
        const token = fcmService.getCurrentToken()
        setFcmToken(token)
        setIsEnabled(!!token)
        setPermissionState(fcmService.getPermissionState())
      }
    }

    initFCM()

    // الاستماع لتغييرات Token
    const unsubscribe = fcmService.onTokenChange((token) => {
      if (mounted) {
        setFcmToken(token)
        setIsEnabled(!!token)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [isSupported])

  // تفعيل الإشعارات
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setIsLoading(true)
    try {
      // تهيئة FCM إذا لم يتم
      await fcmService.initialize()

      // طلب الإذن والحصول على Token
      const token = await fcmService.requestPermissionAndGetToken()

      if (token) {
        setFcmToken(token)
        setIsEnabled(true)
        setPermissionState('granted')

        // حفظ Token في الخادم
        if (user) {
          await saveFcmTokenToServer(token, user.id)
        }

        return true
      }

      setPermissionState(Notification.permission)
      return false
    } catch (error) {
      console.error('[usePushNotifications] Failed to enable:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user])

  // تعطيل الإشعارات
  const disableNotifications = useCallback(async (): Promise<void> => {
    if (!isSupported) return

    setIsLoading(true)
    try {
      // حذف Token من الخادم
      if (fcmToken && user) {
        await deleteFcmTokenFromServer(fcmToken, user.id)
      }

      setFcmToken(null)
      setIsEnabled(false)
    } catch (error) {
      console.error('[usePushNotifications] Failed to disable:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, fcmToken, user])

  return {
    isSupported,
    isEnabled,
    isLoading,
    permissionState,
    fcmToken,
    enableNotifications,
    disableNotifications,
  }
}

/**
 * حفظ FCM Token في الخادم
 */
async function saveFcmTokenToServer(token: string, _userId: number): Promise<void> {
  try {
    const response = await fetch('/api/teacher/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('teacher_token')}`,
      },
      body: JSON.stringify({
        token,
        platform: 'web',
        user_agent: navigator.userAgent,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save FCM token')
    }

    console.log('[usePushNotifications] FCM token saved to server')
  } catch (error) {
    console.error('[usePushNotifications] Failed to save token to server:', error)
    throw error
  }
}

/**
 * حذف FCM Token من الخادم
 */
async function deleteFcmTokenFromServer(token: string, _userId: number): Promise<void> {
  try {
    const response = await fetch('/api/teacher/fcm-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('teacher_token')}`,
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      throw new Error('Failed to delete FCM token')
    }

    console.log('[usePushNotifications] FCM token deleted from server')
  } catch (error) {
    console.error('[usePushNotifications] Failed to delete token from server:', error)
    throw error
  }
}

/**
 * Hook للاستماع للإشعارات الواردة
 */
export function useOnPushNotification(
  callback: (payload: PushNotificationPayload) => void
): void {
  useEffect(() => {
    const unsubscribe = fcmService.onMessage(callback)
    return unsubscribe
  }, [callback])
}

import { useCallback, useEffect, useState } from 'react'
import { localNotificationService, type SessionInput } from '@/services/notifications/local-notifications'

interface UseLocalNotificationsResult {
  isSupported: boolean
  hasPermission: boolean
  isRequesting: boolean
  requestPermission: () => Promise<boolean>
  scheduleWeeklyNotifications: (sessions: unknown[]) => Promise<void>
  cancelAllNotifications: () => Promise<void>
  sendTestNotification: () => Promise<void>
  scheduledCount: number
}

/**
 * Hook لإدارة الإشعارات المحلية
 */
export function useLocalNotifications(): UseLocalNotificationsResult {
  // استخدام try-catch للحماية من أخطاء iOS Safari
  const [isSupported] = useState(() => {
    try {
      return localNotificationService.isSupported()
    } catch {
      return false
    }
  })
  
  const [hasPermission, setHasPermission] = useState(() => {
    try {
      return localNotificationService.hasPermission()
    } catch {
      return false
    }
  })
  
  const [isRequesting, setIsRequesting] = useState(false)
  
  const [scheduledCount, setScheduledCount] = useState(() => {
    try {
      const scheduled = localNotificationService.getScheduledNotifications()
      return scheduled.filter((n) => n.notifyAt > new Date()).length
    } catch {
      return 0
    }
  })

  // طلب الإذن
  const requestPermission = useCallback(async () => {
    setIsRequesting(true)
    try {
      const granted = await localNotificationService.requestPermission()
      setHasPermission(granted)
      return granted
    } finally {
      setIsRequesting(false)
    }
  }, [])

  // جدولة إشعارات الحصص
  const scheduleWeeklyNotifications = useCallback(async (sessions: unknown[]) => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) {
        throw new Error('لم يتم منح إذن الإشعارات')
      }
    }

    await localNotificationService.scheduleWeeklyNotifications(sessions as SessionInput[])

    // تحديث العدد
    const scheduled = localNotificationService.getScheduledNotifications()
    setScheduledCount(scheduled.filter((n) => n.notifyAt > new Date()).length)
  }, [hasPermission, requestPermission])

  // إلغاء جميع الإشعارات
  const cancelAllNotifications = useCallback(async () => {
    await localNotificationService.cancelAllNotifications()
    setScheduledCount(0)
  }, [])

  // إرسال إشعار تجريبي
  const sendTestNotification = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) {
        throw new Error('لم يتم منح إذن الإشعارات')
      }
    }

    await localNotificationService.sendTestNotification()
  }, [hasPermission, requestPermission])

  // إعادة جدولة الإشعارات عند فتح التطبيق (مرة واحدة فقط)
  useEffect(() => {
    let mounted = true

    if (hasPermission && isSupported && mounted) {
      // تأخير بسيط لتجنب التنفيذ المتكرر
      const timeout = setTimeout(() => {
        if (mounted) {
          localNotificationService.rescheduleNotifications()
        }
      }, 1000)

      return () => {
        mounted = false
        clearTimeout(timeout)
      }
    }
  }, []) // فقط عند mount الأولي - لا نحتاج dependencies

  return {
    isSupported,
    hasPermission,
    isRequesting,
    requestPermission,
    scheduleWeeklyNotifications,
    cancelAllNotifications,
    sendTestNotification,
    scheduledCount,
  }
}

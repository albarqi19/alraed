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
  const [isSupported] = useState(() => localNotificationService.isSupported())
  const [hasPermission, setHasPermission] = useState(() =>
    localNotificationService.hasPermission()
  )
  const [isRequesting, setIsRequesting] = useState(false)
  const [scheduledCount, setScheduledCount] = useState(() => {
    const scheduled = localNotificationService.getScheduledNotifications()
    return scheduled.filter((n) => n.notifyAt > new Date()).length
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

  // إعادة جدولة الإشعارات عند فتح التطبيق
  useEffect(() => {
    if (hasPermission && isSupported) {
      localNotificationService.rescheduleNotifications()
    }
  }, [hasPermission, isSupported])

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

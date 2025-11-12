/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

/**
 * Service Worker للتعامل مع الإشعارات المحلية
 */

interface ScheduledNotification {
  id: string
  teacherId: number
  sessionId: number
  subject: string
  grade: string
  className: string
  startTime: string
  day: string
  notifyAt: string
}

// التعامل مع رسائل من النافذة الرئيسية
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const notifications = event.data.notifications as ScheduledNotification[]
    scheduleNotifications(notifications)
  }
})

// جدولة الإشعارات
function scheduleNotifications(notifications: ScheduledNotification[]) {
  notifications.forEach((notification) => {
    const notifyAt = new Date(notification.notifyAt)
    const now = new Date()
    const delay = notifyAt.getTime() - now.getTime()

    if (delay > 0) {
      // استخدام setTimeout داخل Service Worker
      setTimeout(() => {
        showNotification(notification)
      }, delay)
    }
  })
}

// عرض الإشعار
async function showNotification(notification: ScheduledNotification) {
  const title = `حصة ${notification.subject}`
  const body = `لديك حصة في ${notification.grade} - ${notification.className}\nالحصة تبدأ الساعة ${notification.startTime}`

  try {
    await self.registration.showNotification(title, {
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: notification.id,
      requireInteraction: false,
      data: {
        sessionId: notification.sessionId,
        url: '/teacher/schedule',
      },
      actions: [
        {
          action: 'view',
          title: 'فتح الجدول',
        },
        {
          action: 'dismiss',
          title: 'تجاهل',
        },
      ],
    })

    console.log(`✅ SW: تم إرسال إشعار - ${title}`)
  } catch (error) {
    console.error('SW: خطأ في عرض الإشعار:', error)
  }
}

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  if (event.action === 'view') {
    // فتح الجدول
    const url = event.notification.data?.url || '/teacher/schedule'
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // البحث عن نافذة مفتوحة
        for (const client of clients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus()
          }
        }
        // فتح نافذة جديدة
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
    )
  } else if (event.action === 'dismiss') {
    // تجاهل الإشعار
    console.log('SW: تم تجاهل الإشعار')
  } else {
    // نقر عادي على الإشعار
    const url = '/teacher/schedule'
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus()
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
    )
  }
})

// التعامل مع إغلاق الإشعار
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('SW: تم إغلاق الإشعار:', event.notification.tag)
})

export {}

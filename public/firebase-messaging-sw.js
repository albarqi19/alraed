/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 * يعمل في الخلفية لاستقبال الإشعارات حتى عند إغلاق التطبيق
 */

// استيراد مكتبات Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// إعدادات Firebase - يتم تحديثها من الفرونت
let firebaseConfig = null

// استقبال إعدادات Firebase من الصفحة الرئيسية
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config
    initializeFirebase()
  }
})

// تهيئة Firebase
function initializeFirebase() {
  if (!firebaseConfig) {
    console.warn('[FCM SW] Firebase config not available yet')
    return
  }

  try {
    // تهيئة Firebase فقط إذا لم يتم تهيئته
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig)
    }

    const messaging = firebase.messaging()

    // التعامل مع الرسائل في الخلفية
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Received background message:', payload)

      const notificationTitle = payload.notification?.title || payload.data?.title || 'إشعار جديد'
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: payload.data?.tag || `notification-${Date.now()}`,
        requireInteraction: payload.data?.requireInteraction === 'true',
        data: payload.data || {},
        actions: [
          {
            action: 'view',
            title: 'عرض',
          },
          {
            action: 'dismiss',
            title: 'تجاهل',
          },
        ],
        // إضافة صوت واهتزاز
        vibrate: [200, 100, 200],
        silent: false,
      }

      self.registration.showNotification(notificationTitle, notificationOptions)
    })

    console.log('[FCM SW] Firebase initialized successfully')
  } catch (error) {
    console.error('[FCM SW] Error initializing Firebase:', error)
  }
}

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event)

  event.notification.close()

  const data = event.notification.data || {}
  let url = data.url || data.click_action || '/teacher'

  // التحقق من نوع الإجراء
  if (event.action === 'view') {
    // فتح الرابط المحدد
    url = data.url || '/teacher/schedule'
  } else if (event.action === 'dismiss') {
    // تم الإغلاق بالفعل
    return
  }

  // فتح أو التركيز على النافذة
  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة
        for (const client of clientList) {
          if (client.url.includes('/teacher') && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: data,
            })
            return client.focus()
          }
        }

        // فتح نافذة جديدة إذا لم تكن موجودة
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
      })
  )
})

// التعامل مع إغلاق الإشعار
self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notification closed:', event.notification.tag)
})

// تهيئة عند تنشيط Service Worker
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// تهيئة عند التثبيت
self.addEventListener('install', (event) => {
  console.log('[FCM SW] Service Worker installed')
  self.skipWaiting()
})

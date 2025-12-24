/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 * يعمل في الخلفية لاستقبال الإشعارات حتى عند إغلاق التطبيق
 */

// استيراد مكتبات Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// إعدادات Firebase - مباشرة
const firebaseConfig = {
  apiKey: 'AIzaSyAeJ0Q7DnO1w2veu4MwoUGIcZKDy1KxBAM',
  authDomain: 'alraed-8db3a.firebaseapp.com',
  projectId: 'alraed-8db3a',
  storageBucket: 'alraed-8db3a.firebasestorage.app',
  messagingSenderId: '890280441907',
  appId: '1:890280441907:web:4f08a69bbed60191d04b46',
  databaseURL: 'https://alraed-8db3a-default-rtdb.firebaseio.com',
}

// تهيئة Firebase
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
    console.log('[FCM SW] Firebase initialized')
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
      requireInteraction: false,
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
      vibrate: [200, 100, 200],
      silent: false,
    }

    return self.registration.showNotification(notificationTitle, notificationOptions)
  })

  console.log('[FCM SW] Service Worker ready')
} catch (error) {
  console.error('[FCM SW] Error initializing Firebase:', error)
}

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event)

  event.notification.close()

  const data = event.notification.data || {}
  let url = data.url || data.click_action || '/teacher'

  // التحقق من نوع الإجراء
  if (event.action === 'view') {
    url = data.url || '/teacher/schedule'
  } else if (event.action === 'dismiss') {
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

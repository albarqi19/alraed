/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging Service Worker
 * يعمل في الخلفية لاستقبال الإشعارات حتى عند إغلاق التطبيق
 */

// استيراد مكتبات Firebase
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// إعدادات Firebase
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
  firebase.initializeApp(firebaseConfig)
  console.log('[FCM SW] ✅ Firebase initialized')

  const messaging = firebase.messaging()

  // التعامل مع الرسائل في الخلفية - هذا هو المهم!
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] 📩 Background message received:', payload)

    // استخراج البيانات
    const title = payload.notification?.title || payload.data?.title || 'إشعار جديد'
    const body = payload.notification?.body || payload.data?.body || ''
    const icon = payload.notification?.icon || '/icons/icon-192x192.png'

    console.log('[FCM SW] 🔔 Showing notification:', title)

    // عرض الإشعار
    return self.registration.showNotification(title, {
      body: body,
      icon: icon,
      badge: '/icons/icon-96x96.png',
      tag: `fcm-${Date.now()}`,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || payload.notification?.click_action || '/',
        ...payload.data
      }
    })
  })

  console.log('[FCM SW] ✅ Service Worker ready')
} catch (error) {
  console.error('[FCM SW] ❌ Error:', error)
}

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] 👆 Notification clicked')

  event.notification.close()

  const url = event.notification.data?.url || '/'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة
        for (const client of clientList) {
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus()
          }
        }
        // فتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(fullUrl)
        }
      })
  )
})

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] 🟢 Activated')
  event.waitUntil(clients.claim())
})

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  console.log('[FCM SW] 📦 Installing')
  self.skipWaiting()
})

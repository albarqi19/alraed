// ============================================
// نظام الرائد للإدارة المدرسية - Service Worker
// مع دعم التحديثات التلقائية
// ============================================

// 🔑 مفتاح الإصدار - يتم تحديثه تلقائياً عند كل build
const SW_VERSION = '2026.01.22.0511';
const CACHE_NAME = `alraed-school-${SW_VERSION}`;

// الملفات الأساسية للتخزين المؤقت
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/vite.svg'
];

// ============================================
// تثبيت Service Worker
// ============================================
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[SW ${SW_VERSION}] Caching app shell`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Install complete`);
      })
  );

  // ❌ لا نستخدم skipWaiting() هنا - ننتظر موافقة المستخدم
});

// ============================================
// تفعيل Service Worker
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // حذف جميع الكاش القديمة ما عدا الحالية
          if (cacheName !== CACHE_NAME && cacheName.startsWith('alraed-school-')) {
            console.log(`[SW ${SW_VERSION}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[SW ${SW_VERSION}] Claiming clients`);
      // نستخدم claim() فقط عند التحديث (وليس التثبيت الأول)
      // هذا يمنع reload loop في الزيارة الأولى
      return self.clients.claim();
    })
  );
});

// ============================================
// استرجاع البيانات - Network First Strategy
// ============================================
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات API تماماً - لا نريد تخزينها مؤقتاً
  if (event.request.url.includes('/api/') ||
    event.request.url.includes('127.0.0.1:8000') ||
    event.request.url.includes('localhost:8000') ||
    event.request.url.includes('alraed.app/api') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('gstatic.com')) {
    return;
  }

  // للملفات الستاتيكية فقط
  if (event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font') {

    event.respondWith(
      // Strategy: Network First, fallback to Cache
      fetch(event.request)
        .then((response) => {
          // تحديث الكاش بالنسخة الجديدة
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // في حالة عدم الاتصال، استخدم الكاش
          return caches.match(event.request);
        })
    );
  }
});

// ============================================
// استقبال رسائل من التطبيق
// ============================================
self.addEventListener('message', (event) => {
  console.log(`[SW ${SW_VERSION}] Message received:`, event.data);

  // رسالة لتفعيل التحديث فوراً
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW ${SW_VERSION}] Skip waiting requested`);
    self.skipWaiting();
  }

  // رسالة لجلب الإصدار الحالي
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }

  // رسالة لمسح الكاش (ما عدا localStorage - لا يمكن للـ SW الوصول إليه أصلاً)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log(`[SW ${SW_VERSION}] Clearing all caches...`);
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('alraed-school-')) {
            console.log(`[SW ${SW_VERSION}] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      if (event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});

console.log(`[SW ${SW_VERSION}] Service Worker loaded`);

/**
 * خدمة Firebase Cloud Messaging للإشعارات
 * تتيح استقبال الإشعارات حتى عند إغلاق التطبيق
 */

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'
import { getFirebaseApp } from '@/services/firebase'

// VAPID Key من إعدادات Firebase Console
// يجب الحصول عليه من: Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export interface FCMToken {
  token: string
  createdAt: Date
  platform: 'web' | 'android' | 'ios'
  userAgent: string
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, string>
  click_action?: string
}

class FCMService {
  private messaging: Messaging | null = null
  private currentToken: string | null = null
  private tokenListeners: ((token: string | null) => void)[] = []
  private messageListeners: ((payload: PushNotificationPayload) => void)[] = []

  /**
   * تهيئة خدمة FCM
   */
  async initialize(): Promise<boolean> {
    try {
      // التحقق من دعم المتصفح
      if (!this.isSupported()) {
        console.warn('[FCM] Push notifications not supported in this browser')
        return false
      }

      const app = getFirebaseApp()
      if (!app) {
        console.warn('[FCM] Firebase app not initialized')
        return false
      }

      this.messaging = getMessaging(app)

      // تسجيل Service Worker
      await this.registerServiceWorker()

      // الاستماع للرسائل في المقدمة
      this.setupForegroundListener()

      console.log('[FCM] Service initialized successfully')
      return true
    } catch (error) {
      console.error('[FCM] Failed to initialize:', error)
      return false
    }
  }

  /**
   * التحقق من دعم Push Notifications
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * تسجيل Service Worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      // تسجيل Firebase Messaging SW
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      })

      // إرسال إعدادات Firebase إلى SW
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      }

      // انتظار تفعيل SW
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig,
        })
      } else {
        registration.addEventListener('activate', () => {
          registration.active?.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig,
          })
        })
      }

      console.log('[FCM] Service Worker registered:', registration.scope)
      return registration
    } catch (error) {
      console.error('[FCM] Service Worker registration failed:', error)
      return null
    }
  }

  /**
   * طلب إذن الإشعارات والحصول على Token
   */
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission denied')
        return null
      }

      // الحصول على Token
      return await this.getToken()
    } catch (error) {
      console.error('[FCM] Failed to request permission:', error)
      return null
    }
  }

  /**
   * الحصول على FCM Token
   */
  async getToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        console.warn('[FCM] Messaging not initialized')
        return null
      }

      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        console.warn('[FCM] No service worker registration')
        return null
      }

      const token = await getToken(this.messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (token) {
        this.currentToken = token
        this.notifyTokenListeners(token)
        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...')
      }

      return token
    } catch (error) {
      console.error('[FCM] Failed to get token:', error)
      return null
    }
  }

  /**
   * إعداد مستمع الرسائل في المقدمة (عندما التطبيق مفتوح)
   */
  private setupForegroundListener(): void {
    if (!this.messaging) return

    onMessage(this.messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload)

      const notification: PushNotificationPayload = {
        title: payload.notification?.title || payload.data?.title || 'إشعار جديد',
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon,
        data: payload.data as Record<string, string>,
      }

      // إشعار المستمعين
      this.messageListeners.forEach((listener) => listener(notification))

      // عرض إشعار محلي إذا كان التطبيق في المقدمة
      this.showLocalNotification(notification)
    })
  }

  /**
   * عرض إشعار محلي
   */
  private async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') return

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        data: payload.data,
        requireInteraction: false,
      })
    } catch (error) {
      console.error('[FCM] Failed to show notification:', error)
    }
  }

  /**
   * الاشتراك في تغييرات Token
   */
  onTokenChange(callback: (token: string | null) => void): () => void {
    this.tokenListeners.push(callback)
    return () => {
      this.tokenListeners = this.tokenListeners.filter((l) => l !== callback)
    }
  }

  /**
   * الاشتراك في الرسائل
   */
  onMessage(callback: (payload: PushNotificationPayload) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== callback)
    }
  }

  /**
   * إشعار مستمعي Token
   */
  private notifyTokenListeners(token: string | null): void {
    this.tokenListeners.forEach((listener) => listener(token))
  }

  /**
   * الحصول على Token الحالي
   */
  getCurrentToken(): string | null {
    return this.currentToken
  }

  /**
   * التحقق من حالة الإذن
   */
  getPermissionState(): NotificationPermission {
    return Notification.permission
  }

  /**
   * هل الإشعارات مفعلة؟
   */
  isEnabled(): boolean {
    return this.currentToken !== null && Notification.permission === 'granted'
  }
}

// Singleton instance
export const fcmService = new FCMService()

/**
 * خدمة الإشعارات المحلية (Local Notifications)
 * تعمل داخل PWA بدون الحاجة لخادم خارجي
 */

export interface ClassSessionNotification {
  id: string
  teacherId: number
  sessionId: number
  subject: string
  grade: string
  className: string
  startTime: string
  day: string
  notifyAt: Date
}

export interface SessionInput {
  day: string
  start_time: string
  subject: string | { name: string }
  grade: string
  class_name: string
  id: number
  teacher_id: number
}

class LocalNotificationService {
  private readonly STORAGE_KEY = 'scheduled_notifications'
  private readonly PERMISSION_KEY = 'notification_permission_requested'

  /**
   * طلب إذن الإشعارات من المستخدم
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('هذا المتصفح لا يدعم الإشعارات')
      return false
    }

    // إذا سبق وتم الموافقة
    if (Notification.permission === 'granted') {
      return true
    }

    // إذا تم الرفض سابقاً
    if (Notification.permission === 'denied') {
      return false
    }

    // طلب الإذن
    try {
      const permission = await Notification.requestPermission()
      localStorage.setItem(this.PERMISSION_KEY, 'true')
      return permission === 'granted'
    } catch (error) {
      console.error('خطأ في طلب إذن الإشعارات:', error)
      return false
    }
  }

  /**
   * التحقق من دعم الإشعارات
   */
  isSupported(): boolean {
    try {
      // في iOS Safari قد يكون Notification موجود لكن غير مدعوم بشكل كامل
      if (typeof window === 'undefined') return false
      if (!('Notification' in window)) return false
      if (!('serviceWorker' in navigator)) return false
      // التحقق من إمكانية الوصول لـ permission (قد يرمي خطأ في بعض المتصفحات)
      void Notification.permission
      return true
    } catch {
      // iOS Safari قد يرمي خطأ عند الوصول لـ Notification
      return false
    }
  }

  /**
   * التحقق من حالة الإذن
   */
  hasPermission(): boolean {
    try {
      if (!this.isSupported()) return false
      return Notification.permission === 'granted'
    } catch {
      return false
    }
  }

  /**
   * جدولة إشعارات للحصص الأسبوعية
   */
  async scheduleWeeklyNotifications(sessions: SessionInput[]): Promise<void> {
    if (!this.isSupported() || !this.hasPermission()) {
      console.warn('الإشعارات غير مدعومة أو لم يتم منح الإذن')
      return
    }

    // إلغاء الإشعارات القديمة أولاً
    await this.cancelAllNotifications()

    const notifications: ClassSessionNotification[] = []
    const now = new Date()
    const leadMinutes = 5 // الإشعار قبل 5 دقائق

    // معالجة كل حصة
    for (const session of sessions) {
      const notifyDate = this.calculateNotificationTime(
        session.day,
        session.start_time,
        leadMinutes
      )

      // جدول فقط الحصص المستقبلية
      if (notifyDate > now) {
        const notification: ClassSessionNotification = {
          id: `session_${session.id}_${notifyDate.getTime()}`,
          teacherId: session.teacher_id,
          sessionId: session.id,
          subject: typeof session.subject === 'string' ? session.subject : session.subject?.name || 'مادة',
          grade: session.grade,
          className: session.class_name,
          startTime: session.start_time,
          day: session.day,
          notifyAt: notifyDate,
        }

        notifications.push(notification)
      }
    }

    // حفظ الإشعارات
    this.saveScheduledNotifications(notifications)

    // جدولة الإشعارات
    await this.scheduleNotifications(notifications)

    console.log(`✅ تم جدولة ${notifications.length} إشعار للحصص القادمة`)
  }

  /**
   * حساب وقت الإشعار بناءً على يوم وموعد الحصة
   */
  private calculateNotificationTime(
    day: string,
    startTime: string,
    leadMinutes: number
  ): Date {
    const daysMap: { [key: string]: number } = {
      'الأحد': 0,
      'الإثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6,
    }

    const now = new Date()
    const currentDay = now.getDay()
    const targetDay = daysMap[day]

    // حساب الفرق في الأيام
    let daysUntil = targetDay - currentDay
    if (daysUntil < 0) {
      daysUntil += 7 // الأسبوع القادم
    }

    // إنشاء تاريخ الحصة
    const [hours, minutes] = startTime.split(':').map(Number)
    const sessionDate = new Date(now)
    sessionDate.setDate(now.getDate() + daysUntil)
    sessionDate.setHours(hours, minutes, 0, 0)

    // طرح وقت التنبيه
    const notifyDate = new Date(sessionDate.getTime() - leadMinutes * 60 * 1000)

    return notifyDate
  }

  /**
   * جدولة الإشعارات باستخدام setTimeout أو Service Worker
   */
  private async scheduleNotifications(
    notifications: ClassSessionNotification[]
  ): Promise<void> {
    // استخدام Service Worker إن أمكن
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // إرسال البيانات للـ Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        notifications: notifications,
      })
    } else {
      // Fallback: استخدام setTimeout للإشعارات القريبة
      this.scheduleWithTimeout(notifications)
    }
  }

  /**
   * جدولة باستخدام setTimeout (للإشعارات خلال 24 ساعة)
   */
  private scheduleWithTimeout(notifications: ClassSessionNotification[]): void {
    const now = new Date()
    const maxDelay = 24 * 60 * 60 * 1000 // 24 ساعة

    notifications.forEach((notification) => {
      const delay = notification.notifyAt.getTime() - now.getTime()

      // جدول فقط الإشعارات خلال 24 ساعة
      if (delay > 0 && delay <= maxDelay) {
        setTimeout(() => {
          this.showNotification(notification)
        }, delay)
      }
    })
  }

  /**
   * عرض إشعار محلي
   */
  private async showNotification(
    notification: ClassSessionNotification
  ): Promise<void> {
    if (!this.hasPermission()) return

    const title = `حصة ${notification.subject}`
    const body = `لديك حصة في ${notification.grade} - ${notification.className}\nالحصة تبدأ الساعة ${notification.startTime}`

    try {
      // استخدام Service Worker إن أمكن
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, {
          body: body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: notification.id,
          requireInteraction: false,
          data: {
            sessionId: notification.sessionId,
            url: `/teacher/schedule`,
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
        } as NotificationOptions)
      } else {
        // Fallback: إشعار عادي
        new Notification(title, {
          body: body,
          icon: '/icons/icon-192x192.png',
          tag: notification.id,
          requireInteraction: false,
        })
      }

      console.log(`✅ تم إرسال إشعار: ${title}`)
    } catch (error) {
      console.error('خطأ في عرض الإشعار:', error)
    }
  }

  /**
   * حفظ الإشعارات المجدولة
   */
  private saveScheduledNotifications(
    notifications: ClassSessionNotification[]
  ): void {
    try {
      const data = JSON.stringify(notifications)
      localStorage.setItem(this.STORAGE_KEY, data)
    } catch (error) {
      console.error('خطأ في حفظ الإشعارات:', error)
    }
  }

  /**
   * جلب الإشعارات المجدولة
   */
  getScheduledNotifications(): ClassSessionNotification[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) return []

      const notifications = JSON.parse(data) as Array<Omit<ClassSessionNotification, 'notifyAt'> & { notifyAt: string }>
      // تحويل التواريخ من string إلى Date
      return notifications.map((n) => ({
        ...n,
        notifyAt: new Date(n.notifyAt),
      }))
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error)
      return []
    }
  }

  /**
   * إلغاء جميع الإشعارات
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      // حذف من LocalStorage
      localStorage.removeItem(this.STORAGE_KEY)

      // إلغاء من Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready
        const notifications = await registration.getNotifications()
        notifications.forEach((n) => n.close())
      }

      console.log('✅ تم إلغاء جميع الإشعارات')
    } catch (error) {
      console.error('خطأ في إلغاء الإشعارات:', error)
    }
  }

  /**
   * إرسال إشعار تجريبي
   */
  async sendTestNotification(): Promise<void> {
    if (!this.hasPermission()) {
      const granted = await this.requestPermission()
      if (!granted) {
        throw new Error('لم يتم منح إذن الإشعارات')
      }
    }

    const testNotification: ClassSessionNotification = {
      id: `test_${Date.now()}`,
      teacherId: 1,
      sessionId: 0,
      subject: 'اختبار',
      grade: 'الأول',
      className: 'أ',
      startTime: '08:00',
      day: 'الأحد',
      notifyAt: new Date(),
    }

    await this.showNotification(testNotification)
  }

  /**
   * إعادة جدولة الإشعارات (يُستدعى عند فتح التطبيق)
   */
  async rescheduleNotifications(): Promise<void> {
    const scheduled = this.getScheduledNotifications()
    if (scheduled.length === 0) return

    const now = new Date()
    const activeNotifications = scheduled.filter((n) => n.notifyAt > now)

    if (activeNotifications.length > 0) {
      await this.scheduleNotifications(activeNotifications)
      console.log(`✅ تم إعادة جدولة ${activeNotifications.length} إشعار`)
    }
  }
}

// Singleton instance
export const localNotificationService = new LocalNotificationService()

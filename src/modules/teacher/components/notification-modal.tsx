import { useEffect, useState } from 'react'
import { useLocalNotifications } from '@/hooks/use-local-notifications'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useTeacherSessionsQuery } from '../hooks'
import { useToast } from '@/shared/feedback/use-toast'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal إعدادات الإشعارات (Push + Local)
 */
export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const toast = useToast()

  // الإشعارات المحلية (Fallback)
  const {
    isSupported: isLocalSupported,
    hasPermission: hasLocalPermission,
    scheduleWeeklyNotifications,
    cancelAllNotifications: cancelLocalNotifications,
    sendTestNotification: sendLocalTestNotification,
    scheduledCount,
  } = useLocalNotifications()

  // Push Notifications (Firebase)
  const {
    isSupported: isPushSupported,
    isEnabled: isPushEnabled,
    isLoading: isPushLoading,
    permissionState,
    enableNotifications: enablePushNotifications,
    disableNotifications: disablePushNotifications,
  } = usePushNotifications()

  const { data: sessionsData } = useTeacherSessionsQuery()
  const sessions = sessionsData?.sessions || []

  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // التحقق من أن التطبيق مثبت
  const [isAppInstalled, setIsAppInstalled] = useState(false)

  useEffect(() => {
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // @ts-expect-error - navigator.standalone for iOS
      const isIOSStandalone = window.navigator.standalone === true
      return isStandalone || isIOSStandalone
    }
    setIsAppInstalled(checkIfInstalled())
  }, [])

  // تحديد نوع الإشعارات المتاح
  const isAnySupported = isPushSupported || isLocalSupported
  const isAnyEnabled = isPushEnabled || (hasLocalPermission && scheduledCount > 0)

  // تفعيل الإشعارات
  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      // محاولة تفعيل Push Notifications أولاً
      if (isPushSupported) {
        const success = await enablePushNotifications()
        if (success) {
          toast({
            type: 'success',
            title: 'تم تفعيل الإشعارات',
            description: 'ستصلك إشعارات الحصص حتى عند إغلاق التطبيق',
          })

          // جدولة الإشعارات المحلية أيضاً كنسخة احتياطية
          if (isLocalSupported && sessions.length > 0) {
            await scheduleWeeklyNotifications(sessions)
          }
          return
        }
      }

      // Fallback للإشعارات المحلية
      if (isLocalSupported) {
        if (sessions.length === 0) {
          toast({ type: 'warning', title: 'لا توجد حصص لجدولة الإشعارات' })
          return
        }

        await scheduleWeeklyNotifications(sessions)
        toast({
          type: 'success',
          title: 'تم تفعيل الإشعارات المحلية',
          description: 'ستصلك إشعارات عندما يكون التطبيق مفتوحاً',
        })
      }
    } catch (error) {
      console.error('خطأ في تفعيل الإشعارات:', error)
      toast({ type: 'error', title: 'فشل تفعيل الإشعارات' })
    } finally {
      setIsEnabling(false)
    }
  }

  // تعطيل الإشعارات
  const handleDisable = async () => {
    setIsDisabling(true)
    try {
      if (isPushEnabled) {
        await disablePushNotifications()
      }
      if (scheduledCount > 0) {
        await cancelLocalNotifications()
      }
      toast({ type: 'success', title: 'تم إلغاء جميع الإشعارات' })
    } catch (error) {
      console.error('خطأ في إلغاء الإشعارات:', error)
      toast({ type: 'error', title: 'فشل إلغاء الإشعارات' })
    } finally {
      setIsDisabling(false)
    }
  }

  // إرسال إشعار تجريبي
  const handleTest = async () => {
    setIsTesting(true)
    try {
      await sendLocalTestNotification()
      toast({ type: 'success', title: 'تم إرسال إشعار تجريبي' })
    } catch (error) {
      console.error('خطأ في إرسال الإشعار التجريبي:', error)
      toast({ type: 'error', title: 'فشل إرسال الإشعار التجريبي' })
    } finally {
      setIsTesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-t-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <i className="bi bi-x-lg text-xl" />
              </button>
              <h2 className="text-xl font-bold text-slate-900">إشعارات الحصص</h2>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
              {/* تحذير إذا المتصفح لا يدعم */}
              {!isAnySupported && (
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-3 text-right">
                    <div className="flex-shrink-0 text-3xl">⚠️</div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-rose-900">الإشعارات غير مدعومة</h3>
                      <p className="mt-1 text-sm text-rose-700">
                        متصفحك لا يدعم الإشعارات. يرجى استخدام متصفح حديث مثل Chrome أو Firefox.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* تحذير إذا لم يكن التطبيق مثبتاً */}
              {isAnySupported && !isAppInstalled && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-3 text-right">
                    <div className="flex-shrink-0 text-2xl">📱</div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-amber-900">ثبّت التطبيق للحصول على أفضل تجربة</h4>
                      <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                        للحصول على إشعارات موثوقة ومستمرة، يُنصح بتثبيت التطبيق على جهازك.
                        اضغط على زر <strong>المشاركة</strong> في المتصفح ثم اختر{' '}
                        <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isAnySupported && (
                <>
                  {/* وصف الميزة */}
                  <div className="text-center">
                    <div className="text-5xl">🔔</div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">تذكير تلقائي بالحصص</h3>
                    <p className="mt-2 text-sm text-muted">
                      احصل على تنبيه قبل 5 دقائق من كل حصة تلقائياً
                    </p>
                  </div>

                  {/* الحالة الحالية */}
                  <div
                    className="rounded-xl border-2 p-5 text-center"
                    style={{
                      borderColor: isAnyEnabled ? '#10b981' : '#94a3b8',
                      backgroundColor: isAnyEnabled ? '#ecfdf5' : '#f8fafc',
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="text-4xl font-bold"
                        style={{
                          color: isAnyEnabled ? '#10b981' : '#64748b',
                        }}
                      >
                        {isPushEnabled ? '✅' : scheduledCount > 0 ? scheduledCount : '❌'}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {isPushEnabled
                        ? 'الإشعارات مفعلة (Push)'
                        : scheduledCount > 0
                          ? `${scheduledCount} إشعار مجدول (محلي)`
                          : 'الإشعارات غير مفعلة'}
                    </p>
                    {isPushEnabled && (
                      <p className="mt-1 text-xs text-muted">
                        ستصلك الإشعارات حتى عند إغلاق التطبيق
                      </p>
                    )}
                    {!isPushEnabled && scheduledCount > 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        تعمل فقط عندما يكون التطبيق مفتوحاً
                      </p>
                    )}
                  </div>

                  {/* نوع الإشعارات */}
                  {isPushSupported && (
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="flex items-start gap-3 text-right">
                        <span className="text-2xl">🚀</span>
                        <div className="flex-1">
                          <h4 className="font-bold text-emerald-900">Push Notifications</h4>
                          <p className="mt-1 text-sm text-emerald-700">
                            إشعارات فورية تصلك حتى عند إغلاق التطبيق أو الهاتف
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* المميزات */}
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">✅</span>
                        <p className="flex-1 text-slate-700">
                          <strong className="font-semibold">تعمل في الخلفية:</strong> حتى عند إغلاق التطبيق
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">⏰</span>
                        <p className="flex-1 text-slate-700">
                          <strong className="font-semibold">تنبيه مبكر:</strong> قبل 5 دقائق من كل حصة
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">🔒</span>
                        <p className="flex-1 text-slate-700">
                          <strong className="font-semibold">خصوصية كاملة:</strong> بياناتك آمنة
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* الأزرار */}
                  <div className="space-y-3">
                    {!isAnyEnabled ? (
                      <button
                        type="button"
                        onClick={handleEnable}
                        disabled={isEnabling || isPushLoading || sessions.length === 0}
                        className="button-primary w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEnabling || isPushLoading ? (
                          <>
                            <span className="inline-block animate-spin">⏳</span>
                            <span className="mr-2">جاري التفعيل...</span>
                          </>
                        ) : (
                          <>
                            <span>🔔</span>
                            <span className="mr-2">تفعيل الإشعارات</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleEnable}
                          disabled={isEnabling || sessions.length === 0}
                          className="button-secondary py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEnabling ? (
                            <>
                              <span className="inline-block animate-spin">⏳</span>
                              <span className="mr-2">جاري التحديث...</span>
                            </>
                          ) : (
                            <>
                              <span>🔄</span>
                              <span className="mr-2">تحديث الإشعارات</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDisable}
                          disabled={isDisabling}
                          className="button-secondary py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDisabling ? (
                            <>
                              <span className="inline-block animate-spin">⏳</span>
                              <span className="mr-2">جاري الإلغاء...</span>
                            </>
                          ) : (
                            <>
                              <span>🔕</span>
                              <span className="mr-2">إلغاء جميع الإشعارات</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={isTesting || (!hasLocalPermission && !isPushEnabled)}
                      className="button-secondary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTesting ? (
                        <>
                          <span className="inline-block animate-spin">⏳</span>
                          <span className="mr-2">جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <span>🧪</span>
                          <span className="mr-2">إرسال إشعار تجريبي</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* تنبيه حالة الإذن */}
                  {permissionState === 'denied' && (
                    <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-center">
                      <p className="text-sm font-semibold text-rose-800">
                        ⚠️ تم رفض إذن الإشعارات
                      </p>
                      <p className="mt-1 text-xs text-rose-700">
                        يرجى تفعيل الإشعارات من إعدادات المتصفح ثم إعادة المحاولة
                      </p>
                    </div>
                  )}

                  {/* تنبيه إذا لم يكن هناك حصص */}
                  {sessions.length === 0 && (
                    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
                      <p className="text-sm font-semibold text-amber-800">⚠️ لا توجد حصص في جدولك حالياً</p>
                      <p className="mt-1 text-xs text-amber-700">يرجى مراجعة الإدارة لإضافة حصصك إلى النظام</p>
                    </div>
                  )}

                  {/* ملاحظة */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-semibold text-slate-900">ملاحظة:</strong>{' '}
                      {isPushEnabled
                        ? 'الإشعارات مرتبطة بهذا الجهاز. إذا سجلت الدخول من جهاز آخر، ستحتاج لتفعيل الإشعارات عليه أيضاً.'
                        : 'للحصول على إشعارات تعمل في الخلفية، يُنصح بتفعيل Push Notifications.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer - زر الإغلاق */}
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="button-secondary w-full py-3 text-base font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

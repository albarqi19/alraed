import { useState } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useToast } from '@/shared/feedback/use-toast'

// استخدام VITE_API_BASE_URL من environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.brqq.site/api'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal إعدادات الإشعارات (Push Notifications فقط)
 * الإشعارات تُرسل من Laravel عبر Firebase - لا جدولة محلية
 */
export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const toast = useToast()

  const {
    isSupported,
    isEnabled,
    isLoading,
    permissionState,
    enableNotifications,
    disableNotifications,
  } = usePushNotifications()

  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // تفعيل الإشعارات
  const handleEnable = async () => {
    setIsEnabling(true)
    try {
      const success = await enableNotifications()
      if (success) {
        toast({
          type: 'success',
          title: 'تم تفعيل الإشعارات',
          description: 'ستصلك إشعارات الحصص قبل 5 دقائق من موعدها',
        })
      } else {
        toast({
          type: 'error',
          title: 'فشل تفعيل الإشعارات',
          description: 'يرجى السماح بالإشعارات من إعدادات المتصفح',
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
      await disableNotifications()
      toast({ type: 'success', title: 'تم إلغاء الإشعارات' })
    } catch (error) {
      console.error('خطأ في إلغاء الإشعارات:', error)
      toast({ type: 'error', title: 'فشل إلغاء الإشعارات' })
    } finally {
      setIsDisabling(false)
    }
  }

  // إرسال إشعار تجريبي من السيرفر
  const handleTest = async () => {
    setIsTesting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/fcm/token/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (response.ok) {
        toast({ type: 'success', title: 'تم إرسال إشعار تجريبي' })
      } else {
        throw new Error('Failed to send test notification')
      }
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
          <div className="rounded-t-3xl bg-white dark:bg-slate-800 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <i className="bi bi-x-lg text-xl" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">إشعارات الحصص</h2>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
              {/* تحذير إذا المتصفح لا يدعم */}
              {!isSupported && (
                <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 p-4">
                  <div className="flex items-start gap-3 text-right">
                    <div className="flex-shrink-0 text-3xl">⚠️</div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">الإشعارات غير مدعومة</h3>
                      <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">
                        متصفحك لا يدعم الإشعارات. يرجى استخدام متصفح حديث مثل Chrome أو Firefox.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isSupported && (
                <>
                  {/* وصف الميزة */}
                  <div className="text-center">
                    <div className="text-5xl">🔔</div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">تذكير تلقائي بالحصص</h3>
                    <p className="mt-2 text-sm text-muted">
                      احصل على تنبيه قبل 5 دقائق من كل حصة تلقائياً
                    </p>
                  </div>

                  {/* الحالة الحالية */}
                  <div
                    className={isEnabled
                      ? "rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-5 text-center"
                      : "rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-5 text-center"
                    }
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className={isEnabled ? "text-4xl font-bold text-emerald-500" : "text-4xl font-bold text-slate-500 dark:text-slate-400"}>
                        {isEnabled ? '✅' : '❌'}
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isEnabled ? 'الإشعارات مفعلة' : 'الإشعارات غير مفعلة'}
                    </p>
                    {isEnabled && (
                      <p className="mt-1 text-xs text-muted">
                        ستصلك الإشعارات حتى عند إغلاق التطبيق
                      </p>
                    )}
                  </div>

                  {/* المميزات */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">✅</span>
                        <p className="flex-1 text-slate-700 dark:text-slate-300">
                          <strong className="font-semibold">تعمل في الخلفية:</strong> حتى عند إغلاق التطبيق
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">⏰</span>
                        <p className="flex-1 text-slate-700 dark:text-slate-300">
                          <strong className="font-semibold">تنبيه مبكر:</strong> قبل 5 دقائق من كل حصة
                        </p>
                      </div>
                      <div className="flex items-start gap-3 text-right text-sm">
                        <span className="text-lg">🔒</span>
                        <p className="flex-1 text-slate-700 dark:text-slate-300">
                          <strong className="font-semibold">خصوصية كاملة:</strong> بياناتك آمنة
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* الأزرار */}
                  <div className="space-y-3">
                    {!isEnabled ? (
                      <button
                        type="button"
                        onClick={handleEnable}
                        disabled={isEnabling || isLoading}
                        className="button-primary w-full py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEnabling || isLoading ? (
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
                      <button
                        type="button"
                        onClick={handleDisable}
                        disabled={isDisabling}
                        className="button-secondary w-full py-3 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDisabling ? (
                          <>
                            <span className="inline-block animate-spin">⏳</span>
                            <span className="mr-2">جاري الإلغاء...</span>
                          </>
                        ) : (
                          <>
                            <span>🔕</span>
                            <span className="mr-2">إلغاء الإشعارات</span>
                          </>
                        )}
                      </button>
                    )}

                    {isEnabled && (
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={isTesting}
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
                    )}
                  </div>

                  {/* تنبيه حالة الإذن */}
                  {permissionState === 'denied' && (
                    <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 p-4 text-center">
                      <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                        ⚠️ تم رفض إذن الإشعارات
                      </p>
                      <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                        يرجى تفعيل الإشعارات من إعدادات المتصفح ثم إعادة المحاولة
                      </p>
                    </div>
                  )}

                  {/* ملاحظة */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">ملاحظة:</strong>{' '}
                      الإشعارات مرتبطة بهذا الجهاز. إذا سجلت الدخول من جهاز آخر، ستحتاج لتفعيل الإشعارات عليه أيضاً.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer - زر الإغلاق */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
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

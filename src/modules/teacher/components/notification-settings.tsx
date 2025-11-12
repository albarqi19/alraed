import { useEffect, useState } from 'react'
import { useLocalNotifications } from '@/hooks/use-local-notifications'
import { useTeacherSessionsQuery } from '../hooks'
import { useToast } from '@/shared/feedback/use-toast'

/**
 * مكون إعدادات الإشعارات المحلية للحصص
 */
export function NotificationSettings() {
  const toast = useToast()
  const {
    isSupported,
    hasPermission,
    isRequesting,
    requestPermission,
    scheduleWeeklyNotifications,
    cancelAllNotifications,
    sendTestNotification,
    scheduledCount,
  } = useLocalNotifications()

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

  // تفعيل الإشعارات
  const handleEnable = async () => {
    if (sessions.length === 0) {
      toast({ type: 'warning', title: 'لا توجد حصص لجدولة الإشعارات' })
      return
    }

    setIsEnabling(true)
    try {
      // طلب الإذن إذا لم يكن ممنوحاً
      if (!hasPermission) {
        const granted = await requestPermission()
        if (!granted) {
          toast({ type: 'error', title: 'لم يتم منح إذن الإشعارات' })
          return
        }
      }

      // جدولة الإشعارات
      await scheduleWeeklyNotifications(sessions)

      toast({
        type: 'success',
        title: 'تم تفعيل الإشعارات',
        description: `سيتم تذكيرك قبل 5 دقائق من كل حصة`,
      })
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
      await cancelAllNotifications()
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
      await sendTestNotification()
      toast({ type: 'success', title: 'تم إرسال إشعار تجريبي' })
    } catch (error) {
      console.error('خطأ في إرسال الإشعار التجريبي:', error)
      toast({ type: 'error', title: 'فشل إرسال الإشعار التجريبي' })
    } finally {
      setIsTesting(false)
    }
  }

  // إذا كان المتصفح لا يدعم الإشعارات
  if (!isSupported) {
    return (
      <div className="glass-card">
        <div className="flex items-start gap-4 text-right">
          <div className="flex-shrink-0 text-3xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">الإشعارات غير مدعومة</h3>
            <p className="mt-2 text-sm text-muted">
              متصفحك لا يدعم الإشعارات المحلية. يرجى استخدام متصفح حديث مثل Chrome أو Firefox أو Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card space-y-6">
      {/* تحذير إذا لم يكن التطبيق مثبتاً */}
      {!isAppInstalled && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3 text-right">
            <div className="flex-shrink-0 text-2xl">📱</div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-amber-900">ثبّت التطبيق أولاً</h4>
              <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                للحصول على إشعارات موثوقة ومستمرة، يُنصح بتثبيت التطبيق على جهازك.
                اضغط على زر <strong>المشاركة</strong> في المتصفح ثم اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* العنوان */}
      <div className="flex items-start gap-4 text-right">
        <div className="flex-shrink-0 text-4xl">🔔</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900">إشعارات الحصص</h3>
          <p className="mt-1 text-sm text-muted">
            احصل على تنبيه قبل 5 دقائق من كل حصة تلقائياً
          </p>
        </div>
      </div>

      {/* الحالة الحالية */}
      <div className="rounded-xl border-2 p-4 text-center" style={{
        borderColor: scheduledCount > 0 ? '#10b981' : '#94a3b8',
        backgroundColor: scheduledCount > 0 ? '#ecfdf5' : '#f8fafc',
      }}>
        <div className="text-3xl font-bold" style={{
          color: scheduledCount > 0 ? '#10b981' : '#64748b',
        }}>
          {scheduledCount}
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {scheduledCount > 0 ? 'إشعار مجدول' : 'لا توجد إشعارات مجدولة'}
        </p>
        {scheduledCount > 0 && (
          <p className="mt-1 text-xs text-muted">
            للحصص القادمة خلال الأسبوع
          </p>
        )}
      </div>

      {/* معلومات إضافية */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 text-right text-sm">
          <span className="text-lg">✅</span>
          <p className="flex-1 text-slate-700">
            <strong className="font-semibold">تلقائي 100%:</strong> لا يحتاج اتصال بالإنترنت
          </p>
        </div>
        <div className="flex items-start gap-3 text-right text-sm">
          <span className="text-lg">🔒</span>
          <p className="flex-1 text-slate-700">
            <strong className="font-semibold">خصوصية كاملة:</strong> جميع البيانات محلية في جهازك
          </p>
        </div>
        <div className="flex items-start gap-3 text-right text-sm">
          <span className="text-lg">⚡</span>
          <p className="flex-1 text-slate-700">
            <strong className="font-semibold">سريع وموفر:</strong> لا يستهلك بطارية أو بيانات
          </p>
        </div>
      </div>

      {/* الأزرار */}
      <div className="space-y-3">
        {scheduledCount === 0 ? (
          // زر التفعيل
          <button
            type="button"
            onClick={handleEnable}
            disabled={isEnabling || isRequesting || sessions.length === 0}
            className="button-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnabling || isRequesting ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span className="mr-2">جاري التفعيل...</span>
              </>
            ) : (
              <>
                <span>🔔</span>
                <span className="mr-2">تفعيل الإشعارات التلقائية</span>
              </>
            )}
          </button>
        ) : (
          // أزرار التحديث والإلغاء
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

        {/* زر الاختبار */}
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !hasPermission}
          className="button-secondary w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* تنبيه إذا لم يكن هناك حصص */}
      {sessions.length === 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ لا توجد حصص في جدولك حالياً
          </p>
          <p className="mt-1 text-xs text-amber-700">
            يرجى مراجعة الإدارة لإضافة حصصك إلى النظام
          </p>
        </div>
      )}

      {/* ملاحظة */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="font-semibold text-slate-900">ملاحظة:</strong> يتم حفظ الإشعارات محلياً في جهازك.
          إذا قمت بمسح بيانات المتصفح أو تسجيل الخروج، ستحتاج لإعادة تفعيل الإشعارات.
        </p>
      </div>
    </div>
  )
}

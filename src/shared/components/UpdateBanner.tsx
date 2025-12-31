import { useAppUpdate } from '@/hooks/use-app-update'

/**
 * بانر إشعار التحديث
 * يظهر عند وجود إصدار جديد من التطبيق
 * متوافق مع جميع الثيمات
 */
export function UpdateBanner() {
  const { isUpdateAvailable, isUpdating, applyUpdate, dismissUpdate, currentVersion, newVersion } = useAppUpdate()

  if (!isUpdateAvailable) {
    return null
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300"
      role="alert"
      aria-live="polite"
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
        }}
      >
        {/* الأيقونة والنص */}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">
            🚀
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold">تحديث جديد متاح!</span>
            <span className="text-xs opacity-90">
              {currentVersion && newVersion
                ? `الإصدار ${newVersion} جاهز للتثبيت`
                : 'يتوفر إصدار جديد من التطبيق'}
            </span>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-2">
          {/* زر تحديث الآن */}
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
            style={{ color: 'var(--color-primary-dark)' }}
          >
            {isUpdating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>جارٍ التحديث...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>تحديث الآن</span>
              </>
            )}
          </button>

          {/* زر لاحقاً */}
          <button
            type="button"
            onClick={dismissUpdate}
            disabled={isUpdating}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all hover:bg-white/30 disabled:opacity-50"
            aria-label="إغلاق"
            title="تذكيري لاحقاً"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpdateBanner

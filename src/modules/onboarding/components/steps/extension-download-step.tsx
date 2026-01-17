import { useState, useEffect } from 'react'
import { CHROME_EXTENSION_URL } from '../../constants'
import type { StepComponentProps } from '../../types'

export function ExtensionDownloadStep({ onComplete, onSkip, isCompleting, isSkipping }: StepComponentProps) {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null)
  const [hasClickedDownload, setHasClickedDownload] = useState(false)

  // كشف الإضافة
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ALRAED_EXTENSION_DETECTED') {
        setIsExtensionInstalled(true)
      }
    }

    window.addEventListener('message', handleMessage)
    window.postMessage({ type: 'ALRAED_DETECT_EXTENSION' }, '*')

    const timeout = setTimeout(() => {
      if (isExtensionInstalled === null) {
        setIsExtensionInstalled(false)
      }
    }, 1500)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [isExtensionInstalled])

  // إعادة فحص الإضافة بشكل دوري بعد الضغط على التحميل
  useEffect(() => {
    if (!hasClickedDownload || isExtensionInstalled) return

    const interval = setInterval(() => {
      window.postMessage({ type: 'ALRAED_DETECT_EXTENSION' }, '*')
    }, 3000)

    return () => clearInterval(interval)
  }, [hasClickedDownload, isExtensionInstalled])

  const handleDownloadClick = () => {
    setHasClickedDownload(true)
    window.open(CHROME_EXTENSION_URL, '_blank')
  }

  const canProceed = isExtensionInstalled || hasClickedDownload

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-blue-500/20">
          <span className="text-3xl font-bold">R</span>
        </div>
        <h3 className="text-xl font-bold text-slate-800">إضافة الرَّائِد لمتصفح كروم</h3>
        <p className="mt-2 text-slate-500">أداة استيراد البيانات من نظام نور ومنصة مدرستي</p>
      </div>

      {/* Extension Status */}
      {isExtensionInstalled === null && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          <span className="text-slate-600">جاري الكشف عن الإضافة...</span>
        </div>
      )}

      {isExtensionInstalled === true && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <i className="bi bi-check-lg text-2xl" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">إضافة الرائد مُثبّتة</p>
            <p className="text-sm text-emerald-600">يمكنك الآن استيراد البيانات بسهولة من نور ومدرستي</p>
          </div>
        </div>
      )}

      {isExtensionInstalled === false && (
        <div className="space-y-4">
          {/* Features */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <i className="bi bi-people" />
              </div>
              <h4 className="font-semibold text-slate-700">استيراد الطلاب</h4>
              <p className="text-sm text-slate-500">استيراد بيانات الطلاب مباشرة من نظام نور</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <i className="bi bi-table" />
              </div>
              <h4 className="font-semibold text-slate-700">استيراد الجدول</h4>
              <p className="text-sm text-slate-500">استيراد الجدول الدراسي من منصة مدرستي</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <i className="bi bi-person-badge" />
              </div>
              <h4 className="font-semibold text-slate-700">استيراد المعلمين</h4>
              <p className="text-sm text-slate-500">استيراد بيانات المعلمين من النظام</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <i className="bi bi-check2-square" />
              </div>
              <h4 className="font-semibold text-slate-700">مزامنة الحضور</h4>
              <p className="text-sm text-slate-500">مزامنة سجلات الحضور مع نظام نور</p>
            </div>
          </div>

          {/* Download Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-l from-blue-500 to-cyan-500 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-500/30 transition hover:shadow-2xl hover:shadow-blue-500/40"
            >
              <i className="bi bi-download text-xl" />
              تحميل الإضافة من متجر كروم
            </button>
          </div>

          {hasClickedDownload && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center">
              <p className="text-sm text-amber-700">
                <i className="bi bi-info-circle ml-2" />
                بعد تثبيت الإضافة، قم بتحديث هذه الصفحة أو انتظر قليلاً
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="mb-3 font-semibold text-slate-700">
          <i className="bi bi-list-ol ml-2" />
          خطوات تثبيت الإضافة
        </h4>
        <ol className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
              1
            </span>
            <span>اضغط على زر "تحميل الإضافة" أعلاه</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
              2
            </span>
            <span>في صفحة متجر كروم، اضغط على "إضافة إلى Chrome"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
              3
            </span>
            <span>وافق على الأذونات المطلوبة</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
              4
            </span>
            <span>ستظهر أيقونة الإضافة في شريط المتصفح</span>
          </li>
        </ol>
      </div>

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete({ extension_installed: isExtensionInstalled })}
          disabled={!canProceed || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              {isExtensionInstalled ? 'التالي' : 'تم التحميل، التالي'}
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يرجى تحميل الإضافة للمتابعة
        </p>
      )}
    </div>
  )
}

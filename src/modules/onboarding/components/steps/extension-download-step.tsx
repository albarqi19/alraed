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
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div
          className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[10px] border"
          style={{
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-primary-dark)',
          }}
        >
          <span className="text-2xl font-bold">R</span>
        </div>
        <h3 className="text-[16px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          إضافة الرَّائِد لمتصفح كروم
        </h3>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          أداة استيراد البيانات من نظام نور ومنصة مدرستي
        </p>
      </div>

      {/* Extension Status */}
      {isExtensionInstalled === null && (
        <div
          className="flex items-center justify-center gap-3 rounded-[10px] border py-3"
          style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
        >
          <span className="ws-spinner" />
          <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            جاري الكشف عن الإضافة...
          </span>
        </div>
      )}

      {isExtensionInstalled === true && (
        <div className="ws-alert ws-alert--success ws-alert--boxed">
          <i className="bi bi-check-lg" />
          <div>
            <p className="font-semibold">إضافة الرائد مُثبّتة</p>
            <p className="text-[12px]">يمكنك الآن استيراد البيانات بسهولة من نور ومدرستي</p>
          </div>
        </div>
      )}

      {isExtensionInstalled === false && (
        <div className="space-y-3">
          {/* Features */}
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { icon: 'bi-people', title: 'استيراد الطلاب', desc: 'استيراد بيانات الطلاب مباشرة من نظام نور' },
              { icon: 'bi-table', title: 'استيراد الجدول', desc: 'استيراد الجدول الدراسي من منصة مدرستي' },
              { icon: 'bi-person-badge', title: 'استيراد المعلمين', desc: 'استيراد بيانات المعلمين من النظام' },
              { icon: 'bi-check2-square', title: 'مزامنة الحضور', desc: 'مزامنة سجلات الحضور مع نظام نور' },
            ].map((feature) => (
              <div
                key={feature.icon}
                className="flex items-start gap-3 rounded-[10px] border p-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    background: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  <i className={`bi ${feature.icon}`} />
                </span>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {feature.title}
                  </h4>
                  <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Download Button */}
          <div className="text-center">
            <button type="button" onClick={handleDownloadClick} className="ws-btn ws-btn--primary">
              <i className="bi bi-download" />
              تحميل الإضافة من متجر كروم
            </button>
          </div>

          {hasClickedDownload && (
            <div className="ws-alert ws-alert--warn ws-alert--boxed">
              <i className="bi bi-info-circle" />
              <span>بعد تثبيت الإضافة، قم بتحديث هذه الصفحة أو انتظر قليلاً</span>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <span className="ws-panel__title">
            <i className="bi bi-list-ol" />
            خطوات تثبيت الإضافة
          </span>
        </div>
        <div className="ws-panel__body">
          <ol className="space-y-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {[
              'اضغط على زر "تحميل الإضافة" أعلاه',
              'في صفحة متجر كروم، اضغط على "إضافة إلى Chrome"',
              'وافق على الأذونات المطلوبة',
              'ستظهر أيقونة الإضافة في شريط المتصفح',
            ].map((text, index) => (
              <li key={text} className="flex items-start gap-2">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
                  style={{
                    background: 'var(--color-sunken)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {index + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Next Button */}
      <div
        className="flex items-center justify-between border-t pt-4"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-[13px] underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete({ extension_installed: isExtensionInstalled })}
          disabled={!canProceed || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              {isExtensionInstalled ? 'التالي' : 'تم التحميل، التالي'}
              <i className="bi bi-arrow-left" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          <span>يرجى تحميل الإضافة للمتابعة</span>
        </div>
      )}
    </div>
  )
}

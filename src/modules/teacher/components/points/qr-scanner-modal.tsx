import { useMemo, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import type { TeacherPointMode } from '@/modules/teacher/points/types'

interface QrScannerModalProps {
  isOpen: boolean
  mode: TeacherPointMode
  onClose: () => void
  onDetected: (token: string) => void
  isProcessing?: boolean
  studentName?: string
  onCameraError?: (message: string) => void
}

export function QrScannerModal({
  isOpen,
  mode,
  onClose,
  onDetected,
  isProcessing = false,
  studentName,
  onCameraError,
}: QrScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null)

  const instructions = useMemo(() => {
    if (mode === 'reward') {
      return 'وجّه كاميرا الجوال نحو رمز الطالب لإضافة النقاط فوراً.'
    }
    return 'قم بمسح بطاقة الطالب لتأكيد تسجيل المخالفة.'
  }, [mode])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white text-right shadow-2xl">
        <header className={`flex items-center justify-between px-5 py-4 ${mode === 'reward' ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white'}`}>
          <div>
            <h2 className="text-lg font-semibold">ماسح رمز الطالب</h2>
            <p className="text-xs opacity-80">{instructions}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/40 text-white"
            aria-label="إغلاق"
          >
            ×
          </button>
        </header>

          <div className="space-y-4 px-5 py-6">
          {cameraError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
              {cameraError}
            </div>
          ) : null}

            {studentName ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                الرجاء مسح بطاقة الطالب: <span className="text-teal-700">{studentName}</span>
              </div>
            ) : null}

          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-slate-200 bg-black/80">
            <Scanner
              onScan={(detected) => {
                if (!Array.isArray(detected) || detected.length === 0) {
                  return
                }

                const [first] = detected
                const value = first?.rawValue ?? ''

                if (value) {
                  onDetected(value)
                }
              }}
              onError={(error: unknown) => {
                if (cameraError) {
                  return
                }

                let message: string | null = null

                if (error instanceof Error && error.message) {
                  message = error.message
                } else if (typeof error === 'string' && error.trim()) {
                  message = error
                }

                const finalMessage = message ?? 'حدث خطأ في الكاميرا'
                setCameraError(finalMessage)
                onCameraError?.(finalMessage)
              }}
              constraints={{ facingMode: 'environment' }}
              formats={['qr_code']}
              paused={isProcessing}
              scanDelay={400}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { width: '100%', height: '100%', objectFit: 'cover' },
              }}
            />
            <div className="pointer-events-none absolute inset-6 rounded-[2.5rem] border-[6px] border-dashed border-white/70"></div>
          </div>

          <p className="text-xs leading-6 text-muted">
            تأكّد من إعطاء التطبيق صلاحية الوصول للكاميرا. في حال تكرار المشكلة، قم بتحديث الصفحة أو استخدم متصفحاً حديثاً مثل Chrome أو Safari.
          </p>

          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
              <span className="h-2 w-2 animate-ping rounded-full bg-teal-500"></span>
              جاري حفظ العملية...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

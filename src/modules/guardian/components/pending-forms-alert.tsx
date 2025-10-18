import { AlertCircle } from 'lucide-react'

interface PendingFormsAlertProps {
  count: number
  onViewForms: () => void
}

export function PendingFormsAlert({ count, onViewForms }: PendingFormsAlertProps) {
  if (count === 0) return null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          
          <div className="flex-1 text-right">
            <h3 className="text-lg font-bold text-amber-900">
              لديك {count} {count > 1 ? 'نماذج' : 'نموذج'} بانتظار التعبئة
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              يرجى إكمال النماذج المطلوبة في أقرب وقت ممكن لضمان معالجتها من قبل المدرسة.
            </p>
            
            <button
              type="button"
              onClick={onViewForms}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
            >
              <i className="bi bi-ui-checks-grid" />
              <span>عرض النماذج المعلقة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

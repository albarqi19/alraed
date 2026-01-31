import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'

export function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl text-center">
        {/* Warning Icon */}
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-14 h-14 text-amber-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-amber-600 mb-4">
          تم إلغاء الدفع
        </h1>

        {/* Message */}
        <p className="text-slate-600 text-lg leading-relaxed mb-4">
          لقد قمت بإلغاء عملية الدفع. لم يتم خصم أي مبلغ من حسابك.
        </p>
        <p className="text-slate-500 leading-relaxed mb-8">
          يمكنك المحاولة مرة أخرى في أي وقت أو العودة للوحة التحكم.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            المحاولة مرة أخرى
          </button>
          <Link
            to="/admin/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            العودة للوحة التحكم
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

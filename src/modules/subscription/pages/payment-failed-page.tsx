import { Link, useSearchParams } from 'react-router-dom'
import { XCircle, RotateCcw, ArrowRight, CreditCard, Building2, RefreshCw, Phone } from 'lucide-react'

export function PaymentFailedPage() {
  const [searchParams] = useSearchParams()
  const errorMessage = searchParams.get('error')

  const tips = [
    { icon: CreditCard, text: 'تأكد من صحة بيانات البطاقة' },
    { icon: Building2, text: 'تأكد من وجود رصيد كافٍ' },
    { icon: RefreshCw, text: 'جرب استخدام بطاقة أخرى' },
    { icon: Phone, text: 'تواصل مع البنك إذا استمرت المشكلة' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-14 h-14 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          فشل الدفع
        </h1>

        {/* Message */}
        <p className="text-slate-600 text-lg leading-relaxed mb-6">
          عذراً، لم نتمكن من إتمام عملية الدفع. يرجى المحاولة مرة أخرى.
        </p>

        {/* Error Details */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-800 text-sm">
              {decodeURIComponent(errorMessage)}
            </p>
          </div>
        )}

        {/* Tips Section */}
        <div className="bg-slate-50 rounded-2xl p-5 mb-6 text-right">
          <h3 className="font-semibold text-slate-800 mb-4">نصائح لحل المشكلة:</h3>
          <ul className="space-y-3">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-center gap-3 text-slate-600">
                <tip.icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
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

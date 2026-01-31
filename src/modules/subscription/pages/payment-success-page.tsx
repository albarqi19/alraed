import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Sparkles } from 'lucide-react'

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const invoiceNumber = searchParams.get('invoice')
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Hide confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-14 h-14 text-emerald-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-emerald-600 mb-4 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6" />
          تم الدفع بنجاح!
          <Sparkles className="w-6 h-6" />
        </h1>

        {/* Message */}
        <p className="text-slate-600 text-lg leading-relaxed mb-6">
          شكراً لك! تم تأكيد عملية الدفع بنجاح وتم تفعيل اشتراكك.
        </p>

        {/* Invoice Info */}
        {invoiceNumber && (
          <div className="bg-slate-50 rounded-2xl p-5 mb-6">
            <p className="text-slate-700">
              <span className="font-semibold">رقم الفاتورة:</span>{' '}
              <span className="text-slate-900 font-mono">{invoiceNumber}</span>
            </p>
          </div>
        )}

        {/* Action Button */}
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center justify-center w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          العودة للوحة التحكم
        </Link>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  )
}

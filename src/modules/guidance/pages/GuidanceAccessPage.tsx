import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidanceAccessMutations } from '../hooks'

export function GuidanceAccessPage() {
  const [secret, setSecret] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'secret' | 'otp'>('secret')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [maskedPhone, setMaskedPhone] = useState<string>('')

  const navigate = useNavigate()
  const { requestMutation, verifyMutation } = useGuidanceAccessMutations()

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secret.trim()) return

    try {
      const result = await requestMutation.mutateAsync(secret)
      setSessionId(result.session_id)
      setMaskedPhone(result.masked_phone)
      setStep('otp')
    } catch (error) {
      console.error('Failed to request access:', error)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionId || !otpCode.trim()) return

    try {
      await verifyMutation.mutateAsync({ sessionId, code: otpCode })
      navigate('/guidance/dashboard')
    } catch (error) {
      console.error('Failed to verify OTP:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">الموجه الطلابي</h1>
          <p className="text-gray-600">
            {step === 'secret' ? 'أدخل الرمز السري للوصول' : 'أدخل رمز التحقق'}
          </p>
        </div>

        {step === 'secret' ? (
          <form onSubmit={handleRequestAccess} className="space-y-6">
            <div>
              <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
                الرمز السري
              </label>
              <input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="أدخل الرمز السري"
                disabled={requestMutation.isPending}
                dir="rtl"
              />
            </div>

            {requestMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" dir="rtl">
                الرمز السري غير صحيح. يرجى المحاولة مرة أخرى.
              </div>
            )}

            <button
              type="submit"
              disabled={requestMutation.isPending || !secret.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {requestMutation.isPending ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4" dir="rtl">
              <p className="text-sm text-blue-800">
                تم إرسال رمز التحقق إلى الرقم: <span className="font-bold">{maskedPhone}</span>
              </p>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                رمز التحقق
              </label>
              <input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={verifyMutation.isPending}
                dir="ltr"
              />
            </div>

            {verifyMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" dir="rtl">
                رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.
              </div>
            )}

            <button
              type="submit"
              disabled={verifyMutation.isPending || otpCode.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {verifyMutation.isPending ? 'جاري التحقق...' : 'تحقق'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('secret')
                setOtpCode('')
                setSessionId(null)
              }}
              className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              العودة للخلف
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

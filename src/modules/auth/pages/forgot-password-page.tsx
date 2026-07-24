import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  LogIn,
  MessageCircle,
  Send,
} from 'lucide-react'
import { useForgotPasswordMutation } from '../hooks'

/* هوية الرائد: أخضر عميق + كريمي دافئ — نفس لغة صفحات الدخول */
const DEEP = '#24452F'
const DEEP_HOVER = '#1D3826'
const GREEN = '#2E7D46'
const PASTEL = '#E9F5EC'
const PASTEL_BD = '#BFE3C9'

const inputClass =
  'w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none'

const inputStyle: React.CSSProperties = {
  borderColor: '#E5E0D5',
  background: '#FBFAF8',
}

const focusIn = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = GREEN
  e.currentTarget.style.background = '#FFFFFF'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46, 125, 70, 0.12)'
}

const focusOut = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#E5E0D5'
  e.currentTarget.style.background = '#FBFAF8'
  e.currentTarget.style.boxShadow = 'none'
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgotPasswordMutation = useForgotPasswordMutation()

  const [nationalId, setNationalId] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!nationalId.trim() || !phoneLast4.trim()) {
      setFormError('الرجاء إدخال رقم الهوية وآخر 4 أرقام من الجوال')
      return
    }

    if (phoneLast4.length !== 4) {
      setFormError('يجب إدخال 4 أرقام فقط')
      return
    }

    setFormError(null)
    setSuccessMessage(null)

    forgotPasswordMutation.mutate(
      { national_id: nationalId.trim(), phone_last_4: phoneLast4.trim() },
      {
        onSuccess: (data) => {
          setSuccessMessage(data.message)
          setPhoneMasked(data.phone_masked || null)
          // إعادة التوجيه بعد 5 ثواني
          setTimeout(() => {
            navigate('/auth/teacher')
          }, 5000)
        },
        onError: (error: any) => {
          setFormError(error.response?.data?.message || 'حدث خطأ، يرجى المحاولة مرة أخرى')
        },
      }
    )
  }

  const isLoading = forgotPasswordMutation.isPending

  if (successMessage) {
    return (
      <div className="flex flex-col justify-center lg:min-h-[calc(100vh-250px)]">
        <section className="mx-auto w-full max-w-md">
          <div className="mb-5 text-center">
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: GREEN }}
            >
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="mb-1.5 text-2xl font-bold text-slate-900">تم الإرسال بنجاح</h1>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm" style={{ border: '1px solid #E8E3D9' }}>
            <div className="space-y-5">
              <div
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}` }}
              >
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white"
                  style={{ border: `1px solid ${PASTEL_BD}` }}
                >
                  <MessageCircle className="h-4 w-4" style={{ color: GREEN }} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: DEEP }}>{successMessage}</p>
                  {phoneMasked && (
                    <p className="mt-1 text-xs" style={{ color: GREEN }}>
                      رقم الجوال: {phoneMasked}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-600">سيتم تحويلك إلى صفحة تسجيل الدخول خلال 5 ثوانٍ...</p>
                <Link
                  to="/auth/teacher"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-md transition-colors"
                  style={{ background: DEEP }}
                >
                  <LogIn className="h-4 w-4" />
                  الذهاب الآن لتسجيل الدخول
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center lg:min-h-[calc(100vh-250px)]">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-5 text-center">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: DEEP }}
          >
            <KeyRound className="h-7 w-7" style={{ color: '#EAF3EC' }} />
          </div>
          <h1 className="mb-1.5 text-2xl font-bold text-slate-900">نسيت كلمة المرور؟</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            أدخل رقم هويتك وآخر 4 أرقام من جوالك لاسترجاع كلمة المرور
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm" style={{ border: '1px solid #E8E3D9' }}>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="national-id" className="block text-sm font-semibold text-slate-700">
                رقم الهوية
              </label>
              <input
                id="national-id"
                name="national_id"
                type="text"
                inputMode="numeric"
                placeholder="أدخل رقم الهوية"
                className={inputClass}
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
                value={nationalId}
                onChange={(event) => setNationalId(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone-last-4" className="block text-sm font-semibold text-slate-700">
                آخر 4 أرقام من رقم الجوال
              </label>
              <input
                id="phone-last-4"
                name="phone_last_4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="مثال: 1234"
                className={inputClass}
                style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut}
                value={phoneLast4}
                onChange={(event) => setPhoneLast4(event.target.value)}
                disabled={isLoading}
              />
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info className="h-3.5 w-3.5 flex-shrink-0" style={{ color: GREEN }} />
                ستصلك كلمة المرور عبر واتساب
              </p>
            </div>

            {formError ? (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: '#FBEAEA', border: '1px solid #EFC5C5', color: '#C43D3D' }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl px-6 py-3.5 font-semibold text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: DEEP }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = DEEP_HOVER }}
              onMouseLeave={(e) => { e.currentTarget.style.background = DEEP }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  إرسال كلمة المرور
                  <Send className="h-4 w-4" />
                </span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/auth/teacher"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}`, color: GREEN }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

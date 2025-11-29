import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForgotPasswordMutation } from '../hooks'

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
      <section className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-green-600 shadow-xl">
            <i className="bi bi-check-circle text-4xl text-white"></i>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900">تم الإرسال بنجاح</h1>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="space-y-6">
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-whatsapp text-3xl text-green-600 mt-1"></i>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-800 mb-2">{successMessage}</p>
                  {phoneMasked && (
                    <p className="text-xs text-green-700">
                      رقم الجوال: {phoneMasked}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-slate-600">
                سيتم تحويلك إلى صفحة تسجيل الدخول خلال 5 ثواني...
              </p>
              <Link
                to="/auth/teacher"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-700"
              >
                <i className="bi bi-box-arrow-in-right"></i>
                الذهاب الآن لتسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-600 shadow-xl">
          <i className="bi bi-key text-4xl text-white"></i>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">نسيت كلمة المرور؟</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          أدخل رقم هويتك وآخر 4 أرقام من جوالك لاسترجاع كلمة المرور
        </p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
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
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10"
              value={phoneLast4}
              onChange={(event) => setPhoneLast4(event.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              <i className="bi bi-info-circle"></i> ستصلك كلمة المرور عبر واتساب
            </p>
          </div>

          {formError ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{formError}</span>
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-amber-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="bi bi-arrow-clockwise animate-spin"></i>
                جاري الإرسال...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                إرسال كلمة المرور
                <i className="bi bi-send"></i>
              </span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/auth/teacher"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 transition"
            >
              <i className="bi bi-arrow-right ml-1"></i>
              العودة لتسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </section>
  )
}

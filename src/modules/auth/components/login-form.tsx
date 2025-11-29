import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLoginMutation } from '../hooks'

interface LoginFormProps {
  role: 'teacher' | 'admin' | 'super_admin'
  heading: string
  description: string
  submitLabel: string
}

export function LoginForm({ role, heading, description, submitLabel }: LoginFormProps) {
  const loginMutation = useLoginMutation()
  const [nationalId, setNationalId] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!nationalId.trim() || !password.trim()) {
      setFormError('الرجاء إدخال رقم الهوية وكلمة المرور')
      return
    }

    setFormError(null)
    loginMutation.mutate({ national_id: nationalId.trim(), password: password.trim() })
  }

  const isLoading = loginMutation.isPending

  const roleColor = role === 'super_admin' ? 'bg-indigo-600' : 'bg-teal-600'

  return (
    <section className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ${roleColor} shadow-xl`}>
          <i className="bi bi-box-arrow-in-right text-4xl text-white"></i>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{heading}</h1>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <label htmlFor={`${role}-national-id`} className="block text-sm font-semibold text-slate-700">
              رقم الهوية
            </label>
            <input
              id={`${role}-national-id`}
              name="national_id"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="أدخل رقم الهوية"
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={`${role}-password`} className="block text-sm font-semibold text-slate-700">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id={`${role}-password`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete={role === 'teacher' ? 'current-password' : 'current-password'}
                placeholder="أدخل كلمة المرور"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 pl-12 text-slate-900 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
          </div>

          {formError ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{formError}</span>
            </div>
          ) : null}

          <button 
            type="submit" 
            className={`w-full rounded-xl ${roleColor} px-6 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="bi bi-arrow-clockwise animate-spin"></i>
                جاري التحقق...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {submitLabel}
                <i className="bi bi-arrow-left"></i>
              </span>
            )}
          </button>

          {role === 'teacher' && (
            <div className="text-center pt-2">
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition"
              >
                <i className="bi bi-key ml-1"></i>
                نسيت كلمة المرور؟
              </Link>
            </div>
          )}
        </form>
      </div>
    </section>
  )
}

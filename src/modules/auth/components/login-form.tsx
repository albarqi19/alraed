import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Eye, EyeOff, GraduationCap, KeyRound, Loader2, ShieldCheck, Building2 } from 'lucide-react'
import { useLoginMutation } from '../hooks'

interface LoginFormProps {
  role: 'teacher' | 'admin' | 'super_admin'
  heading: string
  description: string
  submitLabel: string
}

/* هوية الرائد: أخضر عميق + كريمي دافئ — لا تركوازي ولا نيلي */
const DEEP = '#24452F'
const DEEP_HOVER = '#1D3826'
const GREEN = '#2E7D46'
const PASTEL = '#E9F5EC'
const PASTEL_BD = '#BFE3C9'

const ROLE_ICONS = {
  teacher: GraduationCap,
  admin: ShieldCheck,
  super_admin: Building2,
} as const

const inputClass =
  'w-full rounded-xl border px-4 py-3.5 text-slate-900 placeholder-slate-400 transition-all focus:outline-none'

const inputStyle: React.CSSProperties = {
  borderColor: '#E5E0D5',
  background: '#FBFAF8',
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
  const RoleIcon = ROLE_ICONS[role]

  return (
    <section className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: DEEP }}
        >
          <RoleIcon className="h-8 w-8" style={{ color: '#EAF3EC' }} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{heading}</h1>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm" style={{ border: '1px solid #E8E3D9' }}>
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
              className={inputClass}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = GREEN
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46, 125, 70, 0.12)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E0D5'
                e.currentTarget.style.background = '#FBFAF8'
                e.currentTarget.style.boxShadow = 'none'
              }}
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
                autoComplete="current-password"
                placeholder="أدخل كلمة المرور"
                className={`${inputClass} pl-12`}
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = GREEN
                  e.currentTarget.style.background = '#FFFFFF'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46, 125, 70, 0.12)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E0D5'
                  e.currentTarget.style.background = '#FBFAF8'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-700"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
            className="w-full rounded-xl px-6 py-4 font-semibold text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: DEEP }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = DEEP_HOVER }}
            onMouseLeave={(e) => { e.currentTarget.style.background = DEEP }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحقق...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {submitLabel}
                <ArrowLeft className="h-4 w-4" />
              </span>
            )}
          </button>

          {role === 'teacher' && (
            <div className="pt-2 text-center">
              <Link
                to="/auth/forgot-password"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: PASTEL, border: `1px solid ${PASTEL_BD}`, color: GREEN }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                نسيت كلمة المرور؟
              </Link>
            </div>
          )}
        </form>
      </div>
    </section>
  )
}

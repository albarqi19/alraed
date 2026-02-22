import { ShieldOff, Phone, LogOut } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/auth-store'

export function AccountSuspendedPage() {
  const { clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    window.localStorage.removeItem('auth_token')
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-14 h-14 text-slate-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-4">
          حسابك متوقف حالياً
        </h1>

        {/* Message */}
        <p className="text-slate-600 text-lg leading-relaxed mb-8">
          يرجى التواصل مع إدارة المدرسة لمعرفة التفاصيل واستعادة الوصول لحسابك.
        </p>

        {/* Contact hint */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Phone className="w-5 h-5" />
            <span className="text-sm font-medium">تواصل مع إدارة مدرستك</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

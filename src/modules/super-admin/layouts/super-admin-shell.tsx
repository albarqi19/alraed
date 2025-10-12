import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'classnames'
import { primaryPlatformNav, secondaryPlatformNav } from '../constants/navigation'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'

export function SuperAdminShell() {
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()

  return (
    <div className="flex min-h-screen w-full bg-slate-50/80">
      <aside className="hidden w-72 flex-col border-l border-slate-200 bg-[#0F172A] text-white md:flex">
        <div className="px-6 py-8">
          <p className="text-sm text-slate-200/80">منصة الإدارة العليا</p>
          <h2 className="mt-2 text-2xl font-bold">لوحة التحكم الشاملة</h2>
          <p className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur">
            {user?.name ?? 'المدير العام للنظام'}
          </p>
        </div>

        <nav className="flex-1 space-y-6 px-4 pb-8">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-200/50">
              لوحات المتابعة
            </p>
            {primaryPlatformNav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                      isActive ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-slate-800/60',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'flex h-9 w-9 items-center justify-center rounded-2xl border',
                            isActive ? 'border-indigo-100 bg-indigo-50 text-indigo-600' : 'border-white/10 bg-white/10 text-white',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{item.label}</span>
                      </span>
                      <i className={clsx('bi', isActive ? 'bi-arrow-left text-slate-500' : 'bi-arrow-left text-white/50')} />
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-200/50">
              أدوات إضافية
            </p>
            {secondaryPlatformNav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition-all',
                      isActive ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-800/60 text-white/80',
                    )
                  }
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  <i className="bi bi-arrow-left" />
                </NavLink>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="mt-auto w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
          >
            تسجيل الخروج
          </button>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">إدارة المنصة</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{user?.name ?? 'المدير العام للنظام'}</h1>
              <p className="mt-1 text-xs text-slate-500">
                تحكم كامل في المدارس والإيرادات والباقات على مستوى المنصة.
              </p>
            </div>
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm md:flex">
              <div className="text-right">
                <p className="font-semibold text-slate-700">الوصول المميز</p>
                <p>الدخول بصلاحية المدير العام</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-inner">
                <i className="bi bi-shield-check" />
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

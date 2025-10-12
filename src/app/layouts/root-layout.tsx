import { Link, Outlet, useLocation } from 'react-router-dom'
import { GlobalBellWidget } from '@/modules/admin/school-bell/components/global-bell-widget'

const navLinks = [
  { to: '/', label: 'الرئيسية' },
  // { to: '/plans', label: 'الباقات' },
  // { to: '/register', label: 'تسجيل مدرسة' },
  { to: '/auth/teacher', label: 'دخول المعلم' },
  { to: '/auth/admin', label: 'دخول الإدارة' },
]

const APP_SHELL_PREFIXES = ['/admin', '/teacher']
const FULLSCREEN_ROUTES = ['/display/auto-call']

export function RootLayout() {
  const location = useLocation()
  const isAppShellRoute = APP_SHELL_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  )
  const isFullscreenRoute = FULLSCREEN_ROUTES.includes(location.pathname)

  if (isFullscreenRoute) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-slate-900">
      {isAppShellRoute ? null : (
        <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-2xl font-bold text-white shadow-soft">
                <i className="bi bi-book"></i>
              </span>
              <div>
                <p className="text-sm font-semibold text-muted">نظام الرائد</p>
                <p className="text-lg font-bold text-slate-900">للإدارة المدرسية</p>
              </div>
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-slate-700 md:justify-start">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full px-4 py-2 transition hover:bg-teal-500/10 hover:text-teal-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      )}

      <main className={isAppShellRoute ? 'flex-1' : 'flex flex-1 justify-center px-4 py-10'}>
        {isAppShellRoute ? (
          <Outlet />
        ) : (
          <div className="w-full max-w-6xl">
            <Outlet />
          </div>
        )}
      </main>

      {isAppShellRoute ? null : (
        <footer className="border-t border-white/20 bg-white/80 py-6 text-center text-xs text-muted backdrop-blur-md">
          © {new Date().getFullYear()} نظام الرائد للإدارة المدرسية — جميع الحقوق محفوظة.
        </footer>
      )}

      <GlobalBellWidget />
    </div>
  )
}

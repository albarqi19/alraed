import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'
import clsx from 'classnames'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { to: '/teacher/dashboard', label: 'الرئيسية', exact: true },
  { to: '/teacher/schedule', label: 'الجدول', exact: false },
  { to: '/teacher/messages', label: 'الرسائل', exact: false },
  { to: '/teacher/points', label: 'نقاطي', exact: false },
  { to: '/teacher/services', label: 'خدمات', exact: false },
]

export function TeacherShell() {
  const teacher = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [profileMenuOpen])

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="flex w-full flex-col gap-4 px-5 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-lg font-semibold text-slate-800">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900/5 text-base font-bold text-slate-900">
                <i className="bi bi-book"></i>
              </span>
              لوحة تحكم المعلم
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 sm:hidden"
                onClick={() => setNavigationOpen((prev) => !prev)}
              >
                القائمة
                <span aria-hidden>▾</span>
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  {teacher?.name?.charAt(0) ?? 'م'}
                </button>
                {profileMenuOpen ? (
                  <div className="absolute left-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white text-right text-sm text-slate-700">
                    <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">{teacher?.name ?? 'معلم'}</p>
                      {teacher?.national_id ? <p className="mt-1 text-[11px] text-slate-500">{teacher.national_id}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => logoutMutation.mutate()}
                      className="flex w-full items-center justify-between px-4 py-3 text-rose-600 hover:bg-rose-50 sm:justify-center"
                    >
                      <span>تسجيل الخروج</span>
                      <span className="text-xs sm:hidden">↩</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={clsx(
              'flex flex-col gap-2 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-between',
              navigationOpen ? 'flex' : 'hidden sm:flex',
            )}
          >
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:gap-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-full px-3 py-2 text-sm transition',
                      isActive ? 'bg-slate-900 text-white' : 'border border-transparent text-slate-500 hover:border-slate-200 hover:bg-white',
                    )
                  }
                  onClick={() => setNavigationOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1 px-5 py-6 sm:px-6 lg:px-10 xl:px-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'
import clsx from 'classnames'
import { useState, useEffect, useRef } from 'react'
import { MoodTrackerSheet } from '../mood/components/mood-tracker-sheet'
import { useTodayMoodQuery, useSubmitMoodMutation } from '../mood/hooks'
import type { MoodType } from '../mood/types'

const navItems = [
  { to: '/teacher/dashboard', label: 'الرئيسية', exact: true, icon: 'bi-house' },
  { to: '/teacher/schedule', label: 'الجدول', exact: false, icon: 'bi-calendar-week' },
  { to: '/teacher/messages', label: 'الرسائل', exact: false, icon: 'bi-chat-left-text' },
  { to: '/teacher/points', label: 'نقاطي', exact: false, icon: 'bi-star' },
  { to: '/teacher/services', label: 'خدمات', exact: false, icon: 'bi-grid' },
]

export function TeacherShell() {
  const teacher = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Mood Tracker state and queries
  const [showMoodSheet, setShowMoodSheet] = useState(false)
  const { data: todayMood, isLoading: isMoodLoading } = useTodayMoodQuery()
  const submitMoodMutation = useSubmitMoodMutation()

  // Show mood sheet if teacher hasn't submitted mood today
  useEffect(() => {
    if (!isMoodLoading && todayMood && !todayMood.has_mood) {
      // Small delay for better UX - let the page load first
      const timer = setTimeout(() => {
        setShowMoodSheet(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [todayMood, isMoodLoading])

  const handleMoodSelect = (mood: MoodType) => {
    // إغلاق المكون فوراً ثم إرسال الطلب في الخلفية
    setShowMoodSheet(false)
    submitMoodMutation.mutate(mood)
  }

  const handleMoodSkip = () => {
    setShowMoodSheet(false)
  }

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
    <div className="flex min-h-screen flex-col bg-slate-100 pb-16 sm:pb-0">
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
          <div className="hidden sm:flex flex-col gap-2 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Docked Mobile Bottom Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-2 py-2 pb-[env(safe-area-inset-bottom)] sm:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => clsx(
                "flex flex-col items-center justify-center gap-1 p-1 transition-all min-w-[4rem]",
                isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    "flex h-8 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                    isActive ? "bg-slate-100" : "bg-transparent"
                  )}>
                    <i className={clsx("bi text-xl", item.icon, isActive && "scale-110 drop-shadow-sm")}></i>
                  </div>
                  <span className={clsx(
                    "text-[10px] transition-all",
                    isActive ? "font-bold text-slate-900" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mood Tracker Sheet */}
      <MoodTrackerSheet
        isOpen={showMoodSheet}
        onSelect={handleMoodSelect}
        onSkip={handleMoodSkip}
      />
    </div>
  )
}

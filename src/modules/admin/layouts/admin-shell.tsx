import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'
import { usePermissions } from '@/hooks/use-permissions'
import { CalendarClock, ChevronDown, Menu, X } from 'lucide-react'
import clsx from 'classnames'
import { primaryAdminNavGroups, secondaryAdminNav, settingsAdminNav } from '../constants/navigation'
import { getCurrentAcademicWeek } from '../constants/academic-calendar-data'

const headerDateFormatter = new Intl.DateTimeFormat('ar-SA', { month: 'long', day: '2-digit' })

const toDate = (iso: string) => new Date(`${iso}T00:00:00`)

export function AdminShell() {
  const admin = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}

    primaryAdminNavGroups.forEach((group) => {
      initial[group.title] = true
    })
    
    initial[settingsAdminNav.title] = true

    return initial
  })

  // تصفية العناصر حسب الصلاحيات
  const filteredPrimaryGroups = primaryAdminNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission))
  })).filter(group => group.items.length > 0)

  const filteredSecondaryNav = secondaryAdminNav.filter(item => !item.permission || hasPermission(item.permission))
  
  const filteredSettingsNav = {
    ...settingsAdminNav,
    items: settingsAdminNav.items.filter(item => !item.permission || hasPermission(item.permission))
  }

  // إعادة توجيه المستخدم إلى أول صفحة متاحة إذا كان في الصفحة الرئيسية
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      // البحث عن أول صفحة متاحة
      for (const group of filteredPrimaryGroups) {
        if (group.items.length > 0) {
          navigate(group.items[0].to, { replace: true })
          return
        }
      }
      
      // إذا لم يوجد أي صفحة متاحة، نتحقق من القائمة الثانوية
      if (filteredSecondaryNav.length > 0) {
        navigate(filteredSecondaryNav[0].to, { replace: true })
        return
      }
      
      // إذا لم يوجد أي صفحة متاحة على الإطلاق
      if (filteredSettingsNav.items.length > 0) {
        navigate(filteredSettingsNav.items[0].to, { replace: true })
      }
    }
  }, [location.pathname, filteredPrimaryGroups, filteredSecondaryNav, filteredSettingsNav, navigate])

  // حماية الصفحات - إعادة توجيه إذا حاول الوصول لصفحة غير مصرح بها
  useEffect(() => {
    // جمع جميع الصفحات المتاحة
    const allAvailablePages = [
      ...filteredPrimaryGroups.flatMap(g => g.items.map(i => i.to)),
      ...filteredSecondaryNav.map(i => i.to),
      ...filteredSettingsNav.items.map(i => i.to),
    ]

    // التحقق من أن الصفحة الحالية متاحة
    const currentPath = location.pathname
    const isPageAvailable = allAvailablePages.some(page => {
      // للصفحات التي لها exact match
      if (page === '/admin/dashboard') {
        return currentPath === page
      }
      // للصفحات الأخرى
      return currentPath === page || currentPath.startsWith(page + '/')
    })

    // إذا كانت الصفحة غير متاحة، إعادة التوجيه
    if (!isPageAvailable && currentPath !== '/admin' && currentPath !== '/admin/') {
      // البحث عن أول صفحة متاحة
      if (filteredPrimaryGroups.length > 0 && filteredPrimaryGroups[0].items.length > 0) {
        navigate(filteredPrimaryGroups[0].items[0].to, { replace: true })
      } else if (filteredSecondaryNav.length > 0) {
        navigate(filteredSecondaryNav[0].to, { replace: true })
      } else if (filteredSettingsNav.items.length > 0) {
        navigate(filteredSettingsNav.items[0].to, { replace: true })
      }
    }
  }, [location.pathname, filteredPrimaryGroups, filteredSecondaryNav, filteredSettingsNav, navigate])

  useEffect(() => {
    const activeGroup = filteredPrimaryGroups.find((group) =>
      group.items.some((item) => {
        if (item.exact) {
          return location.pathname === item.to
        }

        return location.pathname.startsWith(item.to)
      }),
    )

    if (!activeGroup) {
      // Check settings group
      const settingsActive = filteredSettingsNav.items.some((item) => {
        if (item.exact) {
          return location.pathname === item.to
        }
        return location.pathname.startsWith(item.to)
      })

      if (settingsActive) {
        setExpandedGroups((prev) => {
          if (prev[filteredSettingsNav.title]) {
            return prev
          }
          return { ...prev, [filteredSettingsNav.title]: true }
        })
      }
      return
    }

    setExpandedGroups((prev) => {
      if (prev[activeGroup.title]) {
        return prev
      }

      return { ...prev, [activeGroup.title]: true }
    })
    
    // إغلاق القائمة عند تغيير الصفحة في الجوال
    setIsSidebarOpen(false)
  }, [location.pathname])

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !(prev[title] ?? true),
    }))
  }

  const subscriptionPlan = admin?.school?.plan
  const subscriptionStatus = admin?.school?.subscription_status

  const statusLabelMap: Record<string, string> = {
    trial: 'تجريبي',
    active: 'نشط',
    suspended: 'موقوف',
    cancelled: 'ملغي',
    expired: 'منتهي',
  }

  const planLabel = subscriptionPlan ? subscriptionPlan.toUpperCase() : null
  const statusLabel = subscriptionStatus ? statusLabelMap[subscriptionStatus] ?? subscriptionStatus : null
  const currentAcademicWeek = getCurrentAcademicWeek(new Date())
  const weekLabel = currentAcademicWeek
    ? `الأسبوع ${currentAcademicWeek.week} • ${currentAcademicWeek.semester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'}`
    : null
  const weekRangeLabel = currentAcademicWeek
    ? `${headerDateFormatter.format(toDate(currentAcademicWeek.startIso))} - ${headerDateFormatter.format(toDate(currentAcademicWeek.endIso))}`
    : null

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Overlay للجوال */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={clsx(
        "admin-sidebar fixed right-0 top-0 z-50 h-screen w-72 flex-col overflow-y-auto border-l border-slate-700/20 text-right shadow-md transition-transform duration-300 md:flex",
        isSidebarOpen ? "flex translate-x-0" : "hidden md:flex md:translate-x-0 translate-x-full"
      )} style={{ backgroundColor: 'var(--color-sidebar)' }}>
        {/* زر إغلاق للجوال */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute left-4 top-4 rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
          aria-label="إغلاق القائمة"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Header with Logo */}
        <div className="border-b border-white/20 px-6 py-6 text-center">
          <p className="text-1g font-bold text-white" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>نظام الرائد</p>
        </div>

        <div className="flex-1 space-y-1 p-4">
          {filteredPrimaryGroups.map((group, index) => {
            const isExpanded = expandedGroups[group.title] ?? true
            const panelId = `admin-nav-group-${index}`
            const GroupIcon = group.icon

            return (
              <div key={group.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40"
                  style={{ color: 'var(--color-sidebar-text)', opacity: 0.9, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4" style={{ color: 'var(--color-sidebar-text)', opacity: 0.9 }} />
                    <span style={{ color: 'var(--color-sidebar-text)', opacity: 0.9 }}>{group.title}</span>
                  </div>
                  <ChevronDown
                    className={clsx(
                      'h-4 w-4 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : 'rotate-0',
                    )}
                    style={{ color: 'var(--color-sidebar-text)', opacity: 0.7 }}
                  />
                </button>
                <div
                  className={clsx(
                    'grid transition-all duration-200 ease-in-out',
                    isExpanded
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none',
                  )}
                >
                  <nav id={panelId} className="space-y-0.5 overflow-hidden">
                    {group.items.map((link) => {
                      const LinkIcon = link.icon
                      return (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          end={link.exact}
                          className={({ isActive }) =>
                            clsx(
                              'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 pr-5 text-sm transition-all',
                              isActive
                                ? 'font-medium shadow-sm'
                                : 'hover:bg-white/10',
                            )
                          }
                          style={({ isActive }) => ({
                            backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                            color: 'var(--color-sidebar-text)'
                          })}
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-2.5">
                                {LinkIcon && (
                                  <LinkIcon
                                    className="h-4 w-4 transition-colors"
                                    style={{ color: 'var(--color-sidebar-text)', opacity: isActive ? 1 : 0.7 }}
                                  />
                                )}
                                <span>{link.label}</span>
                              </div>
                              {link.soon ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  قريبًا
                                </span>
                              ) : null}
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </nav>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t p-4 space-y-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
          {/* أدوات مباشرة */}
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-sidebar-text)', opacity: 0.6 }}>
              أدوات مباشرة
            </p>
            <nav className="space-y-0.5">
              {filteredSecondaryNav.map((link) => {
                const LinkIcon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                        isActive
                          ? 'font-medium shadow-sm'
                          : 'hover:bg-white/10',
                      )
                    }
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'var(--color-warning)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-sidebar-text)'
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          {LinkIcon && (
                            <LinkIcon
                              className="h-4 w-4 transition-colors"
                              style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-sidebar-text)', opacity: isActive ? 1 : 0.7 }}
                            />
                          )}
                          <span>{link.label}</span>
                        </div>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* الإعدادات والدعم */}
          <div className="space-y-1">
            {(() => {
              const isExpanded = expandedGroups[filteredSettingsNav.title] ?? true
              const panelId = 'settings-nav-group'
              const GroupIcon = filteredSettingsNav.icon

              return (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(filteredSettingsNav.title)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40"
                    style={{ color: 'var(--color-sidebar-text)', opacity: 0.9 }}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <ChevronDown
                        className={clsx(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded ? 'rotate-180' : 'rotate-0',
                        )}
                        style={{ color: 'var(--color-sidebar-text)', opacity: 0.7 }}
                      />
                      <GroupIcon className="h-4 w-4" style={{ color: 'var(--color-sidebar-text)', opacity: 0.9 }} />
                      <span className="flex-1 text-right" style={{ color: 'var(--color-sidebar-text)', opacity: 0.9 }}>{filteredSettingsNav.title}</span>
                    </div>
                  </button>
                  <div
                    className={clsx(
                      'grid transition-all duration-200 ease-in-out',
                      isExpanded
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none',
                    )}
                  >
                    <nav id={panelId} className="space-y-0.5 overflow-hidden">
                      {filteredSettingsNav.items.map((link) => {
                        const LinkIcon = link.icon
                        return (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.exact}
                            className={({ isActive }) =>
                              clsx(
                                'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 pr-5 text-sm transition-all',
                                isActive
                                  ? 'font-medium shadow-sm'
                                  : 'hover:bg-white/10',
                              )
                            }
                            style={({ isActive }) => ({
                              backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                              color: 'var(--color-sidebar-text)'
                            })}
                          >
                            {({ isActive }) => (
                              <>
                                <div className="flex items-center gap-2.5">
                                  {LinkIcon && (
                                    <LinkIcon
                                      className="h-4 w-4 transition-colors"
                                      style={{ color: 'var(--color-sidebar-text)', opacity: isActive ? 1 : 0.7 }}
                                    />
                                  )}
                                  <span>{link.label}</span>
                                </div>
                                {link.soon ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                    قريبًا
                                  </span>
                                ) : null}
                              </>
                            )}
                          </NavLink>
                        )
                      })}
                    </nav>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-1 flex-col md:mr-72">
        <header className="sticky top-0 z-10 border-b shadow-sm" style={{ backgroundColor: 'var(--color-header)', borderColor: 'rgba(0, 0, 0, 0.1)' }}>
          <div className="flex w-full items-center justify-between px-6 py-4 lg:px-10">
            {/* زر القائمة للجوال */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-sidebar-text)', opacity: 0.8 }}>مدير النظام</p>
              <h1 className="text-lg font-bold" style={{ color: 'var(--color-sidebar-text)' }}>{admin?.name ?? 'الإدارة'}</h1>
              {planLabel ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                    خطة {planLabel}
                  </span>
                  {statusLabel ? (
                    <span className="rounded-full bg-white/20 px-3 py-1 font-medium text-white">
                      حالة الاشتراك: {statusLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {weekLabel ? (
                <div className="hidden text-right sm:flex sm:flex-col">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-sidebar-text)', opacity: 0.6 }}
                  >
                    الأسبوع الحالي
                  </span>
                  <div
                    className="mt-1 flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      color: 'var(--color-sidebar-text)',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <CalendarClock className="h-3.5 w-3.5" style={{ color: 'var(--color-sidebar-text)', opacity: 0.75 }} />
                    <span>{weekLabel}</span>
                  </div>
                  {weekRangeLabel ? (
                    <span className="mt-1 text-[11px]" style={{ color: 'var(--color-sidebar-text)', opacity: 0.6 }}>
                      {weekRangeLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition shadow-sm hover:shadow-md"
                style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)', 
                  color: 'var(--color-sidebar-text)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-danger)'
                  e.currentTarget.style.color = 'var(--color-danger)'
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.color = 'var(--color-sidebar-text)'
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col">
          <div className="w-full flex-1 px-6 py-8 lg:px-10 xl:px-14 2xl:px-18">
            <div className="mx-auto w-full max-w-7xl space-y-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

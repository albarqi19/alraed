import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'
import { usePermissions } from '@/hooks/use-permissions'
import { CalendarClock, CalendarDays, ChevronDown, LogOut, Menu, PanelRightClose, PanelRightOpen, X } from 'lucide-react'
import clsx from 'classnames'
import { primaryAdminNavGroups, secondaryAdminNav, settingsAdminNav } from '../constants/navigation'
import { getCurrentAcademicWeek } from '../constants/academic-calendar-data'
import { AIAssistantWidget } from '../components/ai-assistant-widget'
import { SubscriptionExpiryAlert } from '@/modules/subscription/components/subscription-expiry-alert'

// مسارات «النمط الملتصق»: مساحة عمل بملء الشاشة بلا تمرير خارجي (ديسكتوب فقط)
const WORKSPACE_ROUTES = [
  '/admin/attendance',
  '/admin/approval',
  '/admin/late-arrivals',
  '/admin/leave-requests',
  '/admin/absence-excuses',
  '/admin/attendance-report',
  '/admin/period-attendance',
  '/admin/barcode-attendance',
  '/admin/teachers',
  '/admin/delay-actions',
  '/admin/remote-attendance',
  '/admin/teacher-attendance',
  '/admin/teacher-profile',
  '/admin/duty-rosters',
  '/admin/teacher-standby',
  '/admin/teacher-schedules',
  '/admin/students',
  '/admin/students/profile',
  '/admin/evaluation-settings',
  '/admin/class-sessions',
  '/admin/class-schedules',
  '/admin/whatsapp',
  '/admin/whatsapp-send',
  '/admin/whatsapp-templates',
  '/admin/teacher-messages',
  '/admin/parent-replies',
  '/admin/sms-gateway',
  '/admin/schedules',
  '/admin/student-cases',
  '/admin/treatment-plans',
  '/admin/activities',
]

export function AdminShell() {
  const admin = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // طي القائمة الجانبية على الديسكتوب إلى عمود أيقونات — الحالة محفوظة
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(
    () => localStorage.getItem('admin:sidebar:collapsed') === '1',
  )
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // فتح المجموعة النشطة فقط (التي تحتوي الصفحة الحالية)
    const initial: Record<string, boolean> = {}
    const path = window.location.pathname

    primaryAdminNavGroups.forEach((group) => {
      initial[group.title] = group.items.some((item) =>
        item.exact ? path === item.to : path.startsWith(item.to),
      )
    })

    initial[settingsAdminNav.title] = settingsAdminNav.items.some((item) =>
      item.exact ? path === item.to : path.startsWith(item.to),
    )

    return initial
  })

  // تصفية العناصر حسب الصلاحيات
  const filteredPrimaryGroups = primaryAdminNavGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.permission || hasPermission(item.permission))
  }))

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

  useEffect(() => {
    localStorage.setItem('admin:sidebar:collapsed', isDesktopCollapsed ? '1' : '0')
  }, [isDesktopCollapsed])

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !(prev[title] ?? true),
    }))
  }

  const isWorkspaceRoute = WORKSPACE_ROUTES.some((route) =>
    location.pathname === route || location.pathname.startsWith(route + '/'),
  )

  const isOnSubscriptionPage = location.pathname.includes('/admin/subscription')
  const subscriptionEndsAt = admin?.school?.subscription_ends_at ?? null
  const subscriptionStatus = admin?.school?.subscription_status ?? null

  const planLabel = admin?.school?.plan?.toUpperCase() ?? null

  // تاريخ اليوم هجري (أم القرى) مع اسم اليوم
  let todayLabel: string | null = null
  try {
    todayLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
  } catch {
    todayLabel = new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  }

  const currentAcademicWeek = getCurrentAcademicWeek(new Date())
  const weekLabel = currentAcademicWeek
    ? `الأسبوع ${currentAcademicWeek.week} • ${currentAcademicWeek.semester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'}`
    : null

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Overlay للجوال */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={clsx(
        "admin-sidebar fixed right-0 top-0 z-50 h-screen flex-col border-l border-slate-700/20 text-right shadow-md transition-[transform,width] duration-300 lg:flex",
        isDesktopCollapsed ? 'w-64 lg:w-16' : 'w-64',
        isSidebarOpen ? "flex translate-x-0" : "hidden lg:flex lg:translate-x-0 translate-x-full"
      )} style={{ backgroundColor: 'var(--color-sidebar)' }}>
        {isDesktopCollapsed && !isSidebarOpen ? (
          /* ── وضع الطي: عمود أيقونات ضيّق ── */
          <div className="hidden h-full w-full flex-col items-center lg:flex">
            <button
              type="button"
              onClick={() => setIsDesktopCollapsed(false)}
              className="flex h-14 w-full flex-shrink-0 items-center justify-center border-b border-white/20 transition hover:bg-white/10"
              title="فتح القائمة — نظام الرائد"
              aria-label="فتح القائمة الجانبية"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'var(--color-sidebar-text)' }}
              >
                ر
              </span>
            </button>

            <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
              {filteredPrimaryGroups.map((group) => {
                const GroupIcon = group.icon
                const isGroupActive = group.items.some((item) =>
                  item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
                )
                return (
                  <button
                    key={group.title}
                    type="button"
                    onClick={() => {
                      setIsDesktopCollapsed(false)
                      setExpandedGroups((prev) => ({ ...prev, [group.title]: true }))
                    }}
                    title={group.title}
                    className={clsx(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10',
                      isGroupActive && 'bg-white/15',
                    )}
                    style={{ color: 'var(--color-sidebar-text)', opacity: isGroupActive ? 1 : 0.75 }}
                  >
                    <GroupIcon className="h-5 w-5" />
                  </button>
                )
              })}

              <div className="my-1 h-px w-8 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />

              {filteredSecondaryNav.map((link) => {
                const LinkIcon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={link.label}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? 'var(--color-warning)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-sidebar-text)',
                    })}
                  >
                    {LinkIcon && <LinkIcon className="h-5 w-5" />}
                  </NavLink>
                )
              })}

              <button
                type="button"
                onClick={() => {
                  setIsDesktopCollapsed(false)
                  setExpandedGroups((prev) => ({ ...prev, [filteredSettingsNav.title]: true }))
                }}
                title={filteredSettingsNav.title}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10"
                style={{ color: 'var(--color-sidebar-text)', opacity: 0.75 }}
              >
                {(() => {
                  const SettingsIcon = filteredSettingsNav.icon
                  return <SettingsIcon className="h-5 w-5" />
                })()}
              </button>
            </div>

            <div
              className="flex w-full flex-shrink-0 flex-col items-center gap-1 border-t py-3"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'var(--color-sidebar-text)' }}
                title={admin?.name ?? 'الإدارة'}
              >
                {(admin?.name ?? 'م').trim().charAt(0)}
              </span>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-white/10"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
                style={{ color: 'var(--color-sidebar-text)', opacity: 0.85 }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* زر إغلاق للجوال */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute left-4 top-4 rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <X className="h-5 w-5" />
        </button>
        {/* الترويسة الثابتة: الشعار + اسم المدرسة */}
        <div className="flex-shrink-0 border-b border-white/20 px-6 py-5 text-center">
          <p className="sidebar-brand-title text-lg font-bold" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif', color: 'var(--color-sidebar-text)' }}>نظام الرائد</p>
          {admin?.school?.name && (
            <p className="mt-1 truncate text-[11px]" style={{ color: 'var(--color-sidebar-text)', opacity: 0.65 }}>
              {admin.school.name}
            </p>
          )}
        </div>

        {/* منطقة التمرير الداخلية: المجموعات + الأدوات + الإعدادات */}
        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-1 p-4">
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
                              'group flex items-center justify-between gap-3 rounded-lg px-3 py-2 pr-5 text-[13px] transition-all',
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
                              {link.beta ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                  تجريبي
                                </span>
                              ) : link.soon ? (
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
                                'group flex items-center justify-between gap-3 rounded-lg px-3 py-2 pr-5 text-[13px] transition-all',
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
                                {link.beta ? (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                    تجريبي
                                  </span>
                                ) : link.soon ? (
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
        </div>

        {/* البطاقة السفلية الثابتة: المستخدم + تسجيل الخروج */}
        <div
          className="flex-shrink-0 border-t px-3 py-3"
          style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.15)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'var(--color-sidebar-text)' }}
            >
              {(admin?.name ?? 'م').trim().charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold" style={{ color: 'var(--color-sidebar-text)' }}>
                {admin?.name ?? 'الإدارة'}
              </p>
              <p className="truncate text-[10.5px]" style={{ color: 'var(--color-sidebar-text)', opacity: 0.6 }}>
                {admin?.school?.name ?? 'مدير النظام'}
                {planLabel ? ` • ${planLabel}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="rounded-lg p-2 transition hover:bg-white/10"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
              style={{ color: 'var(--color-sidebar-text)' }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        </>
        )}
      </aside>

      <div
        className={clsx(
          'flex min-h-screen w-full flex-1 flex-col transition-[margin] duration-300',
          isDesktopCollapsed ? 'lg:mr-16' : 'lg:mr-64',
          isWorkspaceRoute && 'lg:h-screen lg:max-h-screen lg:overflow-hidden',
        )}
      >
        <header className="sticky top-0 z-20 flex-shrink-0 border-b shadow-sm" style={{ backgroundColor: 'var(--color-header)', borderColor: 'rgba(0, 0, 0, 0.1)' }}>
          <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
            <div className="flex items-center gap-2">
              {/* زر القائمة للجوال */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* زر طي/فتح القائمة للديسكتوب */}
              <button
                type="button"
                onClick={() => setIsDesktopCollapsed((value) => !value)}
                className="hidden rounded-lg p-2 transition hover:bg-white/10 lg:inline-flex"
                title={isDesktopCollapsed ? 'فتح القائمة الجانبية' : 'طي القائمة الجانبية'}
                aria-label={isDesktopCollapsed ? 'فتح القائمة الجانبية' : 'طي القائمة الجانبية'}
                style={{ color: 'var(--color-sidebar-text)' }}
              >
                {isDesktopCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
              </button>

              <h1 className="text-sm font-bold" style={{ color: 'var(--color-sidebar-text)' }}>{admin?.name ?? 'الإدارة'}</h1>
              {planLabel && (
                <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline">
                  {planLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {todayLabel && (
                <div
                  className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold md:flex"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'var(--color-sidebar-text)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5 opacity-75" />
                  <span>{todayLabel}</span>
                </div>
              )}
              {weekLabel && (
                <div
                  className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:flex"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'var(--color-sidebar-text)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <CalendarClock className="h-3.5 w-3.5 opacity-75" />
                  <span>{weekLabel}</span>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={clsx('flex flex-1 flex-col', isWorkspaceRoute && 'lg:min-h-0 lg:overflow-hidden')}>
          {/* صفحات بدون فراغات لعرض أكبر قدر من البيانات */}
          {isWorkspaceRoute ? (
            <div className="flex w-full flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
              <Outlet />
            </div>
          ) : location.pathname === '/admin/live-tracker' || location.pathname === '/admin/notebook' || location.pathname.startsWith('/admin/guides/') ? (
            <div className="w-full flex-1">
              <Outlet />
            </div>
          ) : (
            <div className="w-full flex-1 px-6 py-8 lg:px-10 xl:px-14 2xl:px-18">
              <div className="mx-auto w-full max-w-7xl space-y-8">
                {!isOnSubscriptionPage && subscriptionEndsAt && (
                  <SubscriptionExpiryAlert
                    endsAt={subscriptionEndsAt}
                    status={subscriptionStatus ?? undefined}
                  />
                )}
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
      <AIAssistantWidget />
    </div>
  )
}

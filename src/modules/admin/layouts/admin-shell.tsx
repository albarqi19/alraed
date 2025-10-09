import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useLogoutMutation } from '@/modules/auth/hooks'
import { ChevronDown } from 'lucide-react'
import clsx from 'classnames'
import { primaryAdminNavGroups, secondaryAdminNav, settingsAdminNav } from '../constants/navigation'

export function AdminShell() {
  const admin = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const location = useLocation()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}

    primaryAdminNavGroups.forEach((group) => {
      initial[group.title] = true
    })
    
    initial[settingsAdminNav.title] = true

    return initial
  })

  useEffect(() => {
    const activeGroup = primaryAdminNavGroups.find((group) =>
      group.items.some((item) => {
        if (item.exact) {
          return location.pathname === item.to
        }

        return location.pathname.startsWith(item.to)
      }),
    )

    if (!activeGroup) {
      // Check settings group
      const settingsActive = settingsAdminNav.items.some((item) => {
        if (item.exact) {
          return location.pathname === item.to
        }
        return location.pathname.startsWith(item.to)
      })

      if (settingsActive) {
        setExpandedGroups((prev) => {
          if (prev[settingsAdminNav.title]) {
            return prev
          }
          return { ...prev, [settingsAdminNav.title]: true }
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
  }, [location.pathname])

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !(prev[title] ?? true),
    }))
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-100">
      <aside className="fixed right-0 top-0 hidden h-screen w-72 flex-col overflow-y-auto border-l border-slate-200 bg-white text-right md:flex">
        <div className="flex-1 space-y-1 p-4">
          {primaryAdminNavGroups.map((group, index) => {
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
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                >
                  <div className="flex flex-1 items-center justify-end gap-2">
                    <ChevronDown
                      className={clsx(
                        'h-4 w-4 text-slate-400 transition-transform duration-200',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                      )}
                    />
                    <GroupIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{group.title}</span>
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
                                ? 'bg-teal-50 text-teal-700 font-medium shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-2.5">
                                {LinkIcon && (
                                  <LinkIcon
                                    className={clsx(
                                      'h-4 w-4 transition-colors',
                                      isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600',
                                    )}
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

        <div className="border-t border-slate-200 p-4 space-y-4">
          {/* أدوات مباشرة */}
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              أدوات مباشرة
            </p>
            <nav className="space-y-0.5">
              {secondaryAdminNav.map((link) => {
                const LinkIcon = link.icon
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                        isActive
                          ? 'bg-amber-50 text-amber-700 font-medium shadow-sm'
                          : 'text-slate-600 hover:bg-amber-50/50 hover:text-amber-700',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          {LinkIcon && (
                            <LinkIcon
                              className={clsx(
                                'h-4 w-4 transition-colors',
                                isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-600',
                              )}
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
              const isExpanded = expandedGroups[settingsAdminNav.title] ?? true
              const panelId = 'settings-nav-group'
              const GroupIcon = settingsAdminNav.icon

              return (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(settingsAdminNav.title)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                  >
                    <ChevronDown
                      className={clsx(
                        'h-4 w-4 text-slate-400 transition-transform duration-200',
                        isExpanded ? 'rotate-180' : 'rotate-0',
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{settingsAdminNav.title}</span>
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
                      {settingsAdminNav.items.map((link) => {
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
                                  ? 'bg-teal-50 text-teal-700 font-medium shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <div className="flex items-center gap-2.5">
                                  {LinkIcon && (
                                    <LinkIcon
                                      className={clsx(
                                        'h-4 w-4 transition-colors',
                                        isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600',
                                      )}
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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="flex w-full items-center justify-between px-6 py-4 lg:px-10">
            <div>
              <p className="text-xs font-semibold text-slate-500">مدير النظام</p>
              <h1 className="text-lg font-bold text-slate-900">{admin?.name ?? 'الإدارة'}</h1>
            </div>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              تسجيل الخروج
            </button>
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

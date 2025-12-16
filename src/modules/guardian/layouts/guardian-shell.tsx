import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Wrench, FileText, MessageSquare, ShoppingCart, Bell, LogOut } from 'lucide-react'
import clsx from 'classnames'
import { GuardianProvider, useGuardianContext } from '../context/guardian-context'
import { GuardianStoreModal } from '../components/guardian-store-modal'

const navItems = [
    { to: '/guardian/home', label: 'الرئيسية', icon: Home },
    { to: '/guardian/services', label: 'الخدمات', icon: Wrench },
    { to: '/guardian/forms', label: 'النماذج', icon: FileText },
    { to: '/guardian/messages', label: 'الرسائل', icon: MessageSquare },
]

function GuardianShellContent() {
    const {
        isLoggedIn,
        studentSummary,
        nationalIdInput,
        setNationalIdInput,
        handleLogin,
        handleLogout,
        isLoggingIn,
        loginError,
        storeOverview,
        openStoreModal,
        isStoreModalOpen,
        closeStoreModal,
    } = useGuardianContext()

    const location = useLocation()
    const points = storeOverview?.points.total ?? 0

    // Login screen
    if (!isLoggedIn) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-4">
                <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-xl">
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                            <i className="bi bi-person-badge text-4xl text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">بوابة ولي الأمر</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            أدخل رقم هوية الطالب للوصول إلى جميع الخدمات
                        </p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleLogin(nationalIdInput)
                        }}
                    >
                        <div>
                            <label className="mb-2 block text-right text-sm font-semibold text-slate-700">
                                رقم هوية الطالب
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                className={clsx(
                                    'w-full rounded-2xl border px-4 py-3 text-center text-lg font-semibold tracking-widest shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                                    loginError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
                                )}
                                placeholder="••••••••••"
                                value={nationalIdInput}
                                onChange={(e) => setNationalIdInput(e.target.value.replace(/\D/g, ''))}
                                disabled={isLoggingIn}
                            />
                            {loginError && (
                                <p className="mt-2 text-center text-sm text-rose-600">{loginError}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isLoggingIn || nationalIdInput.length !== 10}
                            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3.5 text-base font-bold text-white shadow-lg transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoggingIn ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    جاري التحقق...
                                </span>
                            ) : (
                                'دخول'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // Main shell with navigation
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            {/* Top Header */}
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Student info */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-bold text-white shadow">
                            {studentSummary?.name.charAt(0) ?? 'ط'}
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 line-clamp-1">{studentSummary?.name}</p>
                            <p className="text-xs text-slate-500">
                                الصف {studentSummary?.grade} • {studentSummary?.class_name}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Store button */}
                        <button
                            type="button"
                            onClick={openStoreModal}
                            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                            title="المتجر الإلكتروني"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {points > 0 && (
                                <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow">
                                    {points > 99 ? '99+' : points}
                                </span>
                            )}
                        </button>

                        {/* Notifications button (UI only) */}
                        <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                            title="الإشعارات"
                        >
                            <Bell className="h-5 w-5" />
                        </button>

                        {/* Logout button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                            title="تسجيل الخروج"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-20">
                <div className="mx-auto max-w-2xl px-4 py-4">
                    <Outlet />
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 pb-safe backdrop-blur-md">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={clsx(
                                    'flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition',
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                )}
                            >
                                <Icon className={clsx('h-5 w-5', isActive && 'stroke-[2.5]')} />
                                <span className={clsx('text-xs', isActive ? 'font-bold' : 'font-medium')}>
                                    {item.label}
                                </span>
                            </NavLink>
                        )
                    })}
                </div>
            </nav>

            {/* Store Modal */}
            <GuardianStoreModal isOpen={isStoreModalOpen} onClose={closeStoreModal} />
        </div>
    )
}

export function GuardianShell() {
    return (
        <GuardianProvider>
            <GuardianShellContent />
        </GuardianProvider>
    )
}

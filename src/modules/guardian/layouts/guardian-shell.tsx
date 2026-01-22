import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Wrench, FileText, MessageSquare, ShoppingCart, LogOut, Users, UserPlus, X, ChevronDown, Trash2 } from 'lucide-react'
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
        phoneLast4Input,
        setPhoneLast4Input,
        handleLogin,
        handleLogout,
        handleLogoutAll,
        isLoggingIn,
        loginError,
        storeOverview,
        openStoreModal,
        isStoreModalOpen,
        closeStoreModal,
        // Multi-child
        children: storedChildren,
        activeChildIndex,
        switchChild,
        removeChild,
        hasMultipleChildren,
        showAddChildForm,
        setShowAddChildForm,
    } = useGuardianContext()

    const location = useLocation()
    const points = storeOverview?.points.total ?? 0

    // Children dropdown state
    const [showChildrenDropdown, setShowChildrenDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowChildrenDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
                            أدخل رقم هوية الطالب وآخر 4 أرقام من الجوال المسجل
                        </p>
                    </div>

                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleLogin(nationalIdInput, phoneLast4Input)
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
                        </div>
                        <div>
                            <label className="mb-2 block text-right text-sm font-semibold text-slate-700">
                                آخر 4 أرقام من جوال ولي الأمر
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                className={clsx(
                                    'w-full rounded-2xl border px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                                    loginError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
                                )}
                                placeholder="••••"
                                value={phoneLast4Input}
                                onChange={(e) => setPhoneLast4Input(e.target.value.replace(/\D/g, ''))}
                                disabled={isLoggingIn}
                            />
                            <p className="mt-1 text-center text-xs text-slate-400">
                                الرقم المسجل في بيانات الطالب
                            </p>
                        </div>
                        {loginError && (
                            <p className="text-center text-sm text-rose-600">{loginError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={isLoggingIn || nationalIdInput.length !== 10 || phoneLast4Input.length !== 4}
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

                        {/* Children switcher button */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShowChildrenDropdown(!showChildrenDropdown)}
                                className={clsx(
                                    'relative flex h-10 items-center gap-1.5 rounded-full px-3 transition',
                                    hasMultipleChildren
                                        ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                )}
                                title="الأبناء"
                            >
                                <Users className="h-5 w-5" />
                                {hasMultipleChildren && (
                                    <>
                                        <span className="text-xs font-bold">{storedChildren.length}</span>
                                        <ChevronDown className={clsx('h-4 w-4 transition-transform', showChildrenDropdown && 'rotate-180')} />
                                    </>
                                )}
                            </button>

                            {/* Dropdown menu */}
                            {showChildrenDropdown && (
                                <div className="absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                                        <p className="text-xs font-semibold text-slate-600">الأبناء المسجلون</p>
                                    </div>

                                    {/* Children list */}
                                    <div className="max-h-48 overflow-y-auto">
                                        {storedChildren.map((child, index) => (
                                            <div
                                                key={child.national_id}
                                                className={clsx(
                                                    'flex items-center justify-between gap-2 px-4 py-3 transition',
                                                    index === activeChildIndex
                                                        ? 'bg-indigo-50'
                                                        : 'hover:bg-slate-50'
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        switchChild(index)
                                                        setShowChildrenDropdown(false)
                                                    }}
                                                    className="flex flex-1 items-center gap-3 text-right"
                                                >
                                                    <div className={clsx(
                                                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white',
                                                        index === activeChildIndex
                                                            ? 'bg-indigo-600'
                                                            : 'bg-slate-400'
                                                    )}>
                                                        {child.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className={clsx(
                                                            'truncate text-sm',
                                                            index === activeChildIndex ? 'font-bold text-indigo-900' : 'text-slate-700'
                                                        )}>
                                                            {child.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {child.grade} • {child.class_name}
                                                        </p>
                                                    </div>
                                                </button>
                                                {storedChildren.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeChild(index)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                                        title="إزالة"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add child button */}
                                    <div className="border-t border-slate-100 p-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddChildForm(true)
                                                setShowChildrenDropdown(false)
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            إضافة ابن آخر
                                        </button>
                                    </div>

                                    {/* Logout all */}
                                    {storedChildren.length > 1 && (
                                        <div className="border-t border-slate-100 p-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleLogoutAll()
                                                    setShowChildrenDropdown(false)
                                                }}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-50"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                تسجيل خروج الكل
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Logout button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                            title={storedChildren.length > 1 ? 'إزالة الابن الحالي' : 'تسجيل الخروج'}
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

            {/* Add Child Modal */}
            {showAddChildForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-4">
                            <h3 className="text-lg font-bold text-white">إضافة ابن جديد</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddChildForm(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form
                            className="space-y-4 p-5"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleLogin(nationalIdInput, phoneLast4Input)
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
                            </div>
                            <div>
                                <label className="mb-2 block text-right text-sm font-semibold text-slate-700">
                                    آخر 4 أرقام من جوال ولي الأمر
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    className={clsx(
                                        'w-full rounded-2xl border px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                                        loginError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
                                    )}
                                    placeholder="••••"
                                    value={phoneLast4Input}
                                    onChange={(e) => setPhoneLast4Input(e.target.value.replace(/\D/g, ''))}
                                    disabled={isLoggingIn}
                                />
                            </div>
                            {loginError && (
                                <p className="text-center text-sm text-rose-600">{loginError}</p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddChildForm(false)}
                                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                    disabled={isLoggingIn}
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoggingIn || nationalIdInput.length !== 10 || phoneLast4Input.length !== 4}
                                    className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-sm font-bold text-white shadow-lg transition hover:from-indigo-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isLoggingIn ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            جاري التحقق...
                                        </span>
                                    ) : (
                                        'إضافة'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

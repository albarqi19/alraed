interface GuardianPortalHeaderProps {
  isLoggedIn?: boolean
  onLogout?: () => void
}

export function GuardianPortalHeader({
  isLoggedIn = false,
  onLogout,
}: GuardianPortalHeaderProps) {
  if (!isLoggedIn) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100/50 dark:border-slate-700/50 bg-transparent shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="text-right">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">بوابة ولي الأمر</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">إدارة شؤون الطالب</p>
        </div>

        <div className="flex items-center gap-3">
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              title="تسجيل الخروج"
            >
              <i className="bi bi-box-arrow-right text-base" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

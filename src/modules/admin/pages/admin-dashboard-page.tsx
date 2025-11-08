import { Link } from 'react-router-dom'
import { useAdminDashboardStatsQuery } from '@/modules/admin/hooks'
import type { AdminDashboardStats } from '@/modules/admin/types'

type WeeklyAttendanceStat = NonNullable<AdminDashboardStats['weekly_attendance']>[number]

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useAdminDashboardStatsQuery()

  const stats = data ?? {
    total_students: 0,
    total_teachers: 0,
    present_today: 0,
    absent_today: 0,
    pending_approvals: 0,
    weekly_attendance: [],
  }

  // عكس ترتيب الأيام لعرض الأحدث أولاً
  const weeklyAttendanceReversed = stats.weekly_attendance ? [...stats.weekly_attendance].reverse() : []

  const cards = [
    {
      title: 'إجمالي الطلاب',
      value: stats.total_students,
      accent: 'bg-sky-500/15 text-sky-700 border-sky-200',
    },
    {
      title: 'الحضور اليومي',
      value: stats.present_today,
      accent: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
    },
    {
      title: 'الغياب اليومي',
      value: stats.absent_today,
      accent: 'bg-rose-500/15 text-rose-700 border-rose-200',
    },
    {
      title: 'عدد المعلمين',
      value: stats.total_teachers,
      accent: 'bg-amber-500/15 text-amber-700 border-amber-200',
    },
  ]

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">لوحة تحكم الإدارة</h1>
            <p className="text-sm text-muted">
              نظرة عامة على أرقام اليوم مع وصول سريع لأهم المهام اليومية.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
          >
            <i className="bi bi-arrow-repeat" /> تحديث الآن
          </button>
        </div>
        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
            حدث خطأ أثناء تحميل الإحصائيات. حاول مرة أخرى بالضغط على زر التحديث.
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className={`rounded-2xl border bg-white/80 p-5 shadow-sm transition ${card.accent}`}
          >
            <p className="text-sm font-semibold text-slate-600">{card.title}</p>
            <p className="mt-3 text-3xl font-bold">
              {isLoading ? <span className="animate-pulse text-slate-400">...</span> : card.value.toLocaleString('en-US')}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">الإحصائيات الأسبوعية</h2>
              <p className="text-sm text-muted">ملخص الحضور خلال الأيام السبعة الماضية (من الأحدث للأقدم).</p>
            </div>
            {weeklyAttendanceReversed?.length ? (
              <span className="rounded-full bg-teal-500/10 px-4 py-1 text-xs font-semibold text-teal-600">
                {weeklyAttendanceReversed.length} أيام
              </span>
            ) : null}
          </header>
          <div className="max-h-[280px] space-y-3 overflow-y-auto pr-2 stats-scrollbar">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100/80" />
                ))}
              </div>
            ) : weeklyAttendanceReversed && weeklyAttendanceReversed.length > 0 ? (
              weeklyAttendanceReversed.map((dayStat: WeeklyAttendanceStat) => {
                const total = dayStat.present + dayStat.absent
                const presentPercent = total > 0 ? Math.round((dayStat.present / total) * 100) : 0
                return (
                  <article
                    key={dayStat.day}
                    className="rounded-2xl border border-slate-100 bg-white/60 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>{dayStat.day}</span>
                      <span className="text-emerald-600">{presentPercent}% حضور</span>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all"
                        style={{ width: `${presentPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted">
                      <span>حاضر: {dayStat.present.toLocaleString('en-US')}</span>
                      <span>غائب: {dayStat.absent.toLocaleString('en-US')}</span>
                    </div>
                  </article>
                )
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/60 p-4 text-sm text-muted">
                لا تتوفر بيانات أسبوعية حتى الآن. سيظهر الملخص عند توفر سجلات الحضور.
              </p>
            )}
          </div>
        </section>

        <section className="glass-card flex flex-col gap-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">مهام عاجلة</h2>
              <p className="text-sm text-muted">روابط مباشرة للأعمال اليومية المتكررة.</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-4 py-1 text-xs font-semibold text-amber-600">
              تحديث مستمر
            </span>
          </header>

          <div className="grid gap-3 text-sm text-muted">
            <Link
              to="/admin/approval"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-teal-200 hover:text-teal-700"
            >
              <div>
                <p className="font-semibold text-slate-800">اعتماد التحضير</p>
                <p className="text-xs text-muted">مراجعة التحضير المرسل من المعلمين.</p>
              </div>
              <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-600">
                {isLoading ? '...' : stats.pending_approvals.toLocaleString('en-US')} في الانتظار
              </span>
            </Link>

            <Link
              to="/admin/whatsapp"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-amber-200 hover:text-amber-700"
            >
              <div>
                <p className="font-semibold text-slate-800">مركز الواتساب</p>
                <p className="text-xs text-muted">إرسال الرسائل المعلقة ومراجعة القوالب.</p>
              </div>
              <i className="bi bi-whatsapp text-xl text-emerald-500" />
            </Link>

            <Link
              to="/admin/sms"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-violet-200 hover:text-violet-700"
            >
              <div>
                <p className="font-semibold text-slate-800">بوابة الرسائل SMS</p>
                <p className="text-xs text-muted">إدارة الأجهزة وإرسال الرسائل النصية.</p>
              </div>
              <i className="bi bi-phone text-xl text-violet-500" />
            </Link>

            <Link
              to="/admin/import"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-sky-200 hover:text-sky-700"
            >
              <div>
                <p className="font-semibold text-slate-800">استيراد البيانات</p>
                <p className="text-xs text-muted">رفع ملفات الطلاب أو المعلمين وتطبيق التغييرات.</p>
              </div>
              <i className="bi bi-cloud-arrow-up text-xl text-sky-500" />
            </Link>
          </div>
        </section>
      </div>

      <div className="glass-card grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">آخر الأنشطة</h2>
            <p className="text-sm text-muted">سيتم استبدال هذه القائمة ببيانات حقيقية قريبًا.</p>
          </header>
          <ul className="space-y-3 text-sm">
            {[1, 2, 3].map((item) => (
              <li
                key={item}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800">تحضير مبدئي رقم {item}</p>
                  <p className="text-xs text-muted">سيظهر هنا سجل حقيقي بمجرد تفعيل endpoint النشاط.</p>
                </div>
                <span className="text-xs text-muted">قريبًا</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">الوصول السريع</h2>
            <p className="text-sm text-muted">روابط لأكثر الصفحات استخدامًا لدى مشرف النظام.</p>
          </header>
          <div className="grid gap-3 text-sm text-slate-700">
            <Link
              to="/admin/teachers"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-emerald-200"
            >
              <span>إدارة المعلمين</span>
              <i className="bi bi-arrow-left" />
            </Link>
            <Link
              to="/admin/students"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-emerald-200"
            >
              <span>إدارة الطلاب</span>
              <i className="bi bi-arrow-left" />
            </Link>
            <Link
              to="/admin/attendance"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/60 p-4 transition hover:border-emerald-200"
            >
              <span>تقارير الحضور</span>
              <i className="bi bi-arrow-left" />
            </Link>
          </div>
        </section>
      </div>
    </section>
  )
}

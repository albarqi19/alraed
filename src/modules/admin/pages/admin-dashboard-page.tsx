import { Link } from 'react-router-dom'
import { useAdminDashboardStatsQuery } from '@/modules/admin/hooks'
import type { AdminDashboardStats } from '@/modules/admin/types'
import { OnboardingProgressCard } from '../components/onboarding-progress-card'
import {
  Users,
  GraduationCap,
  UserCheck,
  UserX,
  Clock,
  RefreshCw,
  CheckSquare,
  MessageSquare,
  Smartphone,
  UploadCloud,
  ChevronLeft,
  Activity,
  CalendarDays
} from 'lucide-react'

type WeeklyAttendanceStat = NonNullable<AdminDashboardStats['weekly_attendance']>[number]

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useAdminDashboardStatsQuery()

  const stats = data ?? {
    total_students: 0,
    total_teachers: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    pending_approvals: 0,
    weekly_attendance: [],
  }

  // البيانات تأتي من Backend مرتبة من الأحدث إلى الأقدم
  const weeklyAttendanceReversed = stats.weekly_attendance ?? []

  const cards = [
    {
      title: 'إجمالي الطلاب',
      value: stats.total_students,
      icon: <GraduationCap className="h-5 w-5 text-sky-600" />,
      theme: 'bg-sky-50 border border-sky-100',
      textAccent: 'text-sky-900',
      titleAccent: 'text-sky-700',
    },
    {
      title: 'الحضور اليومي',
      value: stats.present_today,
      icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
      theme: 'bg-emerald-50 border border-emerald-100',
      textAccent: 'text-emerald-900',
      titleAccent: 'text-emerald-700',
    },
    {
      title: 'الغياب اليومي',
      value: stats.absent_today,
      icon: <UserX className="h-5 w-5 text-rose-600" />,
      theme: 'bg-rose-50 border border-rose-100',
      textAccent: 'text-rose-900',
      titleAccent: 'text-rose-700',
    },
    {
      title: 'المتأخرون اليوم',
      value: stats.late_today,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      theme: 'bg-amber-50 border border-amber-100',
      textAccent: 'text-amber-900',
      titleAccent: 'text-amber-700',
    },
  ]

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">لوحة تحكم الإدارة</h1>
            <p className="text-sm text-slate-500 mt-1">
              نظرة عامة على أرقام اليوم مع وصول سريع لأهم المهام اليومية
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-teal-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث البيانات
          </button>
        </div>
        {isError && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            حدث خطأ أثناء تحميل الإحصائيات. يرجى المحاولة مرة أخرى بالضغط على زر التحديث.
          </div>
        )}
      </header>

      {/* Onboarding Progress */}
      <OnboardingProgressCard />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className={`rounded-md shadow-sm transition-shadow hover:shadow-md overflow-hidden ${card.theme}`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-inherit bg-white/40">
              <p className={`text-xs font-bold ${card.titleAccent}`}>{card.title}</p>
              {card.icon}
            </div>
            <div className="px-3 py-3">
              <p className={`text-2xl font-bold ${card.textAccent}`}>
                {isLoading ? <span className="animate-pulse opacity-50">•••</span> : card.value.toLocaleString('en-US')}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* المهام العاجلة */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">مهام عاجلة</h2>
            </div>
            <span className="rounded bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
              وصول سريع
            </span>
          </header>

          <div className="grid grid-cols-2 gap-3 p-4">
            <Link
              to="/admin/approval"
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 transition hover:border-teal-300 hover:bg-teal-50/30 group"
            >
              <div className="flex items-center justify-between">
                <CheckSquare className="h-4 w-4 text-teal-600" />
                <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                  {isLoading ? '...' : stats.pending_approvals.toLocaleString('en-US')} جديد
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700">اعتماد التحضير</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">مراجعة تحضير المعلمين</p>
              </div>
            </Link>

            <Link
              to="/admin/whatsapp"
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 transition hover:border-amber-300 hover:bg-amber-50/30 group"
            >
              <div className="flex items-center justify-between">
                <MessageSquare className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700">مركز الواتساب</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">إرسال ومتابعة الرسائل</p>
              </div>
            </Link>

            <Link
              to="/admin/sms"
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 transition hover:border-violet-300 hover:bg-violet-50/30 group"
            >
              <div className="flex items-center justify-between">
                <Smartphone className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-violet-700">بوابة SMS</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">إرسال الرسائل النصية</p>
              </div>
            </Link>

            <Link
              to="/admin/import"
              className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:bg-sky-50/30 group"
            >
              <div className="flex items-center justify-between">
                <UploadCloud className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-sky-700">استيراد البيانات</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">تحديث سجلات النظام</p>
              </div>
            </Link>
          </div>
        </section>

        {/* الإحصائيات الأسبوعية */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-800">حضور الأسبوع</h2>
            </div>
            {weeklyAttendanceReversed?.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                آخر {weeklyAttendanceReversed.length} أيام سجلت
              </span>
            )}
          </header>
          <div className="p-4 max-h-[220px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : weeklyAttendanceReversed && weeklyAttendanceReversed.length > 0 ? (
              <div className="space-y-3">
                {weeklyAttendanceReversed.map((dayStat: WeeklyAttendanceStat) => {
                  const total = dayStat.present + dayStat.absent
                  const presentPercent = total > 0 ? Math.round((dayStat.present / total) * 100) : 0
                  return (
                    <article
                      key={dayStat.day}
                      className="rounded border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                        <span>{dayStat.day}</span>
                        <span className="text-teal-700 bg-teal-100/50 px-2 py-0.5 rounded-sm">{presentPercent}% حضور</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all"
                          style={{ width: `${presentPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span className="font-medium text-emerald-600">حاضر: {dayStat.present.toLocaleString('en-US')}</span>
                        <span className="font-medium text-rose-600">غائب: {dayStat.absent.toLocaleString('en-US')}</span>
                        {dayStat.late > 0 && <span className="font-medium text-amber-600">متأخر: {dayStat.late.toLocaleString('en-US')}</span>}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 border border-dashed border-slate-200 bg-slate-50 rounded">
                <p className="text-xs text-slate-500 text-center">لا توجد بيانات حضور مسجلة للأيام السابقة.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* آخر الأنشطة */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
            <h2 className="text-sm font-bold text-slate-800">آخر الأنشطة</h2>
          </header>
          <ul className="p-4 space-y-2">
            {[1, 2, 3].map((item) => (
              <li
                key={item}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-3 hover:border-slate-200 transition"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">تحضير مبدئي رفم {item}</p>
                  <p className="text-xs text-slate-500 mt-0.5">سيتم ربط هذا القسم قريباً بالسجلات الفعلية</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">ميزة قادمة</span>
              </li>
            ))}
          </ul>
        </section>

        {/* الوصول السريع */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
            <h2 className="text-sm font-bold text-slate-800">الوصول السريع</h2>
          </header>
          <div className="grid gap-2 p-4">
            <Link
              to="/admin/teachers"
              className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/20 transition group"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800">إدارة المعلمين</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
            </Link>
            <Link
              to="/admin/students"
              className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/20 transition group"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800">إدارة الطلاب</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
            </Link>
            <Link
              to="/admin/attendance"
              className="flex items-center justify-between rounded-md border border-slate-100 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/20 transition group"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800">تقارير الحضور</span>
              </div>
              <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
            </Link>
          </div>
        </section>
      </div>
    </section>
  )
}


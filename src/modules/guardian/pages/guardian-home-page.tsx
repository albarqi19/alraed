import { useGuardianContext } from '../context/guardian-context'
import { useGuardianDashboardQuery } from '../hooks'
import { TrendingUp, TrendingDown, Clock, Award, UserCheck, AlertTriangle, Star, Loader2 } from 'lucide-react'

export function GuardianHomePage() {
    const { currentNationalId, studentSummary, storeOverview } = useGuardianContext()
    const dashboardQuery = useGuardianDashboardQuery(currentNationalId)

    const dashboardData = dashboardQuery.data
    const isLoading = dashboardQuery.isLoading

    // Fallback to store overview points if dashboard hasn't loaded yet
    const points = dashboardData?.points ?? storeOverview?.points ?? {
        total: 0,
        lifetime_rewards: 0,
        lifetime_violations: 0,
        lifetime_redemptions: 0,
    }

    const attendanceStats = dashboardData?.attendance ?? {
        present_days: 0,
        absent_days: 0,
        late_days: 0,
        attendance_rate: 0,
    }

    const behaviorStats = dashboardData?.behavior ?? {
        positive_count: 0,
        negative_count: 0,
        balance: 0,
    }

    return (
        <div className="space-y-5">
            {/* Welcome card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 text-white shadow-lg">
                <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />

                <div className="relative">
                    <p className="text-sm opacity-90">أهلاً بك في بوابة ولي الأمر</p>
                    <h2 className="mt-1 text-xl font-bold">{studentSummary?.name}</h2>
                    <p className="mt-2 text-sm opacity-80">
                        الصف {studentSummary?.grade} • {studentSummary?.class_name}
                    </p>
                </div>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="mr-2 text-sm text-slate-500">جاري تحميل البيانات...</span>
                </div>
            )}

            {/* Points summary */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                            <Star className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-700">رصيد النقاط</span>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-emerald-600">{points.total}</p>
                    <p className="mt-1 text-xs text-slate-500">نقطة متاحة للاستبدال</p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                            <Award className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-amber-700">المكافآت</span>
                    </div>
                    <p className="mt-3 text-3xl font-bold text-amber-600">{points.lifetime_rewards}</p>
                    <p className="mt-1 text-xs text-slate-500">نقطة مكتسبة إجمالية</p>
                </div>
            </div>

            {/* Attendance chart */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">المواظبة</h3>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        هذا الفصل
                    </span>
                </div>

                {/* Circular progress */}
                <div className="flex items-center gap-6">
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="text-slate-100"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className="text-emerald-500"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${attendanceStats.attendance_rate}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-slate-900">{attendanceStats.attendance_rate}%</span>
                            <span className="text-[10px] text-slate-500">نسبة الحضور</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                            <span className="flex items-center gap-2 text-xs text-slate-600">
                                <UserCheck className="h-4 w-4 text-emerald-500" />
                                حضور
                            </span>
                            <span className="text-sm font-bold text-emerald-600">{attendanceStats.present_days}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2">
                            <span className="flex items-center gap-2 text-xs text-slate-600">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                                غياب
                            </span>
                            <span className="text-sm font-bold text-rose-600">{attendanceStats.absent_days}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2">
                            <span className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock className="h-4 w-4 text-amber-500" />
                                تأخر
                            </span>
                            <span className="text-sm font-bold text-amber-600">{attendanceStats.late_days}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Behavior summary */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">السلوك</h3>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        هذا الفصل
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                        <TrendingUp className="mx-auto h-6 w-6 text-emerald-500" />
                        <p className="mt-2 text-xl font-bold text-emerald-600">{behaviorStats.positive_count}</p>
                        <p className="text-xs text-slate-500">إيجابي</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-3 text-center">
                        <TrendingDown className="mx-auto h-6 w-6 text-rose-500" />
                        <p className="mt-2 text-xl font-bold text-rose-600">{behaviorStats.negative_count}</p>
                        <p className="text-xs text-slate-500">سلبي</p>
                    </div>
                    <div className="rounded-2xl bg-indigo-50 p-3 text-center">
                        <Award className="mx-auto h-6 w-6 text-indigo-500" />
                        <p className="mt-2 text-xl font-bold text-indigo-600">{behaviorStats.balance}</p>
                        <p className="text-xs text-slate-500">الرصيد</p>
                    </div>
                </div>
            </div>

            {/* Quick info */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-900">معلومات ولي الأمر</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-500">الاسم</span>
                        <span className="text-sm font-semibold text-slate-900">{studentSummary?.parent_name}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-500">الهاتف</span>
                        <span className="text-sm font-semibold text-slate-900" dir="ltr">{studentSummary?.parent_phone}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useEffect, useRef } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts'
import { useTeacherAttendanceAdvancedStatsQuery } from '../hooks'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface Props {
    isOpen: boolean
    onClose: () => void
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

export function TeacherAttendanceStatsModal({ isOpen, onClose }: Props) {
    const { data: stats, isLoading } = useTeacherAttendanceAdvancedStatsQuery({ enabled: isOpen })
    const dialogRef = useRef<HTMLDivElement>(null)

    // إغلاق عند الضغط على Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose()
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // منع التمرير عند فتح النافذة
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                ref={dialogRef}
                className="relative w-full max-w-6xl mx-4 transform overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            <i className="bi bi-graph-up me-2 text-emerald-600" />
                            إحصائيات حضور المعلمين
                        </h2>
                        {stats?.period && (
                            <p className="text-sm text-slate-500 mt-1">
                                {stats.period.semester_name} • من {stats.period.start_date} إلى {stats.period.end_date}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <i className="bi bi-x-lg text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
                        </div>
                    ) : stats ? (
                        <>
                            {/* ملخص سريع */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                <StatCard label="إجمالي المعلمين" value={stats.summary.total_teachers} color="bg-slate-100 text-slate-700" icon="bi-people" />
                                <StatCard label="الحاضرون اليوم" value={stats.summary.present_today} color="bg-green-100 text-green-700" icon="bi-check-circle" />
                                <StatCard label="الغائبون اليوم" value={stats.summary.absent_today} color="bg-red-100 text-red-700" icon="bi-x-circle" />
                                <StatCard label="المتأخرون اليوم" value={stats.summary.delayed_today} color="bg-yellow-100 text-yellow-700" icon="bi-clock" />
                                <StatCard label="نسبة الحضور (الفصل)" value={`${stats.summary.semester_attendance_rate}%`} color="bg-sky-100 text-sky-700" icon="bi-percent" />
                                <StatCard label="ساعات التأخير (الفصل)" value={stats.summary.semester_total_delay_hours} color="bg-purple-100 text-purple-700" icon="bi-hourglass-split" />
                            </div>

                            {/* الصف الثاني من الملخص */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="المعذورون اليوم" value={stats.summary.excused_today} color="bg-indigo-100 text-indigo-700" icon="bi-shield-check" />
                                <StatCard label="في الوقت اليوم" value={stats.summary.on_time_today} color="bg-emerald-100 text-emerald-700" icon="bi-clock-history" />
                                <StatCard label="متوسط التأخير اليوم" value={`${stats.summary.avg_delay_today} د`} color="bg-orange-100 text-orange-700" icon="bi-stopwatch" />
                                <StatCard label="إجمالي المتأخرين (الفصل)" value={stats.summary.semester_delayed_count} color="bg-rose-100 text-rose-700" icon="bi-exclamation-triangle" />
                            </div>

                            {/* الصف الأول من الرسوم */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* اتجاه الحضور الشهري */}
                                <ChartCard title="اتجاه الحضور الشهري" icon="bi-graph-up-arrow">
                                    <div className="h-64">
                                        {stats.monthly_trend.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats.monthly_trend}>
                                                    <defs>
                                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fill="url(#colorPresent)" name="حاضر" />
                                                    <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fill="url(#colorAbsent)" name="غائب" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                </ChartCard>

                                {/* توزيع أسباب الغياب */}
                                <ChartCard title="توزيع أسباب الغياب" icon="bi-pie-chart">
                                    <div className="h-64 flex items-center">
                                        {stats.by_absence_reason.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.by_absence_reason}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={90}
                                                        paddingAngle={5}
                                                        dataKey="count"
                                                        nameKey="label"
                                                    >
                                                        {stats.by_absence_reason.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                    {/* Legend */}
                                    {stats.by_absence_reason.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                            {stats.by_absence_reason.slice(0, 6).map((item, index) => (
                                                <div key={index} className="flex items-center gap-1 text-xs">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="text-slate-600">{item.label} ({item.count})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ChartCard>
                            </div>

                            {/* الصف الثاني من الرسوم */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* الحضور حسب أيام الأسبوع */}
                                <ChartCard title="التأخير والغياب حسب أيام الأسبوع" icon="bi-calendar-week">
                                    <div className="h-64">
                                        {stats.by_day_of_week.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.by_day_of_week} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={70} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="delayed" fill="#f59e0b" name="متأخرون" radius={[0, 4, 4, 0]} />
                                                    <Bar dataKey="absent" fill="#ef4444" name="غائبون" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                </ChartCard>

                                {/* توزيع دقائق التأخير */}
                                <ChartCard title="توزيع دقائق التأخير" icon="bi-clock-history">
                                    <div className="h-64">
                                        {stats.delay_distribution.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.delay_distribution}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="count" fill="#8b5cf6" name="عدد الحالات" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                </ChartCard>
                            </div>

                            {/* الصف الثالث: ساعات الحضور وطرق تسجيل الدخول */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* توزيع ساعات الحضور */}
                                <ChartCard title="توزيع ساعات تسجيل الحضور" icon="bi-alarm">
                                    <div className="h-64">
                                        {stats.by_hour.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.by_hour}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="count" fill="#06b6d4" name="عدد التسجيلات" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                </ChartCard>

                                {/* طرق تسجيل الدخول */}
                                <ChartCard title="طرق تسجيل الحضور" icon="bi-fingerprint">
                                    <div className="h-64 flex items-center">
                                        {stats.by_login_method.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.by_login_method}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="count"
                                                        nameKey="label"
                                                    >
                                                        {stats.by_login_method.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <NoDataMessage />
                                        )}
                                    </div>
                                    {stats.by_login_method.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                            {stats.by_login_method.map((item, index) => (
                                                <div key={index} className="flex items-center gap-1 text-xs">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="text-slate-600">{item.label} ({item.count})</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ChartCard>
                            </div>

                            {/* القوائم */}
                            <div className="grid lg:grid-cols-3 gap-6">
                                {/* أكثر المعلمين تأخراً */}
                                <ListCard
                                    title="أكثر المعلمين تأخراً"
                                    icon="bi-clock-history"
                                    items={stats.top_delayed_teachers.map(t => ({
                                        label: t.name || 'غير معروف',
                                        sublabel: `${t.total_delay_hours} ساعة`,
                                        count: t.delay_count,
                                        countLabel: 'مرة'
                                    }))}
                                    color="text-yellow-600"
                                />

                                {/* أكثر المعلمين غياباً */}
                                <ListCard
                                    title="أكثر المعلمين غياباً"
                                    icon="bi-person-x"
                                    items={stats.top_absent_teachers.map(t => ({
                                        label: t.name || 'غير معروف',
                                        count: t.absence_count,
                                        countLabel: 'يوم'
                                    }))}
                                    color="text-red-600"
                                />

                                {/* ساعات التأخير لكل المعلمين */}
                                <ScrollableListCard
                                    title="ساعات التأخير للمعلمين"
                                    icon="bi-hourglass-split"
                                    items={stats.teachers_delay_hours.map(t => ({
                                        label: t.name || 'غير معروف',
                                        sublabel: `${t.delay_count} ${t.delay_count === 1 ? 'مرة' : 'مرات'}`,
                                        count: t.total_delay_hours,
                                        countLabel: 'ساعة'
                                    }))}
                                    color="text-purple-600"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-slate-500">لا توجد بيانات متاحة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: string }) {
    return (
        <div className={`${color} rounded-xl px-4 py-3`}>
            <div className="flex items-center gap-2 mb-1">
                {icon && <i className={`${icon} text-lg opacity-70`} />}
                <p className="text-xs opacity-70">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    )
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <i className={`${icon} text-emerald-600`} />
                {title}
            </h3>
            {children}
        </div>
    )
}

function ListCard({
    title,
    icon,
    items,
    color,
}: {
    title: string
    icon: string
    items: Array<{ label: string; sublabel?: string; count: number; countLabel?: string }>
    color: string
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <i className={`${icon} ${color}`} />
                {title}
            </h3>
            <div className="space-y-2">
                {items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
                ) : (
                    items.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-bold ${color} w-5`}>{index + 1}</span>
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-900 truncate">{item.label}</p>
                                    {item.sublabel && <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>}
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 bg-white px-2 py-0.5 rounded">
                                {item.count} {item.countLabel || ''}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function ScrollableListCard({
    title,
    icon,
    items,
    color,
}: {
    title: string
    icon: string
    items: Array<{ label: string; sublabel?: string; count: number; countLabel?: string }>
    color: string
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <i className={`${icon} ${color}`} />
                    {title}
                </span>
                <span className="text-xs text-slate-400 font-normal">{items.length} معلم</span>
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                {items.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
                ) : (
                    items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-bold ${color} w-5`}>{index + 1}</span>
                                <div className="min-w-0">
                                    <p className="text-sm text-slate-900 truncate">{item.label}</p>
                                    {item.sublabel && <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>}
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 bg-white px-2 py-0.5 rounded whitespace-nowrap">
                                {item.count} {item.countLabel || ''}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function NoDataMessage() {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400">لا توجد بيانات كافية</p>
        </div>
    )
}

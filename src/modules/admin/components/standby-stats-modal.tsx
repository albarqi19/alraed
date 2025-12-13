import { useEffect, useRef } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
    X, Loader2, AlertTriangle, CheckCircle, Users, UserX, Info,
    TrendingUp, Calendar, Clock, BarChart3
} from 'lucide-react'
import { useStandbyAdvancedStatsQuery } from '../hooks'

// =====================================================
// Types
// =====================================================

interface Props {
    isOpen: boolean
    onClose: () => void
}

// =====================================================
// Constants
// =====================================================

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const RECOMMENDATION_STYLES = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
    danger: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: UserX },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Info },
}

// =====================================================
// Component
// =====================================================

export function StandbyStatsModal({ isOpen, onClose }: Props) {
    const { data: stats, isLoading } = useStandbyAdvancedStatsQuery({ enabled: isOpen })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div
                ref={dialogRef}
                className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                {/* Header */}
                <header className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="text-right">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>إحصائيات جدول الانتظار</h2>
                        {stats?.period && (
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                {stats.period.semester_name} ({stats.period.start_date} - {stats.period.end_date})
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100" style={{ color: 'var(--color-text-muted)' }}>
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {/* Content */}
                <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-muted">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <span>جاري تحميل الإحصائيات...</span>
                        </div>
                    ) : !stats ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-muted">
                            <Info className="h-12 w-12 text-slate-400" />
                            <span className="text-lg font-medium text-slate-600">لا توجد بيانات</span>
                            <span className="text-sm">لم يتم اعتماد أي انتظارات بعد في هذا الفصل الدراسي</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* التوصيات الذكية */}
                            {stats.recommendations.length > 0 && (
                                <section className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        التوصيات والتنبيهات
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {stats.recommendations.map((rec, idx) => {
                                            const style = RECOMMENDATION_STYLES[rec.type]
                                            const Icon = style.icon
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Icon className={`h-5 w-5 flex-shrink-0 ${style.text}`} />
                                                        <div className="flex-1">
                                                            <h4 className={`font-semibold ${style.text}`}>{rec.title}</h4>
                                                            <p className={`mt-1 text-sm ${style.text} opacity-80`}>{rec.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* بطاقات الملخص */}
                            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <SummaryCard
                                    title="إجمالي التعيينات"
                                    value={stats.summary.total_assignments}
                                    icon={<BarChart3 className="h-5 w-5" />}
                                    color="indigo"
                                />
                                <SummaryCard
                                    title="اليوم"
                                    value={stats.summary.today}
                                    icon={<Calendar className="h-5 w-5" />}
                                    color="emerald"
                                />
                                <SummaryCard
                                    title="هذا الأسبوع"
                                    value={stats.summary.this_week}
                                    icon={<TrendingUp className="h-5 w-5" />}
                                    color="violet"
                                />
                                <SummaryCard
                                    title="المعدل اليومي"
                                    value={stats.summary.avg_per_day}
                                    icon={<Clock className="h-5 w-5" />}
                                    color="amber"
                                    suffix="تعيين/يوم"
                                />
                            </section>

                            {/* معلومات إضافية */}
                            <section className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-bold text-slate-800">{stats.summary.total_standby_teachers}</div>
                                    <div className="text-sm text-muted">معلمين منتظرين</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-bold text-slate-800">{stats.summary.total_absent_teachers}</div>
                                    <div className="text-sm text-muted">معلمين غائبين (تم التعويض عنهم)</div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                                    <div className="text-2xl font-bold text-slate-800">{stats.summary.total_days}</div>
                                    <div className="text-sm text-muted">يوم دراسي</div>
                                </div>
                            </section>

                            {/* الرسوم البيانية */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* الاتجاه الشهري */}
                                {stats.monthly_trend.length > 0 && (
                                    <ChartCard title="الاتجاه الشهري" icon={<TrendingUp className="h-5 w-5" />}>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <AreaChart data={stats.monthly_trend}>
                                                <defs>
                                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                    formatter={(value: number) => [`${value} تعيين`, 'العدد']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#6366f1"
                                                    strokeWidth={2}
                                                    fill="url(#colorCount)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                )}

                                {/* التوزيع حسب الأيام */}
                                <ChartCard title="التوزيع حسب أيام الأسبوع" icon={<Calendar className="h-5 w-5" />}>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={stats.by_day_of_week}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                formatter={(value: number) => [`${value} تعيين`, 'العدد']}
                                            />
                                            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                {/* التوزيع حسب الحصص */}
                                <ChartCard title="التوزيع حسب رقم الحصة" icon={<Clock className="h-5 w-5" />}>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={stats.by_period_number}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                formatter={(value: number) => [`${value} تعيين`, 'العدد']}
                                            />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                {/* توزيع الأولويات */}
                                {stats.by_priority.length > 0 && (
                                    <ChartCard title="توزيع استخدام الأولويات" icon={<Users className="h-5 w-5" />}>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={stats.by_priority}
                                                    dataKey="count"
                                                    nameKey="label"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    label={(props: any) => {
                                                        const { name, percent } = props
                                                        return `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                                                    }}
                                                >
                                                    {stats.by_priority.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                    formatter={(value: number) => [`${value} مرة`, 'الاستخدام']}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </ChartCard>
                                )}
                            </div>

                            {/* القوائم */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* أكثر المعلمين انتظاراً */}
                                <ListCard
                                    title="أكثر المعلمين انتظاراً"
                                    icon={<Users className="h-5 w-5 text-indigo-500" />}
                                    items={stats.top_standby_teachers}
                                    color="indigo"
                                />

                                {/* أكثر المعلمين غياباً */}
                                <ListCard
                                    title="أكثر المعلمين غياباً (تم التعويض عنهم)"
                                    icon={<UserX className="h-5 w-5 text-rose-500" />}
                                    items={stats.top_absent_teachers}
                                    color="rose"
                                />
                            </div>

                            {/* تحليل العدالة */}
                            <section className="rounded-xl border border-slate-200 bg-white p-5">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                                    <BarChart3 className="h-5 w-5 text-violet-500" />
                                    تحليل عدالة التوزيع
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg bg-slate-50 p-4">
                                        <div className="text-sm text-muted">معامل التباين</div>
                                        <div className={`mt-1 text-2xl font-bold ${stats.fairness_analysis.coefficient_of_variation > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {stats.fairness_analysis.coefficient_of_variation}%
                                        </div>
                                        <div className="mt-1 text-xs text-muted">
                                            {stats.fairness_analysis.coefficient_of_variation <= 30 ? 'توزيع متوازن ✓' : 'يحتاج تحسين ⚠'}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4">
                                        <div className="text-sm text-muted">متوسط التعيينات/معلم</div>
                                        <div className="mt-1 text-2xl font-bold text-slate-800">
                                            {stats.fairness_analysis.avg_assignments_per_teacher}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-4">
                                        <div className="text-sm text-muted">الانحراف المعياري</div>
                                        <div className="mt-1 text-2xl font-bold text-slate-800">
                                            {stats.fairness_analysis.std_deviation}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// =====================================================
// Helper Components
// =====================================================

function SummaryCard({
    title,
    value,
    icon,
    color,
    suffix,
}: {
    title: string
    value: number
    icon: React.ReactNode
    color: 'indigo' | 'emerald' | 'violet' | 'amber'
    suffix?: string
}) {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        violet: 'bg-violet-50 text-violet-600 border-violet-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    }

    return (
        <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                {icon}
                {title}
            </div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
            {suffix && <div className="mt-1 text-xs opacity-70">{suffix}</div>}
        </div>
    )
}

function ChartCard({
    title,
    icon,
    children,
}: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                {icon}
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
    icon: React.ReactNode
    items: Array<{ id: number | null; name: string; count: number }>
    color: 'indigo' | 'rose'
}) {
    const bgColor = color === 'indigo' ? 'bg-indigo-50' : 'bg-rose-50'
    const textColor = color === 'indigo' ? 'text-indigo-700' : 'text-rose-700'

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                {icon}
                {title}
            </h3>
            {items.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">لا توجد بيانات</p>
            ) : (
                <div className="space-y-2">
                    {items.slice(0, 5).map((item, idx) => (
                        <div key={item.id ?? idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                    {idx + 1}
                                </span>
                                <span className="font-medium text-slate-700">{item.name}</span>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${bgColor} ${textColor}`}>
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

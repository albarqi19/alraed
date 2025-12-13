import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'

// ========== Types ==========
interface TeacherQuota {
    id: number
    teacher_id: number
    teacher: { id: number; name: string }
    current_load: number
    standby_quota: number
    priority_1_count: number
    priority_2_count: number
    priority_3_count: number
    used_quota: number
}

interface WeeklySlot {
    id: number
    day: string
    period_number: number
    standby_1_id: number | null
    standby_2_id: number | null
    standby_3_id: number | null
    standby1: { id: number; name: string } | null
    standby2: { id: number; name: string } | null
    standby3: { id: number; name: string } | null
}

interface WeeklyScheduleData {
    schedule: Record<string, WeeklySlot[]>
    quotas: TeacherQuota[]
    settings: {
        max_periods_per_week: number
        standard_weekly_load: number
        periods_per_day: number
    }
}

// ========== API Functions ==========
async function fetchWeeklySchedule(): Promise<WeeklyScheduleData> {
    const { data } = await apiClient.get('/admin/teacher-standby/weekly-schedule')
    if (!data.success) throw new Error(data.message || 'فشل في تحميل البيانات')
    return data.data
}

async function calculateQuotas(): Promise<{ quotas: TeacherQuota[]; standard_load: number }> {
    const { data } = await apiClient.post('/admin/teacher-standby/calculate-quotas')
    if (!data.success) throw new Error(data.message || 'فشل في الحساب')
    return data.data
}

async function generateWeekly(): Promise<void> {
    const { data } = await apiClient.post('/admin/teacher-standby/generate-weekly')
    if (!data.success) throw new Error(data.message || 'فشل في التوليد')
}

// ========== Day Labels ==========
const DAY_LABELS: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
}

// ========== Main Component ==========
export function AdminTeacherStandbyPage() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'quotas' | 'weekly' | 'simulation' | 'preferences'>('quotas')
    const [showBetaWarning, setShowBetaWarning] = useState(true)

    // Queries
    const { data, isLoading } = useQuery({
        queryKey: ['teacher-standby-weekly'],
        queryFn: fetchWeeklySchedule,
        staleTime: 60000,
    })

    // Mutations
    const calculateMutation = useMutation({
        mutationFn: calculateQuotas,
        onSuccess: (result) => {
            toast({ type: 'success', title: `تم حساب مدى الإسناد - الحصة العادلة: ${result.standard_load}` })
            queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        },
    })

    const generateMutation = useMutation({
        mutationFn: generateWeekly,
        onSuccess: () => {
            toast({ type: 'success', title: 'تم توليد جدول الانتظار الأسبوعي' })
            queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        },
    })

    const schedule = data?.schedule ?? {}
    const quotas = data?.quotas ?? []
    const settings = data?.settings

    const hasQuotas = quotas.length > 0

    return (
        <>
            {/* نافذة التحذير التجريبية */}
            {showBetaWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="p-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                                <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">ميزة تجريبية</h2>
                            <p className="text-sm text-muted mb-6">
                                هذه الميزة لا تزال قيد التطوير والاختبار. قد تواجه بعض الأخطاء غير المتوقعة.
                            </p>
                            <button
                                onClick={() => setShowBetaWarning(false)}
                                className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                            >
                                موافق، أفهم ذلك
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="space-y-6">
                {/* Header */}
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1 text-right">
                        <h1 className="text-3xl font-bold text-slate-900">جدول الانتظار</h1>
                        <p className="text-sm text-muted">
                            النظام يحسب مدى الإسناد تلقائياً ويوزع المنتظرين
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => calculateMutation.mutate()}
                            disabled={calculateMutation.isPending}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {calculateMutation.isPending ? '...' : 'حساب الإسناد'}
                        </button>
                        <button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending || !hasQuotas}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {generateMutation.isPending ? '...' : 'توليد الجدول'}
                        </button>
                    </div>
                </header>

                {/* Info Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <InfoCard
                        icon=""
                        label="النصاب الكامل"
                        value={settings?.standard_weekly_load ?? '-'}
                        subtitle="حصة/أسبوع لكل معلم"
                    />
                    <InfoCard
                        icon=""
                        label="المعلمين"
                        value={quotas.length}
                        subtitle="لديهم حصص إسناد"
                    />
                    <InfoCard
                        icon=""
                        label="الحصص/اليوم"
                        value={settings?.periods_per_day ?? 7}
                        subtitle="حصص دراسية"
                    />
                </div>

                {/* Tabs */}
                <div className="inline-flex rounded-3xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
                    <TabButton active={activeTab === 'quotas'} onClick={() => setActiveTab('quotas')}>
                        مدى الإسناد ({quotas.length})
                    </TabButton>
                    <TabButton active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')}>
                        الجدول الأسبوعي
                    </TabButton>
                    <TabButton active={activeTab === 'simulation'} onClick={() => setActiveTab('simulation')}>
                        محاكاة الغياب
                    </TabButton>
                    <TabButton active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')}>
                        إعدادات المعلمين
                    </TabButton>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
                    </div>
                ) : activeTab === 'quotas' ? (
                    <QuotasTab quotas={quotas} />
                ) : activeTab === 'weekly' ? (
                    <WeeklyTab schedule={schedule} periodsPerDay={settings?.periods_per_day ?? 7} />
                ) : activeTab === 'simulation' ? (
                    <SimulationTab schedule={schedule} periodsPerDay={settings?.periods_per_day ?? 7} quotas={quotas} />
                ) : (
                    <PreferencesTab quotas={quotas} />
                )}
            </section>
        </>
    )
}

// ========== Sub Components ==========

function InfoCard({ label, value, subtitle }: { icon: string; label: string; value: number | string; subtitle: string }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{value}</p>
                <p className="text-sm font-semibold text-indigo-600 mt-1">{label}</p>
                <p className="text-xs text-muted mt-0.5">{subtitle}</p>
            </div>
        </div>
    )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`rounded-3xl px-4 py-1.5 text-sm font-semibold transition ${active
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
        >
            {children}
        </button>
    )
}

function QuotasTab({ quotas }: { quotas: TeacherQuota[] }) {
    if (quotas.length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="text-5xl">📊</div>
                <p className="font-semibold text-slate-900">لم يتم حساب مدى الإسناد بعد</p>
                <p className="text-xs">اضغط على زر "حساب الإسناد" لحساب مدى الإسناد لكل معلم</p>
            </div>
        )
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-muted mb-4">
                المعلمين مرتبون من الأقل نصاباً (أكثر إسناداً) إلى الأكثر نصاباً
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                            <th className="px-4 py-3 text-right font-semibold">#</th>
                            <th className="px-4 py-3 text-right font-semibold">المعلم</th>
                            <th className="px-4 py-3 text-center font-semibold">نصابه</th>
                            <th className="px-4 py-3 text-center font-semibold">إسناده</th>
                            <th className="px-4 py-3 text-center font-semibold">م1</th>
                            <th className="px-4 py-3 text-center font-semibold">م2</th>
                            <th className="px-4 py-3 text-center font-semibold">م3</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotas.map((quota, index) => (
                            <tr
                                key={quota.id}
                                className="border-t transition hover:bg-slate-50"
                                style={{ borderColor: 'var(--color-border)' }}
                            >
                                <td className="px-4 py-3 text-center font-medium text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {quota.teacher?.name}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                        {quota.current_load} حصة
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${quota.standby_quota > 4 ? 'bg-emerald-100 text-emerald-700' :
                                        quota.standby_quota > 2 ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                        {quota.standby_quota} حصص
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center text-teal-600 font-semibold">{quota.priority_1_count}</td>
                                <td className="px-4 py-3 text-center text-blue-600 font-medium">{quota.priority_2_count}</td>
                                <td className="px-4 py-3 text-center text-slate-600">{quota.priority_3_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function WeeklyTab({ schedule, periodsPerDay }: { schedule: Record<string, WeeklySlot[]>; periodsPerDay: number }) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    const [hoveredTeacherId, setHoveredTeacherId] = useState<number | null>(null)

    if (Object.keys(schedule).length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="text-5xl">📅</div>
                <p className="font-semibold text-slate-900">لم يتم توليد الجدول بعد</p>
                <p className="text-xs">اضغط على زر "توليد الجدول" لإنشاء جدول الانتظار الأسبوعي</p>
            </div>
        )
    }

    // دالة للتحقق إذا المعلم مظلل
    const isHighlighted = (teacherId: number | null | undefined) => {
        return hoveredTeacherId !== null && teacherId === hoveredTeacherId
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-muted mb-4">
                جدول الانتظار الأسبوعي - 3 منتظرين لكل حصة (م1 أولوية قصوى)
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                            <th className="px-4 py-3 text-center font-semibold">الحصة</th>
                            {days.map(day => (
                                <th key={day} className="px-4 py-3 text-center font-semibold">{DAY_LABELS[day]}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(period => (
                            <tr
                                key={period}
                                className="border-t transition"
                                style={{ borderColor: 'var(--color-border)' }}
                            >
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center rounded-full bg-slate-200 h-8 w-8 font-bold text-slate-700">
                                        {period}
                                    </span>
                                </td>
                                {days.map(day => {
                                    const slot = schedule[day]?.find(s => s.period_number === period)
                                    return (
                                        <td key={day} className="px-2 py-2">
                                            <div className="flex flex-col gap-1 text-xs">
                                                {slot?.standby1 && (
                                                    <span
                                                        className={`rounded px-2 py-1 font-medium cursor-pointer transition-all ${isHighlighted(slot.standby1?.id)
                                                            ? 'bg-yellow-300 text-yellow-900 ring-2 ring-yellow-500'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                            }`}
                                                        onMouseEnter={() => setHoveredTeacherId(slot.standby1?.id ?? null)}
                                                        onMouseLeave={() => setHoveredTeacherId(null)}
                                                    >
                                                        1 {slot.standby1.name}
                                                    </span>
                                                )}
                                                {slot?.standby2 && (
                                                    <span
                                                        className={`rounded px-2 py-1 cursor-pointer transition-all ${isHighlighted(slot.standby2?.id)
                                                            ? 'bg-yellow-300 text-yellow-900 ring-2 ring-yellow-500'
                                                            : 'bg-blue-100 text-blue-700'
                                                            }`}
                                                        onMouseEnter={() => setHoveredTeacherId(slot.standby2?.id ?? null)}
                                                        onMouseLeave={() => setHoveredTeacherId(null)}
                                                    >
                                                        2 {slot.standby2.name}
                                                    </span>
                                                )}
                                                {slot?.standby3 && (
                                                    <span
                                                        className={`rounded px-2 py-1 cursor-pointer transition-all ${isHighlighted(slot.standby3?.id)
                                                            ? 'bg-yellow-300 text-yellow-900 ring-2 ring-yellow-500'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        onMouseEnter={() => setHoveredTeacherId(slot.standby3?.id ?? null)}
                                                        onMouseLeave={() => setHoveredTeacherId(null)}
                                                    >
                                                        3 {slot.standby3.name}
                                                    </span>
                                                )}
                                                {!slot?.standby1 && !slot?.standby2 && !slot?.standby3 && (
                                                    <span className="text-slate-400 text-center">-</span>
                                                )}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function SimulationTab({
    quotas
}: {
    schedule: Record<string, WeeklySlot[]>
    periodsPerDay: number
    quotas: TeacherQuota[]
}) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
    const [selectedDay, setSelectedDay] = useState('sunday')

    // استعلام المحاكاة
    const { data: simulationData, isLoading: isSimulating } = useQuery({
        queryKey: ['simulate-absence', selectedTeacherId, selectedDay],
        queryFn: async () => {
            if (!selectedTeacherId) return null
            const { data } = await apiClient.get('/admin/teacher-standby/simulate-absence', {
                params: { teacher_id: selectedTeacherId, day: selectedDay }
            })
            return data.success ? data.data : null
        },
        enabled: !!selectedTeacherId,
    })

    return (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            {/* قسم الاختيار */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                    محاكاة غياب معلم
                </h3>
                <p className="text-sm text-muted mb-6">
                    اختر المعلم الغائب واليوم لرؤية حصصه الأساسية ومن سيحل محله
                </p>

                <div className="space-y-4">
                    {/* اختيار المعلم */}
                    <div>
                        <label className="block text-sm font-medium text-muted mb-2">
                            المعلم الغائب
                        </label>
                        <select
                            value={selectedTeacherId ?? ''}
                            onChange={(e) => setSelectedTeacherId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        >
                            <option value="">-- اختر معلم --</option>
                            {quotas.map(q => (
                                <option key={q.teacher_id} value={q.teacher_id}>
                                    {q.teacher?.name} ({q.current_load} حصة)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* اختيار اليوم */}
                    <div>
                        <label className="block text-sm font-medium text-muted mb-2">
                            اليوم
                        </label>
                        <select
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        >
                            {days.map(day => (
                                <option key={day} value={day}>{DAY_LABELS[day]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </aside>

            {/* نتيجة المحاكاة */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                    حصص {simulationData?.teacher?.name ?? 'المعلم'} يوم {DAY_LABELS[selectedDay]}
                </h3>

                {isSimulating ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
                    </div>
                ) : !selectedTeacherId ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted">
                        <div className="text-5xl">�</div>
                        <p>اختر معلم لرؤية حصصه ومن سيحل محله</p>
                    </div>
                ) : simulationData?.sessions?.length > 0 ? (
                    <div className="space-y-4">
                        {simulationData.sessions.map((session: {
                            period: number
                            class: string
                            subject: string
                            standby1: string | null
                            standby2: string | null
                            standby3: string | null
                        }) => (
                            <div
                                key={session.period}
                                className="rounded-xl border p-4"
                                style={{ borderColor: 'var(--color-border)' }}
                            >
                                <div className="flex items-center gap-4 mb-3">
                                    <span className="inline-flex items-center justify-center rounded-full bg-slate-800 text-white h-10 w-10 font-bold text-lg">
                                        {session.period}
                                    </span>
                                    <div>
                                        <span className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                            الحصة {session.period}
                                        </span>
                                        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                            {session.class} - {session.subject}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-3">
                                    {/* م1 */}
                                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                                        <span className="text-xl">1</span>
                                        <div>
                                            <div className="text-xs text-emerald-600 font-medium">البديل الأول</div>
                                            <div className="text-sm font-bold text-emerald-800">
                                                {session.standby1 ?? 'لا يوجد'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* م2 */}
                                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 border border-blue-200">
                                        <span className="text-xl">2</span>
                                        <div>
                                            <div className="text-xs text-blue-600 font-medium">البديل الثاني</div>
                                            <div className="text-sm font-bold text-blue-800">
                                                {session.standby2 ?? 'لا يوجد'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* م3 */}
                                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 border border-slate-300">
                                        <span className="text-xl">3</span>
                                        <div>
                                            <div className="text-xs text-slate-600 font-medium">البديل الثالث</div>
                                            <div className="text-sm font-bold text-slate-700">
                                                {session.standby3 ?? 'لا يوجد'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted">
                        <div className="text-5xl">📅</div>
                        <p>هذا المعلم ليس له حصص في يوم {DAY_LABELS[selectedDay]}</p>
                    </div>
                )}
            </section>
        </div>
    )
}

interface TeacherPreference {
    id: number
    teacher_id: number
    teacher: { id: number; name: string }
    is_excluded: boolean
    exclusion_reason: string | null
    max_weekly_standby: number | null
    no_same_day_repeat: boolean
    max_daily_standby: number
    fixed_priority: number | null
    notes: string | null
}

function PreferencesTab({ quotas }: { quotas: TeacherQuota[] }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
    const [formData, setFormData] = useState({
        is_excluded: false,
        exclusion_reason: '',
        max_weekly_standby: '',
        no_same_day_repeat: true,
        max_daily_standby: 1,
        fixed_priority: '',
        notes: '',
    })

    // جلب الإعدادات
    const { data: prefData } = useQuery({
        queryKey: ['teacher-preferences'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/teacher-standby/teacher-preferences')
            return data.success ? data.data : null
        },
    })

    // حفظ الإعدادات
    const saveMutation = useMutation({
        mutationFn: async (teacherId: number) => {
            const { data } = await apiClient.post('/admin/teacher-standby/teacher-preferences', {
                teacher_id: teacherId,
                ...formData,
                max_weekly_standby: formData.max_weekly_standby ? Number(formData.max_weekly_standby) : null,
                fixed_priority: formData.fixed_priority ? Number(formData.fixed_priority) : null,
            })
            if (!data.success) throw new Error(data.message)
            return data
        },
        onSuccess: () => {
            toast({ type: 'success', title: 'تم حفظ الإعدادات' })
            queryClient.invalidateQueries({ queryKey: ['teacher-preferences'] })
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        },
    })

    // عند اختيار معلم
    const handleTeacherSelect = (teacherId: number) => {
        setSelectedTeacherId(teacherId)
        const pref = prefData?.preferences?.find((p: TeacherPreference) => p.teacher_id === teacherId)
        if (pref) {
            setFormData({
                is_excluded: pref.is_excluded,
                exclusion_reason: pref.exclusion_reason || '',
                max_weekly_standby: pref.max_weekly_standby?.toString() || '',
                no_same_day_repeat: pref.no_same_day_repeat,
                max_daily_standby: pref.max_daily_standby || 1,
                fixed_priority: pref.fixed_priority?.toString() || '',
                notes: pref.notes || '',
            })
        } else {
            setFormData({
                is_excluded: false,
                exclusion_reason: '',
                max_weekly_standby: '',
                no_same_day_repeat: true,
                max_daily_standby: 1,
                fixed_priority: '',
                notes: '',
            })
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* قائمة المعلمين */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        👥 اختر معلم
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {quotas.map(q => {
                            const pref = prefData?.preferences?.find((p: TeacherPreference) => p.teacher_id === q.teacher_id)
                            return (
                                <button
                                    key={q.teacher_id}
                                    onClick={() => handleTeacherSelect(q.teacher_id)}
                                    className={`w-full text-right p-3 rounded-xl transition ${selectedTeacherId === q.teacher_id ? 'bg-teal-100 border-teal-500' : 'hover:bg-slate-100'
                                        }`}
                                    style={{ border: '1px solid var(--color-border)' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{q.teacher?.name}</span>
                                        <div className="flex gap-2">
                                            {pref?.is_excluded && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">مستثنى</span>}
                                            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">{q.current_load} حصة</span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* نموذج الإعدادات */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                        ⚙️ إعدادات المعلم
                    </h3>

                    {selectedTeacherId ? (
                        <div className="space-y-4">
                            {/* استثناء */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_excluded}
                                    onChange={(e) => setFormData({ ...formData, is_excluded: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="font-medium">🚫 استثناء من الانتظار</span>
                            </label>

                            {formData.is_excluded && (
                                <input
                                    type="text"
                                    placeholder="سبب الاستثناء"
                                    value={formData.exclusion_reason}
                                    onChange={(e) => setFormData({ ...formData, exclusion_reason: e.target.value })}
                                    className="w-full rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: 'var(--color-border)' }}
                                />
                            )}

                            {/* لا تكرار */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.no_same_day_repeat}
                                    onChange={(e) => setFormData({ ...formData, no_same_day_repeat: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="font-medium">🔄 لا تكرار في نفس اليوم</span>
                            </label>

                            {/* الحد الأقصى اليومي */}
                            <div>
                                <label className="block text-sm font-medium mb-1">⏰ الحد الأقصى اليومي</label>
                                <select
                                    value={formData.max_daily_standby}
                                    onChange={(e) => setFormData({ ...formData, max_daily_standby: Number(e.target.value) })}
                                    className="w-full rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <option value={1}>1 حصة</option>
                                    <option value={2}>2 حصة</option>
                                    <option value={3}>3 حصص</option>
                                </select>
                            </div>

                            {/* الحد الأقصى الأسبوعي */}
                            <div>
                                <label className="block text-sm font-medium mb-1">📊 الحد الأقصى الأسبوعي (اختياري)</label>
                                <input
                                    type="number"
                                    placeholder="تلقائي"
                                    value={formData.max_weekly_standby}
                                    onChange={(e) => setFormData({ ...formData, max_weekly_standby: e.target.value })}
                                    className="w-full rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: 'var(--color-border)' }}
                                />
                            </div>

                            {/* أولوية ثابتة */}
                            <div>
                                <label className="block text-sm font-medium mb-1">🎯 أولوية ثابتة</label>
                                <select
                                    value={formData.fixed_priority}
                                    onChange={(e) => setFormData({ ...formData, fixed_priority: e.target.value })}
                                    className="w-full rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <option value="">تلقائي (الكل)</option>
                                    <option value="1">م1 فقط</option>
                                    <option value="2">م2 فقط</option>
                                    <option value="3">م3 فقط</option>
                                </select>
                            </div>

                            {/* ملاحظات */}
                            <div>
                                <label className="block text-sm font-medium mb-1">📝 ملاحظات</label>
                                <textarea
                                    placeholder="ملاحظات إضافية..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: 'var(--color-border)' }}
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={() => saveMutation.mutate(selectedTeacherId)}
                                disabled={saveMutation.isPending}
                                className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                            >
                                {saveMutation.isPending ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">👈</div>
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                اختر معلم من القائمة لتعديل إعداداته
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminTeacherStandbyPage

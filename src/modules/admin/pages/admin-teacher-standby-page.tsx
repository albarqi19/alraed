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
    const [showSettingsModal, setShowSettingsModal] = useState(false)

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
                            onClick={() => setShowSettingsModal(true)}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            title="إعدادات الانتظار"
                        >
                            ⚙️
                        </button>
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

            {/* Settings Modal */}
            {showSettingsModal && (
                <StandbySettingsModal
                    onClose={() => setShowSettingsModal(false)}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
                        setShowSettingsModal(false)
                    }}
                />
            )}
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
    schedule,
    quotas
}: {
    schedule: Record<string, WeeklySlot[]>
    periodsPerDay: number
    quotas: TeacherQuota[]
}) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([])
    const [selectedDay, setSelectedDay] = useState('sunday')

    // دالة للتبديل بين اختيار وإلغاء اختيار المعلم
    const toggleTeacher = (teacherId: number) => {
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        )
    }

    // الحصول على الجدول لليوم المحدد
    const daySchedule = schedule[selectedDay] ?? []

    // بناء خريطة الغياب - أي حصص لكل معلم غائب
    const absentTeacherSessions: Map<number, { period: number; teacherName: string }[]> = new Map()

    quotas.forEach(q => {
        if (selectedTeacherIds.includes(q.teacher_id)) {
            // سنجد المعلم في schedule إذا كان له حصص (كـ standby)
            // لكن الأهم هو حصصه الأساسية - يجب جلبها من API أو من البيانات
            // حالياً سنعرض البدلاء المتاحين لكل حصة
            absentTeacherSessions.set(q.teacher_id, [])
        }
    })

    // تتبع من هو مشغول في كل حصة (البديل الذي تم استخدامه)
    const busySubstitutes: Map<number, Set<number>> = new Map() // period -> set of busy teacher IDs

    // حساب التعارضات والبدلاء الفعليين
    type AssignmentResult = {
        period: number
        absentTeacherId: number
        absentTeacherName: string
        assignedSubstitute: string | null
        assignedSubstituteId: number | null
        priority: number // 1, 2, or 3
        conflict: boolean
        allBusy: boolean
    }

    const assignments: AssignmentResult[] = []

    // للتبسيط، سنعرض لكل حصة البدلاء المتاحين مع التعارضات
    // نمر على كل حصة ونحدد من سيحل محل كل غائب
    daySchedule.forEach(slot => {
        const period = slot.period_number

        selectedTeacherIds.forEach(absentId => {
            const absentTeacher = quotas.find(q => q.teacher_id === absentId)
            if (!absentTeacher) return

            // التحقق من البدلاء بالترتيب
            const standbys = [
                { id: slot.standby1?.id, name: slot.standby1?.name, priority: 1 },
                { id: slot.standby2?.id, name: slot.standby2?.name, priority: 2 },
                { id: slot.standby3?.id, name: slot.standby3?.name, priority: 3 },
            ]

            // من مشغول في هذه الحصة
            if (!busySubstitutes.has(period)) {
                busySubstitutes.set(period, new Set())
            }
            const busy = busySubstitutes.get(period)!

            // البحث عن بديل متاح (ليس غائب وليس مشغول)
            let assigned: { id: number; name: string; priority: number } | null = null

            for (const s of standbys) {
                if (!s.id || !s.name) continue
                // البديل لا يمكن أن يكون هو نفسه الغائب
                if (selectedTeacherIds.includes(s.id)) continue
                // البديل لا يمكن أن يكون مشغول بالفعل
                if (busy.has(s.id)) continue

                assigned = { id: s.id, name: s.name, priority: s.priority }
                busy.add(s.id) // حجزه
                break
            }

            assignments.push({
                period,
                absentTeacherId: absentId,
                absentTeacherName: absentTeacher.teacher?.name ?? 'غير معروف',
                assignedSubstitute: assigned?.name ?? null,
                assignedSubstituteId: assigned?.id ?? null,
                priority: assigned?.priority ?? 0,
                conflict: assigned?.priority !== 1,
                allBusy: !assigned,
            })
        })
    })

    // تجميع النتائج حسب الحصة
    const periodGroups: Map<number, AssignmentResult[]> = new Map()
    assignments.forEach(a => {
        if (!periodGroups.has(a.period)) {
            periodGroups.set(a.period, [])
        }
        periodGroups.get(a.period)!.push(a)
    })

    const sortedPeriods = Array.from(periodGroups.keys()).sort((a, b) => a - b)

    return (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            {/* قسم الاختيار */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                    محاكاة غياب المعلمين
                </h3>
                <p className="text-sm text-muted mb-4">
                    اختر المعلمين الغائبين واليوم لرؤية توزيع البدلاء والتعارضات
                </p>

                {/* اختيار اليوم */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-muted mb-2">اليوم</label>
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

                {/* اختيار المعلمين */}
                <div>
                    <label className="block text-sm font-medium text-muted mb-2">
                        المعلمين الغائبين ({selectedTeacherIds.length})
                    </label>
                    <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-2xl border border-slate-200 p-2">
                        {quotas.map(q => (
                            <label
                                key={q.teacher_id}
                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${selectedTeacherIds.includes(q.teacher_id)
                                    ? 'bg-red-100 border border-red-300'
                                    : 'hover:bg-slate-50'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTeacherIds.includes(q.teacher_id)}
                                    onChange={() => toggleTeacher(q.teacher_id)}
                                    className="h-4 w-4 text-red-600 rounded"
                                />
                                <span className="text-sm">{q.teacher?.name}</span>
                                <span className="text-xs text-muted">({q.current_load} حصة)</span>
                            </label>
                        ))}
                    </div>
                </div>

                {selectedTeacherIds.length > 0 && (
                    <button
                        onClick={() => setSelectedTeacherIds([])}
                        className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                        إلغاء الكل
                    </button>
                )}
            </aside>

            {/* نتيجة المحاكاة */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                    توزيع البدلاء - يوم {DAY_LABELS[selectedDay]}
                    {selectedTeacherIds.length > 0 && (
                        <span className="text-sm font-normal text-muted mr-2">
                            ({selectedTeacherIds.length} غائب)
                        </span>
                    )}
                </h3>

                {selectedTeacherIds.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted">
                        <div className="text-5xl">👥</div>
                        <p>اختر معلم أو أكثر من القائمة لمحاكاة غيابهم</p>
                    </div>
                ) : sortedPeriods.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted">
                        <div className="text-5xl">📅</div>
                        <p>لا توجد حصص في هذا اليوم</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedPeriods.map(period => {
                            const periodAssignments = periodGroups.get(period)!
                            const hasConflict = periodAssignments.some(a => a.conflict || a.allBusy)

                            return (
                                <div
                                    key={period}
                                    className={`rounded-xl border p-4 ${hasConflict ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="inline-flex items-center justify-center rounded-full bg-slate-800 text-white h-10 w-10 font-bold text-lg">
                                            {period}
                                        </span>
                                        <span className="text-lg font-semibold text-slate-900">
                                            الحصة {period}
                                        </span>
                                        {hasConflict && (
                                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                                                تعارض
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {periodAssignments.map((a, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-lg ${a.allBusy
                                                    ? 'bg-red-100 border border-red-300'
                                                    : a.conflict
                                                        ? 'bg-amber-100 border border-amber-300'
                                                        : 'bg-emerald-50 border border-emerald-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-red-600 font-medium">❌ {a.absentTeacherName}</span>
                                                    <span className="text-slate-400">→</span>
                                                    {a.allBusy ? (
                                                        <span className="text-red-700 font-medium">⚠️ لا يوجد بديل متاح!</span>
                                                    ) : (
                                                        <span className={`font-medium ${a.priority === 1 ? 'text-emerald-700' :
                                                            a.priority === 2 ? 'text-blue-700' : 'text-slate-700'
                                                            }`}>
                                                            ✅ {a.assignedSubstitute}
                                                        </span>
                                                    )}
                                                </div>
                                                {!a.allBusy && (
                                                    <span className={`text-xs px-2 py-1 rounded-full ${a.priority === 1 ? 'bg-emerald-200 text-emerald-800' :
                                                        a.priority === 2 ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                        م{a.priority}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
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

// ========== Settings Modal ==========
interface StaffMember {
    id: number
    name: string
    role: string
    role_label: string
    secondary_role: string | null
    standby_enabled: boolean
    is_teacher: boolean
}

function StandbySettingsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
    const toast = useToast()
    const [searchTerm, setSearchTerm] = useState('')

    // جلب قائمة الموظفين
    const { data: staffData, isLoading, refetch } = useQuery({
        queryKey: ['eligible-staff'],
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/teacher-standby/eligible-staff')
            return data.success ? data.data : []
        },
    })

    // تبديل حالة الانتظار
    const toggleMutation = useMutation({
        mutationFn: async (userId: number) => {
            const { data } = await apiClient.post(`/admin/teacher-standby/toggle-standby/${userId}`)
            if (!data.success) throw new Error(data.message)
            return data
        },
        onSuccess: (data) => {
            toast({ type: 'success', title: data.message })
            refetch()
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        },
    })

    const staff: StaffMember[] = staffData ?? []

    // فلترة غير المعلمين فقط (المعلمين موجودين بالفعل في الجدول)
    const nonTeacherStaff = staff.filter(s => !s.is_teacher)

    // فلترة حسب البحث
    const filteredStaff = nonTeacherStaff.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // الموظفين المفعل لهم (غير المعلمين الذين أضفناهم يدوياً)
    const enabledStaff = staff.filter(s => s.standby_enabled && !s.is_teacher)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* Header */}
                <div className="border-b border-slate-200 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">⚙️ إعدادات الانتظار</h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-muted mt-1">
                        إضافة موظفين لجدول الانتظار
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Enabled Staff */}
                    {enabledStaff.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">✅ المفعل لهم الانتظار</h3>
                            <div className="flex flex-wrap gap-2">
                                {enabledStaff.map(s => (
                                    <span
                                        key={s.id}
                                        className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm"
                                    >
                                        {s.name}
                                        <button
                                            onClick={() => toggleMutation.mutate(s.id)}
                                            className="hover:text-red-600"
                                            title="إزالة"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="🔍 ابحث عن موظف..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Staff List */}
                    {isLoading ? (
                        <div className="py-8 text-center text-muted">جاري التحميل...</div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="py-8 text-center text-muted">
                            {searchTerm ? 'لا توجد نتائج' : 'لا يوجد موظفين'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredStaff.map(s => (
                                <div
                                    key={s.id}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition ${s.standby_enabled
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div>
                                        <span className="font-medium text-slate-900">{s.name}</span>
                                        <span className="text-xs text-muted mr-2">({s.role_label || s.role})</span>
                                    </div>
                                    <button
                                        onClick={() => toggleMutation.mutate(s.id)}
                                        disabled={toggleMutation.isPending}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${s.standby_enabled
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                            }`}
                                    >
                                        {s.standby_enabled ? 'إزالة' : 'إضافة'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        إغلاق
                    </button>
                    <button
                        onClick={onSave}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                        حفظ وإعادة حساب
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AdminTeacherStandbyPage

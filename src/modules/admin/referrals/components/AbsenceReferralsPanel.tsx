import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'

// أنواع البيانات
export interface AbsenceReferral {
    id: number
    school_id: number
    student_id: number
    referral_id: number | null
    absence_type: 'consecutive' | 'repeated'
    total_absence_days: number
    consecutive_days: number | null
    absence_start_date: string
    last_absence_date: string
    action_level: '3days' | '5days' | '10days'
    counselor_notified: boolean
    counselor_notified_at: string | null
    learning_plan_created: boolean
    learning_plan_created_at: string | null
    protection_center_notified: boolean
    protection_center_notified_at: string | null
    parent_summoned: boolean
    parent_summoned_at: string | null
    commitment_taken: boolean
    commitment_taken_at: string | null
    committee_referred: boolean
    committee_referred_at: string | null
    reported_to_1919: boolean
    reported_to_1919_at: string | null
    education_dept_notified: boolean
    education_dept_notified_at: string | null
    status: 'active' | 'resolved' | 'escalated'
    notes: string | null
    created_at: string
    student?: {
        id: number
        name: string
        grade?: string
        class_name?: string
    }
    referral?: {
        id: number
        referral_number: string
        status: string
    }
    absence_type_label?: string
    action_level_label?: string
    status_label?: string
    requires_protection_center?: boolean
    next_action_required?: string | null
    actions_progress?: number
}

export interface AbsenceReferralStats {
    consecutive: {
        total: number
        '3days': number
        '5days': number
        '10days': number
    }
    repeated: {
        total: number
        '3days': number
        '5days': number
        '10days': number
    }
    requiring_action: number
}

export interface ViolationStudent {
    student_id: number
    student_name: string
    grade: string
    class_name: string
    violation_count: number
    last_violation_date: string
}

export interface LateStudent {
    student_id: number
    student_name: string
    grade: string
    class_name: string
    late_count: number
    last_late_date: string
    action_level: 'warning' | 'parent_summon' | 'committee'
}

// تبويب فرعي
type SystemSubTab = 'consecutive' | 'repeated' | 'violations' | 'lateness'

const SUB_TABS: { key: SystemSubTab; label: string; icon: string; description: string }[] = [
    {
        key: 'consecutive',
        label: 'غياب متواصل',
        icon: 'bi-calendar-range',
        description: 'طلاب غابوا 3 أيام أو أكثر متتالية - يتطلب مخاطبة مركز حماية الطفل'
    },
    {
        key: 'repeated',
        label: 'غياب متكرر',
        icon: 'bi-calendar3',
        description: 'طلاب تجاوز إجمالي غيابهم 3 أيام (متصلة أو منفصلة)'
    },
    {
        key: 'lateness',
        label: 'الأكثر تأخراً',
        icon: 'bi-clock-history',
        description: 'طلاب تأخروا 5 مرات أو أكثر في الفصل الدراسي - يتطلب إحالة للموجه الطلابي'
    },
    {
        key: 'violations',
        label: 'الأكثر مخالفة',
        icon: 'bi-exclamation-triangle',
        description: 'طلاب لديهم أكثر من 3 مخالفات سلوكية'
    },
]

const ACTION_LEVEL_STYLES = {
    '3days': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    '5days': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
    '10days': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
}

// Hooks
export function useAbsenceReferralsQuery(filters: { absence_type?: string; status?: string; action_level?: string; page?: number; per_page?: number }) {
    return useQuery({
        queryKey: ['absence-referrals', filters],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters.absence_type) params.append('absence_type', filters.absence_type)
            if (filters.status) params.append('status', filters.status)
            if (filters.action_level) params.append('action_level', filters.action_level)
            if (filters.page) params.append('page', String(filters.page))
            if (filters.per_page) params.append('per_page', String(filters.per_page))

            const { data } = await apiClient.get<{ items: AbsenceReferral[]; meta: { total: number; current_page: number; last_page: number; per_page: number } }>(`/admin/absence-referrals?${params.toString()}`)
            return data
        },
    })
}

export function useAbsenceReferralStatsQuery() {
    return useQuery({
        queryKey: ['absence-referral-stats'],
        queryFn: async () => {
            const { data } = await apiClient.get<AbsenceReferralStats>('/admin/absence-referrals/stats')
            return data
        },
    })
}

export function useViolationStudentsQuery(page: number = 1) {
    return useQuery({
        queryKey: ['violation-students', page],
        queryFn: async () => {
            const { data } = await apiClient.get<{ items: ViolationStudent[]; meta: { total: number; current_page: number; last_page: number } }>(`/admin/behavior/most-violated?min_violations=3&page=${page}&per_page=15`)
            return data
        },
    })
}

export function useLateStudentsQuery(page: number = 1) {
    return useQuery({
        queryKey: ['late-students', page],
        queryFn: async () => {
            const { data } = await apiClient.get<{ items: LateStudent[]; meta: { total: number; current_page: number; last_page: number } }>(`/admin/behavior/most-late?min_late=5&page=${page}&per_page=15`)
            return data
        },
    })
}

export function useUpdateAbsenceActionMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, action, notes }: { id: number; action: string; notes?: string }) => {
            const { data } = await apiClient.post(`/admin/absence-referrals/${id}/action`, { action, notes })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absence-referrals'] })
            queryClient.invalidateQueries({ queryKey: ['absence-referral-stats'] })
        },
    })
}

export function useProcessAbsencesMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post('/admin/absence-referrals/process')
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['absence-referrals'] })
            queryClient.invalidateQueries({ queryKey: ['absence-referral-stats'] })
        },
    })
}

// Pagination Component
function Pagination({ currentPage, lastPage, onPageChange }: { currentPage: number; lastPage: number; onPageChange: (page: number) => void }) {
    if (lastPage <= 1) return null

    const pages: (number | string)[] = []
    for (let i = 1; i <= lastPage; i++) {
        if (i === 1 || i === lastPage || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pages.push(i)
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...')
        }
    }

    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <i className="bi bi-chevron-right" />
            </button>
            {pages.map((page, idx) => (
                typeof page === 'number' ? (
                    <button
                        key={idx}
                        onClick={() => onPageChange(page)}
                        className={`px-3 py-1.5 text-sm rounded ${currentPage === page ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={idx} className="px-2 text-slate-400">...</span>
                )
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === lastPage}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <i className="bi bi-chevron-left" />
            </button>
        </div>
    )
}

// المكوّن الرئيسي
export function AbsenceReferralsPanel() {
    const navigate = useNavigate()
    const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>('consecutive')
    const [selectedReferral, setSelectedReferral] = useState<AbsenceReferral | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    const { data: stats } = useAbsenceReferralStatsQuery()
    const { data: referrals, isLoading } = useAbsenceReferralsQuery({
        absence_type: (activeSubTab === 'violations' || activeSubTab === 'lateness') ? undefined : activeSubTab,
        status: 'active',
        page: currentPage,
        per_page: 15
    })
    const { data: violationStudents, isLoading: isLoadingViolations } = useViolationStudentsQuery(currentPage)
    const { data: lateStudents, isLoading: isLoadingLate } = useLateStudentsQuery(currentPage)
    const processAbsences = useProcessAbsencesMutation()
    const updateAction = useUpdateAbsenceActionMutation()

    // الانتقال لصفحة تفاصيل الإحالة
    const handleNavigateToReferral = (referralId: number) => {
        navigate(`/admin/referrals/${referralId}`)
    }

    const handleTabChange = (tab: SystemSubTab) => {
        setActiveSubTab(tab)
        setCurrentPage(1)
    }

    const handleProcessNow = async () => {
        try {
            await processAbsences.mutateAsync()
            alert('تم فحص سجلات الغياب بنجاح')
        } catch {
            alert('حدث خطأ أثناء الفحص')
        }
    }

    const handleAction = async (referralId: number, action: string) => {
        try {
            await updateAction.mutateAsync({ id: referralId, action })
        } catch {
            alert('حدث خطأ أثناء تحديث الإجراء')
        }
    }

    return (
        <div className="space-y-4">
            {/* Header مع زر الفحص */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                        {stats?.requiring_action || 0} حالة تتطلب إجراء
                    </span>
                </div>
                {(activeSubTab === 'consecutive' || activeSubTab === 'repeated') && (
                    <button
                        onClick={handleProcessNow}
                        disabled={processAbsences.isPending}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200 disabled:opacity-50"
                    >
                        <i className={`bi ${processAbsences.isPending ? 'bi-arrow-clockwise animate-spin' : 'bi-arrow-repeat'}`} />
                        فحص الغياب الآن
                    </button>
                )}
            </div>

            {/* التبويبات الفرعية */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                {SUB_TABS.map((tab) => {
                    let count = 0
                    if (tab.key === 'consecutive') count = stats?.consecutive?.total || 0
                    else if (tab.key === 'repeated') count = stats?.repeated?.total || 0
                    else if (tab.key === 'violations') count = violationStudents?.meta?.total || 0
                    else if (tab.key === 'lateness') count = lateStudents?.meta?.total || 0

                    const isActive = activeSubTab === tab.key

                    const badgeColor =
                        tab.key === 'consecutive' ? 'bg-red-500 text-white' :
                            tab.key === 'lateness' ? 'bg-amber-500 text-white' :
                                tab.key === 'violations' ? 'bg-purple-500 text-white' :
                                    'bg-yellow-500 text-white'

                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all
                                ${isActive
                                    ? 'bg-white border border-b-0 border-slate-200 text-slate-900'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }
                            `}
                        >
                            <i className={tab.icon} />
                            <span>{tab.label}</span>
                            {count > 0 && (
                                <span className={`
                                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                                    ${badgeColor}
                                `}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* وصف التبويب */}
            <div className={`p-3 rounded-lg ${activeSubTab === 'consecutive' ? 'bg-red-50 border border-red-200' :
                activeSubTab === 'violations' ? 'bg-purple-50 border border-purple-200' :
                    'bg-yellow-50 border border-yellow-200'
                }`}>
                <p className="text-sm">
                    <i className={`${SUB_TABS.find(t => t.key === activeSubTab)?.icon} me-2`} />
                    {SUB_TABS.find(t => t.key === activeSubTab)?.description}
                </p>
                {activeSubTab === 'consecutive' && (
                    <p className="text-xs text-red-600 mt-1">
                        <i className="bi bi-exclamation-triangle-fill me-1" />
                        يتطلب مخاطبة مركز حماية الطفل وفقاً للدليل الإجرائي
                    </p>
                )}
            </div>

            {/* محتوى التبويب */}
            {activeSubTab === 'violations' ? (
                <ViolationsTable
                    data={violationStudents}
                    isLoading={isLoadingViolations}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            ) : activeSubTab === 'lateness' ? (
                <LatenessTable
                    data={lateStudents}
                    isLoading={isLoadingLate}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            ) : (
                <AbsenceTable
                    data={referrals}
                    isLoading={isLoading}
                    activeSubTab={activeSubTab as 'consecutive' | 'repeated'}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onSelectReferral={setSelectedReferral}
                    onNavigateToReferral={handleNavigateToReferral}
                />
            )}

            {/* Modal التفاصيل */}
            {selectedReferral && (
                <AbsenceDetailModal
                    referral={selectedReferral}
                    onClose={() => setSelectedReferral(null)}
                    onAction={handleAction}
                />
            )}
        </div>
    )
}

// جدول الغياب
function AbsenceTable({
    data,
    isLoading,
    activeSubTab,
    currentPage,
    onPageChange,
    onSelectReferral,
    onNavigateToReferral
}: {
    data: { items: AbsenceReferral[]; meta: { total: number; current_page: number; last_page: number; per_page: number } } | undefined
    isLoading: boolean
    activeSubTab: 'consecutive' | 'repeated'
    currentPage: number
    onPageChange: (page: number) => void
    onSelectReferral: (r: AbsenceReferral) => void
    onNavigateToReferral: (referralId: number) => void
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            </div>
        )
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <i className={`${activeSubTab === 'consecutive' ? 'bi-calendar-range' : 'bi-calendar3'} text-4xl text-slate-300`} />
                <p className="mt-4 text-slate-600">
                    لا توجد حالات {activeSubTab === 'consecutive' ? 'غياب متواصل' : 'غياب متكرر'} نشطة
                </p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الطالب</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">أيام الغياب</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">المستوى</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الإجراء التالي</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">التقدم</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.items.map((item) => {
                            const levelStyle = ACTION_LEVEL_STYLES[item.action_level]

                            return (
                                <tr
                                    key={item.id}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => item.referral_id && onNavigateToReferral(item.referral_id)}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-900">{item.student?.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {item.student?.grade} / {item.student?.class_name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-slate-900">
                                                {item.total_absence_days}
                                            </span>
                                            <span className="text-xs text-slate-500">يوم</span>
                                            {item.absence_type === 'consecutive' && item.consecutive_days && (
                                                <span className="text-xs text-red-600">
                                                    ({item.consecutive_days} متواصلة)
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${levelStyle.bg} ${levelStyle.text}`}>
                                            {item.action_level === '3days' && '3 أيام'}
                                            {item.action_level === '5days' && '5 أيام'}
                                            {item.action_level === '10days' && '10 أيام'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.next_action_required ? (
                                            <span className="text-sm text-orange-600 font-medium">
                                                <i className="bi bi-arrow-right-circle me-1" />
                                                {item.next_action_required}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-green-600">
                                                <i className="bi bi-check-circle-fill me-1" />
                                                مكتمل
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-20">
                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all"
                                                    style={{ width: `${item.actions_progress || 0}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{item.actions_progress || 0}%</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onSelectReferral(item); }}
                                            className="text-xs text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50"
                                        >
                                            <i className="bi bi-eye me-1" />
                                            التفاصيل
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} lastPage={data.meta.last_page} onPageChange={onPageChange} />
        </>
    )
}

// جدول المخالفات
function ViolationsTable({
    data,
    isLoading,
    currentPage,
    onPageChange
}: {
    data: { items: ViolationStudent[]; meta: { total: number; current_page: number; last_page: number } } | undefined
    isLoading: boolean
    currentPage: number
    onPageChange: (page: number) => void
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
        )
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <i className="bi-exclamation-triangle text-4xl text-slate-300" />
                <p className="mt-4 text-slate-600">لا توجد طلاب لديهم أكثر من 3 مخالفات</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">#</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الطالب</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الصف / الفصل</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">عدد المخالفات</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">آخر مخالفة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.items.map((item, idx) => (
                            <tr key={item.student_id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-500">
                                    {(currentPage - 1) * 15 + idx + 1}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-slate-900">{item.student_name}</p>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    {item.grade} / {item.class_name}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${item.violation_count >= 10 ? 'bg-red-100 text-red-800' :
                                        item.violation_count >= 5 ? 'bg-orange-100 text-orange-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                        <i className="bi bi-exclamation-triangle-fill" />
                                        {item.violation_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    {item.last_violation_date ? new Date(item.last_violation_date).toLocaleDateString('ar-SA') : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} lastPage={data.meta.last_page} onPageChange={onPageChange} />
        </>
    )
}

// جدول التأخر
function LatenessTable({
    data,
    isLoading,
    currentPage,
    onPageChange
}: {
    data: { items: LateStudent[]; meta: { total: number; current_page: number; last_page: number } } | undefined
    isLoading: boolean
    currentPage: number
    onPageChange: (page: number) => void
}) {
    const ACTION_LEVEL_LABELS = {
        warning: { label: 'إحالة للموجه', bg: 'bg-yellow-100', text: 'text-yellow-800' },
        parent_summon: { label: 'استدعاء ولي أمر', bg: 'bg-orange-100', text: 'text-orange-800' },
        committee: { label: 'لجنة التوجيه', bg: 'bg-red-100', text: 'text-red-800' },
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
            </div>
        )
    }

    if (!data || data.items.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <i className="bi-clock-history text-4xl text-slate-300" />
                <p className="mt-4 text-slate-600">لا توجد طلاب لديهم 5 تأخرات أو أكثر</p>
            </div>
        )
    }

    return (
        <>
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">#</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الطالب</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الصف / الفصل</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">عدد التأخرات</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الإجراء المطلوب</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">آخر تأخر</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.items.map((item, idx) => {
                            const actionStyle = ACTION_LEVEL_LABELS[item.action_level]
                            return (
                                <tr key={item.student_id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {(currentPage - 1) * 15 + idx + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-slate-900">{item.student_name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {item.grade} / {item.class_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${item.late_count >= 15 ? 'bg-red-100 text-red-800' :
                                            item.late_count >= 10 ? 'bg-orange-100 text-orange-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                            <i className="bi bi-clock-fill" />
                                            {item.late_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${actionStyle.bg} ${actionStyle.text}`}>
                                            {actionStyle.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {item.last_late_date ? new Date(item.last_late_date).toLocaleDateString('ar-SA') : '-'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} lastPage={data.meta.last_page} onPageChange={onPageChange} />
        </>
    )
}

// Modal التفاصيل
function AbsenceDetailModal({
    referral,
    onClose,
    onAction,
}: {
    referral: AbsenceReferral
    onClose: () => void
    onAction: (id: number, action: string) => void
}) {
    const actions = [
        { key: 'counselor_notified', label: 'إحالة للموجه الطلابي', done: referral.counselor_notified, at: referral.counselor_notified_at },
        { key: 'learning_plan_created', label: 'وضع خطة تعلم', done: referral.learning_plan_created, at: referral.learning_plan_created_at },
        ...(referral.requires_protection_center ? [
            { key: 'protection_center_notified', label: 'مخاطبة مركز حماية الطفل', done: referral.protection_center_notified, at: referral.protection_center_notified_at, critical: true }
        ] : []),
        ...(referral.total_absence_days >= 5 ? [
            { key: 'parent_summoned', label: 'استدعاء ولي الأمر', done: referral.parent_summoned, at: referral.parent_summoned_at },
            { key: 'commitment_taken', label: 'أخذ تعهد خطي', done: referral.commitment_taken, at: referral.commitment_taken_at },
        ] : []),
        ...(referral.total_absence_days >= 10 ? [
            { key: 'reported_to_1919', label: 'رفع بلاغ لـ 1919', done: referral.reported_to_1919, at: referral.reported_to_1919_at, critical: true },
            { key: 'education_dept_notified', label: 'إشعار إدارة التعليم', done: referral.education_dept_notified, at: referral.education_dept_notified_at },
        ] : []),
    ]

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{referral.student?.name}</h2>
                            <p className="text-sm text-slate-500">
                                {referral.student?.grade} / {referral.student?.class_name}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <i className="bi bi-x-lg text-xl" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* معلومات الغياب */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-500">نوع الغياب</p>
                            <p className="text-lg font-bold text-slate-900">
                                {referral.absence_type === 'consecutive' ? 'متواصل' : 'متكرر'}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-500">إجمالي أيام الغياب</p>
                            <p className="text-lg font-bold text-slate-900">{referral.total_absence_days} يوم</p>
                        </div>
                        {referral.absence_type === 'consecutive' && (
                            <>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs text-slate-500">من تاريخ</p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {new Date(referral.absence_start_date).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <p className="text-xs text-slate-500">إلى تاريخ</p>
                                    <p className="text-sm font-medium text-slate-900">
                                        {new Date(referral.last_absence_date).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* قائمة الإجراءات */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">الإجراءات المطلوبة</h3>
                        <div className="space-y-2">
                            {actions.map((action) => (
                                <div
                                    key={action.key}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${action.done
                                        ? 'bg-green-50 border-green-200'
                                        : action.critical
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${action.done ? 'bg-green-500' : 'bg-slate-300'
                                            }`}>
                                            <i className={`bi ${action.done ? 'bi-check' : 'bi-circle'} text-white text-sm`} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${action.critical && !action.done ? 'text-red-700' : 'text-slate-900'}`}>
                                                {action.label}
                                                {action.critical && !action.done && (
                                                    <span className="ms-2 text-xs text-red-500">
                                                        <i className="bi bi-exclamation-triangle-fill me-1" />
                                                        مطلوب
                                                    </span>
                                                )}
                                            </p>
                                            {action.done && action.at && (
                                                <p className="text-xs text-slate-500">
                                                    تم في {new Date(action.at).toLocaleDateString('ar-SA')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {!action.done && (
                                        <button
                                            onClick={() => onAction(referral.id, action.key)}
                                            className="text-xs text-sky-600 hover:text-sky-800 px-3 py-1.5 rounded-lg hover:bg-sky-50 border border-sky-200"
                                        >
                                            تم التنفيذ
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { useState, type FormEvent } from 'react'
import {
    ClipboardCheck,
    Megaphone,
    Star,
    UserCheck,
    Clock,
    X,
    CheckCircle,
    AlertCircle,
    ChevronDown,
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import {
    useGuardianLeaveRequestSubmissionMutation,
    useGuardianLeaveRequestsQuery,
    useGuardianBehaviorQuery,
} from '../hooks'

interface ServiceItem {
    id: string
    title: string
    description: string
    icon: typeof ClipboardCheck
    color: string
    bgColor: string
}

const SERVICES: ServiceItem[] = [
    {
        id: 'leave-request',
        title: 'طلب استئذان',
        description: 'تقديم طلب استئذان للطالب',
        icon: ClipboardCheck,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
    },
    {
        id: 'auto-call',
        title: 'النداء الآلي',
        description: 'طلب مناداة فورية للطالب',
        icon: Megaphone,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
    },
    {
        id: 'points',
        title: 'النقاط',
        description: 'عرض رصيد النقاط والمعاملات',
        icon: Star,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
    },
    {
        id: 'behavior',
        title: 'السلوك',
        description: 'متابعة سجل السلوك',
        icon: UserCheck,
        color: 'text-sky-600',
        bgColor: 'bg-sky-100',
    },
    {
        id: 'attendance',
        title: 'المواظبة',
        description: 'سجل الحضور والغياب',
        icon: Clock,
        color: 'text-rose-600',
        bgColor: 'bg-rose-100',
    },
]

type ServiceSheetType = 'leave-request' | 'auto-call' | 'points' | 'behavior' | 'attendance' | null

export function GuardianServicesPage() {
    const [activeSheet, setActiveSheet] = useState<ServiceSheetType>(null)

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">الخدمات</h2>
                <p className="mt-1 text-sm text-slate-500">اختر الخدمة المطلوبة</p>
            </div>

            <div className="space-y-3">
                {SERVICES.map((service) => {
                    const Icon = service.icon
                    return (
                        <button
                            key={service.id}
                            type="button"
                            onClick={() => setActiveSheet(service.id as ServiceSheetType)}
                            className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${service.bgColor}`}>
                                <Icon className={`h-6 w-6 ${service.color}`} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-900">{service.title}</p>
                                <p className="text-sm text-slate-500">{service.description}</p>
                            </div>
                            <i className="bi bi-chevron-left text-slate-300" />
                        </button>
                    )
                })}
            </div>

            {/* Bottom Sheets */}
            <LeaveRequestSheet isOpen={activeSheet === 'leave-request'} onClose={() => setActiveSheet(null)} />
            <AutoCallSheet isOpen={activeSheet === 'auto-call'} onClose={() => setActiveSheet(null)} />
            <PointsSheet isOpen={activeSheet === 'points'} onClose={() => setActiveSheet(null)} />
            <BehaviorSheet isOpen={activeSheet === 'behavior'} onClose={() => setActiveSheet(null)} />
            <AttendanceSheet isOpen={activeSheet === 'attendance'} onClose={() => setActiveSheet(null)} />
        </div>
    )
}

// ============ Leave Request Sheet ============
function LeaveRequestSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { currentNationalId, studentSummary } = useGuardianContext()
    const submitMutation = useGuardianLeaveRequestSubmissionMutation()
    const requestsQuery = useGuardianLeaveRequestsQuery(currentNationalId)

    const [formValues, setFormValues] = useState({
        guardian_name: studentSummary?.parent_name ?? '',
        guardian_phone: studentSummary?.parent_phone ?? '',
        reason: '',
        pickup_person_name: '',
        expected_pickup_time: '',
    })

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!currentNationalId) return

        await submitMutation.mutateAsync({
            national_id: currentNationalId,
            guardian_name: formValues.guardian_name.trim(),
            guardian_phone: formValues.guardian_phone.trim(),
            reason: formValues.reason.trim(),
            pickup_person_name: formValues.pickup_person_name.trim(),
            pickup_person_relation: null,
            pickup_person_phone: null,
            expected_pickup_time: formValues.expected_pickup_time,
        })

        setFormValues(prev => ({ ...prev, reason: '', pickup_person_name: '', expected_pickup_time: '' }))
        onClose()
    }

    if (!isOpen) return null

    return (
        <BottomSheet title="طلب استئذان" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">سبب الاستئذان *</label>
                    <textarea
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        rows={3}
                        value={formValues.reason}
                        onChange={(e) => setFormValues(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="مثال: موعد طبي"
                        required
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">اسم المستلم *</label>
                    <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={formValues.pickup_person_name}
                        onChange={(e) => setFormValues(prev => ({ ...prev, pickup_person_name: e.target.value }))}
                        required
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">موعد الانصراف *</label>
                    <input
                        type="datetime-local"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={formValues.expected_pickup_time}
                        onChange={(e) => setFormValues(prev => ({ ...prev, expected_pickup_time: e.target.value }))}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                    {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
            </form>

            {requestsQuery.data && requestsQuery.data.length > 0 && (
                <div className="mt-6">
                    <h4 className="mb-3 text-sm font-bold text-slate-700">الطلبات السابقة</h4>
                    <div className="space-y-2">
                        {requestsQuery.data.slice(0, 3).map((req) => (
                            <div key={req.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                <span className="text-sm text-slate-600">{req.reason}</span>
                                <StatusBadge status={req.status} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </BottomSheet>
    )
}

// ============ Auto Call Sheet ============
function AutoCallSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { studentSummary } = useGuardianContext()

    if (!isOpen) return null

    return (
        <BottomSheet title="النداء الآلي" onClose={onClose}>
            <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                    <Megaphone className="mx-auto mb-2 h-12 w-12 text-emerald-500" />
                    <p className="font-semibold text-emerald-700">طلب مناداة فورية</p>
                    <p className="mt-1 text-sm text-emerald-600">
                        سيتم عرض اسم الطالب على شاشة الاستقبال
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">الطالب: <strong>{studentSummary?.name}</strong></p>
                    <p className="text-sm text-slate-600">الصف: <strong>{studentSummary?.grade} - {studentSummary?.class_name}</strong></p>
                </div>

                <button
                    type="button"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                    طلب المناداة الآن
                </button>

                <p className="text-center text-xs text-slate-400">
                    * يجب أن تكون بالقرب من المدرسة لتفعيل هذه الخدمة
                </p>
            </div>
        </BottomSheet>
    )
}

// ============ Points Sheet ============
function PointsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { storeOverview } = useGuardianContext()
    const points = storeOverview?.points

    if (!isOpen) return null

    return (
        <BottomSheet title="النقاط" onClose={onClose}>
            <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-6 text-center text-white shadow-lg">
                    <Star className="mx-auto mb-2 h-10 w-10" />
                    <p className="text-4xl font-bold">{points?.total ?? 0}</p>
                    <p className="text-sm opacity-90">نقطة متاحة</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600">{points?.lifetime_rewards ?? 0}</p>
                        <p className="text-xs text-slate-500">مكتسبة</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-3 text-center">
                        <p className="text-lg font-bold text-rose-600">{points?.lifetime_violations ?? 0}</p>
                        <p className="text-xs text-slate-500">مخصومة</p>
                    </div>
                    <div className="rounded-xl bg-indigo-50 p-3 text-center">
                        <p className="text-lg font-bold text-indigo-600">{points?.lifetime_redemptions ?? 0}</p>
                        <p className="text-xs text-slate-500">مستبدلة</p>
                    </div>
                </div>

                <p className="text-center text-sm text-slate-500">
                    يمكنك استبدال النقاط من المتجر الإلكتروني
                </p>
            </div>
        </BottomSheet>
    )
}

// ============ Behavior Sheet ============
function BehaviorSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { currentNationalId } = useGuardianContext()
    const behaviorQuery = useGuardianBehaviorQuery(currentNationalId)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    if (!isOpen) return null

    const data = behaviorQuery.data
    const violations = data?.violations ?? []
    const isLoading = behaviorQuery.isLoading

    return (
        <BottomSheet title="سجل المخالفات السلوكية" onClose={onClose}>
            <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-700">{data?.total ?? 0}</p>
                        <p className="text-xs text-slate-500">إجمالي</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">{data?.pending ?? 0}</p>
                        <p className="text-xs text-slate-500">قيد المعالجة</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{data?.completed ?? 0}</p>
                        <p className="text-xs text-slate-500">مكتمل</p>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="py-8 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
                        <p className="mt-2 text-sm text-slate-500">جاري التحميل...</p>
                    </div>
                )}

                {/* Violations list */}
                {!isLoading && violations.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
                        <p className="mt-2 text-sm text-slate-500">لا توجد مخالفات مسجلة ✨</p>
                    </div>
                )}

                {!isLoading && violations.length > 0 && (
                    <div className="space-y-3">
                        {violations.map((v) => (
                            <div key={v.id} className="rounded-2xl border border-slate-200 bg-white">
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                                    className="flex w-full items-center gap-3 p-4 text-right"
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getDegreeColor(v.degree).bg}`}>
                                        <span className={`text-sm font-bold ${getDegreeColor(v.degree).text}`}>
                                            {v.degree}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900 line-clamp-2">{v.violation_type}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(v.status)}`}>
                                                {v.status_label}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(v.incident_date).toLocaleDateString('ar-SA')}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown className={`h-5 w-5 text-slate-400 transition ${expandedId === v.id ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Expanded details */}
                                {expandedId === v.id && (
                                    <div className="border-t border-slate-100 p-4 space-y-3">
                                        {/* Basic info */}
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-lg bg-slate-50 p-2">
                                                <span className="text-slate-500">الدرجة:</span>
                                                <span className="mr-1 font-semibold">{v.degree_label}</span>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 p-2">
                                                <span className="text-slate-500">الرقم:</span>
                                                <span className="mr-1 font-mono text-xs">{v.code}</span>
                                            </div>
                                        </div>

                                        {/* Violation Type in details */}
                                        <div className="text-sm rounded-lg bg-slate-50 p-3">
                                            <p className="font-semibold text-slate-700 mb-1">نوع المخالفة:</p>
                                            <p className="text-slate-600">{v.violation_type}</p>
                                        </div>

                                        {/* Location & Reporter */}
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                            {v.location && <span>📍 {v.location}</span>}
                                            <span>👤 {v.reported_by}</span>
                                            {v.incident_time && <span>🕐 {v.incident_time}</span>}
                                        </div>

                                        {/* Procedures progress */}
                                        {v.procedures_count > 0 && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-slate-700">الإجراءات المتخذة</span>
                                                    <span className="text-xs text-slate-500">
                                                        {v.procedures_completed}/{v.procedures_count}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-indigo-500 transition-all"
                                                        style={{ width: `${v.procedures_progress}%` }}
                                                    />
                                                </div>

                                                {/* Procedures list */}
                                                <div className="mt-3 space-y-2">
                                                    {v.procedures.map((proc, idx) => (
                                                        <div key={idx} className={`rounded-lg p-2 text-sm ${proc.completed ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                                                            <div className="flex items-center gap-2">
                                                                {proc.completed ? (
                                                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                                ) : (
                                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                                )}
                                                                <span className="font-medium">المرحلة {proc.repetition}</span>
                                                            </div>
                                                            {proc.tasks.length > 0 && (
                                                                <ul className="mt-1 mr-6 text-xs text-slate-500 space-y-0.5">
                                                                    {proc.tasks.map((task, tIdx) => (
                                                                        <li key={tIdx} className="flex items-center gap-1">
                                                                            {task.completed ? '✅' : '⏳'} {task.title}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </BottomSheet>
    )
}

// Helper functions for behavior colors
function getDegreeColor(degree: number): { bg: string; text: string } {
    const colors: Record<number, { bg: string; text: string }> = {
        1: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
        2: { bg: 'bg-orange-100', text: 'text-orange-700' },
        3: { bg: 'bg-red-100', text: 'text-red-700' },
        4: { bg: 'bg-rose-100', text: 'text-rose-700' },
        5: { bg: 'bg-rose-200', text: 'text-rose-800' },
    }
    return colors[degree] ?? { bg: 'bg-slate-100', text: 'text-slate-700' }
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        in_progress: 'bg-blue-100 text-blue-700',
        completed: 'bg-emerald-100 text-emerald-700',
        closed: 'bg-slate-100 text-slate-600',
    }
    return colors[status] ?? 'bg-slate-100 text-slate-600'
}

// ============ Attendance Sheet ============
function AttendanceSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null

    return (
        <BottomSheet title="المواظبة" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                        <UserCheck className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                        <p className="text-xl font-bold text-emerald-600">85</p>
                        <p className="text-xs text-slate-500">حضور</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-4 text-center">
                        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
                        <p className="text-xl font-bold text-rose-600">8</p>
                        <p className="text-xs text-slate-500">غياب</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4 text-center">
                        <Clock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                        <p className="text-xl font-bold text-amber-600">7</p>
                        <p className="text-xs text-slate-500">تأخر</p>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className="text-sm text-slate-500">سيتم عرض تفاصيل المواظبة قريباً</p>
                </div>
            </div>
        </BottomSheet>
    )
}

// ============ Reusable Bottom Sheet ============
function BottomSheet({
    title,
    children,
    onClose
}: {
    title: string
    children: React.ReactNode
    onClose: () => void
}) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center"
            onClick={onClose}
        >
            <div
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Handle for mobile */}
                <div className="flex justify-center py-3 sm:hidden">
                    <div className="h-1 w-12 rounded-full bg-slate-300" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-2 sm:pt-4">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    )
}

// ============ Status Badge ============
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-rose-100 text-rose-700',
        cancelled: 'bg-slate-100 text-slate-500',
    }

    const labels: Record<string, string> = {
        pending: 'معلق',
        approved: 'موافق',
        rejected: 'مرفوض',
        cancelled: 'ملغى',
    }

    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {labels[status] ?? status}
        </span>
    )
}

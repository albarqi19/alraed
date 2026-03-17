import { useState, useRef, useEffect, type FormEvent } from 'react'
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
    Upload,
    FileText,
    Trash2,
    Send,
    Bell,
    BookOpenCheck,
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import {
    useGuardianLeaveRequestSubmissionMutation,
    useGuardianLeaveRequestsQuery,
    useGuardianBehaviorQuery,
    useGuardianAbsencesQuery,
    useGuardianExcuseSubmissionMutation,
    useGuardianLessonPlansQuery,
} from '../hooks'
import type { GuardianAbsenceRecord, GuardianSubmitExcusePayload } from '../types'

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
    {
        id: 'lesson-plans',
        title: 'الخطط الأسبوعية',
        description: 'خطط الدروس المعتمدة',
        icon: BookOpenCheck,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
    },
]

type ServiceSheetType = 'leave-request' | 'auto-call' | 'points' | 'behavior' | 'attendance' | 'lesson-plans' | null

// ============ Animated Alert for Absence Excuses ============
function AbsenceExcuseAlert({
    count,
    onAction,
    onDismiss,
}: {
    count: number
    onAction: () => void
    onDismiss: () => void
}) {
    return (
        <div
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-lg"
            style={{
                animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            }}
        >
            {/* Animated Background Pulse */}
            <div
                className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-orange-100/50"
                style={{
                    animation: 'pulse 2s ease-in-out infinite',
                }}
            />

            {/* Content */}
            <div className="relative flex items-start gap-3">
                {/* Animated Bell Icon */}
                <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md"
                    style={{
                        animation: 'wiggle 1s ease-in-out infinite',
                    }}
                >
                    <Bell className="h-6 w-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-amber-900">
                        {count === 1 ? 'يوجد غياب يحتاج لتقديم عذر' : `يوجد ${count} أيام غياب تحتاج لتقديم عذر`}
                    </h4>
                    <p className="mt-1 text-sm text-amber-700">
                        يمكنك تقديم العذر مع المستندات المطلوبة قبل انتهاء المهلة
                    </p>

                    {/* Action Buttons */}
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onAction}
                            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 active:scale-95"
                            style={{
                                animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both',
                            }}
                        >
                            تقديم العذر الآن
                        </button>
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-white active:scale-95"
                        >
                            لاحقاً
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onDismiss}
                    className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full text-amber-400 transition hover:bg-amber-100 hover:text-amber-600"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes bounceIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.3) translateY(-20px);
                    }
                    50% {
                        transform: scale(1.05) translateY(0);
                    }
                    70% {
                        transform: scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes wiggle {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(-10deg);
                    }
                    75% {
                        transform: rotate(10deg);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 0.5;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
            `}</style>
        </div>
    )
}

export function GuardianServicesPage() {
    const [activeSheet, setActiveSheet] = useState<ServiceSheetType>(null)
    const { currentNationalId } = useGuardianContext()
    const absencesQuery = useGuardianAbsencesQuery(currentNationalId)
    const [showAlert, setShowAlert] = useState(false)
    const [alertDismissed, setAlertDismissed] = useState(false)

    const canSubmitCount = absencesQuery.data?.stats?.can_submit ?? 0

    // Show alert when there are absences needing excuses
    useEffect(() => {
        if (canSubmitCount > 0 && !alertDismissed) {
            // Small delay to make the animation more noticeable
            const timer = setTimeout(() => setShowAlert(true), 300)
            return () => clearTimeout(timer)
        }
    }, [canSubmitCount, alertDismissed])

    const handleAlertAction = () => {
        setActiveSheet('attendance')
        setShowAlert(false)
    }

    const handleDismissAlert = () => {
        setShowAlert(false)
        setAlertDismissed(true)
    }

    return (
        <div className="space-y-4">
            {/* Animated Alert for Pending Excuses */}
            {showAlert && canSubmitCount > 0 && (
                <AbsenceExcuseAlert
                    count={canSubmitCount}
                    onAction={handleAlertAction}
                    onDismiss={handleDismissAlert}
                />
            )}

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
            <LessonPlansSheet isOpen={activeSheet === 'lesson-plans'} onClose={() => setActiveSheet(null)} />
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

// ============ Attendance Sheet (with Excuse Submission) ============
function AttendanceSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { currentNationalId, studentSummary } = useGuardianContext()
    const absencesQuery = useGuardianAbsencesQuery(currentNationalId)
    const submitMutation = useGuardianExcuseSubmissionMutation()

    const [selectedAbsence, setSelectedAbsence] = useState<GuardianAbsenceRecord | null>(null)
    const [excuseFormOpen, setExcuseFormOpen] = useState(false)

    if (!isOpen) return null

    const data = absencesQuery.data
    const absences = data?.absences ?? []
    const stats = data?.stats
    const isLoading = absencesQuery.isLoading

    const handleOpenExcuseForm = (absence: GuardianAbsenceRecord) => {
        setSelectedAbsence(absence)
        setExcuseFormOpen(true)
    }

    const handleCloseExcuseForm = () => {
        setSelectedAbsence(null)
        setExcuseFormOpen(false)
    }

    return (
        <BottomSheet title="المواظبة - سجل الغياب" onClose={onClose}>
            <div className="space-y-4">
                {/* Stats Summary */}
                {stats && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-rose-50 p-3 text-center">
                            <p className="text-xl font-bold text-rose-600">{stats.total_absences}</p>
                            <p className="text-xs text-slate-500">أيام غياب</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3 text-center">
                            <p className="text-xl font-bold text-emerald-600">{stats.approved}</p>
                            <p className="text-xs text-slate-500">أعذار مقبولة</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 p-3 text-center">
                            <p className="text-xl font-bold text-amber-600">{stats.can_submit}</p>
                            <p className="text-xs text-slate-500">بانتظار العذر</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="py-8 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
                        <p className="mt-2 text-sm text-slate-500">جاري التحميل...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && absences.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
                        <p className="mt-2 text-sm text-slate-500">لا توجد أيام غياب مسجلة</p>
                    </div>
                )}

                {/* Absences List */}
                {!isLoading && absences.length > 0 && (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {absences.map((absence) => (
                            <AbsenceItem
                                key={absence.id}
                                absence={absence}
                                onSubmitExcuse={() => handleOpenExcuseForm(absence)}
                            />
                        ))}
                    </div>
                )}

                {/* Excuse Form Modal */}
                {excuseFormOpen && selectedAbsence && currentNationalId && (
                    <ExcuseFormModal
                        absence={selectedAbsence}
                        nationalId={currentNationalId}
                        parentName={studentSummary?.parent_name ?? ''}
                        onClose={handleCloseExcuseForm}
                        onSubmit={async (payload) => {
                            await submitMutation.mutateAsync(payload)
                            handleCloseExcuseForm()
                        }}
                        isSubmitting={submitMutation.isPending}
                    />
                )}
            </div>
        </BottomSheet>
    )
}

// ============ Absence Item Component ============
function AbsenceItem({
    absence,
    onSubmitExcuse
}: {
    absence: GuardianAbsenceRecord
    onSubmitExcuse: () => void
}) {
    const getStatusBadge = () => {
        if (!absence.excuse) {
            if (absence.can_submit_excuse) {
                return (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        بانتظار العذر ({absence.days_remaining} يوم)
                    </span>
                )
            }
            return (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    انتهت مدة التقديم
                </span>
            )
        }

        if (!absence.excuse.is_submitted) {
            return (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    بانتظار العذر
                </span>
            )
        }

        const statusStyles: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-emerald-100 text-emerald-700',
            rejected: 'bg-rose-100 text-rose-700',
        }

        return (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[absence.excuse.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {absence.excuse.status_label}
            </span>
        )
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800">{absence.date_formatted}</p>
                        <p className="text-xs text-slate-500">{absence.date_hijri || absence.date}</p>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            {/* Show excuse details if submitted */}
            {absence.excuse?.is_submitted && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="text-slate-600">{absence.excuse.excuse_text}</p>
                    {absence.excuse.has_file && (
                        <p className="mt-1 text-xs text-blue-600">📎 يوجد ملف مرفق</p>
                    )}
                    {absence.excuse.review_notes && (
                        <p className="mt-2 text-xs text-slate-500">
                            <strong>ملاحظات المراجع:</strong> {absence.excuse.review_notes}
                        </p>
                    )}
                </div>
            )}

            {/* Submit excuse button */}
            {absence.can_submit_excuse && (!absence.excuse || !absence.excuse.is_submitted) && (
                <button
                    type="button"
                    onClick={onSubmitExcuse}
                    className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                    تقديم عذر
                </button>
            )}
        </div>
    )
}

// ============ Excuse Form Modal ============
function ExcuseFormModal({
    absence,
    nationalId,
    parentName,
    onClose,
    onSubmit,
    isSubmitting,
}: {
    absence: GuardianAbsenceRecord
    nationalId: string
    parentName: string
    onClose: () => void
    onSubmit: (payload: GuardianSubmitExcusePayload) => Promise<void>
    isSubmitting: boolean
}) {
    const [excuseText, setExcuseText] = useState('')
    const [guardianName, setGuardianName] = useState(parentName)
    const [file, setFile] = useState<File | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
            if (!allowedTypes.includes(selectedFile.type)) {
                setErrors({ file: 'نوع الملف غير مدعوم (JPG, PNG, PDF فقط)' })
                return
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                setErrors({ file: 'حجم الملف كبير جداً (الحد الأقصى 5 ميجا)' })
                return
            }
            setFile(selectedFile)
            setErrors({})
        }
    }

    const removeFile = () => {
        setFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        const newErrors: Record<string, string> = {}
        if (excuseText.trim().length < 10) {
            newErrors.excuse_text = 'يرجى كتابة سبب الغياب بشكل أوضح (10 أحرف على الأقل)'
        }
        if (!file) {
            newErrors.file = 'يرجى رفع صورة أو مستند للعذر'
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        await onSubmit({
            national_id: nationalId,
            attendance_id: absence.id,
            excuse_text: excuseText.trim(),
            file: file!,
            parent_name: guardianName.trim() || undefined,
        })
    }

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                    <h3 className="text-lg font-bold text-slate-900">تقديم عذر غياب</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Absence Info */}
                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">تاريخ الغياب</p>
                        <p className="font-semibold text-slate-800">{absence.date_formatted}</p>
                        {absence.date_hijri && (
                            <p className="text-xs text-slate-500">{absence.date_hijri}</p>
                        )}
                        {absence.days_remaining > 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                                متبقي {absence.days_remaining} يوم لتقديم العذر
                            </p>
                        )}
                    </div>

                    {/* Parent Name (Optional) */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            اسم ولي الأمر <span className="text-slate-400">(اختياري)</span>
                        </label>
                        <input
                            type="text"
                            value={guardianName}
                            onChange={(e) => setGuardianName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="أدخل اسمك"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Excuse Text */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            سبب الغياب <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={excuseText}
                            onChange={(e) => setExcuseText(e.target.value)}
                            rows={4}
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none ${
                                errors.excuse_text ? 'border-red-300' : 'border-slate-200'
                            }`}
                            placeholder="اكتب سبب غياب الطالب بالتفصيل..."
                            disabled={isSubmitting}
                        />
                        {errors.excuse_text && (
                            <p className="mt-1 text-sm text-red-600">{errors.excuse_text}</p>
                        )}
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                            مرفق (صورة أو مستند) <span className="text-red-500">*</span>
                        </label>
                        <div className="mb-2 rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-700">
                            📎 يجب إرفاق صورة أو مستند يثبت سبب الغياب
                        </div>

                        {!file ? (
                            <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition ${
                                errors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                            }`}>
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Upload className="h-6 w-6 mb-1 text-slate-400" />
                                    <p className="text-sm text-slate-500">اضغط لرفع ملف</p>
                                    <p className="text-xs text-slate-400">JPG, PNG أو PDF (حد 5 ميجا)</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={handleFileChange}
                                    disabled={isSubmitting}
                                />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                                    disabled={isSubmitting}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {errors.file && (
                            <p className="mt-1 text-sm text-red-600">{errors.file}</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                جاري الإرسال...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                إرسال العذر
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
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

// ============ Lesson Plans Sheet ============

function LessonPlansSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { currentNationalId } = useGuardianContext()
    const [selectedWeekId, setSelectedWeekId] = useState<number | undefined>()
    const { data, isLoading } = useGuardianLessonPlansQuery(currentNationalId, selectedWeekId)

    if (!isOpen) return null

    const plans = data?.plans ?? []
    const weeks = data?.weeks ?? []
    const currentWeek = data?.week

    return (
        <BottomSheet title="الخطط الأسبوعية" onClose={onClose}>
            <div className="space-y-4">
                {/* Week Selector */}
                {weeks.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {weeks.map((week) => (
                            <button
                                key={week.id}
                                type="button"
                                onClick={() => setSelectedWeekId(week.id)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                    (selectedWeekId ?? currentWeek?.id) === week.id
                                        ? 'bg-cyan-600 text-white'
                                        : week.is_current
                                          ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
                                          : 'bg-white text-slate-600 ring-1 ring-slate-200'
                                }`}
                            >
                                أسبوع {week.week_number}
                            </button>
                        ))}
                    </div>
                )}

                {/* Student Info */}
                {data?.student && (
                    <div className="rounded-xl bg-cyan-50 p-3 text-center">
                        <p className="text-sm font-medium text-cyan-800">{data.student.name}</p>
                        <p className="text-xs text-cyan-600">{data.student.grade}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-500" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="py-8 text-center">
                        <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm text-slate-500">لا توجد خطط معتمدة لهذا الأسبوع</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {plans.map((plan) => (
                            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white">
                                {/* Subject Header */}
                                <div className="flex items-center gap-2 border-b px-4 py-3">
                                    <BookOpenCheck className="h-4 w-4 text-cyan-600" />
                                    <span className="text-sm font-bold text-slate-900">{plan.subject_name}</span>
                                    <span className="text-[10px] text-muted">({plan.teacher_name})</span>
                                </div>
                                {/* Sessions */}
                                <div className="divide-y divide-slate-100">
                                    {plan.sessions.map((session) => (
                                        <div key={session.session_number} className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700">
                                                    {session.session_number}
                                                </span>
                                                <span className="text-xs font-medium text-slate-800">
                                                    {session.topic}
                                                </span>
                                            </div>
                                            {session.lesson_title && (
                                                <p className="mt-1 mr-7 text-[11px] text-slate-600">
                                                    {session.lesson_title}
                                                </p>
                                            )}
                                            {session.objectives && (
                                                <p className="mt-0.5 mr-7 text-[11px] text-slate-500">
                                                    <span className="font-medium">الأهداف:</span> {session.objectives}
                                                </p>
                                            )}
                                            {session.homework && (
                                                <p className="mt-0.5 mr-7 text-[11px] text-cyan-700 font-medium">
                                                    الواجب: {session.homework}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </BottomSheet>
    )
}

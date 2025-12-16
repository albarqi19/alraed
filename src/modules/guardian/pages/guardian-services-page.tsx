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
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import {
    useGuardianLeaveRequestSubmissionMutation,
    useGuardianLeaveRequestsQuery,
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
    const { storeOverview } = useGuardianContext()
    const points = storeOverview?.points

    if (!isOpen) return null

    return (
        <BottomSheet title="السلوك" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                        <p className="text-2xl font-bold text-emerald-600">{points?.lifetime_rewards ?? 0}</p>
                        <p className="text-sm text-slate-500">سلوك إيجابي</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-4 text-center">
                        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
                        <p className="text-2xl font-bold text-rose-600">{points?.lifetime_violations ?? 0}</p>
                        <p className="text-sm text-slate-500">ملاحظات سلوكية</p>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-center">
                    <p className="text-sm text-slate-500">سيتم عرض تفاصيل السلوك قريباً</p>
                </div>
            </div>
        </BottomSheet>
    )
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

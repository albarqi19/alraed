import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import { StandbyStatsModal } from '../components/standby-stats-modal'
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CalendarDays,
  CalendarX,
  ClipboardList,
  FlaskConical,
  Save,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsField,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsSelect,
  WsSideCol,
  WsSwitch,
  WsTextarea,
  WsToolbar,
} from '@/shared/workspace'

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
    priority_4_count?: number
    priority_5_count?: number
    priority_6_count?: number
    priority_7_count?: number
    used_quota: number
}

interface WeeklySlot {
    id: number
    day: string
    period_number: number
    [key: `standby_${number}_id`]: number | null
    [key: `standby${number}`]: { id: number; name: string } | null
}

interface WeeklyScheduleData {
    schedule: Record<string, WeeklySlot[]>
    quotas: TeacherQuota[]
    settings: {
        max_periods_per_week: number
        standard_weekly_load: number
        periods_per_day: number
        max_standby_count: number
    }
}

// ألوان المنتظرين حسب الأولوية (درجات النظام الهادئة)
const STANDBY_TONES: Array<{ bg: string; bd: string; tx: string }> = [
    { bg: 'var(--ws-accent-soft)', bd: 'var(--ws-accent-2)', tx: 'var(--ws-accent)' }, // م1
    { bg: 'var(--ws-sky-bg)', bd: 'var(--ws-sky-bd)', tx: 'var(--ws-sky)' },           // م2
    { bg: 'var(--ws-surface-2)', bd: 'var(--ws-border)', tx: 'var(--ws-text-2)' },     // م3
    { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9' },                                    // م4
    { bg: 'var(--ws-amber-bg)', bd: 'var(--ws-amber-bd)', tx: 'var(--ws-amber)' },     // م5
    { bg: 'var(--ws-red-bg)', bd: 'var(--ws-red-bd)', tx: 'var(--ws-red)' },           // م6
    { bg: '#E4F5F5', bd: '#BCE4E4', tx: '#1D7A7A' },                                    // م7
]

function standbyTone(index: number) {
    return STANDBY_TONES[index] ?? STANDBY_TONES[2]
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

type ActiveTab = 'quotas' | 'weekly' | 'simulation' | 'preferences'

// ========== Main Component ==========
export function AdminTeacherStandbyPage() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<ActiveTab>('quotas')
    const [showBetaWarning, setShowBetaWarning] = useState(true)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showStatsModal, setShowStatsModal] = useState(false)

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
    const maxStandbyCount = settings?.max_standby_count ?? 3

    const hasQuotas = quotas.length > 0

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, message: '', onConfirm: () => { } })

    return (
        <WsPage>
            <WsHeader
                title="جدول الانتظار"
                badge={
                    <>
                        <Sparkles style={{ width: 11, height: 11 }} />
                        تجريبي
                    </>
                }
                actions={
                    <>
                        <WsBtn icon={BarChart3} onClick={() => setShowStatsModal(true)}>
                            الإحصائيات
                        </WsBtn>
                        <WsBtn icon={Settings} onClick={() => setShowSettingsModal(true)}>
                            الإعدادات
                        </WsBtn>
                        <WsBtn
                            icon={Calculator}
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    message: 'سيقوم النظام بإعادة حساب حصص الإسناد وتحديث البيانات. هل أنت متأكد من المتابعة؟',
                                    onConfirm: () => calculateMutation.mutate()
                                })
                            }}
                            disabled={calculateMutation.isPending}
                        >
                            {calculateMutation.isPending ? 'جارٍ الحساب...' : 'حساب الإسناد'}
                        </WsBtn>
                        <WsBtn
                            variant="primary"
                            icon={CalendarDays}
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    message: 'سيتم إنشاء جدول انتظار أسبوعي جديد وقد يتم استبدال البيانات الحالية. هل أنت متأكد من المتابعة؟',
                                    onConfirm: () => generateMutation.mutate()
                                })
                            }}
                            disabled={generateMutation.isPending || !hasQuotas}
                        >
                            {generateMutation.isPending ? 'جارٍ التوليد...' : 'توليد الجدول'}
                        </WsBtn>
                    </>
                }
                facts={
                    <>
                        <WsFact icon={ClipboardList} label="النصاب الكامل:">
                            {settings?.standard_weekly_load ?? '—'} حصة/أسبوع
                        </WsFact>
                        <WsFact icon={Users} label="معلمون لديهم إسناد:">
                            {quotas.length.toLocaleString('ar-SA-u-nu-latn')}
                        </WsFact>
                        <WsFact icon={CalendarDays} label="الحصص/اليوم:">
                            {settings?.periods_per_day ?? 7}
                        </WsFact>
                        <WsFact icon={UserRound} label="منتظرون لكل حصة:">
                            {maxStandbyCount}
                        </WsFact>
                    </>
                }
            />

            {/* تنبيه الميزة التجريبية — شريط قابل للإغلاق بدل المودال */}
            {showBetaWarning && (
                <WsAlert tone="warn">
                    <b>ميزة تجريبية:</b> هذه الميزة لا تزال قيد التطوير والاختبار، قد تواجه بعض الأخطاء غير المتوقعة.
                    <span style={{ marginInlineStart: 'auto' }}>
                        <WsIconBtn icon={X} label="إغلاق التنبيه" onClick={() => setShowBetaWarning(false)} />
                    </span>
                </WsAlert>
            )}

            <WsToolbar>
                <div className="ws-seg" style={{ alignSelf: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('quotas')}
                        className={`ws-seg__btn ${activeTab === 'quotas' ? 'is-active' : ''}`}
                    >
                        مدى الإسناد
                        <span className="ws-count">{quotas.length.toLocaleString('ar-SA-u-nu-latn')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('weekly')}
                        className={`ws-seg__btn ${activeTab === 'weekly' ? 'is-active' : ''}`}
                    >
                        الجدول الأسبوعي
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('simulation')}
                        className={`ws-seg__btn ${activeTab === 'simulation' ? 'is-active' : ''}`}
                    >
                        محاكاة الغياب
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preferences')}
                        className={`ws-seg__btn ${activeTab === 'preferences' ? 'is-active' : ''}`}
                    >
                        إعدادات المعلمين
                    </button>
                </div>

                {/* مفتاح ألوان الأولويات */}
                {(activeTab === 'weekly' || activeTab === 'quotas') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', alignSelf: 'flex-end', paddingBottom: 4 }}>
                        {Array.from({ length: maxStandbyCount }, (_, i) => {
                            const tone = standbyTone(i)
                            return (
                                <span
                                    key={i}
                                    className="ws-chip"
                                    style={{ background: tone.bg, borderColor: tone.bd, color: tone.tx }}
                                >
                                    م{i + 1}
                                </span>
                            )
                        })}
                    </span>
                )}
            </WsToolbar>

            <WsLayout>
                {isLoading ? (
                    <WsMain>
                        <WsBlock fill>
                            <WsEmpty loading>جاري تحميل بيانات الانتظار...</WsEmpty>
                        </WsBlock>
                    </WsMain>
                ) : activeTab === 'quotas' ? (
                    <WsMain>
                        <QuotasTab quotas={quotas} maxStandbyCount={maxStandbyCount} />
                    </WsMain>
                ) : activeTab === 'weekly' ? (
                    <WsMain>
                        <WeeklyTab schedule={schedule} periodsPerDay={settings?.periods_per_day ?? 7} maxStandbyCount={maxStandbyCount} />
                    </WsMain>
                ) : activeTab === 'simulation' ? (
                    <SimulationTab schedule={schedule} periodsPerDay={settings?.periods_per_day ?? 7} quotas={quotas} maxStandbyCount={maxStandbyCount} />
                ) : (
                    <PreferencesTab quotas={quotas} maxStandbyCount={maxStandbyCount} />
                )}
            </WsLayout>

            {/* نافذة التأكيد */}
            <WsModal
                open={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title="تأكيد الإجراء"
                footer={
                    <>
                        <WsBtn onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>إلغاء</WsBtn>
                        <WsBtn
                            variant="primary"
                            onClick={() => {
                                confirmModal.onConfirm()
                                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                            }}
                        >
                            نعم، متأكد
                        </WsBtn>
                    </>
                }
            >
                <WsAlert tone="warn" boxed>
                    {confirmModal.message}
                </WsAlert>
            </WsModal>

            {/* Settings Modal */}
            {showSettingsModal && (
                <StandbySettingsModal
                    currentMaxCount={maxStandbyCount}
                    onClose={() => setShowSettingsModal(false)}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
                        setShowSettingsModal(false)
                    }}
                />
            )}

            {/* Statistics Modal */}
            <StandbyStatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
            />
        </WsPage>
    )
}

// ========== Sub Components ==========

function QuotasTab({ quotas, maxStandbyCount }: { quotas: TeacherQuota[]; maxStandbyCount: number }) {
    return (
        <WsBlock
            title="مدى الإسناد"
            icon={Calculator}
            count={quotas.length.toLocaleString('ar-SA-u-nu-latn')}
            tools={
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    مرتبون من الأقل نصاباً (أكثر إسناداً) إلى الأكثر نصاباً
                </span>
            }
            fill
        >
            {quotas.length === 0 ? (
                <WsEmpty icon={Calculator}>
                    لم يتم حساب مدى الإسناد بعد.
                    <span style={{ fontSize: 11 }}>اضغط على زر «حساب الإسناد» بالأعلى لحساب مدى الإسناد لكل معلم.</span>
                </WsEmpty>
            ) : (
                <div className="ws-tablewrap">
                    <table className="ws-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>المعلم</th>
                                <th style={{ textAlign: 'center' }}>نصابه</th>
                                <th style={{ textAlign: 'center' }}>إسناده</th>
                                {Array.from({ length: maxStandbyCount }, (_, i) => {
                                    const tone = standbyTone(i)
                                    return (
                                        <th key={i} style={{ textAlign: 'center', color: tone.tx }}>
                                            م{i + 1}
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {quotas.map((quota, index) => (
                                <tr key={quota.id}>
                                    <td style={{ color: 'var(--ws-text-2)' }}>{index + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{quota.teacher?.name}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <WsChip tone="sky">{quota.current_load} حصة</WsChip>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <WsChip tone={quota.standby_quota > 4 ? 'green' : quota.standby_quota > 2 ? 'amber' : undefined}>
                                            {quota.standby_quota} حصص
                                        </WsChip>
                                    </td>
                                    {Array.from({ length: maxStandbyCount }, (_, i) => {
                                        const count = (quota as unknown as Record<string, number>)[`priority_${i + 1}_count`] ?? 0
                                        const tone = standbyTone(i)
                                        return (
                                            <td
                                                key={i}
                                                style={{
                                                    textAlign: 'center',
                                                    fontWeight: count > 0 ? 700 : 400,
                                                    color: count > 0 ? tone.tx : 'var(--ws-text-2)',
                                                }}
                                            >
                                                {count}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </WsBlock>
    )
}

function WeeklyTab({ schedule, periodsPerDay, maxStandbyCount }: { schedule: Record<string, WeeklySlot[]>; periodsPerDay: number; maxStandbyCount: number }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    const [hoveredTeacherId, setHoveredTeacherId] = useState<number | null>(null)

    // حالة التعديل اليدوي
    const [editingSlot, setEditingSlot] = useState<{ slotId: number; position: number; day: string; period: number } | null>(null)
    const [pendingChanges, setPendingChanges] = useState<Map<string, { slotId: number; position: number; teacherId: number; teacherName: string }>>(new Map())
    const [staffForSlot, setStaffForSlot] = useState<Array<{ id: number; name: string; status: string; status_label: string }>>([])
    const [loadingStaff, setLoadingStaff] = useState(false)

    // جلب قائمة المعلمين المتاحين لخانة معينة
    const fetchStaffForSlot = async (day: string, period: number) => {
        setLoadingStaff(true)
        try {
            const { data } = await apiClient.get('/admin/teacher-standby/staff-for-slot', {
                params: { day, period_number: period }
            })
            if (data.success) {
                setStaffForSlot(data.data)
            }
        } catch (error) {
            console.error('Error fetching staff:', error)
        } finally {
            setLoadingStaff(false)
        }
    }

    // حفظ التغييرات
    const saveMutation = useMutation({
        mutationFn: async () => {
            const promises = Array.from(pendingChanges.values()).map(change =>
                apiClient.post('/admin/teacher-standby/update-slot', {
                    slot_id: change.slotId,
                    position: `standby_${change.position}_id`, // تحويل الرقم إلى الصيغة الصحيحة
                    teacher_id: change.teacherId
                })
            )
            return Promise.all(promises)
        },
        onSuccess: () => {
            toast({ type: 'success', title: `تم حفظ ${pendingChanges.size} تعديل بنجاح` })
            setPendingChanges(new Map())
            queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        }
    })

    // عند النقر على خانة لتعديلها
    const handleSlotClick = (slotId: number, position: number, day: string, period: number) => {
        setEditingSlot({ slotId, position, day, period })
        fetchStaffForSlot(day, period)
    }

    // عند اختيار معلم جديد
    const handleSelectTeacher = (teacherId: number, teacherName: string) => {
        if (!editingSlot) return

        const key = `${editingSlot.slotId}-${editingSlot.position}`
        setPendingChanges(prev => {
            const newMap = new Map(prev)
            newMap.set(key, {
                slotId: editingSlot.slotId,
                position: editingSlot.position,
                teacherId,
                teacherName
            })
            return newMap
        })
        setEditingSlot(null)
    }

    // الحصول على الاسم المعدل إذا وجد
    const getDisplayName = (slot: WeeklySlot, position: number): string | null => {
        const key = `${slot.id}-${position}`
        const pending = pendingChanges.get(key)
        if (pending) return pending.teacherName
        return (slot as unknown as Record<string, { id: number; name: string } | null>)[`standby${position}`]?.name ?? null
    }

    // التحقق إذا الخانة معدلة
    const isModified = (slotId: number, position: number) => {
        return pendingChanges.has(`${slotId}-${position}`)
    }

    const isHighlighted = (teacherId: number | null | undefined) => {
        return hoveredTeacherId !== null && teacherId === hoveredTeacherId
    }

    // مكون عرض خانة المعلم
    const TeacherSlot = ({ slot, position }: { slot: WeeklySlot; position: number }) => {
        const name = getDisplayName(slot, position)
        const modified = isModified(slot.id, position)
        const teacherId = (slot as unknown as Record<string, { id: number; name: string } | null>)[`standby${position}`]?.id ?? null

        if (!name && !modified) return null

        const isEditing = editingSlot?.slotId === slot.id && editingSlot?.position === position

        if (isEditing) {
            return (
                <WsSelect
                    autoFocus
                    style={{ width: '100%', height: 26, fontSize: 11 }}
                    onChange={(e) => {
                        const selected = staffForSlot.find(s => s.id === Number(e.target.value))
                        if (selected) handleSelectTeacher(selected.id, selected.name)
                    }}
                    onBlur={() => setEditingSlot(null)}
                >
                    <option value="">-- اختر معلم --</option>
                    {loadingStaff ? (
                        <option disabled>جاري التحميل...</option>
                    ) : (
                        <>
                            {staffForSlot.filter(s => s.status === 'available').map(s => (
                                <option key={s.id} value={s.id}>✓ {s.name}</option>
                            ))}
                            {staffForSlot.filter(s => s.status === 'warning').map(s => (
                                <option key={s.id} value={s.id}>⚠ {s.name} ({s.status_label})</option>
                            ))}
                            {staffForSlot.filter(s => s.status === 'busy').map(s => (
                                <option key={s.id} value={s.id} disabled>✗ {s.name} ({s.status_label})</option>
                            ))}
                        </>
                    )}
                </WsSelect>
            )
        }

        const tone = standbyTone(position - 1)
        const highlighted = isHighlighted(teacherId)

        const style: CSSProperties = modified
            ? {
                background: 'var(--ws-amber-bg)',
                border: '1px solid var(--ws-amber)',
                color: 'var(--ws-amber)',
                boxShadow: '0 0 0 1.5px var(--ws-amber)',
            }
            : {
                background: tone.bg,
                border: `1px solid ${highlighted ? 'var(--ws-accent-2)' : tone.bd}`,
                color: tone.tx,
                ...(highlighted ? { boxShadow: '0 0 0 1.5px var(--ws-accent-2)', fontWeight: 800 } : null),
            }

        return (
            <span
                onClick={() => handleSlotClick(slot.id, position, slot.day, slot.period_number)}
                onMouseEnter={() => setHoveredTeacherId(teacherId ?? null)}
                onMouseLeave={() => setHoveredTeacherId(null)}
                title="اضغط لتغيير المعلم"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.12s',
                    ...style,
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 16,
                        height: 16,
                        borderRadius: 5,
                        fontSize: 9.5,
                        fontWeight: 800,
                        background: 'color-mix(in srgb, currentColor 14%, transparent)',
                        flexShrink: 0,
                    }}
                >
                    {position}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </span>
        )
    }

    return (
        <WsBlock
            title="الجدول الأسبوعي"
            icon={CalendarDays}
            tools={
                <>
                    <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        {maxStandbyCount} منتظرين لكل حصة — اضغط على الاسم للتعديل
                    </span>
                    {pendingChanges.size > 0 && (
                        <>
                            <WsChip tone="amber" className="ws-soft-pulse">
                                {pendingChanges.size} تعديل غير محفوظ
                            </WsChip>
                            <WsBtn
                                variant="primary"
                                size="sm"
                                icon={Save}
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
                            </WsBtn>
                        </>
                    )}
                </>
            }
            fill
        >
            {Object.keys(schedule).length === 0 ? (
                <WsEmpty icon={CalendarX}>
                    لم يتم توليد الجدول بعد.
                    <span style={{ fontSize: 11 }}>اضغط على زر «توليد الجدول» بالأعلى لإنشاء جدول الانتظار الأسبوعي.</span>
                </WsEmpty>
            ) : (
                <div className="ws-tablewrap">
                    <table className="ws-matrix">
                        <thead>
                            <tr>
                                <th className="ws-matrix__stick" style={{ minWidth: 60, textAlign: 'center' }}>
                                    الحصة
                                </th>
                                {days.map(day => (
                                    <th key={day} style={{ minWidth: 150 }}>{DAY_LABELS[day]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(period => (
                                <tr key={period}>
                                    <td className="ws-matrix__stick" style={{ textAlign: 'center' }}>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 26,
                                                height: 26,
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: 800,
                                                background: 'var(--ws-accent-soft)',
                                                color: 'var(--ws-accent)',
                                            }}
                                        >
                                            {period}
                                        </span>
                                    </td>
                                    {days.map(day => {
                                        const slot = schedule[day]?.find(s => s.period_number === period)
                                        if (!slot) {
                                            return <td key={day} style={{ color: 'var(--ws-text-2)' }}>—</td>
                                        }
                                        return (
                                            <td key={day} style={{ padding: '5px 6px', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    {Array.from({ length: maxStandbyCount }, (_, i) => (
                                                        <TeacherSlot key={i} slot={slot} position={i + 1} />
                                                    ))}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </WsBlock>
    )
}

function SimulationTab({
    quotas,
    maxStandbyCount,
}: {
    schedule: Record<string, WeeklySlot[]>
    periodsPerDay: number
    quotas: TeacherQuota[]
    maxStandbyCount: number
}) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([])
    const [selectedDay, setSelectedDay] = useState('sunday')

    // جلب بيانات المحاكاة من الـ API لكل معلم مختار
    const simulationQueries = useQuery({
        queryKey: ['simulate-absence', selectedDay, selectedTeacherIds],
        queryFn: async () => {
            if (selectedTeacherIds.length === 0) return []

            const results = await Promise.all(
                selectedTeacherIds.map(async (teacherId) => {
                    try {
                        const { data } = await apiClient.get('/admin/teacher-standby/simulate-absence', {
                            params: { teacher_id: teacherId, day: selectedDay }
                        })
                        if (data.success) {
                            return data.data
                        }
                        return null
                    } catch {
                        return null
                    }
                })
            )
            return results.filter(Boolean)
        },
        enabled: selectedTeacherIds.length > 0,
        staleTime: 30_000,
    })

    // دالة للتبديل بين اختيار وإلغاء اختيار المعلم
    const toggleTeacher = (teacherId: number) => {
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        )
    }

    // تحليل نتائج المحاكاة وحساب التعارضات
    const simulationResults = simulationQueries.data ?? []

    // تتبع المعلمين المستخدمين لكل حصة (لاكتشاف التعارضات)
    const usedStandbyPerPeriod: Map<number, Set<number>> = new Map()

    type AssignmentResult = {
        period: number
        className: string
        subject: string
        absentTeacherId: number
        absentTeacherName: string
        assignedSubstitute: string | null
        assignedSubstituteId: number | null
        priority: number
        conflict: boolean
        allBusy: boolean
        standbys: Record<string, string | null>
    }

    const allAssignments: AssignmentResult[] = []

    // معالجة كل نتيجة محاكاة
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    simulationResults.forEach((result: any) => {
        if (!result?.sessions) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.sessions.forEach((session: any) => {
            const period = session.period
            if (!usedStandbyPerPeriod.has(period)) {
                usedStandbyPerPeriod.set(period, new Set())
            }
            const usedInThisPeriod = usedStandbyPerPeriod.get(period)!

            // البحث عن بديل متاح ديناميكياً
            const standbys: Array<{ id: number | null; name: string | null; priority: number }> = []
            for (let i = 1; i <= maxStandbyCount; i++) {
                standbys.push({ id: session[`standby${i}_id`], name: session[`standby${i}`], priority: i })
            }

            let assigned: { id: number; name: string; priority: number } | null = null

            for (const s of standbys) {
                if (!s.id || !s.name) continue
                if (selectedTeacherIds.includes(s.id)) continue
                if (usedInThisPeriod.has(s.id)) continue

                assigned = { id: s.id, name: s.name, priority: s.priority }
                usedInThisPeriod.add(s.id)
                break
            }

            // جمع أسماء المنتظرين
            const standbyNames: Record<string, string | null> = {}
            for (let i = 1; i <= maxStandbyCount; i++) {
                standbyNames[`standby${i}`] = session[`standby${i}`] ?? null
            }

            allAssignments.push({
                period,
                className: session.class,
                subject: session.subject,
                absentTeacherId: result.teacher.id,
                absentTeacherName: result.teacher.name,
                assignedSubstitute: assigned?.name ?? null,
                assignedSubstituteId: assigned?.id ?? null,
                priority: assigned?.priority ?? 0,
                conflict: assigned ? assigned.priority !== 1 : false,
                allBusy: !assigned,
                standbys: standbyNames,
            })
        })
    })

    // تجميع النتائج حسب الحصة
    const periodGroups: Map<number, AssignmentResult[]> = new Map()
    allAssignments.forEach(a => {
        if (!periodGroups.has(a.period)) {
            periodGroups.set(a.period, [])
        }
        periodGroups.get(a.period)!.push(a)
    })

    const sortedPeriods = Array.from(periodGroups.keys()).sort((a, b) => a - b)

    return (
        <>
            {/* العمود الأيمن: اختيار الغائبين */}
            <WsSideCol
                title="محاكاة الغياب"
                icon={FlaskConical}
                side="start"
                width={300}
                storageKey="ws:standby:simulation"
            >
                <WsBlock padded style={{ background: 'var(--ws-accent-softer)' }}>
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-accent)', fontWeight: 600 }}>
                        اختر المعلمين الغائبين واليوم لرؤية توزيع البدلاء واكتشاف التعارضات قبل وقوعها.
                    </p>
                </WsBlock>

                <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
                    <WsField label="اليوم">
                        <WsSelect value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                            {days.map(day => (
                                <option key={day} value={day}>{DAY_LABELS[day]}</option>
                            ))}
                        </WsSelect>
                    </WsField>
                </div>

                <WsBlock
                    title="المعلمون الغائبون"
                    count={selectedTeacherIds.length.toLocaleString('ar-SA-u-nu-latn')}
                    tools={
                        selectedTeacherIds.length > 0 ? (
                            <WsBtn size="sm" onClick={() => setSelectedTeacherIds([])}>
                                إلغاء الكل
                            </WsBtn>
                        ) : undefined
                    }
                    fill
                    scroll
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 8 }}>
                        {quotas.filter(q => q.current_load > 0).map(q => {
                            const checked = selectedTeacherIds.includes(q.teacher_id)
                            return (
                                <label
                                    key={q.teacher_id}
                                    className={`ws-pick ${checked ? 'is-checked' : ''}`}
                                    style={checked ? { borderColor: 'var(--ws-red)', background: 'var(--ws-red-bg)' } : undefined}
                                >
                                    <span style={{ minWidth: 0 }}>
                                        <span className="ws-pick__name" style={checked ? { color: 'var(--ws-red)' } : undefined}>
                                            {q.teacher?.name}
                                        </span>
                                        <span className="ws-pick__sub">{q.current_load} حصة</span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleTeacher(q.teacher_id)}
                                        style={checked ? { accentColor: 'var(--ws-red)' } : undefined}
                                    />
                                </label>
                            )
                        })}
                    </div>
                </WsBlock>
            </WsSideCol>

            {/* الوسط: نتيجة المحاكاة */}
            <WsMain>
                <WsBlock
                    title={`توزيع البدلاء — يوم ${DAY_LABELS[selectedDay]}`}
                    icon={Users}
                    count={selectedTeacherIds.length > 0 ? `${selectedTeacherIds.length} غائب` : undefined}
                    fill
                    scroll
                >
                    {simulationQueries.isLoading ? (
                        <WsEmpty loading>جاري تحميل بيانات المحاكاة...</WsEmpty>
                    ) : selectedTeacherIds.length === 0 ? (
                        <WsEmpty icon={FlaskConical}>اختر معلماً أو أكثر من القائمة اليمنى لمحاكاة غيابهم.</WsEmpty>
                    ) : sortedPeriods.length === 0 ? (
                        <WsEmpty icon={CalendarX}>لا توجد حصص للمعلمين المختارين في هذا اليوم.</WsEmpty>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
                            {sortedPeriods.map(period => {
                                const periodAssignments = periodGroups.get(period)!
                                const hasConflict = periodAssignments.some(a => a.conflict || a.allBusy)

                                return (
                                    <div
                                        key={period}
                                        style={{
                                            border: `1px solid ${hasConflict ? 'var(--ws-amber-bd)' : 'var(--ws-border)'}`,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            background: 'var(--ws-surface)',
                                        }}
                                    >
                                        <div
                                            className="ws-block__head"
                                            style={hasConflict ? { background: 'var(--ws-amber-bg)' } : undefined}
                                        >
                                            <span className="ws-block__title">
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 22,
                                                        height: 22,
                                                        borderRadius: 7,
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        background: 'var(--ws-accent)',
                                                        color: '#fff',
                                                    }}
                                                >
                                                    {period}
                                                </span>
                                                الحصة {period}
                                            </span>
                                            {hasConflict && (
                                                <WsChip tone="amber" icon={AlertTriangle}>
                                                    تعارض
                                                </WsChip>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
                                            {periodAssignments.map((a, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 10,
                                                        flexWrap: 'wrap',
                                                        padding: '7px 10px',
                                                        borderRadius: 8,
                                                        border: `1px solid ${a.allBusy ? 'var(--ws-red-bd)' : a.conflict ? 'var(--ws-amber-bd)' : 'var(--ws-green-bd)'}`,
                                                        background: a.allBusy ? 'var(--ws-red-bg)' : a.conflict ? 'var(--ws-amber-bg)' : 'var(--ws-green-bg)',
                                                    }}
                                                >
                                                    <span style={{ minWidth: 0 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-red)', textDecoration: 'line-through' }}>
                                                                {a.absentTeacherName}
                                                            </span>
                                                            <span style={{ color: 'var(--ws-text-2)' }}>←</span>
                                                            {a.allBusy ? (
                                                                <WsChip tone="red" icon={AlertTriangle}>
                                                                    لا يوجد بديل متاح!
                                                                </WsChip>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                                    <span style={{ fontSize: 12.5, fontWeight: 800, color: standbyTone(a.priority - 1).tx }}>
                                                                        {a.assignedSubstitute}
                                                                    </span>
                                                                    <span
                                                                        className="ws-chip"
                                                                        style={{
                                                                            background: standbyTone(a.priority - 1).bg,
                                                                            borderColor: standbyTone(a.priority - 1).bd,
                                                                            color: standbyTone(a.priority - 1).tx,
                                                                        }}
                                                                    >
                                                                        م{a.priority}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', marginTop: 3 }}>
                                                            {a.subject} • {a.className}
                                                        </span>
                                                    </span>
                                                    <span style={{ fontSize: 10, color: 'var(--ws-text-2)', textAlign: 'left' }}>
                                                        {Array.from({ length: maxStandbyCount }, (_, i) => {
                                                            const name = a.standbys[`standby${i + 1}`]
                                                            return name ? (
                                                                <span key={i} style={{ display: 'block' }}>
                                                                    م{i + 1}: {name}
                                                                </span>
                                                            ) : null
                                                        })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </WsBlock>
            </WsMain>
        </>
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

function PreferencesTab({ quotas, maxStandbyCount }: { quotas: TeacherQuota[]; maxStandbyCount: number }) {
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

    const selectedTeacherName = quotas.find(q => q.teacher_id === selectedTeacherId)?.teacher?.name

    return (
        <>
            {/* العمود الأيمن: قائمة المعلمين */}
            <WsSideCol title="المعلمون" icon={Users} side="start" width={280} storageKey="ws:standby:preferences">
                <WsBlock count={quotas.length.toLocaleString('ar-SA-u-nu-latn')} title="القائمة" fill scroll>
                    <div>
                        {quotas.map(q => {
                            const pref = prefData?.preferences?.find((p: TeacherPreference) => p.teacher_id === q.teacher_id)
                            const isSelected = selectedTeacherId === q.teacher_id
                            return (
                                <button
                                    key={q.teacher_id}
                                    type="button"
                                    onClick={() => handleTeacherSelect(q.teacher_id)}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'right',
                                        padding: '7px 12px',
                                        border: 'none',
                                        borderBottom: '1px solid var(--ws-hairline)',
                                        background: isSelected ? 'var(--ws-accent-soft)' : 'transparent',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 600, color: 'var(--ws-text)', minWidth: 0 }}>
                                            {q.teacher?.name}
                                        </span>
                                        <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                                            {pref?.is_excluded && <WsChip tone="red">مستثنى</WsChip>}
                                            <WsChip>{q.current_load} حصة</WsChip>
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </WsBlock>
            </WsSideCol>

            {/* الوسط: نموذج الإعدادات */}
            <WsMain>
                <WsBlock
                    title={selectedTeacherName ? `إعدادات: ${selectedTeacherName}` : 'إعدادات المعلم'}
                    icon={Settings}
                    fill
                    scroll
                >
                    {selectedTeacherId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, maxWidth: 560 }}>
                            {/* استثناء من الانتظار */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: '8px 10px',
                                    border: `1px solid ${formData.is_excluded ? 'var(--ws-red-bd)' : 'var(--ws-hairline)'}`,
                                    borderRadius: 8,
                                    background: formData.is_excluded ? 'var(--ws-red-bg)' : 'var(--ws-surface-2)',
                                }}
                            >
                                <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>استثناء من الانتظار</span>
                                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                        لن يُدرج المعلم في أي جدول انتظار.
                                    </span>
                                </span>
                                <WsSwitch
                                    checked={formData.is_excluded}
                                    onChange={(checked) => setFormData({ ...formData, is_excluded: checked })}
                                />
                            </div>

                            {formData.is_excluded && (
                                <WsField label="سبب الاستثناء">
                                    <WsInput
                                        type="text"
                                        placeholder="سبب الاستثناء"
                                        value={formData.exclusion_reason}
                                        onChange={(e) => setFormData({ ...formData, exclusion_reason: e.target.value })}
                                    />
                                </WsField>
                            )}

                            {/* لا تكرار في نفس اليوم */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: '8px 10px',
                                    border: '1px solid var(--ws-hairline)',
                                    borderRadius: 8,
                                    background: 'var(--ws-surface-2)',
                                }}
                            >
                                <span style={{ minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>لا تكرار في نفس اليوم</span>
                                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                        منع إسناد أكثر من انتظار للمعلم في اليوم الواحد.
                                    </span>
                                </span>
                                <WsSwitch
                                    checked={formData.no_same_day_repeat}
                                    onChange={(checked) => setFormData({ ...formData, no_same_day_repeat: checked })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <WsField label="الحد الأقصى اليومي">
                                    <WsSelect
                                        value={formData.max_daily_standby}
                                        onChange={(e) => setFormData({ ...formData, max_daily_standby: Number(e.target.value) })}
                                    >
                                        <option value={1}>1 حصة</option>
                                        <option value={2}>2 حصة</option>
                                        <option value={3}>3 حصص</option>
                                    </WsSelect>
                                </WsField>

                                <WsField label="الحد الأقصى الأسبوعي (اختياري)">
                                    <WsInput
                                        type="number"
                                        placeholder="تلقائي"
                                        value={formData.max_weekly_standby}
                                        onChange={(e) => setFormData({ ...formData, max_weekly_standby: e.target.value })}
                                    />
                                </WsField>
                            </div>

                            <WsField label="أولوية ثابتة">
                                <WsSelect
                                    value={formData.fixed_priority}
                                    onChange={(e) => setFormData({ ...formData, fixed_priority: e.target.value })}
                                >
                                    <option value="">تلقائي (الكل)</option>
                                    {Array.from({ length: maxStandbyCount }, (_, i) => (
                                        <option key={i} value={i + 1}>م{i + 1} فقط</option>
                                    ))}
                                </WsSelect>
                            </WsField>

                            <WsField label="ملاحظات">
                                <WsTextarea
                                    placeholder="ملاحظات إضافية..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2}
                                />
                            </WsField>

                            <WsBtn
                                variant="primary"
                                icon={Save}
                                onClick={() => saveMutation.mutate(selectedTeacherId)}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </WsBtn>
                        </div>
                    ) : (
                        <WsEmpty icon={UserRound}>اختر معلماً من القائمة اليمنى لتعديل إعداداته.</WsEmpty>
                    )}
                </WsBlock>
            </WsMain>
        </>
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

function StandbySettingsModal({ onClose, onSave, currentMaxCount }: { onClose: () => void; onSave: () => void; currentMaxCount: number }) {
    const toast = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [maxCount, setMaxCount] = useState(currentMaxCount)

    // حفظ عدد المنتظرين
    const saveCountMutation = useMutation({
        mutationFn: async (count: number) => {
            const { data } = await apiClient.put('/admin/teacher-standby/settings', { max_standby_count: count })
            if (!data.success) throw new Error(data.message)
            return data
        },
        onSuccess: () => {
            toast({ type: 'success', title: 'تم تحديث عدد المنتظرين' })
            queryClient.invalidateQueries({ queryKey: ['teacher-standby-weekly'] })
        },
        onError: (error: Error) => {
            toast({ type: 'error', title: error.message })
        },
    })

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
        <WsModal
            open
            onClose={onClose}
            title="إعدادات الانتظار"
            sub="ضبط عدد المنتظرين وإضافة موظفين لجدول الانتظار."
            maxWidth={520}
            footer={
                <>
                    <WsBtn onClick={onClose}>إغلاق</WsBtn>
                    <WsBtn variant="primary" icon={Calculator} onClick={onSave}>
                        حفظ وإعادة حساب
                    </WsBtn>
                </>
            }
        >
            {/* عدد المنتظرين */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '8px 10px',
                    border: '1px solid var(--ws-hairline)',
                    borderRadius: 8,
                    background: 'var(--ws-surface-2)',
                }}
            >
                <span className="ws-label">عدد المنتظرين لكل حصة</span>
                <div style={{ display: 'flex', gap: 6 }}>
                    <WsSelect value={maxCount} onChange={(e) => setMaxCount(Number(e.target.value))} style={{ flex: 1 }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                            <option key={n} value={n}>{n} منتظر{n > 2 ? 'ين' : ''}</option>
                        ))}
                    </WsSelect>
                    {maxCount !== currentMaxCount && (
                        <WsBtn
                            variant="primary"
                            size="sm"
                            icon={Save}
                            onClick={() => saveCountMutation.mutate(maxCount)}
                            disabled={saveCountMutation.isPending}
                            style={{ height: 30 }}
                        >
                            {saveCountMutation.isPending ? '...' : 'حفظ'}
                        </WsBtn>
                    )}
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    بعد تغيير العدد، أعد حساب الإسناد وتوليد الجدول الأسبوعي.
                </span>
            </div>

            {/* المفعل لهم الانتظار */}
            {enabledStaff.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span className="ws-label">المفعل لهم الانتظار</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {enabledStaff.map(s => (
                            <WsChip key={s.id} tone="green">
                                {s.name}
                                <button
                                    type="button"
                                    onClick={() => toggleMutation.mutate(s.id)}
                                    style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                    title="إزالة"
                                >
                                    <X style={{ width: 10, height: 10 }} />
                                </button>
                            </WsChip>
                        ))}
                    </div>
                </div>
            )}

            {/* البحث */}
            <WsInput
                type="search"
                placeholder="ابحث عن موظف..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />

            {/* قائمة الموظفين */}
            {isLoading ? (
                <WsAlert tone="info" boxed>
                    جاري التحميل...
                </WsAlert>
            ) : filteredStaff.length === 0 ? (
                <WsAlert tone="info" boxed>
                    {searchTerm ? 'لا توجد نتائج.' : 'لا يوجد موظفون.'}
                </WsAlert>
            ) : (
                <div style={{ maxHeight: '36vh', overflowY: 'auto', border: '1px solid var(--ws-hairline)', borderRadius: 8 }}>
                    {filteredStaff.map(s => (
                        <div
                            key={s.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '7px 10px',
                                borderBottom: '1px solid var(--ws-hairline)',
                                background: s.standby_enabled ? 'var(--ws-green-bg)' : 'transparent',
                            }}
                        >
                            <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                    {s.role_label || s.role}
                                </span>
                            </span>
                            <WsBtn
                                size="sm"
                                variant={s.standby_enabled ? 'danger' : undefined}
                                onClick={() => toggleMutation.mutate(s.id)}
                                disabled={toggleMutation.isPending}
                            >
                                {s.standby_enabled ? 'إزالة' : 'إضافة'}
                            </WsBtn>
                        </div>
                    ))}
                </div>
            )}
        </WsModal>
    )
}

export default AdminTeacherStandbyPage

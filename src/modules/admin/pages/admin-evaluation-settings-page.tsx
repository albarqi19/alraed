import { useMemo, useState } from 'react'
import {
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCcw,
  Settings2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  useBehaviorTypesQuery,
  useCreateBehaviorTypeMutation,
  useUpdateBehaviorTypeMutation,
  useDeleteBehaviorTypeMutation,
  useReorderBehaviorTypesMutation,
  useEvaluationStatsQuery,
} from '../evaluation/hooks'
import type { BehaviorType, BehaviorTypeFormValues, BehaviorStat } from '../evaluation/types'
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
  WsPage,
  WsSideCol,
  WsSpinner,
  WsSwitch,
  WsTable,
} from '@/shared/workspace'

/* ─────── الأيقونات التعبيرية ─────── */
const ICON_EMOJI_MAP: Record<string, string> = {
  hand: '✋',
  'book-x': '📕',
  moon: '😴',
  'message-circle': '💬',
  star: '⭐',
  'alert-triangle': '⚠️',
  heart: '❤️',
  zap: '⚡',
}

const ICON_OPTIONS = [
  { value: 'hand', label: '✋ مشاركة' },
  { value: 'book-x', label: '📕 الكتاب' },
  { value: 'moon', label: '😴 النوم' },
  { value: 'message-circle', label: '💬 حديث جانبي' },
  { value: 'star', label: '⭐ تميز' },
  { value: 'alert-triangle', label: '⚠️ تنبيه' },
  { value: 'heart', label: '❤️ تعاون' },
  { value: 'zap', label: '⚡ نشاط' },
]

/* درجات لونية هادئة لكل لون نمط (بديل كلاسات Tailwind الصلبة) */
const TONES: Record<string, { bg: string; bd: string; tx: string; solid: string }> = {
  emerald: { bg: '#E9F5EC', bd: '#BFE3C9', tx: '#2E7D46', solid: '#10b981' },
  rose: { bg: '#FBEAEA', bd: '#EFC5C5', tx: '#C43D3D', solid: '#f43f5e' },
  amber: { bg: '#FCF3E1', bd: '#EFD9AC', tx: '#A8690A', solid: '#f59e0b' },
  sky: { bg: '#E8F2FA', bd: '#BFDCF0', tx: '#21689E', solid: '#0ea5e9' },
  purple: { bg: '#F1EAFB', bd: '#D6C3F0', tx: '#6D3FA9', solid: '#8b5cf6' },
  slate: { bg: 'var(--ws-surface-2)', bd: 'var(--ws-border)', tx: 'var(--ws-text-2)', solid: '#64748b' },
}

const toneOf = (color?: string | null) => TONES[color ?? 'slate'] ?? TONES.slate

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'أخضر' },
  { value: 'rose', label: 'أحمر' },
  { value: 'amber', label: 'برتقالي' },
  { value: 'sky', label: 'أزرق' },
  { value: 'purple', label: 'بنفسجي' },
  { value: 'slate', label: 'رمادي' },
]

const DESCRIPTIVE_GRADES = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف']

/* ─────── ألوان تقييم المهارات (نفس منطق صفحة المعلم) ─────── */
function getSkillEvalColor(
  gradeType: 'numeric' | 'descriptive' | 'mastery' | null,
  numericGrade?: number | null,
  maxGrade?: number | null,
  descriptiveGrade?: string | null,
  category?: 'positive' | 'negative' | null,
): { bg: string; tx: string } {
  if (gradeType === 'mastery') {
    return descriptiveGrade === 'اتقن'
      ? { bg: TONES.emerald.bg, tx: TONES.emerald.tx }
      : { bg: TONES.rose.bg, tx: TONES.rose.tx }
  }
  if (gradeType === 'numeric' && numericGrade != null) {
    const pct = (numericGrade / (maxGrade || 100)) * 100
    if (pct >= 67) return { bg: TONES.emerald.bg, tx: TONES.emerald.tx }
    if (pct >= 34) return { bg: TONES.amber.bg, tx: TONES.amber.tx }
    return { bg: TONES.rose.bg, tx: TONES.rose.tx }
  }
  if (gradeType === 'descriptive' && descriptiveGrade) {
    const map: Record<string, { bg: string; tx: string }> = {
      'ممتاز': { bg: TONES.emerald.bg, tx: TONES.emerald.tx },
      'جيد جدا': { bg: TONES.emerald.bg, tx: TONES.emerald.tx },
      'جيد': { bg: TONES.amber.bg, tx: TONES.amber.tx },
      'مقبول': { bg: '#FBEEE4', tx: '#B05E1D' },
      'ضعيف': { bg: TONES.rose.bg, tx: TONES.rose.tx },
    }
    if (map[descriptiveGrade]) return map[descriptiveGrade]
  }
  return category === 'positive'
    ? { bg: TONES.emerald.bg, tx: TONES.emerald.tx }
    : { bg: TONES.rose.bg, tx: TONES.rose.tx }
}

/* ═══════════ نموذج إضافة/تعديل نمط ═══════════ */
interface FormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: Partial<BehaviorTypeFormValues>) => void
  isSubmitting: boolean
  behaviorType: BehaviorType | null
}

function FormDialog({ open, onClose, onSubmit, isSubmitting, behaviorType }: FormDialogProps) {
  const isEdit = !!behaviorType

  const [name, setName] = useState(behaviorType?.name ?? '')
  const [icon, setIcon] = useState(behaviorType?.icon ?? '')
  const [color, setColor] = useState(behaviorType?.color ?? 'emerald')
  const [category, setCategory] = useState<'positive' | 'negative'>(behaviorType?.category ?? 'negative')
  const [requiresGrade, setRequiresGrade] = useState(behaviorType?.requires_grade ?? false)
  const [gradeType, setGradeType] = useState<'numeric' | 'descriptive' | null>(behaviorType?.grade_type ?? null)
  const [maxGrade, setMaxGrade] = useState<string>(behaviorType?.max_grade?.toString() ?? '')

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      icon: icon || null,
      color: color || null,
      category,
      requires_grade: requiresGrade,
      grade_type: requiresGrade ? gradeType : null,
      max_grade: requiresGrade && gradeType === 'numeric' && maxGrade ? Number(maxGrade) : null,
      is_active: true,
      display_order: behaviorType?.display_order ?? 0,
    })
  }

  return (
    <div className="ws-modal" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="ws-modal__panel" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">{isEdit ? 'تعديل نمط السلوك' : 'إضافة نمط سلوك جديد'}</h3>
          <p className="ws-modal__sub">النمط يظهر كزر سريع لجميع المعلمين أثناء التقييم.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="ws-modal__body">
            <WsField label="الاسم" htmlFor="behavior-name">
              <WsInput
                id="behavior-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مشاركة"
                required
                autoFocus
              />
            </WsField>

            <WsField label="الأيقونة">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ICON_OPTIONS.map((opt) => (
                  <WsChip key={opt.value} tone={icon === opt.value ? 'sky' : undefined} onClick={() => setIcon(opt.value)}>
                    {opt.label}
                  </WsChip>
                ))}
              </div>
            </WsField>

            <WsField label="اللون">
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_OPTIONS.map((opt) => {
                  const tone = toneOf(opt.value)
                  const isSelected = color === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      title={opt.label}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        border: 'none',
                        background: tone.solid,
                        cursor: 'pointer',
                        opacity: isSelected ? 1 : 0.45,
                        boxShadow: isSelected ? '0 0 0 2px var(--ws-surface), 0 0 0 4px var(--ws-accent-2)' : 'none',
                      }}
                    />
                  )
                })}
              </div>
            </WsField>

            <WsField label="التصنيف">
              <div className="ws-choice-grid">
                <button
                  type="button"
                  onClick={() => setCategory('positive')}
                  className={`ws-choice ${category === 'positive' ? 'is-selected' : ''}`}
                >
                  <ThumbsUp />
                  إيجابي
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('negative')}
                  className={`ws-choice ${category === 'negative' ? 'is-selected' : ''}`}
                >
                  <ThumbsDown />
                  سلبي
                </button>
              </div>
            </WsField>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WsSwitch checked={requiresGrade} onChange={setRequiresGrade} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>يتطلب درجة/تقييم</span>
            </div>

            {requiresGrade && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  borderRadius: 8,
                  border: '1px solid var(--ws-hairline)',
                  background: 'var(--ws-surface-2)',
                  padding: 10,
                }}
              >
                <div className="ws-choice-grid">
                  <button
                    type="button"
                    onClick={() => setGradeType('descriptive')}
                    className={`ws-choice ${gradeType === 'descriptive' ? 'is-selected' : ''}`}
                  >
                    وصفي (ممتاز/جيد/...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeType('numeric')}
                    className={`ws-choice ${gradeType === 'numeric' ? 'is-selected' : ''}`}
                  >
                    رقمي
                  </button>
                </div>

                {gradeType === 'numeric' && (
                  <WsField label="أقصى درجة" htmlFor="behavior-max-grade">
                    <WsInput
                      id="behavior-max-grade"
                      type="number"
                      value={maxGrade}
                      onChange={(e) => setMaxGrade(e.target.value)}
                      placeholder="100"
                      min="1"
                      step="0.5"
                    />
                  </WsField>
                )}

                {gradeType === 'descriptive' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {DESCRIPTIVE_GRADES.map((g) => (
                      <WsChip key={g}>{g}</WsChip>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="ws-modal__foot">
            <WsBtn onClick={onClose}>إلغاء</WsBtn>
            <WsBtn type="submit" variant="primary" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? 'تحديث' : 'إضافة'}
            </WsBtn>
          </footer>
        </form>
      </div>
    </div>
  )
}

/* ═══════════ تأكيد الحذف ═══════════ */
function DeleteDialog({
  behaviorType,
  open,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  behaviorType: BehaviorType | null
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  if (!open || !behaviorType) return null

  return (
    <div className="ws-modal" style={{ zIndex: 70 }} onClick={onCancel}>
      <div className="ws-modal__panel" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <header className="ws-modal__head">
          <h3 className="ws-modal__title">حذف نمط السلوك</h3>
        </header>
        <div className="ws-modal__body">
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8 }}>
            هل أنت متأكد من حذف <b>&quot;{behaviorType.name}&quot;</b>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>
        <footer className="ws-modal__foot">
          <WsBtn onClick={onCancel}>إلغاء</WsBtn>
          <WsBtn variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الحذف...' : 'حذف'}
          </WsBtn>
        </footer>
      </div>
    </div>
  )
}

/* ═══════════ نافذة الإعدادات: إدارة الأنماط ═══════════ */
function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingType, setEditingType] = useState<BehaviorType | null>(null)
  const [typeToDelete, setTypeToDelete] = useState<BehaviorType | null>(null)

  const { data, isLoading, refetch, isFetching } = useBehaviorTypesQuery()
  const createMutation = useCreateBehaviorTypeMutation()
  const updateMutation = useUpdateBehaviorTypeMutation()
  const deleteMutation = useDeleteBehaviorTypeMutation()
  const reorderMutation = useReorderBehaviorTypesMutation()

  const behaviorTypes = useMemo(() => data ?? [], [data])

  const handleAdd = () => {
    setEditingType(null)
    setIsFormOpen(true)
  }

  const handleEdit = (item: BehaviorType) => {
    setEditingType(item)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (values: Partial<BehaviorTypeFormValues>) => {
    if (editingType) {
      updateMutation.mutate(
        { id: editingType.id, payload: values },
        { onSuccess: () => { setIsFormOpen(false); setEditingType(null) } },
      )
    } else {
      createMutation.mutate(values, {
        onSuccess: () => setIsFormOpen(false),
      })
    }
  }

  const handleDelete = () => {
    if (!typeToDelete) return
    deleteMutation.mutate(typeToDelete.id, {
      onSuccess: () => setTypeToDelete(null),
    })
  }

  const handleReorder = (itemId: number, direction: 'up' | 'down') => {
    const ids = behaviorTypes.map((t) => t.id)
    const idx = ids.indexOf(itemId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= ids.length) return
    ;[ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]]
    reorderMutation.mutate(ids)
  }

  if (!open) return null

  return (
    <div className="ws-modal" onClick={onClose}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ws-modal__head" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <h3 className="ws-modal__title">إعدادات أنماط التقييم</h3>
            <p className="ws-modal__sub">الأنماط التي تظهر كأزرار سريعة لجميع المعلمين</p>
          </span>
          <WsIconBtn icon={RefreshCcw} label="تحديث" onClick={() => refetch()} disabled={isFetching} />
        </header>

        <div className="ws-modal__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '2px dashed var(--ws-border)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ws-text-2)',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            إضافة نمط جديد
          </button>

          {isLoading ? (
            <WsEmpty loading>جاري التحميل...</WsEmpty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {behaviorTypes.map((item, index) => {
                const emoji = ICON_EMOJI_MAP[item.icon ?? ''] ?? '📌'
                const tone = toneOf(item.color)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 8,
                      border: '1px solid var(--ws-hairline)',
                      padding: '6px 10px',
                      opacity: item.is_active ? 1 : 0.55,
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <WsIconBtn icon={ChevronUp} label="تحريك لأعلى" onClick={() => handleReorder(item.id, 'up')} disabled={index === 0} />
                      <WsIconBtn
                        icon={ChevronDown}
                        label="تحريك لأسفل"
                        onClick={() => handleReorder(item.id, 'down')}
                        disabled={index === behaviorTypes.length - 1}
                      />
                    </span>

                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: tone.bg,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {emoji}
                    </span>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.name}</span>
                        {item.is_default && <WsChip tone="sky">افتراضي</WsChip>}
                      </span>
                      <span style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        <WsChip tone={item.category === 'positive' ? 'green' : 'red'}>
                          {item.category === 'positive' ? 'إيجابي' : 'سلبي'}
                        </WsChip>
                        {item.requires_grade && (
                          <WsChip>{item.grade_type === 'descriptive' ? 'تقييم وصفي' : `رقمي (${item.max_grade})`}</WsChip>
                        )}
                      </span>
                    </span>

                    <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                      <WsIconBtn icon={Pencil} label="تعديل" onClick={() => handleEdit(item)} />
                      {!item.is_default && <WsIconBtn icon={Trash2} label="حذف" onClick={() => setTypeToDelete(item)} />}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <footer className="ws-modal__foot">
          <WsBtn onClick={onClose}>إغلاق</WsBtn>
        </footer>

        <FormDialog
          open={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingType(null) }}
          onSubmit={handleFormSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          behaviorType={editingType}
        />

        <DeleteDialog
          behaviorType={typeToDelete}
          open={!!typeToDelete}
          onCancel={() => setTypeToDelete(null)}
          onConfirm={handleDelete}
          isSubmitting={deleteMutation.isPending}
        />
      </div>
    </div>
  )
}

/* ═══════════ الصفحة الرئيسية: تقييم الطلاب ═══════════ */
export function AdminEvaluationSettingsPage() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: stats, isLoading, isError, refetch, isFetching } = useEvaluationStatsQuery()

  const behaviorStats = stats?.behavior_stats ?? []
  const totalEvaluations = stats?.total_evaluations ?? 0
  const teachersCount = stats?.teachers_count ?? 0
  const studentsCount = stats?.students_count ?? 0
  const recentEvaluations = stats?.recent_evaluations ?? []
  const classStats = stats?.class_stats ?? []

  const chartData = useMemo(() => {
    return behaviorStats.map((stat) => ({
      name: stat.name,
      count: stat.students_count,
      color: stat.color,
    }))
  }, [behaviorStats])

  const topClassesPerBehavior = useMemo(() => {
    const grouped: Record<number, {
      name: string
      icon: string | null
      color: string | null
      category: string
      classes: { label: string; count: number }[]
    }> = {}

    for (const item of classStats) {
      if (!grouped[item.behavior_type_id]) {
        grouped[item.behavior_type_id] = {
          name: item.behavior_type_name,
          icon: item.behavior_type_icon,
          color: item.behavior_type_color,
          category: item.behavior_type_category,
          classes: [],
        }
      }
      grouped[item.behavior_type_id].classes.push({
        label: `${item.grade_name} / ${item.class_name}`,
        count: item.count,
      })
    }

    return Object.entries(grouped).map(([id, data]) => ({
      behaviorTypeId: Number(id),
      ...data,
      classes: data.classes.sort((a, b) => b.count - a.count).slice(0, 3),
    }))
  }, [classStats])

  return (
    <WsPage>
      <WsHeader
        title="تقييم الطلاب"
        badge="نبض اليوم"
        actions={
          <>
            <WsBtn icon={RefreshCcw} onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'جارٍ التحديث...' : 'تحديث'}
            </WsBtn>
            <WsBtn variant="primary" icon={Settings2} onClick={() => setSettingsOpen(true)}>
              إعدادات الأنماط
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={ClipboardCheck} label="تقييمات اليوم:">
              {totalEvaluations.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={Users} label="معلم قيّم:">
              {teachersCount.toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={GraduationCap} label="طالب قُيّم:">
              {studentsCount.toLocaleString('ar-SA')}
            </WsFact>
          </>
        }
      >
        {isFetching && !isLoading ? <WsSpinner /> : null}
      </WsHeader>

      {isError && (
        <WsAlert>
          حدث خطأ في تحميل الإحصائيات.
          <WsBtn size="sm" onClick={() => refetch()}>
            إعادة المحاولة
          </WsBtn>
        </WsAlert>
      )}

      <WsLayout>
        {/* العمود الأيمن: أنماط اليوم */}
        <WsSideCol title="أنماط اليوم" icon={BarChart3} side="start" width={270} storageKey="ws:evaluation:types">
          <WsBlock fill scroll>
            {isLoading ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : behaviorStats.length === 0 ? (
              <WsEmpty icon={Settings2}>
                لا توجد أنماط تقييم بعد.
                <WsBtn variant="primary" icon={Settings2} onClick={() => setSettingsOpen(true)}>
                  فتح الإعدادات
                </WsBtn>
              </WsEmpty>
            ) : (
              <div>
                {behaviorStats.map((stat: BehaviorStat) => {
                  const emoji = ICON_EMOJI_MAP[stat.icon ?? ''] ?? '📌'
                  const tone = toneOf(stat.color)
                  return (
                    <div
                      key={stat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderBottom: '1px solid var(--ws-hairline)',
                      }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: tone.bg,
                          border: `1px solid ${tone.bd}`,
                          fontSize: 17,
                          flexShrink: 0,
                        }}
                      >
                        {emoji}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{stat.name}</span>
                        <span className="ws-cell-sub">طالب اليوم</span>
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: tone.tx }}>
                        {stat.students_count.toLocaleString('ar-SA')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: المخطط + آخر التقييمات */}
        <WsMain>
          {isLoading ? (
            <WsBlock fill>
              <WsEmpty loading>جاري تحميل الإحصائيات...</WsEmpty>
            </WsBlock>
          ) : (
            <>
              {behaviorStats.length > 0 && totalEvaluations > 0 && (
                <WsBlock title="توزيع السلوكيات اليوم" icon={BarChart3}>
                  <div style={{ height: 210, padding: '10px 12px 4px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ws-hairline)" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--ws-text-2)', fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--ws-text-2)', fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid var(--ws-border)',
                            background: 'var(--ws-surface)',
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [value, 'عدد الطلاب']}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={index} fill={toneOf(entry.color).solid} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </WsBlock>
              )}

              <WsBlock
                title="آخر التقييمات اليوم"
                icon={Clock}
                count={recentEvaluations.length ? `آخر ${recentEvaluations.length.toLocaleString('ar-SA')}` : undefined}
                fill
              >
                {totalEvaluations === 0 ? (
                  <WsEmpty icon={Clock}>
                    لا توجد تقييمات اليوم حتى الآن — ستظهر الإحصائيات فور بدء المعلمين بتقييم الطلاب.
                  </WsEmpty>
                ) : recentEvaluations.length === 0 ? (
                  <WsEmpty icon={Clock}>لا توجد تقييمات حديثة.</WsEmpty>
                ) : (
                  <WsTable>
                    <thead>
                      <tr>
                        <th>الطالب</th>
                        <th>الفصل</th>
                        <th>النوع</th>
                        <th>المعلم</th>
                        <th>الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvaluations.map((ev) => {
                        const emoji =
                          ICON_EMOJI_MAP[ev.behavior_type_icon ?? ''] ?? (ev.evaluation_type === 'skill' ? '📐' : '📌')
                        const time = new Date(ev.created_at).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        // تحديد اللون حسب نوع التقييم
                        let badge: { bg: string; tx: string }
                        if (ev.evaluation_type === 'skill' && ev.subject_skill_grade_type) {
                          badge = getSkillEvalColor(
                            ev.subject_skill_grade_type,
                            ev.numeric_grade,
                            ev.subject_skill_max_grade,
                            ev.descriptive_grade,
                            ev.subject_skill_category,
                          )
                        } else if (ev.evaluation_type === 'skill') {
                          badge =
                            ev.subject_skill_category === 'positive'
                              ? { bg: TONES.emerald.bg, tx: TONES.emerald.tx }
                              : { bg: TONES.rose.bg, tx: TONES.rose.tx }
                        } else {
                          badge =
                            ev.behavior_type_category === 'positive'
                              ? { bg: TONES.emerald.bg, tx: TONES.emerald.tx }
                              : { bg: TONES.rose.bg, tx: TONES.rose.tx }
                        }

                        return (
                          <tr key={ev.id}>
                            <td style={{ fontWeight: 700 }}>{ev.student_name}</td>
                            <td>
                              {ev.grade_name} / {ev.class_name}
                            </td>
                            <td>
                              <span
                                className="ws-chip"
                                style={{ background: badge.bg, color: badge.tx, borderColor: 'transparent' }}
                              >
                                <span>{emoji}</span>
                                {ev.behavior_type_name ?? ev.subject_skill_name ?? '-'}
                              </span>
                            </td>
                            <td>{ev.teacher_name}</td>
                            <td>
                              <span className="ws-cell-sub">{time}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </WsTable>
                )}
              </WsBlock>
            </>
          )}
        </WsMain>

        {/* العمود الأيسر: أكثر الفصول حسب النمط */}
        <WsSideCol title="أكثر الفصول" icon={Award} width={280} storageKey="ws:evaluation:classes">
          <WsBlock fill scroll>
            {isLoading ? (
              <WsEmpty loading>جاري التحميل...</WsEmpty>
            ) : topClassesPerBehavior.length === 0 ? (
              <WsEmpty icon={Award}>ستظهر هنا أكثر الفصول لكل نمط فور تسجيل التقييمات.</WsEmpty>
            ) : (
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topClassesPerBehavior.map((behavior) => {
                  const emoji = ICON_EMOJI_MAP[behavior.icon ?? ''] ?? '📌'
                  const tone = toneOf(behavior.color)
                  return (
                    <div
                      key={behavior.behaviorTypeId}
                      style={{
                        borderRadius: 9,
                        border: `1px solid ${tone.bd}`,
                        background: tone.bg,
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 15 }}>{emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tone.tx }}>{behavior.name}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {behavior.classes.map((cls, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                              borderRadius: 7,
                              background: 'var(--ws-surface)',
                              padding: '4px 8px',
                              fontSize: 11,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span
                                style={{
                                  display: 'grid',
                                  placeItems: 'center',
                                  width: 17,
                                  height: 17,
                                  borderRadius: '50%',
                                  background: 'var(--ws-surface-2)',
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  color: 'var(--ws-text-2)',
                                  flexShrink: 0,
                                }}
                              >
                                {idx + 1}
                              </span>
                              <span style={{ fontWeight: 600, color: 'var(--ws-text)' }}>{cls.label}</span>
                            </span>
                            <span style={{ fontWeight: 800, color: tone.tx }}>{cls.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* نافذة الإعدادات */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </WsPage>
  )
}

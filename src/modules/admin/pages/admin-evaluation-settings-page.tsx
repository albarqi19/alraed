import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Settings2,
  X,
  Users,
  GraduationCap,
  ClipboardCheck,
  Clock,
  Award,
  BarChart3,
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

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'أخضر', bg: 'bg-emerald-500' },
  { value: 'rose', label: 'أحمر', bg: 'bg-rose-500' },
  { value: 'amber', label: 'برتقالي', bg: 'bg-amber-500' },
  { value: 'sky', label: 'أزرق', bg: 'bg-sky-500' },
  { value: 'purple', label: 'بنفسجي', bg: 'bg-purple-500' },
  { value: 'slate', label: 'رمادي', bg: 'bg-slate-500' },
]

const DESCRIPTIVE_GRADES = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف']

/* ─────── ألوان تقييم المهارات (نفس منطق صفحة المعلم) ─────── */
function getSkillEvalColor(
  gradeType: 'numeric' | 'descriptive' | 'mastery' | null,
  numericGrade?: number | null,
  maxGrade?: number | null,
  descriptiveGrade?: string | null,
  category?: 'positive' | 'negative' | null,
): { bg: string; text: string } {
  if (gradeType === 'mastery') {
    return descriptiveGrade === 'اتقن'
      ? { bg: 'bg-emerald-50', text: 'text-emerald-600' }
      : { bg: 'bg-red-50', text: 'text-red-600' }
  }
  if (gradeType === 'numeric' && numericGrade != null) {
    const pct = (numericGrade / (maxGrade || 100)) * 100
    if (pct >= 67) return { bg: 'bg-emerald-50', text: 'text-emerald-600' }
    if (pct >= 34) return { bg: 'bg-amber-50', text: 'text-amber-600' }
    return { bg: 'bg-red-50', text: 'text-red-600' }
  }
  if (gradeType === 'descriptive' && descriptiveGrade) {
    const map: Record<string, { bg: string; text: string }> = {
      'ممتاز': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
      'جيد جدا': { bg: 'bg-green-50', text: 'text-green-600' },
      'جيد': { bg: 'bg-amber-50', text: 'text-amber-600' },
      'مقبول': { bg: 'bg-orange-50', text: 'text-orange-600' },
      'ضعيف': { bg: 'bg-red-50', text: 'text-red-600' },
    }
    if (map[descriptiveGrade]) return map[descriptiveGrade]
  }
  return category === 'positive'
    ? { bg: 'bg-emerald-50', text: 'text-emerald-600' }
    : { bg: 'bg-rose-50', text: 'text-rose-600' }
}

const STAT_CARD_COLORS: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-100' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', ring: 'ring-sky-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', ring: 'ring-rose-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-100' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', ring: 'ring-slate-100' },
}

const springConfig = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 300,
}

const CHART_COLOR_MAP: Record<string, string> = {
  amber: '#f59e0b',
  sky: '#0ea5e9',
  rose: '#f43f5e',
  emerald: '#10b981',
  purple: '#8b5cf6',
  slate: '#64748b',
}

/* ═══════════ كارد الإحصائية ═══════════ */
function StatCard({ stat, index }: { stat: BehaviorStat; index: number }) {
  const emoji = ICON_EMOJI_MAP[stat.icon ?? ''] ?? '📌'
  const colors = STAT_CARD_COLORS[stat.color ?? 'slate'] ?? STAT_CARD_COLORS.slate

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springConfig, delay: 0.05 * index }}
      className={`rounded-2xl border ${colors.border} ${colors.bg} p-4 text-center ring-1 ${colors.ring}`}
    >
      <motion.span
        className="mb-1 block text-3xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springConfig, delay: 0.1 + 0.05 * index }}
      >
        {emoji}
      </motion.span>
      <p className={`text-3xl font-bold ${colors.text}`}>{stat.students_count}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{stat.name}</p>
      <p className="text-[10px] text-slate-400">طالب اليوم</p>
    </motion.div>
  )
}

/* ═══════════ نموذج إضافة/تعديل ═══════════ */
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-5 text-lg font-bold text-slate-900">
          {isEdit ? 'تعديل نمط السلوك' : 'إضافة نمط سلوك جديد'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="مثال: مشاركة"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">الأيقونة</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIcon(opt.value)}
                  className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                    icon === opt.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">اللون</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`h-8 w-8 rounded-full ${opt.bg} transition ${
                    color === opt.value ? 'ring-2 ring-offset-2 ring-teal-500' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">التصنيف</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('positive')}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition ${
                  category === 'positive'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                إيجابي
              </button>
              <button
                type="button"
                onClick={() => setCategory('negative')}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition ${
                  category === 'negative'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
                سلبي
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRequiresGrade(!requiresGrade)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                requiresGrade ? 'bg-teal-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition ${
                  requiresGrade ? 'start-5' : 'start-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-slate-700">يتطلب درجة/تقييم</span>
          </div>

          {requiresGrade && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGradeType('descriptive')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
                    gradeType === 'descriptive'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-500 hover:bg-white'
                  }`}
                >
                  وصفي (ممتاز/جيد/...)
                </button>
                <button
                  type="button"
                  onClick={() => setGradeType('numeric')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs transition ${
                    gradeType === 'numeric'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 text-slate-500 hover:bg-white'
                  }`}
                >
                  رقمي
                </button>
              </div>

              {gradeType === 'numeric' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">أقصى درجة</label>
                  <input
                    type="number"
                    value={maxGrade}
                    onChange={(e) => setMaxGrade(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    placeholder="100"
                    min="1"
                    step="0.5"
                  />
                </div>
              )}

              {gradeType === 'descriptive' && (
                <div className="flex flex-wrap gap-1.5">
                  {DESCRIPTIVE_GRADES.map((g) => (
                    <span key={g} className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'تحديث' : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              إلغاء
            </button>
          </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-lg font-bold text-slate-900">حذف نمط السلوك</h3>
        <p className="mb-5 text-sm text-slate-500">
          هل أنت متأكد من حذف <strong>&quot;{behaviorType.name}&quot;</strong>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            حذف
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ كارد نمط السلوك (الإعدادات) ═══════════ */
function BehaviorTypeCard({
  item,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: BehaviorType
  isFirst: boolean
  isLast: boolean
  onEdit: (item: BehaviorType) => void
  onDelete: (item: BehaviorType) => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const emoji = ICON_EMOJI_MAP[item.icon ?? ''] ?? '📌'

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-sm ${
        item.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
      }`}
    >
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
          {item.is_default && (
            <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-600">
              افتراضي
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              item.category === 'positive'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {item.category === 'positive' ? 'إيجابي' : 'سلبي'}
          </span>
          {item.requires_grade && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
              {item.grade_type === 'descriptive' ? 'تقييم وصفي' : `رقمي (${item.max_grade})`}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onEdit(item)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {!item.is_default && (
          <button
            onClick={() => onDelete(item)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══════════ نافذة الإعدادات ═══════════ */
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

  return (
    <AnimatePresence mode="wait">
      {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={springConfig}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">إعدادات أنماط التقييم</h2>
                <p className="text-xs text-slate-500">الأنماط التي تظهر كأزرار سريعة لجميع المعلمين</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <button
                onClick={handleAdd}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition hover:border-teal-300 hover:text-teal-600"
              >
                <Plus className="h-4 w-4" />
                إضافة نمط جديد
              </button>

              {isLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                  <p className="text-sm text-slate-500">جاري التحميل...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {behaviorTypes.map((item, index) => (
                    <BehaviorTypeCard
                      key={item.id}
                      item={item}
                      isFirst={index === 0}
                      isLast={index === behaviorTypes.length - 1}
                      onEdit={handleEdit}
                      onDelete={setTypeToDelete}
                      onMoveUp={() => handleReorder(item.id, 'up')}
                      onMoveDown={() => handleReorder(item.id, 'down')}
                    />
                  ))}
                </div>
              )}
            </div>

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
          </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
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
    <section className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">تقييم الطلاب</h1>
          <p className="mt-1 text-sm text-slate-500">متابعة تقييمات اليوم لجميع الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <Settings2 className="h-4 w-4" />
            الإعدادات
          </button>
        </div>
      </header>

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <p className="flex-1 text-sm text-rose-700">حدث خطأ في تحميل الإحصائيات</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-100"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          <p className="text-sm text-slate-500">جاري تحميل الإحصائيات...</p>
        </div>
      ) : (
        <>
          {/* بطاقات أنماط السلوك */}
          {behaviorStats.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {behaviorStats.map((stat, index) => (
                <StatCard key={stat.id} stat={stat} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <span className="text-4xl">📋</span>
              <p className="text-sm font-medium text-slate-700">لا توجد أنماط تقييم</p>
              <p className="text-xs text-slate-400">أضف أنماط تقييم من الإعدادات</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm text-white transition hover:bg-teal-700"
              >
                <Settings2 className="h-4 w-4" />
                فتح الإعدادات
              </button>
            </div>
          )}

          {/* ملخص عام */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                <ClipboardCheck className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalEvaluations}</p>
              <p className="text-xs text-slate-500">إجمالي التقييمات</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-50">
                <Users className="h-5 w-5 text-sky-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{teachersCount}</p>
              <p className="text-xs text-slate-500">معلم قيّم اليوم</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
            >
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                <GraduationCap className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{studentsCount}</p>
              <p className="text-xs text-slate-500">طالب تم تقييمه</p>
            </motion.div>
          </div>

          {/* ═══ رسم بياني - توزيع السلوكيات ═══ */}
          {behaviorStats.length > 0 && totalEvaluations > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">توزيع السلوكيات اليوم</h2>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number) => [value, 'عدد الطلاب']}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={CHART_COLOR_MAP[entry.color ?? 'slate'] ?? '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ═══ أكثر الفصول حسب نمط السلوك ═══ */}
          {topClassesPerBehavior.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">أكثر الفصول حسب نمط السلوك</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topClassesPerBehavior.map((behavior) => {
                  const emoji = ICON_EMOJI_MAP[behavior.icon ?? ''] ?? '📌'
                  const colors = STAT_CARD_COLORS[behavior.color ?? 'slate'] ?? STAT_CARD_COLORS.slate
                  return (
                    <div key={behavior.behaviorTypeId} className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className={`text-sm font-semibold ${colors.text}`}>{behavior.name}</span>
                      </div>
                      <ol className="space-y-1.5">
                        {behavior.classes.map((cls, idx) => (
                          <li key={idx} className="flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-slate-700">{cls.label}</span>
                            </div>
                            <span className={`font-bold ${colors.text}`}>{cls.count}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ جدول آخر التقييمات ═══ */}
          {recentEvaluations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-sky-600" />
                <h2 className="text-base font-bold text-slate-900">آخر التقييمات اليوم</h2>
                <span className="mr-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  آخر {recentEvaluations.length} تقييم
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-100 text-xs text-slate-500">
                      <th className="px-3 py-2 text-right font-medium">الطالب</th>
                      <th className="px-3 py-2 text-right font-medium">الفصل</th>
                      <th className="px-3 py-2 text-right font-medium">النوع</th>
                      <th className="px-3 py-2 text-right font-medium">المعلم</th>
                      <th className="px-3 py-2 text-right font-medium">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentEvaluations.map((ev) => {
                      const emoji = ICON_EMOJI_MAP[ev.behavior_type_icon ?? ''] ?? (ev.evaluation_type === 'skill' ? '📐' : '📌')
                      const time = new Date(ev.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

                      // تحديد اللون حسب نوع التقييم
                      let badgeBg: string, badgeText: string
                      if (ev.evaluation_type === 'skill' && ev.subject_skill_grade_type) {
                        // مهارة مع درجة → لون حسب الدرجة
                        const ec = getSkillEvalColor(ev.subject_skill_grade_type, ev.numeric_grade, ev.subject_skill_max_grade, ev.descriptive_grade, ev.subject_skill_category)
                        badgeBg = ec.bg
                        badgeText = ec.text
                      } else if (ev.evaluation_type === 'skill') {
                        // مهارة بدون درجة → لون حسب التصنيف
                        badgeBg = ev.subject_skill_category === 'positive' ? 'bg-emerald-50' : 'bg-rose-50'
                        badgeText = ev.subject_skill_category === 'positive' ? 'text-emerald-600' : 'text-rose-600'
                      } else {
                        // سلوك → لون حسب التصنيف
                        const isPositive = ev.behavior_type_category === 'positive'
                        badgeBg = isPositive ? 'bg-emerald-50' : 'bg-rose-50'
                        badgeText = isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }

                      return (
                        <tr key={ev.id} className="transition hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-medium text-slate-800">{ev.student_name}</td>
                          <td className="px-3 py-2.5 text-slate-600">{ev.grade_name} / {ev.class_name}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${badgeBg} ${badgeText}`}>
                              <span>{emoji}</span>
                              {ev.behavior_type_name ?? ev.subject_skill_name ?? '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">{ev.teacher_name}</td>
                          <td className="px-3 py-2.5 text-slate-400">{time}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* رسالة عندما لا توجد تقييمات */}
          {totalEvaluations === 0 && behaviorStats.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 text-center"
            >
              <span className="text-4xl">🕐</span>
              <p className="mt-2 text-sm font-medium text-slate-700">لا توجد تقييمات اليوم حتى الآن</p>
              <p className="mt-1 text-xs text-slate-400">
                ستظهر الإحصائيات هنا فور بدء المعلمين بتقييم الطلاب
              </p>
            </motion.div>
          )}
        </>
      )}

      {/* نافذة الإعدادات */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </section>
  )
}

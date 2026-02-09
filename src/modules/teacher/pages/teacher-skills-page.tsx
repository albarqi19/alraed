import { useState } from 'react'
import clsx from 'classnames'
import { ArrowRight, Plus, Pencil, Trash2, BookOpen, GripVertical, X } from 'lucide-react'
import {
  useTeacherSubjects,
  useTeacherSubjectSkills,
  useCreateSubjectSkillMutation,
  useUpdateSubjectSkillMutation,
  useDeleteSubjectSkillMutation,
} from '../evaluation/hooks'
import type { SubjectSkill, SubjectSkillFormPayload, DescriptiveGrade } from '../evaluation/types'
import { DESCRIPTIVE_GRADES } from '../evaluation/types'

type TeacherSubject = { id: number; name: string; skills_count: number; grades: string[] }

/* ═══════════ الصفحة الرئيسية ═══════════ */

export function TeacherSkillsPage() {
  const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null)

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        {selectedSubject ? (
          <button
            type="button"
            onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-1 text-xs text-teal-600 transition hover:text-teal-700"
          >
            <ArrowRight className="h-3 w-3" />
            المواد
          </button>
        ) : null}
        <h1 className="text-xl font-bold text-slate-900">
          {selectedSubject ? `مهارات ${selectedSubject.name}` : 'إدارة المهارات'}
        </h1>
        <p className="text-xs text-muted">
          {selectedSubject
            ? 'أضف وعدّل المهارات التي تستخدمها في تقييم الطلاب'
            : 'اختر المادة لإدارة مهاراتها'}
        </p>
      </header>

      {selectedSubject ? (
        <SkillsList subjectId={selectedSubject.id} grades={selectedSubject.grades ?? []} />
      ) : (
        <SubjectsList onSelect={setSelectedSubject} />
      )}
    </section>
  )
}

/* ═══════════ قائمة المواد ═══════════ */

function SubjectsList({ onSelect }: { onSelect: (s: TeacherSubject) => void }) {
  const { data: subjects, isLoading, isError, refetch } = useTeacherSubjects()

  if (isLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-4 text-sm text-muted">جاري تحميل المواد...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="glass-card text-center">
        <p className="text-sm font-medium text-rose-600">تعذر تحميل المواد</p>
        <button type="button" className="button-secondary mt-4" onClick={() => refetch()}>
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (!subjects || subjects.length === 0) {
    return (
      <div className="glass-card text-center">
        <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 text-sm text-muted">لا توجد مواد مسجلة لك حالياً</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {subjects.map((subject) => (
        <button
          key={subject.id}
          type="button"
          onClick={() => onSelect(subject)}
          className="glass-card flex w-full items-center justify-between p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{subject.name}</h3>
              <p className="text-xs text-muted">
                {subject.skills_count > 0 ? `${subject.skills_count} مهارة` : 'لا توجد مهارات بعد'}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 rotate-180 text-slate-400" />
        </button>
      ))}
    </div>
  )
}

/* ═══════════ قائمة المهارات ═══════════ */

function SkillsList({ subjectId, grades }: { subjectId: number; grades: string[] }) {
  const { data: skills, isLoading } = useTeacherSubjectSkills(subjectId)
  const [showForm, setShowForm] = useState(false)
  const [editingSkill, setEditingSkill] = useState<SubjectSkill | null>(null)
  const [deletingSkill, setDeletingSkill] = useState<SubjectSkill | null>(null)

  const deleteMutation = useDeleteSubjectSkillMutation(subjectId)

  const handleDelete = () => {
    if (!deletingSkill) return
    deleteMutation.mutate(deletingSkill.id, {
      onSuccess: () => setDeletingSkill(null),
    })
  }

  if (isLoading) {
    return (
      <div className="glass-card text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
        <p className="mt-3 text-sm text-muted">جاري تحميل المهارات...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* زر إضافة مهارة */}
      <button
        type="button"
        onClick={() => {
          setEditingSkill(null)
          setShowForm(true)
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 text-sm font-semibold text-teal-600 transition hover:border-teal-400 hover:bg-teal-50"
      >
        <Plus className="h-4 w-4" />
        إضافة مهارة جديدة
      </button>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <SkillForm
          subjectId={subjectId}
          skill={editingSkill}
          grades={grades}
          onClose={() => {
            setShowForm(false)
            setEditingSkill(null)
          }}
        />
      )}

      {/* قائمة المهارات */}
      {skills && skills.length > 0 ? (
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="glass-card flex items-start justify-between gap-3 p-3"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{skill.name}</h4>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        skill.category === 'positive'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700',
                      )}
                    >
                      {skill.category === 'positive' ? 'إيجابي' : 'سلبي'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {skill.grade && (
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
                        {skill.grade}
                      </span>
                    )}
                    {skill.requires_grade && (
                      <span className="text-xs text-muted">
                        {skill.grade_type === 'mastery'
                          ? 'اتقن / لم يتقن'
                          : skill.grade_type === 'descriptive'
                            ? 'تقييم وصفي'
                            : `درجة رقمية (${skill.max_grade ?? '—'})`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSkill(skill)
                    setShowForm(true)
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSkill(skill)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="glass-card text-center">
            <p className="text-sm text-muted">لا توجد مهارات بعد. ابدأ بإضافة مهارة جديدة</p>
          </div>
        )
      )}

      {/* تأكيد الحذف */}
      {deletingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">حذف المهارة</h3>
            <p className="mt-2 text-sm text-muted">
              هل أنت متأكد من حذف <strong>"{deletingSkill.name}"</strong>؟
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingSkill(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════ نموذج إضافة/تعديل مهارة ═══════════ */

function SkillForm({
  subjectId,
  skill,
  grades,
  onClose,
}: {
  subjectId: number
  skill: SubjectSkill | null
  grades: string[]
  onClose: () => void
}) {
  const isEditing = !!skill

  const [name, setName] = useState(skill?.name ?? '')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(skill?.grade ?? null)
  const [category, setCategory] = useState<'positive' | 'negative'>(skill?.category ?? 'positive')
  const [requiresGrade, setRequiresGrade] = useState(skill?.requires_grade ?? false)
  const [gradeType, setGradeType] = useState<'numeric' | 'descriptive' | 'mastery' | null>(skill?.grade_type ?? null)
  const [maxGrade, setMaxGrade] = useState<string>(skill?.max_grade?.toString() ?? '')

  const createMutation = useCreateSubjectSkillMutation(subjectId)
  const updateMutation = useUpdateSubjectSkillMutation(subjectId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (!name.trim()) return

    const isPositiveWithGrade = category === 'positive' && requiresGrade
    const payload: SubjectSkillFormPayload = {
      name: name.trim(),
      grade: selectedGrade,
      category,
      requires_grade: isPositiveWithGrade,
      grade_type: isPositiveWithGrade ? gradeType : null,
      max_grade: isPositiveWithGrade && gradeType === 'numeric' && maxGrade ? Number(maxGrade) : null,
    }

    if (isEditing && skill) {
      updateMutation.mutate(
        { skillId: skill.id, payload },
        { onSuccess: onClose },
      )
    } else {
      createMutation.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <div className="glass-card space-y-4 border-teal-200 bg-teal-50/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          {isEditing ? 'تعديل المهارة' : 'مهارة جديدة'}
        </h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* اسم المهارة */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">اسم المهارة</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: القراءة الجهرية، حل المسائل..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
        />
      </div>

      {/* الصف الدراسي */}
      {grades.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">الصف الدراسي</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedGrade(null)}
              className={clsx(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                selectedGrade === null
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              كل الصفوف
            </button>
            {grades.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={clsx(
                  'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                  selectedGrade === g
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* التصنيف */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">التصنيف</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategory('positive')}
            className={clsx(
              'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition',
              category === 'positive'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200',
            )}
          >
            إيجابي
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('negative')
              setRequiresGrade(false)
              setGradeType(null)
              setMaxGrade('')
            }}
            className={clsx(
              'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition',
              category === 'negative'
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200',
            )}
          >
            سلبي
          </button>
        </div>
      </div>

      {category === 'negative' && (
        <p className="text-[11px] text-rose-500">المهارة السلبية تُطبّق مباشرة بدون درجة</p>
      )}

      {/* يتطلب درجة (إيجابي فقط - السلبي يكون toggle بدون درجة) */}
      {category === 'positive' && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={requiresGrade}
              onChange={(e) => {
                setRequiresGrade(e.target.checked)
                if (!e.target.checked) {
                  setGradeType(null)
                  setMaxGrade('')
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs font-medium text-slate-700">يتطلب تقييم/درجة</span>
          </label>
        </div>
      )}

      {/* نوع التقييم (إيجابي فقط) */}
      {category === 'positive' && requiresGrade && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">نوع التقييم</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGradeType('descriptive')}
                className={clsx(
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  gradeType === 'descriptive'
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200',
                )}
              >
                وصفي
              </button>
              <button
                type="button"
                onClick={() => setGradeType('numeric')}
                className={clsx(
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  gradeType === 'numeric'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200',
                )}
              >
                رقمي
              </button>
              <button
                type="button"
                onClick={() => setGradeType('mastery')}
                className={clsx(
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  gradeType === 'mastery'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200',
                )}
              >
                إتقان
              </button>
            </div>
          </div>

          {/* معاينة التقييم الوصفي */}
          {gradeType === 'descriptive' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">المستويات المتاحة</label>
              <div className="flex flex-wrap gap-1.5">
                {DESCRIPTIVE_GRADES.map((g: DescriptiveGrade) => (
                  <span
                    key={g}
                    className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* معاينة تقييم الإتقان */}
          {gradeType === 'mastery' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">خيارات التقييم</label>
              <div className="flex gap-2">
                <span className="flex-1 rounded-xl bg-emerald-100 py-2 text-center text-xs font-bold text-emerald-700">
                  ✓ اتقن
                </span>
                <span className="flex-1 rounded-xl bg-red-100 py-2 text-center text-xs font-bold text-red-700">
                  ✗ لم يتقن
                </span>
              </div>
            </div>
          )}

          {/* الحد الأقصى للدرجة */}
          {gradeType === 'numeric' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">الحد الأقصى للدرجة</label>
              <input
                type="number"
                value={maxGrade}
                onChange={(e) => setMaxGrade(e.target.value)}
                placeholder="مثال: 10"
                min={1}
                className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
              />
            </div>
          )}
        </div>
      )}

      {/* أزرار الحفظ */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          إلغاء
        </button>
      </div>
    </div>
  )
}

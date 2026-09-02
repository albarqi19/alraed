import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyStudentsQuery, useCreateReferralMutation } from '../referrals/hooks'
import type { ReferralType, ReferralPriority, Student } from '../referrals/types'
import { useTeacherLdFormsQuery, useSubmitLdReferralMutation } from '../learning-difficulty/hooks'

/**
 * نبراتُ الأنواع خريطةٌ لا ثنائيّة.
 *
 * كان التلوينُ مكتوباً `color === 'amber' ? … : 'red'` في أربعة مواضع، فكلُّ
 * نوعٍ جديدٍ يرث الأحمرَ صامتاً لمجرّد أنّه ليس كهرمانيّاً.
 */
const TYPE_STYLES = {
  amber: {
    selected: 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconText: 'text-amber-600 dark:text-amber-400',
    check: 'text-amber-500 dark:text-amber-400',
  },
  red: {
    selected: 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950',
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconText: 'text-red-600 dark:text-red-400',
    check: 'text-red-500 dark:text-red-400',
  },
  purple: {
    selected: 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950',
    iconBg: 'bg-purple-100 dark:bg-purple-950',
    iconText: 'text-purple-600 dark:text-purple-400',
    check: 'text-purple-500 dark:text-purple-400',
  },
} as const

type TypeColor = keyof typeof TYPE_STYLES

const REFERRAL_TYPES: {
  value: ReferralType
  label: string
  description: string
  icon: string
  color: TypeColor
  targetRole: string
}[] = [
  {
    value: 'academic_weakness' as ReferralType,
    label: 'ضعف دراسي',
    description: 'إحالة الطالب لوكالة شؤون الطلاب بسبب ضعف في التحصيل الدراسي',
    icon: 'bi-book',
    color: 'amber',
    targetRole: 'إحالة إلى وكالة شؤون الطلاب',
  },
  {
    value: 'behavioral_violation' as ReferralType,
    label: 'مخالفة سلوكية',
    description: 'إحالة الطالب لوكالة شؤون الطلاب بسبب مخالفة سلوكية',
    icon: 'bi-exclamation-triangle',
    color: 'red',
    targetRole: 'إحالة إلى وكالة شؤون الطلاب',
  },
  {
    value: 'learning_difficulty' as ReferralType,
    label: 'صعوبات التعلم',
    description: 'فحصٌ مبدئي بأسئلة نعم/لا، يصل معلّم صعوبات التعلم',
    icon: 'bi-puzzle',
    color: 'purple',
    targetRole: 'إحالة إلى معلّم صعوبات التعلم',
  },
]

const PRIORITIES = [
  { value: 'low' as ReferralPriority, label: 'منخفضة', color: 'slate' },
  { value: 'medium' as ReferralPriority, label: 'متوسطة', color: 'blue' },
  { value: 'high' as ReferralPriority, label: 'عالية', color: 'orange' },
  { value: 'urgent' as ReferralPriority, label: 'عاجلة', color: 'red' },
]

export function NewReferralPage() {
  const navigate = useNavigate()
  const { data: students, isLoading: loadingStudents } = useMyStudentsQuery()
  const createMutation = useCreateReferralMutation()

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [referralType, setReferralType] = useState<ReferralType | null>(null)
  const [priority, setPriority] = useState<ReferralPriority>('medium')
  const [description, setDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStudentPicker, setShowStudentPicker] = useState(false)

  // صعوبات التعلّم
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [formId, setFormId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const ldQuery = useTeacherLdFormsQuery(selectedStudent?.id ?? null)
  const submitLd = useSubmitLdReferralMutation()

  const ldForms = ldQuery.data?.forms ?? []
  const ldSubjects = ldQuery.data?.teacher_subjects ?? []
  const ldAvailable = ldForms.length > 0
  const activeLdForm = ldForms.find((f) => f.id === formId) ?? null
  const ldQuestions = activeLdForm?.sections.flatMap((section) => section.questions) ?? []
  const ldAnswered = ldQuestions.filter((q) => answers[q.id] !== undefined).length

  const filteredStudents = useMemo(() => {
    if (!students) return []
    if (!searchQuery.trim()) return students

    const query = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.student_number?.includes(query) ||
        s.classroom?.name?.toLowerCase().includes(query)
    )
  }, [students, searchQuery])

  const selectedType = REFERRAL_TYPES.find((t) => t.value === referralType)

  const canSubmit = Boolean(
    selectedStudent &&
      referralType &&
      (referralType === 'learning_difficulty'
        ? subjectId && formId && ldQuestions.length > 0 && ldAnswered === ldQuestions.length
        : description.trim().length >= 10),
  )

  /** ما ينقص بالضبط — يُكتب في `title` الزر المعطَّل. */
  const missingHint = !selectedStudent
    ? 'اختر الطالب أولاً'
    : !referralType
      ? 'اختر نوع الإحالة'
      : referralType === 'learning_difficulty'
        ? !subjectId
          ? 'اختر المادة'
          : !formId
            ? 'اختر النموذج'
            : `بقي ${ldQuestions.length - ldAnswered} سؤالاً بلا إجابة`
        : 'اكتب وصفاً لا يقل عن عشرة أحرف'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit || !selectedStudent || !referralType) return

    if (referralType === 'learning_difficulty') {
      try {
        await submitLd.mutateAsync({
          form_id: formId as number,
          student_id: selectedStudent.id,
          subject_id: subjectId as number,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            question_id: Number(questionId),
            answer,
          })),
          teacher_notes: description.trim() || undefined,
          priority,
        })

        navigate('/teacher/referrals', { replace: true })
      } catch (err) {
        console.error('Error creating learning-difficulty referral:', err)
        alert('حدث خطأ أثناء إرسال النموذج')
      }

      return
    }

    try {
      await createMutation.mutateAsync({
        student_id: selectedStudent.id,
        referral_type: referralType,
        priority,
        description: description.trim(),
      })

      navigate('/teacher/referrals', { replace: true })
    } catch (err) {
      console.error('Error creating referral:', err)
      alert('حدث خطأ أثناء إنشاء الإحالة')
    }
  }

  return (
    <section className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          <i className="bi bi-arrow-right text-lg" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">إحالة طالب جديدة</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">إحالة طالب للإدارة للمتابعة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Student */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-xs font-bold text-sky-600 dark:text-sky-400">1</span>
            اختيار الطالب
          </h2>

          {selectedStudent ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950">
                  <i className="bi bi-person text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedStudent.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedStudent.student_number} • {selectedStudent.classroom?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null)
                  setShowStudentPicker(true)
                }}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300"
              >
                تغيير
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowStudentPicker(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              <i className="bi bi-person-plus text-xl" />
              <span>اضغط لاختيار الطالب</span>
            </button>
          )}
        </div>

        {/* Step 2: Select Referral Type */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-xs font-bold text-sky-600 dark:text-sky-400">2</span>
            نوع الإحالة
          </h2>

          <div className="grid gap-3">
            {REFERRAL_TYPES.filter(
              (type) => type.value !== 'learning_difficulty' || ldAvailable,
            ).map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setReferralType(type.value)}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 text-right transition-all ${
                  referralType === type.value
                    ? TYPE_STYLES[type.color].selected
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  TYPE_STYLES[type.color].iconBg
                }`}>
                  <i className={`${type.icon} text-xl ${
                    TYPE_STYLES[type.color].iconText
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{type.label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{type.description}</p>
                </div>
                {referralType === type.value && (
                  <i className={`bi bi-check-circle-fill text-xl ${
                    TYPE_STYLES[type.color].check
                  }`} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* صعوبات التعلّم: المادة ثم النموذج ثم الأسئلة */}
        {referralType === 'learning_difficulty' && (
          <div className="glass-card p-4 space-y-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950 text-xs font-bold text-purple-600 dark:text-purple-400">3</span>
              نموذج الفحص المبدئي
            </h2>

            {/* المادة — النطاق والاستجابة كلاهما يُمفتحان بها فلا تُخمَّن */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">عن أي مادة؟</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ldSubjects.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">لا مواد مسجّلة لك مع هذا الطالب</p>
                )}
                {ldSubjects.map((subject) => (
                  <button
                    key={subject.subject_id}
                    type="button"
                    onClick={() => setSubjectId(subject.subject_id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      subjectId === subject.subject_id
                        ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-950 dark:text-purple-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {subject.subject_name}
                  </button>
                ))}
              </div>
            </div>

            {/* النموذج */}
            {subjectId && (
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">النموذج</label>
                <div className="mt-2 space-y-2">
                  {ldForms.map((form) => (
                    <button
                      key={form.id}
                      type="button"
                      onClick={() => {
                        setFormId(form.id)
                        setAnswers({})
                      }}
                      className={`w-full rounded-lg border p-3 text-right transition-colors ${
                        formId === form.id
                          ? 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-950'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      <p className="font-medium text-slate-900 dark:text-slate-100">{form.title}</p>
                      {form.description && (
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{form.description}</p>
                      )}
                      {form.existing && form.existing.count > 0 && (
                        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                          أحاله {form.existing.count} من زملائك على هذا النموذج — إحالتك تُضاف
                          <strong> كشهادة إضافية</strong> لا كتكرار.
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* الأسئلة: نعم/لا بلا حالة ثالثة، وبلا أي نقاط */}
            {activeLdForm && (
              <div className="space-y-4">
                {activeLdForm.sections.map((section) => {
                  const answeredInSection = section.questions.filter(
                    (question) => answers[question.id] !== undefined,
                  ).length

                  return (
                    <div key={section.id} className="rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{section.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {answeredInSection}/{section.questions.length}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {section.questions.map((question) => (
                          <div key={question.id} className="flex items-center gap-3 px-3 py-2">
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                              {question.text}
                            </span>

                            <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                              {[
                                { value: true, label: 'نعم' },
                                { value: false, label: 'لا' },
                              ].map((option) => (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() =>
                                    setAnswers((prev) => ({ ...prev, [question.id]: option.value }))
                                  }
                                  className={`px-3 py-1 text-sm transition-colors ${
                                    answers[question.id] === option.value
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  أُجيب {ldAnswered} من {ldQuestions.length} سؤالاً
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Priority & Description */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950 text-xs font-bold text-sky-600 dark:text-sky-400">3</span>
            تفاصيل الإحالة
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              درجة الأهمية
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    priority === p.value
                      ? p.color === 'slate'
                        ? 'bg-slate-600 text-white'
                        : p.color === 'blue'
                        ? 'bg-blue-600 text-white'
                        : p.color === 'orange'
                        ? 'bg-orange-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              وصف الحالة <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                referralType === 'academic_weakness'
                  ? 'اكتب وصفاً للمشكلة الدراسية التي يعاني منها الطالب...'
                  : 'اكتب وصفاً للمخالفة السلوكية التي ارتكبها الطالب...'
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {description.length}/10 حرف على الأقل
            </p>
          </div>
        </div>

        {/* Summary */}
        {selectedStudent && referralType && (
          <div className="glass-card p-4 bg-gradient-to-br from-sky-50 dark:from-sky-950 to-slate-50 dark:to-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">ملخص الإحالة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">الطالب:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">نوع الإحالة:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedType?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">سيتم التحويل إلى:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedType?.targetRole}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit || createMutation.isPending || submitLd.isPending}
          title={canSubmit ? undefined : missingHint}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-base font-medium text-white hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending || submitLd.isPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <i className="bi bi-send" />
              إرسال الإحالة
            </>
          )}
        </button>
      </form>

      {/* Student Picker Modal */}
      {showStudentPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">اختيار الطالب</h3>
              <button
                onClick={() => setShowStudentPicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <i className="bi bi-x-lg text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الطالب..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 py-2 pr-10 pl-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-1">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student)
                        setShowStudentPicker(false)
                        setSearchQuery('')
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-right hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                        <i className="bi bi-person text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {student.student_number} • {student.classroom?.name}
                        </p>
                      </div>
                      <i className="bi bi-chevron-left text-slate-400 dark:text-slate-500" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="bi bi-search text-4xl text-slate-300 dark:text-slate-500" />
                  <p className="mt-2 text-slate-500 dark:text-slate-400">لا توجد نتائج</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

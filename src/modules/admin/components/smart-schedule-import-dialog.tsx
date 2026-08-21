import { useState, useCallback, useMemo } from 'react'
import {
  X, Upload, Check, AlertTriangle, User, BookOpen, GraduationCap, FileText,
  ArrowLeft, ArrowRight, Plus, UserX, Info, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreviewSmartScheduleMutation, useConfirmSmartScheduleMutation } from '../hooks'
import type {
  SmartSchedulePreviewData,
  SmartScheduleMatchedTeacher,
  SmartScheduleMatchedSubject,
  SmartScheduleParsedClass,
  SmartScheduleTeacherMapping,
  SmartScheduleSubjectMapping,
  SmartScheduleClassMapping,
  SmartScheduleImportError,
} from '../types'
import type { TimeTableAvailableTeacher, TimeTableAvailableSubject } from '../types'

interface SmartScheduleImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

type WizardStep = 'upload' | 'subjects' | 'teachers' | 'classes' | 'confirm'

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: 'رفع الملف', icon: <Upload className="w-4 h-4" /> },
  { key: 'subjects', label: 'المواد', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'teachers', label: 'المعلمين', icon: <User className="w-4 h-4" /> },
  { key: 'classes', label: 'الفصول', icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'confirm', label: 'التأكيد', icon: <FileText className="w-4 h-4" /> },
]

/** قرار المدير في مادةٍ واحدة: ربطٌ بقائمة، أو إنشاءٌ باسم الملف. */
type SubjectDecision = { subjectId: number | null; create: boolean }

/** قرار المدير في معلمٍ واحد: ربطٌ بحساب، أو استبعادُ جدوله من هذه الجولة. */
type TeacherDecision = { teacherId: number | null; skip: boolean }

/**
 * استخراج تفصيل الرفض من خطأ axios.
 *
 * الخادم يردّ 422 بجسمٍ فيه `message` وقائمة `data.errors`. نقرأه بحذرٍ لأن
 * الفشل قد يكون شبكياً بلا جسمٍ أصلاً — وحينها تكفي رسالةٌ عامة.
 */
function readFailure(error: unknown): { message: string; errors: SmartScheduleImportError[] } {
  const body = (error as { response?: { data?: unknown } })?.response?.data as
    | { message?: string; data?: { errors?: SmartScheduleImportError[] } }
    | undefined

  return {
    message: body?.message ?? 'تعذّر الاستيراد. تحقّق من الاتصال ثم أعد المحاولة.',
    errors: Array.isArray(body?.data?.errors) ? body.data.errors : [],
  }
}

export function SmartScheduleImportDialog({ isOpen, onClose }: SmartScheduleImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<SmartSchedulePreviewData | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(true)

  const [subjectDecisions, setSubjectDecisions] = useState<Record<string, SubjectDecision>>({})
  const [teacherDecisions, setTeacherDecisions] = useState<Record<string, TeacherDecision>>({})
  const [classDecisions, setClassDecisions] = useState<Record<string, { grade: string; class_name: string; skip: boolean }>>({})

  // حصادُ محاولةٍ فاشلة: الخادم يرفض الاستيراد كلَّه على خطأٍ واحد، ويرسل
  // قائمةً تسمّي كلَّ حصةٍ أخفقت ولماذا. والإشعار العابر لا يتّسع لها ولا
  // يبقى، فيبقى المدير أمام «فشل ١١٦ حصة» بلا دليلٍ على أيِّها. نحتفظ
  // بالقائمة هنا ونعرضها في خطوة التأكيد حتى المحاولة التالية.
  const [failure, setFailure] = useState<{ message: string; errors: SmartScheduleImportError[] } | null>(null)

  const previewMutation = usePreviewSmartScheduleMutation()
  const confirmMutation = useConfirmSmartScheduleMutation()

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    previewMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setPreviewData(data)

        // المواد: المقترَح يُنتقى مسبقاً. مطابقة الجذر هنا دقيقة («الفنية» ⇐
        // «التربية الفنية»)، وثمن رفضها ليس توقّفاً بل إنشاءُ نسخةٍ ثانية من
        // المادة نفسها — وهو ضررٌ دائم يصعب تنظيفه لاحقاً.
        const subjects: Record<string, SubjectDecision> = {}
        data.subjects.forEach((s) => {
          subjects[s.key] = { subjectId: s.match?.id ?? null, create: !s.match }
        })
        setSubjectDecisions(subjects)

        // المعلمون: المقترَح **لا** يُنتقى. الأسماء العربية الكاملة تتشابه
        // بنيوياً، وربطُ جدولٍ بمعلمٍ خاطئ يُعلّق في رقبته حضورَ زميله ونصابَه.
        const teachers: Record<string, TeacherDecision> = {}
        data.teachers.forEach((t) => {
          teachers[t.key] = { teacherId: t.status === 'matched' ? (t.match?.id ?? null) : null, skip: false }
        })
        setTeacherDecisions(teachers)

        const classes: Record<string, { grade: string; class_name: string; skip: boolean }> = {}
        data.classes.forEach((c) => {
          classes[c.key] = { grade: c.grade, class_name: c.class_name, skip: false }
        })
        setClassDecisions(classes)

        setCurrentStep('subjects')
      },
    })
  }, [previewMutation])

  const handleClose = useCallback(() => {
    setCurrentStep('upload')
    setFile(null)
    setPreviewData(null)
    setSubjectDecisions({})
    setTeacherDecisions({})
    setClassDecisions({})
    setReplaceExisting(true)
    setFailure(null)
    onClose()
  }, [onClose])

  const handleConfirm = useCallback(() => {
    if (!file || !previewData) return

    const teacher_mappings: SmartScheduleTeacherMapping[] = Object.entries(teacherDecisions).map(
      ([key, d]) => ({ key, teacher_id: d.teacherId, skip: d.skip }),
    )
    const subject_mappings: SmartScheduleSubjectMapping[] = Object.entries(subjectDecisions).map(
      ([key, d]) => ({ key, subject_id: d.subjectId, create: d.create }),
    )
    const class_mappings: SmartScheduleClassMapping[] = Object.entries(classDecisions).map(
      ([key, d]) => ({ key, grade: d.grade, class_name: d.class_name, skip: d.skip }),
    )

    setFailure(null)

    confirmMutation.mutate(
      { file, teacher_mappings, subject_mappings, class_mappings, replace_existing: replaceExisting },
      {
        onSuccess: handleClose,
        onError: (error) => setFailure(readFailure(error)),
      },
    )
  }, [file, previewData, teacherDecisions, subjectDecisions, classDecisions, replaceExisting, confirmMutation, handleClose])

  /** كل مادة إما مربوطة أو مطلوبٌ إنشاؤها — لا مادة معلّقة. */
  const allSubjectsDecided = useMemo(() => {
    if (!previewData) return false
    return previewData.subjects.every((s) => {
      const d = subjectDecisions[s.key]
      return d && (d.subjectId != null || d.create)
    })
  }, [previewData, subjectDecisions])

  /** كل معلم إما مربوط أو مستبعَد صراحةً. */
  const allTeachersDecided = useMemo(() => {
    if (!previewData) return false
    return previewData.teachers.every((t) => {
      const d = teacherDecisions[t.key]
      return d && (d.teacherId != null || d.skip)
    })
  }, [previewData, teacherDecisions])

  const hasConflicts = useMemo(() => {
    if (!previewData) return false
    return previewData.conflicts.class.length > 0 || previewData.conflicts.teacher.length > 0
  }, [previewData])

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'upload': return file !== null && !previewMutation.isPending
      case 'subjects': return allSubjectsDecided
      case 'teachers': return allTeachersDecided
      case 'classes': return Object.values(classDecisions).some((c) => !c.skip)
      case 'confirm': return !confirmMutation.isPending && !hasConflicts
      default: return false
    }
  }, [currentStep, file, previewMutation.isPending, allSubjectsDecided, allTeachersDecided, classDecisions, confirmMutation.isPending, hasConflicts])

  const goNext = useCallback(() => {
    const i = STEPS.findIndex((s) => s.key === currentStep)
    if (i < STEPS.length - 1) setCurrentStep(STEPS[i + 1].key)
  }, [currentStep])

  const goBack = useCallback(() => {
    const i = STEPS.findIndex((s) => s.key === currentStep)
    if (i > 0) setCurrentStep(STEPS[i - 1].key)
  }, [currentStep])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-l from-violet-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">استيراد من الجدول الذكي</h2>
              <p className="text-sm text-slate-500">
                {previewData?.school_name
                  ? `${previewData.school_name} · ${previewData.cards_count} حصة`
                  : 'مصنّف Excel فيه ورقةٌ لكل معلم'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 border-b">
          {STEPS.map((step, index) => {
            const isActive = step.key === currentStep
            const isPast = STEPS.findIndex((s) => s.key === currentStep) > index
            return (
              <div key={step.key} className="flex items-center">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isActive && 'bg-violet-100 text-violet-700',
                  isPast && 'bg-violet-500 text-white',
                  !isActive && !isPast && 'bg-slate-200 text-slate-500',
                )}>
                  {isPast ? <Check className="w-4 h-4" /> : step.icon}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn('w-8 h-0.5 mx-1', isPast ? 'bg-violet-500' : 'bg-slate-200')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'upload' && (
            <UploadStep
              file={file}
              onFileSelect={handleFileSelect}
              isLoading={previewMutation.isPending}
              error={previewMutation.error}
            />
          )}
          {currentStep === 'subjects' && previewData && (
            <SubjectsStep
              subjects={previewData.subjects}
              availableSubjects={previewData.available_subjects}
              decisions={subjectDecisions}
              onChange={(key, d) => setSubjectDecisions((prev) => ({ ...prev, [key]: d }))}
            />
          )}
          {currentStep === 'teachers' && previewData && (
            <TeachersStep
              teachers={previewData.teachers}
              availableTeachers={previewData.available_teachers}
              decisions={teacherDecisions}
              onChange={(key, d) => setTeacherDecisions((prev) => ({ ...prev, [key]: d }))}
            />
          )}
          {currentStep === 'classes' && previewData && (
            <ClassesStep
              classes={previewData.classes}
              decisions={classDecisions}
              onChange={(key, d) => setClassDecisions((prev) => ({ ...prev, [key]: d }))}
            />
          )}
          {currentStep === 'confirm' && previewData && (
            <ConfirmStep
              previewData={previewData}
              subjectDecisions={subjectDecisions}
              teacherDecisions={teacherDecisions}
              classDecisions={classDecisions}
              replaceExisting={replaceExisting}
              onReplaceExistingChange={setReplaceExisting}
              failure={failure}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
          <button
            onClick={currentStep === 'upload' ? handleClose : goBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {currentStep === 'upload' ? 'إلغاء' : 'السابق'}
          </button>

          {currentStep === 'confirm' ? (
            <button
              onClick={handleConfirm}
              disabled={!canProceed}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {confirmMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  تأكيد الاستيراد
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed}
              className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
              التالي
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============== شارة الثقة ==============

function MatchBadge({ status, score }: { status: string; score?: number }) {
  if (status === 'matched') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <Check className="w-3 h-3" /> مطابَق
      </span>
    )
  }
  if (status === 'suggested') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <AlertTriangle className="w-3 h-3" /> مقترح {score != null && `${Math.round(score)}٪`}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
      غير مطابَق
    </span>
  )
}

// ============== خطوة الرفع ==============

interface UploadStepProps {
  file: File | null
  onFileSelect: (file: File) => void
  isLoading: boolean
  error: unknown
}

function UploadStep({ file, onFileSelect, isLoading, error }: UploadStepProps) {
  return (
    <div className="space-y-4">
      <label
        className={cn(
          'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 cursor-pointer transition-colors',
          isLoading ? 'border-slate-200 bg-slate-50 cursor-wait' : 'border-violet-300 hover:border-violet-500 hover:bg-violet-50',
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          disabled={isLoading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileSelect(f)
          }}
        />
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
            <span className="text-sm text-slate-600">جاري قراءة المصنّف…</span>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-violet-400" />
            <span className="text-sm font-medium text-slate-700">
              {file ? file.name : 'اختر ملف الجدول الذكي (xlsx)'}
            </span>
            <span className="text-xs text-slate-500">تصدير «جداول المعلمين» — ورقةٌ لكل معلم</span>
          </>
        )}
      </label>

      {error != null && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>تعذّرت قراءة الملف. تأكّد أنه تصدير «جداول المعلمين» من برنامج الجدول الذكي.</span>
        </div>
      )}

      <div className="p-4 rounded-lg bg-slate-50 border text-sm text-slate-600 space-y-1.5">
        <p className="font-medium text-slate-700">ما يفعله هذا الاستيراد</p>
        <ul className="space-y-1 list-disc pr-5">
          <li>يقرأ كل ورقة معلم ويقلب الجدول إلى حصص فصول</li>
          <li>يفكّ خلية «سادس 4 رياضيات» إلى صفٍّ وفصلٍ ومادة</li>
          <li>يطابق المواد بالمسجّلة، ويُنشئ ما لم يُسجَّل بعد</li>
          <li>يطابق المعلمين بحساباتهم — ولا يُنشئ حساباً بلا رقم هوية</li>
        </ul>
      </div>
    </div>
  )
}

// ============== خطوة المواد ==============

interface SubjectsStepProps {
  subjects: SmartScheduleMatchedSubject[]
  availableSubjects: TimeTableAvailableSubject[]
  decisions: Record<string, SubjectDecision>
  onChange: (key: string, decision: SubjectDecision) => void
}

function SubjectsStep({ subjects, availableSubjects, decisions, onChange }: SubjectsStepProps) {
  const toCreate = subjects.filter((s) => decisions[s.key]?.create).length

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          الجدول الذكي يكتب المواد مختصرةً («الفنية»، «حياتية»)، وقد رُبطت بما يقابلها في مدرستك.
          راجِع المقترَحات باللون البرتقالي — ربطُها بالمادة الصحيحة أفضل من إنشاء نسخةٍ ثانية منها.
        </span>
      </div>

      {toCreate > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <Plus className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>ستُنشأ {toCreate} مادة جديدة عند التأكيد.</span>
        </div>
      )}

      <div className="space-y-2">
        {subjects.map((s) => {
          const d = decisions[s.key] ?? { subjectId: null, create: false }
          return (
            <div key={s.key} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 truncate">{s.name}</span>
                  <MatchBadge status={s.status} score={s.match?.score} />
                </div>
              </div>

              <select
                value={d.create ? '__create__' : (d.subjectId ?? '')}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__create__') onChange(s.key, { subjectId: null, create: true })
                  else if (v === '') onChange(s.key, { subjectId: null, create: false })
                  else onChange(s.key, { subjectId: Number(v), create: false })
                }}
                className={cn(
                  'w-72 px-3 py-1.5 rounded-lg border text-sm bg-white',
                  d.create && 'border-emerald-400 text-emerald-700',
                  !d.create && d.subjectId == null && 'border-red-300',
                )}
              >
                <option value="">— اختر مادة —</option>
                <option value="__create__">➕ إنشاء «{s.name}» كمادة جديدة</option>
                {availableSubjects.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============== خطوة المعلمين ==============

interface TeachersStepProps {
  teachers: SmartScheduleMatchedTeacher[]
  availableTeachers: TimeTableAvailableTeacher[]
  decisions: Record<string, TeacherDecision>
  onChange: (key: string, decision: TeacherDecision) => void
}

function TeachersStep({ teachers, availableTeachers, decisions, onChange }: TeachersStepProps) {
  const undecided = teachers.filter((t) => {
    const d = decisions[t.key]
    return !d || (d.teacherId == null && !d.skip)
  })
  const skippedCards = teachers.reduce((sum, t) => (decisions[t.key]?.skip ? sum + t.cards : sum), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          المقترَحات هنا <b>غير مختارة عمداً</b>: الأسماء العربية الكاملة تتشابه، وربطُ جدولٍ بمعلمٍ خاطئ
          يُعلّق حضورَه ونصابَه في رقبة زميله. ولا يمكن إنشاء حساب معلم من هنا لأن الملف لا يحمل أرقام
          الهويات — أضِفه من صفحة المعلمين، أو استبعِد جدوله في هذه الجولة.
        </span>
      </div>

      {undecided.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          بقي {undecided.length} معلماً بلا قرار — اربِطه بحساب أو استبعِد جدوله.
        </div>
      )}

      {skippedCards > 0 && (
        <div className="p-3 rounded-lg bg-slate-100 border text-sm text-slate-600">
          ستُستبعَد {skippedCards} حصة لمعلمين لم تُربَط جداولهم.
        </div>
      )}

      <div className="space-y-2">
        {teachers.map((t) => {
          const d = decisions[t.key] ?? { teacherId: null, skip: false }
          const undecidedRow = d.teacherId == null && !d.skip
          return (
            <div
              key={t.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                d.skip ? 'bg-slate-50 opacity-70' : 'bg-white',
                undecidedRow && 'border-red-300',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium truncate', d.skip ? 'text-slate-500 line-through' : 'text-slate-900')}>
                    {t.name}
                  </span>
                  <MatchBadge status={t.status} score={t.match?.score} />
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.cards} حصة
                  {t.status === 'suggested' && t.match && ` · المقترح: ${t.match.name}`}
                </div>
              </div>

              <select
                value={d.skip ? '__skip__' : (d.teacherId ?? '')}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__skip__') onChange(t.key, { teacherId: null, skip: true })
                  else if (v === '') onChange(t.key, { teacherId: null, skip: false })
                  else onChange(t.key, { teacherId: Number(v), skip: false })
                }}
                className={cn(
                  'w-72 px-3 py-1.5 rounded-lg border text-sm bg-white',
                  d.skip && 'border-slate-300 text-slate-500',
                  undecidedRow && 'border-red-300',
                )}
              >
                <option value="">— اختر معلماً —</option>
                <option value="__skip__">⊘ استبعاد جدوله ({t.cards} حصة)</option>
                {availableTeachers.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {d.skip && <UserX className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============== خطوة الفصول ==============

interface ClassesStepProps {
  classes: SmartScheduleParsedClass[]
  decisions: Record<string, { grade: string; class_name: string; skip: boolean }>
  onChange: (key: string, decision: { grade: string; class_name: string; skip: boolean }) => void
}

function ClassesStep({ classes, decisions, onChange }: ClassesStepProps) {
  const unknown = classes.filter((c) => !c.exists)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>حُوّل اسم الفصل من صيغة الملف إلى صيغة النظام. عدّله إن لزم، أو استبعِده من الاستيراد.</span>
      </div>

      {unknown.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {unknown.length} فصلاً في الملف بلا طلاب مسجّلين في النظام
            ({unknown.map((c) => `${c.grade}/${c.class_name}`).join('، ')}).
            سيُستورد جدولها، لكن الحضور لن يعمل حتى يُسجَّل طلابها.
          </span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {classes.map((c) => {
          const d = decisions[c.key] ?? { grade: c.grade, class_name: c.class_name, skip: false }
          return (
            <div
              key={c.key}
              className={cn('flex items-center gap-2 p-3 rounded-lg border', d.skip ? 'bg-slate-50 opacity-60' : 'bg-white')}
            >
              <span className="text-sm text-slate-500 w-20 flex-shrink-0 truncate">{c.key}</span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                value={d.grade}
                onChange={(e) => onChange(c.key, { ...d, grade: e.target.value })}
                disabled={d.skip}
                className="flex-1 min-w-0 px-2 py-1 rounded border text-sm disabled:bg-slate-100"
              />
              <input
                value={d.class_name}
                onChange={(e) => onChange(c.key, { ...d, class_name: e.target.value })}
                disabled={d.skip}
                className="w-14 px-2 py-1 rounded border text-sm disabled:bg-slate-100"
              />
              {!c.exists && !d.skip && (
                <span title="لا طلاب مسجّلون في هذا الفصل">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                </span>
              )}
              <label className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.skip}
                  onChange={(e) => onChange(c.key, { ...d, skip: e.target.checked })}
                />
                استبعاد
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============== خطوة التأكيد ==============

interface ConfirmStepProps {
  previewData: SmartSchedulePreviewData
  subjectDecisions: Record<string, SubjectDecision>
  teacherDecisions: Record<string, TeacherDecision>
  classDecisions: Record<string, { grade: string; class_name: string; skip: boolean }>
  replaceExisting: boolean
  onReplaceExistingChange: (value: boolean) => void
  failure: { message: string; errors: SmartScheduleImportError[] } | null
}

function ConfirmStep({
  previewData, subjectDecisions, teacherDecisions, classDecisions,
  replaceExisting, onReplaceExistingChange, failure,
}: ConfirmStepProps) {
  const subjectsToCreate = Object.values(subjectDecisions).filter((d) => d.create).length
  const skippedTeachers = previewData.teachers.filter((t) => teacherDecisions[t.key]?.skip)
  const skippedTeacherCards = skippedTeachers.reduce((sum, t) => sum + t.cards, 0)
  const activeClasses = Object.values(classDecisions).filter((c) => !c.skip).length
  const conflicts = previewData.conflicts
  const hasConflicts = conflicts.class.length > 0 || conflicts.teacher.length > 0

  return (
    <div className="space-y-4">
      {failure && <FailurePanel failure={failure} />}

      {hasConflicts && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-sm text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            تعارضات تمنع الاستيراد
          </div>
          {conflicts.class.map((c, i) => (
            <div key={`c${i}`}>
              الفصل {c.class} — {c.day} حصة {c.period}: {c.teachers.join(' و ')}
            </div>
          ))}
          {conflicts.teacher.map((t, i) => (
            <div key={`t${i}`}>
              المعلم {t.teacher} — {t.day} حصة {t.period}: {t.classes.join(' و ')}
            </div>
          ))}
          <div className="pt-1 text-xs">صحّحها في برنامج الجدول الذكي ثم أعد التصدير.</div>
        </div>
      )}

      {previewData.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
          <div className="font-medium">تنبيهات قراءة الملف</div>
          {previewData.warnings.slice(0, 6).map((w, i) => <div key={i}>· {w}</div>)}
          {previewData.warnings.length > 6 && <div>· و{previewData.warnings.length - 6} تنبيهاً آخر</div>}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="حصص الملف" value={previewData.cards_count} />
        <SummaryTile label="فصول ستُستورد" value={activeClasses} />
        <SummaryTile label="مواد ستُنشأ" value={subjectsToCreate} tone={subjectsToCreate > 0 ? 'emerald' : 'slate'} />
        <SummaryTile label="حصص مستبعَدة" value={skippedTeacherCards} tone={skippedTeacherCards > 0 ? 'amber' : 'slate'} />
      </div>

      {skippedTeachers.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-50 border text-sm text-slate-600">
          <div className="font-medium text-slate-700 mb-1">معلمون مستبعَدون ({skippedTeachers.length})</div>
          {skippedTeachers.map((t) => t.name).join('، ')}
        </div>
      )}

      <label className="flex items-start gap-3 p-4 rounded-lg border bg-white cursor-pointer">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => onReplaceExistingChange(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="font-medium text-slate-900">استبدال الجدول القائم لهذه الفصول</span>
          <span className="block text-slate-500 mt-0.5">
            تُحذف حصص الفصول المستوردة وحدها ثم تُكتب من جديد. ودون ذلك يُضاف الجديد فوق القديم،
            فتصطدم أي حصةٍ تشغل الموضع نفسه ويتوقّف الاستيراد كله.
          </span>
        </span>
      </label>

      <div className="p-3 rounded-lg bg-slate-50 border text-xs text-slate-500">
        الاستيراد كلّه أو لا شيء: إن أخفقت حصةٌ واحدة لم يُحفظ شيء، وتصلك قائمةٌ بما أخفق ولماذا.
      </div>
    </div>
  )
}

/**
 * تفصيل الرفض: ما أخفق، وأين، ولماذا.
 *
 * الأخطاء تتكرّر بالسبب نفسه عشرات المرات («لا يوجد توقيت للحصة رقم 5»)،
 * فسردُها صفّاً صفّاً يدفن المعلومة في الضجيج. نجمعها بالسبب ونُظهر مع كل
 * سببٍ عدَده وأمثلةً منه — فيرى المدير في سطرٍ واحد أن العلّة واحدة، وأن
 * علاجها في التوقيت لا في الملف.
 */
function FailurePanel({ failure }: { failure: { message: string; errors: SmartScheduleImportError[] } }) {
  const grouped = useMemo(() => {
    const byReason = new Map<string, SmartScheduleImportError[]>()
    failure.errors.forEach((e) => {
      const list = byReason.get(e.reason)
      if (list) list.push(e)
      else byReason.set(e.reason, [e])
    })
    return [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [failure.errors])

  return (
    <div className="p-4 rounded-lg bg-red-50 border border-red-300 space-y-3">
      <div className="flex items-start gap-2 text-sm font-bold text-red-800">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{failure.message}</span>
      </div>

      {grouped.length > 0 && (
        <div className="space-y-2">
          {grouped.slice(0, 6).map(([reason, items]) => (
            <div key={reason} className="p-2.5 rounded bg-white border border-red-200 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold tabular-nums flex-shrink-0">
                  {items.length}
                </span>
                <span className="text-slate-800">{reason}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                مثل: {items.slice(0, 3).map((e) => `${e.class} · ${e.day} ح${e.period}`).join(' — ')}
                {items.length > 3 && ` — و${items.length - 3} غيرها`}
              </div>
            </div>
          ))}
          {grouped.length > 6 && (
            <div className="text-xs text-red-700">و{grouped.length - 6} سبباً آخر.</div>
          )}
        </div>
      )}

      <div className="text-xs text-red-700">
        لم يُحفظ شيء — جدولك القائم كما هو. صحّح ما سبق ثم أعد المحاولة.
      </div>
    </div>
  )
}

function SummaryTile({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' | 'amber' }) {
  return (
    <div className={cn(
      'p-3 rounded-lg border text-center',
      tone === 'emerald' && 'bg-emerald-50 border-emerald-200',
      tone === 'amber' && 'bg-amber-50 border-amber-200',
      tone === 'slate' && 'bg-slate-50',
    )}>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

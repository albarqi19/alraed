import { useState, useCallback, useMemo } from 'react'
import { X, Upload, Check, AlertTriangle, User, BookOpen, GraduationCap, FileText, ArrowLeft, ArrowRight, Search, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreviewTimeTableMutation, useConfirmTimeTableMutation } from '../hooks'
import type {
  TimeTablePreviewData,
  TimeTableMatchedTeacher,
  TimeTableMatchedSubject,
  TimeTableParsedClass,
  TimeTableTeacherMapping,
  TimeTableSubjectMapping,
  TimeTableClassMapping,
} from '../types'

interface TimeTableImportDialogProps {
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

export function TimeTableImportDialog({ isOpen, onClose }: TimeTableImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TimeTablePreviewData | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(true)

  // Mappings state
  const [subjectMappings, setSubjectMappings] = useState<Record<string, number | null>>({})
  const [teacherMappings, setTeacherMappings] = useState<Record<string, number | null>>({})
  const [classMappings, setClassMappings] = useState<Record<string, { grade: string; class_name: string }>>({})

  const previewMutation = usePreviewTimeTableMutation()
  const confirmMutation = useConfirmTimeTableMutation()

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    previewMutation.mutate(selectedFile, {
      onSuccess: (data) => {
        setPreviewData(data)
        // Initialize mappings
        const subjectMap: Record<string, number | null> = {}
        data.subjects.forEach((s) => {
          subjectMap[s.xml_id] = s.match?.id ?? null
        })
        setSubjectMappings(subjectMap)

        const teacherMap: Record<string, number | null> = {}
        data.teachers.forEach((t) => {
          teacherMap[t.xml_id] = t.match?.id ?? null
        })
        setTeacherMappings(teacherMap)

        const classMap: Record<string, { grade: string; class_name: string }> = {}
        data.classes.forEach((c) => {
          classMap[c.xml_id] = { grade: c.parsed_grade, class_name: c.parsed_class }
        })
        setClassMappings(classMap)

        setCurrentStep('subjects')
      },
    })
  }, [previewMutation])

  const handleConfirm = useCallback(() => {
    if (!file || !previewData) return

    const teacherMappingsArray: TimeTableTeacherMapping[] = Object.entries(teacherMappings).map(([xml_id, teacher_id]) => ({
      xml_id,
      teacher_id,
    }))

    const subjectMappingsArray: TimeTableSubjectMapping[] = Object.entries(subjectMappings).map(([xml_id, subject_id]) => ({
      xml_id,
      subject_id,
    }))

    const classMappingsArray: TimeTableClassMapping[] = Object.entries(classMappings).map(([xml_id, mapping]) => ({
      xml_id,
      grade: mapping.grade,
      class_name: mapping.class_name,
    }))

    confirmMutation.mutate(
      {
        file,
        teacher_mappings: teacherMappingsArray,
        subject_mappings: subjectMappingsArray,
        class_mappings: classMappingsArray,
        replace_existing: replaceExisting,
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }, [file, previewData, teacherMappings, subjectMappings, classMappings, replaceExisting, confirmMutation])

  const handleClose = useCallback(() => {
    setCurrentStep('upload')
    setFile(null)
    setPreviewData(null)
    setSubjectMappings({})
    setTeacherMappings({})
    setClassMappings({})
    setReplaceExisting(true)
    onClose()
  }, [onClose])

  // Check if all subjects are mapped
  const allSubjectsMapped = useMemo(() => {
    if (!previewData) return false
    return previewData.subjects.every((s) => subjectMappings[s.xml_id] != null)
  }, [previewData, subjectMappings])

  // Check if all teachers are mapped
  const allTeachersMapped = useMemo(() => {
    if (!previewData) return false
    return previewData.teachers.every((t) => teacherMappings[t.xml_id] != null)
  }, [previewData, teacherMappings])

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'upload':
        return file !== null && !previewMutation.isPending
      case 'subjects':
        return allSubjectsMapped
      case 'teachers':
        return allTeachersMapped
      case 'classes':
        return true
      case 'confirm':
        return !confirmMutation.isPending
      default:
        return false
    }
  }, [currentStep, file, previewMutation.isPending, allSubjectsMapped, allTeachersMapped, confirmMutation.isPending])

  const goNext = useCallback(() => {
    const stepIndex = STEPS.findIndex((s) => s.key === currentStep)
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].key)
    }
  }, [currentStep])

  const goBack = useCallback(() => {
    const stepIndex = STEPS.findIndex((s) => s.key === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key)
    }
  }, [currentStep])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-l from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">استيراد من TimeTable</h2>
              <p className="text-sm text-slate-500">استيراد جداول الحصص من برنامج aSc TimeTable</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 border-b">
          {STEPS.map((step, index) => {
            const isActive = step.key === currentStep
            const isPast = STEPS.findIndex((s) => s.key === currentStep) > index
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    isActive && 'bg-emerald-100 text-emerald-700',
                    isPast && 'bg-emerald-500 text-white',
                    !isActive && !isPast && 'bg-slate-200 text-slate-500'
                  )}
                >
                  {isPast ? <Check className="w-4 h-4" /> : step.icon}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn('w-8 h-0.5 mx-1', isPast ? 'bg-emerald-500' : 'bg-slate-200')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Content */}
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
              mappings={subjectMappings}
              onMappingChange={(xmlId, subjectId) => setSubjectMappings((prev) => ({ ...prev, [xmlId]: subjectId }))}
            />
          )}
          {currentStep === 'teachers' && previewData && (
            <TeachersStep
              teachers={previewData.teachers}
              availableTeachers={previewData.available_teachers}
              mappings={teacherMappings}
              onMappingChange={(xmlId, teacherId) => setTeacherMappings((prev) => ({ ...prev, [xmlId]: teacherId }))}
            />
          )}
          {currentStep === 'classes' && previewData && (
            <ClassesStep
              classes={previewData.classes}
              mappings={classMappings}
              onMappingChange={(xmlId, grade, className) =>
                setClassMappings((prev) => ({ ...prev, [xmlId]: { grade, class_name: className } }))
              }
            />
          )}
          {currentStep === 'confirm' && previewData && (
            <ConfirmStep
              previewData={previewData}
              subjectMappings={subjectMappings}
              teacherMappings={teacherMappings}
              replaceExisting={replaceExisting}
              onReplaceExistingChange={setReplaceExisting}
            />
          )}
        </div>

        {/* Footer */}
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
              disabled={!canProceed || confirmMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
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
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
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

// ============== Upload Step ==============
interface UploadStepProps {
  file: File | null
  onFileSelect: (file: File) => void
  isLoading: boolean
  error: Error | null
}

function UploadStep({ file, onFileSelect, isLoading, error }: UploadStepProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && (droppedFile.name.endsWith('.xml') || droppedFile.type === 'text/xml')) {
        onFileSelect(droppedFile)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        onFileSelect(selectedFile)
      }
    },
    [onFileSelect]
  )

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">رفع ملف TimeTable</h3>
        <p className="text-sm text-slate-500">
          اختر ملف XML المصدّر من برنامج aSc TimeTable
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          isLoading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4" />
            <p className="text-emerald-700 font-medium">جاري تحليل الملف...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-emerald-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-medium text-slate-900 mb-1">{file.name}</p>
            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-3 bg-slate-100 rounded-full mb-4">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 mb-2">اسحب الملف هنا أو</p>
            <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
              اختر ملف
              <input type="file" accept=".xml" onChange={handleFileInput} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">خطأ في قراءة الملف</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-700 mb-2">ملاحظات:</h4>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>يجب أن يكون الملف بصيغة XML من برنامج aSc TimeTable</li>
          <li>تأكد من تصدير الجدول كاملاً (الأيام، الحصص، المعلمين، المواد)</li>
          <li>الملفات بترميز windows-1256 مدعومة</li>
        </ul>
      </div>
    </div>
  )
}

// ============== Subjects Step ==============
interface SubjectsStepProps {
  subjects: TimeTableMatchedSubject[]
  availableSubjects: { id: number; name: string }[]
  mappings: Record<string, number | null>
  onMappingChange: (xmlId: string, subjectId: number | null) => void
}

function SubjectsStep({ subjects, availableSubjects, mappings, onMappingChange }: SubjectsStepProps) {
  const [search, setSearch] = useState('')

  const filteredSubjects = useMemo(() => {
    if (!search) return subjects
    return subjects.filter((s) => s.xml_name.includes(search))
  }, [subjects, search])

  const unmatchedCount = useMemo(() => subjects.filter((s) => mappings[s.xml_id] == null).length, [subjects, mappings])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">مطابقة المواد</h3>
          <p className="text-sm text-slate-500">
            {unmatchedCount > 0 ? (
              <span className="text-amber-600">{unmatchedCount} مادة تحتاج مطابقة</span>
            ) : (
              <span className="text-emerald-600">جميع المواد متطابقة</span>
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="pr-9 pl-4 py-2 border rounded-lg text-sm w-48"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المادة من الملف</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المادة في النظام</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-24">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSubjects.map((subject) => {
              const isMatched = mappings[subject.xml_id] != null
              return (
                <tr key={subject.xml_id} className={cn(!isMatched && 'bg-amber-50/50')}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{subject.xml_name}</div>
                    {subject.xml_short && (
                      <div className="text-xs text-slate-500">({subject.xml_short})</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={mappings[subject.xml_id] ?? ''}
                      onChange={(e) => onMappingChange(subject.xml_id, e.target.value ? Number(e.target.value) : null)}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg text-sm',
                        !isMatched && 'border-amber-300 bg-amber-50'
                      )}
                    >
                      <option value="">-- اختر مادة --</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isMatched ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        متطابقة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        تحتاج مطابقة
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {unmatchedCount > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">يجب مطابقة جميع المواد للمتابعة</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            إذا لم تجد المادة في القائمة، يرجى إضافتها من صفحة إدارة المواد أولاً
          </p>
        </div>
      )}
    </div>
  )
}

// ============== Teachers Step ==============
interface TeachersStepProps {
  teachers: TimeTableMatchedTeacher[]
  availableTeachers: { id: number; name: string }[]
  mappings: Record<string, number | null>
  onMappingChange: (xmlId: string, teacherId: number | null) => void
}

function TeachersStep({ teachers, availableTeachers, mappings, onMappingChange }: TeachersStepProps) {
  const [search, setSearch] = useState('')

  const filteredTeachers = useMemo(() => {
    if (!search) return teachers
    return teachers.filter((t) => t.xml_name.includes(search))
  }, [teachers, search])

  const unmatchedCount = useMemo(() => teachers.filter((t) => mappings[t.xml_id] == null).length, [teachers, mappings])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">مطابقة المعلمين</h3>
          <p className="text-sm text-slate-500">
            {unmatchedCount > 0 ? (
              <span className="text-amber-600">{unmatchedCount} معلم يحتاج مطابقة</span>
            ) : (
              <span className="text-emerald-600">جميع المعلمين متطابقين</span>
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="pr-9 pl-4 py-2 border rounded-lg text-sm w-48"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المعلم من الملف</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">المعلم في النظام</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-24">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTeachers.map((teacher) => {
              const isMatched = mappings[teacher.xml_id] != null
              return (
                <tr key={teacher.xml_id} className={cn(!isMatched && 'bg-amber-50/50')}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{teacher.xml_name}</div>
                    {teacher.xml_short && (
                      <div className="text-xs text-slate-500">({teacher.xml_short})</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={mappings[teacher.xml_id] ?? ''}
                      onChange={(e) => onMappingChange(teacher.xml_id, e.target.value ? Number(e.target.value) : null)}
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg text-sm',
                        !isMatched && 'border-amber-300 bg-amber-50'
                      )}
                    >
                      <option value="">-- اختر معلم --</option>
                      {availableTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isMatched ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        متطابق
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        يحتاج مطابقة
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {unmatchedCount > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">يجب مطابقة جميع المعلمين للمتابعة</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            إذا لم تجد المعلم في القائمة، يرجى إضافته من صفحة إدارة المعلمين أولاً
          </p>
        </div>
      )}
    </div>
  )
}

// ============== Classes Step ==============
interface ClassesStepProps {
  classes: TimeTableParsedClass[]
  mappings: Record<string, { grade: string; class_name: string }>
  onMappingChange: (xmlId: string, grade: string, className: string) => void
}

function ClassesStep({ classes, mappings, onMappingChange }: ClassesStepProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">مراجعة الفصول</h3>
        <p className="text-sm text-slate-500">
          راجع تحويل أسماء الفصول وعدّلها إذا لزم الأمر
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الاسم من الملف</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الصف</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">الفصل</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {classes.map((cls) => {
              const mapping = mappings[cls.xml_id] || { grade: cls.parsed_grade, class_name: cls.parsed_class }
              return (
                <tr key={cls.xml_id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{cls.xml_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={mapping.grade}
                      onChange={(e) => onMappingChange(cls.xml_id, e.target.value, mapping.class_name)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={mapping.class_name}
                      onChange={(e) => onMappingChange(cls.xml_id, mapping.grade, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============== Confirm Step ==============
interface ConfirmStepProps {
  previewData: TimeTablePreviewData
  subjectMappings: Record<string, number | null>
  teacherMappings: Record<string, number | null>
  replaceExisting: boolean
  onReplaceExistingChange: (value: boolean) => void
}

function ConfirmStep({ previewData, subjectMappings: _subjectMappings, teacherMappings: _teacherMappings, replaceExisting, onReplaceExistingChange }: ConfirmStepProps) {
  const { stats } = previewData

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="p-3 bg-emerald-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">جاهز للاستيراد</h3>
        <p className="text-sm text-slate-500">راجع الملخص وأكد الاستيراد</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.total_cards}</div>
          <div className="text-sm text-slate-600">حصة</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.total_classes}</div>
          <div className="text-sm text-slate-600">فصل</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.total_teachers}</div>
          <div className="text-sm text-slate-600">معلم</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.total_subjects}</div>
          <div className="text-sm text-slate-600">مادة</div>
        </div>
      </div>

      <div className="p-4 border rounded-lg mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => onReplaceExistingChange(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <div className="font-medium text-slate-900">استبدال الحصص القديمة</div>
            <div className="text-sm text-slate-500">
              حذف جميع الحصص الموجودة للفصول المستوردة قبل إضافة الجديدة
            </div>
          </div>
        </label>
      </div>

      {replaceExisting && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">تنبيه</span>
          </div>
          <p className="text-sm text-amber-600 mt-1">
            سيتم حذف جميع الحصص الحالية للفصول المستوردة. سجلات الحضور ستبقى محفوظة.
          </p>
        </div>
      )}
    </div>
  )
}

export default TimeTableImportDialog

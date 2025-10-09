import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidanceCaseMutations, useGuidanceStudents } from '../hooks'
import type { GuidanceCaseRecord } from '../types'

const CATEGORIES = ['سلوكية', 'أكاديمية', 'اجتماعية', 'نفسية', 'صحية', 'أخرى']
const SEVERITIES: Array<GuidanceCaseRecord['severity']> = ['low', 'medium', 'high', 'critical']
const SEVERITY_LABELS = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'حرجة',
}

interface CaseFormProps {
  initialData?: Partial<GuidanceCaseRecord>
  mode?: 'create' | 'edit'
}

export function GuidanceCaseForm({ initialData, mode = 'create' }: CaseFormProps) {
  const navigate = useNavigate()
  const { data: students, isLoading: loadingStudents } = useGuidanceStudents()
  const { createCase, updateCase } = useGuidanceCaseMutations()

  const [formData, setFormData] = useState<Partial<GuidanceCaseRecord>>({
    student_id: initialData?.student_id,
    category: initialData?.category || '',
    title: initialData?.title || '',
    summary: initialData?.summary || '',
    severity: initialData?.severity || 'medium',
    tags: initialData?.tags || [],
  })

  const [tagInput, setTagInput] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const studentSearchRef = useRef<HTMLDivElement>(null)

  const sortedStudents = useMemo(() => {
    if (!students) return []
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [students])

  const selectedStudent = useMemo(
    () => sortedStudents.find((student) => student.id === formData.student_id),
    [sortedStudents, formData.student_id],
  )

  useEffect(() => {
    if (selectedStudent) {
      setStudentQuery(`${selectedStudent.name} - ${selectedStudent.grade} ${selectedStudent.class_name}`.trim())
    } else if (!mode || mode === 'create') {
      setStudentQuery('')
    }
  }, [selectedStudent, mode])

  const filteredStudents = useMemo(() => {
    if (!sortedStudents.length) return []
    if (!studentQuery.trim()) return sortedStudents.slice(0, 25)

    const lowerQuery = studentQuery.toLowerCase()
    return sortedStudents
      .filter((student) => {
        const haystack = ` ${student.name} ${student.grade} ${student.class_name} ${student.parent_name ?? ''} ${student.national_id ?? ''}`
          .toLowerCase()
        return haystack.includes(lowerQuery)
      })
      .slice(0, 25)
  }, [students, studentQuery])

  const handleSelectStudent = (studentId: number) => {
    updateField('student_id', studentId)
  const student = sortedStudents.find((item) => item.id === studentId)
    if (student) {
      setStudentQuery(`${student.name} - ${student.grade} ${student.class_name}`.trim())
    }
    setIsStudentDropdownOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!studentSearchRef.current) return
      if (!studentSearchRef.current.contains(event.target as Node)) {
        setIsStudentDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateField = <K extends keyof GuidanceCaseRecord>(key: K, value: GuidanceCaseRecord[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !formData.tags?.includes(trimmed)) {
      updateField('tags', [...(formData.tags || []), trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    updateField('tags', formData.tags?.filter((t) => t !== tag) || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.student_id || !formData.category || !formData.title || !formData.severity) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      if (mode === 'create') {
        await createCase.mutateAsync(formData)
        navigate('/admin/student-cases/list')
      } else if (initialData?.id) {
        await updateCase.mutateAsync({ id: initialData.id, payload: formData })
        navigate(`/admin/student-cases/${initialData.id}`)
      }
    } catch (error) {
      console.error('Failed to save case:', error)
      alert('فشل في حفظ الحالة')
    }
  }

  const isSubmitting = createCase.isPending || updateCase.isPending

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' ? 'إضافة حالة جديدة' : 'تعديل الحالة'}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-8">
          {/* Student Selection */}
          <fieldset className="space-y-2">
            <legend className="block text-sm font-medium text-gray-700">
              الطالب <span className="text-red-500">*</span>
            </legend>
            <p className="text-xs text-gray-500">ابحث بالاسم أو الصف أو الفصل لتحديد الطالب بسرعة.</p>
            {loadingStudents ? (
              <div className="text-gray-500">جاري تحميل قائمة الطلاب...</div>
            ) : mode === 'edit' && selectedStudent ? (
              <input
                value={`${selectedStudent.name} - ${selectedStudent.grade} ${selectedStudent.class_name}`.trim()}
                readOnly
                className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            ) : (
              <div className="relative" ref={studentSearchRef}>
                <input
                  type="search"
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value)
                    setIsStudentDropdownOpen(true)
                  }}
                  onFocus={() => setIsStudentDropdownOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsStudentDropdownOpen(false)
                      ;(event.target as HTMLInputElement).blur()
                    }
                  }}
                  placeholder="أدخل اسم الطالب أو الصف أو الفصل"
                  className={`w-full px-4 py-2 border ${
                    formData.student_id ? 'border-gray-300' : 'border-red-300'
                  } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pr-10`}
                  aria-expanded={isStudentDropdownOpen}
                  aria-autocomplete="list"
                  required
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>

                {isStudentDropdownOpen && (
                  <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">لا توجد نتائج مطابقة.</div>
                    ) : (
                      <ul role="listbox" className="divide-y divide-gray-100">
                        {filteredStudents.map((student) => {
                          const isSelected = student.id === formData.student_id
                          return (
                            <li key={student.id}>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => handleSelectStudent(student.id)}
                                className={`w-full text-right px-4 py-3 transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <span className="block font-medium">{student.name}</span>
                                <span className="block text-xs text-gray-500">
                                  {student.grade} • {student.class_name}
                                  {student.parent_phone ? ` • ولي الأمر: ${student.parent_phone}` : ''}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <div className="px-4 py-2 text-[11px] text-gray-400 border-t bg-gray-50">
                      يتم عرض أول {filteredStudents.length} نتيجة مطابقة فقط. تابع الكتابة لتصفية أكثر.
                    </div>
                  </div>
                )}
              </div>
            )}
            {!formData.student_id && !loadingStudents && (
              <p className="text-xs text-red-500">يرجى اختيار الطالب قبل المتابعة.</p>
            )}
          </fieldset>

          {/* Case Basics */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-gray-700">بيانات الحالة الأساسية</legend>
            <p className="text-xs text-gray-500">
              املأ التفاصيل الأساسية للحالة لضمان تتبع دقيق وسريع.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  العنوان <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="عنوان مختصر للحالة (مثال: صعوبات في مادة الرياضيات)"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  التصنيف <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر التصنيف</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                الأولوية <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SEVERITIES.map((severity) => (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => updateField('severity', severity)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                      formData.severity === severity
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {SEVERITY_LABELS[severity]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                حدد الأولوية بناءً على مدى تأثير الحالة على الطالب ودرجة الاستجابة المطلوبة.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">الملخص</label>
              <textarea
                value={formData.summary || ''}
                onChange={(e) => updateField('summary', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
                placeholder="سجل وصفاً مختصراً للحالة مع أبرز الملاحظات الأولية."
              />
              <p className="text-xs text-gray-500">
                استخدم الملخص لتقديم نظرة عامة للجهات المختصة حول الحالة ووضعها الحالي.
              </p>
            </div>
          </fieldset>

          {/* Tags */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">الوسوم</legend>
            <p className="text-xs text-gray-500">
              استخدم الوسوم لتسهيل البحث والتصنيف لاحقاً (مثال: "سلوك", "تأخر دراسي").
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="أضف وسم واضغط Enter"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                إضافة
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {isSubmitting ? 'جاري الحفظ...' : mode === 'create' ? 'إنشاء الحالة' : 'حفظ التعديلات'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

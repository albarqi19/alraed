import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyStudentsQuery, useCreateReferralMutation } from '../referrals/hooks'
import type { ReferralType, ReferralPriority, Student } from '../referrals/types'

const REFERRAL_TYPES = [
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
  
  const canSubmit = selectedStudent && referralType && description.trim().length >= 10
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canSubmit || !selectedStudent || !referralType) return
    
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
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          <i className="bi bi-arrow-right text-lg" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">إحالة طالب جديدة</h1>
          <p className="text-sm text-slate-500">إحالة طالب للإدارة للمتابعة</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Student */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">1</span>
            اختيار الطالب
          </h2>
          
          {selectedStudent ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 border border-sky-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                  <i className="bi bi-person text-sky-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{selectedStudent.name}</p>
                  <p className="text-xs text-slate-500">
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
                className="text-sm text-sky-600 hover:text-sky-800"
              >
                تغيير
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowStudentPicker(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              <i className="bi bi-person-plus text-xl" />
              <span>اضغط لاختيار الطالب</span>
            </button>
          )}
        </div>
        
        {/* Step 2: Select Referral Type */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">2</span>
            نوع الإحالة
          </h2>
          
          <div className="grid gap-3">
            {REFERRAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setReferralType(type.value)}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 text-right transition-all ${
                  referralType === type.value
                    ? type.color === 'amber'
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-red-400 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  type.color === 'amber' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <i className={`${type.icon} text-xl ${
                    type.color === 'amber' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{type.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{type.description}</p>
                </div>
                {referralType === type.value && (
                  <i className={`bi bi-check-circle-fill text-xl ${
                    type.color === 'amber' ? 'text-amber-500' : 'text-red-500'
                  }`} />
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Step 3: Priority & Description */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">3</span>
            تفاصيل الإحالة
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
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
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <p className="mt-1 text-xs text-slate-400">
              {description.length}/10 حرف على الأقل
            </p>
          </div>
        </div>
        
        {/* Summary */}
        {selectedStudent && referralType && (
          <div className="glass-card p-4 bg-gradient-to-br from-sky-50 to-slate-50">
            <h3 className="font-semibold text-slate-900 mb-3">ملخص الإحالة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">الطالب:</span>
                <span className="font-medium text-slate-900">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الإحالة:</span>
                <span className="font-medium text-slate-900">{selectedType?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">سيتم التحويل إلى:</span>
                <span className="font-medium text-slate-900">{selectedType?.targetRole}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit || createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-base font-medium text-white hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? (
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
          <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">اختيار الطالب</h3>
              <button
                onClick={() => setShowStudentPicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
              >
                <i className="bi bi-x-lg text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الطالب..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-10 pl-4 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
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
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-right hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <i className="bi bi-person text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500">
                          {student.student_number} • {student.classroom?.name}
                        </p>
                      </div>
                      <i className="bi bi-chevron-left text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="bi bi-search text-4xl text-slate-300" />
                  <p className="mt-2 text-slate-500">لا توجد نتائج</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

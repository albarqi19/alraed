import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  X,
  Loader2,
  Upload,
  Check,
  Calendar,
  ChevronRight,
  ChevronLeft,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { searchStudentsForExcuse, getUnexcusedAbsences, createAdminExcuse } from '../api'
import type { StudentSearchResult, UnexcusedAbsence } from '../types'
import { useToast } from '@/shared/feedback/use-toast'

interface CreateAdminExcuseModalProps {
  open: boolean
  onClose: () => void
}

export function CreateAdminExcuseModal({ open, onClose }: CreateAdminExcuseModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()

  // Steps: 1=اختيار الطالب, 2=اختيار أيام الغياب, 3=نص العذر والمرفق
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // بيانات الطالب
  const [studentQuery, setStudentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null)

  // أيام الغياب
  const [unexcusedAbsences, setUnexcusedAbsences] = useState<UnexcusedAbsence[]>([])
  const [loadingAbsences, setLoadingAbsences] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])

  // نص العذر والملف
  const [excuseText, setExcuseText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // البحث عن الطلاب مع debounce
  useEffect(() => {
    if (studentQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const result = await searchStudentsForExcuse(studentQuery)
        if (result.success) {
          setSearchResults(result.data)
        }
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [studentQuery])

  // جلب أيام الغياب عند اختيار طالب
  const handleSelectStudent = async (student: StudentSearchResult) => {
    setSelectedStudent(student)
    setStudentQuery('')
    setSearchResults([])

    setLoadingAbsences(true)
    try {
      const result = await getUnexcusedAbsences(student.id)
      if (result.success) {
        setUnexcusedAbsences(result.data)
        setStep(2)
      }
    } catch {
      toast({ type: 'error', title: 'خطأ', description: 'فشل في جلب أيام الغياب' })
    } finally {
      setLoadingAbsences(false)
    }
  }

  // اختيار/إلغاء يوم غياب
  const toggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
      setSelectedDates((prev) => prev.filter((d) => d !== date))
    } else if (selectedDates.length < 7) {
      setSelectedDates((prev) => [...prev, date])
    } else {
      toast({ type: 'warning', title: 'تنبيه', description: 'الحد الأقصى 7 أيام' })
    }
  }

  // اختيار الكل
  const selectAllDates = () => {
    const datesToSelect = unexcusedAbsences.slice(0, 7).map((a) => a.date)
    setSelectedDates(datesToSelect)
  }

  // إلغاء الكل
  const clearAllDates = () => {
    setSelectedDates([])
  }

  // Mutation لإنشاء العذر
  const createMutation = useMutation({
    mutationFn: createAdminExcuse,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
        toast({ type: 'success', title: 'تم بنجاح', description: data.message })
        handleClose()
      } else {
        if (data.existing_dates && data.existing_dates.length > 0) {
          toast({
            type: 'error',
            title: 'يوجد عذر مسبق',
            description: `التواريخ التالية لها عذر مسبق: ${data.existing_dates.join(', ')}`,
          })
        } else {
          toast({ type: 'error', title: 'خطأ', description: data.message || 'فشل في إنشاء العذر' })
        }
      }
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'فشل في إنشاء العذر' })
    },
  })

  const handleSubmit = () => {
    if (!selectedStudent || selectedDates.length === 0 || !excuseText.trim()) return

    createMutation.mutate({
      student_id: selectedStudent.id,
      absence_dates: selectedDates,
      excuse_text: excuseText.trim(),
      file: file || undefined,
    })
  }

  const handleClose = () => {
    setStep(1)
    setStudentQuery('')
    setSearchResults([])
    setSelectedStudent(null)
    setUnexcusedAbsences([])
    setSelectedDates([])
    setExcuseText('')
    setFile(null)
    onClose()
  }

  const handleBack = () => {
    if (step === 2) {
      setSelectedStudent(null)
      setUnexcusedAbsences([])
      setSelectedDates([])
      setStep(1)
    } else if (step === 3) {
      setStep(2)
    }
  }

  const handleNext = () => {
    if (step === 1 && selectedStudent) {
      setStep(2)
    } else if (step === 2 && selectedDates.length > 0) {
      setStep(3)
    }
  }

  const canGoNext = () => {
    if (step === 1) return selectedStudent !== null
    if (step === 2) return selectedDates.length > 0
    return false
  }

  const canSubmit = () => {
    return selectedStudent && selectedDates.length > 0 && excuseText.trim().length >= 5
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      dir="rtl"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                إضافة عذر جديد
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                {step === 1 && 'اختيار الطالب'}
                {step === 2 && 'اختيار أيام الغياب'}
                {step === 3 && 'تفاصيل العذر'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  step >= s ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: اختيار الطالب */}
          {step === 1 && (
            <div className="space-y-4">
              {selectedStudent ? (
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                        <User className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900">{selectedStudent.name}</p>
                        <p className="text-sm text-indigo-700">
                          {selectedStudent.national_id} • {selectedStudent.grade} - {selectedStudent.class_name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(null)
                        setUnexcusedAbsences([])
                        setSelectedDates([])
                      }}
                      className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-semibold text-slate-700">
                    ابحث عن الطالب بالاسم أو رقم الهوية
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      placeholder="اكتب اسم الطالب أو رقم الهوية..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      autoFocus
                    />
                  </div>

                  {isSearching && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  )}

                  {!isSearching && searchResults.length > 0 && (
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {searchResults.map((student: StudentSearchResult) => (
                        <button
                          key={student.id}
                          onClick={() => handleSelectStudent(student)}
                          disabled={loadingAbsences}
                          className="w-full text-right p-4 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-3"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                            <User className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{student.name}</p>
                            <p className="text-sm text-slate-500">
                              {student.national_id} • {student.grade} - {student.class_name}
                            </p>
                          </div>
                          {loadingAbsences && selectedStudent?.id === student.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isSearching && studentQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>لم يتم العثور على نتائج</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: اختيار أيام الغياب */}
          {step === 2 && (
            <div className="space-y-4">
              {/* بطاقة الطالب المختار */}
              <div className="rounded-xl bg-indigo-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-indigo-900">{selectedStudent?.name}</p>
                    <p className="text-sm text-indigo-700">
                      {selectedStudent?.grade} - {selectedStudent?.class_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  اختر أيام الغياب (الحد الأقصى 7 أيام)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllDates}
                    disabled={unexcusedAbsences.length === 0}
                    className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllDates}
                    disabled={selectedDates.length === 0}
                    className="text-xs text-slate-500 hover:underline disabled:opacity-50"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              {loadingAbsences ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : unexcusedAbsences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Calendar className="h-12 w-12 mb-3 text-slate-300" />
                  <p className="font-semibold">لا توجد أيام غياب بدون عذر</p>
                  <p className="text-sm">جميع أيام غياب هذا الطالب لها أعذار مسبقة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {unexcusedAbsences.map((absence) => {
                    const isSelected = selectedDates.includes(absence.date)
                    return (
                      <button
                        key={absence.date}
                        onClick={() => toggleDate(absence.date)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                            isSelected ? 'bg-indigo-600' : 'border-2 border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <Calendar
                          className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}
                        />
                        <span className={`flex-1 text-right ${isSelected ? 'text-indigo-900 font-semibold' : 'text-slate-700'}`}>
                          {absence.date_formatted}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedDates.length > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-sm text-emerald-700">
                    <span className="font-bold">{selectedDates.length}</span> {selectedDates.length === 1 ? 'يوم' : selectedDates.length === 2 ? 'يومين' : 'أيام'} محددة
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: نص العذر والمرفق */}
          {step === 3 && (
            <div className="space-y-4">
              {/* ملخص */}
              <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">الطالب:</span>
                  <span className="font-semibold text-slate-900">{selectedStudent?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">عدد الأيام:</span>
                  <span className="font-semibold text-slate-900">{selectedDates.length}</span>
                </div>
              </div>

              {/* نص العذر */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  نص العذر <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={excuseText}
                  onChange={(e) => setExcuseText(e.target.value)}
                  placeholder="اكتب سبب الغياب هنا..."
                  rows={4}
                  className={`w-full rounded-xl border bg-white p-4 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                    excuseText.trim().length > 0 && excuseText.trim().length < 5
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                />
                {excuseText.trim().length > 0 && excuseText.trim().length < 5 && (
                  <p className="mt-1 text-xs text-rose-600">نص العذر قصير جداً (الحد الأدنى 5 أحرف)</p>
                )}
              </div>

              {/* رفع الملف */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  المرفق <span className="text-slate-400">(اختياري)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {file ? (
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                          <FileText className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-900 truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-emerald-700">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">اضغط لاختيار ملف</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF - الحد الأقصى 5 MB</p>
                  </button>
                )}
              </div>

              {/* تنبيه */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold">ملاحظة:</p>
                    <p>سيتم اعتماد العذر تلقائياً وإرسال إشعار لولي الأمر.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit() || createMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      حفظ العذر
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

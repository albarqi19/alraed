import { useState } from 'react'
import { useCreateActivity } from '../hooks'
import type { ActivityStatus } from '../types'

interface Props {
  grades: string[]
  onClose: () => void
}

export function ActivityCreateModal({ grades, onClose }: Props) {
  const createActivity = useCreateActivity()
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    objectives: '',
    examples: '',
    start_date: '',
    end_date: '',
    target_grades: [] as string[],
    status: 'active' as ActivityStatus,
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('يرجى إدخال عنوان النشاط')
      setStep(1)
      return
    }
    if (!form.start_date || !form.end_date) {
      setError('يرجى تحديد فترة النشاط')
      setStep(1)
      return
    }
    if (form.target_grades.length === 0) {
      setError('يرجى اختيار صف واحد على الأقل')
      setStep(2)
      return
    }

    try {
      await createActivity.mutateAsync({
        ...form,
        pdf_file: pdfFile ?? undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإنشاء')
    }
  }

  const toggleGrade = (grade: string) => {
    setForm((prev) => ({
      ...prev,
      target_grades: prev.target_grades.includes(grade)
        ? prev.target_grades.filter((g) => g !== grade)
        : [...prev.target_grades, grade],
    }))
  }

  const selectAllGrades = () => {
    setForm((prev) => ({ ...prev, target_grades: [...grades] }))
  }

  const clearAllGrades = () => {
    setForm((prev) => ({ ...prev, target_grades: [] }))
  }

  const canProceedToStep2 = form.title.trim() && form.start_date && form.end_date

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div 
          className="relative px-8 py-6 text-white"
          style={{ background: 'linear-gradient(to left, var(--color-header), var(--color-sidebar))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 rounded-full bg-white/20 p-2 text-white/80 backdrop-blur-sm transition hover:bg-white/30 hover:text-white"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <i className="bi bi-stars text-3xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">إنشاء نشاط جديد</h2>
              <p className="mt-1 text-sm text-white/80">أضف نشاطاً جديداً للمعلمين</p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                step === 1 
                  ? 'bg-white shadow-lg' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              style={step === 1 ? { color: 'var(--color-primary-dark)' } : {}}
            >
              1
            </button>
            <div className={`h-1 w-16 rounded-full transition ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
            <button
              type="button"
              onClick={() => canProceedToStep2 && setStep(2)}
              disabled={!canProceedToStep2}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                step === 2 
                  ? 'bg-white shadow-lg' 
                  : canProceedToStep2
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
              }`}
              style={step === 2 ? { color: 'var(--color-primary-dark)' } : {}}
            >
              2
            </button>
          </div>
          <div className="mt-2 flex justify-center gap-12 text-xs text-white/70">
            <span>المعلومات الأساسية</span>
            <span>الصفوف والمرفقات</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-8">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <i className="bi bi-exclamation-triangle text-lg" />
                </div>
                <p>{error}</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                {/* العنوان */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-type" style={{ color: 'var(--color-primary)' }} />
                    عنوان النشاط
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none"
                    style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="مثال: نشاط القراءة الحرة"
                  />
                </div>

                {/* الفترة */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <i className="bi bi-calendar-event" style={{ color: 'var(--color-success)' }} />
                      تاريخ البداية
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none"
                      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={(e) => e.target.style.borderColor = ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <i className="bi bi-calendar-check" style={{ color: 'var(--color-danger)' }} />
                      تاريخ النهاية
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      min={form.start_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none"
                      onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={(e) => e.target.style.borderColor = ''}
                    />
                  </div>
                </div>

                {/* الوصف */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-text-paragraph" style={{ color: 'var(--color-primary)' }} />
                    الوصف
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none resize-none"
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="وصف مختصر للنشاط..."
                  />
                </div>

                {/* الأهداف */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-bullseye" style={{ color: 'var(--color-warning)' }} />
                    الأهداف
                  </label>
                  <textarea
                    value={form.objectives}
                    onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none resize-none"
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="الأهداف المتوقعة من النشاط..."
                  />
                </div>

                {/* أمثلة تطبيقية */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-lightbulb" style={{ color: 'var(--color-warning)' }} />
                    أمثلة تطبيقية
                  </label>
                  <textarea
                    value={form.examples}
                    onChange={(e) => setForm({ ...form, examples: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 transition focus:bg-white focus:outline-none resize-none"
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="أمثلة على كيفية تنفيذ النشاط..."
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* الصفوف المستهدفة */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <i className="bi bi-people" style={{ color: 'var(--color-primary)' }} />
                      الصفوف المستهدفة
                      <span className="text-red-500">*</span>
                    </label>
                    {grades.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={selectAllGrades}
                          className="text-xs font-medium hover:underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <i className="bi bi-check-all ml-1" />
                          تحديد الكل
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={clearAllGrades}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          <i className="bi bi-x-circle ml-1" />
                          إلغاء الكل
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {grades.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                        <i className="bi bi-exclamation-triangle text-2xl text-amber-600" />
                      </div>
                      <p className="font-medium text-amber-800">لا توجد صفوف متاحة</p>
                      <p className="mt-1 text-sm text-amber-600">تأكد من وجود طلاب مسجلين في النظام</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap gap-2">
                        {grades.map((grade) => {
                          const isSelected = form.target_grades.includes(grade)
                          return (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => toggleGrade(grade)}
                              className={`group relative rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                                isSelected
                                  ? 'text-white shadow-lg'
                                  : 'bg-white text-slate-600 shadow hover:shadow-md border border-slate-200'
                              }`}
                              style={isSelected ? { 
                                background: 'linear-gradient(to left, var(--color-primary), var(--color-primary-dark))',
                              } : {}}
                              onMouseEnter={(e) => !isSelected && (e.currentTarget.style.color = 'var(--color-primary)')}
                              onMouseLeave={(e) => !isSelected && (e.currentTarget.style.color = '')}
                            >
                              {isSelected && (
                                <i className="bi bi-check-circle-fill ml-2" />
                              )}
                              {grade}
                            </button>
                          )
                        })}
                      </div>
                      {form.target_grades.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-primary)' }}>
                          <i className="bi bi-info-circle" />
                          <span>تم اختيار <strong>{form.target_grades.length}</strong> صف من أصل {grades.length}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ملف PDF */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-file-earmark-pdf text-red-500" />
                    ملف PDF مرفق
                    <span className="text-xs font-normal text-slate-400">(اختياري)</span>
                  </label>
                  
                  {pdfFile ? (
                    <div className="flex items-center justify-between rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                          <i className="bi bi-file-earmark-pdf text-2xl text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{pdfFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-200"
                      >
                        <i className="bi bi-trash ml-1" />
                        إزالة
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-indigo-400 hover:bg-indigo-50">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200">
                        <i className="bi bi-cloud-arrow-up text-2xl text-slate-500" />
                      </div>
                      <p className="font-medium text-slate-700">اسحب الملف هنا أو اضغط للاختيار</p>
                      <p className="mt-1 text-xs text-slate-500">PDF فقط - الحد الأقصى 10MB</p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* الحالة */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <i className="bi bi-toggle-on text-emerald-500" />
                    حالة النشاط
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'active' })}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition ${
                        form.status === 'active'
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <i className={`bi ${form.status === 'active' ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                      نشط
                      <span className="text-xs font-normal text-slate-500">(مرئي للمعلمين)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'draft' })}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition ${
                        form.status === 'draft'
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <i className={`bi ${form.status === 'draft' ? 'bi-check-circle-fill' : 'bi-circle'}`} />
                      مسودة
                      <span className="text-xs font-normal text-slate-500">(غير مرئي)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-slate-50 px-8 py-5">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <i className="bi bi-arrow-left" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <i className="bi bi-arrow-right" />
                  السابق
                </button>
                <button
                  type="submit"
                  disabled={createActivity.isPending || form.target_grades.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createActivity.isPending ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />
                      إنشاء النشاط
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

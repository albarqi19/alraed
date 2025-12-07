import { useState, useRef, useEffect } from 'react'
import { useTeacherActivityDetails, useSubmitReport, useUpdateTeacherReport } from '../hooks'
import { getActivityPdfUrl, getActivityReportPrintUrl } from '@/services/api/client'
import type { ReportStatus } from '../types'

interface Props {
  activityId: number
  onClose: () => void
}

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'تحت المراجعة',
  approved: 'تم الاعتماد',
  rejected: 'مرفوض',
}

const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

export function TeacherActivityModal({ activityId, onClose }: Props) {
  const { data, isLoading, error, refetch } = useTeacherActivityDetails(activityId)
  const submitReport = useSubmitReport()
  const updateReport = useUpdateTeacherReport()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // الصف المختار لتقديم التقرير
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    execution_location_id: 0,
    achieved_objectives: [] as string[],
    students_count: 0,
  })
  const [images, setImages] = useState<File[]>([])
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  // تحديث عدد الطلاب عند اختيار صف
  useEffect(() => {
    if (selectedGrade && data?.grades_info) {
      const gradeInfo = data.grades_info.find(g => g.grade === selectedGrade)
      if (gradeInfo) {
        setForm(prev => ({
          ...prev,
          students_count: gradeInfo.students_count,
          ...(gradeInfo.report?.status === 'rejected' ? {
            execution_location_id: gradeInfo.report.execution_location_id || 0,
            achieved_objectives: gradeInfo.report.achieved_objectives || [],
          } : {})
        }))
      }
    }
  }, [selectedGrade, data?.grades_info])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (images.length + files.length > 4) {
      setFormError('الحد الأقصى 4 صور')
      return
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setFormError('يرجى اختيار صور فقط')
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormError('حجم الصورة يجب أن يكون أقل من 5MB')
        return false
      }
      return true
    })

    setImages((prev) => [...prev, ...validFiles])

    // إنشاء معاينات
    validFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagesPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    setFormError(null)
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagesPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleObjective = (objective: string) => {
    setForm(prev => ({
      ...prev,
      achieved_objectives: prev.achieved_objectives.includes(objective)
        ? prev.achieved_objectives.filter(o => o !== objective)
        : [...prev.achieved_objectives, objective]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedGrade) {
      setFormError('يرجى اختيار الصف أولاً')
      return
    }
    if (!form.execution_location_id) {
      setFormError('يرجى اختيار مكان التنفيذ')
      return
    }
    if (form.achieved_objectives.length === 0) {
      setFormError('يرجى اختيار هدف واحد على الأقل')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        grade: selectedGrade,
        execution_location_id: form.execution_location_id,
        achieved_objectives: form.achieved_objectives,
        students_count: form.students_count,
        images: images.length > 0 ? images : undefined,
      }

      const gradeInfo = data?.grades_info.find(g => g.grade === selectedGrade)
      if (gradeInfo?.report?.status === 'rejected') {
        await updateReport.mutateAsync({ activityId, payload })
      } else {
        await submitReport.mutateAsync({ activityId, payload })
      }

      // إعادة تعيين النموذج وتحديث البيانات
      setSelectedGrade(null)
      setForm({
        execution_location_id: 0,
        achieved_objectives: [],
        students_count: 0,
      })
      setImages([])
      setImagesPreviews([])
      refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإرسال')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8">
          <div className="flex items-center gap-3">
            <i className="bi bi-arrow-repeat animate-spin text-2xl text-indigo-600" />
            <span className="text-slate-600">جاري التحميل...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8 text-center">
          <i className="bi bi-exclamation-triangle text-4xl text-red-500 mb-3" />
          <p className="text-slate-600">{error instanceof Error ? error.message : 'حدث خطأ'}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-full bg-slate-100 px-6 py-2 text-sm font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  const { data: activity, grades_info, execution_locations } = data
  const selectedGradeInfo = selectedGrade ? grades_info.find(g => g.grade === selectedGrade) : null

  // التحقق من وجود صفوف لم يتم تسليم تقارير لها
  const hasUnsubmittedGrades = grades_info.some(g => !g.has_report)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{activity.title}</h2>
              {!activity.has_started && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                  <i className="bi bi-hourglass-split ml-1" />
                  لم يبدأ
                </span>
              )}
              {activity.has_started && activity.is_late && hasUnsubmittedGrades && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                  <i className="bi bi-clock-history ml-1" />
                  متأخر
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          {/* Activity Details */}
          <div className="space-y-4">
            {activity.description && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700 mb-2">
                  <i className="bi bi-info-circle ml-2" />
                  الوصف
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.description}</p>
              </div>
            )}

            {/* عرض الأهداف كقائمة */}
            {activity.objectives && activity.objectives.length > 0 && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700 mb-3">
                  <i className="bi bi-bullseye ml-2" />
                  الأهداف ({activity.objectives.length})
                </h3>
                <div className="space-y-2">
                  {activity.objectives.map((objective, index) => (
                    <div key={index} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2 border border-slate-200">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: 'var(--color-primary)' }}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-slate-700">{objective}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activity.examples && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700 mb-2">
                  <i className="bi bi-lightbulb ml-2" />
                  أمثلة تطبيقية
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.examples}</p>
              </div>
            )}
            {activity.pdf_file && (
              <div className="rounded-xl bg-slate-50 p-4">
                <a
                  href={getActivityPdfUrl(activityId, true)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
                >
                  <i className="bi bi-file-pdf text-xl" />
                  تحميل الملف المرفق
                </a>
              </div>
            )}
          </div>

          {/* قائمة الصفوف مع حالة التقارير */}
          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4">
            <h3 className="text-lg font-bold text-indigo-800 mb-4">
              <i className="bi bi-journal-check ml-2" />
              التقارير حسب الصف
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {grades_info.map((gradeInfo) => (
                <div
                  key={gradeInfo.grade}
                  className={`rounded-xl border-2 p-4 transition cursor-pointer ${selectedGrade === gradeInfo.grade
                    ? 'border-indigo-500 bg-indigo-100'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                    }`}
                  onClick={() => {
                    if (!gradeInfo.has_report || gradeInfo.report?.status === 'rejected') {
                      setSelectedGrade(gradeInfo.grade)
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800">{gradeInfo.grade}</span>
                    {gradeInfo.has_report && gradeInfo.report && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${REPORT_STATUS_COLORS[gradeInfo.report.status]}`}>
                        {REPORT_STATUS_LABELS[gradeInfo.report.status]}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-slate-600">
                    <i className="bi bi-people ml-1" />
                    {gradeInfo.students_count} طالب
                  </div>

                  {!gradeInfo.has_report && (
                    <div className="mt-2 text-xs text-amber-600">
                      <i className="bi bi-exclamation-circle ml-1" />
                      لم يتم تسليم التقرير
                    </div>
                  )}

                  {gradeInfo.report?.status === 'rejected' && (
                    <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-700 font-medium">سبب الرفض:</p>
                      <p className="text-xs text-red-600">{gradeInfo.report.rejection_reason}</p>
                    </div>
                  )}

                  {gradeInfo.report?.status === 'approved' && gradeInfo.report?.id && (
                    <a
                      href={getActivityReportPrintUrl(activityId, gradeInfo.report.id, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                    >
                      <i className="bi bi-file-earmark-pdf" />
                      عرض التقرير
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* نموذج تقديم التقرير */}
          {selectedGrade && selectedGradeInfo && (!selectedGradeInfo.has_report || selectedGradeInfo.report?.status === 'rejected') && (
            !activity.has_started ? (
              <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-6 text-center">
                <i className="bi bi-hourglass-split text-4xl text-slate-400 mb-3 block" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">النشاط لم يبدأ بعد</h3>
                <p className="text-sm text-slate-600">
                  سيتم فتح التسليم في تاريخ: <span className="font-semibold">{formatDate(activity.start_date)}</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4">
                    <i className="bi bi-file-earmark-plus ml-2" />
                    {selectedGradeInfo.report?.status === 'rejected' ? 'تعديل التقرير' : 'تسليم التقرير'} - {selectedGrade}
                  </h3>

                  {formError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                      <i className="bi bi-exclamation-triangle ml-2" />
                      {formError}
                    </div>
                  )}

                  {/* مكان التنفيذ - قائمة اختيار */}
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      مكان التنفيذ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.execution_location_id}
                      onChange={(e) => setForm({ ...form, execution_location_id: parseInt(e.target.value) })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-800 transition focus:border-emerald-500 focus:outline-none"
                    >
                      <option value={0}>-- اختر مكان التنفيذ --</option>
                      {execution_locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* عدد الطلاب */}
                  <div className="space-y-2 mb-4">
                    <label className="block text-sm font-semibold text-slate-700">عدد الطلاب</label>
                    <input
                      type="number"
                      value={form.students_count}
                      onChange={(e) => setForm({ ...form, students_count: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-slate-800 transition focus:border-emerald-500 focus:outline-none"
                      min={0}
                    />
                    <p className="text-xs text-muted">
                      تم تعبئة هذا الحقل تلقائياً بناءً على طلاب الصف
                    </p>
                  </div>

                  {/* الأهداف المحققة - اختيار متعدد */}
                  <div className="space-y-3 mb-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      الأهداف المحققة <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-slate-400 mr-2">
                        (اختر الأهداف التي تحققت)
                      </span>
                    </label>

                    {activity.objectives && activity.objectives.length > 0 ? (
                      <div className="space-y-2 rounded-xl border-2 border-slate-200 bg-white p-3">
                        {activity.objectives.map((objective, index) => {
                          const isSelected = form.achieved_objectives.includes(objective)
                          return (
                            <label
                              key={index}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isSelected
                                ? 'bg-emerald-50 border-2 border-emerald-400'
                                : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleObjective(objective)}
                                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ background: isSelected ? '#10b981' : '#94a3b8' }}>
                                {index + 1}
                              </span>
                              <span className={`text-sm ${isSelected ? 'text-emerald-800 font-medium' : 'text-slate-700'}`}>
                                {objective}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 bg-slate-100 rounded-xl p-4 text-center">
                        لا توجد أهداف محددة لهذا النشاط
                      </div>
                    )}

                    {form.achieved_objectives.length > 0 && (
                      <p className="text-xs text-emerald-600">
                        <i className="bi bi-check-circle ml-1" />
                        تم اختيار {form.achieved_objectives.length} من {activity.objectives?.length || 0} أهداف
                      </p>
                    )}
                  </div>

                  {/* صور التوثيق */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      صور التوثيق (اختياري - 4 صور كحد أقصى)
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {imagesPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`صورة ${index + 1}`}
                            className="h-24 w-24 rounded-lg object-cover border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <i className="bi bi-x" />
                          </button>
                        </div>
                      ))}

                      {images.length < 4 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition"
                        >
                          <div className="text-center">
                            <i className="bi bi-camera text-2xl" />
                            <p className="text-xs mt-1">إضافة صورة</p>
                          </div>
                        </button>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => setSelectedGrade(null)}
                      className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting && (
                        <i className="bi bi-arrow-repeat animate-spin" />
                      )}
                      {selectedGradeInfo.report?.status === 'rejected' ? 'إعادة إرسال التقرير' : 'إرسال التقرير'}
                    </button>
                  </div>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}

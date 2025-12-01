import { useState, useRef, useMemo } from 'react'
import { useTeacherActivityDetails, useSubmitReport, useUpdateTeacherReport } from '../hooks'
import { getActivityReportImageUrl, getActivityPdfUrl, getActivityReportPrintUrl } from '@/services/api/client'
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
  const { data, isLoading, error } = useTeacherActivityDetails(activityId)
  const submitReport = useSubmitReport()
  const updateReport = useUpdateTeacherReport()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [form, setForm] = useState({
    execution_location: '',
    achieved_objectives: '',
    students_count: 0,
  })
  const [images, setImages] = useState<File[]>([])
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // تحويل روابط الصور إلى روابط كاملة عبر API - يجب أن يكون قبل أي early return
  const fullImageUrls = useMemo(() => {
    if (!data?.report?.images || data.report.images.length === 0) return []
    return data.report.images.map((_, index) => 
      getActivityReportImageUrl(activityId, data.report!.id, index, true)
    )
  }, [data?.report?.images, data?.report?.id, activityId])

  // تحديث النموذج عند تحميل البيانات
  const initializeForm = () => {
    if (data) {
      // تعبئة حقل عدد الطلاب تلقائياً
      setForm((prev) => ({
        ...prev,
        students_count: data.students_count,
        execution_location: data.report?.execution_location ?? '',
        achieved_objectives: data.report?.achieved_objectives ?? '',
      }))
      
      // إذا كان التقرير مرفوضاً، فعّل وضع التعديل
      if (data.report?.status === 'rejected') {
        setIsEditing(true)
      }
    }
  }

  // استدعاء initializeForm عند تحميل البيانات
  if (data && form.students_count === 0 && data.students_count > 0) {
    initializeForm()
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.execution_location.trim()) {
      setFormError('يرجى إدخال مكان التنفيذ')
      return
    }
    if (!form.achieved_objectives.trim()) {
      setFormError('يرجى إدخال الأهداف المحققة')
      return
    }

    try {
      const payload = {
        execution_location: form.execution_location.trim(),
        achieved_objectives: form.achieved_objectives.trim(),
        students_count: form.students_count,
        images: images.length > 0 ? images : undefined,
      }

      if (data?.report?.status === 'rejected') {
        await updateReport.mutateAsync({ activityId, payload })
      } else {
        await submitReport.mutateAsync({ activityId, payload })
      }
      
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإرسال')
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

  const { data: activity, report, students_count } = data
  const canSubmit = !report || report.status === 'rejected'
  const showForm = canSubmit && (isEditing || !report)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{activity.title}</h2>
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
            {activity.objectives && (
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-700 mb-2">
                  <i className="bi bi-bullseye ml-2" />
                  الأهداف
                </h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.objectives}</p>
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

          {/* Students Count Info */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-700">
                  <i className="bi bi-people ml-2" />
                  عدد الطلاب المستهدفين
                </h3>
                <p className="text-sm text-blue-600 mt-1">
                  بناءً على الفصول التي تدرسها والمرتبطة بالنشاط
                </p>
              </div>
              <span className="text-3xl font-bold text-blue-700">{students_count}</span>
            </div>
          </div>

          {/* Report Status */}
          {report && !isEditing && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700">
                  <i className="bi bi-file-text ml-2" />
                  حالة التقرير
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${REPORT_STATUS_COLORS[report.status]}`}
                >
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-slate-700">تاريخ التسليم:</span>
                  <span className="mr-2 text-slate-600">{report.submitted_at}</span>
                </p>
                {report.reviewed_at && (
                  <p>
                    <span className="font-medium text-slate-700">تاريخ المراجعة:</span>
                    <span className="mr-2 text-slate-600">{report.reviewed_at}</span>
                  </p>
                )}
                <p>
                  <span className="font-medium text-slate-700">مكان التنفيذ:</span>
                  <span className="mr-2 text-slate-600">{report.execution_location || '—'}</span>
                </p>
                <p>
                  <span className="font-medium text-slate-700">عدد الطلاب:</span>
                  <span className="mr-2 text-slate-600">{report.students_count}</span>
                </p>
              </div>

              {report.status === 'rejected' && report.rejection_reason && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="font-medium text-red-700 mb-1">سبب الرفض:</p>
                  <p className="text-sm text-red-600">{report.rejection_reason}</p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    <i className="bi bi-pencil" />
                    تعديل وإعادة الإرسال
                  </button>
                </div>
              )}

              {/* زر ملف التقرير - يظهر فقط عند الاعتماد */}
              {report.status === 'approved' && (
                <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-emerald-700">
                        <i className="bi bi-check-circle ml-2" />
                        تم اعتماد التقرير
                      </p>
                      <p className="text-sm text-emerald-600 mt-1">يمكنك الآن تحميل أو طباعة ملف التقرير</p>
                    </div>
                    <a
                      href={getActivityReportPrintUrl(activityId, null, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md"
                    >
                      <i className="bi bi-file-earmark-pdf" />
                      ملف التقرير
                    </a>
                  </div>
                </div>
              )}

              {fullImageUrls.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-slate-700 mb-2">صور التوثيق:</p>
                  <div className="flex gap-2 flex-wrap">
                    {fullImageUrls.map((img, index) => (
                      <a
                        key={index}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-20 w-20 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition"
                      >
                        <img src={img} alt={`صورة ${index + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                <h3 className="text-lg font-bold text-indigo-800 mb-4">
                  <i className="bi bi-file-earmark-plus ml-2" />
                  {report?.status === 'rejected' ? 'تعديل التقرير' : 'تسليم التقرير'}
                </h3>

                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                    <i className="bi bi-exclamation-triangle ml-2" />
                    {formError}
                  </div>
                )}

                {/* مكان التنفيذ */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    مكان التنفيذ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.execution_location}
                    onChange={(e) => setForm({ ...form, execution_location: e.target.value })}
                    className="input-field"
                    placeholder="مثال: الفصل الدراسي، المعمل، الساحة..."
                  />
                </div>

                {/* عدد الطلاب */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700">عدد الطلاب</label>
                  <input
                    type="number"
                    value={form.students_count}
                    onChange={(e) => setForm({ ...form, students_count: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min={0}
                  />
                  <p className="text-xs text-muted">
                    تم تعبئة هذا الحقل تلقائياً بناءً على طلاب الفصول المرتبطة بالنشاط
                  </p>
                </div>

                {/* الأهداف المحققة */}
                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    الأهداف المحققة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.achieved_objectives}
                    onChange={(e) => setForm({ ...form, achieved_objectives: e.target.value })}
                    className="input-field min-h-[100px]"
                    placeholder="اكتب الأهداف التي تم تحقيقها من خلال هذا النشاط..."
                  />
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
                        className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition"
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
                    onClick={() => {
                      if (report?.status === 'rejected') {
                        setIsEditing(false)
                      } else {
                        onClose()
                      }
                    }}
                    className="rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitReport.isPending || updateReport.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {(submitReport.isPending || updateReport.isPending) && (
                      <i className="bi bi-arrow-repeat animate-spin" />
                    )}
                    {report?.status === 'rejected' ? 'إعادة إرسال التقرير' : 'إرسال التقرير'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

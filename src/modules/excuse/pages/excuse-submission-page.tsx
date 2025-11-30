import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getExcuseByToken, submitExcuse } from '../api'
import type { ExcuseData } from '../types'

type PageState = 
  | { type: 'loading' }
  | { type: 'error'; errorCode?: string; message: string; data?: Partial<ExcuseData> }
  | { type: 'form'; data: ExcuseData }
  | { type: 'submitted'; data: ExcuseData }
  | { type: 'success'; message: string }

export function ExcuseSubmissionPage() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>({ type: 'loading' })
  const [excuseText, setExcuseText] = useState('')
  const [parentName, setParentName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadExcuseData = useCallback(async () => {
    if (!token) {
      setPageState({ type: 'error', message: 'الرابط غير صحيح' })
      return
    }

    try {
      const response = await getExcuseByToken(token)

      if (!response.success) {
        setPageState({
          type: 'error',
          errorCode: response.error_code,
          message: response.message ?? 'حدث خطأ',
          data: response.data,
        })
        return
      }

      if (response.status === 'submitted' && response.data) {
        setPageState({ type: 'submitted', data: response.data })
      } else if (response.data) {
        setPageState({ type: 'form', data: response.data })
      }
    } catch {
      setPageState({ type: 'error', message: 'حدث خطأ في الاتصال بالخادم' })
    }
  }, [token])

  useEffect(() => {
    loadExcuseData()
  }, [loadExcuseData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // التحقق من نوع الملف
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(selectedFile.type)) {
        setErrors({ file: 'نوع الملف غير مدعوم (JPG, PNG, PDF فقط)' })
        return
      }
      // التحقق من حجم الملف (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setErrors({ file: 'حجم الملف كبير جداً (الحد الأقصى 5 ميجا)' })
        return
      }
      setFile(selectedFile)
      setErrors({})
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    // التحقق من البيانات
    const newErrors: Record<string, string> = {}
    if (excuseText.trim().length < 10) {
      newErrors.excuse_text = 'يرجى كتابة سبب الغياب بشكل أوضح (10 أحرف على الأقل)'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await submitExcuse(token, {
        excuse_text: excuseText.trim(),
        file: file ?? undefined,
        parent_name: parentName.trim() || undefined,
      })

      if (response.success) {
        setPageState({ type: 'success', message: response.message })
      } else {
        if (response.errors) {
          const formattedErrors: Record<string, string> = {}
          for (const [key, messages] of Object.entries(response.errors)) {
            formattedErrors[key] = Array.isArray(messages) ? messages[0] : messages
          }
          setErrors(formattedErrors)
        } else {
          setErrors({ general: response.message })
        }
      }
    } catch {
      setErrors({ general: 'حدث خطأ في الاتصال بالخادم' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Loading state
  if (pageState.type === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (pageState.type === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            {pageState.errorCode === 'TOKEN_EXPIRED' ? 'انتهت صلاحية الرابط' : 'خطأ'}
          </h1>
          <p className="text-slate-600 mb-4">{pageState.message}</p>
          {pageState.data?.student_name && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <p>الطالب: {pageState.data.student_name}</p>
              {pageState.data.absence_date_formatted && (
                <p>تاريخ الغياب: {pageState.data.absence_date_formatted}</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Success state (after submission)
  if (pageState.type === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">تم إرسال العذر بنجاح</h1>
          <p className="text-slate-600">{pageState.message}</p>
          <p className="text-sm text-slate-500 mt-4">
            سيتم مراجعة العذر من قبل الإدارة وإشعاركم بالقرار
          </p>
        </div>
      </div>
    )
  }

  // Already submitted state
  if (pageState.type === 'submitted') {
    const { data } = pageState
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">تم تقديم العذر مسبقاً</h1>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">الطالب</p>
              <p className="font-semibold text-slate-800">{data.student_name}</p>
              {data.student_class && (
                <p className="text-sm text-slate-600">{data.student_grade} - {data.student_class}</p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">تاريخ الغياب</p>
              <p className="font-semibold text-slate-800">{data.absence_date_formatted}</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">نص العذر</p>
              <p className="text-slate-800">{data.excuse_text}</p>
              {data.has_file && (
                <p className="text-xs text-blue-600 mt-2">📎 يوجد ملف مرفق</p>
              )}
            </div>

            <div className={`rounded-lg p-4 ${
              data.review_status === 'approved' ? 'bg-green-50' :
              data.review_status === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <p className="text-sm text-slate-500 mb-1">حالة المراجعة</p>
              <p className={`font-semibold ${
                data.review_status === 'approved' ? 'text-green-700' :
                data.review_status === 'rejected' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {data.review_status_label}
              </p>
              {data.review_notes && (
                <p className="text-sm mt-2 text-slate-600">{data.review_notes}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form state
  const { data } = pageState
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">تقديم عذر غياب</h1>
          <p className="text-slate-600 mt-2">يرجى تعبئة النموذج لتقديم عذر الغياب</p>
        </div>

        {/* Student Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            بيانات الطالب
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">اسم الطالب</p>
              <p className="font-semibold text-slate-800">{data.student_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">الصف</p>
              <p className="font-semibold text-slate-800">{data.student_grade} - {data.student_class}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">تاريخ الغياب</p>
              <p className="font-semibold text-slate-800">{data.absence_date_formatted}</p>
            </div>
          </div>
          {data.days_remaining !== undefined && data.days_remaining > 0 && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
              ⏰ متبقي {data.days_remaining} يوم لتقديم العذر
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </span>
            نموذج العذر
          </h2>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Parent Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                اسم ولي الأمر <span className="text-slate-400">(اختياري)</span>
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                placeholder="أدخل اسمك"
                disabled={isSubmitting}
              />
            </div>

            {/* Excuse Text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                سبب الغياب <span className="text-red-500">*</span>
              </label>
              <textarea
                value={excuseText}
                onChange={(e) => setExcuseText(e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border ${errors.excuse_text ? 'border-red-300' : 'border-slate-200'} focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none`}
                placeholder="اكتب سبب غياب الطالب بالتفصيل..."
                disabled={isSubmitting}
              />
              {errors.excuse_text && (
                <p className="text-sm text-red-600 mt-1">{errors.excuse_text}</p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                مرفق (صورة أو مستند) <span className="text-slate-400">(اختياري)</span>
              </label>
              
              {!file ? (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed ${errors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50'} rounded-xl cursor-pointer hover:bg-slate-100 transition`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-500">اضغط لرفع ملف</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG أو PDF (حد 5 ميجا)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {file.type.includes('pdf') ? (
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                    disabled={isSubmitting}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
              {errors.file && (
                <p className="text-sm text-red-600 mt-1">{errors.file}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  إرسال العذر
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          سيتم مراجعة العذر من قبل إدارة المدرسة وإشعاركم بالقرار عبر الواتساب
        </p>
      </div>
    </div>
  )
}

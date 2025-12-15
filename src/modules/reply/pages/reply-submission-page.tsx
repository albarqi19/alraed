import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getReplyByToken, submitReply } from '../api'
import type { ReplyData } from '../api'

type PageState =
    | { type: 'loading' }
    | { type: 'error'; errorCode?: string; message: string }
    | { type: 'form'; data: ReplyData }
    | { type: 'already_replied' }
    | { type: 'success'; message: string }

export function ReplySubmissionPage() {
    const { token } = useParams<{ token: string }>()
    const [pageState, setPageState] = useState<PageState>({ type: 'loading' })
    const [replyText, setReplyText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const loadReplyData = useCallback(async () => {
        if (!token) {
            setPageState({ type: 'error', message: 'الرابط غير صحيح' })
            return
        }

        try {
            const response = await getReplyByToken(token)

            if (!response.success) {
                // Check for already replied
                if (response.error_code === 'ALREADY_REPLIED') {
                    setPageState({ type: 'already_replied' })
                    return
                }
                setPageState({
                    type: 'error',
                    errorCode: response.error_code,
                    message: response.message ?? 'حدث خطأ',
                })
                return
            }

            if (response.can_reply && response.data) {
                setPageState({ type: 'form', data: response.data })
            }
        } catch {
            setPageState({ type: 'error', message: 'حدث خطأ في الاتصال بالخادم' })
        }
    }, [token])

    useEffect(() => {
        loadReplyData()
    }, [loadReplyData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return

        // Validation
        const newErrors: Record<string, string> = {}
        if (replyText.trim().length < 5) {
            newErrors.reply_text = 'يرجى كتابة رد أطول (5 أحرف على الأقل)'
        }
        if (replyText.trim().length > 1000) {
            newErrors.reply_text = 'الرد طويل جداً (الحد الأقصى 1000 حرف)'
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const response = await submitReply(token, replyText.trim())

            if (response.success) {
                setPageState({ type: 'success', message: response.message ?? 'تم إرسال الرد بنجاح' })
            } else {
                if (response.errors) {
                    const formattedErrors: Record<string, string> = {}
                    for (const [key, messages] of Object.entries(response.errors)) {
                        formattedErrors[key] = Array.isArray(messages) ? messages[0] : messages
                    }
                    setErrors(formattedErrors)
                } else {
                    setErrors({ general: response.message ?? 'حدث خطأ' })
                }
            }
        } catch {
            setErrors({ general: 'حدث خطأ في الاتصال بالخادم' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (pageState.type === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4" dir="rtl">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
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
                    <p className="text-slate-600">{pageState.message}</p>
                </div>
            </div>
        )
    }

    // Already replied state
    if (pageState.type === 'already_replied') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">تم الرد مسبقاً</h1>
                    <p className="text-slate-600">لقد قمت بالرد على هذه الرسالة من قبل. لا يمكن الرد أكثر من مرة.</p>
                </div>
            </div>
        )
    }

    // Success state
    if (pageState.type === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4" dir="rtl">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">تم إرسال ردك بنجاح</h1>
                    <p className="text-slate-600">{pageState.message}</p>
                    <p className="text-sm text-slate-500 mt-4">
                        سيتمكن المعلم من رؤية ردك في لوحة التحكم الخاصة به
                    </p>
                </div>
            </div>
        )
    }

    // Form state
    const { data } = pageState

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8 px-4" dir="rtl">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">الرد على رسالة المعلم</h1>
                    <p className="text-slate-600 mt-2">يمكنك الرد على رسالة المعلم من هنا</p>
                </div>

                {/* Message Info Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </span>
                        الرسالة الأصلية
                    </h2>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">المعلم:</span>
                            <span className="font-semibold text-slate-800">{data.teacher_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">الطالب:</span>
                            <span className="font-semibold text-slate-800">{data.student_name}</span>
                        </div>
                        {data.subject_name && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">المادة:</span>
                                <span className="font-semibold text-slate-800">{data.subject_name}</span>
                            </div>
                        )}
                        <div className="border-t pt-3 mt-3">
                            <p className="text-sm text-slate-500 mb-1">نوع الرسالة:</p>
                            <p className="font-medium text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full text-sm">
                                {data.template_title}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </span>
                        ردك على الرسالة
                    </h2>

                    {errors.general && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                            {errors.general}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Reply Text */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                نص الرد <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={5}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.reply_text ? 'border-red-300' : 'border-slate-200'
                                    } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition resize-none`}
                                placeholder="اكتب ردك هنا..."
                                disabled={isSubmitting}
                                maxLength={1000}
                            />
                            <div className="flex justify-between mt-1">
                                {errors.reply_text ? (
                                    <p className="text-sm text-red-600">{errors.reply_text}</p>
                                ) : (
                                    <span />
                                )}
                                <p className="text-xs text-slate-400">{replyText.length}/1000</p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                    إرسال الرد
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    لا يمكن الرد أكثر من مرة على نفس الرسالة
                </p>

                {/* School Name */}
                <p className="text-center text-sm text-slate-600 mt-4 font-medium">
                    {data.school_name}
                </p>
            </div>
        </div>
    )
}

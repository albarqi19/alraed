import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import clsx from 'classnames'

interface ReplyData {
    id: number
    reply_text: string
    replied_at: string
    is_read: boolean
    read_at: string | null
    teacher_message: {
        id: number
        student_id: number
        template_title: string
        subject_name: string
        created_at: string
        student: {
            id: number
            name: string
        }
    }
}

interface RepliesResponse {
    success: boolean
    replies: {
        data: ReplyData[]
        current_page: number
        last_page: number
        total: number
    }
    unread_count: number
}

export function TeacherRepliesPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [selectedReply, setSelectedReply] = useState<ReplyData | null>(null)

    // Fetch replies
    const { data, isLoading, error } = useQuery({
        queryKey: ['teacher', 'message-replies'],
        queryFn: async () => {
            const response = await apiClient.get<RepliesResponse>('/teacher/messages/replies')
            return response.data
        },
    })

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (replyId: number) => {
            const response = await apiClient.patch(`/teacher/messages/replies/${replyId}/read`)
            return response.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher', 'message-replies'] })
        },
    })

    const replies = data?.replies?.data || []
    const unreadCount = data?.unread_count || 0

    const filteredReplies = replies.filter(reply => {
        if (filter === 'unread') return !reply.is_read
        if (filter === 'read') return reply.is_read
        return true
    })

    const handleReplyClick = (reply: ReplyData) => {
        setSelectedReply(reply)
        if (!reply.is_read) {
            markAsReadMutation.mutate(reply.id)
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (isLoading) {
        return (
            <section className="space-y-6">
                <header className="flex items-center gap-4 text-right">
                    <button
                        type="button"
                        onClick={() => navigate('/teacher/messages')}
                        className="rounded-full p-2 hover:bg-slate-100"
                    >
                        <i className="bi bi-arrow-right text-xl" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">ردود أولياء الأمور</h1>
                    </div>
                </header>
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full" />
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className="space-y-6">
                <header className="flex items-center gap-4 text-right">
                    <button
                        type="button"
                        onClick={() => navigate('/teacher/messages')}
                        className="rounded-full p-2 hover:bg-slate-100"
                    >
                        <i className="bi bi-arrow-right text-xl" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">ردود أولياء الأمور</h1>
                    </div>
                </header>
                <div className="glass-card text-center py-10">
                    <div className="text-4xl mb-3">❌</div>
                    <p className="text-slate-600">حدث خطأ في تحميل الردود</p>
                </div>
            </section>
        )
    }

    return (
        <>
            {/* Modal لعرض الرد */}
            {selectedReply && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedReply(null)}
                >
                    <div
                        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-4 text-right">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReply(null)}
                                    className="text-2xl text-slate-400 hover:text-slate-600"
                                >
                                    ×
                                </button>
                                <h2 className="text-xl font-bold text-slate-900">تفاصيل الرد</h2>
                            </div>

                            {/* معلومات الطالب والرسالة */}
                            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">الطالب:</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedReply.teacher_message.student?.name || 'غير محدد'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">نوع الرسالة:</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedReply.teacher_message.template_title}
                                    </span>
                                </div>
                                {selectedReply.teacher_message.subject_name && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-500">المادة:</span>
                                        <span className="font-semibold text-slate-800">
                                            {selectedReply.teacher_message.subject_name}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-500">تاريخ الإرسال:</span>
                                    <span className="text-sm text-slate-600">
                                        {formatDate(selectedReply.teacher_message.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* نص الرد */}
                            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-4">
                                <p className="text-sm text-emerald-700 font-semibold mb-2">📩 رد ولي الأمر:</p>
                                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {selectedReply.reply_text}
                                </p>
                                <p className="text-xs text-slate-500 mt-3 text-left">
                                    {formatDate(selectedReply.replied_at)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedReply(null)}
                                className="button-primary w-full"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="space-y-6">
                {/* Header */}
                <header className="flex items-center gap-4 text-right">
                    <button
                        type="button"
                        onClick={() => navigate('/teacher/messages')}
                        className="rounded-full p-2 hover:bg-slate-100"
                    >
                        <i className="bi bi-arrow-right text-xl" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-slate-900">ردود أولياء الأمور</h1>
                        <p className="text-sm text-muted">عرض ردود أولياء الأمور على رسائلك</p>
                    </div>
                </header>

                {/* إحصائيات */}
                <div className="grid gap-4 grid-cols-3">
                    <div className="glass-card text-center py-4">
                        <div className="text-3xl font-bold text-slate-800">{replies.length}</div>
                        <p className="text-sm text-muted mt-1">إجمالي الردود</p>
                    </div>
                    <div className="glass-card text-center py-4 border-2 border-amber-200 bg-amber-50">
                        <div className="text-3xl font-bold text-amber-600">{unreadCount}</div>
                        <p className="text-sm text-amber-700 mt-1">غير مقروءة</p>
                    </div>
                    <div className="glass-card text-center py-4 border-2 border-emerald-200 bg-emerald-50">
                        <div className="text-3xl font-bold text-emerald-600">{replies.length - unreadCount}</div>
                        <p className="text-sm text-emerald-700 mt-1">مقروءة</p>
                    </div>
                </div>

                {/* فلتر */}
                <div className="flex gap-2 justify-center">
                    {[
                        { key: 'all', label: 'الكل' },
                        { key: 'unread', label: 'غير مقروءة' },
                        { key: 'read', label: 'مقروءة' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key as typeof filter)}
                            className={clsx(
                                'px-4 py-2 rounded-full text-sm font-semibold transition',
                                filter === key
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* قائمة الردود */}
                {filteredReplies.length === 0 ? (
                    <div className="glass-card text-center py-12">
                        <div className="text-5xl mb-4">📭</div>
                        <p className="text-lg font-semibold text-slate-700">
                            {filter === 'unread' ? 'لا توجد ردود غير مقروءة' :
                                filter === 'read' ? 'لا توجد ردود مقروءة' :
                                    'لا توجد ردود حتى الآن'}
                        </p>
                        <p className="text-sm text-muted mt-2">
                            ستظهر هنا ردود أولياء الأمور على رسائلك
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredReplies.map((reply) => (
                            <button
                                key={reply.id}
                                type="button"
                                onClick={() => handleReplyClick(reply)}
                                className={clsx(
                                    'w-full rounded-2xl border-2 p-4 text-right transition hover:shadow-md',
                                    reply.is_read
                                        ? 'border-slate-200 bg-white'
                                        : 'border-amber-300 bg-amber-50'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                        reply.is_read ? 'bg-slate-100' : 'bg-amber-100'
                                    )}>
                                        {reply.is_read ? (
                                            <i className="bi bi-envelope-open text-slate-500" />
                                        ) : (
                                            <i className="bi bi-envelope-fill text-amber-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-slate-900 truncate">
                                                {reply.teacher_message.student?.name || 'ولي أمر'}
                                            </span>
                                            {!reply.is_read && (
                                                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                                                    جديد
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 truncate mt-1">
                                            {reply.reply_text}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                                            <span>{reply.teacher_message.template_title}</span>
                                            <span>•</span>
                                            <span>{formatDate(reply.replied_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </>
    )
}

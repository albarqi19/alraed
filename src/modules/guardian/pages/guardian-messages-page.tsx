import { useState, useMemo } from 'react'
import {
    MessageSquare,
    AlertTriangle,
    Clock,
    User,
    Phone,
    ChevronDown,
    ChevronUp,
    Loader2,
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import { useGuardianMessagesQuery } from '../hooks'
import type { GuardianMessage } from '../api'

type MessageFilter = 'all' | 'absence' | 'late' | 'teacher'

export function GuardianMessagesPage() {
    const { currentNationalId, guardianSettings } = useGuardianContext()
    const messagesQuery = useGuardianMessagesQuery(currentNationalId)

    const [expandedMessage, setExpandedMessage] = useState<number | null>(null)
    const [activeFilter, setActiveFilter] = useState<MessageFilter>('all')

    const messages = messagesQuery.data?.messages ?? []
    const unreadCount = messagesQuery.data?.unread ?? 0
    const isLoading = messagesQuery.isLoading

    const filteredMessages = useMemo(() => {
        if (activeFilter === 'all') return messages
        return messages.filter(msg => msg.type === activeFilter)
    }, [messages, activeFilter])

    const messageCounts = useMemo(() => ({
        all: messages.length,
        absence: messages.filter(m => m.type === 'absence').length,
        late: messages.filter(m => m.type === 'late').length,
        teacher: messages.filter(m => m.type === 'teacher').length,
    }), [messages])

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">الرسائل</h2>
                <p className="mt-1 text-sm text-slate-500">
                    {unreadCount > 0 ? `لديك ${unreadCount} رسائل جديدة` : 'جميع إشعارات الطالب'}
                </p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <FilterButton
                    active={activeFilter === 'all'}
                    onClick={() => setActiveFilter('all')}
                    label="الكل"
                    count={messageCounts.all}
                />
                <FilterButton
                    active={activeFilter === 'absence'}
                    onClick={() => setActiveFilter('absence')}
                    label="الغياب"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    count={messageCounts.absence}
                />
                <FilterButton
                    active={activeFilter === 'late'}
                    onClick={() => setActiveFilter('late')}
                    label="التأخر"
                    icon={<Clock className="h-4 w-4" />}
                    count={messageCounts.late}
                />
                <FilterButton
                    active={activeFilter === 'teacher'}
                    onClick={() => setActiveFilter('teacher')}
                    label="المعلمين"
                    icon={<User className="h-4 w-4" />}
                    count={messageCounts.teacher}
                />
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="mr-2 text-sm text-slate-500">جاري تحميل الرسائل...</span>
                </div>
            )}

            {/* Messages list */}
            {!isLoading && (
                <div className="space-y-3">
                    {filteredMessages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                            <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-3 text-sm text-slate-500">
                                {messages.length === 0 ? 'لا توجد رسائل' : 'لا توجد رسائل في هذا التصنيف'}
                            </p>
                        </div>
                    ) : (
                        filteredMessages.map((message) => (
                            <MessageCard
                                key={message.id}
                                message={message}
                                isExpanded={expandedMessage === message.id}
                                onToggle={() => setExpandedMessage(
                                    expandedMessage === message.id ? null : message.id
                                )}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Contact school button */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 font-bold text-slate-900">التواصل مع المدرسة</h3>
                <p className="mb-4 text-sm text-slate-500">
                    للاستفسارات والملاحظات، يمكنك التواصل مع إدارة المدرسة
                </p>

                {guardianSettings?.school_phone && (
                    <a
                        href={`tel:${guardianSettings.school_phone}`}
                        className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                        <Phone className="h-4 w-4" />
                        الاتصال بالمدرسة
                    </a>
                )}

                <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >
                    <MessageSquare className="h-4 w-4" />
                    إرسال رسالة للمدرسة
                </button>
                <p className="mt-2 text-center text-xs text-slate-400">
                    * هذه الميزة قيد التطوير
                </p>
            </div>
        </div>
    )
}

// Filter button component
function FilterButton({
    active,
    onClick,
    label,
    icon,
    count
}: {
    active: boolean
    onClick: () => void
    label: string
    icon?: React.ReactNode
    count: number
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
        >
            {icon}
            {label}
            <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                {count}
            </span>
        </button>
    )
}

// Message card component
function MessageCard({
    message,
    isExpanded,
    onToggle
}: {
    message: GuardianMessage
    isExpanded: boolean
    onToggle: () => void
}) {
    const typeStyles = {
        absence: {
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-100',
        },
        late: {
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
        },
        teacher: {
            icon: User,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
        },
        general: {
            icon: MessageSquare,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
        },
    }

    const style = typeStyles[message.type] ?? typeStyles.general
    const Icon = style.icon

    return (
        <div
            className={`rounded-2xl border bg-white shadow-sm transition ${message.is_read ? 'border-slate-200' : 'border-indigo-200 bg-indigo-50/30'
                }`}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center gap-3 p-4 text-right"
            >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                    <Icon className={`h-5 w-5 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-semibold ${message.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                            {message.title}
                        </p>
                        {!message.is_read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        {new Date(message.date).toLocaleDateString('ar-SA')}
                    </p>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="text-sm text-slate-600 leading-relaxed">{message.content}</p>
                    {message.teacher_name && (
                        <p className="mt-2 text-xs text-slate-500">
                            من: {message.teacher_name}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

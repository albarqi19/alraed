import { useState } from 'react'
import {
    MessageSquare,
    AlertTriangle,
    Clock,
    User,
    Phone,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'

interface MessageItem {
    id: number
    type: 'absence' | 'late' | 'teacher'
    title: string
    content: string
    date: string
    teacherName?: string
    isRead: boolean
}

// Mock data - would come from backend
const MOCK_MESSAGES: MessageItem[] = [
    {
        id: 1,
        type: 'absence',
        title: 'إشعار غياب',
        content: 'نود إعلامكم بغياب الطالب عن الحصة الثانية يوم الأحد',
        date: '2025-12-15',
        isRead: false,
    },
    {
        id: 2,
        type: 'late',
        title: 'تأخر عن الحضور',
        content: 'تأخر الطالب عن الطابور الصباحي بـ 15 دقيقة',
        date: '2025-12-14',
        isRead: true,
    },
    {
        id: 3,
        type: 'teacher',
        title: 'رسالة من معلم الرياضيات',
        content: 'نرجو متابعة الطالب في الواجبات المنزلية',
        date: '2025-12-13',
        teacherName: 'أ. محمد العلي',
        isRead: true,
    },
]

export function GuardianMessagesPage() {
    const { guardianSettings } = useGuardianContext()
    const [expandedMessage, setExpandedMessage] = useState<number | null>(null)
    const [activeFilter, setActiveFilter] = useState<'all' | 'absence' | 'late' | 'teacher'>('all')

    const filteredMessages = MOCK_MESSAGES.filter(msg =>
        activeFilter === 'all' || msg.type === activeFilter
    )

    const unreadCount = MOCK_MESSAGES.filter(m => !m.isRead).length

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">الرسائل</h2>
                <p className="mt-1 text-sm text-slate-500">
                    {unreadCount > 0 ? `لديك ${unreadCount} رسائل جديدة` : 'لا توجد رسائل جديدة'}
                </p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <FilterButton
                    active={activeFilter === 'all'}
                    onClick={() => setActiveFilter('all')}
                    label="الكل"
                    count={MOCK_MESSAGES.length}
                />
                <FilterButton
                    active={activeFilter === 'absence'}
                    onClick={() => setActiveFilter('absence')}
                    label="الغياب"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    count={MOCK_MESSAGES.filter(m => m.type === 'absence').length}
                />
                <FilterButton
                    active={activeFilter === 'late'}
                    onClick={() => setActiveFilter('late')}
                    label="التأخر"
                    icon={<Clock className="h-4 w-4" />}
                    count={MOCK_MESSAGES.filter(m => m.type === 'late').length}
                />
                <FilterButton
                    active={activeFilter === 'teacher'}
                    onClick={() => setActiveFilter('teacher')}
                    label="المعلمين"
                    icon={<User className="h-4 w-4" />}
                    count={MOCK_MESSAGES.filter(m => m.type === 'teacher').length}
                />
            </div>

            {/* Messages list */}
            <div className="space-y-3">
                {filteredMessages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                        <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="mt-3 text-sm text-slate-500">لا توجد رسائل</p>
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
    message: MessageItem
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
    }

    const style = typeStyles[message.type]
    const Icon = style.icon

    return (
        <div
            className={`rounded-2xl border bg-white shadow-sm transition ${message.isRead ? 'border-slate-200' : 'border-indigo-200 bg-indigo-50/30'
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
                        <p className={`font-semibold ${message.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                            {message.title}
                        </p>
                        {!message.isRead && (
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
                    {message.teacherName && (
                        <p className="mt-2 text-xs text-slate-500">
                            من: {message.teacherName}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

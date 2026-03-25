import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
    MessageSquare,
    AlertTriangle,
    Clock,
    User,
    Phone,
    ChevronDown,
    ChevronUp,
    Loader2,
    School,
    ArrowRight,
    Plus,
    Send,
    MessageCircle,
} from 'lucide-react'
import { useGuardianContext } from '../context/guardian-context'
import { useGuardianMessagesQuery } from '../hooks'
import type { GuardianMessage } from '../api'
import {
    useGuardianConversationsQuery,
    useGuardianMessagesQuery as useGuardianChatMessagesQuery,
    useSendGuardianMessageMutation,
    useMarkGuardianReadMutation,
    useGuardianContactsQuery,
    useStartGuardianConversationMutation,
} from '@/modules/chat/hooks'
import { isGuardianAuthenticated, getGuardianToken } from '@/services/api/guardian-client'
import { useInitEcho, useChatRealtime, useChatListRealtime } from '@/modules/chat/services/chat-realtime'
import type { Conversation, ChatContact } from '@/modules/chat/types'

type MainTab = 'notifications' | 'chat'
type MessageFilter = 'school' | 'teacher' | 'absence' | 'late'

export function GuardianMessagesPage() {
    const { currentNationalId, guardianSettings } = useGuardianContext()
    const [mainTab, setMainTab] = useState<MainTab>('notifications')

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">التواصل</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">الإشعارات والمحادثات</p>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 rounded-2xl p-1">
                <button
                    onClick={() => setMainTab('notifications')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                        mainTab === 'notifications' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    الإشعارات
                </button>
                <button
                    onClick={() => setMainTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                        mainTab === 'chat' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    <MessageCircle className="h-4 w-4" />
                    المحادثات
                </button>
            </div>

            {mainTab === 'notifications' ? (
                <NotificationsTab nationalId={currentNationalId} guardianSettings={guardianSettings} />
            ) : (
                <ChatTab />
            )}
        </div>
    )
}

// ============================================================
// TAB 1: الإشعارات (الرسائل القديمة)
// ============================================================
function NotificationsTab({ nationalId, guardianSettings }: { nationalId: string | null; guardianSettings: any }) {
    const messagesQuery = useGuardianMessagesQuery(nationalId)
    const [expandedMessage, setExpandedMessage] = useState<number | null>(null)
    const [activeFilter, setActiveFilter] = useState<MessageFilter>('school')

    const messages = messagesQuery.data?.messages ?? []
    const isLoading = messagesQuery.isLoading

    const filteredMessages = useMemo(() => {
        if (activeFilter === 'school') return messages.filter(msg => msg.type === 'general')
        return messages.filter(msg => msg.type === activeFilter)
    }, [messages, activeFilter])

    const messageCounts = useMemo(() => ({
        school: messages.filter(m => m.type === 'general').length,
        teacher: messages.filter(m => m.type === 'teacher').length,
        absence: messages.filter(m => m.type === 'absence').length,
        late: messages.filter(m => m.type === 'late').length,
    }), [messages])

    return (
        <>
            <div className="flex gap-2 overflow-x-auto pb-2">
                <FilterButton active={activeFilter === 'school'} onClick={() => setActiveFilter('school')} label="المدرسة" icon={<School className="h-4 w-4" />} count={messageCounts.school} />
                <FilterButton active={activeFilter === 'teacher'} onClick={() => setActiveFilter('teacher')} label="المعلمين" icon={<User className="h-4 w-4" />} count={messageCounts.teacher} />
                <FilterButton active={activeFilter === 'absence'} onClick={() => setActiveFilter('absence')} label="الغياب" icon={<AlertTriangle className="h-4 w-4" />} count={messageCounts.absence} />
                <FilterButton active={activeFilter === 'late'} onClick={() => setActiveFilter('late')} label="التأخر" icon={<Clock className="h-4 w-4" />} count={messageCounts.late} />
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="mr-2 text-sm text-slate-500 dark:text-slate-400">جاري تحميل الرسائل...</span>
                </div>
            )}

            {!isLoading && (
                <div className="space-y-3">
                    {filteredMessages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
                            <MessageSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-500" />
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{messages.length === 0 ? 'لا توجد رسائل' : 'لا توجد رسائل في هذا التصنيف'}</p>
                        </div>
                    ) : filteredMessages.map((message) => (
                        <MessageCard key={message.id} message={message} isExpanded={expandedMessage === message.id} onToggle={() => setExpandedMessage(expandedMessage === message.id ? null : message.id)} />
                    ))}
                </div>
            )}

            {guardianSettings?.school_phone && (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                    <a href={`tel:${guardianSettings.school_phone}`} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                        <Phone className="h-4 w-4" /> الاتصال بالمدرسة
                    </a>
                </div>
            )}
        </>
    )
}

// ============================================================
// TAB 2: المحادثات
// ============================================================
function ChatTab() {
    const authenticated = isGuardianAuthenticated()
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
    const [messageText, setMessageText] = useState('')
    const [showContacts, setShowContacts] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const prevMsgCountRef = useRef(0)

    const conversationsQuery = useGuardianConversationsQuery()
    const messagesQuery = useGuardianChatMessagesQuery(activeConversation?.id ?? null)
    const contactsQuery = useGuardianContactsQuery()
    const sendMessageMutation = useSendGuardianMessageMutation(activeConversation?.id ?? 0)
    const markReadMutation = useMarkGuardianReadMutation(activeConversation?.id ?? 0)
    const startConversationMutation = useStartGuardianConversationMutation()

    // تهيئة WebSocket
    useInitEcho(getGuardianToken())
    const guardianId = conversationsQuery.data?.data?.[0]?.guardian_id ?? null
    useChatListRealtime('guardian', guardianId)
    useChatRealtime(activeConversation?.id ?? null)

    const conversations = conversationsQuery.data?.data ?? []
    const messages = messagesQuery.data?.pages?.flatMap((p) => p.data) ?? []
    const sortedMessages = [...messages].reverse()
    const myGuardianId = conversations[0]?.guardian_id ?? 0

    useEffect(() => {
        if (sortedMessages.length > 0 && sortedMessages.length !== prevMsgCountRef.current) {
            const behavior = prevMsgCountRef.current === 0 ? 'instant' as ScrollBehavior : 'smooth'
            bottomRef.current?.scrollIntoView({ behavior })
            prevMsgCountRef.current = sortedMessages.length
        }
    }, [sortedMessages.length])

    useEffect(() => { prevMsgCountRef.current = 0 }, [activeConversation?.id])

    function handleSend() {
        const trimmed = messageText.trim()
        if (!trimmed || !activeConversation) return
        sendMessageMutation.mutate(trimmed, { onSuccess: () => setMessageText('') })
    }

    const handleSelectContact = useCallback((contact: ChatContact) => {
        startConversationMutation.mutate(
            { participant_id: contact.user_id, student_id: contact.student?.id ?? undefined },
            { onSuccess: (data) => { setActiveConversation(data.conversation); setShowContacts(false) } },
        )
    }, [startConversationMutation])

    if (!authenticated) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-500" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">سجّل الدخول مجدداً لتفعيل المحادثات</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">أعد الدخول ببيانات الطالب لاستخدام المحادثات</p>
            </div>
        )
    }

    // التحقق من أن الدردشة معطّلة (403)
    const chatDisabled = conversationsQuery.error && (conversationsQuery.error as any)?.response?.status === 403

    if (chatDisabled) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950 p-8 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <MessageCircle className="h-7 w-7 text-amber-500" />
                </div>
                <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200">المحادثات غير متاحة حالياً</p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">تم تعطيل خدمة المحادثات من قبل إدارة المدرسة</p>
            </div>
        )
    }

    // عرض محادثة مفتوحة
    if (activeConversation) {
        return (
            <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '300px' }}>
                {/* Header ثابت */}
                <div className="shrink-0 flex items-center gap-3 rounded-t-2xl bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
                    <button onClick={() => { setActiveConversation(null); prevMsgCountRef.current = 0 }} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <ArrowRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{activeConversation.participant?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{activeConversation.student?.name}</p>
                    </div>
                </div>

                {/* الرسائل - هذا يتمرر */}
                <div className="shrink-0 text-center py-1.5 bg-amber-50/80 dark:bg-amber-950/80 border-x border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">🔒 هذه المحادثة تخضع لإشراف إدارة المدرسة</p>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-700 px-3 py-3 space-y-2 border-x border-slate-200 dark:border-slate-700">
                    {sortedMessages.map((msg) => {
                        const isOwn = msg.sender_type === 'guardian' && msg.sender_id === myGuardianId
                        const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

                        if (msg.type === 'system') {
                            return <div key={msg.id} className="flex justify-center my-2"><div className="bg-slate-200/70 dark:bg-slate-600/70 text-slate-500 dark:text-slate-400 text-xs px-3 py-1.5 rounded-full text-center">{msg.body}</div></div>
                        }

                        return (
                            <div key={msg.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
                                    isOwn ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                                }`}>
                                    <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                                    <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-start' : 'justify-end'}`}>
                                        <span className={`text-[10px] ${isOwn ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{time}</span>
                                        {isOwn && <span className={`text-[10px] ${msg.read_at ? 'text-cyan-200' : 'text-indigo-200'}`}>{msg.read_at ? '✓✓' : msg.delivered_at ? '✓✓' : '✓'}</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* حقل الإدخال - ثابت أسفل */}
                {activeConversation.status === 'active' ? (
                    <div className="shrink-0 flex items-end gap-2 p-3 bg-white dark:bg-slate-800 rounded-b-2xl border border-slate-200 dark:border-slate-700">
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            placeholder="اكتب رسالتك..."
                            rows={1}
                            className="flex-1 min-h-[40px] max-h-[80px] resize-none rounded-xl bg-slate-100 dark:bg-slate-700 text-sm px-3 py-2.5 border-0 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                        />
                        <button onClick={handleSend} disabled={!messageText.trim() || sendMessageMutation.isPending} className="shrink-0 h-10 w-10 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white flex items-center justify-center transition">
                            <Send className="h-4 w-4 rotate-180" />
                        </button>
                    </div>
                ) : (
                    <div className="shrink-0 p-3 text-center text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-b-2xl border border-slate-200 dark:border-slate-700">
                        هذه المحادثة {activeConversation.status === 'closed' ? 'مغلقة' : 'مؤرشفة'}
                    </div>
                )}
            </div>
        )
    }

    // قائمة المحادثات
    return (
        <>
            {conversationsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-8 text-center">
                    <MessageCircle className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-500" />
                    <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">لا توجد محادثات بعد</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">ابدأ محادثة مع معلم أو الإدارة</p>
                    <button onClick={() => setShowContacts(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
                        <Plus className="h-4 w-4" /> محادثة جديدة
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                setActiveConversation(conv)
                                if (conv.guardian_unread_count > 0) markReadMutation.mutate()
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border transition active:bg-slate-50 dark:active:bg-slate-700 ${
                                conv.guardian_unread_count > 0 ? 'border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{conv.participant?.name}</span>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                                        {conv.last_message_at && new Date(conv.last_message_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.last_message_preview ?? conv.student?.name}</span>
                                    {conv.guardian_unread_count > 0 && (
                                        <span className="shrink-0 bg-indigo-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">{conv.guardian_unread_count}</span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}

                    <button onClick={() => setShowContacts(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300">
                        <Plus className="h-4 w-4" /> محادثة جديدة
                    </button>
                </div>
            )}

            {/* نافذة اختيار جهة اتصال */}
            {showContacts && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowContacts(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 shrink-0">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">محادثة جديدة</h3>
                            <button onClick={() => setShowContacts(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full">
                                <ArrowRight className="h-5 w-5 text-slate-500 dark:text-slate-400 rotate-180" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 pb-4">
                            {contactsQuery.isLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                            ) : (contactsQuery.data?.contacts ?? []).length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">لا توجد جهات اتصال متاحة</p>
                            ) : (contactsQuery.data?.contacts ?? []).map((contact, i) => (
                                <button
                                    key={`${contact.user_id}-${contact.student?.id ?? i}`}
                                    onClick={() => handleSelectContact(contact)}
                                    disabled={startConversationMutation.isPending}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl active:bg-slate-50 dark:active:bg-slate-700 text-right transition"
                                >
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                                        <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{contact.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.role_label}{contact.student ? ` · ${contact.student.name}` : ''}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ============================================================
// Sub-components
// ============================================================
function FilterButton({ active, onClick, label, icon, count }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; count: number }) {
    return (
        <button type="button" onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {icon} {label} <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>{count}</span>
        </button>
    )
}

function MessageCard({ message, isExpanded, onToggle }: { message: GuardianMessage; isExpanded: boolean; onToggle: () => void }) {
    const typeStyles = {
        absence: { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900' },
        late: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900' },
        teacher: { icon: User, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900' },
        general: { icon: MessageSquare, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700' },
    }
    const style = typeStyles[message.type] ?? typeStyles.general
    const Icon = style.icon

    return (
        <div className={`rounded-2xl border bg-white dark:bg-slate-800 shadow-sm transition ${message.is_read ? 'border-slate-200 dark:border-slate-700' : 'border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/30'}`}>
            <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-right">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                    <Icon className={`h-5 w-5 ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-semibold ${message.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>{message.title}</p>
                        {!message.is_read && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(message.date).toLocaleDateString('ar-SA')}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
            </button>
            {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{message.content}</p>
                    {message.teacher_name && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">من: {message.teacher_name}</p>}
                </div>
            )}
        </div>
    )
}

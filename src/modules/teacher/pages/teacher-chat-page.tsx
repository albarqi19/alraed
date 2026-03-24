import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import {
  useStaffConversationsQuery,
  useStaffMessagesQuery,
  useSendStaffMessageMutation,
  useMarkStaffReadMutation,
  useStaffAvailabilityQuery,
  useToggleStaffAvailabilityMutation,
  useStaffMyStudentsQuery,
  useStartStaffConversationMutation,
} from '@/modules/chat/hooks'
import { useInitEcho, useChatRealtime, useChatListRealtime } from '@/modules/chat/services/chat-realtime'
import type { Conversation } from '@/modules/chat/types'

export default function TeacherChatPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef(0)

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [topOffset, setTopOffset] = useState(73)

  // قياس ارتفاع الهيدر العلوي الفعلي
  useEffect(() => {
    const nav = document.querySelector('nav.sticky')
    if (nav) {
      const updateHeight = () => setTopOffset(nav.getBoundingClientRect().height)
      updateHeight()
      const observer = new ResizeObserver(updateHeight)
      observer.observe(nav)
      return () => observer.disconnect()
    }
  }, [])

  const conversationsQuery = useStaffConversationsQuery()
  const messagesQuery = useStaffMessagesQuery(activeConversation?.id ?? null)
  const availabilityQuery = useStaffAvailabilityQuery()
  const myStudentsQuery = useStaffMyStudentsQuery()

  const sendMessageMutation = useSendStaffMessageMutation(activeConversation?.id ?? 0)
  const markReadMutation = useMarkStaffReadMutation(activeConversation?.id ?? 0)
  const toggleAvailabilityMutation = useToggleStaffAvailabilityMutation()
  const startConversationMutation = useStartStaffConversationMutation()

  // تهيئة WebSocket
  const authToken = window.localStorage.getItem('auth_token')
  useInitEcho(authToken)
  useChatListRealtime('user', user?.id ?? null)
  useChatRealtime(activeConversation?.id ?? null)

  const conversations = conversationsQuery.data?.data ?? []
  const messages = messagesQuery.data?.pages?.flatMap((p) => p.data) ?? []
  const isAvailable = availabilityQuery.data?.is_available ?? true
  const sortedMessages = [...messages].reverse()

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    return getOtherPartyName(c).toLowerCase().includes(s) || c.student?.name?.toLowerCase().includes(s) || c.last_message_preview?.toLowerCase().includes(s)
  })

  // منع scroll الصفحة الأم
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Scroll to bottom
  useEffect(() => {
    if (sortedMessages.length > 0 && sortedMessages.length !== prevMsgCountRef.current) {
      const behavior = prevMsgCountRef.current === 0 ? 'instant' as ScrollBehavior : 'smooth'
      bottomRef.current?.scrollIntoView({ behavior })
      prevMsgCountRef.current = sortedMessages.length
    }
  }, [sortedMessages.length])

  // Reset scroll counter when switching conversations
  useEffect(() => { prevMsgCountRef.current = 0 }, [activeConversation?.id])

  function getOtherPartyName(conv: Conversation) {
    if (conv.context_type === 'staff') return conv.admin_user?.name ?? 'الإدارة'
    return conv.guardian?.parent_name ?? conv.guardian?.parent_phone ?? 'ولي أمر'
  }

  function getSubtitle(conv: Conversation) {
    if (conv.context_type === 'staff') {
      const labels: Record<string, string> = { school_principal: 'مدير المدرسة', deputy_teachers: 'وكيل المعلمين', deputy_students: 'وكيل الطلاب' }
      return labels[conv.admin_user?.role ?? ''] ?? 'الإدارة'
    }
    return conv.student ? `${conv.student.name} - ${conv.student.grade}` : ''
  }

  function getTimeLabel(dateStr: string | null) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  }

  function handleSelectConversation(conv: Conversation) {
    setActiveConversation(conv)
    if (conv.participant_unread_count > 0) markReadMutation.mutate()
  }

  function handleSend() {
    const trimmed = messageText.trim()
    if (!trimmed || !activeConversation) return
    sendMessageMutation.mutate(trimmed, { onSuccess: () => setMessageText('') })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="fixed inset-x-0 bottom-[64px] sm:bottom-0 z-30 flex flex-col bg-slate-50 dark:bg-slate-900" style={{ top: topOffset }}>

      {/* ===== HEADER ثابت أعلى ===== */}
      <header className="shrink-0 bg-white dark:bg-slate-800 px-4 py-3 flex items-center gap-3 z-10">
        {activeConversation ? (
          <>
            <button onClick={() => setActiveConversation(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
              <i className="bi bi-arrow-right text-lg" />
            </button>
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${activeConversation.context_type === 'staff' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              <i className={`${activeConversation.context_type === 'staff' ? 'bi bi-building text-purple-600 dark:text-purple-400' : 'bi bi-person text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{getOtherPartyName(activeConversation)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{getSubtitle(activeConversation)}</p>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
              <i className="bi bi-arrow-right text-lg" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">المحادثات</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">تواصل مع أولياء الأمور والإدارة</p>
            </div>
            <button
              onClick={() => toggleAvailabilityMutation.mutate({ is_available: !isAvailable })}
              disabled={toggleAvailabilityMutation.isPending}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
            >
              {isAvailable ? '🟢 متاح' : '⚪ غير متاح'}
            </button>
          </>
        )}
      </header>

      {/* ===== المحتوى (يتمرر) ===== */}
      {activeConversation ? (
        <>
          {/* الرسائل - هذا فقط يتمرر */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {sortedMessages.map((msg) => {
              const isOwn = msg.sender_type === 'user' && msg.sender_id === user?.id
              const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

              if (msg.type === 'system') {
                return <div key={msg.id} className="flex justify-center my-3"><div className="bg-slate-200/70 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs px-4 py-1.5 rounded-full text-center">{msg.body}</div></div>
              }
              if (msg.is_deleted) {
                return <div key={msg.id} className="flex justify-center my-1"><span className="text-xs text-slate-400 italic">تم حذف هذه الرسالة</span></div>
              }

              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    isOwn
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                  }`}>
                    <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>{time}</span>
                      {isOwn && <span className={`text-[10px] ${msg.read_at ? 'text-cyan-200' : 'text-blue-200'}`}>{msg.read_at ? '✓✓' : msg.delivered_at ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* ===== INPUT ثابت أسفل ===== */}
          {activeConversation.status === 'active' ? (
            <div className="shrink-0 bg-white dark:bg-slate-800 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالتك..."
                  rows={1}
                  className="flex-1 min-h-[42px] max-h-[100px] resize-none rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-4 py-2.5 border-0 focus:ring-2 focus:ring-blue-500/30 outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="shrink-0 h-[42px] w-[42px] rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white flex items-center justify-center transition-colors"
                >
                  <i className="bi bi-send-fill rotate-180 text-lg" />
                </button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 py-3 text-center text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
              هذه المحادثة {activeConversation.status === 'closed' ? 'مغلقة' : 'مؤرشفة'}
            </div>
          )}
        </>
      ) : (
        <>
          {/* بحث */}
          <div className="shrink-0 px-4 py-2">
            <div className="relative">
              <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المحادثات..."
                className="w-full pr-9 pl-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-0 focus:ring-2 focus:ring-blue-500/30 outline-none"
              />
            </div>
          </div>

          {/* قائمة المحادثات - هذا يتمرر */}
          <div className="flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-3">
                <i className="bi bi-chat-dots text-4xl" />
                <p className="text-sm font-medium">لا توجد محادثات</p>
                <p className="text-xs">اضغط + لبدء محادثة جديدة</p>
              </div>
            ) : filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors active:bg-slate-100 dark:active:bg-slate-700/50 ${conv.status !== 'active' ? 'opacity-50' : ''}`}
              >
                <div className={`shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
                  conv.context_type === 'staff' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <i className={`text-xl ${conv.context_type === 'staff' ? 'bi bi-building text-purple-600 dark:text-purple-400' : 'bi bi-person text-blue-600 dark:text-blue-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{getOtherPartyName(conv)}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{getTimeLabel(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.last_message_preview ?? getSubtitle(conv)}</span>
                    {conv.participant_unread_count > 0 && (
                      <span className="shrink-0 bg-blue-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">{conv.participant_unread_count}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* زر عائم */}
          <button
            onClick={() => setShowNewChat(true)}
            className="fixed bottom-24 left-5 h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center transition-all active:scale-95 z-40"
          >
            <i className="bi bi-plus-lg text-2xl" />
          </button>
        </>
      )}

      {/* نافذة محادثة جديدة */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">محادثة جديدة</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <i className="bi bi-x-lg text-slate-500" />
              </button>
            </div>
            <div className="px-4 pb-2 shrink-0">
              <div className="relative">
                <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ابحث عن طالب..."
                  className="w-full pr-9 pl-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border-0 focus:ring-2 focus:ring-blue-500/30 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {myStudentsQuery.isLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" /></div>
              ) : (
                myStudentsQuery.data?.guardians
                  ?.filter((g) => {
                    if (!studentSearch) return true
                    const s = studentSearch.toLowerCase()
                    return g.parent_name?.toLowerCase().includes(s) || g.parent_phone?.includes(s) || g.students.some((st) => st.name.toLowerCase().includes(s))
                  })
                  ?.map((guardian) =>
                    guardian.students.map((student) => (
                      <button
                        key={`${guardian.parent_phone}-${student.id}`}
                        onClick={() => {
                          startConversationMutation.mutate(student.id, {
                            onSuccess: (data) => { setActiveConversation(data.conversation); setShowNewChat(false); setStudentSearch('') },
                          })
                        }}
                        disabled={startConversationMutation.isPending}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl active:bg-slate-100 dark:active:bg-slate-700/50 text-right transition-colors"
                      >
                        <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <i className="bi bi-person text-blue-600 dark:text-blue-400 text-xl" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{student.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{guardian.parent_name ?? guardian.parent_phone} · {student.grade} / {student.class_name}</p>
                        </div>
                      </button>
                    ))
                  )
              )}
              {!myStudentsQuery.isLoading && !myStudentsQuery.data?.guardians?.length && (
                <p className="text-center text-sm text-slate-400 py-8">لا يوجد طلاب مرتبطين بحصصك</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

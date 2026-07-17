import { useState, useRef, useEffect } from 'react'
import {
  ArrowRight, Settings, MessageCircle, User, Search, X, Plus,
  Archive, Lock, RotateCcw, Trash2, UserPlus, Clock, Send, Power, Moon,
  UserRound, Eye,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSelect,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsTextarea,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
  InitialAvatar,
  type Tone,
} from '@/shared/workspace'
import {
  useAdminConversationsQuery,
  useAdminMessagesQuery,
  useChatStatsQuery,
  useCloseConversationMutation,
  useArchiveConversationMutation,
  useReopenConversationMutation,
  useBlockGuardianMutation,
  useChatSettingsQuery,
  useUpdateChatSettingsMutation,
  useCounselorAssignmentsQuery,
  useCounselorsListQuery,
  useCreateCounselorAssignmentMutation,
  useDeleteCounselorAssignmentMutation,
  useBlockedGuardiansQuery,
  useUnblockGuardianMutation,
  useAdminContactsQuery,
  useStartAdminConversationMutation,
  useStartAdminStaffConversationMutation,
  useSendAdminMessageMutation,
} from '@/modules/chat/hooks'
import type { Conversation } from '@/modules/chat/types'
import { useToast } from '@/shared/feedback/use-toast'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useInitEcho, useChatRealtime, useChatListRealtime } from '@/modules/chat/services/chat-realtime'

const CONTEXT_META: Record<string, { label: string; tone: Tone }> = {
  teacher: { label: 'معلم', tone: TONES.gray },
  counselor: { label: 'موجه', tone: TONES.gray },
  staff: { label: 'موظفين', tone: TONES.gray },
  admin: { label: 'إدارة', tone: TONES.gray },
}

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'نشطة', tone: TONES.green },
  closed: { label: 'مغلقة', tone: TONES.gray },
  archived: { label: 'مؤرشفة', tone: TONES.gray },
}

/** مدة الصمت بالعربية */
function silenceLabel(ms: number): string {
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${hours} ساعة`
  const days = Math.round(hours / 24)
  return days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} أيام`
}

export default function AdminChatPage() {
  const toast = useToast()
  const adminUser = useAuthStore((s) => s.user)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [, setMobileShowMessages] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [newChatTab, setNewChatTab] = useState<'guardians' | 'staff'>('guardians')
  const [settingsTab, setSettingsTab] = useState<'general' | 'counselors' | 'blocked'>('general')
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMsgCountRef = useRef(0)

  // Queries
  const conversationsQuery = useAdminConversationsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    context_type: typeFilter !== 'all' ? typeFilter : undefined,
    search: searchQuery || undefined,
  })
  const messagesQuery = useAdminMessagesQuery(activeConversation?.id ?? null)
  const statsQuery = useChatStatsQuery()
  const settingsQuery = useChatSettingsQuery()
  const updateSettingsMutation = useUpdateChatSettingsMutation()
  const assignmentsQuery = useCounselorAssignmentsQuery()
  const counselorsQuery = useCounselorsListQuery()
  const createAssignmentMutation = useCreateCounselorAssignmentMutation()
  const deleteAssignmentMutation = useDeleteCounselorAssignmentMutation()
  const blockedQuery = useBlockedGuardiansQuery()
  const unblockMutation = useUnblockGuardianMutation()
  const contactsQuery = useAdminContactsQuery()
  const startConversationMutation = useStartAdminConversationMutation()
  const startStaffConversationMutation = useStartAdminStaffConversationMutation()
  const sendMessageMutation = useSendAdminMessageMutation(activeConversation?.id ?? -1)

  // Mutations
  const closeMutation = useCloseConversationMutation()
  const archiveMutation = useArchiveConversationMutation()
  const reopenMutation = useReopenConversationMutation()
  const blockMutation = useBlockGuardianMutation()

  // تهيئة WebSocket
  const adminAuthToken = window.localStorage.getItem('auth_token')
  useInitEcho(adminAuthToken)
  useChatListRealtime('user', adminUser?.id ?? null)
  useChatRealtime(activeConversation?.id ?? null)

  const conversations = conversationsQuery.data?.data ?? []
  const messages = messagesQuery.data?.pages?.flatMap((p) => p.data) ?? []
  const stats = statsQuery.data
  const settings = settingsQuery.data
  const sortedMessages = [...messages].reverse()

  // Scroll to bottom
  useEffect(() => {
    if (sortedMessages.length > 0 && sortedMessages.length !== prevMsgCountRef.current) {
      const behavior = prevMsgCountRef.current === 0 ? 'instant' as ScrollBehavior : 'smooth'
      bottomRef.current?.scrollIntoView({ behavior })
      prevMsgCountRef.current = sortedMessages.length
    }
  }, [sortedMessages.length])

  useEffect(() => { prevMsgCountRef.current = 0 }, [activeConversation?.id])

  // هل المحادثة تخص الإدارة الحالية (يمكنه الكتابة)
  const isOwnConversation = activeConversation?.participant_id === adminUser?.id
    || activeConversation?.admin_user_id === adminUser?.id

  // Settings form
  const [newCounselorId, setNewCounselorId] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newClassName, setNewClassName] = useState('')

  function handleSelectConversation(conv: Conversation) {
    setActiveConversation(conv)
    setMobileShowMessages(true)
  }

  function handleSend() {
    const trimmed = messageText.trim()
    if (!trimmed || !activeConversation || !isOwnConversation) return
    sendMessageMutation.mutate(trimmed, { onSuccess: () => setMessageText('') })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function getConversationTitle(conv: Conversation) {
    if (conv.context_type === 'staff') {
      // محادثة موظفين: admin_user ↔ participant
      const adminName = conv.admin_user?.name ?? 'الإدارة'
      const staffName = conv.participant?.name ?? 'موظف'
      return `${adminName} ↔ ${staffName}`
    }
    // محادثة ولي أمر
    const guardianName = conv.guardian?.parent_name ?? 'ولي أمر'
    const staffName = conv.participant?.name ?? ''
    return `${guardianName} ↔ ${staffName}`
  }

  function getMessageSenderName(msg: typeof sortedMessages[0], conv: Conversation) {
    if (conv.context_type === 'staff') {
      // في محادثات staff كلاهما user
      if (msg.sender_id === conv.admin_user_id) return conv.admin_user?.name ?? 'الإدارة'
      return conv.participant?.name ?? 'موظف'
    }
    // محادثة ولي أمر
    if (msg.sender_type === 'guardian') return conv.guardian?.parent_name ?? 'ولي أمر'
    return conv.participant?.name ?? 'موظف'
  }

  function getTimeLabel(dateStr: string | null) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  }

  // فلترة جهات الاتصال
  const filteredGuardians = (contactsQuery.data?.guardians ?? []).filter((g) => {
    if (!contactSearch) return true
    const s = contactSearch.toLowerCase()
    return g.parent_name?.toLowerCase().includes(s) || g.parent_phone?.includes(s) || g.student_names?.toLowerCase().includes(s)
  })

  const staffContacts = [...(contactsQuery.data?.teachers ?? []), ...(contactsQuery.data?.counselors ?? [])]
    .filter((t) => !contactSearch || t.name.toLowerCase().includes(contactSearch.toLowerCase()))

  /* ── مشتقات العرض ── */
  const dormantCount = conversations.filter((c) => c.status !== 'active').length
  const chatEnabled = settings?.chat_enabled ?? false

  return (
    <WsPage>
      <WsHeader
        title="المحادثات"
        badge="مراقبة"
        /* الأزرار كانت داخل {stats && ...} — فشل استعلام الإحصاء كان يسلب الأدمن وظيفتين */
        actions={
          <>
            <WsBtn variant="primary" icon={Plus} onClick={() => setShowNewChat(true)}>محادثة جديدة</WsBtn>
            <WsBtn icon={Settings} onClick={() => setShowSettings(true)}>الحوكمة</WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={MessageCircle} label="نشطة">
              <span style={{ color: TONES.green.tx }}>{stats?.active_conversations ?? 0}</span>
            </WsFact>
            <WsFact icon={Send} label="رسائل اليوم">{stats?.messages_today ?? 0}</WsFact>
            <WsFact icon={Power} label="الدردشة">
              <span style={{ color: chatEnabled ? TONES.green.tx : TONES.red.tx }}>
                {chatEnabled ? 'مفعّلة' : 'موقوفة'}
              </span>
            </WsFact>
            <WsFact icon={Moon} label="ساكنة">{dormantCount}</WsFact>
            <WsFact icon={Lock} label="محظورون">
              <span style={{ color: (stats?.blocked_guardians ?? 0) > 0 ? TONES.amber.tx : undefined }}>
                {stats?.blocked_guardians ?? 0}
              </span>
            </WsFact>
          </>
        }
      />

      {settingsQuery.data && !chatEnabled && (
        <WsToolbar>
          <WsAlert tone="warn" boxed style={{ width: '100%' }}>
            الدردشة موقوفة — لا يستطيع أحد إرسال رسائل جديدة. فعّلها من «الحوكمة».
          </WsAlert>
        </WsToolbar>
      )}

      <WsToolbar>
        <WsField label="بحث" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المحادثات..."
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
          </div>
        </WsField>
        <WsField label="الحالة">
          <WsSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">الكل</option>
            <option value="active">نشطة</option>
            <option value="closed">مغلقة</option>
            <option value="archived">مؤرشفة</option>
          </WsSelect>
        </WsField>
        <WsField label="النوع">
          <WsSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">الكل</option>
            <option value="teacher">معلم</option>
            <option value="counselor">موجه</option>
            <option value="admin">إدارة</option>
            <option value="staff">موظفين</option>
          </WsSelect>
        </WsField>
      </WsToolbar>

      <WsLayout>
        {/* قائمة المحادثات */}
        <WsSideCol
          side="start"
          title="المحادثات"
          icon={MessageCircle}
          storageKey="ws:admin-chat:list"
          width={330}
        >
          <WsBlock fill scroll>
            {conversationsQuery.isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : conversations.length === 0 ? (
              <WsEmpty icon={MessageCircle}>لا توجد محادثات</WsEmpty>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id
                const ctx = CONTEXT_META[conv.context_type] ?? CONTEXT_META.admin
                const st = STATUS_META[conv.status] ?? STATUS_META.active
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConversation(conv)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'right',
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--ws-hairline)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: 'var(--ws-text)',
                      background: isActive ? 'var(--ws-accent-soft)' : 'transparent',
                      boxShadow: isActive ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
                      opacity: conv.status !== 'active' ? 0.62 : 1,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <InitialAvatar
                        name={conv.guardian?.parent_name ?? conv.participant?.name ?? '؟'}
                        tone={conv.status === 'active' ? TONES.sky : TONES.gray}
                        size={28}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getConversationTitle(conv)}
                          </span>
                          <span style={{ fontSize: 9.5, color: 'var(--ws-text-2)', flexShrink: 0 }}>
                            {getTimeLabel(conv.last_message_at)}
                          </span>
                        </span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                          {conv.last_message_preview ?? conv.student?.name ?? '—'}
                        </span>
                        <span style={{ display: 'inline-flex', gap: 3, marginTop: 4 }}>
                          <ToneChip tone={ctx.tone}>{ctx.label}</ToneChip>
                          {conv.status !== 'active' && <ToneChip tone={st.tone}>{st.label}</ToneChip>}
                        </span>
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </WsBlock>
        </WsSideCol>

        <WsMain>
          {!activeConversation ? (
            <WsBlock fill>
              <WsEmpty icon={MessageCircle}>
                <p style={{ margin: 0 }}>اختر محادثة أو ابدأ محادثة جديدة</p>
              </WsEmpty>
            </WsBlock>
          ) : (
            <>
              <WsBlock
                fill
                scroll
                title={getConversationTitle(activeConversation)}
                icon={MessageCircle}
                tools={
                  <>
                    {activeConversation.student?.name && (
                      <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{activeConversation.student.name}</span>
                    )}
                    {!isOwnConversation && <ToneChip tone={TONES.sky}><Eye style={{ width: 10, height: 10 }} /> مراقبة</ToneChip>}
                    {activeConversation.status === 'active' ? (
                      <>
                        <WsIconBtn
                          icon={X}
                          label="إغلاق المحادثة"
                          onClick={() => { closeMutation.mutate(activeConversation.id); setActiveConversation(null) }}
                        />
                        <WsIconBtn
                          icon={Archive}
                          label="أرشفة"
                          onClick={() => { archiveMutation.mutate(activeConversation.id); setActiveConversation(null) }}
                        />
                      </>
                    ) : (
                      <WsIconBtn icon={RotateCcw} label="إعادة فتح" onClick={() => reopenMutation.mutate(activeConversation.id)} />
                    )}
                    {activeConversation.guardian_id && (
                      <WsIconBtn
                        icon={Lock}
                        label="حظر ولي الأمر"
                        onClick={() => blockMutation.mutate({ guardianId: activeConversation.guardian_id! })}
                        style={{ color: TONES.red.tx }}
                      />
                    )}
                    <WsIconBtn
                      icon={ArrowRight}
                      label="رجوع للقائمة"
                      onClick={() => setMobileShowMessages(false)}
                      className="md:hidden"
                    />
                  </>
                }
              >
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedMessages.map((msg, index) => {
                    // تحديد الاتجاه: هل المرسل هو "الطرف الأول" (ولي أمر أو admin في staff)
                    const isFirstParty = activeConversation.context_type === 'staff'
                      ? msg.sender_id === activeConversation.admin_user_id
                      : msg.sender_type === 'guardian'
                    const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

                    if (msg.type === 'system') {
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                          <ToneChip tone={TONES.gray}>{msg.body}</ToneChip>
                        </div>
                      )
                    }
                    if (msg.is_deleted) {
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', fontStyle: 'italic' }}>تم حذف هذه الرسالة</span>
                        </div>
                      )
                    }

                    /* ★ سجل الخدمة — فاصل الصمت بين طرفين مختلفين
                       يُحسب من created_at و sender_type: زمن الرد الفعلي لا زمن الفتح
                       (عدّاد unread يُصفَّر عند الفتح فيكذب: من يفتح ويصمت يختفي منه) */
                    const prev = sortedMessages[index - 1]
                    let silence: { text: string; who: string; tone: Tone } | null = null
                    if (prev && prev.type !== 'system' && !prev.is_deleted) {
                      const prevIsFirst = activeConversation.context_type === 'staff'
                        ? prev.sender_id === activeConversation.admin_user_id
                        : prev.sender_type === 'guardian'
                      if (prevIsFirst !== isFirstParty) {
                        const gap = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()
                        if (gap >= 3_600_000) {
                          const who = isFirstParty
                            ? (activeConversation.context_type === 'staff' ? 'ردّت الإدارة' : 'ردّ ولي الأمر')
                            : 'ردّت المدرسة'
                          const days = gap / 86_400_000
                          silence = {
                            text: `${who} بعد ${silenceLabel(gap)}`,
                            who,
                            tone: days >= 1 ? TONES.red : TONES.amber,
                          }
                        }
                      }
                    }

                    return (
                      <div key={msg.id}>
                        {silence && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                            <span style={{ flex: 1, height: 1, background: 'var(--ws-hairline)' }} />
                            <ToneChip tone={silence.tone}>
                              <Clock style={{ width: 10, height: 10 }} />
                              {silence.text}
                            </ToneChip>
                            <span style={{ flex: 1, height: 1, background: 'var(--ws-hairline)' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: isFirstParty ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              maxWidth: '75%',
                              borderRadius: isFirstParty ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                              padding: '7px 10px',
                              background: isFirstParty ? TONES.green.bg : TONES.sky.bg,
                              border: `1px solid ${isFirstParty ? TONES.green.bd : TONES.sky.bd}`,
                            }}
                          >
                            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>
                              {getMessageSenderName(msg, activeConversation)}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {msg.body}
                            </p>
                            <span style={{ display: 'block', fontSize: 9.5, color: 'var(--ws-text-2)', textAlign: 'left', marginTop: 2 }}>
                              {time}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              </WsBlock>

              {/* المُنشئ شقيق البلوك لا ابنه — داخل ws-block__scroll كان يتمرّر مع الرسائل */}
              {isOwnConversation && activeConversation.status === 'active' ? (
                <div style={{ borderTop: '1px solid var(--ws-hairline)', padding: 10, flexShrink: 0, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <WsTextarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالتك... (Enter للإرسال)"
                    rows={2}
                    style={{ flex: 1 }}
                  />
                  <WsBtn
                    variant="primary"
                    icon={Send}
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                  >
                    إرسال
                  </WsBtn>
                </div>
              ) : (
                <div style={{ borderTop: '1px solid var(--ws-hairline)', padding: 8, flexShrink: 0, textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                    {isOwnConversation ? 'المحادثة مغلقة' : 'وضع المراقبة — للقراءة فقط'}
                  </span>
                  {!isOwnConversation && activeConversation.status !== 'active' && (
                    <WsBtn
                      size="sm"
                      icon={RotateCcw}
                      onClick={() => reopenMutation.mutate(activeConversation.id)}
                      style={{ marginInlineStart: 8 }}
                    >
                      إعادة فتح
                    </WsBtn>
                  )}
                </div>
              )}
            </>
          )}
        </WsMain>

        {/* سياق المحادثة */}
        {activeConversation && (
          <WsSideCol
            side="end"
            title="سياق المحادثة"
            icon={UserRound}
            storageKey="ws:admin-chat:ctx"
            width={300}
            defaultCollapsed
          >
            <WsBlock fill scroll padded>
              <WsFactsList>
                <WsFactRow label="النوع">
                  <ToneChip tone={TONES.gray}>
                    {(CONTEXT_META[activeConversation.context_type] ?? CONTEXT_META.admin).label}
                  </ToneChip>
                </WsFactRow>
                <WsFactRow label="الحالة">
                  <ToneChip tone={(STATUS_META[activeConversation.status] ?? STATUS_META.active).tone}>
                    {(STATUS_META[activeConversation.status] ?? STATUS_META.active).label}
                  </ToneChip>
                </WsFactRow>
                {activeConversation.guardian?.parent_name && (
                  <WsFactRow label="ولي الأمر">{activeConversation.guardian.parent_name}</WsFactRow>
                )}
                {activeConversation.guardian?.parent_phone && (
                  <WsFactRow label="الجوال">
                    <span dir="ltr">{activeConversation.guardian.parent_phone}</span>
                  </WsFactRow>
                )}
                {activeConversation.student?.name && (
                  <WsFactRow label="الطالب">{activeConversation.student.name}</WsFactRow>
                )}
                {activeConversation.participant?.name && (
                  <WsFactRow label="الطرف المدرسي">{activeConversation.participant.name}</WsFactRow>
                )}
                {activeConversation.last_message_at && (
                  <WsFactRow label="آخر رسالة">
                    {new Date(activeConversation.last_message_at).toLocaleString('ar-SA')}
                  </WsFactRow>
                )}
                <WsFactRow label="عدد الرسائل">{sortedMessages.length}</WsFactRow>
              </WsFactsList>

              {!isOwnConversation && (
                <div style={{ marginTop: 10 }}>
                  <WsAlert tone="info" boxed>
                    أنت تقرأ محادثة بين طرفين آخرين — الكتابة متاحة لأصحابها فقط.
                  </WsAlert>
                </div>
              )}
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>

      {/* ═══ محادثة جديدة ═══ */}
      {showNewChat && (
        <div className="ws-modal" onClick={() => setShowNewChat(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <h3 className="ws-modal__title">محادثة جديدة</h3>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => setShowNewChat(false)} />
              </div>
              <div className="ws-seg" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={`ws-seg__btn ${newChatTab === 'guardians' ? 'is-active' : ''}`}
                  onClick={() => setNewChatTab('guardians')}
                >
                  أولياء الأمور
                </button>
                <button
                  type="button"
                  className={`ws-seg__btn ${newChatTab === 'staff' ? 'is-active' : ''}`}
                  onClick={() => setNewChatTab('staff')}
                >
                  المعلمين والموجهين
                </button>
              </div>
            </header>

            <div className="ws-modal__body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ position: 'relative' }}>
                <WsInput
                  type="search"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder={newChatTab === 'guardians' ? 'ابحث باسم الطالب أو ولي الأمر...' : 'ابحث باسم المعلم أو الموجه...'}
                  style={{ width: '100%', paddingInlineStart: 26 }}
                />
                <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
              </div>

              {contactsQuery.isLoading ? (
                <WsEmpty loading>جارٍ التحميل...</WsEmpty>
              ) : newChatTab === 'guardians' ? (
                filteredGuardians.length === 0 ? (
                  <WsEmpty icon={User}>لا توجد نتائج</WsEmpty>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {filteredGuardians.map((g) => (
                      <button
                        key={g.parent_phone}
                        type="button"
                        disabled={startConversationMutation.isPending}
                        onClick={() => {
                          startConversationMutation.mutate(g.first_student_id, {
                            onSuccess: (data) => { setActiveConversation(data.conversation); setShowNewChat(false); setContactSearch(''); setMobileShowMessages(true) },
                          })
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          textAlign: 'right',
                          border: '1px solid var(--ws-border)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          background: 'transparent',
                          color: 'var(--ws-text)',
                        }}
                      >
                        <InitialAvatar name={g.parent_name ?? g.parent_phone ?? '؟'} tone={TONES.green} size={28} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{g.parent_name ?? g.parent_phone}</span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            أبناؤه: {g.student_names}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : staffContacts.length === 0 ? (
                <WsEmpty icon={User}>لا يوجد معلمين أو موجهين</WsEmpty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {staffContacts.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={startStaffConversationMutation.isPending}
                      onClick={() => {
                        startStaffConversationMutation.mutate(t.id, {
                          onSuccess: (data) => { setActiveConversation(data.conversation); setShowNewChat(false); setContactSearch(''); setMobileShowMessages(true) },
                        })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        textAlign: 'right',
                        border: '1px solid var(--ws-border)',
                        borderRadius: 8,
                        padding: '6px 8px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        background: 'transparent',
                        color: 'var(--ws-text)',
                      }}
                    >
                      <InitialAvatar name={t.name} tone={TONES.sky} size={28} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{t.name}</span>
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>
                          {t.type === 'teacher' ? 'معلم' : 'موجه طلابي'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ الحوكمة ═══ */}
      {showSettings && (
        <div className="ws-modal" onClick={() => setShowSettings(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <h3 className="ws-modal__title">حوكمة المحادثات</h3>
                  <p className="ws-modal__sub">من يستطيع التحدث مع من، ومن مُنع</p>
                </div>
                <WsIconBtn icon={X} label="إغلاق" onClick={() => setShowSettings(false)} />
              </div>
              <div className="ws-seg" style={{ marginTop: 8 }}>
                {([
                  ['general', 'عام'],
                  ['counselors', 'الموجهين'],
                  ['blocked', 'المحظورين'],
                ] as Array<['general' | 'counselors' | 'blocked', string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`ws-seg__btn ${settingsTab === key ? 'is-active' : ''}`}
                    onClick={() => setSettingsTab(key)}
                  >
                    {label}
                    {key === 'blocked' && (blockedQuery.data?.data?.length ?? 0) > 0 && (
                      <span className="ws-count">{blockedQuery.data?.data?.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </header>

            <div className="ws-modal__body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {settingsTab === 'general' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>تفعيل الدردشة</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        عند الإيقاف لا يستطيع أحد إرسال رسائل جديدة
                      </p>
                    </div>
                    <WsSwitch
                      checked={settings?.chat_enabled ?? false}
                      onChange={(v) => updateSettingsMutation.mutate({ chat_enabled: v }, { onSuccess: () => toast({ title: 'تم التحديث' }) })}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 10, padding: 10 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>السماح لأولياء الأمور ببدء محادثات</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        عند الإيقاف: المدرسة وحدها تبدأ
                      </p>
                    </div>
                    <WsSwitch
                      checked={settings?.parent_can_initiate ?? true}
                      onChange={(v) => updateSettingsMutation.mutate({ parent_can_initiate: v })}
                    />
                  </div>
                </>
              )}

              {settingsTab === 'counselors' && (
                <>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <WsField label="الموجه" grow>
                      <WsSelect value={newCounselorId} onChange={(e) => setNewCounselorId(e.target.value)}>
                        <option value="">اختر</option>
                        {counselorsQuery.data?.counselors?.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                      </WsSelect>
                    </WsField>
                    <WsField label="الصف">
                      <WsInput value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="الصف" style={{ width: 90 }} />
                    </WsField>
                    <WsField label="الفصل">
                      <WsInput value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="الفصل" style={{ width: 70 }} />
                    </WsField>
                    <WsBtn
                      icon={UserPlus}
                      disabled={!newCounselorId}
                      onClick={() => {
                        createAssignmentMutation.mutate(
                          { user_id: Number(newCounselorId), grade: newGrade || null, class_name: newClassName || null },
                          { onSuccess: () => { setNewCounselorId(''); setNewGrade(''); setNewClassName('') } },
                        )
                      }}
                    >
                      تعيين
                    </WsBtn>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {assignmentsQuery.data?.assignments?.map((a) => (
                      <div
                        key={a.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid var(--ws-border)', borderRadius: 8, padding: '6px 8px' }}
                      >
                        <span style={{ fontSize: 12 }}>
                          <b>{a.user?.name}</b>
                          <span style={{ color: 'var(--ws-text-2)', margin: '0 5px' }}>←</span>
                          <span style={{ color: 'var(--ws-text-2)', fontSize: 10.5 }}>
                            {a.grade ?? 'الكل'}{a.class_name && ` / ${a.class_name}`}
                          </span>
                        </span>
                        <WsIconBtn
                          icon={Trash2}
                          label="حذف التعيين"
                          onClick={() => deleteAssignmentMutation.mutate(a.id)}
                          style={{ color: TONES.red.tx }}
                        />
                      </div>
                    ))}
                    {!assignmentsQuery.data?.assignments?.length && (
                      <WsEmpty icon={UserPlus}>لا يوجد تعيينات</WsEmpty>
                    )}
                  </div>
                </>
              )}

              {settingsTab === 'blocked' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {blockedQuery.data?.data?.map((g) => (
                    <div
                      key={g.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: `1px solid ${TONES.red.bd}`, background: TONES.red.bg, borderRadius: 8, padding: '6px 8px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Lock style={{ width: 11, height: 11, color: TONES.red.tx }} />
                        {g.parent_name ?? g.parent_phone}
                      </span>
                      <WsBtn size="sm" icon={RotateCcw} onClick={() => unblockMutation.mutate(g.id)}>إلغاء الحظر</WsBtn>
                    </div>
                  ))}
                  {!blockedQuery.data?.data?.length && <WsEmpty icon={Lock}>لا يوجد محظورين</WsEmpty>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WsPage>
  )
}

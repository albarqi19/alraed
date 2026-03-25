import { useState, useRef, useEffect } from 'react'
import {
  ArrowRight, Settings, MessageCircle, User, Search, X, Plus,
  Archive, Lock, RotateCcw, Trash2, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function AdminChatPage() {
  const toast = useToast()
  const adminUser = useAuthStore((s) => s.user)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileShowMessages, setMobileShowMessages] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [messageText, setMessageText] = useState('')
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" dir="rtl">
      {/* إحصائيات + إعدادات */}
      {stats && (
        <div className="flex gap-2 flex-wrap mb-3 items-center">
          <Badge variant="outline" className="px-2.5 py-1 text-xs">نشطة: {stats.active_conversations}</Badge>
          <Badge variant="outline" className="px-2.5 py-1 text-xs">رسائل اليوم: {stats.messages_today}</Badge>
          <Badge variant="outline" className="px-2.5 py-1 text-xs">محظورون: {stats.blocked_guardians}</Badge>
          <div className="flex gap-2 mr-auto">
            <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewChat(true)}>
              <Plus className="h-3.5 w-3.5" /> محادثة جديدة
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowSettings(true)}>
              <Settings className="h-3.5 w-3.5" /> الإعدادات
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1 bg-background rounded-lg border overflow-hidden">
        {/* القائمة */}
        <div className={`w-full md:w-80 md:border-l flex flex-col ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..." className="pr-8 h-8 text-xs" />
            </div>
            <div className="flex gap-1.5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                  <SelectItem value="archived">مؤرشفة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-7 text-[11px] flex-1"><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="counselor">موجه</SelectItem>
                  <SelectItem value="admin">إدارة</SelectItem>
                  <SelectItem value="staff">موظفين</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8" /><p className="text-sm">لا توجد محادثات</p>
              </div>
            ) : conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full flex items-start gap-3 p-3 border-b text-right hover:bg-accent/50 transition-colors ${activeConversation?.id === conv.id ? 'bg-accent' : ''} ${conv.status !== 'active' ? 'opacity-50' : ''}`}
              >
                <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs truncate">{getConversationTitle(conv)}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{getTimeLabel(conv.last_message_at)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{conv.last_message_preview ?? conv.student?.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                      {conv.context_type === 'teacher' ? 'معلم' : conv.context_type === 'counselor' ? 'موجه' : conv.context_type === 'staff' ? 'موظفين' : 'إدارة'}
                    </Badge>
                    {conv.status !== 'active' && <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{conv.status === 'closed' ? 'مغلقة' : 'مؤرشفة'}</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* الرسائل */}
        <div className={`flex-1 flex flex-col ${!mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileShowMessages(false)}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="font-medium text-sm">{activeConversation.guardian?.parent_name ?? 'ولي أمر'} ↔ {activeConversation.participant?.name}</p>
                    <p className="text-xs text-muted-foreground">{activeConversation.student?.name}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs">إجراءات</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {activeConversation.status === 'active' && (
                      <>
                        <DropdownMenuItem onClick={() => { closeMutation.mutate(activeConversation.id); setActiveConversation(null) }}><X className="h-4 w-4 ml-2" /> إغلاق</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { archiveMutation.mutate(activeConversation.id); setActiveConversation(null) }}><Archive className="h-4 w-4 ml-2" /> أرشفة</DropdownMenuItem>
                      </>
                    )}
                    {activeConversation.status !== 'active' && (
                      <DropdownMenuItem onClick={() => reopenMutation.mutate(activeConversation.id)}><RotateCcw className="h-4 w-4 ml-2" /> إعادة فتح</DropdownMenuItem>
                    )}
                    {activeConversation.guardian_id && (
                    <DropdownMenuItem onClick={() => blockMutation.mutate({ guardianId: activeConversation.guardian_id! })} className="text-destructive">
                      <Lock className="h-4 w-4 ml-2" /> حظر ولي الأمر
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sortedMessages.map((msg) => {
                  // تحديد الاتجاه: هل المرسل هو "الطرف الأول" (ولي أمر أو admin في staff)
                  const isFirstParty = activeConversation.context_type === 'staff'
                    ? msg.sender_id === activeConversation.admin_user_id
                    : msg.sender_type === 'guardian'
                  const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                  if (msg.type === 'system') return <div key={msg.id} className="flex justify-center my-3"><div className="bg-muted/70 text-muted-foreground text-xs px-4 py-2 rounded-full text-center">{msg.body}</div></div>
                  if (msg.is_deleted) return <div key={msg.id} className="flex justify-center my-1"><span className="text-xs text-muted-foreground italic">تم حذف هذه الرسالة</span></div>
                  return (
                    <div key={msg.id} className={`flex ${isFirstParty ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isFirstParty ? 'bg-green-100 dark:bg-green-900/30 rounded-tl-sm' : 'bg-blue-100 dark:bg-blue-900/30 rounded-tr-sm'}`}>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">
                          {getMessageSenderName(msg, activeConversation)}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                        <span className="text-[10px] text-muted-foreground block text-left mt-1">{time}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* الإدارة تكتب فقط في محادثاتها */}
              {isOwnConversation && activeConversation.status === 'active' ? (
                <div className="p-3 border-t bg-background">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="اكتب رسالتك..."
                      rows={1}
                      className="flex-1 min-h-[40px] max-h-[100px] resize-none rounded-xl bg-muted text-sm px-4 py-2.5 border-0 focus:ring-2 focus:ring-primary outline-none"
                    />
                    <Button onClick={handleSend} disabled={!messageText.trim() || sendMessageMutation.isPending} size="icon" className="shrink-0 h-10 w-10 rounded-full">
                      <svg className="h-4 w-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-t text-center text-xs text-muted-foreground bg-muted/30">
                  {isOwnConversation ? 'المحادثة مغلقة' : 'وضع المراقبة - للقراءة فقط'}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <MessageCircle className="h-12 w-12" />
              <h3 className="text-lg font-medium">المحادثات</h3>
              <p className="text-sm text-center max-w-xs">اختر محادثة أو ابدأ محادثة جديدة</p>
            </div>
          )}
        </div>
      </div>

      {/* نافذة بدء محادثة جديدة */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>محادثة جديدة</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="guardians" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guardians" className="text-xs">أولياء الأمور</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs">المعلمين والموجهين</TabsTrigger>
            </TabsList>

            {/* أولياء الأمور */}
            <TabsContent value="guardians" className="mt-3">
              <div className="relative mb-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="ابحث باسم الطالب أو ولي الأمر..." className="pr-9" />
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {contactsQuery.isLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : filteredGuardians.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد نتائج</p>
                ) : filteredGuardians.map((g) => (
                  <button
                    key={g.parent_phone}
                    onClick={() => {
                      startConversationMutation.mutate(g.first_student_id, {
                        onSuccess: (data) => { setActiveConversation(data.conversation); setShowNewChat(false); setContactSearch(''); setMobileShowMessages(true) },
                      })
                    }}
                    disabled={startConversationMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 text-right transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{g.parent_name ?? g.parent_phone}</p>
                      <p className="text-xs text-muted-foreground truncate">أبناؤه: {g.student_names}</p>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* المعلمين والموجهين */}
            <TabsContent value="staff" className="mt-3">
              <div className="relative mb-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="ابحث باسم المعلم أو الموجه..." className="pr-9" />
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {contactsQuery.isLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : (
                  <>
                    {[...(contactsQuery.data?.teachers ?? []), ...(contactsQuery.data?.counselors ?? [])]
                      .filter((t) => !contactSearch || t.name.toLowerCase().includes(contactSearch.toLowerCase()))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            startStaffConversationMutation.mutate(t.id, {
                              onSuccess: (data) => { setActiveConversation(data.conversation); setShowNewChat(false); setContactSearch(''); setMobileShowMessages(true) },
                            })
                          }}
                          disabled={startStaffConversationMutation.isPending}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 text-right transition-colors"
                        >
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.type === 'teacher' ? 'معلم' : 'موجه طلابي'}</p>
                          </div>
                        </button>
                      ))}
                    {[...(contactsQuery.data?.teachers ?? []), ...(contactsQuery.data?.counselors ?? [])].length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">لا يوجد معلمين أو موجهين</p>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* نافذة الإعدادات */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> إعدادات المحادثات</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" className="text-xs">عام</TabsTrigger>
              <TabsTrigger value="counselors" className="text-xs">الموجهين</TabsTrigger>
              <TabsTrigger value="blocked" className="text-xs">المحظورين</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">تفعيل الدردشة</Label>
                <Switch checked={settings?.chat_enabled ?? false} onCheckedChange={(v) => updateSettingsMutation.mutate({ chat_enabled: v }, { onSuccess: () => toast({ title: 'تم التحديث' }) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">السماح لأولياء الأمور ببدء محادثات</Label>
                <Switch checked={settings?.parent_can_initiate ?? true} onCheckedChange={(v) => updateSettingsMutation.mutate({ parent_can_initiate: v })} />
              </div>
            </TabsContent>
            <TabsContent value="counselors" className="space-y-4 mt-4">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs mb-1 block">الموجه</Label>
                  <Select value={newCounselorId} onValueChange={setNewCounselorId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{counselorsQuery.data?.counselors?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="الصف" className="h-9 w-24 text-xs" />
                <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="الفصل" className="h-9 w-16 text-xs" />
                <Button size="sm" className="h-9" disabled={!newCounselorId} onClick={() => {
                  createAssignmentMutation.mutate({ user_id: Number(newCounselorId), grade: newGrade || null, class_name: newClassName || null }, {
                    onSuccess: () => { setNewCounselorId(''); setNewGrade(''); setNewClassName('') },
                  })
                }}><UserPlus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1.5">
                {assignmentsQuery.data?.assignments?.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <span className="text-sm"><span className="font-medium">{a.user?.name}</span><span className="text-muted-foreground mx-1">←</span><span className="text-muted-foreground text-xs">{a.grade ?? 'الكل'}{a.class_name && ` / ${a.class_name}`}</span></span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAssignmentMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                {!assignmentsQuery.data?.assignments?.length && <p className="text-xs text-muted-foreground text-center py-4">لا يوجد تعيينات</p>}
              </div>
            </TabsContent>
            <TabsContent value="blocked" className="space-y-2 mt-4">
              {blockedQuery.data?.data?.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-sm">{g.parent_name ?? g.parent_phone}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => unblockMutation.mutate(g.id)}>إلغاء الحظر</Button>
                </div>
              ))}
              {!blockedQuery.data?.data?.length && <p className="text-xs text-muted-foreground text-center py-4">لا يوجد محظورين</p>}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

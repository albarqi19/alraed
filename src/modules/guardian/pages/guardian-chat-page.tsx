import { useState, useCallback } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ConversationList } from '@/modules/chat/components/conversation-list'
import { MessageThread } from '@/modules/chat/components/message-thread'
import { MessageInput } from '@/modules/chat/components/message-input'
import { ContactPicker } from '@/modules/chat/components/contact-picker'
import { ChatEmptyState } from '@/modules/chat/components/chat-empty-state'
import {
  useGuardianConversationsQuery,
  useGuardianMessagesQuery,
  useSendGuardianMessageMutation,
  useMarkGuardianReadMutation,
  useGuardianContactsQuery,
  useStartGuardianConversationMutation,
} from '@/modules/chat/hooks'
import type { Conversation, ChatContact } from '@/modules/chat/types'
import { isGuardianAuthenticated } from '@/services/api/guardian-client'

export default function GuardianChatPage() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [mobileShowMessages, setMobileShowMessages] = useState(false)

  // Queries
  const conversationsQuery = useGuardianConversationsQuery()
  const messagesQuery = useGuardianMessagesQuery(activeConversation?.id ?? null)
  const contactsQuery = useGuardianContactsQuery()

  // Mutations
  const sendMessageMutation = useSendGuardianMessageMutation(activeConversation?.id ?? 0)
  const markReadMutation = useMarkGuardianReadMutation(activeConversation?.id ?? 0)
  const startConversationMutation = useStartGuardianConversationMutation()

  const conversations = conversationsQuery.data?.data ?? []
  const messages = messagesQuery.data?.pages?.flatMap((p) => p.data) ?? []

  // Guardian ID from first conversation or localStorage
  const guardianId = conversations[0]?.guardian_id ?? 0

  function handleSelectConversation(conv: Conversation) {
    setActiveConversation(conv)
    setMobileShowMessages(true)
    if (conv.guardian_unread_count > 0) {
      markReadMutation.mutate()
    }
  }

  function handleSend(body: string) {
    if (!activeConversation) return
    sendMessageMutation.mutate(body)
  }

  const handleSelectContact = useCallback(
    (contact: ChatContact) => {
      startConversationMutation.mutate(
        {
          participant_id: contact.user_id,
          student_id: contact.student?.id ?? undefined,
        },
        {
          onSuccess: (data) => {
            setActiveConversation(data.conversation)
            setShowContactPicker(false)
            setMobileShowMessages(true)
          },
        },
      )
    },
    [startConversationMutation],
  )

  if (!isGuardianAuthenticated()) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">يرجى تسجيل الدخول أولاً</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background rounded-lg border overflow-hidden" dir="rtl">
      {/* قائمة المحادثات */}
      <div className={`w-full md:w-80 md:border-l flex flex-col ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold text-sm">المحادثات</h2>
          <Sheet open={showContactPicker} onOpenChange={setShowContactPicker}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-96">
              <SheetHeader>
                <SheetTitle>محادثة جديدة</SheetTitle>
              </SheetHeader>
              <ContactPicker
                contacts={contactsQuery.data?.contacts ?? []}
                onSelect={handleSelectContact}
                isLoading={contactsQuery.isLoading}
              />
            </SheetContent>
          </Sheet>
        </div>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.id ?? null}
          onSelect={handleSelectConversation}
          side="guardian"
          isLoading={conversationsQuery.isLoading}
        />
      </div>

      {/* منطقة الرسائل */}
      <div className={`flex-1 flex flex-col ${!mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setMobileShowMessages(false)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div>
                <p className="font-medium text-sm">{activeConversation.participant?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeConversation.student?.name && `${activeConversation.student.name} - `}
                  {activeConversation.status === 'closed' ? 'مغلقة' : activeConversation.status === 'archived' ? 'مؤرشفة' : ''}
                </p>
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              messages={messages}
              currentSenderType="guardian"
              currentSenderId={guardianId}
              hasMore={messagesQuery.hasNextPage}
              onLoadMore={() => messagesQuery.fetchNextPage()}
              isLoadingMore={messagesQuery.isFetchingNextPage}
            />

            {/* Input */}
            {activeConversation.status === 'active' ? (
              <MessageInput
                onSend={handleSend}
                disabled={sendMessageMutation.isPending}
              />
            ) : (
              <div className="p-3 border-t text-center text-sm text-muted-foreground bg-muted/30">
                هذه المحادثة {activeConversation.status === 'closed' ? 'مغلقة' : 'مؤرشفة'}
              </div>
            )}
          </>
        ) : (
          <ChatEmptyState />
        )}
      </div>
    </div>
  )
}

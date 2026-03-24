import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'
import { MessageBubble } from './message-bubble'
import { TypingIndicator } from './typing-indicator'

interface MessageThreadProps {
  messages: ChatMessage[]
  currentSenderType: 'guardian' | 'user'
  currentSenderId: number
  isTyping?: boolean
  typingName?: string
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

export function MessageThread({
  messages,
  currentSenderType,
  currentSenderId,
  isTyping,
  typingName,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // Infinite scroll up for older messages
  function handleScroll() {
    const container = containerRef.current
    if (!container || !hasMore || isLoadingMore) return

    if (container.scrollTop < 100) {
      onLoadMore?.()
    }
  }

  // الرسائل مرتبة من الأقدم للأحدث للعرض
  const sortedMessages = [...messages].reverse()

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-2"
      dir="rtl"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
        </div>
      )}

      {sortedMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_type === currentSenderType && msg.sender_id === currentSenderId}
        />
      ))}

      {isTyping && <TypingIndicator name={typingName} />}

      <div ref={bottomRef} />
    </div>
  )
}

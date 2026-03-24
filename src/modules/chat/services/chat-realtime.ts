import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { chatQueryKeys } from '../query-keys'
import { getEchoInstance } from './echo-client'

/**
 * الاشتراك في قناة محادثة للحصول على الرسائل الفورية
 */
export function useChatRealtime(conversationId: number | null) {
  const queryClient = useQueryClient()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const echo = getEchoInstance()
    if (!echo || !conversationId) return

    const channel = echo.private(`conversation.${conversationId}`)
    channelRef.current = channel

    // رسالة جديدة
    channel.listen('.message.new', () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
    })

    // رسالة وصلت
    channel.listen('.message.delivered', () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffMessages(conversationId) })
    })

    // رسائل قُرئت
    channel.listen('.messages.read', () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianMessages(conversationId) })
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffMessages(conversationId) })
    })

    return () => {
      echo.leave(`conversation.${conversationId}`)
      channelRef.current = null
    }
  }, [conversationId, queryClient])

  return channelRef
}

/**
 * الاشتراك في قناة قائمة المحادثات
 */
export function useChatListRealtime(type: 'user' | 'guardian', id: number | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const echo = getEchoInstance()
    if (!echo || !id) return

    const channelName = type === 'guardian' ? `guardian-chat.${id}` : `user-chat.${id}`
    const channel = echo.private(channelName)

    channel.listen('.conversation.updated', () => {
      if (type === 'guardian') {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianUnreadTotal })
      } else {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffUnreadTotal })
      }
    })

    return () => {
      echo.leave(channelName)
    }
  }, [type, id, queryClient])
}

/**
 * Typing Indicator عبر Whisper
 */
export function useTypingIndicator(conversationId: number | null) {
  const channelRef = useRef<any>(null)
  const lastSentRef = useRef<number>(0)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOtherTypingRef = useRef(false)

  // Throttle: مرة كل 2 ثانية
  const sendTyping = useCallback(
    (userName: string) => {
      const echo = getEchoInstance()
      if (!echo || !conversationId) return

      const now = Date.now()
      if (now - lastSentRef.current < 2000) return
      lastSentRef.current = now

      const channel = echo.private(`conversation.${conversationId}`)
      channel.whisper('typing', { user_name: userName, is_typing: true })
    },
    [conversationId],
  )

  // الاستماع لإشارات الكتابة من الطرف الآخر
  useEffect(() => {
    const echo = getEchoInstance()
    if (!echo || !conversationId) return

    const channel = echo.private(`conversation.${conversationId}`)
    channelRef.current = channel

    channel.listenForWhisper('typing', (data: { user_name: string; is_typing: boolean }) => {
      isOtherTypingRef.current = data.is_typing

      // Debounce: إيقاف بعد 3 ثوان
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        isOtherTypingRef.current = false
      }, 3000)
    })

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId])

  return { sendTyping, isOtherTyping: isOtherTypingRef }
}

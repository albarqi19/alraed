import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { chatQueryKeys } from '../query-keys'
import { createEchoInstance, getEchoInstance } from './echo-client'

/**
 * تهيئة Echo عند دخول صفحة الدردشة
 * يجب استدعاؤه مرة واحدة في كل صفحة دردشة
 */
export function useInitEcho(token: string | null) {
  useEffect(() => {
    if (!token) return
    createEchoInstance(token)
    return () => {
      // لا نقطع الاتصال عند unmount لأن المستخدم قد يتنقل بين الصفحات
      // destroyEchoInstance() يُستدعى عند logout فقط
    }
  }, [token])
}

/**
 * الاشتراك في قناة محادثة للحصول على الرسائل الفورية
 */
export function useChatRealtime(conversationId: number | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const echo = getEchoInstance()
    if (!echo || !conversationId) return

    const channelName = `conversation.${conversationId}`

    try {
      const channel = echo.private(channelName)

      // رسالة جديدة
      channel.listen('.message.new', () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianMessages(conversationId) })
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffMessages(conversationId) })
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminMessages(conversationId) })
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
        try { echo.leave(channelName) } catch {}
      }
    } catch {
      // Echo غير متصل - نتجاهل
    }
  }, [conversationId, queryClient])
}

/**
 * الاشتراك في قناة قائمة المحادثات - تحديث القائمة وعداد الغير مقروء
 */
export function useChatListRealtime(type: 'user' | 'guardian', id: number | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const echo = getEchoInstance()
    if (!echo || !id) return

    const channelName = type === 'guardian' ? `guardian-chat.${id}` : `user-chat.${id}`

    try {
      const channel = echo.private(channelName)

      channel.listen('.conversation.updated', () => {
        if (type === 'guardian') {
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianConversations })
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.guardianUnreadTotal })
        } else {
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffConversations })
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.staffUnreadTotal })
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.adminConversations })
        }
      })

      return () => {
        try { echo.leave(channelName) } catch {}
      }
    } catch {
      // Echo غير متصل
    }
  }, [type, id, queryClient])
}

/**
 * Typing Indicator عبر Whisper
 */
export function useTypingIndicator(conversationId: number | null) {
  const lastSentRef = useRef<number>(0)

  const sendTyping = useCallback(
    (userName: string) => {
      const echo = getEchoInstance()
      if (!echo || !conversationId) return

      const now = Date.now()
      if (now - lastSentRef.current < 2000) return // Throttle: مرة كل 2 ثانية
      lastSentRef.current = now

      try {
        const channel = echo.private(`conversation.${conversationId}`)
        channel.whisper('typing', { user_name: userName, is_typing: true })
      } catch {}
    },
    [conversationId],
  )

  return { sendTyping }
}

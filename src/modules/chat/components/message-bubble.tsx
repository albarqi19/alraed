import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'
import { MessageStatusIcon } from './message-status-icon'
import { SystemMessage } from './system-message'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  showStatus?: boolean
}

export function MessageBubble({ message, isOwn, showStatus = true }: MessageBubbleProps) {
  if (message.type === 'system') {
    return <SystemMessage text={message.body ?? ''} />
  }

  if (message.is_deleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="rounded-lg px-3 py-2 text-xs text-muted-foreground italic bg-muted/50">
          تم حذف هذه الرسالة
        </div>
      </div>
    )
  }

  const time = new Date(message.created_at).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-tl-sm'
            : 'bg-muted rounded-tr-sm',
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
        <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-[10px]', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {time}
          </span>
          {isOwn && showStatus && <MessageStatusIcon message={message} />}
        </div>
      </div>
    </div>
  )
}

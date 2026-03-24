import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'

interface MessageStatusIconProps {
  message: ChatMessage
  className?: string
}

/**
 * أيقونات حالة الرسالة (WhatsApp style)
 * ✓ رمادي: أُرسلت
 * ✓✓ رمادي: وصلت (delivered)
 * ✓✓ أزرق: قُرئت (read)
 */
export function MessageStatusIcon({ message, className }: MessageStatusIconProps) {
  if (message.read_at) {
    // ✓✓ أزرق
    return <CheckCheck className={cn('h-3.5 w-3.5 text-blue-400', className)} />
  }

  if (message.delivered_at) {
    // ✓✓ رمادي
    return <CheckCheck className={cn('h-3.5 w-3.5 text-primary-foreground/50', className)} />
  }

  // ✓ رمادي
  return <Check className={cn('h-3.5 w-3.5 text-primary-foreground/50', className)} />
}

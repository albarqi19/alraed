import { useState, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  onSend: (body: string) => void
  onTyping?: () => void
  disabled?: boolean
  maxLength?: number
  placeholder?: string
}

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  maxLength = 1000,
  placeholder = 'اكتب رسالتك...',
}: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(value: string) {
    if (value.length <= maxLength) {
      setText(value)
      onTyping?.()
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[40px] max-h-[120px] resize-none text-sm"
        dir="rtl"
      />
      <Button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        size="icon"
        className="shrink-0 h-10 w-10 rounded-full"
      >
        <Send className="h-4 w-4 rotate-180" />
      </Button>
    </div>
  )
}

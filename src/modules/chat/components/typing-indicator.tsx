interface TypingIndicatorProps {
  name?: string
}

/**
 * "فلان يكتب الآن..." - مؤشر الكتابة
 */
export function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground">
        {name ? `${name} يكتب الآن...` : 'يكتب الآن...'}
      </span>
    </div>
  )
}

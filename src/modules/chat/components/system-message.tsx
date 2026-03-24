interface SystemMessageProps {
  text: string
}

/**
 * رسائل النظام - خلفية رمادية فاتحة في وسط المحادثة
 */
export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-muted/70 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[85%] text-center leading-relaxed">
        {text}
      </div>
    </div>
  )
}

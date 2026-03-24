import { MessageCircle } from 'lucide-react'

interface ChatEmptyStateProps {
  title?: string
  description?: string
}

export function ChatEmptyState({
  title = 'اختر محادثة',
  description = 'اختر محادثة من القائمة أو ابدأ محادثة جديدة',
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <MessageCircle className="h-12 w-12" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-center max-w-xs">{description}</p>
    </div>
  )
}

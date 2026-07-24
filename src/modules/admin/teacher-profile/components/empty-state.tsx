import type { LucideIcon } from 'lucide-react'
import { WsEmpty } from '@/shared/workspace'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

/** حالة فارغة داخل تفاصيل الملف — مسطحة بنَفَس ws (لا صناديق بظلال) */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <WsEmpty
      icon={icon}
      style={{
        flex: 'none',
        border: '1px dashed var(--ws-border)',
        borderRadius: 10,
        padding: '36px 16px',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <b style={{ fontSize: 13, color: 'var(--ws-text)' }}>{title}</b>
        {description && <span style={{ fontSize: 12 }}>{description}</span>}
      </span>
    </WsEmpty>
  )
}

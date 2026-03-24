import { useState } from 'react'
import { MessageCircle, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Conversation } from '../types'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: number | null
  onSelect: (conversation: Conversation) => void
  side: 'guardian' | 'staff' | 'admin'
  isLoading?: boolean
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  side,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    const name = side === 'guardian'
      ? c.participant?.name
      : c.guardian?.parent_name ?? c.guardian?.parent_phone
    return (
      name?.toLowerCase().includes(s) ||
      c.student?.name?.toLowerCase().includes(s) ||
      c.last_message_preview?.toLowerCase().includes(s)
    )
  })

  function getDisplayName(c: Conversation) {
    if (side === 'guardian') {
      return c.participant?.name ?? 'غير معروف'
    }
    return c.guardian?.parent_name ?? c.guardian?.parent_phone ?? 'ولي أمر'
  }

  function getRoleLabel(c: Conversation) {
    if (side !== 'guardian') return c.student?.name ?? ''
    const labels: Record<string, string> = {
      teacher: 'معلم',
      student_counselor: 'موجه طلابي',
      school_principal: 'مدير المدرسة',
      deputy_teachers: 'وكيل المعلمين',
      deputy_students: 'وكيل الطلاب',
    }
    return labels[c.participant_role] ?? 'إدارة'
  }

  function getUnread(c: Conversation) {
    if (side === 'guardian') return c.guardian_unread_count
    return c.participant_unread_count
  }

  function getTimeLabel(dateStr: string | null) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  }

  const statusColors: Record<string, string> = {
    active: '',
    archived: 'opacity-60',
    closed: 'opacity-40',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="pr-9 text-sm"
            dir="rtl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">لا توجد محادثات</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const unread = getUnread(conv)
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 border-b text-right hover:bg-accent/50 transition-colors',
                  activeConversationId === conv.id && 'bg-accent',
                  statusColors[conv.status],
                )}
              >
                <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{getDisplayName(conv)}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {getTimeLabel(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview ?? getRoleLabel(conv)}
                    </span>
                    {unread > 0 && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {unread}
                      </span>
                    )}
                  </div>
                  {conv.student && side !== 'admin' && (
                    <span className="text-[10px] text-muted-foreground">
                      {conv.student.name} - {conv.student.grade}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Search, User, BookOpen, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ChatContact } from '../types'

interface ContactPickerProps {
  contacts: ChatContact[]
  onSelect: (contact: ChatContact) => void
  isLoading?: boolean
}

const roleIcons: Record<string, typeof User> = {
  teacher: BookOpen,
  student_counselor: Shield,
}

export function ContactPicker({ contacts, onSelect, isLoading }: ContactPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(s) ||
      c.role_label.toLowerCase().includes(s) ||
      c.student?.name?.toLowerCase().includes(s)
    )
  })

  // تجميع حسب النوع
  const grouped = {
    teacher: filtered.filter((c) => c.role === 'teacher'),
    counselor: filtered.filter((c) => c.role === 'student_counselor'),
    admin: filtered.filter((c) => !['teacher', 'student_counselor'].includes(c.role)),
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4" dir="rtl">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن معلم أو موجه..."
          className="pr-9 text-sm"
        />
      </div>

      {contacts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          لا توجد جهات اتصال متاحة حالياً
        </p>
      ) : (
        <>
          {grouped.teacher.length > 0 && (
            <ContactGroup title="المعلمون" contacts={grouped.teacher} onSelect={onSelect} />
          )}
          {grouped.counselor.length > 0 && (
            <ContactGroup title="الموجهون" contacts={grouped.counselor} onSelect={onSelect} />
          )}
          {grouped.admin.length > 0 && (
            <ContactGroup title="الإدارة" contacts={grouped.admin} onSelect={onSelect} />
          )}
        </>
      )}
    </div>
  )
}

function ContactGroup({
  title,
  contacts,
  onSelect,
}: {
  title: string
  contacts: ChatContact[]
  onSelect: (c: ChatContact) => void
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1">
        {contacts.map((contact, i) => {
          const Icon = roleIcons[contact.role] ?? User
          return (
            <Button
              key={`${contact.user_id}-${contact.student?.id ?? i}`}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-2.5"
              onClick={() => onSelect(contact)}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-right min-w-0">
                <p className="text-sm font-medium truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {contact.role_label}
                  {contact.student && ` - ${contact.student.name}`}
                </p>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

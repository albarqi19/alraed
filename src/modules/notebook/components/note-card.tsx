import { Pin } from 'lucide-react'
import type { PersonalNote } from '../types'
import { NOTE_CATEGORIES } from '../types'

interface NoteCardProps {
  note: PersonalNote
  isActive: boolean
  onClick: () => void
}

export function NoteCard({ note, isActive, onClick }: NoteCardProps) {
  const cat = NOTE_CATEGORIES[note.category]
  const title = note.title || 'بدون عنوان'
  const date = new Date(note.updated_at).toLocaleDateString('ar-SA', {
    month: 'short', day: 'numeric',
  })

  return (
    <button
      onClick={onClick}
      className={`w-full text-right p-3 rounded-lg border transition-colors ${
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{cat.icon}</span>
            <span className="text-sm font-medium truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{cat.label}</span>
            <span>{date}</span>
          </div>
          {note.student && (
            <div className="text-xs text-primary/70 mt-1 truncate">
              {note.student.name}
            </div>
          )}
        </div>
        {note.is_pinned && (
          <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
        )}
      </div>
    </button>
  )
}

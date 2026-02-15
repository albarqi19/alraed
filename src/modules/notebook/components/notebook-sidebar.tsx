import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import type { PersonalNote, NoteCategory } from '../types'
import { NOTE_CATEGORIES } from '../types'
import { NoteCard } from './note-card'

interface NotebookSidebarProps {
  notes: PersonalNote[]
  activeNoteId: number | null
  onSelectNote: (note: PersonalNote) => void
  onNewNote: () => void
  onCategoryChange: (category: NoteCategory | 'all') => void
  onSearchChange: (search: string) => void
  activeCategory: NoteCategory | 'all'
}

export function NotebookSidebar({
  notes, activeNoteId, onSelectNote, onNewNote, onCategoryChange, onSearchChange, activeCategory,
}: NotebookSidebarProps) {
  const [search, setSearch] = useState('')

  const handleSearch = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const categories: { value: NoteCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'الكل', icon: '📝' },
    ...Object.entries(NOTE_CATEGORIES).map(([key, val]) => ({
      value: key as NoteCategory,
      label: val.label,
      icon: val.icon,
    })),
  ]

  return (
    <div className="w-72 border-l flex flex-col bg-background h-full" dir="rtl">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">المفكرة الشخصية</h2>
          <button
            onClick={onNewNote}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            title="ملاحظة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="بحث في الملاحظات..."
            className="w-full h-8 text-sm pr-8 pl-3 rounded-lg border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                activeCategory === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            لا توجد ملاحظات
          </div>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onClick={() => onSelectNote(note)}
            />
          ))
        )}
      </div>
    </div>
  )
}

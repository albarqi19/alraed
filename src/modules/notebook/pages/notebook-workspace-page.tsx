import { useState, useRef, useCallback, useEffect } from 'react'
import { Pin, PinOff, Trash2, BookOpen } from 'lucide-react'
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useTogglePin } from '../hooks'
import { TiptapEditor } from '../components/tiptap-editor'
import type { TiptapEditorRef } from '../components/tiptap-editor'
import { NotebookSidebar } from '../components/notebook-sidebar'
import { SaveStatusIndicator } from '../components/save-status-indicator'
import { NOTE_CATEGORIES } from '../types'
import type { PersonalNote, NoteCategory, NoteFilters } from '../types'

export function NotebookWorkspacePage() {
  // Filters
  const [filters, setFilters] = useState<NoteFilters>({})
  const { data: notes = [], isLoading } = useNotes(filters)

  // Mutations
  const createNote = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNote = useDeleteNote()
  const togglePin = useTogglePin()

  // Editor state
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general')
  const [editorKey, setEditorKey] = useState(0)
  const [activeCategory, setActiveCategory] = useState<NoteCategory | 'all'>('all')
  const [isEditing, setIsEditing] = useState(false)

  // Auto-save
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingChangesRef = useRef(false)
  const selectedNoteIdRef = useRef(selectedNoteId)
  const noteTitleRef = useRef(noteTitle)
  const noteCategoryRef = useRef(noteCategory)
  const noteContentRef = useRef(noteContent)

  const editorRef = useRef<TiptapEditorRef>(null)

  // Keep refs in sync
  useEffect(() => { selectedNoteIdRef.current = selectedNoteId }, [selectedNoteId])
  useEffect(() => { noteTitleRef.current = noteTitle }, [noteTitle])
  useEffect(() => { noteCategoryRef.current = noteCategory }, [noteCategory])
  useEffect(() => { noteContentRef.current = noteContent }, [noteContent])

  const selectedNote = notes.find(n => n.id === selectedNoteId)

  // Auto-save logic
  const performAutoSave = useCallback(async () => {
    if (!pendingChangesRef.current) return

    const content = editorRef.current?.getHTML() || noteContentRef.current
    if (!content && !noteTitleRef.current) return

    setSaving(true)
    pendingChangesRef.current = false

    try {
      if (selectedNoteIdRef.current) {
        // Update existing
        await updateNoteMutation.mutateAsync({
          id: selectedNoteIdRef.current,
          payload: {
            title: noteTitleRef.current || undefined,
            content,
            category: noteCategoryRef.current,
          },
        })
      } else {
        // Create new
        const newNote = await createNote.mutateAsync({
          title: noteTitleRef.current || undefined,
          content: content || '',
          category: noteCategoryRef.current,
        })
        setSelectedNoteId(newNote.id)
      }
      setLastSaved(new Date())
      setHasUnsaved(false)
    } catch (err) {
      console.error('Auto-save failed:', err)
      pendingChangesRef.current = true
    } finally {
      setSaving(false)
    }
  }, [createNote, updateNoteMutation])

  const triggerAutoSave = useCallback(() => {
    pendingChangesRef.current = true
    setHasUnsaved(true)
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => performAutoSave(), 1500)
  }, [performAutoSave])

  // Handlers
  const handleContentChange = useCallback((html: string) => {
    noteContentRef.current = html
    setNoteContent(html)
    triggerAutoSave()
  }, [triggerAutoSave])

  const handleTitleChange = useCallback((title: string) => {
    setNoteTitle(title)
    triggerAutoSave()
  }, [triggerAutoSave])

  const handleCategoryChange = useCallback((category: NoteCategory) => {
    setNoteCategory(category)
    triggerAutoSave()
  }, [triggerAutoSave])

  const selectNote = useCallback((note: PersonalNote) => {
    // Save pending first
    if (pendingChangesRef.current) performAutoSave()

    setSelectedNoteId(note.id)
    setNoteTitle(note.title || '')
    setNoteContent(note.content || '')
    setNoteCategory(note.category)
    setEditorKey(k => k + 1)
    setHasUnsaved(false)
    setLastSaved(null)
    setIsEditing(true)
  }, [performAutoSave])

  const handleNewNote = useCallback(() => {
    if (pendingChangesRef.current) performAutoSave()

    setSelectedNoteId(null)
    setNoteTitle('')
    setNoteContent('')
    setNoteCategory('general')
    setEditorKey(k => k + 1)
    setHasUnsaved(false)
    setLastSaved(null)
    setIsEditing(true)
    setTimeout(() => editorRef.current?.focus(), 100)
  }, [performAutoSave])

  const handleDelete = useCallback(async () => {
    if (!selectedNoteId) return
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return
    await deleteNote.mutateAsync(selectedNoteId)
    handleNewNote()
  }, [selectedNoteId, deleteNote, handleNewNote])

  const handleTogglePin = useCallback(async () => {
    if (!selectedNoteId) return
    await togglePin.mutateAsync(selectedNoteId)
  }, [selectedNoteId, togglePin])

  return (
    <div className="flex h-[calc(100vh-64px)]" dir="rtl">
      {/* Sidebar */}
      <NotebookSidebar
        notes={notes}
        activeNoteId={selectedNoteId}
        onSelectNote={selectNote}
        onNewNote={handleNewNote}
        onCategoryChange={cat => {
          setActiveCategory(cat)
          setFilters(f => ({ ...f, category: cat === 'all' ? undefined : cat }))
        }}
        onSearchChange={search => setFilters(f => ({ ...f, search: search || undefined }))}
        activeCategory={activeCategory}
      />

      {/* Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-3 border-b bg-background">
          <input
            type="text"
            value={noteTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="عنوان الملاحظة..."
            className="flex-1 text-lg font-semibold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
          />

          <select
            value={noteCategory}
            onChange={e => handleCategoryChange(e.target.value as NoteCategory)}
            className="h-8 text-xs rounded border bg-background px-2"
          >
            {Object.entries(NOTE_CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>{val.icon} {val.label}</option>
            ))}
          </select>

          {selectedNoteId && (
            <>
              <button
                onClick={handleTogglePin}
                className={`p-1.5 rounded transition-colors ${selectedNote?.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title={selectedNote?.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
              >
                {selectedNote?.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          <SaveStatusIndicator saving={saving} lastSaved={lastSaved} hasUnsaved={hasUnsaved} />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              جاري التحميل...
            </div>
          ) : !isEditing && !selectedNoteId && !noteContent ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <BookOpen className="w-12 h-12 opacity-30" />
              <p>اختر ملاحظة من القائمة أو أنشئ ملاحظة جديدة</p>
              <button
                onClick={handleNewNote}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                ملاحظة جديدة
              </button>
            </div>
          ) : (
            <TiptapEditor
              key={editorKey}
              ref={editorRef}
              content={noteContent}
              onChange={handleContentChange}
              minHeight="100%"
              borderless
            />
          )}
        </div>
      </div>
    </div>
  )
}

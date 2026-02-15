import { useEffect, useImperativeHandle, forwardRef, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Link } from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Extension } from '@tiptap/core'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Quote, Link as LinkIcon, Unlink,
  Palette, Highlighter, Undo, Redo,
} from 'lucide-react'

// Font Size extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: (attrs: Record<string, string>) => {
            if (!attrs.fontSize) return {}
            return { style: `font-size: ${attrs.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize }).run(),
    } as any
  },
})

export interface TiptapEditorRef {
  getHTML: () => string
  setContent: (content: string) => void
  focus: () => void
  isEmpty: () => boolean
  getAllText: () => string | null
}

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  editable?: boolean
  minHeight?: string
  className?: string
  borderless?: boolean
}

const COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
  '#3182CE', '#805AD5', '#D53F8C', '#2D3748',
  '#F56565', '#ED8936', '#ECC94B', '#48BB78',
  '#4299E1', '#9F7AEA',
]

const HIGHLIGHT_COLORS = [
  '#FEFCBF', '#FEEBC8', '#FED7D7', '#C6F6D5',
  '#BEE3F8', '#E9D8FD', '#FED7E2', '#E2E8F0',
]

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
  content, onChange, editable = true, minHeight = '300px', className = '', borderless = false,
}, ref) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showTableMenu, setShowTableMenu] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
        setShowHighlightPicker(false)
        setShowLinkInput(false)
        setShowTableMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { HTMLAttributes: { dir: 'rtl' } },
        orderedList: { HTMLAttributes: { dir: 'rtl' } },
        blockquote: { HTMLAttributes: { dir: 'rtl' } },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'right',
      }),
      Underline,
      Table.configure({ resizable: true, HTMLAttributes: { dir: 'rtl' } }),
      TableRow, TableHeader, TableCell,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      TextStyle, Color, FontSize,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none', dir: 'rtl', style: `text-align: right; min-height: ${minHeight};` },
    },
  })

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? '',
    setContent: (c: string) => editor?.commands.setContent(c),
    focus: () => editor?.commands.focus(),
    isEmpty: () => editor?.isEmpty ?? true,
    getAllText: () => editor?.getText() ?? null,
  }))

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return
    editor.chain().focus().setLink({ href: linkUrl }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  if (!editor) return null

  const ToolbarBtn = ({ active, onClick, children, title }: {
    active?: boolean; onClick: () => void; children: React.ReactNode; title?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
    >
      {children}
    </button>
  )

  return (
    <div className={`${borderless ? 'flex flex-col h-full' : 'border rounded-lg'} bg-background ${className}`}>
      {/* Toolbar */}
      {editable && (
        <div ref={toolbarRef} className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30 relative z-10" dir="ltr">
          {/* Undo/Redo */}
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="تراجع"><Undo className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="إعادة"><Redo className="w-4 h-4" /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Heading */}
          <select
            value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : editor.isActive('heading', { level: 4 }) ? '4' : '0'}
            onChange={e => {
              const level = parseInt(e.target.value)
              if (level === 0) editor.chain().focus().setParagraph().run()
              else editor.chain().focus().toggleHeading({ level: level as 1|2|3|4 }).run()
            }}
            className="h-7 text-xs rounded border bg-background px-1"
          >
            <option value="0">نص عادي</option>
            <option value="1">عنوان 1</option>
            <option value="2">عنوان 2</option>
            <option value="3">عنوان 3</option>
            <option value="4">عنوان 4</option>
          </select>

          {/* Font Size */}
          <select
            onChange={e => {
              const size = e.target.value
              if (size) (editor.chain().focus() as any).setFontSize(size).run()
            }}
            className="h-7 text-xs rounded border bg-background px-1"
            defaultValue=""
          >
            <option value="" disabled>حجم</option>
            {['12px','14px','16px','18px','20px','24px','28px','32px'].map(s => (
              <option key={s} value={s}>{parseInt(s)}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Text Format */}
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="غامق"><Bold className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="مائل"><Italic className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="تحته خط"><UnderlineIcon className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="يتوسطه خط"><Strikethrough className="w-4 h-4" /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Color Pickers */}
          <div className="relative">
            <ToolbarBtn onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false) }} title="لون النص"><Palette className="w-4 h-4" /></ToolbarBtn>
            {showColorPicker && (
              <div className="absolute top-full mt-1 z-50 p-2 bg-popover border rounded-lg shadow-lg grid grid-cols-6 gap-1" style={{ left: 0 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
                    className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <ToolbarBtn onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false) }} title="تمييز"><Highlighter className="w-4 h-4" /></ToolbarBtn>
            {showHighlightPicker && (
              <div className="absolute top-full mt-1 z-50 p-2 bg-popover border rounded-lg shadow-lg grid grid-cols-4 gap-1" style={{ left: 0 }}>
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlightPicker(false) }}
                    className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Lists */}
          <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="قائمة نقطية"><List className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="قائمة مرقمة"><ListOrdered className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="اقتباس"><Quote className="w-4 h-4" /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Alignment */}
          <ToolbarBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="محاذاة يمين"><AlignRight className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="توسيط"><AlignCenter className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="محاذاة يسار"><AlignLeft className="w-4 h-4" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="ضبط"><AlignJustify className="w-4 h-4" /></ToolbarBtn>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Link */}
          <div className="relative">
            {editor.isActive('link') ? (
              <ToolbarBtn onClick={() => editor.chain().focus().unsetLink().run()} title="إزالة الرابط"><Unlink className="w-4 h-4" /></ToolbarBtn>
            ) : (
              <ToolbarBtn onClick={() => setShowLinkInput(!showLinkInput)} title="إضافة رابط"><LinkIcon className="w-4 h-4" /></ToolbarBtn>
            )}
            {showLinkInput && (
              <div className="absolute top-full mt-1 z-50 p-2 bg-popover border rounded-lg shadow-lg flex gap-1" style={{ left: 0 }}>
                <input
                  type="url" placeholder="https://..." value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLink()}
                  className="text-xs border rounded px-2 py-1 w-48"
                  dir="ltr"
                />
                <button onClick={addLink} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">OK</button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="relative">
            <ToolbarBtn onClick={() => setShowTableMenu(!showTableMenu)} title="جدول"><TableIcon className="w-4 h-4" /></ToolbarBtn>
            {showTableMenu && (
              <div className="absolute top-full mt-1 z-50 p-2 bg-popover border rounded-lg shadow-lg space-y-1 min-w-[140px]" style={{ left: 0 }}>
                <button className="w-full text-right text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowTableMenu(false) }}>إدراج جدول 3×3</button>
                {editor.isActive('table') && <>
                  <button className="w-full text-right text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => editor.chain().focus().addRowAfter().run()}>إضافة صف</button>
                  <button className="w-full text-right text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => editor.chain().focus().addColumnAfter().run()}>إضافة عمود</button>
                  <button className="w-full text-right text-xs px-2 py-1 hover:bg-muted rounded text-destructive" onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false) }}>حذف الجدول</button>
                </>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className={`p-4 ${borderless ? 'flex-1 overflow-y-auto' : ''}`} onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
})

TiptapEditor.displayName = 'TiptapEditor'
export default TiptapEditor

import { useRef, useEffect } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import type { GuideSection, AskMeHighlight } from '../types'

interface GuideContentViewerProps {
  section: GuideSection | null
  isBookmarked: boolean
  onToggleBookmark: () => void
  highlights: AskMeHighlight[]
  loading: boolean
}

export function GuideContentViewer({
  section, isBookmarked, onToggleBookmark, highlights, loading,
}: GuideContentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Highlight matching text in content
  useEffect(() => {
    if (!contentRef.current || highlights.length === 0) return

    const container = contentRef.current
    // Reset previous highlights
    container.querySelectorAll('.ai-highlight').forEach(el => {
      const parent = el.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      }
    })

    // Apply new highlights
    highlights.forEach(h => {
      if (!h.exact_text) return
      highlightTextInElement(container, h.exact_text, h.comment)
    })
  }, [highlights])

  // Scroll to first highlight
  useEffect(() => {
    if (highlights.length > 0 && contentRef.current) {
      const firstHighlight = contentRef.current.querySelector('.ai-highlight')
      if (firstHighlight) {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlights])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    )
  }

  if (!section) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>اختر قسماً من الفهرس لعرض محتواه</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" dir="rtl">
      {/* Section Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{section.title}</h2>
        <button
          onClick={onToggleBookmark}
          className={`p-1.5 rounded-lg transition-colors ${
            isBookmarked ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isBookmarked ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-amber-500" /> : <Bookmark className="w-5 h-5" />}
        </button>
      </div>

      {/* Section Content */}
      <div
        ref={contentRef}
        className="p-6 prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
        dangerouslySetInnerHTML={{ __html: section.content || '<p class="text-muted-foreground">لا يوجد محتوى لهذا القسم</p>' }}
      />
    </div>
  )
}

function highlightTextInElement(container: HTMLElement, searchText: string, comment: string) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text)
  }

  // Normalize search text
  const normalizedSearch = searchText.replace(/\s+/g, ' ').trim()

  for (const textNode of textNodes) {
    const nodeText = textNode.textContent || ''
    const normalizedNode = nodeText.replace(/\s+/g, ' ')
    const idx = normalizedNode.indexOf(normalizedSearch)

    if (idx === -1) continue

    const range = document.createRange()
    range.setStart(textNode, idx)
    range.setEnd(textNode, Math.min(idx + normalizedSearch.length, nodeText.length))

    const mark = document.createElement('mark')
    mark.className = 'ai-highlight bg-yellow-200/70 rounded px-0.5 cursor-help'
    mark.title = comment || ''

    try {
      range.surroundContents(mark)
    } catch {
      // Range crosses element boundaries - skip
    }
    break // Only highlight first match per highlight
  }
}

import { useState } from 'react'
import { ChevronDown, ChevronLeft, Bookmark, Search } from 'lucide-react'
import type { GuideSection, GuideBookmark } from '../types'

interface GuideTocSidebarProps {
  sections: GuideSection[]
  activeSectionId: number | null
  onSelectSection: (section: GuideSection) => void
  bookmarks: GuideBookmark[]
}

function TocItem({
  section, level, activeSectionId, onSelectSection,
}: {
  section: GuideSection; level: number; activeSectionId: number | null; onSelectSection: (s: GuideSection) => void
}) {
  const [expanded, setExpanded] = useState(level <= 1)
  const hasChildren = section.children && section.children.length > 0
  const isActive = section.id === activeSectionId
  const hasContent = !!section.content

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors text-sm ${
          isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingRight: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasContent) onSelectSection(section)
          if (hasChildren) setExpanded(!expanded)
        }}
      >
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} className="p-0.5">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className={`flex-1 truncate ${!hasContent ? 'font-semibold' : ''}`}>
          {section.is_bookmarked && <Bookmark className="w-3 h-3 inline ml-1 text-amber-500 fill-amber-500" />}
          {section.title}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {section.children!.map(child => (
            <TocItem
              key={child.id}
              section={child}
              level={level + 1}
              activeSectionId={activeSectionId}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function GuideTocSidebar({ sections, activeSectionId, onSelectSection, bookmarks }: GuideTocSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showBookmarks, setShowBookmarks] = useState(false)

  const filteredSections = searchQuery
    ? sections.filter(s => filterBySearch(s, searchQuery))
    : sections

  return (
    <div className="w-72 border-l flex flex-col bg-background h-full" dir="rtl">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <h3 className="font-semibold text-sm">الفهرس</h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في الفهرس..."
            className="w-full h-7 text-xs pr-8 pl-3 rounded border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* TOC Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredSections.map(section => (
          <TocItem
            key={section.id}
            section={section}
            level={0}
            activeSectionId={activeSectionId}
            onSelectSection={onSelectSection}
          />
        ))}
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className="flex items-center gap-2 w-full p-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>المفضلة ({bookmarks.length})</span>
            {showBookmarks ? <ChevronDown className="w-3 h-3 mr-auto" /> : <ChevronLeft className="w-3 h-3 mr-auto" />}
          </button>
          {showBookmarks && (
            <div className="px-2 pb-2 space-y-0.5">
              {bookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => bm.section && onSelectSection(bm.section as GuideSection)}
                  className={`w-full text-right text-xs px-2 py-1.5 rounded hover:bg-muted truncate ${
                    bm.guide_section_id === activeSectionId ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  {bm.section?.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function filterBySearch(section: GuideSection, query: string): boolean {
  const q = query.toLowerCase()
  if (section.title.toLowerCase().includes(q)) return true
  if (section.children) return section.children.some(c => filterBySearch(c, q))
  return false
}

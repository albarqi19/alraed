import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import {
  useGuideByType, useGuideSectionTree, useGuideSection,
  useGuideBookmarks, useToggleBookmark, useAskGuide,
} from '../hooks'
import { GuideTocSidebar } from '../components/guide-toc-sidebar'
import { GuideContentViewer } from '../components/guide-content-viewer'
import { AskMeWidget } from '../components/ask-me-widget'
import type { GuideSection, GuideType, AskMeHighlight, AskMeResponse } from '../types'
import { GUIDE_TITLES, BLOCKED_GUIDES } from '../types'

import { GuideComingSoon } from '../components/guide-coming-soon'

export function GuideViewerPage() {
  const { type } = useParams<{ type: string }>()
  const guideType = (type as GuideType) || 'procedural'

  if (BLOCKED_GUIDES.includes(guideType)) {
    return (
      <GuideComingSoon
        title={GUIDE_TITLES[guideType]}
        subtitle="جاري تحويل الأدلة المدرسية إلى تجربة رقمية تفاعلية"
      />
    )
  }

  // Data queries
  const { data: guide, isLoading: guideLoading } = useGuideByType(guideType)
  const { data: sectionTree = [], isLoading: treeLoading } = useGuideSectionTree(guide?.id)
  const { data: bookmarks = [] } = useGuideBookmarks(guide?.id)

  // Selected section
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null)
  const { data: activeSection, isLoading: sectionLoading } = useGuideSection(activeSectionId)

  // AI highlights
  const [highlights, setHighlights] = useState<AskMeHighlight[]>([])
  const askGuide = useAskGuide()
  const toggleBookmark = useToggleBookmark()


  const handleSelectSection = useCallback((section: GuideSection) => {
    setActiveSectionId(section.id)
    setHighlights([])
  }, [])

  const handleToggleBookmark = useCallback(async () => {
    if (!activeSectionId) return
    await toggleBookmark.mutateAsync(activeSectionId)
  }, [activeSectionId, toggleBookmark])

  const handleAsk = useCallback(async (question: string): Promise<AskMeResponse> => {
    if (!guide?.id) throw new Error('Guide not found')
    return askGuide.mutateAsync({
      guideId: guide.id,
      payload: {
        question,
        section_id: activeSectionId || undefined,
      },
    })
  }, [guide?.id, activeSectionId, askGuide])

  const handleNavigateToSection = useCallback((sectionId: number) => {
    setActiveSectionId(sectionId)
  }, [])

  if (guideLoading || treeLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] text-muted-foreground">
        <p>الدليل غير متوفر</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background">
        <h1 className="text-lg font-bold">{GUIDE_TITLES[guideType] || guide.title}</h1>
        <span className="text-xs text-muted-foreground">
          {guide.sections_count} قسم
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* TOC Sidebar */}
        <GuideTocSidebar
          sections={sectionTree}
          activeSectionId={activeSectionId}
          onSelectSection={handleSelectSection}
          bookmarks={bookmarks}
        />

        {/* Content Viewer */}
        <GuideContentViewer
          section={activeSection || null}
          isBookmarked={activeSection?.is_bookmarked || false}
          onToggleBookmark={handleToggleBookmark}
          highlights={highlights}
          loading={sectionLoading}
        />
      </div>

      {/* Ask Me Widget */}
      <AskMeWidget
        onAsk={handleAsk}
        onHighlightsChange={setHighlights}
        onNavigateToSection={handleNavigateToSection}
        isLoading={askGuide.isPending}
        placeholder={`اسألني عن ${GUIDE_TITLES[guideType]}...`}
      />
    </div>
  )
}

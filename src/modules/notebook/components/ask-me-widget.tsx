import { useState, useRef } from 'react'
import { Send, Loader2, MessageCircleQuestion, X, ChevronLeft } from 'lucide-react'
import type { AskMeHighlight, AskMeResponse } from '../types'

interface AskMeWidgetProps {
  onAsk: (question: string) => Promise<AskMeResponse>
  onHighlightsChange: (highlights: AskMeHighlight[]) => void
  onNavigateToSection?: (sectionId: number) => void
  isLoading: boolean
  placeholder?: string
}

export function AskMeWidget({
  onAsk, onHighlightsChange, onNavigateToSection, isLoading, placeholder = 'اسألني عن الدليل...',
}: AskMeWidgetProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<AskMeHighlight[]>([])
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return

    setError(null)
    setAnswer(null)
    setHighlights([])
    onHighlightsChange([])

    try {
      const response = await onAsk(question.trim())
      setAnswer(response.answer)
      setHighlights(response.highlights || [])
      onHighlightsChange(response.highlights || [])
      setExpanded(true)
    } catch {
      setError('حدث خطأ أثناء معالجة السؤال. حاول مرة أخرى.')
    }
  }

  const handleClear = () => {
    setQuestion('')
    setAnswer(null)
    setHighlights([])
    setError(null)
    onHighlightsChange([])
    setExpanded(false)
  }

  return (
    <div className="border-t bg-background" dir="rtl">
      {/* Answer area (expandable) */}
      {expanded && (answer || error) && (
        <div className="max-h-48 overflow-y-auto border-b px-4 py-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : answer ? (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
              {highlights.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground">النتائج المميزة:</p>
                  {highlights.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => h.section_id && onNavigateToSection?.(h.section_id)}
                      className="flex items-center gap-2 w-full text-right text-xs p-2 rounded bg-yellow-50 hover:bg-yellow-100 transition-colors border border-yellow-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-yellow-800 truncate font-medium">"{h.exact_text}"</p>
                        {h.comment && <p className="text-yellow-600 truncate">{h.comment}</p>}
                      </div>
                      {h.section_id && <ChevronLeft className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 p-3">
        <MessageCircleQuestion className="w-5 h-5 text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 h-9 text-sm bg-muted/30 border rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isLoading}
        />
        {(answer || error) && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground"
            title="مسح"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading}
          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="إرسال"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAIInsights, sendAIChat, createPlanFromAI } from '@/modules/admin/behavior/api'
import type { AIChatMessage, AIChatResponse, AITreatmentPlanData } from '@/modules/admin/behavior/api'
import { Bot, Send, MessageSquare, Sparkles, RefreshCw, Clock, AlertCircle, FileText, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

// ==================== Markdown Helpers ====================

/** Convert inline markdown (**bold**) to React elements */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Replace **bold** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

/** Detect if a line is a table separator (|---|---|) */
function isTableSeparator(line: string): boolean {
  return /^\|[\s-:|]+\|$/.test(line.trim())
}

/** Parse a table row into cells */
function parseTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
}

/** Render a full markdown content block for AI messages */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line → spacer
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    // Horizontal rule ---
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="my-3 border-slate-200" />)
      i++
      continue
    }

    // Headers ### ## #
    if (trimmed.startsWith('#')) {
      const cleanLine = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      elements.push(
        <h3 key={i} className="mt-3 mb-1.5 flex items-center gap-2 border-b border-slate-100 pb-1.5 text-[13px] font-bold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          {cleanLine}
        </h3>
      )
      i++
      continue
    }

    // Table block: collect all consecutive lines starting with |
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }

      // Parse header + body
      const headerLine = tableLines[0]
      const bodyLines = tableLines.filter((l) => !isTableSeparator(l)).slice(1)
      const headerCells = parseTableRow(headerLine)

      elements.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 text-right font-semibold text-slate-600">
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bodyLines.map((rowLine, ri) => {
                const cells = parseTableRow(rowLine)
                return (
                  <tr key={ri} className="hover:bg-slate-50/50">
                    {cells.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-slate-700">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Numbered list items: 1. 2. etc.
    if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1]
      const text = trimmed.replace(/^\d+\.\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 pr-1 text-[13px] text-slate-700">
          <span className="mt-0.5 shrink-0 text-xs font-bold text-violet-600">{num}.</span>
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      )
      i++
      continue
    }

    // Bullet list items: - or *
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-*]\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 pr-2 text-[13px] text-slate-700">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      )
      i++
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[13px] leading-relaxed text-slate-700">
        {renderInlineMarkdown(trimmed)}
      </p>
    )
    i++
  }

  return <div className="space-y-1">{elements}</div>
}

// ==================== Priority Config ====================
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'منخفضة', color: 'bg-green-100 text-green-700' },
}

// ==================== Treatment Plan Card ====================

interface TreatmentPlanCardProps {
  plan: AITreatmentPlanData
  onCreatePlan: () => void
  isCreating: boolean
  hasError: boolean
  createdPlan?: { plan_id: number; plan_number: string } | null
}

function TreatmentPlanCard({ plan, onCreatePlan, isCreating, hasError, createdPlan }: TreatmentPlanCardProps) {
  const priorityCfg = PRIORITY_CONFIG[plan.priority] ?? PRIORITY_CONFIG.medium

  return (
    <div className="mt-3 mr-9 overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-teal-100 bg-white/60 px-4 py-2.5">
        <FileText className="h-4 w-4 text-teal-600" />
        <span className="text-xs font-bold text-teal-800">خطة علاجية مقترحة</span>
        <span className={`mr-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityCfg.color}`}>
          {priorityCfg.label}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2.5 p-4">
        <h4 className="text-sm font-bold text-slate-800">{plan.title}</h4>

        {plan.student_name && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium">الطالب:</span>
            <span>{plan.student_name}</span>
            <span className="text-slate-400">({plan.student_grade} / {plan.student_class})</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded bg-white/80 px-2 py-0.5 text-slate-600">
            النوع: <strong>{plan.problem_type}</strong>
          </span>
          <span className="rounded bg-white/80 px-2 py-0.5 text-slate-600">
            المدة: <strong>{plan.duration_weeks} أسابيع</strong>
          </span>
        </div>

        {plan.goals && plan.goals.length > 0 && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">الأهداف ({plan.goals.length}):</span>
            {plan.goals.slice(0, 3).map((goal, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-teal-500" />
                <span>{goal.title}</span>
              </div>
            ))}
            {plan.goals.length > 3 && (
              <span className="text-[10px] text-slate-400">+ {plan.goals.length - 3} أهداف أخرى</span>
            )}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="border-t border-teal-100 bg-white/60 px-4 py-2.5">
        {createdPlan ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              تم إنشاء الخطة ({createdPlan.plan_number})
            </span>
            <a
              href={`/admin/treatment-plans/${createdPlan.plan_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-auto inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-teal-700"
            >
              <ExternalLink className="h-3 w-3" />
              فتح الخطة
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {hasError && (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>حدث خطأ أثناء إنشاء الخطة. يرجى المحاولة مرة أخرى.</span>
              </div>
            )}
            <button
              type="button"
              onClick={onCreatePlan}
              disabled={isCreating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري إنشاء الخطة...
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  {hasError ? 'إعادة المحاولة' : 'إنشاء الخطة العلاجية كمسودة'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== Main Component ====================

interface AIInsightsTabProps {
  activeTab: string
}

const QUICK_PROMPTS = [
  'ملخص الحالة السلوكية للفصل الدراسي',
  'أكثر الطلاب احتياجاً للتدخل',
  'مقارنة سلوك الفصول',
  'توصيات لتحسين السلوك',
]

type ExtendedMessage = AIChatMessage & {
  _sources?: AIChatResponse['sources']
  _treatmentPlan?: AITreatmentPlanData
}

export default function AIInsightsTab({ activeTab }: AIInsightsTabProps) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [createdPlans, setCreatedPlans] = useState<Record<number, { plan_id: number; plan_number: string }>>({})
  const [creatingPlanIdx, setCreatingPlanIdx] = useState<number | null>(null)
  const [failedPlanIdx, setFailedPlanIdx] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  // ==================== AI Insights Query ====================

  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
    isFetching: insightsFetching,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ['ai-insights', 'daily_summary'],
    queryFn: () => fetchAIInsights('daily_summary'),
    enabled: activeTab === 'ai',
    staleTime: 1000 * 60 * 60, // 1 hour - don't re-fetch automatically
    retry: 1,
  })

  // ==================== Chat Mutation ====================

  const chatMutation = useMutation({
    mutationFn: (message: string) => sendAIChat(message, sessionId),
    onSuccess: (data: AIChatResponse) => {
      setSessionId(data.session_id)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        _sources: data.sources,
        _treatmentPlan: data.treatment_plan,
      } as ExtendedMessage])
    },
  })

  // ==================== Create Plan Mutation ====================

  const createPlanMutation = useMutation({
    mutationFn: ({ planData }: { planData: AITreatmentPlanData; msgIdx: number }) => createPlanFromAI(planData),
    onSuccess: (data, vars) => {
      setCreatedPlans(prev => ({
        ...prev,
        [vars.msgIdx]: { plan_id: data.plan_id, plan_number: data.plan_number },
      }))
      setCreatingPlanIdx(null)
    },
    onError: (_err, vars) => {
      setFailedPlanIdx(vars.msgIdx)
      setCreatingPlanIdx(null)
    },
  })

  const handleCreatePlan = (plan: AITreatmentPlanData, msgIdx: number) => {
    setCreatingPlanIdx(msgIdx)
    setFailedPlanIdx(null)
    createPlanMutation.mutate({ planData: plan, msgIdx })
  }

  // ==================== Auto-scroll ====================

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  // ==================== Handlers ====================

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return
    const userMessage: AIChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    chatMutation.mutate(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    if (chatMutation.isPending) return
    const userMessage: AIChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])
    chatMutation.mutate(prompt)
  }

  const handleNewChat = () => {
    setMessages([])
    setSessionId(undefined)
    setInput('')
    setCreatedPlans({})
    setCreatingPlanIdx(null)
    setFailedPlanIdx(null)
    inputRef.current?.focus()
  }

  const handleRefreshInsights = () => {
    // Invalidate cache to force a fresh API call
    queryClient.removeQueries({ queryKey: ['ai-insights', 'daily_summary'] })
    refetchInsights()
  }

  // ==================== Helpers ====================

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const formatInsightsDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const isInsightsLoading = insightsLoading || insightsFetching

  // ==================== Render ====================

  return (
    <div className="grid gap-6 lg:grid-cols-2" dir="rtl">
      {/* ==================== Section 1: AI Semester Insights ==================== */}
      <section className="glass-card flex flex-col p-6">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-200/50">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">التحليل الذكي للفصل</h2>
              <p className="text-xs text-slate-500">تحليل شامل للحالة السلوكية خلال الفصل الدراسي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {insightsData && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  insightsData.cached
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    insightsData.cached ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                {insightsData.cached ? 'من الذاكرة المؤقتة' : 'تحليل جديد'}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefreshInsights}
              disabled={isInsightsLoading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-600 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="إعادة التحليل"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isInsightsLoading ? 'animate-spin' : ''}`} />
              تحليل جديد
            </button>
          </div>
        </header>

        {/* Insights Content */}
        <div className="max-h-[600px] flex-1 overflow-y-auto">
          {isInsightsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div
                    className="h-4 rounded-lg bg-slate-200/80"
                    style={{ width: `${90 - i * 8}%` }}
                  />
                </div>
              ))}
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري تحليل بيانات الفصل الدراسي...</span>
              </div>
              <p className="text-center text-xs text-slate-400">
                قد يستغرق التحليل حتى 30 ثانية
              </p>
            </div>
          ) : insightsError ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <AlertCircle className="mb-3 h-10 w-10 text-rose-400" />
              <p className="text-sm font-medium text-rose-600">حدث خطأ أثناء التحليل</p>
              <p className="mt-1 max-w-[280px] text-center text-xs text-slate-400">
                تأكد من تهيئة مفتاح OpenRouter في إعدادات السيرفر
              </p>
              <button
                type="button"
                onClick={handleRefreshInsights}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </button>
            </div>
          ) : insightsData?.insights ? (
            <div className="space-y-4">
              <MarkdownContent content={insightsData.insights} />

              {/* Generated at timestamp */}
              <div className="mt-6 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                <span>تم التحليل: {formatInsightsDate(insightsData.generated_at)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Sparkles className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">لا تتوفر تحليلات حالياً</p>
              <p className="mt-1 text-xs">اضغط "تحليل جديد" لبدء التحليل</p>
              <button
                type="button"
                onClick={handleRefreshInsights}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                بدء التحليل الآن
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ==================== Section 2: AI Chat ==================== */}
      <section className="glass-card flex flex-col p-6">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/50">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">المستشار الذكي</h2>
              <p className="text-xs text-slate-500">محادثة تفاعلية مع الذكاء الاصطناعي</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              محادثة جديدة
            </button>
          )}
        </header>

        {/* Chat Messages Container */}
        <div className="h-[500px] flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <p className="mb-1 text-sm font-semibold text-slate-700">
                ابدأ محادثة مع المستشار الذكي
              </p>
              <p className="mb-6 max-w-[250px] text-center text-xs text-slate-400">
                اسأل عن السلوك، التحليلات، أو اطلب توصيات مخصصة
              </p>

              {/* Quick Prompts in Empty State */}
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 hover:shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                const sources = msg._sources
                const treatmentPlan = msg._treatmentPlan
                return (
                  <div key={idx}>
                    <div
                      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-1'}`}>
                        {/* Avatar + Bubble */}
                        <div className={`flex items-start gap-2 ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
                          {/* Avatar */}
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              isUser
                                ? 'bg-teal-600 text-white'
                                : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                            }`}
                          >
                            {isUser ? (
                              <span className="text-[10px] font-bold">أنت</span>
                            ) : (
                              <Bot className="h-3.5 w-3.5" />
                            )}
                          </div>

                          {/* Bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isUser
                                ? 'bg-teal-600 text-white'
                                : 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                            }`}
                          >
                            {isUser ? (
                              msg.content.split('\n').map((line, lineIdx) => (
                                <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
                                  {line || '\u00A0'}
                                </p>
                              ))
                            ) : (
                              <MarkdownContent content={msg.content} />
                            )}
                          </div>
                        </div>

                        {/* Sources (for assistant messages) */}
                        {!isUser && sources && typeof sources === 'object' && (
                          <div className="mr-9 mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <span>مبني على:</span>
                            {sources.violations > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                {sources.violations} مخالفة
                              </span>
                            )}
                            {sources.evaluations > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                {sources.evaluations} تقييم
                              </span>
                            )}
                            {sources.referrals > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                {sources.referrals} إحالة
                              </span>
                            )}
                            {sources.treatment_plans > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5">
                                {sources.treatment_plans} خطة علاجية
                              </span>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <p
                          className={`mt-1 text-[10px] text-slate-400 ${
                            isUser ? 'text-start' : 'text-end ml-9'
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Treatment Plan Card (after assistant message) */}
                    {!isUser && treatmentPlan && (
                      <TreatmentPlanCard
                        plan={treatmentPlan}
                        onCreatePlan={() => handleCreatePlan(treatmentPlan, idx)}
                        isCreating={creatingPlanIdx === idx && createPlanMutation.isPending}
                        hasError={failedPlanIdx === idx}
                        createdPlan={createdPlans[idx] ?? null}
                      />
                    )}
                  </div>
                )
              })}

              {/* Loading Indicator */}
              {chatMutation.isPending && (
                <div className="flex justify-end">
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {chatMutation.isError && (
                <div className="flex justify-center">
                  <div className="rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-600">
                    حدث خطأ أثناء الاتصال بالمستشار الذكي. يرجى المحاولة مرة أخرى.
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Quick Prompts (when chat has messages) */}
        {messages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={chatMutation.isPending}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-all duration-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="mt-3 flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
              rows={1}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-12 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              disabled={chatMutation.isPending}
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-200/50 transition-all duration-200 hover:bg-teal-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          </button>
        </div>
      </section>
    </div>
  )
}

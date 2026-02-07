import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Loader2, Sparkles } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWhatsappInstances, checkWhatsappInstanceStatus } from '../api'
import { adminQueryKeys } from '../query-keys'
import type { WhatsappInstance } from '../types'
import { fetchAIInsights } from '../behavior/api'

const STATUS_POLL_INTERVAL = 45_000

// ==================== Markdown Renderer ====================

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s-:|]+\|$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { elements.push(<div key={i} className="h-2" />); i++; continue }

    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="my-3 border-slate-200" />); i++; continue
    }

    if (trimmed.startsWith('#')) {
      const cleanLine = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      elements.push(
        <h3 key={i} className="mt-3 mb-1.5 flex items-center gap-2 border-b border-slate-100 pb-1.5 text-[13px] font-bold text-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          {cleanLine}
        </h3>
      )
      i++; continue
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i].trim()); i++ }
      const headerCells = parseTableRow(tableLines[0])
      const bodyLines = tableLines.filter(l => !isTableSeparator(l)).slice(1)
      elements.push(
        <div key={`table-${i}`} className="my-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              {headerCells.map((cell, ci) => <th key={ci} className="px-3 py-2 text-right font-semibold text-slate-600">{renderInlineMarkdown(cell)}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bodyLines.map((rowLine, ri) => {
                const cells = parseTableRow(rowLine)
                return <tr key={ri} className="hover:bg-slate-50/50">{cells.map((cell, ci) => <td key={ci} className="px-3 py-1.5 text-slate-700">{renderInlineMarkdown(cell)}</td>)}</tr>
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1]
      const text = trimmed.replace(/^\d+\.\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 pr-1 text-[13px] text-slate-700">
          <span className="mt-0.5 shrink-0 text-xs font-bold text-violet-600">{num}.</span>
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      )
      i++; continue
    }

    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-*]\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 pr-2 text-[13px] text-slate-700">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      )
      i++; continue
    }

    elements.push(<p key={i} className="text-[13px] leading-relaxed text-slate-700">{renderInlineMarkdown(trimmed)}</p>)
    i++
  }

  return <div className="space-y-1">{elements}</div>
}

// ==================== Main Widget ====================

export function GlobalWhatsappWidget() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const [dismissed, setDismissed] = useState(false)
  const [showInsights, setShowInsights] = useState(false)

  const isInsideAdmin = location.pathname.startsWith('/admin')

  // ---- واتساب ----
  const { data: instances = [], isLoading } = useQuery({
    queryKey: adminQueryKeys.whatsapp.instances(),
    queryFn: fetchWhatsappInstances,
    refetchInterval: 60_000,
    enabled: isInsideAdmin,
  })

  const instanceIdsRef = useRef('')
  useEffect(() => {
    if (!isInsideAdmin || instances.length === 0) return
    const ids = instances.map((i) => i.id).join(',')
    if (ids === instanceIdsRef.current) return
    instanceIdsRef.current = ids

    const checkAll = async () => {
      for (const inst of instances) {
        try {
          const updated = await checkWhatsappInstanceStatus(inst.id)
          queryClient.setQueryData(
            adminQueryKeys.whatsapp.instances(),
            (old: WhatsappInstance[] | undefined) =>
              old?.map((i) => (i.id === updated.id ? updated : i)),
          )
        } catch { /* تجاهل */ }
      }
    }

    checkAll()
    const interval = setInterval(checkAll, STATUS_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isInsideAdmin, instances, queryClient])

  const overallStatus = useMemo(() => {
    if (instances.length === 0) return 'none' as const
    if (instances.every((i) => i.status === 'connected')) return 'connected' as const
    if (instances.some((i) => i.status === 'connecting')) return 'connecting' as const
    return 'disconnected' as const
  }, [instances])

  // ---- التحليل السلوكي ----
  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
  } = useQuery({
    queryKey: ['ai-insights', 'daily_summary'],
    queryFn: () => fetchAIInsights('daily_summary'),
    enabled: isInsideAdmin && showInsights,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  })

  if (!isInsideAdmin || dismissed) return null

  const statusConfig = {
    connected: { dot: 'bg-emerald-500', label: 'واتساب متصل', bg: 'text-emerald-700' },
    connecting: { dot: 'bg-amber-500 animate-pulse', label: 'واتساب: جاري الاتصال', bg: 'text-amber-700' },
    disconnected: { dot: 'bg-rose-500', label: 'واتساب غير متصل', bg: 'text-rose-700' },
    none: { dot: 'bg-slate-400', label: 'لا يوجد واتساب', bg: 'text-slate-600' },
  }[overallStatus]

  return (
    <>
      {/* الشريط السفلي */}
      <div className="pointer-events-none fixed bottom-0 left-0 z-[9998] hidden sm:flex">
        <div className="pointer-events-auto flex items-center gap-0 rounded-tr-lg border border-b-0 border-l-0 border-slate-200 bg-white text-xs font-medium shadow-sm">
          {/* حالة الواتساب */}
          <div className={`flex items-center gap-2 px-3 py-1 ${statusConfig.bg}`}>
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
            )}
            <span>{statusConfig.label}</span>
            {instances.length > 1 && (
              <span className="text-[10px] opacity-60">
                ({instances.filter((i) => i.status === 'connected').length}/{instances.length})
              </span>
            )}
          </div>

          {/* فاصل */}
          <div className="h-4 w-px bg-slate-200" />

          {/* التحليل السلوكي */}
          <button
            type="button"
            onClick={() => setShowInsights(!showInsights)}
            className={`flex items-center gap-1.5 px-3 py-1 transition hover:text-violet-700 ${showInsights ? 'text-violet-700' : 'text-slate-500'}`}
          >
            <Sparkles className="h-3 w-3" />
            <span>التحليل السلوكي</span>
          </button>

          {/* فاصل */}
          <div className="h-4 w-px bg-slate-200" />

          {/* زر الإغلاق */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-tr-lg px-2 py-1 text-slate-400 transition hover:text-slate-700"
            title="إخفاء"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* نافذة التحليل السلوكي */}
      {showInsights && (
        <div className="pointer-events-none fixed inset-0 z-[9999] hidden sm:flex sm:items-center sm:justify-center">
          {/* خلفية شفافة */}
          <div
            className="pointer-events-auto absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowInsights(false)}
          />
          {/* المحتوى */}
          <div className="pointer-events-auto relative mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* الهيدر */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">التحليل السلوكي</h2>
                  <p className="text-[11px] text-slate-400">تحليل شامل للحالة السلوكية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInsights(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* المحتوى مع التمرير */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  <p className="text-sm text-slate-400">جاري تحميل التحليل...</p>
                </div>
              ) : insightsError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <p className="text-sm text-rose-600">تعذر تحميل التحليل</p>
                  <p className="text-xs text-slate-400">تأكد من تفعيل خدمة التحليل الذكي</p>
                </div>
              ) : insightsData?.insights ? (
                <MarkdownContent content={insightsData.insights} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <Sparkles className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">لا يوجد تحليل متاح حالياً</p>
                </div>
              )}
            </div>

            {/* الفوتر */}
            {insightsData && (
              <div className="border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">
                تم التحليل: {new Date(insightsData.generated_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {insightsData.cached && ' (من الذاكرة المؤقتة)'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

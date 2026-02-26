import { useState } from 'react'
import {
  ShieldCheck, MessageCircle, BookOpen, Star, Heart, Award,
  TrendingUp, Zap, Target, Users, RefreshCw, Sparkles, Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTeacherAIAnalysis } from '../hooks'
import { fetchTeacherAIAnalysis } from '../api'
import { teacherProfileKeys } from '../query-keys'
import { useQueryClient } from '@tanstack/react-query'
import type { DateRangeFilter } from '../types'

const ICON_MAP: Record<string, React.ElementType> = {
  'shield-check': ShieldCheck,
  'message-circle': MessageCircle,
  'book-open': BookOpen,
  star: Star,
  heart: Heart,
  award: Award,
  'trending-up': TrendingUp,
  zap: Zap,
  target: Target,
  users: Users,
}

const RATING_COLORS: Record<string, string> = {
  'ممتاز': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'جيد جداً': 'bg-blue-100 text-blue-700 border-blue-200',
  'جيد': 'bg-amber-100 text-amber-700 border-amber-200',
  'يحتاج دعم': 'bg-slate-100 text-slate-700 border-slate-200',
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/50 to-violet-50/50 p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200" />
          <div className="h-5 w-40 rounded bg-slate-200" />
        </div>
        <div className="h-12 w-full rounded-xl bg-slate-200/70" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-20 rounded-xl bg-white/60" />
          <div className="h-20 rounded-xl bg-white/60" />
        </div>
        <div className="h-16 rounded-xl bg-slate-100/50" />
      </div>
    </div>
  )
}

interface AIInsightsCardProps {
  teacherId: number | null
  filters?: DateRangeFilter
  enabled?: boolean
}

export function AIInsightsCard({ teacherId, filters = {}, enabled = true }: AIInsightsCardProps) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const { data, isLoading, error } = useTeacherAIAnalysis(teacherId, filters, { enabled })

  const handleRefresh = async () => {
    if (!teacherId || refreshing) return
    setRefreshing(true)
    try {
      const result = await fetchTeacherAIAnalysis(teacherId, filters, true)
      queryClient.setQueryData(teacherProfileKeys.aiAnalysis(teacherId, filters), result)
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading || !data) return <SkeletonCard />

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm text-slate-500">تعذر تحميل التحليل الذكي</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const ratingClass = RATING_COLORS[data.overall_rating] ?? RATING_COLORS['جيد']

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50/50 to-violet-50/50 p-5 shadow-sm">
      {/* الرأس */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h3 className="text-sm font-bold text-slate-700">تحليل الأداء</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${ratingClass}`}>
            {data.overall_rating}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
            title="تحديث التحليل"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* الملخص التنفيذي */}
      <div className="mb-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700">
        {data.motivational_message}
      </div>

      {/* نقاط القوة */}
      {data.strengths.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Star className="h-3.5 w-3.5" />
            نقاط القوة
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.strengths.map((s, i) => {
              const Icon = ICON_MAP[s.icon] ?? Star
              return (
                <div key={i} className="flex gap-2.5 rounded-xl bg-white/80 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{s.title}</p>
                    <p className="text-[11px] leading-relaxed text-slate-500">{s.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* فرص النمو */}
      {data.recommendations.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <Lightbulb className="h-3.5 w-3.5" />
            توصيات
          </h4>
          <div className="space-y-2">
            {data.recommendations.map((r, i) => (
              <div key={i} className="rounded-xl bg-blue-50/50 p-3">
                <p className="text-xs font-bold text-slate-700">{r.title}</p>
                <p className="text-[11px] leading-relaxed text-slate-500">{r.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* آخر تحديث */}
      <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 text-[10px] text-slate-400">
        <span>
          {data.cached ? 'من الذاكرة المؤقتة' : 'تحليل جديد'}
        </span>
        <span>
          آخر تحديث: {new Date(data.generated_at).toLocaleString('ar-SA', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

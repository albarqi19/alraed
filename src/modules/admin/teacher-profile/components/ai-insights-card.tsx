import { useState } from 'react'
import {
  ShieldCheck, MessageCircle, BookOpen, Star, Heart, Award,
  TrendingUp, Zap, Target, Users, RefreshCw, Sparkles, Lightbulb,
} from 'lucide-react'
import { TONES, ToneChip, WsBtn, type Tone } from '@/shared/workspace'
import { ProfilePanel, toneBg } from './profile-ui'
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

/** نبرة التقييم العام من اللوحة المعتمدة */
const RATING_TONES: Record<string, Tone> = {
  'ممتاز': TONES.green,
  'جيد جداً': TONES.sky,
  'جيد': TONES.amber,
  'يحتاج دعم': TONES.gray,
}

function SkeletonCard() {
  return (
    <ProfilePanel title="تحليل الأداء" icon={Sparkles}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="ws-skeleton" style={{ height: 44, borderRadius: 8 }} />
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="ws-skeleton" style={{ height: 72, borderRadius: 8 }} />
          <div className="ws-skeleton" style={{ height: 72, borderRadius: 8 }} />
        </div>
        <div className="ws-skeleton" style={{ height: 56, borderRadius: 8 }} />
      </div>
    </ProfilePanel>
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
      <ProfilePanel title="تحليل الأداء" icon={Sparkles}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ margin: 0, flex: 1, fontSize: 12.5, color: 'var(--ws-text-2)' }}>تعذر تحميل التحليل الذكي</p>
          <WsBtn size="sm" onClick={handleRefresh}>
            إعادة المحاولة
          </WsBtn>
        </div>
      </ProfilePanel>
    )
  }

  const ratingTone = RATING_TONES[data.overall_rating] ?? TONES.amber

  return (
    <ProfilePanel
      title="تحليل الأداء"
      icon={Sparkles}
      tools={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ToneChip tone={ratingTone}>{data.overall_rating}</ToneChip>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="ws-icon-btn"
            title="تحديث التحليل"
            aria-label="تحديث التحليل"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
          </button>
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* الملخص التنفيذي */}
        <div
          style={{
            borderRadius: 8,
            background: 'var(--ws-surface-2)',
            padding: '9px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.9,
            color: 'var(--ws-text)',
          }}
        >
          {data.motivational_message}
        </div>

        {/* نقاط القوة */}
        {data.strengths.length > 0 && (
          <div>
            <h4
              style={{
                margin: '0 0 7px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                color: TONES.green.tx,
              }}
            >
              <Star style={{ width: 13, height: 13 }} />
              نقاط القوة
            </h4>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {data.strengths.map((s, i) => {
                const Icon = ICON_MAP[s.icon] ?? Star
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 9,
                      padding: '8px 10px',
                      border: '1px solid var(--ws-hairline)',
                      borderRadius: 8,
                      background: 'var(--ws-surface)',
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 7,
                        background: TONES.green.bg,
                      }}
                    >
                      <Icon style={{ width: 15, height: 15, color: TONES.green.tx }} />
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>
                        {s.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, lineHeight: 1.7, color: 'var(--ws-text-2)' }}>
                        {s.description}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* فرص النمو */}
        {data.recommendations.length > 0 && (
          <div>
            <h4
              style={{
                margin: '0 0 7px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                color: TONES.sky.tx,
              }}
            >
              <Lightbulb style={{ width: 13, height: 13 }} />
              توصيات
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.recommendations.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${TONES.sky.bd}`,
                    background: toneBg(TONES.sky),
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>{r.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, lineHeight: 1.7, color: 'var(--ws-text-2)' }}>
                    {r.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* آخر تحديث */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--ws-hairline)',
            paddingTop: 8,
            fontSize: 10,
            color: 'var(--ws-text-2)',
          }}
        >
          <span>{data.cached ? 'من الذاكرة المؤقتة' : 'تحليل جديد'}</span>
          <span>
            آخر تحديث:{' '}
            {new Date(data.generated_at).toLocaleString('ar-SA-u-nu-latn', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </ProfilePanel>
  )
}

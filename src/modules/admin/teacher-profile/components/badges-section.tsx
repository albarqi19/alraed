import { useEffect, useRef } from 'react'
import {
  ShieldCheck, Send, BookOpenCheck, Star,
  HeartHandshake, Award, TrendingUp,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { TONES, type Tone } from '@/shared/workspace'
import { ProfilePanel } from './profile-ui'
import type { TeacherBadge } from '../types'

const ICON_MAP: Record<string, React.ElementType> = {
  'shield-check': ShieldCheck,
  send: Send,
  'book-open-check': BookOpenCheck,
  star: Star,
  'heart-handshake': HeartHandshake,
  award: Award,
  'trending-up': TrendingUp,
}

/** نبرة كل وسام من اللوحة المعتمدة — بدل درجات تايلويند المتناثرة */
const BADGE_TONES: Record<string, Tone> = {
  'shield-check': TONES.green,
  send: TONES.sky,
  'book-open-check': TONES.purple,
  star: TONES.amber,
  'heart-handshake': TONES.red,
  award: TONES.sky,
  'trending-up': TONES.green,
}

function BadgeItem({ badge, index }: { badge: TeacherBadge; index: number }) {
  const Icon = ICON_MAP[badge.icon] ?? Star
  const tone = BADGE_TONES[badge.icon] ?? TONES.amber

  return (
    <div
      className="ws-badge-pop group relative flex flex-col items-center gap-1.5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* الدائرة */}
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300"
        style={
          badge.earned
            ? { background: tone.bg, border: `2px solid ${tone.bd}`, boxShadow: `0 4px 12px ${tone.bd}` }
            : { background: 'var(--ws-surface-2)', border: '1px solid var(--ws-hairline)', opacity: 0.55 }
        }
      >
        <Icon style={{ width: 24, height: 24, color: badge.earned ? tone.tx : 'var(--ws-text-2)' }} />
        {/* شريط التقدم الدائري */}
        {!badge.earned && badge.progress > 0 && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28" cy="28" r="26"
              fill="none"
              stroke="var(--ws-accent)"
              strokeWidth="2"
              strokeDasharray={`${(badge.progress / 100) * 163.36} 163.36`}
            />
          </svg>
        )}
      </div>
      {/* العنوان */}
      <span
        className="max-w-[72px] text-center text-[10px] font-semibold leading-tight"
        style={{ color: badge.earned ? 'var(--ws-text)' : 'var(--ws-text-2)' }}
      >
        {badge.title}
      </span>
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute -top-14 right-1/2 z-10 translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ background: 'var(--ws-text)', color: 'var(--ws-surface)' }}
      >
        {badge.description}
        {!badge.earned && <span className="block opacity-75">{badge.progress}% مكتمل</span>}
      </div>
    </div>
  )
}

interface BadgesSectionProps {
  badges: TeacherBadge[]
  isLoading?: boolean
}

export function BadgesSection({ badges, isLoading }: BadgesSectionProps) {
  const confettiFired = useRef(false)

  useEffect(() => {
    if (confettiFired.current) return
    const newlyEarned = badges.filter(b => b.newly_earned)
    if (newlyEarned.length > 0) {
      confettiFired.current = true
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#2E7D46', '#21689E', '#6D3FA9', '#A8690A'],
      })
    }
  }, [badges])

  if (isLoading) {
    return (
      <ProfilePanel title="أوسمة التميز" icon={Award}>
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="ws-skeleton h-14 w-14 rounded-full" />
              <div className="ws-skeleton h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      </ProfilePanel>
    )
  }

  if (!badges || !badges.length) {
    // لا نخفي المكون بالكامل - نعرض skeleton خفيف بدل الاختفاء المفاجئ
    return null
  }

  const earnedCount = badges.filter(b => b.earned).length

  return (
    <ProfilePanel
      title="أوسمة التميز"
      icon={Award}
      tools={
        <span className="ws-count">
          {earnedCount} / {badges.length}
        </span>
      }
    >
      <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
        {badges.map((badge, i) => (
          <BadgeItem key={badge.id} badge={badge} index={i} />
        ))}
      </div>
    </ProfilePanel>
  )
}

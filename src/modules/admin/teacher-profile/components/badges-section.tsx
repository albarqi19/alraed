import { useEffect, useRef } from 'react'
import {
  ShieldCheck, Send, BookOpenCheck, Star,
  HeartHandshake, Award, TrendingUp,
} from 'lucide-react'
import confetti from 'canvas-confetti'
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

const BADGE_COLORS: Record<string, { bg: string; ring: string; icon: string; glow: string }> = {
  'shield-check': { bg: 'bg-emerald-100', ring: 'ring-emerald-400', icon: 'text-emerald-600', glow: 'shadow-emerald-200' },
  send: { bg: 'bg-sky-100', ring: 'ring-sky-400', icon: 'text-sky-600', glow: 'shadow-sky-200' },
  'book-open-check': { bg: 'bg-violet-100', ring: 'ring-violet-400', icon: 'text-violet-600', glow: 'shadow-violet-200' },
  star: { bg: 'bg-amber-100', ring: 'ring-amber-400', icon: 'text-amber-600', glow: 'shadow-amber-200' },
  'heart-handshake': { bg: 'bg-rose-100', ring: 'ring-rose-400', icon: 'text-rose-600', glow: 'shadow-rose-200' },
  award: { bg: 'bg-blue-100', ring: 'ring-blue-400', icon: 'text-blue-600', glow: 'shadow-blue-200' },
  'trending-up': { bg: 'bg-teal-100', ring: 'ring-teal-400', icon: 'text-teal-600', glow: 'shadow-teal-200' },
}

function BadgeItem({ badge, index }: { badge: TeacherBadge; index: number }) {
  const Icon = ICON_MAP[badge.icon] ?? Star
  const colors = BADGE_COLORS[badge.icon] ?? BADGE_COLORS.star

  return (
    <div
      className="group relative flex flex-col items-center gap-1.5"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* الدائرة */}
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
          badge.earned
            ? `${colors.bg} ring-2 ${colors.ring} shadow-lg ${colors.glow} scale-100`
            : 'bg-slate-100 ring-1 ring-slate-200 opacity-30 scale-95'
        }`}
      >
        <Icon className={`h-6 w-6 ${badge.earned ? colors.icon : 'text-slate-400'}`} />
        {/* شريط التقدم الدائري */}
        {!badge.earned && badge.progress > 0 && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28" cy="28" r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(badge.progress / 100) * 163.36} 163.36`}
              className="text-slate-300"
            />
          </svg>
        )}
      </div>
      {/* العنوان */}
      <span className={`text-[10px] font-semibold leading-tight text-center max-w-[72px] ${
        badge.earned ? 'text-slate-700' : 'text-slate-400'
      }`}>
        {badge.title}
      </span>
      {/* Tooltip */}
      <div className="pointer-events-none absolute -top-14 right-1/2 translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-[10px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-10">
        {badge.description}
        {!badge.earned && <span className="block text-slate-300">{badge.progress}% مكتمل</span>}
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
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
      })
    }
  }, [badges])

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
            <div className="h-14 w-14 rounded-full bg-slate-100" />
            <div className="h-2.5 w-12 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  if (!badges || !badges.length) {
    // لا نخفي المكون بالكامل - نعرض skeleton خفيف بدل الاختفاء المفاجئ
    return null
  }

  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          أوسمة التميز
        </h3>
        <span className="text-xs font-medium text-slate-400">
          {earnedCount} / {badges.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-5 justify-center sm:justify-start">
        {badges.map((badge, i) => (
          <BadgeItem key={badge.id} badge={badge} index={i} />
        ))}
      </div>
    </div>
  )
}

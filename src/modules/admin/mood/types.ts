export type MoodType = 'excited' | 'happy' | 'calm' | 'tired' | 'difficult'

export interface MoodOption {
  key: MoodType
  label: string
  emoji: string
  weight: number
}

export interface MoodDistribution {
  count: number
  percentage: number
  label: string
  emoji: string
}

export interface MoodAnalyticsResponse {
  date: string
  happiness_score: number | null
  total_teachers: number
  participants: number
  participation_rate: number
  distribution: Record<MoodType, MoodDistribution>
  mood_options: MoodOption[]
}

export interface MoodSummaryResponse {
  happiness_score: number | null
  score_change: number | null
  participants: number
  total_teachers: number
  most_common_mood: {
    key: MoodType
    label: string
    emoji: string
  } | null
}

export interface DailyTrendItem {
  date: string
  day_name: string
  happiness_score: number | null
  participants: number
  participation_rate: number
  distribution: Record<MoodType, number>
}

export interface MoodTrendResponse {
  trend: DailyTrendItem[]
  period_days: number
  total_teachers: number
}

// Mood colors for charts
export const MOOD_COLORS: Record<MoodType, string> = {
  excited: '#f97316', // orange-500
  happy: '#10b981', // emerald-500
  calm: '#0ea5e9', // sky-500
  tired: '#f59e0b', // amber-500
  difficult: '#f43f5e', // rose-500
}

export const MOOD_CHART_COLORS = ['#f97316', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e']

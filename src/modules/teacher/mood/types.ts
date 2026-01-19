export type MoodType = 'excited' | 'happy' | 'calm' | 'tired' | 'difficult'

export interface MoodOption {
  key: MoodType
  label: string
  emoji: string
}

export interface TodayMoodResponse {
  has_mood: boolean
  mood?: MoodType
  mood_label?: string
  mood_emoji?: string
  recorded_at?: string
  moods?: MoodOption[]
}

export interface SubmitMoodResponse {
  mood: MoodType
  mood_label: string
  mood_emoji: string
  response_message: string
}

export interface MoodHistoryItem {
  date: string
  mood: MoodType
  mood_label: string
  mood_emoji: string
}

export interface MoodHistoryResponse {
  moods: MoodHistoryItem[]
  total_entries: number
}

// Mood options configuration
export const MOOD_OPTIONS: MoodOption[] = [
  { key: 'excited', emoji: '🚀', label: 'متحمس' },
  { key: 'happy', emoji: '😊', label: 'سعيد/مستقر' },
  { key: 'calm', emoji: '☕', label: 'أحتاج للهدوء' },
  { key: 'tired', emoji: '🥱', label: 'مرهق' },
  { key: 'difficult', emoji: '😟', label: 'يوم صعب' },
]

// Mood colors for styling
export const MOOD_COLORS: Record<MoodType, string> = {
  excited: 'bg-orange-500',
  happy: 'bg-emerald-500',
  calm: 'bg-sky-500',
  tired: 'bg-amber-500',
  difficult: 'bg-rose-500',
}

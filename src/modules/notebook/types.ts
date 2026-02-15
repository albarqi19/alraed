// ========== المفكرة الشخصية ==========
export type NoteCategory = 'meeting_notes' | 'daily_report' | 'student_observation' | 'class_notes' | 'private_todo' | 'general'

export interface PersonalNote {
  id: number
  title: string | null
  content: string
  category: NoteCategory
  student_id: number | null
  tags: string[] | null
  is_pinned: boolean
  is_completed: boolean
  reminder_at: string | null
  created_at: string
  updated_at: string
  student?: { id: number; name: string }
}

export interface NoteFilters {
  category?: NoteCategory | 'all'
  search?: string
}

export interface NoteStatistics {
  total: number
  by_category: Partial<Record<NoteCategory, number>>
  pinned: number
  completed: number
}

export interface CreateNotePayload {
  title?: string
  content: string
  category: NoteCategory
  student_id?: number | null
  tags?: string[]
  reminder_at?: string
}

export interface UpdateNotePayload extends Partial<CreateNotePayload> { }

// ========== الأدلة المدرسية ==========
export type GuideType = 'procedural' | 'organizational'

export interface SchoolGuide {
  id: number
  type: GuideType
  title: string
  description: string | null
  is_active: boolean
  sections_count: number
}

export interface GuideSection {
  id: number
  guide_id: number
  parent_id: number | null
  title: string
  content: string
  sort_order: number
  level: number
  children?: GuideSection[]
  is_bookmarked?: boolean
}

export interface GuideBookmark {
  id: number
  guide_section_id: number
  note: string | null
  section?: GuideSection
}

export interface AskMeRequest {
  question: string
  section_id?: number
}

export interface AskMeHighlight {
  exact_text: string
  comment: string
  section_id?: number
}

export interface AskMeResponse {
  answer: string
  highlights: AskMeHighlight[]
}

// ========== تصنيفات المفكرة ==========
export const NOTE_CATEGORIES: Record<NoteCategory, { label: string; icon: string; color: string }> = {
  meeting_notes: { label: 'محاضر الاجتماعات', icon: '📋', color: 'blue' },
  daily_report: { label: 'التقرير اليومي', icon: '📊', color: 'green' },
  student_observation: { label: 'ملاحظات طلاب', icon: '👁', color: 'purple' },
  class_notes: { label: 'ملاحظات حصة', icon: '📝', color: 'orange' },
  private_todo: { label: 'مهام شخصية', icon: '✅', color: 'yellow' },
  general: { label: 'عام', icon: '📄', color: 'gray' },
}

export const GUIDE_TITLES: Record<GuideType, string> = {
  procedural: 'الدليل الإجرائي',
  organizational: 'الدليل التنظيمي',
}

export const GUIDE_COMING_SOON_MESSAGE = 'قريباً سيتم إضافته بشكل رائع'
export const BLOCKED_GUIDES: GuideType[] = ['procedural', 'organizational']


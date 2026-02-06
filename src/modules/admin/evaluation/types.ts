export interface BehaviorType {
  id: number
  name: string
  icon: string | null
  color: string | null
  category: 'positive' | 'negative'
  requires_grade: boolean
  max_grade: number | null
  grade_type: 'numeric' | 'descriptive' | null
  is_active: boolean
  display_order: number
  is_default: boolean
  created_at?: string
  updated_at?: string
}

export type BehaviorTypeFormValues = Omit<BehaviorType, 'id' | 'created_at' | 'updated_at' | 'is_default'>

export interface BehaviorStat {
  id: number
  name: string
  icon: string | null
  color: string | null
  category: 'positive' | 'negative'
  is_default: boolean
  students_count: number
}

export interface RecentEvaluation {
  id: number
  student_name: string
  class_name: string
  grade_name: string
  teacher_name: string
  evaluation_type: 'behavior' | 'skill'
  behavior_type_name: string | null
  behavior_type_icon: string | null
  behavior_type_color: string | null
  behavior_type_category: 'positive' | 'negative' | null
  subject_skill_name: string | null
  created_at: string
}

export interface ClassBehaviorStat {
  class_name: string
  grade_name: string
  behavior_type_id: number
  behavior_type_name: string
  behavior_type_icon: string | null
  behavior_type_color: string | null
  behavior_type_category: 'positive' | 'negative'
  count: number
}

export interface EvaluationStats {
  behavior_stats: BehaviorStat[]
  total_evaluations: number
  teachers_count: number
  students_count: number
  recent_evaluations: RecentEvaluation[]
  class_stats: ClassBehaviorStat[]
}

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
  is_default?: boolean
}

export interface SubjectSkill {
  id: number
  subject_id: number
  teacher_id: number
  name: string
  category: 'positive' | 'negative'
  requires_grade: boolean
  max_grade: number | null
  grade_type: 'numeric' | 'descriptive' | null
  is_active: boolean
  display_order: number
}

export type DescriptiveGrade = 'ممتاز' | 'جيد جدا' | 'جيد' | 'مقبول' | 'ضعيف'

export const DESCRIPTIVE_GRADES: DescriptiveGrade[] = ['ممتاز', 'جيد جدا', 'جيد', 'مقبول', 'ضعيف']

export interface StudentEvaluation {
  id: number
  student_id: number
  class_session_id: number
  teacher_id: number
  evaluation_date: string
  evaluation_type: 'behavior' | 'skill'
  behavior_type_id: number | null
  subject_skill_id: number | null
  numeric_grade: number | null
  descriptive_grade: string | null
  notes: string | null
  behavior_type?: BehaviorType
  subject_skill?: SubjectSkill
}

export interface SessionEvaluationConfig {
  behavior_types: BehaviorType[]
  subject_skills: SubjectSkill[]
  subject_name: string
}

export interface SaveEvaluationPayload {
  evaluation_type: 'behavior' | 'skill'
  behavior_type_id?: number | null
  subject_skill_id?: number | null
  numeric_grade?: number | null
  descriptive_grade?: string | null
  notes?: string | null
}

export interface BulkEvaluationPayload {
  student_ids: number[]
  evaluation_type: 'behavior' | 'skill'
  behavior_type_id?: number | null
  subject_skill_id?: number | null
  numeric_grade?: number | null
  descriptive_grade?: string | null
  notes?: string | null
}

export interface SubjectSkillFormPayload {
  name: string
  category: 'positive' | 'negative'
  requires_grade?: boolean
  max_grade?: number | null
  grade_type?: 'numeric' | 'descriptive' | null
  display_order?: number
}

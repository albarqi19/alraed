export interface GuidanceAccessSessionResponse {
  session_id: number
  masked_phone: string
  expires_in_minutes: number
}

export interface GuidanceOtpVerificationResponse {
  token: string
  expires_at?: string
}

export interface GuidanceStudentSummary {
  id: number
  name: string
  grade: string
  class_name: string
  parent_name?: string
  parent_phone?: string
  national_id?: string
}

export interface GuidanceCaseAction {
  id: number
  student_case_id: number
  action_type: string
  notes: string | null
  follow_up_at?: string | null
  metadata?: Record<string, unknown> | null
  performed_by_user_id?: number | null
  performed_by?: {
    id: number
    name: string
  } | null
  created_at: string
}

export interface GuidanceCaseDocument {
  id: number
  student_case_id: number
  original_name: string
  file_path: string
  mime_type?: string | null
  file_size: number
  metadata?: {
    description?: string | null
  } | null
  created_at: string
}

export interface GuidanceCaseFollowup {
  id: number
  student_case_id: number
  created_by_user_id?: number | null
  created_by?: {
    id: number
    name: string
  } | null
  scheduled_for: string
  status: 'pending' | 'completed' | 'cancelled'
  title: string
  notes: string | null
  created_at: string
}

export interface GuidanceCaseRecord {
  id: number
  case_number: string
  student_id: number
  student: GuidanceStudentSummary
  opened_by_user_id?: number | null
  opened_by?: {
    id: number
    name: string
  } | null
  assigned_user_id?: number | null
  assigned_to?: {
    id: number
    name: string
  } | null
  category: string
  title: string
  summary?: string | null
  status: 'open' | 'in_progress' | 'on_hold' | 'closed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[] | null
  metadata?: Record<string, unknown> | null
  opened_at: string
  closed_at?: string | null
  last_activity_at?: string | null
  created_at: string
  updated_at: string
  actions?: GuidanceCaseAction[]
  documents?: GuidanceCaseDocument[]
  followups?: GuidanceCaseFollowup[]
}

export interface GuidanceCaseFilters {
  category?: string
  status?: string
  severity?: string
  student_id?: number
  assigned_user_id?: number
  needs_followup?: boolean
  search?: string
  page?: number
  per_page?: number
}

export interface GuidancePaginatedResponse<T> {
  data: T[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export interface GuidanceStatsSummary {
  by_status: Record<string, number>
  by_category: Record<string, number>
  by_severity: Record<string, number>
  open_cases: number
  overdue_followups: number
}

// Treatment Plans Types
export type ProblemType = 'سلوكية' | 'دراسية' | 'نفسية' | 'اجتماعية' | 'صحية' | 'مختلطة'
export type TreatmentPlanStatus = 'draft' | 'active' | 'suspended' | 'completed' | 'cancelled' | 'on_hold'
export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'partially_achieved' | 'not_achieved'
export type InterventionType = 'تعليمية' | 'سلوكية' | 'نفسية' | 'أسرية' | 'جماعية' | 'فردية' | 'إرشادية'

export interface TreatmentIntervention {
  id: number
  treatment_goal_id: number
  intervention_type: InterventionType
  description: string
  applied_by?: string | null
  applied_at?: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentGoal {
  id: number
  treatment_plan_id: number
  goal: string
  measurable_criteria: string
  status: GoalStatus
  created_at: string
  updated_at: string
  interventions?: TreatmentIntervention[]
}

export interface TreatmentFollowup {
  id: number
  treatment_plan_id: number
  title?: string
  notes: string
  type?: string
  student_progress?: string
  observations?: string
  recommendations?: string
  followup_date: string
  next_followup_date?: string | null
  conducted_by_user_id?: number | null
  conducted_by?: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

export interface TreatmentEvaluation {
  id: number
  treatment_plan_id: number
  evaluation_type?: string
  evaluation?: string
  evaluation_date: string
  overall_effectiveness?: string
  overall_progress_percentage?: number
  key_findings?: string
  student_strengths?: string
  areas_for_improvement?: string
  recommendations?: string
  decision?: string
  decision_notes?: string
  next_evaluation_date?: string | null
  conducted_by_user_id?: number | null
  conducted_by?: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

export interface TreatmentPlan {
  id: number
  student_id: number
  student?: GuidanceStudentSummary
  problem_type: ProblemType
  problem_description: string
  start_date: string
  end_date?: string | null
  status: TreatmentPlanStatus
  created_at: string
  updated_at: string
  goals?: TreatmentGoal[]
  followups?: TreatmentFollowup[]
  evaluations?: TreatmentEvaluation[]
}

export interface TreatmentPlanFormData {
  student_id: number
  problem_type: ProblemType
  problem_description: string
  start_date: string
  end_date?: string | null
  goals?: {
    goal: string
    measurable_criteria: string
    interventions?: {
      intervention_type: InterventionType
      description: string
    }[]
  }[]
}

export interface TreatmentGoalFormData {
  goal: string
  measurable_criteria: string
  interventions?: {
    intervention_type: InterventionType
    description: string
  }[]
}

export interface TreatmentFollowupFormData {
  notes: string
  followup_date: string
  type?: string
  student_progress?: string
  observations?: string
  recommendations?: string
  next_followup_date?: string
}

export interface TreatmentEvaluationFormData {
  evaluation_type?: string
  evaluation?: string
  evaluation_date: string
  overall_effectiveness?: string
  overall_progress_percentage?: number
  key_findings?: string
  student_strengths?: string
  areas_for_improvement?: string
  recommendations?: string
  decision?: string
  decision_notes?: string
  next_evaluation_date?: string
}

export interface TreatmentPlanFilters {
  problem_type?: ProblemType
  status?: TreatmentPlanStatus
  student_id?: number
  search?: string
  page?: number
  per_page?: number
}

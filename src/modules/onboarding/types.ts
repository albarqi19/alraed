export type OnboardingStepKey =
  | 'welcome'
  | 'students'
  | 'whatsapp'
  | 'schedule'
  | 'teachers'
  | 'extension'
  | 'import_schedule'
  | 'complete'

export interface OnboardingStep {
  key: OnboardingStepKey
  title: string
  description: string
  icon: string
  is_completed: boolean
  completed_at: string | null
  metadata: Record<string, unknown> | null
}

export interface OnboardingStats {
  students_count: number
  teachers_count: number
  schedules_count: number
  whatsapp_status: string
  whatsapp_connected: boolean
  has_attendance_settings: boolean
  work_start_time: string | null
  work_end_time: string | null
}

export interface OnboardingStatus {
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  current_step: OnboardingStepKey
  current_step_index: number
  progress: number
  steps: OnboardingStep[]
  stats: OnboardingStats
}

export interface CompleteStepResponse {
  completed_step: OnboardingStepKey
  next_step: OnboardingStepKey | null
  onboarding_completed: boolean
  progress: number
}

export interface StepComponentProps {
  onComplete: (metadata?: Record<string, unknown>) => void
  onSkip: () => void
  stats: OnboardingStats
  isCompleting: boolean
  isSkipping: boolean
}

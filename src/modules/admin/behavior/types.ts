export type BehaviorDegree = 1 | 2 | 3 | 4

export type BehaviorStatus = 'قيد المعالجة' | 'جاري التنفيذ' | 'مكتملة' | 'ملغاة'

export interface BehaviorStudent {
  id: string
  name: string
  studentId: string
  grade: string
  class: string
  violationsCount: number
  behaviorScore: number
}

export interface BehaviorReporter {
  id: number
  name: string
}

export interface BehaviorProcedureDefinition {
  step: number
  title: string
  description: string
  mandatory: boolean
  tasks?: BehaviorProcedureTaskDefinition[]
}

export interface BehaviorProcedureTaskDefinition {
  id: number
  title: string
  mandatory: boolean
  actionType?: 'counselor_referral' | 'guardian_invitation'
}

export interface BehaviorProcedureTaskExecution extends BehaviorProcedureTaskDefinition {
  completed: boolean
  completedDate?: string | null
}

export interface BehaviorProcedureExecution extends BehaviorProcedureDefinition {
  completed: boolean
  completedDate?: string
  notes?: string
  tasks: BehaviorProcedureTaskExecution[]
}

export interface BehaviorViolation {
  id: string
  code?: string
  studentId: string
  studentName: string
  studentNumber: string
  grade: string
  class: string
  degree: BehaviorDegree
  type: string
  description: string
  location: string
  date: string
  time: string | null
  reportedBy: string
  reportedById?: number | null
  status: BehaviorStatus
  procedures: BehaviorProcedureExecution[]
  createdAt?: string
  updatedAt?: string
}

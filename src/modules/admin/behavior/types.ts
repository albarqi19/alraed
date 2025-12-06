export type BehaviorDegree = 1 | 2 | 3 | 4

export type BehaviorStatus = 'قيد المعالجة' | 'جاري التنفيذ' | 'مكتملة' | 'ملغاة'

// الأدوار المسؤولة
export type BehaviorRole = 'teacher' | 'admin' | 'counselor' | 'committee' | 'education_dept' | 'student'

// فئات الإجراءات
export type BehaviorActionCategory = 
  | 'warning' 
  | 'documentation' 
  | 'notification' 
  | 'deduction' 
  | 'referral' 
  | 'invitation' 
  | 'meeting' 
  | 'transfer' 
  | 'escalation' 
  | 'repair' 
  | 'plan' 
  | 'apology'

// System Triggers للأتمتة
export type BehaviorSystemTrigger =
  | 'log_verbal_warning'
  | 'log_second_warning'
  | 'create_counseling_note'
  | 'log_violation_record'
  | 'trigger_parent_call'
  | 'trigger_parent_sms'
  | 'trigger_parent_whatsapp'
  | 'deduct_score_1'
  | 'deduct_score_2'
  | 'deduct_score_3'
  | 'deduct_score_10'
  | 'refer_to_counselor'
  | 'invite_parent_meeting'
  | 'invite_parent_pledge'
  | 'invite_parent_final_warning'
  | 'refer_to_committee'
  | 'committee_meeting'
  | 'transfer_class'
  | 'escalate_to_ed_dept'
  | 'transfer_school'
  | 'confiscate_or_repair'
  | 'log_reparation'
  | 'create_behavior_plan'
  | 'notify_authorities'

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
  id?: number
  step: number
  repetition?: number
  title: string
  description: string
  category?: string
  mandatory: boolean
  tasks?: BehaviorProcedureTaskDefinition[]
}

export interface BehaviorProcedureTaskDefinition {
  id: number
  title: string
  mandatory: boolean
  role?: BehaviorRole
  roleLabel?: string
  actionCategory?: BehaviorActionCategory
  actionCategoryLabel?: string
  actionType?: string
  systemTrigger?: BehaviorSystemTrigger | null
  systemTriggerLabel?: string | null
  notificationTemplate?: string | null
  pointsToDeduct?: number | null
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

// بيانات نوع المخالفة من قاعدة البيانات
export interface BehaviorViolationTypeConfig {
  id: number
  name: string
  description?: string | null
  hasRepetition: boolean
  maxRepetitions: number
}

// بيانات الدرجة من قاعدة البيانات
export interface BehaviorDegreeConfig {
  degree: BehaviorDegree
  degreeName: string
  category: string
  color: string
  violations: BehaviorViolationTypeConfig[]
}

// بيانات الإجراءات من قاعدة البيانات
export interface BehaviorProcedureConfig {
  degree: BehaviorDegree
  degreeName: string
  category: string
  procedures: BehaviorProcedureDefinition[]
}

// إعدادات المخالفات السلوكية الكاملة
export interface BehaviorConfig {
  statuses: BehaviorStatus[]
  roles: Record<BehaviorRole, string>
  actionCategories: Record<BehaviorActionCategory, string>
  systemTriggers: Record<string, string>
  notificationTemplates: Record<string, string>
  settings: {
    autoNotifyParent: boolean
    autoDeductPoints: boolean
    requireCounselorApproval: boolean
    maxViolationsBeforeReview: number
    allowPointCompensation: boolean
    notificationChannels: string[]
  }
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

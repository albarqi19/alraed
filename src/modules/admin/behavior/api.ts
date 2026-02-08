import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  BehaviorConfig,
  BehaviorDegree,
  BehaviorDegreeConfig,
  BehaviorProcedureConfig,
  BehaviorProcedureDefinition,
  BehaviorReporter,
  BehaviorStatus,
  BehaviorStudent,
  BehaviorViolation,
} from './types'

export interface FetchBehaviorViolationsParams {
  status?: BehaviorStatus
  degree?: BehaviorDegree
  search?: string
}

export interface CreateBehaviorViolationPayload {
  studentIds: number[]
  degree: BehaviorDegree
  type: string
  description?: string
  location?: string
  date: string
  time: string
  reportedById?: number
  reportedByName?: string
}

export async function fetchBehaviorStudents(search?: string): Promise<BehaviorStudent[]> {
  const params = new URLSearchParams()
  if (search && search.trim().length > 0) {
    params.set('search', search.trim())
  }

  const response = await apiClient.get<ApiResponse<BehaviorStudent[]>>('/admin/behavior/students', {
    params,
  })

  return response.data.data
}

export async function fetchBehaviorReporters(): Promise<BehaviorReporter[]> {
  const response = await apiClient.get<ApiResponse<BehaviorReporter[]>>('/admin/behavior/reporters')
  return response.data.data
}

export async function fetchBehaviorViolations(
  params?: FetchBehaviorViolationsParams,
): Promise<BehaviorViolation[]> {
  const searchParams = new URLSearchParams()

  if (params?.status) {
    searchParams.set('status', params.status)
  }

  if (params?.degree) {
    searchParams.set('degree', String(params.degree))
  }

  if (params?.search && params.search.trim().length > 0) {
    searchParams.set('search', params.search.trim())
  }

  const response = await apiClient.get<ApiResponse<BehaviorViolation[]>>('/admin/behavior/violations', {
    params: searchParams,
  })

  return response.data.data
}

export async function fetchBehaviorViolation(id: string): Promise<BehaviorViolation> {
  const response = await apiClient.get<ApiResponse<BehaviorViolation>>(`/admin/behavior/violations/${id}`)
  return response.data.data
}

export async function createBehaviorViolations(
  payload: CreateBehaviorViolationPayload,
): Promise<BehaviorViolation[]> {
  const response = await apiClient.post<ApiResponse<BehaviorViolation[]>>('/admin/behavior/violations', {
    student_ids: payload.studentIds,
    degree: payload.degree,
    type: payload.type,
    description: payload.description,
    location: payload.location,
    date: payload.date,
    time: payload.time,
    reported_by_id: payload.reportedById,
    reported_by_name: payload.reportedByName,
  })

  return response.data.data
}

export async function deleteBehaviorViolation(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<BehaviorViolation | null>>(
    `/admin/behavior/violations/${id}`,
  )
}

export async function toggleBehaviorProcedure(
  violationId: string,
  step: number,
): Promise<BehaviorViolation> {
  const response = await apiClient.post<ApiResponse<BehaviorViolation>>(
    `/admin/behavior/violations/${violationId}/procedures/${step}/toggle`,
  )

  return response.data.data
}

export async function toggleBehaviorProcedureTask(
  violationId: string,
  step: number,
  taskId: number,
): Promise<BehaviorViolation> {
  const response = await apiClient.post<ApiResponse<BehaviorViolation>>(
    `/admin/behavior/violations/${violationId}/procedures/${step}/tasks/${taskId}/toggle`,
  )

  return response.data.data
}

export async function updateBehaviorProcedureNotes(
  violationId: string,
  step: number,
  notes: string,
): Promise<BehaviorViolation> {
  const response = await apiClient.post<ApiResponse<BehaviorViolation>>(
    `/admin/behavior/violations/${violationId}/procedures/${step}/notes`,
    {
      notes,
    },
  )

  return response.data.data
}

// ==================== Analytics Filter Types ====================

export interface AnalyticsFilterParams {
  start_date?: string
  end_date?: string
  grade?: string
  class_name?: string
  degree?: number
  period?: 'week' | 'month' | 'semester' | 'year'
}

export interface AlertItem {
  type: 'success' | 'info' | 'warning' | 'danger'
  title: string
  description: string
}

export interface BehaviorAnalytics {
  summary: {
    totalViolations: number
    avgScore: number
    improvementRate: number
    committedStudents: number
    totalStudents: number
    studentsWithViolations: number
  }
  monthlyTrend: {
    name: string
    violations: number
    score: number
  }[]
  violationTypes: {
    name: string
    value: number
  }[]
  gradeDistribution: {
    name: string
    count: number
  }[]
  degreeDistribution: {
    degree: number
    count: number
    label: string
    color: string
  }[]
  timePatterns: {
    weekday: { day: string; count: number }[]
    hourly: { hour: number; label: string; count: number }[]
  }
  procedureCompletion: {
    total: number
    completed: number
    inProgress: number
    pending: number
    completionRate: number
  }
  reporterDistribution: {
    name: string
    count: number
  }[]
  classComparison: {
    grade: string
    className: string
    violationCount: number
  }[]
  alerts: AlertItem[]
  recommendations: AlertItem[]
}

export async function fetchBehaviorAnalytics(filters?: AnalyticsFilterParams): Promise<BehaviorAnalytics> {
  const params = new URLSearchParams()
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.grade) params.set('grade', filters.grade)
  if (filters?.class_name) params.set('class_name', filters.class_name)
  if (filters?.degree) params.set('degree', String(filters.degree))
  if (filters?.period) params.set('period', filters.period)

  const response = await apiClient.get<ApiResponse<BehaviorAnalytics>>('/admin/behavior/stats', { params })
  return response.data.data
}

// ==================== Evaluation Analytics ====================

export interface EvaluationAnalytics {
  summary: {
    total: number
    positive: number
    negative: number
    positiveRate: number
  }
  topBehaviors: {
    name: string
    category: string
    color: string
    count: number
  }[]
  dailyTrend: {
    date: string
    positive: number
    negative: number
  }[]
  teacherParticipation: {
    name: string
    evaluation_count: number
  }[]
}

export async function fetchEvaluationAnalytics(filters?: AnalyticsFilterParams): Promise<EvaluationAnalytics> {
  const params = new URLSearchParams()
  if (filters?.start_date) params.set('start_date', filters.start_date)
  if (filters?.end_date) params.set('end_date', filters.end_date)
  if (filters?.grade) params.set('grade', filters.grade)
  if (filters?.class_name) params.set('class_name', filters.class_name)

  const response = await apiClient.get<ApiResponse<EvaluationAnalytics>>('/admin/behavior/analytics/evaluations', { params })
  return response.data.data
}

// ==================== Student Risk Analytics ====================

export interface StudentRiskData {
  id: number
  name: string
  grade: string
  className: string
  violationCount: number
  severeCount: number
  lateCount: number
  negativeEvalCount: number
  positiveEvalCount: number
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  behaviorScore: number
  trend: 'improving' | 'declining' | 'stable'
  hasTreatmentPlan: boolean
  recentViolations: {
    id: string
    type: string
    degree: number
    date: string
    status: string
  }[]
}

export interface StudentRiskAnalytics {
  riskSummary: {
    critical: number
    high: number
    medium: number
    low: number
  }
  students: StudentRiskData[]
  total: number
}

export async function fetchStudentRiskAnalytics(
  filters?: AnalyticsFilterParams & { risk_level?: string; search?: string },
): Promise<StudentRiskAnalytics> {
  const params = new URLSearchParams()
  if (filters?.grade) params.set('grade', filters.grade)
  if (filters?.class_name) params.set('class_name', filters.class_name)
  if (filters?.risk_level) params.set('risk_level', filters.risk_level)
  if (filters?.search) params.set('search', filters.search)

  const response = await apiClient.get<ApiResponse<StudentRiskAnalytics>>('/admin/behavior/analytics/students', { params })
  return response.data.data
}

// ==================== Treatment Effectiveness ====================

export interface TreatmentEffectivenessData {
  summary: {
    totalPlans: number
    activePlans: number
    completedPlans: number
    successRate: number
  }
  beforeAfter: {
    planId: number
    studentName: string
    before: number
    after: number
    improved: boolean
  }[]
  plansByStatus: { status: string; count: number }[]
  plansByPriority: { priority: string; count: number }[]
}

export async function fetchTreatmentEffectiveness(
  filters?: AnalyticsFilterParams,
): Promise<TreatmentEffectivenessData> {
  const params = new URLSearchParams()
  if (filters?.grade) params.set('grade', filters.grade)
  if (filters?.class_name) params.set('class_name', filters.class_name)

  const response = await apiClient.get<ApiResponse<TreatmentEffectivenessData>>('/admin/behavior/analytics/treatment-effectiveness', { params })
  return response.data.data
}

// ==================== Attendance Correlation ====================

export interface AttendanceCorrelationData {
  scatterData: {
    name: string
    grade: string
    absenceRate: number
    violations: number
    lateCount: number
  }[]
  correlation: number
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none'
  highRiskStudents: {
    name: string
    grade: string
    absenceRate: number
    violations: number
    lateCount: number
  }[]
}

export async function fetchAttendanceCorrelation(
  filters?: AnalyticsFilterParams,
): Promise<AttendanceCorrelationData> {
  const params = new URLSearchParams()
  if (filters?.grade) params.set('grade', filters.grade)
  if (filters?.class_name) params.set('class_name', filters.class_name)

  const response = await apiClient.get<ApiResponse<AttendanceCorrelationData>>('/admin/behavior/analytics/attendance-correlation', { params })
  return response.data.data
}

// ==================== Available Filters ====================

export interface AvailableFilters {
  grades: string[]
  classNames: string[]
}

export async function fetchAvailableFilters(grade?: string): Promise<AvailableFilters> {
  const params = new URLSearchParams()
  if (grade) params.set('grade', grade)

  const response = await apiClient.get<ApiResponse<AvailableFilters>>('/admin/behavior/analytics/filters', { params })
  return response.data.data
}

// ==================== AI Analytics ====================

export interface AIInsightsData {
  insights: string
  generated_at: string
  expires_at: string
  cached: boolean
}

export async function fetchAIInsights(
  insightType: 'daily_summary' | 'alerts' | 'student_profile',
  studentId?: number,
  forceRefresh?: boolean,
): Promise<AIInsightsData> {
  const response = await apiClient.post<ApiResponse<AIInsightsData>>('/admin/behavior/analytics/ai/insights', {
    insight_type: insightType,
    student_id: studentId,
    force_refresh: forceRefresh ?? false,
  })
  return response.data.data
}

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AITreatmentPlanData {
  title: string
  problem_type: string
  problem_description: string
  diagnosis?: string
  root_causes?: string
  priority: string
  duration_weeks: number
  goals: Array<{
    title: string
    description?: string
    success_criteria?: string
    priority?: number
  }>
  student_id?: number
  student_name?: string
  student_grade?: string
  student_class?: string
}

export interface AIChatResponse {
  response: string
  session_id: string
  treatment_plan?: AITreatmentPlanData
  sources: {
    violations: number
    evaluations: number
    referrals: number
    treatment_plans: number
  }
}

export async function sendAIChat(message: string, sessionId?: string): Promise<AIChatResponse> {
  const response = await apiClient.post<ApiResponse<AIChatResponse>>('/admin/behavior/analytics/ai/chat', {
    message,
    session_id: sessionId,
  })
  return response.data.data
}

export interface AICreatePlanResponse {
  plan_id: number
  plan_number: string
  message: string
}

export async function createPlanFromAI(planData: AITreatmentPlanData): Promise<AICreatePlanResponse> {
  const response = await apiClient.post<ApiResponse<AICreatePlanResponse>>(
    '/admin/behavior/analytics/ai/create-plan',
    planData,
  )
  return response.data.data
}

export interface AISimulationResult {
  analysis: string
  similar_cases_count: number
  predicted_success_rate: number
  recommendation: string
}

export async function simulateIntervention(
  studentId: number,
  interventionType: string,
): Promise<AISimulationResult> {
  const response = await apiClient.post<ApiResponse<AISimulationResult>>('/admin/behavior/analytics/ai/simulate', {
    student_id: studentId,
    intervention_type: interventionType,
  })
  return response.data.data
}

export interface AIStudentProfile {
  summary: string
  patterns: string[]
  risk_factors: string[]
  recommendations: string[]
  predicted_trajectory: string
  generated_at: string
}

export interface AssistantAction {
  action_id: string
  type: string
  label: string
  description?: string
  params: Record<string, unknown>
  variant: 'success' | 'danger' | 'warning' | 'info'
}

export interface AssistantChatResponse {
  response: string
  session_id: string
  actions?: AssistantAction[]
}

export async function sendAssistantChat(
  message: string,
  sessionId?: string,
): Promise<AssistantChatResponse> {
  const response = await apiClient.post<ApiResponse<AssistantChatResponse>>(
    '/admin/behavior/analytics/ai/assistant-chat',
    {
      message,
      session_id: sessionId,
    },
  )
  return response.data.data
}

export interface ExecuteActionResponse {
  success: boolean
  message: string
}

export async function executeAssistantAction(request: {
  action_id: string
  action_type: string
  params: Record<string, unknown>
  session_id: string
}): Promise<ExecuteActionResponse> {
  const response = await apiClient.post<ApiResponse<ExecuteActionResponse>>(
    '/admin/behavior/analytics/ai/execute-action',
    request,
  )
  return response.data.data
}

export async function fetchAIStudentProfile(studentId: number): Promise<AIStudentProfile> {
  const response = await apiClient.get<ApiResponse<AIStudentProfile>>(`/admin/behavior/analytics/ai/student-profile/${studentId}`)
  return response.data.data
}

// ==================== Config APIs ====================

/**
 * جلب جميع إعدادات المخالفات السلوكية
 */
export async function fetchBehaviorConfig(): Promise<BehaviorConfig> {
  const response = await apiClient.get<ApiResponse<BehaviorConfig>>('/admin/behavior/config')
  return response.data.data
}

/**
 * جلب أنواع المخالفات حسب الدرجة
 */
export async function fetchViolationTypes(
  stage?: string,
  degree?: BehaviorDegree,
): Promise<BehaviorDegreeConfig[]> {
  const params = new URLSearchParams()
  if (stage) params.set('stage', stage)
  if (degree) params.set('degree', String(degree))

  const response = await apiClient.get<ApiResponse<BehaviorDegreeConfig[]>>(
    '/admin/behavior/config/violation-types',
    { params },
  )
  return response.data.data
}

/**
 * جلب الإجراءات والمهام حسب الدرجة والتكرار
 */
export async function fetchProcedures(
  stage?: string,
  degree?: BehaviorDegree,
  repetition?: number,
): Promise<BehaviorProcedureConfig[]> {
  const params = new URLSearchParams()
  if (stage) params.set('stage', stage)
  if (degree) params.set('degree', String(degree))
  if (repetition) params.set('repetition', String(repetition))

  const response = await apiClient.get<ApiResponse<BehaviorProcedureConfig[]>>(
    '/admin/behavior/config/procedures',
    { params },
  )
  return response.data.data
}

/**
 * جلب إجراءات لمخالفة معينة بناءً على الدرجة والتكرار
 */
export async function fetchProceduresForViolation(
  degree: BehaviorDegree,
  repetition: number,
  stage?: string,
): Promise<BehaviorProcedureDefinition> {
  const params = new URLSearchParams()
  params.set('degree', String(degree))
  params.set('repetition', String(repetition))
  if (stage) params.set('stage', stage)

  const response = await apiClient.get<ApiResponse<BehaviorProcedureDefinition>>(
    '/admin/behavior/config/procedures-for-violation',
    { params },
  )
  return response.data.data
}

/**
 * جلب الأدوار المسؤولة
 */
export async function fetchRoles(): Promise<Record<string, string>> {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>(
    '/admin/behavior/config/roles',
  )
  return response.data.data
}

/**
 * جلب System Triggers
 */
export async function fetchSystemTriggers(): Promise<Record<string, string>> {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>(
    '/admin/behavior/config/system-triggers',
  )
  return response.data.data
}

/**
 * جلب فئات الإجراءات
 */
export async function fetchActionCategories(): Promise<Record<string, string>> {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>(
    '/admin/behavior/config/action-categories',
  )
  return response.data.data
}

/**
 * جلب قوالب الرسائل
 */
export async function fetchNotificationTemplates(): Promise<Record<string, string>> {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>(
    '/admin/behavior/config/notification-templates',
  )
  return response.data.data
}

// ==================== Automation APIs ====================

export interface ExecuteAutomationPayload {
  violationId: string
  procedureStep: number
  taskId: number
  systemTrigger: string
}

export interface AutomationResult {
  success: boolean
  message: string
  details?: {
    type: string
    action: string
    timestamp: string
    data?: Record<string, unknown>
  }
}

/**
 * تنفيذ أتمتة معينة (إرسال رسالة، حسم نقاط، إلخ)
 */
export async function executeAutomation(
  payload: ExecuteAutomationPayload,
): Promise<AutomationResult> {
  const response = await apiClient.post<ApiResponse<AutomationResult>>(
    `/admin/behavior/violations/${payload.violationId}/automation`,
    {
      procedure_step: payload.procedureStep,
      task_id: payload.taskId,
      system_trigger: payload.systemTrigger,
    },
  )
  return response.data.data
}

/**
 * تنفيذ جميع الأتمتات لمهمة معينة
 */
export async function executeAllTaskAutomations(
  violationId: string,
  procedureStep: number,
  taskId: number,
): Promise<AutomationResult[]> {
  const response = await apiClient.post<ApiResponse<AutomationResult[]>>(
    `/admin/behavior/violations/${violationId}/procedures/${procedureStep}/tasks/${taskId}/execute-automations`,
  )
  return response.data.data
}
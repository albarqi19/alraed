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

export interface BehaviorAnalytics {
  summary: {
    totalViolations: number
    avgScore: number
    improvementRate: number
    committedStudents: number
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
  alerts: {
    type: 'success' | 'info' | 'warning' | 'danger'
    title: string
    description: string
  }[]
  recommendations: {
    type: 'success' | 'info' | 'warning' | 'danger'
    title: string
    description: string
  }[]
  hasActiveProgram: boolean
}

export async function fetchBehaviorAnalytics(): Promise<BehaviorAnalytics> {
  const response = await apiClient.get<ApiResponse<BehaviorAnalytics>>('/admin/behavior/stats')
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
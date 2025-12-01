import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  BehaviorDegree,
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
}

export async function fetchBehaviorAnalytics(): Promise<BehaviorAnalytics> {
  const response = await apiClient.get<ApiResponse<BehaviorAnalytics>>('/admin/behavior/stats')
  return response.data.data
}

import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type {
  TeacherPointConfigPayload,
  TeacherPointSummary,
  TeacherPointTransaction,
  TeacherPointTransactionPayload,
} from './types'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

type TeacherPointConfigResponse = ApiEnvelope<TeacherPointConfigPayload>

type TeacherPointSummaryResponse = ApiEnvelope<TeacherPointSummary>

type TeacherPointTransactionResponse = ApiEnvelope<{
  transaction: TeacherPointTransaction
  summary: TeacherPointSummary
}>

function ensureSuccess<T>(response: ApiEnvelope<T>, fallbackMessage: string): T {
  if (!response.success || !response.data) {
    throw new Error(response.message ?? fallbackMessage)
  }

  return response.data
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && error.response?.data) {
    const payload = error.response.data as ApiEnvelope<unknown>
    if (payload?.message) {
      return payload.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export async function fetchTeacherPointConfig(): Promise<TeacherPointConfigPayload> {
  try {
    const { data } = await apiClient.get<TeacherPointConfigResponse>('/teacher/points/config')
    return ensureSuccess(data, 'تعذر تحميل إعدادات نقاطي')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل إعدادات نقاطي'))
  }
}

export async function fetchTeacherPointSummary(): Promise<TeacherPointSummary> {
  try {
    const { data } = await apiClient.get<TeacherPointSummaryResponse>('/teacher/points/today')
    return ensureSuccess(data, 'تعذر تحميل ملخص اليوم')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل ملخص اليوم'))
  }
}

export async function createTeacherPointTransaction(
  payload: TeacherPointTransactionPayload,
): Promise<{ transaction: TeacherPointTransaction; summary: TeacherPointSummary }> {
  try {
    const { data } = await apiClient.post<TeacherPointTransactionResponse>('/teacher/points/transactions', payload)
    return ensureSuccess<{ transaction: TeacherPointTransaction; summary: TeacherPointSummary }>(
      data,
      'تعذر حفظ العملية',
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر حفظ العملية'))
  }
}

export async function undoTeacherPointTransaction(transactionId: number): Promise<TeacherPointTransaction> {
  try {
    const { data } = await apiClient.post<TeacherPointTransactionResponse>(
      `/teacher/points/transactions/${transactionId}/undo`,
    )
    const result = ensureSuccess<{ transaction: TeacherPointTransaction; summary: TeacherPointSummary }>(
      data,
      'تعذر إلغاء العملية',
    )
    return result.transaction
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر إلغاء العملية'))
  }
}

import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type { MoodType, SubmitMoodResponse, TodayMoodResponse, MoodHistoryResponse } from './types'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  message?: string
}

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

/**
 * Check if the teacher has already submitted a mood today
 */
export async function fetchTodayMood(): Promise<TodayMoodResponse> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<TodayMoodResponse>>('/teacher/mood/today')
    return ensureSuccess(data, 'تعذر التحقق من حالة المزاج')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر التحقق من حالة المزاج'))
  }
}

/**
 * Submit the teacher's mood for today
 */
export async function submitMood(mood: MoodType): Promise<SubmitMoodResponse> {
  try {
    const { data } = await apiClient.post<ApiEnvelope<SubmitMoodResponse>>('/teacher/mood', { mood })
    return ensureSuccess(data, 'تعذر تسجيل الحالة المزاجية')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تسجيل الحالة المزاجية'))
  }
}

/**
 * Get the teacher's mood history
 */
export async function fetchMoodHistory(days: number = 30): Promise<MoodHistoryResponse> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<MoodHistoryResponse>>('/teacher/mood/history', {
      params: { days },
    })
    return ensureSuccess(data, 'تعذر تحميل سجل المزاج')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل سجل المزاج'))
  }
}

import { isAxiosError } from 'axios'
import { apiClient } from '@/services/api/client'
import type { MoodAnalyticsResponse, MoodSummaryResponse, MoodTrendResponse } from './types'

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
 * Fetch mood analytics overview
 */
export async function fetchMoodAnalytics(date?: string): Promise<MoodAnalyticsResponse> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<MoodAnalyticsResponse>>('/admin/mood-analytics', {
      params: date ? { date } : undefined,
    })
    return ensureSuccess(data, 'تعذر تحميل إحصائيات المزاج')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل إحصائيات المزاج'))
  }
}

/**
 * Fetch mood summary
 */
export async function fetchMoodSummary(): Promise<MoodSummaryResponse> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<MoodSummaryResponse>>('/admin/mood-analytics/summary')
    return ensureSuccess(data, 'تعذر تحميل ملخص المزاج')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل ملخص المزاج'))
  }
}

/**
 * Fetch mood trend
 */
export async function fetchMoodTrend(days: number = 7): Promise<MoodTrendResponse> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<MoodTrendResponse>>('/admin/mood-analytics/trend', {
      params: { days },
    })
    return ensureSuccess(data, 'تعذر تحميل اتجاهات المزاج')
  } catch (error) {
    throw new Error(getErrorMessage(error, 'تعذر تحميل اتجاهات المزاج'))
  }
}

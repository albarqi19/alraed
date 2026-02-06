import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type { BehaviorType, BehaviorTypeFormValues, EvaluationStats } from './types'

function unwrapResponse<T>(data: ApiResponse<T>, errorMessage: string): T {
  if (!data.success) throw new Error(data.message ?? errorMessage)
  return data.data as T
}

export async function fetchBehaviorTypes(): Promise<BehaviorType[]> {
  const { data } = await apiClient.get<ApiResponse<BehaviorType[]>>('/admin/behavior-types')
  return unwrapResponse(data, 'تعذر تحميل أنماط السلوك')
}

export async function createBehaviorType(payload: Partial<BehaviorTypeFormValues>): Promise<BehaviorType> {
  const { data } = await apiClient.post<ApiResponse<BehaviorType>>('/admin/behavior-types', payload)
  return unwrapResponse(data, 'تعذر إنشاء نمط السلوك')
}

export async function updateBehaviorType(id: number, payload: Partial<BehaviorTypeFormValues>): Promise<BehaviorType> {
  const { data } = await apiClient.put<ApiResponse<BehaviorType>>(`/admin/behavior-types/${id}`, payload)
  return unwrapResponse(data, 'تعذر تحديث نمط السلوك')
}

export async function deleteBehaviorType(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/behavior-types/${id}`)
  unwrapResponse(data, 'تعذر حذف نمط السلوك')
}

export async function reorderBehaviorTypes(orderedIds: number[]): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>('/admin/behavior-types/reorder', { ordered_ids: orderedIds })
  unwrapResponse(data, 'تعذر إعادة ترتيب أنماط السلوك')
}

export async function fetchEvaluationStats(): Promise<EvaluationStats> {
  const { data } = await apiClient.get<ApiResponse<EvaluationStats>>('/admin/evaluation-stats')
  return unwrapResponse(data, 'تعذر تحميل إحصائيات التقييم')
}

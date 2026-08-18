import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  BiometricDevice,
  BiometricPunch,
  BiometricPunchFilters,
  BiometricStats,
  ClaimDevicePayload,
} from './types'

export async function fetchBiometricDevices(): Promise<BiometricDevice[]> {
  const { data } = await apiClient.get<ApiResponse<BiometricDevice[]>>('/admin/biometric/devices')
  return data.data
}

/** المطالبةُ بجهازٍ برقمه التسلسلي — تعمل قبل اتّصاله وبعده. */
export async function claimBiometricDevice(payload: ClaimDevicePayload): Promise<BiometricDevice> {
  const { data } = await apiClient.post<ApiResponse<BiometricDevice>>('/admin/biometric/devices', payload)
  return data.data
}

export async function updateBiometricDevice(
  id: number,
  payload: Partial<Pick<BiometricDevice, 'name' | 'status' | 'notes'>>,
): Promise<BiometricDevice> {
  const { data } = await apiClient.put<ApiResponse<BiometricDevice>>(`/admin/biometric/devices/${id}`, payload)
  return data.data
}

export async function deleteBiometricDevice(id: number): Promise<void> {
  await apiClient.delete(`/admin/biometric/devices/${id}`)
}

export async function fetchBiometricPunches(
  filters: BiometricPunchFilters = {},
): Promise<BiometricPunch[]> {
  const params: Record<string, string | number> = {}
  if (filters.date) params.date = filters.date
  if (filters.status) params.status = filters.status
  if (filters.device_id) params.device_id = filters.device_id

  const { data } = await apiClient.get<ApiResponse<BiometricPunch[]>>('/admin/biometric/punches', { params })
  return data.data
}

export async function fetchBiometricStats(): Promise<BiometricStats> {
  const { data } = await apiClient.get<ApiResponse<BiometricStats>>('/admin/biometric/stats')
  return data.data
}

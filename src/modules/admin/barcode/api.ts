import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  BarcodeScanResult,
  BarcodeScanRecord,
  BarcodeStatsData,
  BarcodeSettings,
  ScannerDevice,
  BarcodeStudentRecord,
  BarcodeScanFilters,
  BarcodeHistoryFilters,
} from './types'

// ========== مسح الباركود ==========

export async function scanBarcode(barcode: string): Promise<BarcodeScanResult> {
  const { data } = await apiClient.post<BarcodeScanResult>('/barcode/scan', { barcode })
  return data
}

// ========== المراقبة والإحصائيات ==========

export async function fetchBarcodeTodayScans(
  filters: BarcodeScanFilters = {},
): Promise<BarcodeScanRecord[]> {
  const params: Record<string, string> = {}
  if (filters.date) params.date = filters.date
  if (filters.scan_result) params.scan_result = filters.scan_result
  if (filters.grade) params.grade = filters.grade
  if (filters.class_name) params.class_name = filters.class_name
  if (filters.search) params.search = filters.search

  const { data } = await apiClient.get<ApiResponse<BarcodeScanRecord[]>>('/admin/barcode/today', { params })
  return data.data
}

export async function fetchBarcodeStats(): Promise<BarcodeStatsData> {
  const { data } = await apiClient.get<ApiResponse<BarcodeStatsData>>('/admin/barcode/stats')
  return data.data
}

export async function fetchBarcodeHistory(filters: BarcodeHistoryFilters) {
  const { data } = await apiClient.get<ApiResponse<{ data: BarcodeScanRecord[] }>>('/admin/barcode/history', {
    params: filters,
  })
  return data.data
}

// ========== الإعدادات ==========

export async function fetchBarcodeSettings(): Promise<BarcodeSettings> {
  const { data } = await apiClient.get<ApiResponse<BarcodeSettings>>('/admin/barcode/settings')
  return data.data
}

export async function updateBarcodeSettings(settings: Partial<BarcodeSettings>): Promise<BarcodeSettings> {
  const { data } = await apiClient.put<ApiResponse<BarcodeSettings>>('/admin/barcode/settings', settings)
  return data.data
}

// ========== أجهزة الماسح ==========

export async function fetchScannerDevices(): Promise<ScannerDevice[]> {
  const { data } = await apiClient.get<ApiResponse<ScannerDevice[]>>('/admin/barcode/devices')
  return data.data
}

export async function createScannerDevice(payload: {
  device_name: string
  device_type?: string
  notes?: string
}): Promise<{ id: number; device_name: string; device_token: string; device_type: string | null; status: string }> {
  const { data } = await apiClient.post<
    ApiResponse<{ id: number; device_name: string; device_token: string; device_type: string | null; status: string }>
  >('/admin/barcode/devices', payload)
  return data.data
}

export async function updateScannerDevice(
  id: number,
  payload: Partial<ScannerDevice>,
): Promise<ScannerDevice> {
  const { data } = await apiClient.put<ApiResponse<ScannerDevice>>(`/admin/barcode/devices/${id}`, payload)
  return data.data
}

export async function deleteScannerDevice(id: number): Promise<void> {
  await apiClient.delete(`/admin/barcode/devices/${id}`)
}

export async function regenerateDeviceToken(id: number): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ device_token: string }>>(
    `/admin/barcode/devices/${id}/regenerate-token`,
  )
  return data.data.device_token
}

// ========== طباعة الباركود ==========

export async function fetchBarcodeStudents(filters?: {
  grade?: string
  class_name?: string
  search?: string
}): Promise<BarcodeStudentRecord[]> {
  const { data } = await apiClient.get<ApiResponse<BarcodeStudentRecord[]>>('/admin/barcode/students', {
    params: filters,
  })
  return data.data
}

export async function printBarcodesBatch(payload: {
  student_ids: number[]
  format: 'card' | 'label' | 'list'
}): Promise<Blob> {
  const { data } = await apiClient.post('/admin/barcode/print-batch', payload, {
    responseType: 'blob',
    timeout: 180_000, // 3 دقائق للدفعات الكبيرة
  })
  return data
}

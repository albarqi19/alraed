import { apiClient } from '@/services/api/client'
import type {
  FarisSettings,
  FarisSyncLog,
  FarisEmployeeLeave,
  FarisReconciliationStats,
  FarisReconciliationAbsence,
} from './types'

// ========== الإعدادات ==========

export async function fetchFarisSettings(): Promise<FarisSettings> {
  const { data } = await apiClient.get('/admin/faris/settings')
  return data
}

export async function saveFarisSettings(payload: {
  enabled: boolean
  username?: string
  password?: string
}): Promise<void> {
  await apiClient.post('/admin/faris/settings', payload)
}

export async function testFarisConnection(): Promise<{
  success: boolean
  message: string
  employees_count?: number
}> {
  const { data } = await apiClient.post('/admin/faris/test-connection')
  return data
}

// ========== المزامنة ==========

export async function triggerDailySync(): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/admin/faris/sync')
  return data
}

export async function triggerFullSync(year?: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/admin/faris/sync-full', { year })
  return data
}

export async function fetchSyncStatus(): Promise<{ sync_log: FarisSyncLog | null }> {
  const { data } = await apiClient.get('/admin/faris/sync-status')
  return data
}

export async function fetchSyncLogs(): Promise<{ logs: FarisSyncLog[] }> {
  const { data } = await apiClient.get('/admin/faris/sync-logs')
  return data
}

// ========== الإجازات ==========

export async function fetchFarisLeaves(params?: {
  national_id?: string
  leave_type?: string
  start_date?: string
  end_date?: string
  status?: string
  per_page?: number
  page?: number
}): Promise<{ data: FarisEmployeeLeave[]; meta: { total: number; current_page: number; last_page: number } }> {
  const { data } = await apiClient.get('/admin/faris/leaves', { params })
  // Laravel paginator يضع الحقول في root مباشرة - نحوّلها لـ meta
  return {
    data: data.data,
    meta: { total: data.total, current_page: data.current_page, last_page: data.last_page },
  }
}

export async function fetchFarisPending(): Promise<{ pending: FarisEmployeeLeave[] }> {
  const { data } = await apiClient.get('/admin/faris/pending')
  return data
}

// ========== تقرير المطابقة ==========

export async function fetchReconciliation(params?: {
  year?: number
  national_id?: string
  faris_status?: string
  per_page?: number
  page?: number
}): Promise<{
  absences: { data: FarisReconciliationAbsence[]; meta: { total: number; current_page: number; last_page: number } }
  stats: FarisReconciliationStats
}> {
  const { data } = await apiClient.get('/admin/faris/reconciliation', { params })
  // Laravel paginator يضع الحقول في root - نحوّلها لـ meta
  const abs = data.absences
  return {
    absences: {
      data: abs.data,
      meta: { total: abs.total, current_page: abs.current_page, last_page: abs.last_page },
    },
    stats: data.stats,
  }
}

export async function fetchTeacherFarisReport(teacherId: number, year?: number): Promise<{
  absences: FarisReconciliationAbsence[]
  faris_leaves: FarisEmployeeLeave[]
  stats: FarisReconciliationStats
}> {
  const { data } = await apiClient.get(`/admin/faris/teacher/${teacherId}/report`, { params: { year } })
  return data
}

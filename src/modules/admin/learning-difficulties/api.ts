import { apiClient } from '@/services/api/client'

import type {
  LdAiReport,
  LdBoardFilters,
  LdForm,
  LdFormPayload,
  LdQuestionAnalytics,
  LdRow,
  LdScopeOptions,
  LdThresholds,
  LdTotals,
} from './types'

const BASE = '/admin/learning-difficulties'

export interface LdBoardResult {
  rows: LdRow[]
  totals: LdTotals
  thresholds: LdThresholds
  academicYearMeta: Record<string, unknown>
}

export async function fetchLdBoard(filters: LdBoardFilters = {}): Promise<LdBoardResult> {
  const params: Record<string, unknown> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      params[key] = value
    }
  })

  const { data } = await apiClient.get(`${BASE}/referrals`, { params })

  return {
    rows: data.data ?? [],
    totals: data.meta?.totals,
    thresholds: data.meta?.thresholds,
    academicYearMeta: data.meta ?? {},
  }
}

export async function fetchLdStudent(studentId: number, academicYear?: string): Promise<LdRow> {
  const { data } = await apiClient.get(`${BASE}/students/${studentId}`, {
    params: academicYear ? { academic_year: academicYear } : undefined,
  })

  return data.data
}

export async function fetchLdForms(): Promise<LdForm[]> {
  const { data } = await apiClient.get(`${BASE}/forms`)

  return data.data ?? []
}

export async function fetchLdForm(id: number): Promise<LdForm> {
  const { data } = await apiClient.get(`${BASE}/forms/${id}`)

  return data.data
}

export async function createLdForm(payload: LdFormPayload): Promise<LdForm> {
  const { data } = await apiClient.post(`${BASE}/forms`, payload)

  return data.data
}

export async function updateLdForm(id: number, payload: LdFormPayload): Promise<LdForm> {
  const { data } = await apiClient.put(`${BASE}/forms/${id}`, payload)

  return data.data
}

export async function toggleLdFormAcceptance(id: number): Promise<boolean> {
  const { data } = await apiClient.post(`${BASE}/forms/${id}/toggle-acceptance`)

  return data.data?.accepting_referrals ?? false
}

export async function deleteLdForm(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/forms/${id}`)
}

export async function fetchLdScopeOptions(): Promise<LdScopeOptions> {
  const { data } = await apiClient.get(`${BASE}/forms/scope-options`)

  return data.data
}

export async function fetchLdQuestionAnalytics(academicYear?: string): Promise<LdQuestionAnalytics[]> {
  const { data } = await apiClient.get(`${BASE}/questions-analytics`, {
    params: academicYear ? { academic_year: academicYear } : undefined,
  })

  return data.data ?? []
}

export async function generateLdAiReport(studentId: number, force = false): Promise<LdAiReport> {
  const { data } = await apiClient.post(`${BASE}/students/${studentId}/ai-report`, { force })

  return data.data
}

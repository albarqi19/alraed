import { apiClient as api } from '@/services/api/client'

export interface Summon {
  id: number
  student_id: number
  type: 'guardian' | 'student'
  reason: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'attended' | 'missed' | 'cancelled'
  notes?: string
  student?: {
    id: number
    name: string
    grade?: { name: string }
    classRoom?: { name: string }
    guardian_phone?: string
  }
  creator?: { name: string }
}

export interface CounselingSession {
  id: number
  type: 'individual' | 'group'
  topic: string
  scheduled_at: string
  conducted_at?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
  students?: { id: number; name: string }[]
}

export interface Recommendation {
  id: number
  student_id: number
  content: string
  type: 'academic' | 'behavioral' | 'social' | 'other'
  status: 'pending' | 'in_progress' | 'completed'
  assigned_to?: string
  due_date?: string
  student?: { id: number; name: string }
}

// Summons
export const fetchSummons = async (params?: any) => {
  const response = await api.get('/admin/guidance-counseling/summons', { params })
  return response.data
}

export const createSummon = async (data: any) => {
  const response = await api.post('/admin/guidance-counseling/summons', data)
  return response.data
}

export const updateSummon = async (id: number, data: any) => {
  const response = await api.put(`/admin/guidance-counseling/summons/${id}`, data)
  return response.data
}

export const deleteSummon = async (id: number) => {
  const response = await api.delete(`/admin/guidance-counseling/summons/${id}`)
  return response.data
}

export const sendSummonMessage = async (id: number) => {
  const response = await api.post(`/admin/guidance-counseling/summons/${id}/send-message`)
  return response.data
}

// Counseling Sessions
export const fetchCounselingSessions = async (params?: any) => {
  const response = await api.get('/admin/guidance-counseling/counseling-sessions', { params })
  return response.data
}

export const createCounselingSession = async (data: any) => {
  const response = await api.post('/admin/guidance-counseling/counseling-sessions', data)
  return response.data
}

export const updateCounselingSession = async (id: number, data: any) => {
  const response = await api.put(`/admin/guidance-counseling/counseling-sessions/${id}`, data)
  return response.data
}

export const deleteCounselingSession = async (id: number) => {
  const response = await api.delete(`/admin/guidance-counseling/counseling-sessions/${id}`)
  return response.data
}

// Recommendations
export const fetchRecommendations = async (params?: any) => {
  const response = await api.get('/admin/guidance-counseling/recommendations', { params })
  return response.data
}

export const createRecommendation = async (data: any) => {
  const response = await api.post('/admin/guidance-counseling/recommendations', data)
  return response.data
}

export const updateRecommendation = async (id: number, data: any) => {
  const response = await api.put(`/admin/guidance-counseling/recommendations/${id}`, data)
  return response.data
}

export const deleteRecommendation = async (id: number) => {
  const response = await api.delete(`/admin/guidance-counseling/recommendations/${id}`)
  return response.data
}

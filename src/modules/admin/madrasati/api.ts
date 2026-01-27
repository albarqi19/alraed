import { apiClient } from '@/services/api/client'
import type {
  MadrasatiSchoolMetrics,
  MadrasatiTeachersResponse,
  MadrasatiTeacherDetail,
  MadrasatiTeacherStat,
} from './types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * جلب إحصائيات المدرسة الشاملة
 */
export async function fetchMadrasatiSchoolMetrics(params?: {
  semester_id?: string
  subject?: string
}): Promise<MadrasatiSchoolMetrics> {
  const { data } = await apiClient.get<ApiResponse<MadrasatiSchoolMetrics>>(
    '/admin/madrasati-stats/school-metrics',
    { params }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب الإحصائيات')
  }
  return data.data
}

/**
 * جلب قائمة المعلمين مع إحصائياتهم
 */
export async function fetchMadrasatiTeachers(params?: {
  semester_id?: string
  teacher_id?: string
  per_page?: number
  page?: number
}): Promise<MadrasatiTeachersResponse> {
  const { data } = await apiClient.get<ApiResponse<MadrasatiTeachersResponse>>(
    '/admin/madrasati-stats',
    { params }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب قائمة المعلمين')
  }
  return data.data
}

/**
 * جلب تفاصيل معلم واحد
 */
export async function fetchMadrasatiTeacher(
  teacherId: string,
  semesterId?: string
): Promise<MadrasatiTeacherStat> {
  const { data } = await apiClient.get<ApiResponse<MadrasatiTeacherStat>>(
    `/admin/madrasati-stats/${teacherId}`,
    { params: semesterId ? { semester_id: semesterId } : undefined }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب بيانات المعلم')
  }
  return data.data
}

/**
 * جلب تفاصيل معلم مع المقارنة المعيارية
 */
export async function fetchMadrasatiTeacherBenchmark(
  teacherId: string,
  semesterId?: string
): Promise<MadrasatiTeacherDetail> {
  const { data } = await apiClient.get<ApiResponse<MadrasatiTeacherDetail>>(
    `/admin/madrasati-stats/teacher/${teacherId}/benchmark`,
    { params: semesterId ? { semester_id: semesterId } : undefined }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب بيانات المعلم')
  }
  return data.data
}

/**
 * جلب قائمة المواد المتاحة
 */
export async function fetchMadrasatiSubjects(semesterId?: string): Promise<string[]> {
  const { data } = await apiClient.get<ApiResponse<string[]>>(
    '/admin/madrasati-stats/subjects',
    { params: semesterId ? { semester_id: semesterId } : undefined }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب قائمة المواد')
  }
  return data.data
}

/**
 * جلب ملخص الإحصائيات (API القديم)
 */
export async function fetchMadrasatiSummary(semesterId?: string): Promise<{
  summary: {
    total_teachers: number
    total_students: number
    total_enrichments: number
    total_lessons: number
    total_homework: number
    total_homework_corrected: number
    total_tests: number
    total_activities: number
    avg_enrichments: number
    avg_lessons: number
    avg_homework: number
    avg_tests: number
    last_extraction: string | null
  }
  top_teachers: {
    teacher_id: string
    teacher_name: string
    enrichments_count: number
    homework_count: number
    tests_count: number
  }[]
}> {
  const { data } = await apiClient.get<ApiResponse<any>>(
    '/admin/madrasati-stats/summary',
    { params: semesterId ? { semester_id: semesterId } : undefined }
  )
  if (!data.success) {
    throw new Error(data.message || 'فشل في جلب الملخص')
  }
  return data.data
}

import { useQuery } from '@tanstack/react-query'
import {
  fetchMadrasatiSchoolMetrics,
  fetchMadrasatiTeachers,
  fetchMadrasatiTeacher,
  fetchMadrasatiTeacherBenchmark,
  fetchMadrasatiSubjects,
} from './api'

/**
 * جلب إحصائيات المدرسة الشاملة
 * مع تخزين مؤقت لمدة 5 دقائق
 */
export function useMadrasatiSchoolMetrics(params?: {
  semester_id?: string
  subject?: string
}) {
  return useQuery({
    queryKey: ['madrasati-metrics', params?.semester_id, params?.subject],
    queryFn: () => fetchMadrasatiSchoolMetrics(params),
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة في الذاكرة
  })
}

/**
 * جلب قائمة المعلمين مع إحصائياتهم
 */
export function useMadrasatiTeachers(params?: {
  semester_id?: string
  teacher_id?: string
  per_page?: number
  page?: number
}) {
  return useQuery({
    queryKey: ['madrasati-teachers', params],
    queryFn: () => fetchMadrasatiTeachers(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * جلب تفاصيل معلم واحد
 */
export function useMadrasatiTeacher(teacherId: string, semesterId?: string) {
  return useQuery({
    queryKey: ['madrasati-teacher', teacherId, semesterId],
    queryFn: () => fetchMadrasatiTeacher(teacherId, semesterId),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * جلب تفاصيل معلم مع المقارنة المعيارية
 */
export function useMadrasatiTeacherBenchmark(teacherId: string, semesterId?: string) {
  return useQuery({
    queryKey: ['madrasati-teacher-benchmark', teacherId, semesterId],
    queryFn: () => fetchMadrasatiTeacherBenchmark(teacherId, semesterId),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * جلب قائمة المواد المتاحة
 */
export function useMadrasatiSubjects(semesterId?: string) {
  return useQuery({
    queryKey: ['madrasati-subjects', semesterId],
    queryFn: () => fetchMadrasatiSubjects(semesterId),
    staleTime: 10 * 60 * 1000, // 10 دقائق - المواد لا تتغير كثيراً
    gcTime: 60 * 60 * 1000, // ساعة في الذاكرة
  })
}

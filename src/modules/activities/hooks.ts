import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { 
  ActivityFilters, 
  ActivityCreatePayload, 
  ActivityUpdatePayload,
  ReportSubmitPayload 
} from './types'

// ===================== Query Keys =====================

export const activityKeys = {
  all: ['activities'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: ActivityFilters) => [...activityKeys.lists(), filters] as const,
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: number) => [...activityKeys.details(), id] as const,
  stats: () => [...activityKeys.all, 'stats'] as const,
  grades: () => [...activityKeys.all, 'grades'] as const,
  executionLocations: () => [...activityKeys.all, 'execution-locations'] as const,
  reports: (activityId: number) => [...activityKeys.all, activityId, 'reports'] as const,
  teacherActivities: () => [...activityKeys.all, 'teacher'] as const,
  teacherDetail: (id: number) => [...activityKeys.all, 'teacher', id] as const,
  teacherReportStatus: (id: number) => [...activityKeys.all, 'teacher', id, 'report-status'] as const,
}

// ===================== Admin Hooks =====================

/**
 * جلب قائمة الأنشطة (للإدارة)
 */
export function useActivities(filters: ActivityFilters = {}) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: () => api.fetchActivities(filters),
  })
}

/**
 * جلب إحصائيات الأنشطة
 */
export function useActivityStats() {
  return useQuery({
    queryKey: activityKeys.stats(),
    queryFn: api.fetchActivityStats,
  })
}

/**
 * جلب الصفوف الدراسية المتاحة
 */
export function useAvailableGrades() {
  return useQuery({
    queryKey: activityKeys.grades(),
    queryFn: api.fetchAvailableGrades,
  })
}

/**
 * جلب أماكن التنفيذ المتاحة
 */
export function useExecutionLocations() {
  return useQuery({
    queryKey: activityKeys.executionLocations(),
    queryFn: api.fetchExecutionLocations,
  })
}

/**
 * جلب تفاصيل نشاط محدد
 */
export function useActivityDetails(activityId: number) {
  return useQuery({
    queryKey: activityKeys.detail(activityId),
    queryFn: () => api.fetchActivityDetails(activityId),
    enabled: activityId > 0,
  })
}

/**
 * إنشاء نشاط جديد
 */
export function useCreateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (payload: ActivityCreatePayload) => api.createActivity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() })
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() })
    },
  })
}

/**
 * تحديث نشاط
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ activityId, payload }: { activityId: number; payload: ActivityUpdatePayload }) =>
      api.updateActivity(activityId, payload),
    onSuccess: (_, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() })
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) })
    },
  })
}

/**
 * حذف نشاط
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (activityId: number) => api.deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() })
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() })
    },
  })
}

/**
 * جلب تقارير نشاط
 */
export function useActivityReports(activityId: number) {
  return useQuery({
    queryKey: activityKeys.reports(activityId),
    queryFn: () => api.fetchActivityReports(activityId),
    enabled: activityId > 0,
  })
}

/**
 * قبول تقرير
 */
export function useApproveReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ activityId, reportId }: { activityId: number; reportId: number }) =>
      api.approveReport(activityId, reportId),
    onSuccess: (_, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.reports(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() })
    },
  })
}

/**
 * رفض تقرير
 */
export function useRejectReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      activityId, 
      reportId, 
      rejectionReason 
    }: { 
      activityId: number
      reportId: number
      rejectionReason: string 
    }) => api.rejectReport(activityId, reportId, rejectionReason),
    onSuccess: (_, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.reports(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.stats() })
    },
  })
}

// ===================== Teacher Hooks =====================

/**
 * جلب الأنشطة المخصصة للمعلم
 */
export function useTeacherActivities() {
  return useQuery({
    queryKey: activityKeys.teacherActivities(),
    queryFn: api.fetchTeacherActivities,
  })
}

/**
 * جلب تفاصيل نشاط للمعلم
 */
export function useTeacherActivityDetails(activityId: number) {
  return useQuery({
    queryKey: activityKeys.teacherDetail(activityId),
    queryFn: () => api.fetchTeacherActivityDetails(activityId),
    enabled: activityId > 0,
  })
}

/**
 * إرسال تقرير النشاط
 */
export function useSubmitReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ activityId, payload }: { activityId: number; payload: ReportSubmitPayload }) =>
      api.submitTeacherReport(activityId, payload),
    onSuccess: (_, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherActivities() })
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherDetail(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherReportStatus(activityId) })
    },
  })
}

/**
 * تحديث تقرير المعلم (بعد الرفض)
 */
export function useUpdateTeacherReport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ activityId, payload }: { activityId: number; payload: ReportSubmitPayload }) =>
      api.updateTeacherReport(activityId, payload),
    onSuccess: (_, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherActivities() })
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherDetail(activityId) })
      queryClient.invalidateQueries({ queryKey: activityKeys.teacherReportStatus(activityId) })
    },
  })
}

/**
 * جلب حالة تقرير المعلم
 */
export function useTeacherReportStatus(activityId: number) {
  return useQuery({
    queryKey: activityKeys.teacherReportStatus(activityId),
    queryFn: () => api.fetchTeacherReportStatus(activityId),
    enabled: activityId > 0,
  })
}

import { apiClient } from '@/services/api/client'
import type { ApiResponse } from '@/services/api/types'
import type {
  Activity,
  ActivityStats,
  ActivityWithDetails,
  ActivityReport,
  TeacherActivityView,
  TeacherActivityDetails,
  TeacherWithReportStatus,
  ActivitiesListResponse,
  ActivityFilters,
  ActivityCreatePayload,
  ActivityUpdatePayload,
  ReportSubmitPayload,
  ReportStatus,
} from './types'

// ===================== Admin API =====================

/**
 * جلب قائمة الأنشطة (للإدارة)
 */
export async function fetchActivities(filters: ActivityFilters = {}): Promise<ActivitiesListResponse> {
  const params: Record<string, string | number> = {}
  
  if (filters.status && filters.status !== 'all') {
    params.status = filters.status
  }
  if (filters.page) {
    params.page = filters.page
  }

  const { data } = await apiClient.get<ApiResponse<Activity[]> & { meta?: ActivitiesListResponse['meta'] }>('/admin/activities', { params })
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل قائمة الأنشطة')
  }
  
  // البيانات تأتي مباشرة في data.data كمصفوفة، و meta منفصل
  const activities = Array.isArray(data.data) ? data.data : []
  const meta = (data as { meta?: ActivitiesListResponse['meta'] }).meta
  
  return {
    data: activities,
    meta: meta ?? {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: activities.length,
    },
  }
}

/**
 * جلب إحصائيات الأنشطة (للإدارة)
 */
export async function fetchActivityStats(): Promise<ActivityStats> {
  const { data } = await apiClient.get<ApiResponse<ActivityStats>>('/admin/activities/stats')
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل إحصائيات الأنشطة')
  }
  
  return data.data
}

/**
 * جلب الصفوف الدراسية المتاحة
 */
export async function fetchAvailableGrades(): Promise<string[]> {
  const { data } = await apiClient.get<ApiResponse<string[]>>('/admin/activities/grades')
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الصفوف الدراسية')
  }
  
  return data.data
}

/**
 * جلب تفاصيل نشاط محدد مع المعلمين المعنيين (للإدارة)
 */
export async function fetchActivityDetails(activityId: number): Promise<{
  activity: ActivityWithDetails
  target_teachers: TeacherWithReportStatus[]
  stats: {
    total_teachers: number
    submitted_count: number
    pending_count: number
    approved_count: number
    rejected_count: number
  }
}> {
  const { data } = await apiClient.get<{
    success: boolean
    message?: string
    data: ActivityWithDetails
    target_teachers: TeacherWithReportStatus[]
    stats: {
      total_teachers: number
      submitted_count: number
      pending_count: number
      approved_count: number
      rejected_count: number
    }
  }>(`/admin/activities/${activityId}`)
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل تفاصيل النشاط')
  }
  
  return {
    activity: data.data,
    target_teachers: data.target_teachers,
    stats: data.stats,
  }
}

/**
 * إنشاء نشاط جديد
 */
export async function createActivity(payload: ActivityCreatePayload): Promise<Activity> {
  const formData = new FormData()
  
  formData.append('title', payload.title)
  formData.append('start_date', payload.start_date)
  formData.append('end_date', payload.end_date)
  
  if (payload.description) formData.append('description', payload.description)
  if (payload.objectives) formData.append('objectives', payload.objectives)
  if (payload.examples) formData.append('examples', payload.examples)
  if (payload.status) formData.append('status', payload.status)
  
  payload.target_grades.forEach((grade, index) => {
    formData.append(`target_grades[${index}]`, grade)
  })
  
  if (payload.pdf_file) {
    formData.append('pdf_file', payload.pdf_file)
  }

  const { data } = await apiClient.post<ApiResponse<Activity>>('/admin/activities', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إنشاء النشاط')
  }
  
  return data.data
}

/**
 * تحديث نشاط
 */
export async function updateActivity(activityId: number, payload: ActivityUpdatePayload): Promise<Activity> {
  const formData = new FormData()
  
  // إضافة _method للـ Laravel لأن FormData لا يدعم PUT مباشرة
  formData.append('_method', 'PUT')
  
  if (payload.title) formData.append('title', payload.title)
  if (payload.start_date) formData.append('start_date', payload.start_date)
  if (payload.end_date) formData.append('end_date', payload.end_date)
  if (payload.description !== undefined) formData.append('description', payload.description || '')
  if (payload.objectives !== undefined) formData.append('objectives', payload.objectives || '')
  if (payload.examples !== undefined) formData.append('examples', payload.examples || '')
  if (payload.status) formData.append('status', payload.status)
  
  if (payload.target_grades) {
    payload.target_grades.forEach((grade, index) => {
      formData.append(`target_grades[${index}]`, grade)
    })
  }
  
  if (payload.pdf_file) {
    formData.append('pdf_file', payload.pdf_file)
  }

  const { data } = await apiClient.post<ApiResponse<Activity>>(`/admin/activities/${activityId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحديث النشاط')
  }
  
  return data.data
}

/**
 * حذف نشاط
 */
export async function deleteActivity(activityId: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/activities/${activityId}`)
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر حذف النشاط')
  }
}

/**
 * جلب تقارير نشاط معين (للإدارة)
 */
export async function fetchActivityReports(activityId: number): Promise<ActivityReport[]> {
  const { data } = await apiClient.get<ApiResponse<ActivityReport[]>>(`/admin/activities/${activityId}/reports`)
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل التقارير')
  }
  
  return data.data
}

/**
 * جلب تفاصيل تقرير محدد
 */
export async function fetchReportDetails(activityId: number, reportId: number): Promise<ActivityReport> {
  const { data } = await apiClient.get<ApiResponse<ActivityReport>>(
    `/admin/activities/${activityId}/reports/${reportId}`
  )
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل تفاصيل التقرير')
  }
  
  return data.data
}

/**
 * قبول تقرير
 */
export async function approveReport(activityId: number, reportId: number): Promise<ActivityReport> {
  const { data } = await apiClient.post<ApiResponse<ActivityReport>>(
    `/admin/activities/${activityId}/reports/${reportId}/approve`
  )
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر قبول التقرير')
  }
  
  return data.data
}

/**
 * رفض تقرير
 */
export async function rejectReport(
  activityId: number, 
  reportId: number, 
  rejectionReason: string
): Promise<ActivityReport> {
  const { data } = await apiClient.post<ApiResponse<ActivityReport>>(
    `/admin/activities/${activityId}/reports/${reportId}/reject`,
    { rejection_reason: rejectionReason }
  )
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر رفض التقرير')
  }
  
  return data.data
}

// ===================== Teacher API =====================

/**
 * جلب الأنشطة المخصصة للمعلم
 */
export async function fetchTeacherActivities(): Promise<{
  data: TeacherActivityView[]
  teacher_grades: string[]
}> {
  const { data } = await apiClient.get<{
    success: boolean
    message?: string
    data: TeacherActivityView[]
    teacher_grades: string[]
  }>('/teacher/activities')
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل الأنشطة')
  }
  
  return {
    data: data.data,
    teacher_grades: data.teacher_grades,
  }
}

/**
 * جلب تفاصيل نشاط للمعلم
 */
export async function fetchTeacherActivityDetails(activityId: number): Promise<TeacherActivityDetails> {
  const { data } = await apiClient.get<{
    success: boolean
    message?: string
    data: TeacherActivityDetails['data']
    students_count: number
    report: TeacherActivityDetails['report']
  }>(`/teacher/activities/${activityId}`)
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل تفاصيل النشاط')
  }
  
  return {
    data: data.data,
    students_count: data.students_count,
    report: data.report,
  }
}

/**
 * إرسال تقرير النشاط من المعلم
 */
export async function submitTeacherReport(
  activityId: number, 
  payload: ReportSubmitPayload
): Promise<ActivityReport> {
  const formData = new FormData()
  
  formData.append('execution_location', payload.execution_location)
  formData.append('achieved_objectives', payload.achieved_objectives)
  formData.append('students_count', payload.students_count.toString())
  
  if (payload.images) {
    payload.images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })
  }

  const { data } = await apiClient.post<ApiResponse<ActivityReport>>(
    `/teacher/activities/${activityId}/report`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر إرسال التقرير')
  }
  
  return data.data
}

/**
 * تحديث تقرير المعلم (بعد الرفض)
 */
export async function updateTeacherReport(
  activityId: number, 
  payload: ReportSubmitPayload
): Promise<ActivityReport> {
  const formData = new FormData()
  
  formData.append('_method', 'PUT')
  formData.append('execution_location', payload.execution_location)
  formData.append('achieved_objectives', payload.achieved_objectives)
  formData.append('students_count', payload.students_count.toString())
  
  if (payload.images) {
    payload.images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })
  }

  const { data } = await apiClient.post<ApiResponse<ActivityReport>>(
    `/teacher/activities/${activityId}/report`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحديث التقرير')
  }
  
  return data.data
}

/**
 * جلب حالة تقرير المعلم لنشاط معين
 */
export async function fetchTeacherReportStatus(activityId: number): Promise<{
  has_report: boolean
  data: {
    id: number
    status: ReportStatus
    status_label: string
    rejection_reason: string | null
    submitted_at: string
    reviewed_at: string | null
  } | null
}> {
  const { data } = await apiClient.get<{
    success: boolean
    message?: string
    has_report: boolean
    data: {
      id: number
      status: ReportStatus
      status_label: string
      rejection_reason: string | null
      submitted_at: string
      reviewed_at: string | null
    } | null
  }>(`/teacher/activities/${activityId}/report-status`)
  
  if (!data.success) {
    throw new Error(data.message ?? 'تعذر تحميل حالة التقرير')
  }
  
  return {
    has_report: data.has_report,
    data: data.data,
  }
}

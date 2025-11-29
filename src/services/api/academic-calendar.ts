import { apiClient } from './client'

// Types
export interface AcademicDayInfo {
  id: number
  date: string
  day_name: string
  hijri_date: string
  hijri_month: string
  week_number: number
  day_type: 'school_day' | 'holiday' | 'exam' | 'break'
  note: string | null
}

export interface AcademicWeekInfo {
  id: number
  week_number: number
  date_range: string
}

export interface AcademicSemesterInfo {
  id: number
  code: 'first' | 'second'
  name: string
}

export interface DayStatusResponse {
  is_working_day: boolean
  reason: 'working_day' | 'weekend' | 'holiday' | 'interim_holiday' | 'event' | 'outside_academic_year' | 'before_academic_year' | 'after_academic_year' | 'no_academic_year'
  message: string
  next_working_day: string | null
  next_working_day_formatted: string | null
  academic_day: AcademicDayInfo | null
  event: {
    id: number
    title: string
    description: string | null
    category: string
  } | null
  holiday_notice: string | null
  is_within_working_hours: boolean
  current_week: AcademicWeekInfo | null
  current_semester: AcademicSemesterInfo | null
}

export interface CanSendMessagesResponse {
  can_send: boolean
  reason: string
  message: string
  holiday_name?: string
  return_date?: string
  next_working_day?: string | null
  working_hours?: {
    start: string
    end: string
  }
}

export interface ScheduleVisibilityResponse {
  hide: boolean
  reason?: string
  message?: string
  next_working_day?: string | null
  holiday_notice?: string | null
  current_week?: AcademicWeekInfo | null
  current_semester?: AcademicSemesterInfo | null
}

export interface AcademicSemesterSummary {
  id: number
  code: 'first' | 'second'
  name: string
  start_date: string
  end_date: string
  start_hijri: string
  end_hijri: string
  total_weeks: number
  total_days: number
  is_current: boolean
  academic_year: string
}

export interface AcademicWeek {
  id: number
  academic_semester_id: number
  week_number: number
  start_date: string
  end_date: string
  is_current: boolean
  days?: AcademicDay[]
  semester?: AcademicSemesterSummary
}

export interface AcademicDay {
  id: number
  academic_week_id: number
  academic_semester_id: number
  date: string
  day_name: string
  day_name_en: string
  day_of_week: number
  hijri_day: string
  hijri_month: string
  hijri_year: string
  gregorian_month: string
  day_type: 'school_day' | 'holiday' | 'exam' | 'break'
  note: string | null
  is_working_day: boolean
}

export interface AcademicEvent {
  id: number
  academic_year_id: number
  academic_semester_id: number | null
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  hijri_date: string | null
  category: 'start' | 'holiday' | 'exam' | 'return' | 'deadline' | 'info'
  event_type: 'single_day' | 'multi_day' | 'period'
  affects_attendance: boolean
  blocks_messages: boolean
  sort_order: number
  is_active: boolean
}

export interface AcademicYear {
  id: number
  name: string
  name_ar: string
  start_date: string
  end_date: string
  start_hijri: string
  end_hijri: string
  is_current: boolean
  is_active: boolean
  semesters?: AcademicSemesterSummary[]
}

export interface AcademicCalendarResponse {
  academic_year: AcademicYear
  current_semester: AcademicSemesterInfo | null
  current_week: AcademicWeekInfo | null
  today_status: DayStatusResponse
}

// API Functions
export const academicCalendarApi = {
  /**
   * الحصول على حالة اليوم الحالي
   */
  getTodayStatus: async (): Promise<DayStatusResponse> => {
    const response = await apiClient.get<{ success: boolean; data: DayStatusResponse }>('/academic-calendar/today')
    return response.data.data
  },

  /**
   * الحصول على حالة يوم محدد
   */
  getDayStatus: async (date: string): Promise<DayStatusResponse> => {
    const response = await apiClient.get<{ success: boolean; data: DayStatusResponse }>(`/academic-calendar/day/${date}`)
    return response.data.data
  },

  /**
   * التحقق من إمكانية إرسال الرسائل
   */
  canSendMessages: async (): Promise<CanSendMessagesResponse> => {
    const response = await apiClient.get<{ success: boolean; data: CanSendMessagesResponse }>('/academic-calendar/can-send-messages')
    return response.data.data
  },

  /**
   * التحقق من إخفاء الجدول
   */
  getScheduleVisibility: async (): Promise<ScheduleVisibilityResponse> => {
    const response = await apiClient.get<{ success: boolean; data: ScheduleVisibilityResponse }>('/academic-calendar/schedule-visibility')
    return response.data.data
  },

  /**
   * الحصول على التقويم الكامل
   */
  getCalendar: async (): Promise<AcademicCalendarResponse> => {
    const response = await apiClient.get<{ success: boolean; data: AcademicCalendarResponse }>('/academic-calendar')
    return response.data.data
  },

  /**
   * الحصول على الفصول الدراسية
   */
  getSemesters: async (): Promise<AcademicSemesterSummary[]> => {
    const response = await apiClient.get<{ success: boolean; data: AcademicSemesterSummary[] }>('/academic-calendar/semesters')
    return response.data.data
  },

  /**
   * الحصول على الأسابيع
   */
  getWeeks: async (semester?: 'first' | 'second'): Promise<{ data: AcademicWeek[]; current_week: AcademicWeekInfo | null }> => {
    const params = semester ? { semester } : {}
    const response = await apiClient.get<{ success: boolean; data: AcademicWeek[]; current_week: AcademicWeekInfo | null }>('/academic-calendar/weeks', { params })
    return { data: response.data.data, current_week: response.data.current_week }
  },

  /**
   * الحصول على الأيام
   */
  getDays: async (options?: {
    week_id?: number
    semester?: 'first' | 'second'
    from?: string
    to?: string
    holidays_only?: boolean
    working_days_only?: boolean
  }): Promise<AcademicDay[]> => {
    const response = await apiClient.get<{ success: boolean; data: AcademicDay[] }>('/academic-calendar/days', { params: options })
    return response.data.data
  },

  /**
   * الحصول على الأحداث
   */
  getEvents: async (options?: {
    upcoming?: boolean
    category?: string
    semester?: 'first' | 'second'
    limit?: number
  }): Promise<AcademicEvent[]> => {
    const response = await apiClient.get<{ success: boolean; data: AcademicEvent[] }>('/academic-calendar/events', { params: options })
    return response.data.data
  },

  /**
   * الحصول على الأحداث القادمة
   */
  getUpcomingEvents: async (limit = 5): Promise<AcademicEvent[]> => {
    const response = await apiClient.get<{ success: boolean; data: AcademicEvent[] }>('/academic-calendar/upcoming-events', { params: { limit } })
    return response.data.data
  },
}

export default academicCalendarApi

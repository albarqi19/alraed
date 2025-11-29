import { useQuery } from '@tanstack/react-query'
import { academicCalendarApi, type DayStatusResponse, type CanSendMessagesResponse, type ScheduleVisibilityResponse, type AcademicCalendarResponse, type AcademicEvent } from '@/services/api/academic-calendar'

/**
 * Hook للحصول على حالة اليوم الحالي
 */
export function useTodayStatus() {
  return useQuery<DayStatusResponse>({
    queryKey: ['academic-calendar', 'today'],
    queryFn: academicCalendarApi.getTodayStatus,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    refetchInterval: 10 * 60 * 1000, // إعادة جلب كل 10 دقائق
  })
}

/**
 * Hook للحصول على حالة يوم محدد
 */
export function useDayStatus(date: string) {
  return useQuery<DayStatusResponse>({
    queryKey: ['academic-calendar', 'day', date],
    queryFn: () => academicCalendarApi.getDayStatus(date),
    enabled: !!date,
    staleTime: 60 * 60 * 1000, // ساعة
  })
}

/**
 * Hook للتحقق من إمكانية إرسال الرسائل
 */
export function useCanSendMessages() {
  return useQuery<CanSendMessagesResponse>({
    queryKey: ['academic-calendar', 'can-send-messages'],
    queryFn: academicCalendarApi.canSendMessages,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })
}

/**
 * Hook للتحقق من إخفاء الجدول
 */
export function useScheduleVisibility() {
  return useQuery<ScheduleVisibilityResponse>({
    queryKey: ['academic-calendar', 'schedule-visibility'],
    queryFn: academicCalendarApi.getScheduleVisibility,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })
}

/**
 * Hook للحصول على التقويم الكامل
 */
export function useAcademicCalendar() {
  return useQuery<AcademicCalendarResponse>({
    queryKey: ['academic-calendar'],
    queryFn: academicCalendarApi.getCalendar,
    staleTime: 60 * 60 * 1000, // ساعة
  })
}

/**
 * Hook للحصول على الأحداث القادمة
 */
export function useUpcomingEvents(limit = 5) {
  return useQuery<AcademicEvent[]>({
    queryKey: ['academic-calendar', 'upcoming-events', limit],
    queryFn: () => academicCalendarApi.getUpcomingEvents(limit),
    staleTime: 30 * 60 * 1000, // 30 دقيقة
  })
}

/**
 * Helper: هل اليوم إجازة؟
 */
export function isHoliday(status: DayStatusResponse | undefined): boolean {
  if (!status) return false
  return !status.is_working_day
}

/**
 * Helper: هل يمكن العمل؟
 */
export function canWork(status: DayStatusResponse | undefined): boolean {
  if (!status) return true // افتراضياً نعم حتى يتم التحميل
  return status.is_working_day && status.is_within_working_hours
}

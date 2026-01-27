// =============================================
// Live Tracker Types
// مؤشر المتابعة المباشر
// =============================================

// أنواع الفترات
export type TrackerPeriodType = 'assembly' | 'class' | 'break' | 'dismissal'

// أنواع الإجراءات
export type TrackerActionType = 'absent' | 'late' | 'early_leave' | 'duty_absent'

// أنواع الخانات
export type TrackerSlotType = 'assembly' | 'class' | 'free' | 'standby' | 'break_duty' | 'dismissal_duty'

// حالة التحضير
export type PreparationStatus = 'prepared' | 'waiting' | 'warning' | 'activity' | 'empty' | null

// الإجراء المسجل
export interface TrackerRecordedAction {
  type: TrackerActionType
  minutes?: number | null
}

// خانة الطابور
export interface TrackerAssemblySlot {
  type: 'assembly'
  status: 'present' | 'absent'
  check_in_time?: string | null
  action?: TrackerRecordedAction | null
}

// خانة الحصة
export interface TrackerClassSlot {
  type: 'class'
  grade: string
  class_name: string
  display: string
  subject?: string | null
  preparation_status?: PreparationStatus
  action?: TrackerRecordedAction | null
}

// خانة الفراغ
export interface TrackerFreeSlot {
  type: 'free'
  action?: TrackerRecordedAction | null
}

// خانة الانتظار
export interface TrackerStandbySlot {
  type: 'standby'
  grade?: string | null
  class_name?: string | null
  display?: string | null
  subject?: string | null
  action?: TrackerRecordedAction | null
}

// خانة إشراف الفسحة
export interface TrackerBreakDutySlot {
  type: 'break_duty'
  template_name?: string | null
  action?: TrackerRecordedAction | null
}

// خانة مناوبة الانصراف
export interface TrackerDismissalDutySlot {
  type: 'dismissal_duty'
  status?: string | null
  action?: TrackerRecordedAction | null
}

// الخانة الموحدة
export type TrackerSlot =
  | TrackerAssemblySlot
  | TrackerClassSlot
  | TrackerFreeSlot
  | TrackerStandbySlot
  | TrackerBreakDutySlot
  | TrackerDismissalDutySlot

// خريطة الخانات للمعلم
export type TrackerSlotsMap = Record<string, TrackerSlot>

// بيانات المعلم
export interface TrackerTeacher {
  id: number
  name: string
  role: string
  schedule_level?: string | null
  attendance_status: 'present' | 'absent' | 'unknown'
  check_in_time?: string | null
  is_absent: boolean
  absence_reason?: string | null
  absence_reason_label?: string | null
  slots: TrackerSlotsMap
}

// فترة في الجدول
export interface TrackerPeriod {
  column_id: string              // معرف العمود الفريد
  number: number
  name: string
  type: TrackerPeriodType
  is_current?: boolean
  is_break?: boolean

  // حقول جديدة للفترات المتداخلة
  schedule_id?: number | null
  target_level?: 'upper' | 'lower' | null
  start_time?: string
  end_time?: string
  is_overlapping: boolean
}

// فترة مع أوقات (في التوقيت)
export interface TrackerSchedulePeriod {
  number: number
  name: string
  start_time: string
  end_time: string
  is_break?: boolean
}

// التوقيت
export interface TrackerSchedule {
  id: number
  name: string
  target_level?: string | null
  periods: TrackerSchedulePeriod[]
}

// البيانات الكاملة للجدول
export interface LiveTrackerData {
  date: string
  day_name: string
  current_time: string
  current_period?: number | null
  schedules: TrackerSchedule[]
  periods: TrackerPeriod[]
  teachers: TrackerTeacher[]
}

// استجابة API
export interface LiveTrackerResponse {
  success: boolean
  data: LiveTrackerData
}

// بيانات تسجيل الإجراء
export interface RecordActionPayload {
  user_id: number
  date?: string | null
  period_number: number
  period_type: TrackerPeriodType
  action_type: TrackerActionType
  minutes?: number | null
  grade?: string | null
  class_name?: string | null
  notes?: string | null
}

// استجابة تسجيل الإجراء
export interface RecordActionResponse {
  success: boolean
  message: string
  data: {
    id: number
    action_type: TrackerActionType
    action_type_label: string
    period_type_label: string
    minutes?: number | null
    formatted_minutes?: string | null
  }
}

// بيانات حذف الإجراء
export interface DeleteActionPayload {
  user_id: number
  date?: string | null
  period_number: number
  action_type: TrackerActionType
}

// استجابة حذف الإجراء
export interface DeleteActionResponse {
  success: boolean
  message: string
}

// خيارات الإجراءات (للقائمة المنسدلة)
export interface ActionOption {
  type: TrackerActionType
  label: string
  icon?: string
  requiresMinutes?: boolean
}

// تسميات الإجراءات
export const ACTION_TYPE_LABELS: Record<TrackerActionType, string> = {
  absent: 'غياب',
  late: 'تأخر',
  early_leave: 'انصراف مبكر',
  duty_absent: 'عدم حضور المناوبة',
}

// تسميات أنواع الفترات
export const PERIOD_TYPE_LABELS: Record<TrackerPeriodType, string> = {
  assembly: 'الطابور',
  class: 'حصة',
  break: 'الفسحة',
  dismissal: 'الانصراف',
}

// ألوان الخلفية حسب نوع الخانة
export const SLOT_BG_COLORS: Record<TrackerSlotType, string> = {
  assembly: 'bg-slate-50',
  class: 'bg-emerald-50',
  free: 'bg-slate-100',
  standby: 'bg-amber-50',
  break_duty: 'bg-sky-50',
  dismissal_duty: 'bg-purple-50',
}

// ألوان حالة التحضير
export const PREPARATION_STATUS_COLORS: Record<string, string> = {
  prepared: 'border-emerald-500',
  waiting: 'border-amber-500',
  warning: 'border-red-500',
  activity: 'border-blue-500',
  empty: 'border-slate-300',
}

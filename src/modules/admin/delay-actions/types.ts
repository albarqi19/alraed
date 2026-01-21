/**
 * أنواع البيانات لنظام إجراءات تأخير المعلمين
 */

// نوع الإجراء: تنبيه أو قرار حسم
export type DelayActionType = 'warning' | 'deduction'

// معلومات الإجراء المختصرة
export interface ActionInfo {
  id: number
  created_at: string
  is_printed: boolean
  is_signed: boolean
  carried_over_minutes?: number
}

// إحصائيات إجراءات التأخير
export interface DelayActionsStatistics {
  fiscal_year: number
  teachers_with_delay: number
  pending_warnings: number
  pending_deductions: number
  total_warnings_issued: number
  total_deductions_issued: number
  warning_threshold_minutes: number
  deduction_threshold_minutes: number
}

// بيانات تأخير معلم في القائمة
export interface TeacherDelayData {
  user_id: number
  teacher_name: string
  teacher_phone: string | null
  national_id: string | null
  total_minutes: number
  new_delay_minutes: number
  carried_over_minutes: number
  total_hours: number
  formatted_delay: string
  formatted_new_delay: string
  formatted_carried_over: string
  records_count: number
  calculation_start_date: string
  calculation_end_date: string
  pending_action: DelayActionType | null
  pending_action_label: string | null
  last_warning: ActionInfo | null
  last_deduction: ActionInfo | null
  fiscal_year: number
}

// سجل تأخير يومي
export interface DelayRecord {
  date: string
  check_in_time: string | null
  delay_minutes: number
}

// سجل إجراء في التاريخ
export interface DelayActionRecord {
  id: number
  user_id: number
  teacher_name: string | null
  teacher_phone: string | null
  action_type: DelayActionType
  action_type_label: string
  total_delay_minutes: number
  deducted_minutes: number
  carried_over_minutes: number
  total_delay_hours: number
  formatted_delay: string
  formatted_carried_over: string
  calculation_start_date: string
  calculation_end_date: string
  fiscal_year: number
  sequence_number: number
  is_printed: boolean
  is_signed: boolean
  is_notified: boolean
  printed_at: string | null
  signed_at: string | null
  signed_by_name: string | null
  notified_at: string | null
  notes: string | null
  performed_by: {
    id: number
    name: string
  } | null
  created_at: string
}

// تفاصيل تأخير معلم
export interface TeacherDelayDetails {
  teacher: {
    id: number
    name: string
    phone: string | null
    national_id: string | null
  }
  delay_summary: {
    total_minutes: number
    new_delay_minutes: number
    carried_over_minutes: number
    total_hours: number
    formatted_delay: string
    formatted_new_delay: string
    formatted_carried_over: string
    records_count: number
    calculation_start_date: string
    calculation_end_date: string
    fiscal_year: number
  }
  delay_records: DelayRecord[]
  actions_history: DelayActionRecord[]
  thresholds: {
    warning: number
    deduction: number
  }
}

// استجابة قائمة المعلمين
export interface TeacherDelayListResponse {
  success: boolean
  data: TeacherDelayData[]
  meta: {
    fiscal_year: number
    warning_threshold_minutes: number
    deduction_threshold_minutes: number
    total_teachers: number
  }
}

// استجابة تاريخ الإجراءات
export interface DelayActionsHistoryResponse {
  success: boolean
  data: DelayActionRecord[]
  meta: PaginationMeta
}

// معلومات الصفحات
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// فلاتر قائمة المعلمين
export interface DelayActionsFilters {
  fiscal_year?: number
  pending_action?: 'warning' | 'deduction' | 'all'
  search?: string
}

// فلاتر تاريخ الإجراءات
export interface DelayActionsHistoryFilters {
  fiscal_year?: number
  action_type?: DelayActionType | 'all'
  user_id?: number
  page?: number
  per_page?: number
}

// بيانات تسجيل إجراء
export interface RecordActionPayload {
  user_id: number
  notes?: string | null
  send_notification?: boolean
}

// بيانات تحديث التوقيع
export interface MarkSignedPayload {
  signed_by_name: string
}

// إعدادات إجراءات التأخير
export interface DelayActionsSettings {
  send_whatsapp_for_delay_actions: boolean
  delay_warning_template_id: number | null
  delay_deduction_template_id: number | null
  warning_threshold_minutes: number
  deduction_threshold_minutes: number
  available_templates: Array<{
    id: number
    name: string
    type: string
  }>
}

// بيانات تحديث الإعدادات
export interface UpdateDelayActionsSettingsPayload {
  send_whatsapp_for_delay_actions?: boolean
  delay_warning_template_id?: number | null
  delay_deduction_template_id?: number | null
}

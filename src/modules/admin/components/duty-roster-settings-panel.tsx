import { useEffect, useState } from 'react'
import { BellRing, Calendar, Loader2, Settings, X } from 'lucide-react'

import {
  useDutyRosterSettingsQuery,
  useUpdateDutyRosterSettingsMutation,
} from '@/modules/admin/hooks'
import type { DutyRosterSettingsRecord, DutyRosterSettingsUpdatePayload } from '@/modules/admin/types'

const REMINDER_CHANNEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'sms', label: 'رسالة نصية' },
  { value: 'email', label: 'بريد إلكتروني' },
]

type SettingsFormState = {
  // إعدادات الإشراف اليومي
  reminderNotificationsEnabled: boolean
  reminderLeadMinutes: string
  reminderChannels: string[]
  reminderRepeatIntervalMinutes: string
  reminderRepeatCount: string
  sendTime: string
  // إعدادات المناوبة الفصلية
  dutyScheduleReminderEnabled: boolean
  dutyScheduleMorningReminderTime: string
  dutyScheduleAfternoonReminderTime: string
  dutyScheduleDayBeforeReminder: boolean
  dutyScheduleDayBeforeReminderTime: string
  dutyScheduleReminderChannels: string[]
}

const DEFAULT_FORM: SettingsFormState = {
  reminderNotificationsEnabled: true,
  reminderLeadMinutes: '45',
  reminderChannels: ['whatsapp'],
  reminderRepeatIntervalMinutes: '',
  reminderRepeatCount: '0',
  sendTime: '06:00',
  dutyScheduleReminderEnabled: false,
  dutyScheduleMorningReminderTime: '06:00',
  dutyScheduleAfternoonReminderTime: '13:00',
  dutyScheduleDayBeforeReminder: false,
  dutyScheduleDayBeforeReminderTime: '20:00',
  dutyScheduleReminderChannels: ['whatsapp'],
}

function mapRecordToForm(record: DutyRosterSettingsRecord | undefined): SettingsFormState {
  if (!record) return DEFAULT_FORM

  return {
    reminderNotificationsEnabled: Boolean(record.reminder_notifications_enabled),
    reminderLeadMinutes: String(record.reminder_lead_minutes ?? '45'),
    reminderChannels: Array.isArray(record.reminder_channels) && record.reminder_channels.length > 0
      ? record.reminder_channels.map((channel) => String(channel))
      : ['whatsapp'],
    reminderRepeatIntervalMinutes: record.reminder_repeat_interval_minutes
      ? String(record.reminder_repeat_interval_minutes)
      : '',
    reminderRepeatCount: record.reminder_repeat_count ? String(record.reminder_repeat_count) : '0',
    sendTime: record.auto_generate_time ? record.auto_generate_time.slice(0, 5) : '06:00',
    dutyScheduleReminderEnabled: Boolean(record.duty_schedule_reminder_enabled),
    dutyScheduleMorningReminderTime: record.duty_schedule_morning_reminder_time
      ? record.duty_schedule_morning_reminder_time.slice(0, 5)
      : '06:00',
    dutyScheduleAfternoonReminderTime: record.duty_schedule_afternoon_reminder_time
      ? record.duty_schedule_afternoon_reminder_time.slice(0, 5)
      : '13:00',
    dutyScheduleDayBeforeReminder: Boolean(record.duty_schedule_day_before_reminder),
    dutyScheduleDayBeforeReminderTime: record.duty_schedule_day_before_reminder_time
      ? record.duty_schedule_day_before_reminder_time.slice(0, 5)
      : '20:00',
    dutyScheduleReminderChannels: Array.isArray(record.duty_schedule_reminder_channels) && record.duty_schedule_reminder_channels.length > 0
      ? record.duty_schedule_reminder_channels.map((c) => String(c))
      : ['whatsapp'],
  }
}

type DutyRosterSettingsModalProps = {
  open: boolean
  onClose: () => void
}

export function DutyRosterSettingsModal({ open, onClose }: DutyRosterSettingsModalProps) {
  const settingsQuery = useDutyRosterSettingsQuery()
  const updateSettingsMutation = useUpdateDutyRosterSettingsMutation()
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_FORM)

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(mapRecordToForm(settingsQuery.data))
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (!open) return

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [open, onClose])

  if (!open) return null

  const isLoading = settingsQuery.isLoading
  const isSaving = updateSettingsMutation.isPending
  const isReminderControlsDisabled = !form.reminderNotificationsEnabled
  const isDutyScheduleControlsDisabled = !form.dutyScheduleReminderEnabled

  const handleInputChange = (field: keyof SettingsFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCheckboxChange = (field: keyof SettingsFormState, checked: boolean) => {
    setForm((current) => ({
      ...current,
      [field]: checked,
    }))
  }

  const handleChannelToggle = (value: string, checked: boolean) => {
    setForm((current) => {
      const set = new Set(current.reminderChannels)
      if (checked) {
        set.add(value)
      } else {
        set.delete(value)
      }
      const nextValues = Array.from(set)
      return {
        ...current,
        reminderChannels: nextValues.length > 0 ? nextValues : ['whatsapp'],
      }
    })
  }

  const handleDutyScheduleChannelToggle = (value: string, checked: boolean) => {
    setForm((current) => {
      const set = new Set(current.dutyScheduleReminderChannels)
      if (checked) {
        set.add(value)
      } else {
        set.delete(value)
      }
      const nextValues = Array.from(set)
      return {
        ...current,
        dutyScheduleReminderChannels: nextValues.length > 0 ? nextValues : ['whatsapp'],
      }
    })
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const payload: DutyRosterSettingsUpdatePayload = {
      auto_generate_enabled: false,
      auto_generate_time: form.sendTime || '06:00',
      reminder_notifications_enabled: form.reminderNotificationsEnabled,
      reminder_lead_minutes: form.reminderLeadMinutes ? Number(form.reminderLeadMinutes) : 45,
      reminder_channels: form.reminderChannels,
      reminder_repeat_interval_minutes: form.reminderRepeatIntervalMinutes
        ? Number(form.reminderRepeatIntervalMinutes)
        : null,
      reminder_repeat_count: form.reminderRepeatCount ? Number(form.reminderRepeatCount) : 0,
      // إعدادات المناوبة الفصلية
      duty_schedule_reminder_enabled: form.dutyScheduleReminderEnabled,
      duty_schedule_morning_reminder_time: form.dutyScheduleMorningReminderTime || null,
      duty_schedule_afternoon_reminder_time: form.dutyScheduleAfternoonReminderTime || null,
      duty_schedule_day_before_reminder: form.dutyScheduleDayBeforeReminder,
      duty_schedule_day_before_reminder_time: form.dutyScheduleDayBeforeReminderTime || null,
      duty_schedule_reminder_channels: form.dutyScheduleReminderChannels,
    }

    updateSettingsMutation.mutate(payload, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إعدادات التذكير</h2>
              <p className="text-xs text-muted">تحكم في إرسال رسائل التذكير للمعلمين</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            جارٍ تحميل الإعدادات...
          </div>
        ) : (
          <form className="max-h-[70vh] space-y-5 overflow-y-auto p-6" onSubmit={handleSubmit}>
            {/* ═══════════════ إعدادات الإشراف اليومي ═══════════════ */}
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <BellRing className="h-4 w-4 text-indigo-500" />
              إعدادات تذكيرات الإشراف اليومي
            </div>

            {/* تفعيل التذكيرات */}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                id="reminder-notifications-enabled"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={form.reminderNotificationsEnabled}
                onChange={(event) => handleCheckboxChange('reminderNotificationsEnabled', event.target.checked)}
                disabled={isSaving}
              />
              <label htmlFor="reminder-notifications-enabled" className="space-y-1">
                <span className="text-sm font-semibold text-slate-800">
                  تفعيل رسائل التذكير
                </span>
                <span className="block text-xs text-slate-500">
                  أرسل رسالة تذكير للمعلم قبل بداية المناوبة بالمدة التي تحددها.
                </span>
              </label>
            </div>

            {/* وقت الإرسال */}
            <div className="space-y-2">
              <label htmlFor="send-time" className="text-sm font-semibold text-slate-700">
                وقت إرسال التذكيرات اليومية
              </label>
              <input
                id="send-time"
                type="time"
                value={form.sendTime}
                onChange={(event) => handleInputChange('sendTime', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                disabled={isSaving || isReminderControlsDisabled}
              />
              <p className="text-xs text-muted">يتم إرسال التذكيرات تلقائياً في هذا الوقت كل يوم</p>
            </div>

            {/* قنوات التذكير */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-700">قنوات التذكير</legend>
              <div className="flex flex-wrap gap-3">
                {REMINDER_CHANNEL_OPTIONS.map((option) => {
                  const checked = form.reminderChannels.includes(option.value)
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleChannelToggle(option.value, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={isSaving || isReminderControlsDisabled}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* إعادة الإرسال */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="reminder-repeat-interval" className="text-sm text-slate-600">
                  فاصل إعادة الإرسال (بالدقائق)
                </label>
                <input
                  id="reminder-repeat-interval"
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  value={form.reminderRepeatIntervalMinutes}
                  onChange={(event) => handleInputChange('reminderRepeatIntervalMinutes', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="مثال: 30"
                  disabled={
                    isSaving ||
                    isReminderControlsDisabled ||
                    Number(form.reminderRepeatCount || '0') === 0
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="reminder-repeat-count" className="text-sm text-slate-600">
                  عدد مرات إعادة الإرسال
                </label>
                <input
                  id="reminder-repeat-count"
                  type="number"
                  min={0}
                  max={5}
                  value={form.reminderRepeatCount}
                  onChange={(event) => handleInputChange('reminderRepeatCount', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  disabled={isSaving || isReminderControlsDisabled}
                />
              </div>
            </div>

            {/* ═══════════════ فاصل ═══════════════ */}
            <hr className="border-slate-200" />

            {/* ═══════════════ إعدادات المناوبة الفصلية ═══════════════ */}
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Calendar className="h-4 w-4 text-emerald-500" />
              إعدادات تذكيرات المناوبة الفصلية
            </div>

            {/* تفعيل تذكيرات المناوبة */}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                id="duty-schedule-reminder-enabled"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={form.dutyScheduleReminderEnabled}
                onChange={(event) => handleCheckboxChange('dutyScheduleReminderEnabled', event.target.checked)}
                disabled={isSaving}
              />
              <label htmlFor="duty-schedule-reminder-enabled" className="space-y-1">
                <span className="text-sm font-semibold text-slate-800">
                  تفعيل تذكيرات المناوبة الفصلية
                </span>
                <span className="block text-xs text-slate-500">
                  إرسال رسائل واتساب تلقائية للمعلمين المكلفين بالمناوبة.
                </span>
              </label>
            </div>

            {/* وقت تذكير بداية الدوام */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="duty-morning-time" className="text-sm font-semibold text-slate-700">
                  تذكير بداية الدوام
                </label>
                <input
                  id="duty-morning-time"
                  type="time"
                  value={form.dutyScheduleMorningReminderTime}
                  onChange={(event) => handleInputChange('dutyScheduleMorningReminderTime', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  disabled={isSaving || isDutyScheduleControlsDisabled}
                />
                <p className="text-xs text-muted">وقت إرسال تذكير مناوبة الصباح</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="duty-afternoon-time" className="text-sm font-semibold text-slate-700">
                  تذكير نهاية الدوام
                </label>
                <input
                  id="duty-afternoon-time"
                  type="time"
                  value={form.dutyScheduleAfternoonReminderTime}
                  onChange={(event) => handleInputChange('dutyScheduleAfternoonReminderTime', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  disabled={isSaving || isDutyScheduleControlsDisabled}
                />
                <p className="text-xs text-muted">وقت إرسال تذكير مناوبة المساء</p>
              </div>
            </div>

            {/* تذكير اليوم السابق */}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <input
                id="duty-day-before-reminder"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={form.dutyScheduleDayBeforeReminder}
                onChange={(event) => handleCheckboxChange('dutyScheduleDayBeforeReminder', event.target.checked)}
                disabled={isSaving || isDutyScheduleControlsDisabled}
              />
              <label htmlFor="duty-day-before-reminder" className="space-y-1">
                <span className="text-sm font-semibold text-slate-800">
                  تذكير مسبق (اليوم السابق)
                </span>
                <span className="block text-xs text-slate-500">
                  إرسال تذكير للمعلمين في المساء السابق بمناوبة الغد.
                </span>
              </label>
            </div>

            {form.dutyScheduleDayBeforeReminder && (
              <div className="space-y-2">
                <label htmlFor="duty-day-before-time" className="text-sm font-semibold text-slate-700">
                  وقت تذكير اليوم السابق
                </label>
                <input
                  id="duty-day-before-time"
                  type="time"
                  value={form.dutyScheduleDayBeforeReminderTime}
                  onChange={(event) => handleInputChange('dutyScheduleDayBeforeReminderTime', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  disabled={isSaving || isDutyScheduleControlsDisabled}
                />
                <p className="text-xs text-muted">مثال: 20:00 لإرسال التذكير الساعة 8 مساءً</p>
              </div>
            )}

            {/* قنوات تذكير المناوبة */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-700">قنوات تذكير المناوبة</legend>
              <div className="flex flex-wrap gap-3">
                {REMINDER_CHANNEL_OPTIONS.map((option) => {
                  const checked = form.dutyScheduleReminderChannels.includes(option.value)
                  return (
                    <label
                      key={`ds-${option.value}`}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleDutyScheduleChannelToggle(option.value, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        disabled={isSaving || isDutyScheduleControlsDisabled}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* أزرار */}
            <footer className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="button-secondary min-w-[100px]"
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="button-primary min-w-[120px] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}

// زر فتح الإعدادات (للاستخدام في صفحة الإشراف)
type DutyRosterSettingsButtonProps = {
  onClick: () => void
}

export function DutyRosterSettingsButton({ onClick }: DutyRosterSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="button-secondary flex items-center gap-2"
    >
      <Settings className="h-4 w-4" />
      الإعدادات
    </button>
  )
}

// للتوافق مع الكود القديم - لم نعد نستخدمه
export function DutyRosterSettingsPanel() {
  return null
}

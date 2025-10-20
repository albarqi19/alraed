import { useEffect, useMemo, useState } from 'react'
import { AlarmClock, BellRing, Loader2 } from 'lucide-react'

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
  autoGenerateEnabled: boolean
  autoGenerateTime: string
  reminderNotificationsEnabled: boolean
  reminderLeadMinutes: string
  reminderChannels: string[]
  reminderRepeatIntervalMinutes: string
  reminderRepeatCount: string
}

const DEFAULT_FORM: SettingsFormState = {
  autoGenerateEnabled: true,
  autoGenerateTime: '',
  reminderNotificationsEnabled: true,
  reminderLeadMinutes: '45',
  reminderChannels: ['whatsapp'],
  reminderRepeatIntervalMinutes: '',
  reminderRepeatCount: '0',
}

function mapRecordToForm(record: DutyRosterSettingsRecord | undefined): SettingsFormState {
  if (!record) return DEFAULT_FORM

  return {
    autoGenerateEnabled: Boolean(record.auto_generate_enabled),
    autoGenerateTime: record.auto_generate_time ? record.auto_generate_time.slice(0, 5) : '',
    reminderNotificationsEnabled: Boolean(record.reminder_notifications_enabled),
    reminderLeadMinutes: String(record.reminder_lead_minutes ?? ''),
    reminderChannels: Array.isArray(record.reminder_channels) && record.reminder_channels.length > 0
      ? record.reminder_channels.map((channel) => String(channel))
      : ['whatsapp'],
    reminderRepeatIntervalMinutes: record.reminder_repeat_interval_minutes
      ? String(record.reminder_repeat_interval_minutes)
      : '',
    reminderRepeatCount: record.reminder_repeat_count ? String(record.reminder_repeat_count) : '0',
  }
}

export function DutyRosterSettingsPanel() {
  const settingsQuery = useDutyRosterSettingsQuery()
  const updateSettingsMutation = useUpdateDutyRosterSettingsMutation()
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_FORM)

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(mapRecordToForm(settingsQuery.data))
    }
  }, [settingsQuery.data])

  const isLoading = settingsQuery.isLoading
  const isSaving = updateSettingsMutation.isPending

  const isReminderControlsDisabled = useMemo(() => !form.reminderNotificationsEnabled, [form])

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

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const payload: DutyRosterSettingsUpdatePayload = {
      auto_generate_enabled: form.autoGenerateEnabled,
      auto_generate_time: form.autoGenerateTime ? form.autoGenerateTime : null,
      reminder_notifications_enabled: form.reminderNotificationsEnabled,
      reminder_lead_minutes: form.reminderLeadMinutes ? Number(form.reminderLeadMinutes) : 0,
      reminder_channels: form.reminderChannels,
      reminder_repeat_interval_minutes: form.reminderRepeatIntervalMinutes
        ? Number(form.reminderRepeatIntervalMinutes)
        : null,
      reminder_repeat_count: form.reminderRepeatCount ? Number(form.reminderRepeatCount) : 0,
    }

    updateSettingsMutation.mutate(payload)
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <BellRing className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">إعدادات التذكير بمناوبات المعلمين</h2>
          <p className="text-sm text-slate-500">
            تحكم في إنشاء المناوبات التلقائي وجدولة رسائل التذكير قبل بداية المناوبة.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          جارٍ تحميل الإعدادات...
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="auto-generate-enabled"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.autoGenerateEnabled}
                  onChange={(event) => handleCheckboxChange('autoGenerateEnabled', event.target.checked)}
                  disabled={isSaving}
                />
                <label htmlFor="auto-generate-enabled" className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <AlarmClock className="h-4 w-4 text-indigo-500" />
                    إنشاء المناوبات اليومية تلقائياً
                  </span>
                  <span className="block text-xs text-slate-500">
                    عند التفعيل، يتم إنشاء المناوبات اليومية من القوالب الفعالة بمجرد دخول اليوم الجديد.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label htmlFor="auto-generate-time" className="text-sm text-slate-600">
                  توقيت الإنشاء
                </label>
                <input
                  id="auto-generate-time"
                  type="time"
                  value={form.autoGenerateTime}
                  onChange={(event) => handleInputChange('autoGenerateTime', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  disabled={isSaving || !form.autoGenerateEnabled}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="reminder-notifications-enabled"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={form.reminderNotificationsEnabled}
                  onChange={(event) => handleCheckboxChange('reminderNotificationsEnabled', event.target.checked)}
                  disabled={isSaving}
                />
                <label htmlFor="reminder-notifications-enabled" className="space-y-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <BellRing className="h-4 w-4 text-indigo-500" />
                    تفعيل رسائل التذكير للمناوبات
                  </span>
                  <span className="block text-xs text-slate-500">
                    أرسل رسالة تذكير للمعلم قبل بداية المناوبة بالمدة التي تحددها هنا.
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="reminder-lead-minutes" className="text-sm text-slate-600">
                    وقت التذكير قبل المناوبة (بالدقائق)
                  </label>
                  <input
                    id="reminder-lead-minutes"
                    type="number"
                    min={0}
                    max={720}
                    step={5}
                    value={form.reminderLeadMinutes}
                    onChange={(event) => handleInputChange('reminderLeadMinutes', event.target.value)}
                    className="w-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                    disabled={isSaving || isReminderControlsDisabled}
                  />
                </div>

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

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-600">
                    <span>فاصل إعادة الإرسال (بالدقائق)</span>
                    <input
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
                  </label>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span>عدد مرات إعادة الإرسال</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={form.reminderRepeatCount}
                      onChange={(event) => handleInputChange('reminderRepeatCount', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                      disabled={isSaving || isReminderControlsDisabled}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              className="button-primary min-w-[140px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </footer>
        </form>
      )}
    </section>
  )
}

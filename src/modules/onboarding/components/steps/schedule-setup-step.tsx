import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTeacherAttendanceSettings,
  updateTeacherAttendanceSettings,
  fetchSchedules,
  createSchedule,
} from '@/modules/admin/api'
import { useToast } from '@/shared/feedback/use-toast'
import type { StepComponentProps } from '../../types'

interface QuickScheduleForm {
  name: string
  type: 'winter' | 'summer' | 'custom'
  period_duration: number
  first_period_start: string
  periods_count: number
  break_after_period: number
  break_duration: number
}

const DEFAULT_SCHEDULE: QuickScheduleForm = {
  name: 'الجدول الرئيسي',
  type: 'winter',
  period_duration: 45,
  first_period_start: '07:00',
  periods_count: 7,
  break_after_period: 3,
  break_duration: 15,
}

export function ScheduleSetupStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  // إعدادات الدوام
  const [workStartTime, setWorkStartTime] = useState('06:45')
  const [workEndTime, setWorkEndTime] = useState('13:00')
  const [graceMinutes, setGraceMinutes] = useState(15)

  // الجدول الزمني
  const [scheduleForm, setScheduleForm] = useState<QuickScheduleForm>(DEFAULT_SCHEDULE)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  // جلب الإعدادات الحالية
  const { data: currentSettings } = useQuery({
    queryKey: ['admin', 'teacher-attendance', 'settings'],
    queryFn: fetchTeacherAttendanceSettings,
  })

  // جلب الجداول الحالية
  const { data: schedules = [] } = useQuery({
    queryKey: ['admin', 'schedules'],
    queryFn: fetchSchedules,
  })

  // تحديث الإعدادات من الـ API
  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.start_time) setWorkStartTime(currentSettings.start_time)
      if (currentSettings.end_time) setWorkEndTime(currentSettings.end_time)
      if (currentSettings.grace_minutes) setGraceMinutes(currentSettings.grace_minutes)
    }
  }, [currentSettings])

  // حفظ إعدادات الدوام
  const saveSettingsMutation = useMutation({
    mutationFn: updateTeacherAttendanceSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-attendance', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] })
      toast({ title: 'تم حفظ إعدادات الدوام', type: 'success' })
    },
    onError: () => {
      toast({ title: 'فشل حفظ الإعدادات', type: 'error' })
    },
  })

  // إنشاء جدول زمني
  const createScheduleMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedules'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] })
      toast({ title: 'تم إنشاء الجدول الزمني', type: 'success' })
      setShowScheduleForm(false)
    },
    onError: () => {
      toast({ title: 'فشل إنشاء الجدول', type: 'error' })
    },
  })

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      start_time: workStartTime,
      end_time: workEndTime,
      grace_minutes: graceMinutes,
    })
  }

  const handleCreateSchedule = () => {
    // توليد الحصص تلقائياً
    const periods = []
    let currentTime = scheduleForm.first_period_start

    for (let i = 1; i <= scheduleForm.periods_count; i++) {
      const startTime = currentTime
      const [hours, minutes] = startTime.split(':').map(Number)
      const endMinutes = hours * 60 + minutes + scheduleForm.period_duration
      const endTime = `${Math.floor(endMinutes / 60)
        .toString()
        .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

      periods.push({
        period_number: i,
        period_name: `الحصة ${i}`,
        start_time: startTime,
        end_time: endTime,
        is_break: false,
      })

      currentTime = endTime

      // إضافة الفسحة بعد الحصة المحددة
      if (i === scheduleForm.break_after_period && scheduleForm.break_duration > 0) {
        const breakStart = currentTime
        const [bh, bm] = breakStart.split(':').map(Number)
        const breakEndMinutes = bh * 60 + bm + scheduleForm.break_duration
        const breakEnd = `${Math.floor(breakEndMinutes / 60)
          .toString()
          .padStart(2, '0')}:${(breakEndMinutes % 60).toString().padStart(2, '0')}`

        periods.push({
          period_number: i + 0.5,
          period_name: 'الفسحة',
          start_time: breakStart,
          end_time: breakEnd,
          is_break: true,
        })

        currentTime = breakEnd
      }
    }

    const payload = {
      name: scheduleForm.name,
      type: scheduleForm.type,
      is_active: true,
      periods,
    }

    createScheduleMutation.mutate(payload)
  }

  const hasSettings = stats.has_attendance_settings || currentSettings?.start_time
  const hasSchedule = stats.schedules_count > 0 || schedules.length > 0
  const canProceed = hasSettings && hasSchedule

  return (
    <div className="space-y-4">
      {/* قسم وقت الدوام */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="ws-panel__title">
              <i className="bi bi-clock" style={{ color: 'var(--color-primary-dark)' }} />
              وقت الدوام
            </span>
            <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
              تحديد وقت بداية ونهاية الدوام المدرسي
            </span>
          </div>
          {hasSettings && (
            <span className="ws-chip ws-chip--green">
              <i className="bi bi-check" />
              تم الإعداد
            </span>
          )}
        </div>

        <div className="ws-panel__body">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="ws-field">
              <label className="ws-label">وقت بداية الدوام</label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                className="ws-input w-full"
              />
            </div>
            <div className="ws-field">
              <label className="ws-label">وقت نهاية الدوام</label>
              <input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                className="ws-input w-full"
              />
            </div>
            <div className="ws-field">
              <label className="ws-label">فترة السماح (دقيقة)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(Number(e.target.value))}
                className="ws-input w-full"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              className="ws-btn ws-btn--primary"
            >
              {saveSettingsMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <i className="bi bi-check" />
                  حفظ الإعدادات
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* قسم الجداول الزمنية */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="ws-panel__title">
              <i className="bi bi-table" style={{ color: 'var(--color-primary-dark)' }} />
              الخطط الزمنية
            </span>
            <span className="text-[11px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>
              إنشاء جدول زمني للحصص الدراسية
            </span>
          </div>
          {hasSchedule && (
            <span className="ws-chip ws-chip--green">
              <i className="bi bi-check" />
              {schedules.length} جدول
            </span>
          )}
        </div>

        {/* الجداول الموجودة */}
        {schedules.length > 0 && (
          <div className="ws-rows" style={{ borderBottom: '1px solid var(--color-hairline)' }}>
            {schedules.slice(0, 3).map((schedule) => (
              <div key={schedule.id} className="ws-row">
                <span className="flex min-w-0 items-center gap-2">
                  <i className="bi bi-calendar-week" style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="ws-row__name">{schedule.name}</span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {schedule.type === 'winter' ? 'شتوي' : schedule.type === 'summer' ? 'صيفي' : 'مخصص'}
                  </span>
                </span>
                {schedule.is_active && <span className="ws-chip ws-chip--green">نشط</span>}
              </div>
            ))}
          </div>
        )}

        <div className="ws-panel__body">
          {/* زر الإضافة */}
          {!showScheduleForm ? (
            <button
              type="button"
              onClick={() => setShowScheduleForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-semibold transition hover:[border-color:var(--color-primary-dark)] hover:[color:var(--color-primary-dark)]"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-secondary)' }}
            >
              <i className="bi bi-plus-lg" />
              إضافة جدول زمني جديد
            </button>
          ) : (
            <div
              className="space-y-3 rounded-lg border p-3"
              style={{ borderColor: 'var(--color-hairline)', background: 'var(--color-surface-2)' }}
            >
              <h5 className="text-[13px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                إضافة سريعة
              </h5>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="ws-field">
                  <label className="ws-label">اسم الجدول</label>
                  <input
                    type="text"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, name: e.target.value }))}
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">نوع الفصل</label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, type: e.target.value as 'winter' | 'summer' | 'custom' }))}
                    className="ws-select w-full"
                  >
                    <option value="winter">شتوي</option>
                    <option value="summer">صيفي</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>
                <div className="ws-field">
                  <label className="ws-label">وقت بداية أول حصة</label>
                  <input
                    type="time"
                    value={scheduleForm.first_period_start}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, first_period_start: e.target.value }))}
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">مدة الحصة (دقيقة)</label>
                  <input
                    type="number"
                    min={30}
                    max={60}
                    value={scheduleForm.period_duration}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, period_duration: Number(e.target.value) }))}
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">عدد الحصص</label>
                  <input
                    type="number"
                    min={4}
                    max={10}
                    value={scheduleForm.periods_count}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, periods_count: Number(e.target.value) }))}
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">الفسحة بعد الحصة رقم</label>
                  <input
                    type="number"
                    min={1}
                    max={scheduleForm.periods_count}
                    value={scheduleForm.break_after_period}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, break_after_period: Number(e.target.value) }))}
                    className="ws-input w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowScheduleForm(false)} className="ws-btn">
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={createScheduleMutation.isPending || !scheduleForm.name}
                  className="ws-btn ws-btn--primary"
                >
                  {createScheduleMutation.isPending ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus" />
                      إنشاء الجدول
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Button */}
      <div
        className="flex items-center justify-between border-t pt-4"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          يجب حفظ إعدادات الدوام وإنشاء جدول زمني واحد على الأقل
        </div>
      )}
    </div>
  )
}

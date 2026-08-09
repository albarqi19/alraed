import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTeacherAttendanceSettings,
  updateTeacherAttendanceSettings,
  fetchSchedules,
  createSchedule,
} from '@/modules/admin/api'
import { getErrorMessage } from '@/services/api/errors'
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

const MIN_PERIODS = 1
const MAX_PERIODS = 12

interface GeneratedPeriod {
  period_number: number
  period_name: string
  start_time: string
  end_time: string
  is_break: boolean
  break_duration?: number
}

/** إضافة دقائق إلى وقت بصيغة HH:MM ضمن اليوم نفسه */
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * توليد فترات الجدول وفق اصطلاح الترقيم المعتمد في الباك:
 *   - الحصص تحمل أرقاماً متصلة 1..N (هي مفتاح ربط الجلسات والحضور).
 *   - الفسحة ترث رقم الحصة التي تسبقها مع is_break = true، فلا تستهلك رقماً
 *     ولا تزيح ما بعدها.
 *
 * كانت النسخة السابقة تعطي الفسحة رقماً كسرياً (3.5) فيرفض الباك الطلب كله
 * (period_number يجب أن يكون صحيحاً) ولا يُنشأ أي جدول إطلاقاً.
 */
export function generateQuickPeriods(form: QuickScheduleForm): GeneratedPeriod[] {
  const periods: GeneratedPeriod[] = []
  let cursor = form.first_period_start

  const hasBreak =
    form.break_duration > 0 &&
    form.break_after_period >= 1 &&
    form.break_after_period < form.periods_count

  for (let lesson = 1; lesson <= form.periods_count; lesson++) {
    const startTime = cursor
    const endTime = addMinutes(startTime, form.period_duration)

    periods.push({
      period_number: lesson,
      period_name: `الحصة ${lesson}`,
      start_time: startTime,
      end_time: endTime,
      is_break: false,
    })

    cursor = endTime

    if (hasBreak && lesson === form.break_after_period) {
      const breakEnd = addMinutes(cursor, form.break_duration)

      periods.push({
        period_number: lesson, // ترث رقم الحصة السابقة عمداً
        period_name: 'الفسحة',
        start_time: cursor,
        end_time: breakEnd,
        is_break: true,
        break_duration: form.break_duration,
      })

      cursor = breakEnd
    }
  }

  return periods
}

export function ScheduleSetupStep({
  onComplete,
  onSkip,
  stats,
  isCompleting,
  isSkipping,
}: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  // إعدادات الدوام
  const [workStartTime, setWorkStartTime] = useState('06:45')
  const [workEndTime, setWorkEndTime] = useState('13:00')
  const [graceMinutes, setGraceMinutes] = useState(15)
  /** هل حُفظت الإعدادات فعلاً في هذه الجلسة؟ */
  const [settingsJustSaved, setSettingsJustSaved] = useState(false)

  // الجدول الزمني
  const [scheduleForm, setScheduleForm] = useState<QuickScheduleForm>(DEFAULT_SCHEDULE)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  const { data: currentSettings } = useQuery({
    queryKey: ['admin', 'teacher-attendance', 'settings'],
    queryFn: fetchTeacherAttendanceSettings,
  })

  const { data: schedules = [] } = useQuery({
    queryKey: ['admin', 'schedules'],
    queryFn: fetchSchedules,
  })

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.start_time) setWorkStartTime(currentSettings.start_time)
      if (currentSettings.end_time) setWorkEndTime(currentSettings.end_time)
      if (currentSettings.grace_minutes) setGraceMinutes(currentSettings.grace_minutes)
    }
  }, [currentSettings])

  const saveSettingsMutation = useMutation({
    mutationFn: updateTeacherAttendanceSettings,
    onSuccess: () => {
      setSettingsJustSaved(true)
      queryClient.invalidateQueries({ queryKey: ['admin', 'teacher-attendance', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding'] })
      toast({ title: 'تم حفظ إعدادات الدوام', type: 'success' })
    },
    onError: (error) => {
      toast({ title: getErrorMessage(error, 'فشل حفظ إعدادات الدوام'), type: 'error' })
    },
  })

  const createScheduleMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedules'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding'] })
      toast({ title: 'تم إنشاء الجدول الزمني وتفعيله', type: 'success' })
      setShowScheduleForm(false)
    },
    onError: (error) => {
      toast({ title: getErrorMessage(error, 'فشل إنشاء الجدول الزمني'), type: 'error' })
    },
  })

  const handleSaveSettings = () => {
    if (workEndTime <= workStartTime) {
      toast({ title: 'وقت نهاية الدوام يجب أن يكون بعد وقت البداية', type: 'error' })
      return
    }

    saveSettingsMutation.mutate({
      start_time: workStartTime,
      end_time: workEndTime,
      grace_minutes: graceMinutes,
    })
  }

  const previewPeriods = useMemo(() => generateQuickPeriods(scheduleForm), [scheduleForm])
  const lastPeriod = previewPeriods[previewPeriods.length - 1]

  const handleCreateSchedule = () => {
    if (!scheduleForm.name.trim()) {
      toast({ title: 'أدخل اسم الجدول', type: 'error' })
      return
    }

    createScheduleMutation.mutate({
      name: scheduleForm.name.trim(),
      type: scheduleForm.type,
      is_active: true,
      periods: previewPeriods,
    })
  }

  // الباك يشترط سجل إعدادات محفوظاً فعلاً في القاعدة. نقطة النهاية ترجع قيماً
  // افتراضية للسجل غير المحفوظ، فالاعتماد على وجود start_time في الاستجابة كان
  // يُظهر الخطوة مكتملة بينما يرفضها الباك — زرٌّ يبدو نشطاً ولا يفعل شيئاً.
  const hasSettings = stats.has_attendance_settings || settingsJustSaved
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
          {hasSettings ? (
            <span className="ws-chip ws-chip--green">
              <i className="bi bi-check" />
              محفوظ
            </span>
          ) : (
            <span className="ws-chip ws-chip--amber">يحتاج حفظ</span>
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
                onChange={(e) => setGraceMinutes(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                className="ws-input w-full"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            {!hasSettings && (
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                اضغط «حفظ الإعدادات» لاعتماد وقت الدوام
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              className="ws-btn ws-btn--primary mr-auto"
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
                    onChange={(e) =>
                      setScheduleForm((f) => ({ ...f, type: e.target.value as QuickScheduleForm['type'] }))
                    }
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
                    onChange={(e) =>
                      setScheduleForm((f) => ({ ...f, first_period_start: e.target.value || '07:00' }))
                    }
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">مدة الحصة (دقيقة)</label>
                  <input
                    type="number"
                    min={20}
                    max={90}
                    value={scheduleForm.period_duration}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        period_duration: Math.max(20, Math.min(90, Number(e.target.value) || 20)),
                      }))
                    }
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">عدد الحصص</label>
                  <input
                    type="number"
                    min={MIN_PERIODS}
                    max={MAX_PERIODS}
                    value={scheduleForm.periods_count}
                    onChange={(e) =>
                      setScheduleForm((f) => {
                        const count = Math.max(
                          MIN_PERIODS,
                          Math.min(MAX_PERIODS, Number(e.target.value) || MIN_PERIODS),
                        )
                        return {
                          ...f,
                          periods_count: count,
                          // إبقاء الفسحة داخل نطاق الحصص
                          break_after_period: Math.min(f.break_after_period, Math.max(1, count - 1)),
                        }
                      })
                    }
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">الفسحة بعد الحصة رقم</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, scheduleForm.periods_count - 1)}
                    value={scheduleForm.break_after_period}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        break_after_period: Math.max(
                          1,
                          Math.min(Math.max(1, f.periods_count - 1), Number(e.target.value) || 1),
                        ),
                      }))
                    }
                    className="ws-input w-full"
                  />
                </div>
                <div className="ws-field">
                  <label className="ws-label">مدة الفسحة (دقيقة)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={scheduleForm.break_duration}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        break_duration: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                      }))
                    }
                    className="ws-input w-full"
                  />
                  <span className="text-[10.5px]" style={{ color: 'var(--color-text-secondary)' }}>
                    صفر = بلا فسحة
                  </span>
                </div>
              </div>

              {/* معاينة: يرى المدير الناتج قبل الحفظ بدل أن يكتشفه بعده */}
              <div
                className="rounded-lg border p-2.5"
                style={{ borderColor: 'var(--color-hairline)', background: 'var(--color-surface)' }}
              >
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    معاينة الجدول
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    ينتهي الدوام {lastPeriod ? lastPeriod.end_time : '—'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {previewPeriods.map((period, index) => (
                    <span
                      key={`${period.period_number}-${period.is_break ? 'b' : 'p'}-${index}`}
                      className={`ws-chip ${period.is_break ? 'ws-chip--amber' : ''}`}
                    >
                      {period.period_name} · {period.start_time}–{period.end_time}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowScheduleForm(false)} className="ws-btn">
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={createScheduleMutation.isPending || !scheduleForm.name.trim()}
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
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي وإكمالها لاحقاً'}
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
          {!hasSettings && !hasSchedule
            ? 'احفظ إعدادات الدوام وأنشئ جدولاً زمنياً واحداً على الأقل'
            : !hasSettings
              ? 'اضغط «حفظ الإعدادات» لاعتماد وقت الدوام'
              : 'أنشئ جدولاً زمنياً واحداً على الأقل'}
        </div>
      )}
    </div>
  )
}

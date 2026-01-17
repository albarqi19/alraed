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

    const payload: SchedulePayload = {
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
    <div className="space-y-6">
      {/* قسم وقت الدوام */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-800">
              <i className="bi bi-clock ml-2 text-teal-500" />
              وقت الدوام
            </h4>
            <p className="text-sm text-slate-500">تحديد وقت بداية ونهاية الدوام المدرسي</p>
          </div>
          {hasSettings && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <i className="bi bi-check ml-1" />
              تم الإعداد
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">وقت بداية الدوام</label>
            <input
              type="time"
              value={workStartTime}
              onChange={(e) => setWorkStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">وقت نهاية الدوام</label>
            <input
              type="time"
              value={workEndTime}
              onChange={(e) => setWorkEndTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">فترة السماح (دقيقة)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saveSettingsMutation.isPending}
            className="button-primary text-sm"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

      {/* قسم الجداول الزمنية */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-800">
              <i className="bi bi-table ml-2 text-amber-500" />
              الخطط الزمنية
            </h4>
            <p className="text-sm text-slate-500">إنشاء جدول زمني للحصص الدراسية</p>
          </div>
          {hasSchedule && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <i className="bi bi-check ml-1" />
              {schedules.length} جدول
            </span>
          )}
        </div>

        {/* الجداول الموجودة */}
        {schedules.length > 0 && (
          <div className="mb-4 space-y-2">
            {schedules.slice(0, 3).map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <i className="bi bi-calendar-week text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-700">{schedule.name}</p>
                    <p className="text-xs text-slate-500">
                      {schedule.type === 'winter' ? 'شتوي' : schedule.type === 'summer' ? 'صيفي' : 'مخصص'}
                    </p>
                  </div>
                </div>
                {schedule.is_active && (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">نشط</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* زر الإضافة */}
        {!showScheduleForm ? (
          <button
            type="button"
            onClick={() => setShowScheduleForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-slate-500 transition hover:border-teal-300 hover:text-teal-600"
          >
            <i className="bi bi-plus-lg" />
            إضافة جدول زمني جديد
          </button>
        ) : (
          <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4">
            <h5 className="font-semibold text-slate-700">إضافة سريعة</h5>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">اسم الجدول</label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">نوع الفصل</label>
                <select
                  value={scheduleForm.type}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, type: e.target.value as 'winter' | 'summer' | 'custom' }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                >
                  <option value="winter">شتوي</option>
                  <option value="summer">صيفي</option>
                  <option value="custom">مخصص</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">وقت بداية أول حصة</label>
                <input
                  type="time"
                  value={scheduleForm.first_period_start}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, first_period_start: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">مدة الحصة (دقيقة)</label>
                <input
                  type="number"
                  min={30}
                  max={60}
                  value={scheduleForm.period_duration}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, period_duration: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">عدد الحصص</label>
                <input
                  type="number"
                  min={4}
                  max={10}
                  value={scheduleForm.periods_count}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, periods_count: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">الفسحة بعد الحصة رقم</label>
                <input
                  type="number"
                  min={1}
                  max={scheduleForm.periods_count}
                  value={scheduleForm.break_after_period}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, break_after_period: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowScheduleForm(false)} className="button-secondary text-sm">
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateSchedule}
                disabled={createScheduleMutation.isPending || !scheduleForm.name}
                className="button-primary text-sm"
              >
                {createScheduleMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يجب حفظ إعدادات الدوام وإنشاء جدول زمني واحد على الأقل
        </p>
      )}
    </div>
  )
}

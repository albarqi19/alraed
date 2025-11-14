import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { TeacherScheduleDayLimits, TeacherScheduleDayLimitsResponse } from '../types'

const fallbackDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
const fallbackMaxPeriods = 8

type TeacherDayLimitsDialogProps = {
  open: boolean
  data?: TeacherScheduleDayLimitsResponse | null
  isLoading?: boolean
  isSaving?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (limits: TeacherScheduleDayLimits) => void
  onRefresh: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function buildLimits(
  days: string[],
  source: TeacherScheduleDayLimits | undefined,
  maxPeriods: number,
): TeacherScheduleDayLimits {
  return days.reduce<TeacherScheduleDayLimits>((acc, day) => {
    const parsed = typeof source?.[day] === 'number' ? Number(source?.[day]) : maxPeriods
    acc[day] = clamp(Number.isNaN(parsed) ? maxPeriods : parsed, 0, maxPeriods)
    return acc
  }, {})
}

export function TeacherDayLimitsDialog({
  open,
  data,
  isLoading = false,
  isSaving = false,
  error,
  onClose,
  onSubmit,
  onRefresh,
}: TeacherDayLimitsDialogProps) {
  const effectiveDays = data?.defaults.days ?? fallbackDays
  const maxPeriods = data?.defaults.max_periods ?? fallbackMaxPeriods

  const [formLimits, setFormLimits] = useState<TeacherScheduleDayLimits>(() =>
    buildLimits(effectiveDays, data?.day_limits, maxPeriods),
  )

  const configuredMax = useMemo(() => {
    if (effectiveDays.length === 0) return maxPeriods
    return effectiveDays.reduce((maxValue, day) => {
      const value = formLimits[day] ?? maxPeriods
      return value > maxValue ? value : maxValue
    }, 0)
  }, [effectiveDays, formLimits, maxPeriods])

  useEffect(() => {
    if (!open) return
    setFormLimits(buildLimits(effectiveDays, data?.day_limits, maxPeriods))
  }, [open, data, effectiveDays, maxPeriods])

  const hasData = Boolean(data)
  const isBusy = isLoading || (isSaving && !hasData)

  const averageLoad = useMemo(() => {
    const total = effectiveDays.reduce((sum, day) => sum + (formLimits[day] ?? 0), 0)
    return (total / effectiveDays.length).toFixed(1)
  }, [effectiveDays, formLimits])

  const handleInputChange = (day: string, value: string) => {
    const parsed = Number(value)
    setFormLimits((prev) => ({
      ...prev,
      [day]: clamp(Number.isNaN(parsed) ? 0 : parsed, 0, maxPeriods),
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(formLimits)
  }

  const handleResetDefaults = () => {
    setFormLimits(buildLimits(effectiveDays, undefined, maxPeriods))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6" role="dialog" aria-modal>
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-4 text-right">
          <p className="text-xs font-semibold text-slate-500">التحكم في الحد اليومي للحصص</p>
          <h2 className="text-2xl font-bold text-slate-900">ضبط عدد الحصص لكل يوم</h2>
          <p className="mt-1 text-sm text-muted">
            سيتم استخدام هذه الحدود أثناء اقتراحات النقل الذكي لمنع الحصص الإضافية في الأيام المزدحمة.
          </p>
          <button
            type="button"
            className="absolute left-6 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="إغلاق"
            onClick={onClose}
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col divide-y divide-slate-100">
          <section className="space-y-4 px-6 py-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <div>
                <p>
                  الحد الحالي للأيام: <span className="font-semibold text-slate-900">{configuredMax} حصص</span>
                </p>
                <p>
                  متوسط الحمل الحالي: <span className="font-semibold text-slate-900">{averageLoad} حصص</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-secondary" onClick={onRefresh} disabled={isLoading}>
                  {isLoading ? 'جارٍ التحديث...' : 'تحديث القيم'}
                </button>
                <button type="button" className="button-secondary" onClick={handleResetDefaults}>
                  إعادة ضبط القيم
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                تعذر تحميل القيم الحالية: {error}
              </div>
            ) : null}

            {hasData ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {effectiveDays.map((day) => (
                  <label
                    key={day}
                    className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 text-right shadow-sm"
                  >
                    <span className="text-sm font-semibold text-slate-900">{day}</span>
                    <span className="text-xs text-slate-500">أقصى عدد حصص في هذا اليوم</span>
                    <input
                      type="number"
                      min={0}
                      max={maxPeriods}
                      step={1}
                      value={formLimits[day] ?? maxPeriods}
                      onChange={(event) => handleInputChange(day, event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {effectiveDays.map((day) => (
                  <div key={day} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            )}
          </section>

          <footer className="flex flex-col gap-3 px-6 py-4 text-right sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              سيتم منع اقتراح أي نقل يؤدي إلى تجاوز الحدود المحددة لكل يوم.
            </div>
            <div className="flex flex-row-reverse gap-2">
              <button type="button" className="button-secondary" onClick={onClose} disabled={isSaving}>
                إلغاء
              </button>
              <button type="submit" className="button-primary" disabled={isBusy}>
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ الحدود'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

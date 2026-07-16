import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { RefreshCcw, Settings2, X } from 'lucide-react'
import { WsAlert, WsBtn, WsInput } from '@/shared/workspace'
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
    <div className="ws-modal" role="dialog" aria-modal onClick={onClose}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head" style={{ position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--ws-accent-2)' }}>
            <Settings2 style={{ width: 12, height: 12 }} />
            التحكم في الحد اليومي للحصص
          </span>
          <h3 className="ws-modal__title" style={{ fontSize: 15 }}>ضبط عدد الحصص لكل يوم</h3>
          <p className="ws-modal__sub">
            سيتم استخدام هذه الحدود أثناء اقتراحات النقل الذكي لمنع الحصص الإضافية في الأيام المزدحمة.
          </p>
          <button
            type="button"
            className="ws-icon-btn"
            style={{ position: 'absolute', insetInlineEnd: 12, top: 10 }}
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="ws-modal__body" style={{ overflowY: 'auto', maxHeight: '58vh' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface-2)',
                padding: '9px 12px',
                fontSize: 11.5,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>
                  الحد الحالي للأيام: <b>{configuredMax} حصص</b>
                </span>
                <span>
                  متوسط الحمل الحالي: <b>{averageLoad} حصص</b>
                </span>
              </span>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <WsBtn size="sm" icon={RefreshCcw} onClick={onRefresh} disabled={isLoading}>
                  {isLoading ? 'جارٍ التحديث...' : 'تحديث القيم'}
                </WsBtn>
                <WsBtn size="sm" onClick={handleResetDefaults}>
                  إعادة ضبط القيم
                </WsBtn>
              </span>
            </div>

            {error ? <WsAlert boxed>تعذر تحميل القيم الحالية: {error}</WsAlert> : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {effectiveDays.map((day) =>
                hasData ? (
                  <label
                    key={day}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      borderRadius: 8,
                      border: '1px solid var(--ws-hairline)',
                      padding: '8px 10px',
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{day}</span>
                    <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>أقصى عدد حصص في هذا اليوم</span>
                    <WsInput
                      type="number"
                      min={0}
                      max={maxPeriods}
                      step={1}
                      value={formLimits[day] ?? maxPeriods}
                      onChange={(event) => handleInputChange(day, event.target.value)}
                      style={{ marginTop: 4, fontWeight: 700 }}
                    />
                  </label>
                ) : (
                  <div
                    key={day}
                    style={{
                      height: 84,
                      borderRadius: 8,
                      background: 'var(--ws-surface-2)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                ),
              )}
            </div>
          </div>

          <footer className="ws-modal__foot" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)', textAlign: 'right' }}>
              سيتم منع اقتراح أي نقل يؤدي إلى تجاوز الحدود المحددة لكل يوم.
            </span>
            <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
              <WsBtn onClick={onClose} disabled={isSaving}>
                إلغاء
              </WsBtn>
              <WsBtn type="submit" variant="primary" disabled={isBusy}>
                {isSaving ? 'جارٍ الحفظ...' : 'حفظ الحدود'}
              </WsBtn>
            </span>
          </footer>
        </form>
      </div>
    </div>
  )
}

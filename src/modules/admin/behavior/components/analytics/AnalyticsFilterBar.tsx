import { useState, useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Filter, RotateCcw, Calendar } from 'lucide-react'
import type { AnalyticsFilterParams } from '@/modules/admin/behavior/api'

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterParams
  onFiltersChange: (filters: AnalyticsFilterParams) => void
  availableGrades: string[]
  availableClasses: string[]
}

type PeriodOption = 'week' | 'month' | 'semester' | 'year' | 'custom'

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'semester', label: 'هذا الفصل' },
  { value: 'year', label: 'هذا العام' },
  { value: 'custom', label: 'مخصص' },
]

const DEGREE_OPTIONS = [
  { value: 'all', label: 'جميع الدرجات' },
  { value: '1', label: 'الأولى' },
  { value: '2', label: 'الثانية' },
  { value: '3', label: 'الثالثة' },
  { value: '4', label: 'الرابعة' },
]

const DEFAULT_FILTERS: AnalyticsFilterParams = {
  period: 'month',
  start_date: undefined,
  end_date: undefined,
  grade: undefined,
  class_name: undefined,
  degree: undefined,
}

export default function AnalyticsFilterBar({
  filters,
  onFiltersChange,
  availableGrades,
  availableClasses,
}: AnalyticsFilterBarProps) {
  const [activePeriod, setActivePeriod] = useState<PeriodOption>(() => {
    if (filters.start_date || filters.end_date) return 'custom'
    return filters.period ?? 'month'
  })

  const handlePeriodChange = useCallback(
    (period: PeriodOption) => {
      setActivePeriod(period)

      if (period === 'custom') {
        // Switch to custom mode - clear the period preset, keep dates if any
        onFiltersChange({
          ...filters,
          period: undefined,
        })
      } else {
        // Use a preset period - clear custom dates
        onFiltersChange({
          ...filters,
          period: period as AnalyticsFilterParams['period'],
          start_date: undefined,
          end_date: undefined,
        })
      }
    },
    [filters, onFiltersChange],
  )

  const handleFilterChange = useCallback(
    (key: keyof AnalyticsFilterParams, value: string | number | undefined) => {
      onFiltersChange({
        ...filters,
        [key]: value,
      })
    },
    [filters, onFiltersChange],
  )

  const handleReset = useCallback(() => {
    setActivePeriod('month')
    onFiltersChange({ ...DEFAULT_FILTERS })
  }, [onFiltersChange])

  const isCustomPeriod = activePeriod === 'custom'

  return (
    <div className="glass-card" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter icon + label */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" />
          <span>تصفية</span>
        </div>

        {/* Period quick-select chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePeriodChange(option.value)}
              className={`
                inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium
                transition-all duration-200
                ${
                  activePeriod === option.value
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {option.value === 'custom' && <Calendar className="h-3 w-3" />}
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {isCustomPeriod && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.start_date ?? ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value || undefined)}
              className="h-8 w-36 text-xs"
              placeholder="من تاريخ"
            />
            <span className="text-xs text-slate-400">—</span>
            <Input
              type="date"
              value={filters.end_date ?? ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value || undefined)}
              className="h-8 w-36 text-xs"
              placeholder="إلى تاريخ"
            />
          </div>
        )}

        {/* Separator */}
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        {/* Grade select */}
        <Select
          value={filters.grade ?? 'all'}
          onValueChange={(value) => handleFilterChange('grade', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="الصف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الصفوف</SelectItem>
            {availableGrades.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Class select */}
        <Select
          value={filters.class_name ?? 'all'}
          onValueChange={(value) => handleFilterChange('class_name', value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="الفصل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفصول</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Degree select */}
        <Select
          value={filters.degree != null ? String(filters.degree) : 'all'}
          onValueChange={(value) =>
            handleFilterChange('degree', value === 'all' ? undefined : Number(value))
          }
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="درجة المخالفة" />
          </SelectTrigger>
          <SelectContent>
            {DEGREE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة تعيين
        </Button>
      </div>
    </div>
  )
}

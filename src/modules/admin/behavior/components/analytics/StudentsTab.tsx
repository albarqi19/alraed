import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStudentRiskAnalytics } from '@/modules/admin/behavior/api'
import type { AnalyticsFilterParams, StudentRiskData } from '@/modules/admin/behavior/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Shield,
} from 'lucide-react'

interface StudentsTabProps {
  filters: AnalyticsFilterParams
  activeTab: string
}

type RiskLevel = 'all' | 'critical' | 'high' | 'medium' | 'low'

const RISK_LEVEL_CONFIG: Record<
  Exclude<RiskLevel, 'all'>,
  { label: string; badgeClass: string; cardBg: string; cardText: string; cardBorder: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: 'حرج',
    badgeClass: 'bg-red-100 text-red-800',
    cardBg: 'bg-red-50',
    cardText: 'text-red-700',
    cardBorder: 'border-red-200',
    icon: ShieldAlert,
  },
  high: {
    label: 'مرتفع',
    badgeClass: 'bg-orange-100 text-orange-800',
    cardBg: 'bg-orange-50',
    cardText: 'text-orange-700',
    cardBorder: 'border-orange-200',
    icon: AlertTriangle,
  },
  medium: {
    label: 'متوسط',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    cardBg: 'bg-yellow-50',
    cardText: 'text-yellow-700',
    cardBorder: 'border-yellow-200',
    icon: Shield,
  },
  low: {
    label: 'منخفض',
    badgeClass: 'bg-green-100 text-green-800',
    cardBg: 'bg-green-50',
    cardText: 'text-green-700',
    cardBorder: 'border-green-200',
    icon: ShieldCheck,
  },
}

function RiskBadge({ riskLevel }: { riskLevel: StudentRiskData['riskLevel'] }) {
  const config = RISK_LEVEL_CONFIG[riskLevel] ?? RISK_LEVEL_CONFIG.low
  return (
    <Badge className={`${config.badgeClass} border-0 font-semibold`}>
      {config.label}
    </Badge>
  )
}

function TrendIndicator({ trend }: { trend: StudentRiskData['trend'] }) {
  if (trend === 'improving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <TrendingUp className="h-4 w-4" />
        تحسن
      </span>
    )
  }
  if (trend === 'declining') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <TrendingDown className="h-4 w-4" />
        تراجع
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
      <Minus className="h-4 w-4" />
      مستقر
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-slate-100"
          />
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-64 animate-pulse rounded-md bg-slate-100" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-slate-100" />
      </div>
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-md bg-slate-50"
          />
        ))}
      </div>
    </div>
  )
}

export default function StudentsTab({ filters, activeTab }: StudentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['behavior-student-risk', filters],
    queryFn: () => fetchStudentRiskAnalytics(filters),
    enabled: activeTab === 'students',
  })

  const filteredStudents = useMemo(() => {
    if (!data?.students) return []

    let students = data.students

    if (riskFilter !== 'all') {
      students = students.filter((s) => s.riskLevel === riskFilter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.grade.toLowerCase().includes(term) ||
          s.className.toLowerCase().includes(term),
      )
    }

    return students
  }, [data?.students, riskFilter, searchTerm])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500" dir="rtl">
        <AlertTriangle className="mb-3 h-12 w-12 text-slate-300" />
        <p className="text-sm">لا توجد بيانات</p>
      </div>
    )
  }

  const { riskSummary } = data
  const summaryCards = [
    { level: 'critical' as const, count: riskSummary.critical },
    { level: 'high' as const, count: riskSummary.high },
    { level: 'medium' as const, count: riskSummary.medium },
    { level: 'low' as const, count: riskSummary.low },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map(({ level, count }) => {
          const config = RISK_LEVEL_CONFIG[level]
          const IconComp = config.icon
          return (
            <button
              key={level}
              type="button"
              onClick={() =>
                setRiskFilter((prev) => (prev === level ? 'all' : level))
              }
              className={`
                group relative overflow-hidden rounded-xl border p-4 text-right
                transition-all duration-200 hover:shadow-md
                ${config.cardBg} ${config.cardBorder}
                ${riskFilter === level ? 'ring-2 ring-offset-1 ring-slate-400 shadow-md' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-medium ${config.cardText} opacity-80`}>
                    {config.label}
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${config.cardText}`}>
                    {count}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">طالب</p>
                </div>
                <div className={`rounded-lg p-2 ${config.cardBg} opacity-60`}>
                  <IconComp className={`h-5 w-5 ${config.cardText}`} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="بحث عن طالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pr-9 text-sm"
          />
        </div>

        <Select
          value={riskFilter}
          onValueChange={(value) => setRiskFilter(value as RiskLevel)}
        >
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="مستوى الخطر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المستويات</SelectItem>
            <SelectItem value="critical">حرج</SelectItem>
            <SelectItem value="high">مرتفع</SelectItem>
            <SelectItem value="medium">متوسط</SelectItem>
            <SelectItem value="low">منخفض</SelectItem>
          </SelectContent>
        </Select>

        {(riskFilter !== 'all' || searchTerm) && (
          <button
            type="button"
            onClick={() => {
              setRiskFilter('all')
              setSearchTerm('')
            }}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            مسح الفلاتر
          </button>
        )}

        <span className="mr-auto text-xs text-slate-500">
          {filteredStudents.length} طالب
        </span>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-slate-500">
          <Search className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm">لا توجد بيانات</p>
          {searchTerm && (
            <p className="mt-1 text-xs text-slate-400">
              جرب البحث بكلمات مختلفة
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  الطالب
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  الصف/الفصل
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">
                  المخالفات
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">
                  الخطيرة
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">
                  درجة الخطر
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">
                  الاتجاه
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">
                  خطة علاج
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.grade} - {student.className}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {student.violationCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        student.severeCount > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {student.severeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <RiskBadge riskLevel={student.riskLevel} />
                      <span className="text-[10px] font-medium text-slate-400">
                        {student.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TrendIndicator trend={student.trend} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.hasTreatmentPlan ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

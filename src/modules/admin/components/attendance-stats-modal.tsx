import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { X, Users, Clock, TrendingUp, Calendar, Award, AlertTriangle, BarChart3, PieChartIcon } from 'lucide-react'

// Types
interface AttendanceStudent {
  student_id: number
  name: string
  grade: string
  class_name: string
  count: number
}

interface AttendanceClass {
  grade: string
  class_name: string
  label: string
  count: number
}

interface AttendanceGrade {
  grade: string
  count: number
}

interface DayStats {
  day: number
  label: string
  count: number
}

interface DailyTrend {
  date: string
  label: string
  absences: number
  late: number
  present: number
}

interface WeeklyTrend {
  year: number
  week: number
  label: string
  absences: number
  late: number
}

interface StatusDistribution {
  status: string
  label: string
  count: number
  color: string
}

interface AdvancedAttendanceStats {
  summary: {
    total_absences: number
    total_late: number
    total_present: number
    total_excused: number
    today_absent: number
    today_late: number
    avg_absences_per_day: number
    avg_late_per_day: number
    semester_name?: string
    start_date?: string
    end_date?: string
    total_days?: number
  }
  top_absent_students: AttendanceStudent[]
  least_absent_students: AttendanceStudent[]
  top_late_students: AttendanceStudent[]
  least_late_students: AttendanceStudent[]
  top_absent_classes: AttendanceClass[]
  least_absent_classes: AttendanceClass[]
  top_absent_grades: AttendanceGrade[]
  least_absent_grades: AttendanceGrade[]
  top_late_classes: AttendanceClass[]
  top_late_grades: AttendanceGrade[]
  absence_by_day: DayStats[]
  late_by_day: DayStats[]
  daily_trend: DailyTrend[]
  status_distribution: StatusDistribution[]
  weekly_trend: WeeklyTrend[]
}

interface AttendanceStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

function useAdvancedAttendanceStatsQuery() {
  return useQuery<AdvancedAttendanceStats>({
    queryKey: ['attendance-reports', 'advanced-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: AdvancedAttendanceStats }>(
        '/admin/attendance-reports/advanced-stats'
      )
      return data.data
    },
  })
}

// مكون البطاقة الإحصائية
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color: 'rose' | 'amber' | 'emerald' | 'sky' | 'purple' | 'indigo'
}) {
  const colorClasses = {
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    sky: 'bg-sky-50 text-sky-600 border-sky-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }
  
  const iconColorClasses = {
    rose: 'bg-rose-100 text-rose-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }

  return (
    <div className={`rounded-2xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</p>
          {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-2 ${iconColorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// مكون بطاقة الرسم البياني
function ChartCard({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string
  icon: React.ElementType
  children: React.ReactNode 
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-indigo-100 p-1.5">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// مكون قائمة الطلاب/الفصول
function ListCard({ 
  title, 
  icon: Icon, 
  items, 
  type,
  variant = 'danger',
  emptyMessage = 'لا توجد بيانات'
}: { 
  title: string
  icon: React.ElementType
  items: AttendanceStudent[] | AttendanceClass[] | AttendanceGrade[]
  type: 'student' | 'class' | 'grade'
  variant?: 'danger' | 'success'
  emptyMessage?: string
}) {
  const badgeClass = variant === 'success' 
    ? 'bg-emerald-100 text-emerald-600' 
    : 'bg-rose-100 text-rose-600'
  
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-indigo-100 p-1.5">
          <Icon className="h-4 w-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                  {index + 1}
                </span>
                <div>
                  {type === 'student' && (
                    <>
                      <p className="text-sm font-medium text-slate-800">{(item as AttendanceStudent).name}</p>
                      <p className="text-xs text-slate-500">
                        {(item as AttendanceStudent).grade} / {(item as AttendanceStudent).class_name}
                      </p>
                    </>
                  )}
                  {type === 'class' && (
                    <p className="text-sm font-medium text-slate-800">{(item as AttendanceClass).label}</p>
                  )}
                  {type === 'grade' && (
                    <p className="text-sm font-medium text-slate-800">{(item as AttendanceGrade).grade}</p>
                  )}
                </div>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${badgeClass}`}>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Tooltip مخصص
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-slate-800">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-semibold text-slate-800">{entry.value.toLocaleString('ar-SA')}</span>
        </div>
      ))}
    </div>
  )
}

export function AttendanceStatsModal({ isOpen, onClose }: AttendanceStatsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { data, isLoading, error } = useAdvancedAttendanceStatsQuery()

  // إغلاق بـ Escape
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // إغلاق بالنقر خارج النافذة
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="my-8 w-full max-w-6xl rounded-3xl bg-gradient-to-br from-slate-50 to-white shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إحصائيات الغياب والتأخير</h2>
              <p className="text-xs text-slate-500">
                {data?.summary?.semester_name 
                  ? `إحصائيات ${data.summary.semester_name}` 
                  : 'إحصائيات الفصل الدراسي الحالي'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="text-sm text-slate-500">جاري تحميل الإحصائيات...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
              <AlertTriangle className="h-12 w-12 text-rose-500" />
              <p className="text-sm text-rose-600">حدث خطأ في تحميل الإحصائيات</p>
            </div>
          ) : !data ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
              <BarChart3 className="h-12 w-12 text-slate-300" />
              <p className="text-sm text-slate-500">لا توجد بيانات</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* الملخص */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="إجمالي الغياب"
                  value={data.summary.total_absences}
                  subtitle={`اليوم: ${data.summary.today_absent}`}
                  icon={Users}
                  color="rose"
                />
                <StatCard
                  title="إجمالي التأخير"
                  value={data.summary.total_late}
                  subtitle={`اليوم: ${data.summary.today_late}`}
                  icon={Clock}
                  color="amber"
                />
                <StatCard
                  title="معدل الغياب اليومي"
                  value={data.summary.avg_absences_per_day}
                  subtitle="طالب/يوم"
                  icon={TrendingUp}
                  color="purple"
                />
                <StatCard
                  title="معدل التأخير اليومي"
                  value={data.summary.avg_late_per_day}
                  subtitle="طالب/يوم"
                  icon={Calendar}
                  color="indigo"
                />
              </div>

              {/* الملخص الإضافي */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="إجمالي الحضور"
                  value={data.summary.total_present}
                  icon={Award}
                  color="emerald"
                />
                <StatCard
                  title="مستأذنين"
                  value={data.summary.total_excused}
                  icon={Users}
                  color="sky"
                />
              </div>

              {/* الاتجاه اليومي */}
              {data.daily_trend.length > 0 && (
                <ChartCard title="الاتجاه اليومي (آخر 14 يوم)" icon={TrendingUp}>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.daily_trend}>
                        <defs>
                          <linearGradient id="absenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="present"
                          name="حاضر"
                          stroke="#10b981"
                          fill="url(#presentGradient)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="absences"
                          name="غائب"
                          stroke="#ef4444"
                          fill="url(#absenceGradient)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="late"
                          name="متأخر"
                          stroke="#f59e0b"
                          fill="url(#lateGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {/* توزيع الحالات + أيام الأسبوع */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* توزيع الحالات */}
                {data.status_distribution.length > 0 && (
                  <ChartCard title="توزيع حالات الحضور" icon={PieChartIcon}>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.status_distribution as unknown as Array<Record<string, unknown>>}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
                          >
                            {data.status_distribution.map((entry, index) => (
                              <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                )}

                {/* الغياب حسب أيام الأسبوع */}
                {data.absence_by_day.length > 0 && (
                  <ChartCard title="الغياب حسب أيام الأسبوع" icon={Calendar}>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.absence_by_day}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="الغياب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                )}
              </div>

              {/* التأخير حسب أيام الأسبوع */}
              {data.late_by_day.length > 0 && (
                <ChartCard title="التأخير حسب أيام الأسبوع" icon={Clock}>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.late_by_day}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="التأخير" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}

              {/* أكثر الطلاب غياباً وتأخراً */}
              <div className="grid gap-4 lg:grid-cols-2">
                <ListCard
                  title="أكثر الطلاب غياباً"
                  icon={Users}
                  items={data.top_absent_students}
                  type="student"
                />
                <ListCard
                  title="أكثر الطلاب تأخراً"
                  icon={Clock}
                  items={data.top_late_students}
                  type="student"
                />
              </div>

              {/* أقل الطلاب غياباً */}
              <div className="grid gap-4 lg:grid-cols-2">
                <ListCard
                  title="الطلاب الأكثر انتظاماً (أقل غياب)"
                  icon={Award}
                  items={data.least_absent_students}
                  type="student"
                  variant="success"
                />
                <ListCard
                  title="الطلاب الأكثر التزاماً (أقل تأخر)"
                  icon={Award}
                  items={data.least_late_students}
                  type="student"
                  variant="success"
                />
              </div>

              {/* الفصول */}
              <div className="grid gap-4 lg:grid-cols-2">
                <ListCard
                  title="أكثر الفصول غياباً"
                  icon={Users}
                  items={data.top_absent_classes}
                  type="class"
                />
                <ListCard
                  title="أقل الفصول غياباً"
                  icon={Award}
                  items={data.least_absent_classes}
                  type="class"
                  variant="success"
                />
              </div>

              {/* أكثر الفصول تأخراً */}
              <ListCard
                title="أكثر الفصول تأخراً"
                icon={Clock}
                items={data.top_late_classes}
                type="class"
              />

              {/* الصفوف */}
              <div className="grid gap-4 lg:grid-cols-2">
                <ListCard
                  title="أكثر الصفوف غياباً"
                  icon={Users}
                  items={data.top_absent_grades}
                  type="grade"
                />
                <ListCard
                  title="أقل الصفوف غياباً"
                  icon={Award}
                  items={data.least_absent_grades}
                  type="grade"
                  variant="success"
                />
              </div>

              {/* أكثر الصفوف تأخراً */}
              <ListCard
                title="أكثر الصفوف تأخراً"
                icon={Clock}
                items={data.top_late_grades}
                type="grade"
              />

              {/* الاتجاه الأسبوعي */}
              {data.weekly_trend.length > 0 && (
                <ChartCard title="الاتجاه الأسبوعي (آخر 8 أسابيع)" icon={TrendingUp}>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.weekly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="absences" name="الغياب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" name="التأخير" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

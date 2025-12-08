import { useEffect, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { useAdvancedReferralStatsQuery } from '../hooks'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

interface Props {
  isOpen: boolean
  onClose: () => void
  type?: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ReferralStatsModal({ isOpen, onClose, type }: Props) {
  const { data: stats, isLoading } = useAdvancedReferralStatsQuery({ type })
  const dialogRef = useRef<HTMLDivElement>(null)

  // إغلاق عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // منع التمرير عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        ref={dialogRef}
        className="relative w-full max-w-6xl mx-4 transform overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              <i className="bi bi-graph-up me-2 text-sky-600" />
              إحصائيات الإحالات
            </h2>
            <p className="text-sm text-slate-500 mt-1">تحليل شامل لبيانات الإحالات</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <i className="bi bi-x-lg text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
            </div>
          ) : stats ? (
            <>
              {/* ملخص سريع */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <StatCard label="إجمالي الإحالات" value={stats.summary.total} color="bg-slate-100 text-slate-700" />
                <StatCard label="قيد الانتظار" value={stats.summary.pending} color="bg-yellow-100 text-yellow-700" />
                <StatCard label="قيد المعالجة" value={stats.summary.in_progress} color="bg-purple-100 text-purple-700" />
                <StatCard label="مكتملة" value={stats.summary.completed} color="bg-green-100 text-green-700" />
                        <StatCard label="اليوم" value={stats.summary.today} color="bg-sky-100 text-sky-700" />
                        <StatCard label="هذا الأسبوع" value={stats.summary.this_week} color="bg-indigo-100 text-indigo-700" />
                        <StatCard label="المعدل اليومي" value={stats.summary.avg_per_day} color="bg-rose-100 text-rose-700" />
                      </div>

                      {/* الصف الأول من الرسوم */}
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* اتجاه الإحالات الشهري */}
                        <ChartCard title="اتجاه الإحالات الشهري" icon="bi-graph-up-arrow">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={stats.monthly_trend}>
                                <defs>
                                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCount)" name="عدد الإحالات" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        {/* توزيع الأنواع */}
                        <ChartCard title="توزيع أنواع الإحالات" icon="bi-pie-chart">
                          <div className="h-64 flex items-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stats.by_type}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  paddingAngle={5}
                                  dataKey="count"
                                  nameKey="label"
                                >
                                  {stats.by_type.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                              {stats.by_type.map((item, index) => (
                                <div key={item.type} className="flex items-center gap-2 text-sm">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                  <span className="text-slate-600">{item.label}</span>
                                  <span className="font-semibold text-slate-900">({item.count})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ChartCard>
                      </div>

                      {/* الصف الثاني */}
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* الإحالات حسب الأيام */}
                        <ChartCard title="الإحالات حسب أيام الأسبوع" icon="bi-calendar-week">
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.by_day_of_week} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={60} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} name="الإحالات" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        {/* الإحالات حسب الساعات */}
                        <ChartCard title="أوقات الإحالات (ساعات اليوم)" icon="bi-clock">
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.by_hour}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} interval={1} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="الإحالات" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        {/* الإحالات حسب الجهة */}
                        <ChartCard title="الإحالات حسب الجهة المستهدفة" icon="bi-people">
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={stats.by_target_role}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={70}
                                  dataKey="count"
                                  nameKey="label"
                                  label={({ name, value }) => `${name}: ${value}`}
                                  labelLine={false}
                                >
                                  {stats.by_target_role.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>
                      </div>

                      {/* الصف الثالث - القوائم */}
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* أكثر الطلاب إحالة */}
                        <ListCard
                          title="أكثر الطلاب إحالة"
                          icon="bi-person-exclamation"
                          items={stats.top_students.map(s => ({
                            label: s.name,
                            sublabel: `${s.grade}${s.class_name ? ' / ' + s.class_name : ''}`,
                            count: s.count,
                          }))}
                          color="text-rose-600"
                        />

                        {/* أكثر المعلمين إحالة */}
                        <ListCard
                          title="أكثر المعلمين إحالة"
                          icon="bi-person-badge"
                          items={stats.top_referrers.map(r => ({
                            label: r.name,
                            sublabel: '',
                            count: r.count,
                          }))}
                          color="text-sky-600"
                        />

                        {/* المكلفون */}
                        <ListCard
                          title="المكلفون بالمتابعة"
                          icon="bi-person-check"
                          items={stats.by_assignee.map(a => ({
                            label: a.name,
                            sublabel: '',
                            count: a.count,
                          }))}
                          color="text-emerald-600"
                        />
                      </div>

                      {/* الصف الرابع - الصفوف والفصول */}
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* أكثر الصفوف إحالة */}
                        <ChartCard title="الإحالات حسب الصف الدراسي" icon="bi-mortarboard">
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.by_grade} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="grade" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} name="الإحالات" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        {/* أكثر الفصول إحالة */}
                        <ListCard
                          title="أكثر الفصول إحالة"
                          icon="bi-door-open"
                          items={stats.by_class.map(c => ({
                            label: c.label,
                            sublabel: '',
                            count: c.count,
                          }))}
                          color="text-amber-600"
                          columns={2}
                        />
                      </div>

                      {/* الصف الخامس - الحالة والأولوية */}
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* حسب الحالة */}
                        <ChartCard title="توزيع الحالات" icon="bi-flag">
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.by_status}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="العدد">
                                  {stats.by_status.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={
                                        entry.status === 'pending' ? '#eab308' :
                                        entry.status === 'in_progress' ? '#a855f7' :
                                        entry.status === 'completed' ? '#22c55e' :
                                        entry.status === 'cancelled' ? '#ef4444' :
                                        '#64748b'
                                      }
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>

                        {/* حسب الأولوية */}
                        <ChartCard title="توزيع الأولويات" icon="bi-exclamation-triangle">
                          <div className="h-48 flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-4 w-full">
                              {stats.by_priority.map((item) => (
                                <div
                                  key={item.priority}
                                  className={`p-4 rounded-xl text-center ${
                                    item.priority === 'urgent' ? 'bg-red-50 border border-red-200' :
                                    item.priority === 'high' ? 'bg-orange-50 border border-orange-200' :
                                    item.priority === 'medium' ? 'bg-blue-50 border border-blue-200' :
                                    'bg-slate-50 border border-slate-200'
                                  }`}
                                >
                                  <p className={`text-2xl font-bold ${
                                    item.priority === 'urgent' ? 'text-red-600' :
                                    item.priority === 'high' ? 'text-orange-600' :
                                    item.priority === 'medium' ? 'text-blue-600' :
                                    'text-slate-600'
                                  }`}>{item.count}</p>
                                  <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ChartCard>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-20">
                      <i className="bi bi-exclamation-triangle text-5xl text-slate-300" />
                      <p className="mt-4 text-slate-500">لا توجد بيانات</p>
                    </div>
                  )}
        </div>
      </div>
    </div>
  )
}

// مكونات مساعدة
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  )
}

function ChartCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <i className={`${icon} text-sky-600`} />
        {title}
      </h3>
      {children}
    </div>
  )
}

function ListCard({
  title,
  icon,
  items,
  color,
  columns = 1,
}: {
  title: string
  icon: string
  items: Array<{ label: string; sublabel?: string; count: number }>
  color: string
  columns?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <i className={`${icon} ${color}`} />
        {title}
      </h3>
      <div className={`space-y-2 ${columns === 2 ? 'grid grid-cols-2 gap-2 space-y-0' : ''}`}>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
        ) : (
          items.slice(0, columns === 2 ? 10 : 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-bold ${color} w-5`}>{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 truncate">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>}
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-700 bg-white px-2 py-0.5 rounded">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

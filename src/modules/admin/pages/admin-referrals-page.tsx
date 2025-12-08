import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  useAdminReferralsQuery,
  useAdminReferralStatsQuery,
  useReceiveReferralMutation,
} from '../referrals/hooks'
import type { StudentReferral, ReferralStatus, ReferralFilters } from '../referrals/types'
import { ReferralStatsModal } from '../referrals/components/ReferralStatsModal'
import { ReferralSettingsModal } from '../referrals/components/ReferralSettingsModal'

// نوع التبويب
type ReferralTab = 'teacher' | 'admin' | 'system'

// تعريف التبويبات - سيتم تصفيتها حسب نوع الصفحة
const ALL_TABS: { key: ReferralTab; label: string; icon: string; description: string }[] = [
  { key: 'teacher', label: 'إحالات المعلمين', icon: 'bi-person-workspace', description: 'إحالات الطلاب من المعلمين' },
  { key: 'admin', label: 'إحالات الإدارة', icon: 'bi-building', description: 'إحالات من وكيل شؤون الطلاب' },
  { key: 'system', label: 'إحالات النظام', icon: 'bi-robot', description: 'إحالات تلقائية من النظام' },
]

const STATUS_STYLES: Record<ReferralStatus, { bg: string; text: string; icon: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'bi-clock' },
  received: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'bi-check2' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: 'bi-gear' },
  transferred: { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'bi-arrow-repeat' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'bi-check2-circle' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-800', icon: 'bi-x-circle' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'bi-x-lg' },
}

const PRIORITY_STYLES: Record<string, { dot: string; bg: string }> = {
  low: { dot: 'bg-slate-400', bg: 'bg-slate-50' },
  medium: { dot: 'bg-blue-500', bg: 'bg-blue-50' },
  high: { dot: 'bg-orange-500', bg: 'bg-orange-50' },
  urgent: { dot: 'bg-red-500', bg: 'bg-red-50' },
}

function StatusBadge({ status, label }: { status: ReferralStatus; label: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      <i className={`${style.icon}`} />
      {label}
    </span>
  )
}

function ReferralRow({
  referral,
  onView,
  onReceive
}: {
  referral: StudentReferral
  onView: () => void
  onReceive?: () => void
}) {
  const priorityStyle = PRIORITY_STYLES[referral.priority] || PRIORITY_STYLES.medium

  return (
    <tr 
      className={`hover:bg-slate-50 transition-colors cursor-pointer ${priorityStyle.bg}`}
      onClick={onView}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${priorityStyle.dot}`} />
          <span className="font-mono text-sm text-slate-600">{referral.referral_number}</span>
        </div>
      </td>
      <td className="px-4 py-1.5">
        <p className="font-medium text-slate-900 leading-none">{referral.student?.name}</p>
        {(referral.student?.grade || referral.student?.class_name) && (
          <p className="text-xs text-slate-500 leading-none mt-1">
            {referral.student?.grade}
            {referral.student?.grade && referral.student?.class_name && ' / '}
            {referral.student?.class_name}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${referral.referral_type === 'academic_weakness'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-red-100 text-red-800'
          }`}>
          <i className={referral.referral_type === 'academic_weakness' ? 'bi-book' : 'bi-exclamation-triangle'} />
          {referral.referral_type_label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{referral.target_role_label}</span>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-600">{referral.referred_by?.name || 'غير محدد'}</p>
      </td>
      <td className="px-4 py-3">
        {referral.assigned_to ? (
          <p className="text-sm text-slate-900">{referral.assigned_to.name}</p>
        ) : (
          <span className="text-xs text-slate-400">غير معين</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={referral.status} label={referral.status_label} />
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-500">
          {new Date(referral.created_at).toLocaleDateString('ar-SA')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {referral.status === 'pending' && onReceive && (
            <button
              onClick={(e) => { e.stopPropagation(); onReceive(); }}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50"
              title="استلام"
            >
              <i className="bi bi-check2-circle" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="text-xs text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50"
          >
            عرض
          </button>
        </div>
      </td>
    </tr>
  )
}

export function AdminReferralsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<ReferralTab>('teacher')
  const [filters, setFilters] = useState<ReferralFilters>({ per_page: 15 })
  const [currentPage, setCurrentPage] = useState(1)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // تحديد نوع الصفحة
  const isBehavioralPage = location.pathname.includes('/referrals/behavioral')
  const isGuidancePage = location.pathname.includes('/referrals/guidance')

  // تحديد التبويبات المتاحة حسب نوع الصفحة
  const availableTabs = useMemo(() => {
    if (isBehavioralPage) {
      // صفحة المخالفات السلوكية: معلمين + نظام فقط (بدون إدارة)
      return ALL_TABS.filter(tab => tab.key !== 'admin')
    }
    // صفحة الضعف الدراسي أو الصفحة العامة: جميع التبويبات
    return ALL_TABS
  }, [isBehavioralPage])

  // تحديد نوع الإحالات بناءً على المسار
  useEffect(() => {
    if (isGuidancePage) {
      setFilters(prev => ({ ...prev, type: 'academic_weakness' }))
    } else if (isBehavioralPage) {
      setFilters(prev => ({ ...prev, type: 'behavioral_violation' }))
    }
  }, [isGuidancePage, isBehavioralPage])

  // إعادة تعيين الصفحة عند تغيير التبويب
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // فلاتر حسب التبويب النشط
  const tabFilters = useMemo((): ReferralFilters => {
    const baseFilters = { ...filters, page: currentPage }

    switch (activeTab) {
      case 'teacher':
        // إحالات المعلمين - referred_by_type = teacher
        return { ...baseFilters, referred_by_type: 'teacher' as const }
      case 'admin':
        // إحالات الإدارة - من وكيل شؤون الطلاب أو الأتمتة
        // نزيل فلتر النوع لإظهار إحالات السلوك والضعف الدراسي معاً
        const { type, ...filtersWithoutType } = baseFilters
        return { ...filtersWithoutType, referred_by_type: 'deputy_students' as const }
      case 'system':
        // إحالات النظام - تلقائية
        return { ...baseFilters, referred_by_type: 'system' as const }
      default:
        return baseFilters
    }
  }, [filters, activeTab, currentPage])

  // تحديد عنوان الصفحة
  const getPageTitle = () => {
    if (isGuidancePage) {
      return 'إحالات الضعف الدراسي'
    } else if (isBehavioralPage) {
      return 'إحالات المخالفات السلوكية'
    }
    return 'الإحالات'
  }

  // جلب الإحصائيات مع تمرير نوع الإحالة للفلترة
  const statsFilters = useMemo(() => {
    if (isGuidancePage) return { type: 'academic_weakness' }
    if (isBehavioralPage) return { type: 'behavioral_violation' }
    return {}
  }, [isGuidancePage, isBehavioralPage])

  const { data: referrals, isLoading, error } = useAdminReferralsQuery(tabFilters)
  
  // جلب جميع الإحالات بدون pagination لحساب الإحصائيات
  const allReferralsFilters = useMemo(() => {
    const base: ReferralFilters = { per_page: 1000 }
    if (isGuidancePage) base.type = 'academic_weakness'
    if (isBehavioralPage) base.type = 'behavioral_violation'
    // إضافة فلتر التبويب النشط
    switch (activeTab) {
      case 'teacher': base.referred_by_type = 'teacher'; break
      case 'admin': base.referred_by_type = 'deputy_students'; break
      case 'system': base.referred_by_type = 'system'; break
    }
    return base
  }, [isGuidancePage, isBehavioralPage, activeTab])
  
  const { data: allReferrals } = useAdminReferralsQuery(allReferralsFilters)
  const { data: stats } = useAdminReferralStatsQuery(statsFilters)
  const receiveMutation = useReceiveReferralMutation()

  // حساب إحصائيات الفلاتر (المحيل، المكلف، الصف)
  const filterStats = useMemo(() => {
    const items = allReferrals?.items ?? []
    
    // المحيلين مع عدد الإحالات
    const referrersMap = new Map<number, { name: string; count: number }>()
    // المكلفين مع عدد الإحالات
    const assigneesMap = new Map<number, { name: string; count: number }>()
    // الصفوف مع عدد الإحالات
    const gradesMap = new Map<string, number>()
    
    items.forEach(ref => {
      // المحيل
      if (ref.referred_by?.id) {
        const existing = referrersMap.get(ref.referred_by.id)
        if (existing) {
          existing.count++
        } else {
          referrersMap.set(ref.referred_by.id, { name: ref.referred_by.name, count: 1 })
        }
      }
      
      // المكلف
      if (ref.assigned_to?.id) {
        const existing = assigneesMap.get(ref.assigned_to.id)
        if (existing) {
          existing.count++
        } else {
          assigneesMap.set(ref.assigned_to.id, { name: ref.assigned_to.name, count: 1 })
        }
      }
      
      // الصف - نستخدم الصف فقط بغض النظر عن الفصل
      const gradeOnly = ref.student?.grade || ref.student?.classroom?.name
      if (gradeOnly) {
        gradesMap.set(gradeOnly, (gradesMap.get(gradeOnly) ?? 0) + 1)
      }
    })
    
    return {
      referrers: Array.from(referrersMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
      assignees: Array.from(assigneesMap.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count),
      grades: Array.from(gradesMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    }
  }, [allReferrals])

  // حساب عدد الإحالات لكل تبويب
  const tabCounts = useMemo(() => {
    return {
      teacher: stats?.by_referred_type?.teacher || 0,
      admin: stats?.by_referred_type?.deputy_students || 0,
      system: stats?.by_referred_type?.system || 0,
    }
  }, [stats])

  const handleReceive = async (id: number) => {
    try {
      await receiveMutation.mutateAsync(id)
    } catch (err) {
      console.error('Error receiving referral:', err)
      alert('حدث خطأ أثناء استلام الإحالة')
    }
  }

  const updateFilter = (key: keyof ReferralFilters, value: string) => {
    setCurrentPage(1) // إعادة تعيين الصفحة عند تغيير الفلتر
    setFilters((prev) => {
      // للفلاتر الرقمية (referred_by, assigned_to)
      if ((key === 'referred_by' || key === 'assigned_to') && value) {
        return { ...prev, [key]: Number(value) }
      }
      return { ...prev, [key]: value || undefined }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>
          <p className="text-sm text-slate-500">متابعة ومعالجة إحالات الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
          >
            <i className="bi bi-graph-up" />
            الإحصائيات
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <i className="bi bi-gear" />
            الإعدادات
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">إجمالي الإحالات</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-slate-500">قيد الانتظار</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
            <p className="text-xs text-slate-500">قيد المعالجة</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">مكتملة</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex gap-0" aria-label="Tabs">
            {availableTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative flex-1 px-6 py-4 text-sm font-medium transition-all
                  ${activeTab === tab.key
                    ? 'text-sky-600 bg-sky-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <i className={`${tab.icon} text-lg`} />
                  <span>{tab.label}</span>
                  {tabCounts[tab.key] > 0 && (
                    <span className={`
                      inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                      ${activeTab === tab.key
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                      }
                    `}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </div>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
          <p className="text-sm text-slate-500">
            <i className={`${availableTabs.find(t => t.key === activeTab)?.icon} me-2`} />
            {availableTabs.find(t => t.key === activeTab)?.description}
          </p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.status ?? ''}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="received">تم الاستلام</option>
              <option value="in_progress">قيد المعالجة</option>
              <option value="transferred">محولة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
            </select>

            <select
              value={filters.type ?? ''}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع الأنواع</option>
              <option value="academic_weakness">ضعف دراسي</option>
              <option value="behavioral_violation">مخالفة سلوكية</option>
            </select>

            <select
              value={filters.target_role ?? ''}
              onChange={(e) => updateFilter('target_role', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع الجهات</option>
              <option value="counselor">الموجه الطلابي</option>
              <option value="vice_principal">وكيل المدرسة</option>
              <option value="committee">اللجنة السلوكية</option>
            </select>

            <select
              value={filters.priority ?? ''}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع الأولويات</option>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>

            {/* فلتر المحيل */}
            <select
              value={filters.referred_by ?? ''}
              onChange={(e) => updateFilter('referred_by', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع المحيلين</option>
              {filterStats.referrers.map(ref => (
                <option key={ref.id} value={ref.id}>
                  {ref.name} ({ref.count})
                </option>
              ))}
            </select>

            {/* فلتر المكلف */}
            <select
              value={filters.assigned_to ?? ''}
              onChange={(e) => updateFilter('assigned_to', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع المكلفين</option>
              {filterStats.assignees.map(assignee => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} ({assignee.count})
                </option>
              ))}
            </select>

            {/* فلتر الصف */}
            <select
              value={filters.grade ?? ''}
              onChange={(e) => updateFilter('grade', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none"
            >
              <option value="">جميع الصفوف</option>
              {filterStats.grades.map(grade => (
                <option key={grade.name} value={grade.name}>
                  {grade.name} ({grade.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <i className="bi bi-exclamation-triangle text-5xl text-red-400" />
            <p className="mt-4 text-lg font-medium text-slate-600">حدث خطأ في تحميل البيانات</p>
          </div>
        ) : referrals && referrals.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">رقم الإحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الطالب</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">النوع</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الجهة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">المحيل</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">المكلف</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.items.map((referral) => (
                    <ReferralRow
                      key={referral.id}
                      referral={referral}
                      onView={() => navigate(`/admin/referrals/${referral.id}`)}
                      onReceive={referral.status === 'pending' ? () => handleReceive(referral.id) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {referrals.meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 mt-4">
                <div className="text-sm text-slate-600">
                  عرض {((referrals.meta.current_page - 1) * referrals.meta.per_page) + 1} إلى{' '}
                  {Math.min(referrals.meta.current_page * referrals.meta.per_page, referrals.meta.total)} من{' '}
                  {referrals.meta.total} إحالة
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  
                  {/* أرقام الصفحات */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: referrals.meta.last_page }, (_, i) => i + 1)
                      .filter(page => {
                        // عرض أول 3 صفحات، آخر 3 صفحات، والصفحات حول الصفحة الحالية
                        return page <= 3 || 
                               page > referrals.meta.last_page - 3 || 
                               Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, arr) => (
                        <span key={page} className="flex items-center">
                          {index > 0 && arr[index - 1] !== page - 1 && (
                            <span className="px-1 text-slate-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[32px] h-8 text-sm rounded-lg ${
                              currentPage === page
                                ? 'bg-sky-600 text-white'
                                : 'border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </span>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(referrals.meta.last_page, p + 1))}
                    disabled={currentPage === referrals.meta.last_page}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <i className={`${availableTabs.find(t => t.key === activeTab)?.icon} text-5xl text-slate-300`} />
            <p className="mt-4 text-lg font-medium text-slate-600">
              {activeTab === 'teacher' && 'لا توجد إحالات من المعلمين'}
              {activeTab === 'admin' && 'لا توجد إحالات من الإدارة'}
              {activeTab === 'system' && 'لا توجد إحالات تلقائية من النظام'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {activeTab === 'teacher' && 'ستظهر هنا الإحالات المرسلة من المعلمين'}
              {activeTab === 'admin' && 'ستظهر هنا الإحالات من وكيل شؤون الطلاب'}
              {activeTab === 'system' && 'ستظهر هنا الإحالات التلقائية عند تراكم المخالفات'}
            </p>
          </div>
        )}
      </div>

      {/* النوافذ العائمة */}
      <ReferralStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        type={filters.type}
      />
      <ReferralSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminTreatmentPlans, useAdminGuidanceStudents } from '../api/guidance-hooks'
import { useTheme } from '@/shared/themes/theme-context'
import type { TreatmentPlanFilters, ProblemType, TreatmentPlanStatus, TreatmentPlan } from '@/modules/guidance/types'

const PROBLEM_TYPES: ProblemType[] = ['سلوكية', 'دراسية', 'نفسية', 'اجتماعية', 'صحية', 'مختلطة']
const STATUSES: TreatmentPlanStatus[] = ['draft', 'active', 'suspended', 'completed', 'cancelled', 'on_hold']

const STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  draft: 'مسودة',
  active: 'نشطة',
  suspended: 'معلقة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  on_hold: 'معلقة',
}

const STATUS_COLORS: Record<TreatmentPlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-sky-50 text-sky-700 border-sky-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
}

const PROBLEM_TYPE_COLORS: Record<ProblemType, string> = {
  'سلوكية': 'bg-orange-100 text-orange-700',
  'دراسية': 'bg-blue-100 text-blue-700',
  'نفسية': 'bg-purple-100 text-purple-700',
  'اجتماعية': 'bg-teal-100 text-teal-700',
  'صحية': 'bg-red-100 text-red-700',
  'مختلطة': 'bg-gray-100 text-gray-700',
}

const PROBLEM_TYPE_ICONS: Record<ProblemType, string> = {
  'سلوكية': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  'دراسية': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  'نفسية': 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  'اجتماعية': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  'صحية': 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  'مختلطة': 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
}

type ViewMode = 'cards' | 'table' | 'compact'

// مفتاح حفظ وضع العرض في localStorage
const VIEW_MODE_STORAGE_KEY = 'treatment_plans_view_mode'

// قراءة وضع العرض المحفوظ
const getSavedViewMode = (): ViewMode => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (saved && ['cards', 'table', 'compact'].includes(saved)) {
      return saved as ViewMode
    }
  } catch (e) {
    // في حالة عدم توفر localStorage
  }
  return 'cards'
}

export function TreatmentPlansPage() {
  const navigate = useNavigate()
  const { currentTheme } = useTheme()
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TreatmentPlanFilters>({
    page: 1,
    per_page: 20,
  })

  // حفظ وضع العرض عند تغييره
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    } catch (e) {
      // في حالة عدم توفر localStorage
    }
  }, [viewMode])

  const { data: plansData, isLoading, error } = useAdminTreatmentPlans(filters)
  const { data: students } = useAdminGuidanceStudents()

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const plans: TreatmentPlan[] = (plansData?.data as unknown as TreatmentPlan[]) || []
    return {
      total: plansData?.total || 0,
      active: plans.filter((p: TreatmentPlan) => p.status === 'active').length,
      completed: plans.filter((p: TreatmentPlan) => p.status === 'completed').length,
      suspended: plans.filter((p: TreatmentPlan) => p.status === 'suspended').length,
      draft: plans.filter((p: TreatmentPlan) => p.status === 'draft').length,
    }
  }, [plansData])

  // حساب نسبة تحقق الأهداف
  const getGoalProgress = (plan: TreatmentPlan) => {
    if (!plan.goals || plan.goals.length === 0) return 0
    const achieved = plan.goals.filter(g => g.status === 'achieved').length
    return Math.round((achieved / plan.goals.length) * 100)
  }

  // حساب الأيام المتبقية
  const getDaysRemaining = (endDate: string | null | undefined) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const clearFilters = () => {
    setFilters({ page: 1, per_page: 20 })
  }

  const hasActiveFilters = filters.problem_type || filters.status || filters.student_id || filters.search

  // ألوان الهيدر حسب المظهر
  const headerColors = currentTheme.colors

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">الخطط العلاجية</h1>
            <p className="mt-1 text-gray-500">إدارة ومتابعة الخطط العلاجية للطلاب</p>
          </div>
          <button
            onClick={() => navigate('/admin/treatment-plans/new')}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-white"
            style={{ backgroundColor: headerColors.primary }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            خطة جديدة
          </button>
        </div>

      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-sm text-gray-500">إجمالي الخطط</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-sm text-gray-500">نشطة</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-sky-600">{stats.completed}</p>
          <p className="text-sm text-gray-500">مكتملة</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-amber-600">{stats.suspended}</p>
          <p className="text-sm text-gray-500">معلقة</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-gray-500">{stats.draft}</p>
          <p className="text-sm text-gray-500">مسودة</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="عرض البطاقات"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="عرض الجدول"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="عرض مختصر"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                placeholder="ابحث عن خطة علاجية..."
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${showFilters || hasActiveFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              فلاتر
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-2">
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setFilters({ ...filters, status: filters.status === status ? undefined : status })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.status === status ? STATUS_COLORS[status] + ' border-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع المشكلة</label>
                <select
                  value={filters.problem_type || ''}
                  onChange={(e) => setFilters({ ...filters, problem_type: e.target.value ? (e.target.value as ProblemType) : undefined })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">جميع الأنواع</option>
                  {PROBLEM_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الطالب</label>
                <select
                  value={filters.student_id || ''}
                  onChange={(e) => setFilters({ ...filters, student_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">جميع الطلاب</option>
                  {students?.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    مسح الفلاتر
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="mt-4 text-gray-500">جاري تحميل الخطط العلاجية...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">حدث خطأ</h3>
          <p className="text-red-600">تعذر تحميل الخطط العلاجية. يرجى المحاولة مرة أخرى.</p>
        </div>
      ) : !plansData || !plansData.data || ((plansData.data as unknown) as TreatmentPlan[]).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد خطط علاجية</h3>
          <p className="text-gray-500 mb-6">ابدأ بإنشاء أول خطة علاجية لمتابعة تقدم الطلاب</p>
          <button
            onClick={() => navigate('/admin/treatment-plans/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء خطة علاجية
          </button>
        </div>
      ) : (
        <>
          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {((plansData?.data as unknown) as TreatmentPlan[] | undefined)?.map((plan: TreatmentPlan) => {
                const progress = getGoalProgress(plan)
                const daysRemaining = getDaysRemaining(plan.end_date)
                
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className={`h-2 ${plan.status === 'active' ? 'bg-emerald-500' : plan.status === 'completed' ? 'bg-sky-500' : plan.status === 'suspended' ? 'bg-amber-500' : plan.status === 'cancelled' ? 'bg-rose-500' : 'bg-gray-300'}`}></div>
                    
                    <div className="p-5">
                      {/* Student Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-bold text-sm">
                              {(plan.student?.name || 'ط')[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {plan.student?.name || `طالب #${plan.student_id}`}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {(plan as any).plan_number || `TP-${plan.id}`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[plan.status as TreatmentPlanStatus]}`}>
                          {STATUS_LABELS[plan.status as TreatmentPlanStatus]}
                        </span>
                      </div>

                      {/* Problem Type Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${PROBLEM_TYPE_COLORS[plan.problem_type as ProblemType]}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={PROBLEM_TYPE_ICONS[plan.problem_type as ProblemType]} />
                          </svg>
                          {plan.problem_type}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {plan.problem_description}
                      </p>

                      {/* Progress Bar */}
                      {plan.goals && plan.goals.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">تقدم الأهداف</span>
                            <span className="font-medium text-gray-700">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : progress > 0 ? 'bg-orange-500' : 'bg-gray-300'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            {plan.goals?.length || 0} أهداف
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {plan.followups?.length || 0} متابعات
                          </span>
                        </div>
                        {daysRemaining !== null && (
                          <span className={`text-xs font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {daysRemaining < 0 ? `متأخر ${Math.abs(daysRemaining)} يوم` : daysRemaining === 0 ? 'ينتهي اليوم' : `${daysRemaining} يوم متبقي`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الطالب</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">نوع المشكلة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الحالة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">التقدم</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">تاريخ البدء</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">المتبقي</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {((plansData?.data as unknown) as TreatmentPlan[] | undefined)?.map((plan: TreatmentPlan) => {
                    const progress = getGoalProgress(plan)
                    const daysRemaining = getDaysRemaining(plan.end_date)
                    
                    return (
                      <tr
                        key={plan.id}
                        onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-bold text-xs">{(plan.student?.name || 'ط')[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{plan.student?.name || `طالب #${plan.student_id}`}</p>
                              <p className="text-xs text-gray-500">{(plan as any).plan_number || `TP-${plan.id}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${PROBLEM_TYPE_COLORS[plan.problem_type as ProblemType]}`}>
                            {plan.problem_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[plan.status as TreatmentPlanStatus]}`}>
                            {STATUS_LABELS[plan.status as TreatmentPlanStatus]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${progress >= 75 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(plan.start_date).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="px-6 py-4">
                          {daysRemaining !== null && (
                            <span className={`text-sm font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {daysRemaining < 0 ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${daysRemaining} يوم`}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Compact View */}
          {viewMode === 'compact' && (
            <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
              {((plansData?.data as unknown) as TreatmentPlan[] | undefined)?.map((plan: TreatmentPlan) => {
                const progress = getGoalProgress(plan)
                
                return (
                  <div
                    key={plan.id}
                    onClick={() => navigate(`/admin/treatment-plans/${plan.id}`)}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div className={`hidden md:block w-1 h-12 rounded-full ${plan.status === 'active' ? 'bg-emerald-500' : plan.status === 'completed' ? 'bg-sky-500' : plan.status === 'suspended' ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-bold text-sm">{(plan.student?.name || 'ط')[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{plan.student?.name || `طالب #${plan.student_id}`}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PROBLEM_TYPE_COLORS[plan.problem_type as ProblemType]}`}>
                            {plan.problem_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{plan.problem_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6 shrink-0 mr-auto md:mr-0">
                      <div className="text-center">
                        <p className="text-base md:text-lg font-bold text-gray-900">{progress}%</p>
                        <p className="text-xs text-gray-500">التقدم</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base md:text-lg font-bold text-gray-900">{plan.goals?.length || 0}</p>
                        <p className="text-xs text-gray-500">أهداف</p>
                      </div>
                      <span className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-medium border ${STATUS_COLORS[plan.status as TreatmentPlanStatus]}`}>
                        {STATUS_LABELS[plan.status as TreatmentPlanStatus]}
                      </span>
                      <svg className="hidden md:block w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {plansData && plansData.last_page > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">
                عرض {((plansData.current_page - 1) * plansData.per_page) + 1} - {Math.min(plansData.current_page * plansData.per_page, plansData.total)} من {plansData.total} خطة
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  السابق
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, plansData.last_page) }, (_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setFilters({ ...filters, page })}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${filters.page === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(plansData.last_page, (filters.page || 1) + 1) })}
                  disabled={filters.page === plansData.last_page}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}


import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminGuidanceCases, useAdminGuidanceStats, useAdminGuidanceCaseMutations } from '../api/guidance-hooks'
import { useTheme } from '@/shared/themes/theme-context'
import type { GuidanceCaseFilters, GuidanceCaseRecord } from '@/modules/guidance/types'

type Severity = 'low' | 'medium' | 'high' | 'critical'
type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'
type ViewMode = 'cards' | 'table'

const VIEW_MODE_STORAGE_KEY = 'student_cases_view_mode'

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'عاجلة',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  on_hold: 'معلقة',
  closed: 'مغلقة',
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
  on_hold: 'bg-gray-100 text-gray-700 border-gray-200',
  closed: 'bg-green-100 text-green-700 border-green-200',
}

const CATEGORIES = ['سلوكية', 'أكاديمية', 'اجتماعية', 'نفسية', 'صحية', 'أخرى']

const getSavedViewMode = (): ViewMode => {
  try {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (saved && ['cards', 'table'].includes(saved)) return saved as ViewMode
  } catch (e) { /* ignore */ }
  return 'table'
}

export function StudentCasesPage() {
  const navigate = useNavigate()
  const { currentTheme } = useTheme()
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<GuidanceCaseFilters>({ page: 1, per_page: 20 })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: stats } = useAdminGuidanceStats()
  const { data: casesData, isLoading, error } = useAdminGuidanceCases(filters)
  const { deleteCase } = useAdminGuidanceCaseMutations()

  // حفظ وضع العرض
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode) } catch (e) { /* ignore */ }
  }, [viewMode])

  const updateFilter = <K extends keyof GuidanceCaseFilters>(key: K, value: GuidanceCaseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => setFilters({ page: 1, per_page: 20 })

  const hasActiveFilters = filters.search || filters.status || filters.severity || filters.category

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirm === id) {
      try {
        await deleteCase.mutateAsync(id)
        setDeleteConfirm(null)
      } catch (error) {
        console.error('Failed to delete case:', error)
      }
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/admin/student-cases/${id}/edit`)
  }

  const headerColors = currentTheme.colors

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <header className="pb-2">
          <h1 className="text-3xl font-bold text-gray-900">الحالات الطلابية</h1>
        </header>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-red-600">{error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">الحالات الطلابية</h1>
            <p className="mt-1 text-gray-500">إدارة ومتابعة حالات الإرشاد الطلابي</p>
          </div>
          <button
            onClick={() => navigate('/admin/student-cases/new')}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-white"
            style={{ backgroundColor: headerColors.primary }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            حالة جديدة
          </button>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-blue-600">{stats.open_cases}</p>
            <p className="text-sm text-gray-500">مفتوحة</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-purple-600">{stats.by_status.in_progress || 0}</p>
            <p className="text-sm text-gray-500">قيد المعالجة</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-red-600">{stats.overdue_followups}</p>
            <p className="text-sm text-gray-500">متابعات متأخرة</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-3xl font-bold text-green-600">{stats.by_status.closed || 0}</p>
            <p className="text-sm text-gray-500">مغلقة</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={viewMode === 'table' ? { color: headerColors.primary } : {}}
              title="عرض الجدول"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={viewMode === 'cards' ? { color: headerColors.primary } : {}}
              title="عرض البطاقات"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value || undefined)}
                placeholder="ابحث عن حالة..."
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${showFilters || hasActiveFilters ? 'border-opacity-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={showFilters || hasActiveFilters ? { borderColor: headerColors.primary, color: headerColors.primary, backgroundColor: `${headerColors.primary}10` } : {}}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              فلاتر
              {hasActiveFilters && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: headerColors.primary }}></span>}
            </button>
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-2">
            {(['open', 'in_progress', 'on_hold', 'closed'] as CaseStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => updateFilter('status', filters.status === status ? undefined : status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filters.status === status ? STATUS_COLORS[status] : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الأولوية</label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => updateFilter('severity', e.target.value || undefined)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 outline-none"
                >
                  <option value="">جميع الأولويات</option>
                  {(['low', 'medium', 'high', 'critical'] as Severity[]).map((sev) => (
                    <option key={sev} value={sev}>{SEVERITY_LABELS[sev]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">التصنيف</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => updateFilter('category', e.target.value || undefined)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 outline-none"
                >
                  <option value="">جميع التصنيفات</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
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
              <div className="w-16 h-16 border-4 rounded-full animate-pulse" style={{ borderColor: `${headerColors.primary}30` }}></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 rounded-full animate-spin border-t-transparent" style={{ borderColor: headerColors.primary, borderTopColor: 'transparent' }}></div>
            </div>
            <p className="mt-4 text-gray-500">جاري تحميل الحالات...</p>
          </div>
        </div>
      ) : !casesData || casesData.data.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${headerColors.primary}15` }}>
            <svg className="w-10 h-10" style={{ color: headerColors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد حالات</h3>
          <p className="text-gray-500 mb-6">ابدأ بإنشاء أول حالة طلابية</p>
          <button
            onClick={() => navigate('/admin/student-cases/new')}
            className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl transition-colors font-medium"
            style={{ backgroundColor: headerColors.primary }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء حالة جديدة
          </button>
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">رقم الحالة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الطالب</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">العنوان</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">التصنيف</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الأولوية</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الحالة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">آخر نشاط</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {casesData.data.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      onClick={() => navigate(`/admin/student-cases/${caseItem.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {caseItem.case_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${headerColors.primary}15` }}>
                            <span className="font-bold text-xs" style={{ color: headerColors.primary }}>{caseItem.student.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{caseItem.student.name}</p>
                            <p className="text-xs text-gray-500">{caseItem.student.grade} - {caseItem.student.class_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {caseItem.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {caseItem.category}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${SEVERITY_COLORS[caseItem.severity]}`}>
                          {SEVERITY_LABELS[caseItem.severity]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[caseItem.status]}`}>
                          {STATUS_LABELS[caseItem.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {caseItem.last_activity_at ? new Date(caseItem.last_activity_at).toLocaleDateString('ar-SA') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => handleEdit(caseItem.id, e)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(caseItem.id, e)}
                            className={`p-2 rounded-lg transition-colors ${deleteConfirm === caseItem.id ? 'text-white bg-red-600' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                            title={deleteConfirm === caseItem.id ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {casesData.data.map((caseItem) => (
                <div
                  key={caseItem.id}
                  onClick={() => navigate(`/admin/student-cases/${caseItem.id}`)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 overflow-hidden group"
                >
                  <div className={`h-1.5 ${caseItem.status === 'open' ? 'bg-blue-500' : caseItem.status === 'in_progress' ? 'bg-purple-500' : caseItem.status === 'closed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${headerColors.primary}15` }}>
                          <span className="font-bold text-sm" style={{ color: headerColors.primary }}>{caseItem.student.name[0]}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-opacity-80 transition-colors">
                            {caseItem.student.name}
                          </h3>
                          <p className="text-xs text-gray-500">{caseItem.case_number}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => handleEdit(caseItem.id, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(caseItem.id, e)}
                          className={`p-1.5 rounded transition-colors ${deleteConfirm === caseItem.id ? 'text-white bg-red-600' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={deleteConfirm === caseItem.id ? 'اضغط للتأكيد' : 'حذف'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h4 className="font-medium text-gray-800 mb-2 line-clamp-1">{caseItem.title}</h4>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[caseItem.status]}`}>
                        {STATUS_LABELS[caseItem.status]}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[caseItem.severity]}`}>
                        {SEVERITY_LABELS[caseItem.severity]}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {caseItem.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <span>{caseItem.student.grade} - {caseItem.student.class_name}</span>
                      <span>{caseItem.last_activity_at ? new Date(caseItem.last_activity_at).toLocaleDateString('ar-SA') : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {casesData.last_page > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">
                عرض {((casesData.current_page - 1) * casesData.per_page) + 1} - {Math.min(casesData.current_page * casesData.per_page, casesData.total)} من {casesData.total} حالة
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
                  disabled={casesData.current_page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  السابق
                </button>
                <span className="px-4 py-2 text-gray-600">
                  {casesData.current_page} / {casesData.last_page}
                </span>
                <button
                  onClick={() => updateFilter('page', Math.min(casesData.last_page, (filters.page || 1) + 1))}
                  disabled={casesData.current_page === casesData.last_page}
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


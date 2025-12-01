import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuidanceCases, useGuidanceStats } from '../hooks'
import type { GuidanceCaseFilters } from '../types'

const SEVERITY_LABELS = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  critical: 'عاجلة',
}

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const STATUS_LABELS = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  on_hold: 'معلقة',
  closed: 'مغلقة',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-gray-100 text-gray-800',
  closed: 'bg-green-100 text-green-800',
}

export function GuidanceCasesPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<GuidanceCaseFilters>({
    page: 1,
    per_page: 20,
  })

  const { data: stats } = useGuidanceStats()
  const { data: casesData, isLoading, error } = useGuidanceCases(filters)

  const updateFilter = <K extends keyof GuidanceCaseFilters>(key: K, value: GuidanceCaseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md" dir="rtl">
          <h2 className="text-red-800 font-bold text-lg mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">الحالات الطلابية</h1>
            <p className="text-sm text-slate-600 mt-1">إدارة ومتابعة حالات الإرشاد الطلابي</p>
          </div>
          <button
            onClick={() => navigate('/admin/student-cases/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة حالة جديدة
          </button>
        </div>
      </header>

      <div className="glass-card p-6">{/*  المحتوى */}
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">الحالات المفتوحة</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.open_cases}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">متابعات متأخرة</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.overdue_followups}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">قيد المعالجة</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{stats.by_status.in_progress || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">الحالات المغلقة</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.by_status.closed || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="بحث..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />

            <select
              value={filters.status || ''}
              onChange={(e) => updateFilter('status', e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">كل الحالات</option>
              <option value="open">مفتوحة</option>
              <option value="in_progress">قيد المعالجة</option>
              <option value="on_hold">معلقة</option>
              <option value="closed">مغلقة</option>
            </select>

            <select
              value={filters.severity || ''}
              onChange={(e) => updateFilter('severity', e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">كل الأولويات</option>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="critical">عاجلة</option>
            </select>

            <select
              value={filters.category || ''}
              onChange={(e) => updateFilter('category', e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">كل التصنيفات</option>
              <option value="سلوكية">سلوكية</option>
              <option value="أكاديمية">أكاديمية</option>
              <option value="اجتماعية">اجتماعية</option>
              <option value="نفسية">نفسية</option>
              <option value="صحية">صحية</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4">جاري التحميل...</p>
            </div>
          ) : casesData && casesData.data.length > 0 ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الطالب
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العنوان
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التصنيف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الأولوية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      آخر نشاط
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {casesData.data.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      onClick={() => navigate(`/admin/student-cases/${caseItem.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {caseItem.case_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{caseItem.student.name}</div>
                        <div className="text-sm text-gray-500">
                          {caseItem.student.grade} - {caseItem.student.class_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{caseItem.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {caseItem.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${SEVERITY_COLORS[caseItem.severity]}`}>
                          {SEVERITY_LABELS[caseItem.severity]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[caseItem.status]}`}>
                          {STATUS_LABELS[caseItem.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {caseItem.last_activity_at
                          ? new Date(caseItem.last_activity_at).toLocaleDateString('ar-SA')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {casesData.last_page > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
                      disabled={casesData.current_page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => updateFilter('page', Math.min(casesData.last_page, (filters.page || 1) + 1))}
                      disabled={casesData.current_page === casesData.last_page}
                      className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        عرض <span className="font-medium">{(casesData.current_page - 1) * casesData.per_page + 1}</span> إلى{' '}
                        <span className="font-medium">
                          {Math.min(casesData.current_page * casesData.per_page, casesData.total)}
                        </span>{' '}
                        من <span className="font-medium">{casesData.total}</span> نتيجة
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px gap-2" aria-label="Pagination">
                        <button
                          onClick={() => updateFilter('page', Math.max(1, (filters.page || 1) - 1))}
                          disabled={casesData.current_page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          السابق
                        </button>
                        <button
                          onClick={() => updateFilter('page', Math.min(casesData.last_page, (filters.page || 1) + 1))}
                          disabled={casesData.current_page === casesData.last_page}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          التالي
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد حالات</h3>
              <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء حالة طلابية جديدة</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/admin/student-cases/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة حالة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

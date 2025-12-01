import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTreatmentPlans, useGuidanceStudents, useGuidanceSession } from '../hooks'
import type { TreatmentPlanFilters, ProblemType, TreatmentPlanStatus } from '../types'

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
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
}

export function TreatmentPlansPage() {
  const { isTokenValid } = useGuidanceSession()
  const [filters, setFilters] = useState<TreatmentPlanFilters>({
    page: 1,
    per_page: 20,
  })

  const { data: plansData, isLoading, error } = useTreatmentPlans(filters)
  const { data: students } = useGuidanceStudents()

  if (!isTokenValid()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الخطط العلاجية</h1>
          <p className="mt-2 text-sm text-gray-600">
            إدارة ومتابعة الخطط العلاجية للطلاب وتقييم مدى تقدمهم
          </p>
        </div>
        <Link
          to="/guidance/treatment-plans/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + إضافة خطة علاجية
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">الفلاتر</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع المشكلة</label>
            <select
              value={filters.problem_type || ''}
              onChange={(e) =>
                setFilters({ ...filters, problem_type: e.target.value ? (e.target.value as ProblemType) : undefined })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">الكل</option>
              {PROBLEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value ? (e.target.value as TreatmentPlanStatus) : undefined })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">الكل</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الطالب</label>
            <select
              value={filters.student_id || ''}
              onChange={(e) => setFilters({ ...filters, student_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">الكل</option>
              {students?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} - {student.grade} {student.class_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">بحث</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              placeholder="ابحث..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          حدث خطأ أثناء تحميل الخطط العلاجية
        </div>
      ) : !plansData || !plansData.data || plansData.data.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">لا توجد خطط علاجية</p>
          <Link
            to="/guidance/treatment-plans/new"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            أضف أول خطة علاجية
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plansData.data.map((plan) => (
            <Link
              key={plan.id}
              to={`/guidance/treatment-plans/${plan.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {plan.student?.name || `طالب #${plan.student_id}`}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}>
                      {STATUS_LABELS[plan.status]}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {plan.problem_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{plan.problem_description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>تاريخ البدء: {new Date(plan.start_date).toLocaleDateString('ar-SA')}</span>
                    {plan.end_date && (
                      <span>تاريخ الانتهاء: {new Date(plan.end_date).toLocaleDateString('ar-SA')}</span>
                    )}
                    {plan.goals && <span>{plan.goals.length} أهداف</span>}
                    {plan.followups && <span>{plan.followups.length} متابعات</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {plansData && plansData.last_page > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
            disabled={filters.page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>
          <span className="px-4 py-2 text-gray-700">
            صفحة {plansData.current_page} من {plansData.last_page}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: Math.min(plansData.last_page, (filters.page || 1) + 1) })}
            disabled={filters.page === plansData.last_page}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}

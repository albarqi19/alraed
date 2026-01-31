/**
 * تبويب أعذار التأخير
 * عرض قائمة الأعذار المقدمة من المعلمين مع إمكانية القبول أو الرفض
 */

import { useState, useCallback, useMemo } from 'react'
import { Search, Filter, Check, X, Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDelayExcusesQuery, useApproveExcuseMutation, useRejectExcuseMutation } from '../hooks'
import type { DelayExcusesFilters, ExcuseStatus, DelayExcuse } from '../types'
import { ExcuseReviewDialog } from './excuse-review-dialog'

interface DelayExcusesTabProps {
  fiscalYear: number
  readOnly?: boolean
}

// شارة الحالة
function StatusBadge({ status, label }: { status: ExcuseStatus; label: string }) {
  const colors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }

  const icons = {
    pending: <Clock className="h-3 w-3" />,
    approved: <Check className="h-3 w-3" />,
    rejected: <X className="h-3 w-3" />,
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {icons[status]}
      {label}
    </span>
  )
}

export function DelayExcusesTab({ fiscalYear, readOnly = false }: DelayExcusesTabProps) {
  const [filters, setFilters] = useState<DelayExcusesFilters>({
    fiscal_year: fiscalYear,
    status: 'all',
    search: '',
    page: 1,
    per_page: 20,
  })
  const [selectedExcuse, setSelectedExcuse] = useState<DelayExcuse | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)

  // جلب البيانات
  const excusesQuery = useDelayExcusesQuery(filters)
  const approveMutation = useApproveExcuseMutation()
  const rejectMutation = useRejectExcuseMutation()

  // معالجات الأحداث
  const handleFilterChange = useCallback(
    <K extends keyof DelayExcusesFilters>(key: K, value: DelayExcusesFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value as number : 1 }))
    },
    [],
  )

  const handleReview = useCallback((excuse: DelayExcuse, action: 'approve' | 'reject') => {
    setSelectedExcuse(excuse)
    setReviewAction(action)
  }, [])

  const handleConfirmReview = useCallback(
    (notes?: string) => {
      if (!selectedExcuse || !reviewAction) return

      const mutation = reviewAction === 'approve' ? approveMutation : rejectMutation
      mutation.mutate(
        { id: selectedExcuse.id, payload: notes ? { notes } : {} },
        {
          onSuccess: () => {
            setSelectedExcuse(null)
            setReviewAction(null)
          },
        },
      )
    },
    [selectedExcuse, reviewAction, approveMutation, rejectMutation],
  )

  const handleCancelReview = useCallback(() => {
    if (approveMutation.isPending || rejectMutation.isPending) return
    setSelectedExcuse(null)
    setReviewAction(null)
  }, [approveMutation.isPending, rejectMutation.isPending])

  // البيانات
  const excuses = useMemo(() => excusesQuery.data?.data ?? [], [excusesQuery.data])
  const meta = useMemo(() => excusesQuery.data?.meta, [excusesQuery.data])

  return (
    <div className="space-y-6">
      {/* الفلاتر */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 text-right">
          <label className="text-xs font-semibold text-slate-600">البحث</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search ?? ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="ابحث باسم المعلم..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <label className="text-xs font-semibold text-slate-600">حالة العذر</label>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.status ?? 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value as ExcuseStatus | 'all')}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">مقبول</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/50">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">المعلم</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">تاريخ التأخير</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">دقائق التأخير</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">نص العذر</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">تاريخ التقديم</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">الحالة</th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {excusesQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <div className="inline-flex items-center gap-2 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    جاري التحميل...
                  </div>
                </td>
              </tr>
            ) : excuses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  لا توجد أعذار مقدمة
                </td>
              </tr>
            ) : (
              excuses.map((excuse) => (
                <tr key={excuse.id} className="transition hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">{excuse.teacher_name}</div>
                      {excuse.national_id && (
                        <div className="text-xs text-slate-500">{excuse.national_id}</div>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {excuse.delay_date_formatted}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      <Clock className="h-3 w-3" />
                      {excuse.delay_minutes} دقيقة
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={excuse.excuse_text}>
                    {excuse.excuse_text}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(excuse.submitted_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={excuse.status} label={excuse.status_label} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-1">
                      {excuse.status === 'pending' && !readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReview(excuse, 'approve')}
                            className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                            title="قبول العذر"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(excuse, 'reject')}
                            className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                            title="رفض العذر"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExcuse(excuse)
                          setReviewAction(null)
                        }}
                        className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
                        title="عرض التفاصيل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ترقيم الصفحات */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-500">
            عرض {(meta.current_page - 1) * meta.per_page + 1} - {Math.min(meta.current_page * meta.per_page, meta.total)} من {meta.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange('page', meta.current_page - 1)}
              disabled={meta.current_page === 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600">
              صفحة {meta.current_page} من {meta.last_page}
            </span>
            <button
              type="button"
              onClick={() => handleFilterChange('page', meta.current_page + 1)}
              disabled={meta.current_page === meta.last_page}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* نافذة المراجعة */}
      <ExcuseReviewDialog
        excuse={selectedExcuse}
        action={reviewAction}
        isSubmitting={approveMutation.isPending || rejectMutation.isPending}
        onConfirm={handleConfirmReview}
        onCancel={handleCancelReview}
        readOnly={readOnly}
      />
    </div>
  )
}

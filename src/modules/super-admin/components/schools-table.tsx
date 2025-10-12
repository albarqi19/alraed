import { useMemo } from 'react'
import type { PlatformFiltersResponse, PlatformSchoolRow, PlatformSchoolsResponse } from '../types'

interface FiltersState {
  search: string
  status: string | null
  plan: string | null
}

interface SchoolsTableProps {
  data?: PlatformSchoolsResponse
  isLoading?: boolean
  filters: FiltersState
  onFiltersChange: (filters: FiltersState) => void
  onPageChange: (page: number) => void
  filterOptions?: PlatformFiltersResponse
}

export function SchoolsTable({ data, isLoading, filters, onFiltersChange, onPageChange, filterOptions }: SchoolsTableProps) {
  const items = data?.items ?? []
  const pagination = data?.pagination ?? { current_page: 1, per_page: 15, total: 0, last_page: 1 }

  const statusOptions = useMemo(() => filterOptions?.school_statuses ?? [], [filterOptions])
  const planOptions = useMemo(() => filterOptions?.plans ?? [], [filterOptions])

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value })
  }

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value || null
    onFiltersChange({ ...filters, status: value })
  }

  const handlePlanChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value || null
    onFiltersChange({ ...filters, plan: value })
  }

  const startIndex = (pagination.current_page - 1) * pagination.per_page + 1
  const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total)

  const renderSchoolRow = (school: PlatformSchoolRow) => (
    <tr key={school.id} className="transition hover:bg-slate-50/80">
      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">{school.name}</td>
      <td className="px-4 py-4 text-sm text-slate-500">
        <div className="space-y-1">
          <p className="font-medium text-slate-600">{school.admin_name ?? '—'}</p>
          <p className="text-xs text-slate-400">{school.admin_phone ?? '—'}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-500">
        <div className="space-y-1">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {school.plan.name ?? school.plan.code ?? 'غير محدد'}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {school.subscription_status ?? 'غير معروف'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-500">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">آخر تجديد: {formatDate(school.subscription?.starts_at ?? school.subscription_starts_at)}</p>
          <p className="text-xs text-slate-500">انتهاء الاشتراك: {formatDate(school.subscription?.ends_at ?? school.subscription_ends_at)}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        <div className="space-y-1">
          <p className="font-semibold text-emerald-600">
            {school.metrics.total_paid_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} ر.س
          </p>
          <p className="text-xs text-slate-500">اشتراكات نشطة: {school.metrics.active_subscriptions}</p>
        </div>
      </td>
    </tr>
  )

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/70 shadow-sm">
      <header className="space-y-4 border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">قائمة المدارس</h2>
            <p className="text-sm text-slate-500">متابعة حالة المدارس والباقات والإيرادات التراكمية.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
            إجمالي المدارس: {pagination.total.toLocaleString('en-US')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="ابحث بالاسم أو المشرف أو النطاق"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <select
            value={filters.status ?? ''}
            onChange={handleStatusChange}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.plan ?? ''}
            onChange={handlePlanChange}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <option value="">كل الباقات</option>
            {planOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-right">
          <thead className="bg-slate-100/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">المدرسة</th>
              <th className="px-4 py-3 font-medium">المسؤول</th>
              <th className="px-4 py-3 font-medium">الباقة والحالة</th>
              <th className="px-4 py-3 font-medium">تواريخ الاشتراك</th>
              <th className="px-4 py-3 font-medium">الإيرادات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  يتم تحميل المدارس...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  لا توجد مدارس مطابقة لخيارات التصفية الحالية.
                </td>
              </tr>
            ) : (
              items.map((school) => renderSchoolRow(school))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        <p>
          عرض {items.length ? `${startIndex}–${endIndex}` : '0'} من {pagination.total.toLocaleString('en-US')} مدرسة
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(pagination.current_page - 1, 1))}
            disabled={pagination.current_page <= 1 || isLoading}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            السابق
          </button>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            صفحة {pagination.current_page} من {Math.max(pagination.last_page, 1)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(pagination.current_page + 1, pagination.last_page))}
            disabled={pagination.current_page >= pagination.last_page || isLoading}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </footer>
    </section>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

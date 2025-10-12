import { useDeferredValue, useMemo, useState } from 'react'
import { SchoolsTable } from '../components/schools-table'
import { usePlatformFiltersQuery, usePlatformSchoolsQuery } from '../hooks'

interface FiltersState {
  search: string
  status: string | null
  plan: string | null
}

export function PlatformSchoolsPage() {
  const [filters, setFilters] = useState<FiltersState>({ search: '', status: null, plan: null })
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(filters.search)

  const queryParams = useMemo(
    () => ({
      page,
      search: deferredSearch.trim() ? deferredSearch.trim() : undefined,
      status: filters.status,
      plan: filters.plan,
    }),
    [page, deferredSearch, filters.status, filters.plan],
  )

  const { data, isLoading, isFetching } = usePlatformSchoolsQuery(queryParams)
  const { data: filterOptions } = usePlatformFiltersQuery()

  const handleFiltersChange = (next: FiltersState) => {
    setFilters(next)
    setPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">متابعة المدارس</h1>
            <p className="text-sm text-slate-500">
              استعرض المدارس المسجلة، حالات الاشتراك، والإيرادات المجمعة لكل مدرسة.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 font-semibold text-slate-600">
              <i className="bi bi-building" />
              إجمالي النتائج: {data?.pagination.total.toLocaleString('en-US') ?? '—'}
            </span>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1 font-semibold text-indigo-600">
                <i className="bi bi-arrow-repeat animate-spin" />
                جاري التحديث
              </span>
            ) : null}
          </div>
        </header>
      </div>

      <SchoolsTable
        data={data}
        isLoading={isLoading && !data}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onPageChange={handlePageChange}
        filterOptions={filterOptions}
      />
    </section>
  )
}

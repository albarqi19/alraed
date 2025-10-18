import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminForms } from '@/modules/forms/hooks'
import type { FormStatus, FormSummary } from '@/modules/forms/types'

const STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'مسودة',
  published: 'منشور',
  archived: 'مؤرشف',
}

type StatusFilter = FormStatus | 'all'

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
    }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA')
  }
}

function isCurrentlyActive(form: FormSummary): boolean {
  if (form.status !== 'published') return false
  const now = new Date()
  const start = form.start_at ? new Date(form.start_at) : null
  const end = form.end_at ? new Date(form.end_at) : null

  if (start && start > now) return false
  if (end && end < now) return false
  return true
}

function getStatusTone(status: FormStatus): string {
  switch (status) {
    case 'published':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'archived':
      return 'bg-slate-100 text-slate-600 border border-slate-300'
    case 'draft':
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200'
  }
}

export function AdminFormsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const initial = searchParams.get('status')
    if (initial === 'draft' || initial === 'published' || initial === 'archived') {
      return initial
    }
    return 'all'
  })

  const formsQuery = useAdminForms({ status: statusFilter === 'all' ? undefined : statusFilter })
  const forms = formsQuery.data?.data ?? []
  const meta = formsQuery.data?.meta

  const stats = useMemo(() => {
    const published = forms.filter((form) => form.status === 'published')
    const active = published.filter((form) => isCurrentlyActive(form))
    const archived = forms.filter((form) => form.status === 'archived')
    const drafts = forms.filter((form) => form.status === 'draft')

    return {
      total: meta?.total ?? forms.length,
      published: published.length,
      active: active.length,
      archived: archived.length,
      drafts: drafts.length,
    }
  }, [forms, meta?.total])

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus)
    const params = new URLSearchParams(searchParams)
    if (nextStatus === 'all') {
      params.delete('status')
    } else {
      params.set('status', nextStatus)
    }
    setSearchParams(params, { replace: true })
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">النماذج الإلكترونية</h1>
          <p className="text-sm text-muted">
            أنشئ النماذج الصحية والتعليمية وتابع الردود والإحصائيات في مكان واحد.
          </p>
        </div>
        <Link
          to="/admin/forms/new"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <i className="bi bi-plus-circle" /> نموذج جديد
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي النماذج" value={stats.total} tone="bg-slate-50 text-slate-700 border-slate-200" />
        <StatCard title="نماذج منشورة" value={stats.published} tone="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <StatCard title="نشطة الآن" value={stats.active} tone="bg-sky-50 text-sky-700 border-sky-200" />
        <StatCard title="مسودات" value={stats.drafts} tone="bg-amber-50 text-amber-700 border-amber-200" />
      </section>

      <div className="glass-card space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">قائمة النماذج</h2>
            <p className="text-xs text-muted">استخدم الفلاتر لاستعراض النماذج حسب الحالة.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {(['all', 'draft', 'published', 'archived'] as StatusFilter[]).map((status) => {
              const isActive = statusFilter === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={`rounded-full border px-4 py-2 transition ${
                    isActive ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {status === 'all' ? 'الكل' : STATUS_LABELS[status]}
                </button>
              )
            })}
          </div>
        </header>

        {formsQuery.isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100/80" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-muted">
            لا توجد نماذج مطابقة للفلتر الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs text-slate-500">
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    العنوان
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    الحالة
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    الفترة المتاحة
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    عدد الردود
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    خيارات سريعة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{form.title}</p>
                        <p className="text-xs text-muted line-clamp-1">{form.description ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(form.status)}`}>
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {STATUS_LABELS[form.status]}
                        {isCurrentlyActive(form) ? (
                          <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600">
                            نشط الآن
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div className="flex flex-col">
                        <span>البداية: {formatDate(form.start_at)}</span>
                        <span>النهاية: {formatDate(form.end_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">
                      {form.submissions_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link
                          to={`/admin/forms/${form.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                        >
                          <i className="bi bi-pencil" /> تحرير
                        </Link>
                        <Link
                          to={`/admin/forms/${form.id}/submissions`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-600"
                        >
                          <i className="bi bi-list-check" /> الردود
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

interface StatCardProps {
  title: string
  value: number
  tone: string
}

function StatCard({ title, value, tone }: StatCardProps) {
  return (
    <article className={`rounded-2xl border bg-white/80 p-5 shadow-sm ${tone}`}>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value.toLocaleString('en-US')}</p>
    </article>
  )
}

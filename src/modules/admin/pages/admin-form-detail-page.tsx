import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FormDesigner } from '@/modules/forms/components/form-designer'
import {
  useAdminForm,
  useArchiveAdminFormMutation,
  useDeleteAdminFormMutation,
  usePublishAdminFormMutation,
  useUpdateAdminFormMutation,
} from '@/modules/forms/hooks'
import type { FormUpsertPayload } from '@/modules/forms/types'

export function AdminFormDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const rawFormId = Number(params.formId)
  const safeFormId = Number.isFinite(rawFormId) ? rawFormId : 0

  const formQuery = useAdminForm(Number.isFinite(rawFormId) ? rawFormId : null)
  const updateMutation = useUpdateAdminFormMutation(safeFormId)
  const publishMutation = usePublishAdminFormMutation()
  const archiveMutation = useArchiveAdminFormMutation()
  const deleteMutation = useDeleteAdminFormMutation()

  useEffect(() => {
    if (!Number.isFinite(rawFormId)) {
      navigate('/admin/forms')
    }
  }, [rawFormId, navigate])

  const handleSubmit = async (payload: FormUpsertPayload) => {
    try {
      await updateMutation.mutateAsync(payload)
    } catch {
      // toast handled in hook
    }
  }

  const handlePublish = async () => {
    if (!Number.isFinite(rawFormId)) return
    try {
      await publishMutation.mutateAsync(safeFormId)
    } catch {
      // handled by hook
    }
  }

  const handleArchive = async () => {
    if (!Number.isFinite(rawFormId)) return
    try {
      await archiveMutation.mutateAsync(safeFormId)
    } catch {
      // handled by hook
    }
  }

  const handleDelete = async () => {
    if (!Number.isFinite(rawFormId)) return
    const confirmed = window.confirm('هل أنت متأكد من حذف النموذج؟ لا يمكن التراجع عن هذا الإجراء.')
    if (!confirmed) return
    try {
      await deleteMutation.mutateAsync(safeFormId)
      navigate('/admin/forms')
    } catch {
      // handled by hook
    }
  }

  if (!Number.isFinite(rawFormId)) {
    return null
  }

  if (formQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </section>
    )
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <section className="space-y-4 text-center">
        <p className="text-xl font-semibold text-rose-600">تعذر تحميل بيانات النموذج.</p>
        <Link
          to="/admin/forms"
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
        >
          العودة لقائمة النماذج
        </Link>
      </section>
    )
  }

  const form = formQuery.data

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
          <p className="text-sm text-muted">آخر تحديث: {new Date(form.updated_at).toLocaleString('ar-SA')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-700"
            disabled={publishMutation.isPending || updateMutation.isPending || archiveMutation.isPending}
          >
            {publishMutation.isPending ? 'جاري النشر...' : 'نشر النموذج'}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="rounded-full border border-amber-300 px-3 py-1 text-amber-600 transition hover:border-amber-400 hover:text-amber-700"
            disabled={archiveMutation.isPending || updateMutation.isPending || publishMutation.isPending}
          >
            {archiveMutation.isPending ? 'جاري الأرشفة...' : 'أرشفة النموذج'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full border border-rose-300 px-3 py-1 text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف النموذج'}
          </button>
        </div>
      </header>

      <FormDesigner
        mode="edit"
        initialForm={form}
        submitting={updateMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/forms')}
      />
    </section>
  )
}

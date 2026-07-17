import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowRight, Send, Trash2 } from 'lucide-react'
import { FormDesigner } from '@/modules/forms/components/form-designer'
import {
  useAdminForm,
  useArchiveAdminFormMutation,
  useDeleteAdminFormMutation,
  usePublishAdminFormMutation,
  useUpdateAdminFormMutation,
} from '@/modules/forms/hooks'
import type { FormUpsertPayload } from '@/modules/forms/types'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsMain,
  WsLayout,
  WsBlock,
  WsBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'

const STATUS_META = {
  draft: { label: 'مسودة', tone: TONES.gray },
  published: { label: 'منشور', tone: TONES.green },
  archived: { label: 'مؤرشف', tone: TONES.gray },
} as const

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

  const [pendingDelete, setPendingDelete] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(rawFormId)) navigate('/admin/forms')
  }, [rawFormId, navigate])

  const handleSubmit = async (payload: FormUpsertPayload) => {
    try {
      await updateMutation.mutateAsync(payload)
    } catch {
      /* toast في الهوك */
    }
  }

  if (!Number.isFinite(rawFormId)) return null

  if (formQuery.isLoading) {
    return (
      <WsPage>
        <WsHeader title="النموذج" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsEmpty loading>جارٍ تحميل النموذج...</WsEmpty>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <WsPage>
        <WsHeader title="النموذج" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsAlert tone="error" boxed>
                تعذّر تحميل بيانات النموذج.
                <WsBtn size="sm" icon={ArrowRight} onClick={() => navigate('/admin/forms')}>
                  العودة للقائمة
                </WsBtn>
              </WsAlert>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  const form = formQuery.data
  const status = STATUS_META[form.status] ?? STATUS_META.draft
  const busy = updateMutation.isPending || publishMutation.isPending || archiveMutation.isPending
  const noFields = form.fields_count === 0

  return (
    <WsPage>
      <WsHeader
        title={form.title}
        badge={<ToneChip tone={status.tone}>{status.label}</ToneChip>}
        actions={
          <>
            {form.status === 'draft' && (
              <WsBtn
                variant="primary"
                icon={Send}
                onClick={() => publishMutation.mutate(safeFormId)}
                disabled={busy || noFields}
              >
                {noFields ? 'لا أسئلة بعد' : publishMutation.isPending ? 'جارٍ النشر...' : 'نشر'}
              </WsBtn>
            )}
            {form.status === 'published' && (
              <WsBtn icon={Archive} onClick={() => archiveMutation.mutate(safeFormId)} disabled={busy}>
                أرشفة
              </WsBtn>
            )}
            <WsBtn variant="danger" icon={Trash2} onClick={() => setPendingDelete(true)}>
              حذف
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact label="الأسئلة">{form.fields_count ?? 0}</WsFact>
            <WsFact label="الردود">{form.submissions_count ?? 0}</WsFact>
            <WsFact label="آخر تحديث">{new Date(form.updated_at).toLocaleDateString('ar-SA')}</WsFact>
          </>
        }
      />

      <WsLayout>
        <WsMain>
          <WsBlock fill scroll padded>
            {/* المصمّم مكوّن مستقل بحاويته — يُغلَّف بلا لمس منطقه */}
            <FormDesigner
              mode="edit"
              initialForm={form}
              submitting={updateMutation.isPending}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/admin/forms')}
            />
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* مودال الحذف — بدل window.confirm الخام */}
      {pendingDelete && (
        <div className="ws-modal" onClick={() => setPendingDelete(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف «{form.title}»</h3>
              <p className="ws-modal__sub">لا يمكن التراجع</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="error" boxed>
                {(form.submissions_count ?? 0) > 0
                  ? `سيُحذف النموذج ومعه ${form.submissions_count} ردّاً من أولياء الأمور.`
                  : 'سيُحذف النموذج نهائياً.'}
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setPendingDelete(false)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                disabled={deleteMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync(safeFormId)
                    navigate('/admin/forms')
                  } catch {
                    /* toast في الهوك */
                  }
                }}
              >
                حذف نهائي
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

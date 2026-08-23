import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowRight, MessageCircle, Send, Trash2 } from 'lucide-react'
import { FormDesigner } from '@/modules/forms/components/form-designer'
import {
  useAdminForm,
  useArchiveAdminFormMutation,
  useDeleteAdminFormMutation,
  useFormNotifyPreview,
  useNotifyFormGuardiansMutation,
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
  const notifyMutation = useNotifyFormGuardiansMutation()

  const [pendingDelete, setPendingDelete] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)

  // المعاينة تُطلَب عند فتح النافذة فقط: حسابُ جمهورٍ من ألف طالبٍ استعلامٌ
  // ثقيل، ولا معنى لدفعه في كل مرّةٍ تُفتح فيها صفحة النموذج.
  const notifyPreview = useFormNotifyPreview(safeFormId, notifyOpen)

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
              <WsBtn variant="primary" icon={MessageCircle} onClick={() => setNotifyOpen(true)} disabled={busy}>
                إشعار أولياء الأمور
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
            <WsFact label="آخر تحديث">{new Date(form.updated_at).toLocaleDateString('ar-SA-u-nu-latn')}</WsFact>
          </>
        }
      />

      {/* المصمّم يملك أعمدته الثلاثة بنفسه — لا يُغلَّف ببلوكٍ يتمرّر تحته */}
      <FormDesigner
        mode="edit"
        initialForm={form}
        submitting={updateMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/forms')}
      />

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
      {/* إشعار أولياء الأمور: معاينةٌ كاملة قبل أن تخرج رسالةٌ واحدة */}
      {notifyOpen && (
        <div className="ws-modal" onClick={() => setNotifyOpen(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إشعار أولياء الأمور بـ«{form.title}»</h3>
              <p className="ws-modal__sub">رسالة واتساب من رقم المدرسة</p>
            </header>

            <div className="ws-modal__body">
              {notifyPreview.isLoading && <WsEmpty loading>جارٍ حساب المستلمين والإيقاع...</WsEmpty>}

              {notifyPreview.isError && <WsAlert tone="error" boxed>تعذّر حساب المعاينة.</WsAlert>}

              {notifyPreview.data && (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { label: 'جمهور النموذج', value: notifyPreview.data.audience_count },
                      { label: 'سيصلهم الآن', value: notifyPreview.data.pending_count },
                      { label: 'بلا رقم جوال', value: notifyPreview.data.without_phone_count },
                      { label: 'أُشعروا سابقاً', value: notifyPreview.data.already_notified_count },
                    ].map((fact) => (
                      <div
                        key={fact.label}
                        style={{
                          border: '1px solid var(--ws-line, #e2e8f0)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{fact.value}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{fact.label}</div>
                      </div>
                    ))}
                  </div>

                  <WsAlert tone={notifyPreview.data.pending_count > 0 ? 'info' : 'warn'} boxed>
                    {notifyPreview.data.pending_count > 0
                      ? notifyPreview.data.pace.summary
                      : 'لا مستلمين جدد — إمّا لا جمهور للنموذج، أو أُشعر الجميع سابقاً.'}
                  </WsAlert>

                  <p style={{ fontSize: 12, opacity: 0.7, margin: '12px 0 6px' }}>
                    نصّ الرسالة كما سيصل وليّ الأمر:
                  </p>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      lineHeight: 1.8,
                      background: 'var(--ws-soft, #f8fafc)',
                      border: '1px solid var(--ws-line, #e2e8f0)',
                      borderRadius: 8,
                      padding: 12,
                      margin: 0,
                      maxHeight: 240,
                      overflowY: 'auto',
                    }}
                  >
                    {notifyPreview.data.sample_message}
                  </pre>
                </>
              )}
            </div>

            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setNotifyOpen(false)}>إلغاء</WsBtn>
              <WsBtn
                variant="primary"
                icon={MessageCircle}
                disabled={
                  notifyMutation.isPending ||
                  !notifyPreview.data ||
                  notifyPreview.data.pending_count === 0
                }
                onClick={async () => {
                  try {
                    await notifyMutation.mutateAsync(safeFormId)
                    setNotifyOpen(false)
                  } catch {
                    /* toast في الهوك */
                  }
                }}
              >
                {notifyMutation.isPending
                  ? 'جارٍ الإدراج...'
                  : `إرسال إلى ${notifyPreview.data?.pending_count ?? 0}`}
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

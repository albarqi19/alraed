/* ======================================================
   منتقي النماذج المعتمدة
   ------------------------------------------------------
   البذرةُ تُنسَخ ولا تُفرَض: المدرسة تأخذ نسخةً مسودّةً فتعدّلها
   كما تشاء — تحذف قسماً، تغيّر صياغة، تضيف سؤالاً. الأصلُ معتمد
   والمنسوخُ حرّ، وما يبقى ثابتاً هو ربطُ الحقول بمفاتيح المعجم.
   ====================================================== */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileStack, Globe, Link2, Loader2 } from 'lucide-react'
import { useFormTemplates, useInstantiateTemplate } from '../hooks'
import { WsBtn, WsChip, WsEmpty, WsModal } from '@/shared/workspace'

export function TemplatePickerButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <WsBtn icon={FileStack} onClick={() => setOpen(true)}>
        من نموذج معتمد
      </WsBtn>

      <TemplatePickerModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function TemplatePickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  // لا يُجلب شيءٌ قبل فتح النافذة — أغلبُ زياراتِ الصفحة لا تلمس القوالب
  const { data: templates, isLoading } = useFormTemplates(open)
  const instantiate = useInstantiateTemplate()

  const handlePick = async (templateId: number) => {
    const form = await instantiate.mutateAsync({ templateId })
    onClose()
    navigate(`/admin/forms/${form.id}/edit`)
  }

  return (
    <WsModal open={open} title="ابدأ من نموذج معتمد" onClose={onClose} maxWidth={620}>
      <div style={{ display: 'grid', gap: 10, padding: '4px 0' }}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--ws-text-2)' }}>
          تُنشأ نسخةٌ <strong>مسودّةً</strong> في مدرستك تعدّلها كما تشاء قبل نشرها. والحقولُ
          المربوطةُ بملفّ الطالب تبقى مربوطةً في نسختك مهما غيّرتَ صياغتها.
        </p>

        {isLoading ? (
          <WsEmpty icon={Loader2}>تُحمَّل النماذج المعتمدة…</WsEmpty>
        ) : !templates?.length ? (
          <WsEmpty icon={FileStack}>لا نماذج معتمدة بعد</WsEmpty>
        ) : (
          templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="ws-btn"
              style={{
                display: 'grid',
                gap: 6,
                textAlign: 'start',
                padding: '12px 14px',
                height: 'auto',
                width: '100%',
              }}
              disabled={instantiate.isPending}
              onClick={() => handlePick(template.id)}
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{template.title}</span>
                {template.is_global ? (
                  <WsChip tone="sky">
                    <Globe style={{ width: 11, height: 11 }} /> معتمد
                  </WsChip>
                ) : null}
              </span>

              {template.description ? (
                <span
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.75,
                    color: 'var(--ws-text-2)',
                    whiteSpace: 'normal',
                  }}
                >
                  {template.description}
                </span>
              ) : null}

              <span style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ws-text-2)' }}>
                <span>{template.sections_count} أقسام</span>
                <span>{template.fields_count} سؤالاً</span>
                {template.mapped_count > 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Link2 style={{ width: 11, height: 11 }} />
                    {template.mapped_count} مرتبطاً بملفّ الطالب
                  </span>
                ) : null}
              </span>
            </button>
          ))
        )}
      </div>
    </WsModal>
  )
}

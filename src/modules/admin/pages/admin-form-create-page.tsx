import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { FormDesigner } from '@/modules/forms/components/form-designer'
import { useCreateAdminFormMutation } from '@/modules/forms/hooks'
import type { FormUpsertPayload } from '@/modules/forms/types'
import { WsPage, WsHeader, WsLayout, WsMain, WsBlock, WsBtn } from '@/shared/workspace'

export function AdminFormCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateAdminFormMutation()

  const handleSubmit = async (payload: FormUpsertPayload) => {
    try {
      const form = await createMutation.mutateAsync(payload)
      navigate(`/admin/forms/${form.id}`)
    } catch {
      /* toast في الهوك */
    }
  }

  return (
    <WsPage>
      <WsHeader
        title="نموذج جديد"
        actions={
          <WsBtn icon={ArrowRight} onClick={() => navigate('/admin/forms')}>
            العودة للقائمة
          </WsBtn>
        }
      />
      <WsLayout>
        <WsMain>
          <WsBlock fill scroll padded>
            <FormDesigner
              mode="create"
              onSubmit={handleSubmit}
              submitting={createMutation.isPending}
              onCancel={() => navigate('/admin/forms')}
            />
          </WsBlock>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}

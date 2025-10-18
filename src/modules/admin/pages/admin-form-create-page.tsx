import { useNavigate } from 'react-router-dom'
import { FormDesigner } from '@/modules/forms/components/form-designer'
import { useCreateAdminFormMutation } from '@/modules/forms/hooks'
import type { FormUpsertPayload } from '@/modules/forms/types'

export function AdminFormCreatePage() {
  const navigate = useNavigate()
  const createMutation = useCreateAdminFormMutation()

  const handleSubmit = async (payload: FormUpsertPayload) => {
    try {
      const form = await createMutation.mutateAsync(payload)
      navigate(`/admin/forms/${form.id}`)
    } catch {
      // Errors handled via toast inside the mutation hook
    }
  }

  return (
    <FormDesigner
      mode="create"
      onSubmit={handleSubmit}
      submitting={createMutation.isPending}
      onCancel={() => navigate('/admin/forms')}
    />
  )
}

/* ======================================================
   المعاينة — بالراسم الحقيقي لا بمحاكاةٍ تقريبية
   ------------------------------------------------------
   ترسم المسودّة بمكوّن وليّ الأمر نفسه
   (guardian/components/forms/guardian-form-renderer) في وضع
   `readOnly`، فيرى الأدمن ما يراه وليّ الأمر بالحرف: نفس الترتيب،
   ونفس عناصر الإدخال، ونفس رسائل الأنواع غير المدعومة.
   ووضعُ القراءة يعطّل المدخلات ويحجب زرّ الإرسال، فلا يخرج من
   المعاينة ردٌّ إلى الخادم.
   ====================================================== */
import { useMemo } from 'react'
import { Eye, ListPlus } from 'lucide-react'
import { GuardianFormRenderer } from '@/modules/guardian/components/forms/guardian-form-renderer'
import { WsAlert, WsEmpty } from '@/shared/workspace'
import { buildPreviewForm } from './designer-model'
import type { DraftField, GeneralState } from './designer-model'

interface FormPreviewProps {
  general: GeneralState
  fields: DraftField[]
  formId: number
}

export function FormPreview({ general, fields, formId }: FormPreviewProps) {
  // ثباتُ مرجع النموذج شرطٌ لا تجميل: الراسم يعيد تهيئة إجاباته كلّما تغيّر
  // المرجع، فبناؤه في كل رسمةٍ يمسح ما يُكتب في المعاينة أوّلاً بأوّل.
  const previewForm = useMemo(() => buildPreviewForm(general, fields, formId), [general, fields, formId])

  if (fields.length === 0) {
    return <WsEmpty icon={ListPlus}>أضف سؤالاً واحداً على الأقل لترى المعاينة.</WsEmpty>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <WsAlert tone="info" icon={Eye}>
        هذا ما يراه وليُّ الأمر بالحرف — مرسومٌ بمكوّنه هو، لا بمحاكاةٍ تشبهه.
      </WsAlert>

      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '4px 14px 18px' }}>
        <GuardianFormRenderer form={previewForm} readOnly />
      </div>
    </div>
  )
}

/* ======================================================
   تبويب الإعدادات — ما ليس سؤالاً
   ------------------------------------------------------
   المعلومات العامّة والمواعيد وسلوك الردود والإسناد. فُصلت عن
   لوح الأسئلة كي لا يبقى المصمّم تمريرةً عمودية طويلة تُخفي بنيته.
   ====================================================== */
import { CalendarClock, FileText, MessageSquareReply, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FormAssignmentScope, FormStatus } from '@/modules/forms/types'
import { WsAlert, WsBlock, WsBtn, WsField, WsInput, WsSelect, WsSwitch, WsTextarea } from '@/shared/workspace'
import { FormAssignmentEditor } from './form-assignment-editor'
import { FORM_STATUS_OPTIONS, type AudienceSelection, type GeneralError, type GeneralState } from './designer-model'

interface FormSettingsPanelProps {
  general: GeneralState
  selection: AudienceSelection
  errors: GeneralError
  disabled?: boolean
  onGeneralChange: <K extends keyof GeneralState>(key: K, value: GeneralState[K]) => void
  onSelectionChange: (selection: AudienceSelection) => void
}

export function FormSettingsPanel({
  general,
  selection,
  errors,
  disabled = false,
  onGeneralChange,
  onSelectionChange,
}: FormSettingsPanelProps) {
  return (
    <>
      <WsBlock title="معلومات النموذج" icon={FileText} padded>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <WsField label="عنوان النموذج *" htmlFor="form-title">
            <WsInput
              id="form-title"
              value={general.title}
              onChange={(event) => onGeneralChange('title', event.target.value)}
              placeholder="مثال: استبيان الزيارات الطبية"
              disabled={disabled}
              style={{ borderColor: errors.title ? 'var(--ws-red)' : undefined }}
            />
            {errors.title && (
              <p style={{ fontSize: 11, color: 'var(--ws-red)', margin: '2px 0 0' }} role="alert">
                {errors.title}
              </p>
            )}
          </WsField>

          <WsField label="التصنيف (اختياري)" htmlFor="form-category">
            <WsInput
              id="form-category"
              value={general.category}
              onChange={(event) => onGeneralChange('category', event.target.value)}
              placeholder="مثال: الصحة المدرسية"
              disabled={disabled}
            />
          </WsField>

          <WsField label="حالة النموذج" htmlFor="form-status">
            <WsSelect
              id="form-status"
              value={general.status}
              onChange={(event) => onGeneralChange('status', event.target.value as FormStatus)}
              disabled={disabled}
            >
              {FORM_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </WsSelect>
          </WsField>
        </div>

        <div style={{ marginTop: 10 }}>
          <WsField label="وصف مختصر" htmlFor="form-description">
            <WsTextarea
              id="form-description"
              value={general.description}
              onChange={(event) => onGeneralChange('description', event.target.value)}
              rows={3}
              placeholder="اشرح الهدف من النموذج وأي تعليمات مهمة لوليّ الأمر."
              disabled={disabled}
            />
          </WsField>
        </div>
      </WsBlock>

      <WsBlock
        title="مدة التوافر وسقف الردود"
        icon={CalendarClock}
        padded
        tools={
          <WsBtn
            size="sm"
            onClick={() => {
              onGeneralChange('start_at', '')
              onGeneralChange('end_at', '')
            }}
            disabled={disabled}
          >
            مسح التاريخين
          </WsBtn>
        }
      >
        {errors.dates && (
          <div style={{ marginBottom: 8 }}>
            <WsAlert tone="error" boxed>
              {errors.dates}
            </WsAlert>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <WsField label="يبدأ في" htmlFor="form-start">
            <WsInput
              id="form-start"
              type="datetime-local"
              value={general.start_at}
              onChange={(event) => onGeneralChange('start_at', event.target.value)}
              disabled={disabled}
            />
          </WsField>
          <WsField label="ينتهي في" htmlFor="form-end">
            <WsInput
              id="form-end"
              type="datetime-local"
              value={general.end_at}
              onChange={(event) => onGeneralChange('end_at', event.target.value)}
              disabled={disabled}
            />
          </WsField>
          <WsField label="سقف الردود (اختياري)" htmlFor="form-max-responses">
            <WsInput
              id="form-max-responses"
              type="number"
              min={1}
              value={general.max_responses}
              onChange={(event) => onGeneralChange('max_responses', event.target.value)}
              placeholder="اتركه فارغاً لعددٍ غير محدود"
              disabled={disabled}
            />
          </WsField>
        </div>
      </WsBlock>

      <WsBlock title="من يرى النموذج" icon={Users} padded>
        <FormAssignmentEditor
          audience={general.target_audience}
          selection={selection}
          disabled={disabled}
          error={errors.assignments}
          onAudienceChange={(audience: FormAssignmentScope) => onGeneralChange('target_audience', audience)}
          onSelectionChange={onSelectionChange}
        />
      </WsBlock>

      <WsBlock title="سلوك الردود" icon={MessageSquareReply} padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SwitchRow
            checked={general.allow_multiple_submissions}
            disabled={disabled}
            onChange={(checked) => onGeneralChange('allow_multiple_submissions', checked)}
            title="السماح بأكثر من ردٍّ لكل طالب"
            hint="بدونه يُرفض الإرسال الثاني، ويختفي النموذج من قائمة وليّ الأمر بعد أوّل ردّ."
          />
          <SwitchRow
            checked={general.allow_edit_after_submit}
            disabled={disabled}
            onChange={(checked) => onGeneralChange('allow_edit_after_submit', checked)}
            title="السماح بتعديل الردّ بعد إرساله"
            hint="يفتح آخر ردٍّ للتعديل بدل رفض المحاولة الثانية — ولا أثر له مع السماح بردودٍ متعددة."
          />
          <SwitchRow
            checked={general.requires_approval}
            disabled={disabled}
            onChange={(checked) => onGeneralChange('requires_approval', checked)}
            title="يتطلّب اعتماد الإدارة"
            hint="يصل الردّ بحالة «قيد المراجعة» بدل «تم الإرسال»، ويُعتمد أو يُرفض من صفحة الردود."
          />
        </div>
      </WsBlock>
    </>
  )
}

function SwitchRow({
  checked,
  disabled,
  onChange,
  title,
  hint,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  title: ReactNode
  hint: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <WsSwitch checked={checked} onChange={onChange} disabled={disabled} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ws-text-2)' }}>{hint}</span>
      </span>
    </div>
  )
}

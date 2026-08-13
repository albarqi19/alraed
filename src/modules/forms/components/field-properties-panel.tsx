/* ======================================================
   عمود خصائص السؤال المحدَّد
   ------------------------------------------------------
   ما كان مبعثراً inline تحت كل حقل صار هنا لسؤالٍ واحد فقط.
   وفيه ما لم يكن موجوداً أصلاً: محرِّرُ إعدادات النوع (الصيغ
   المسموحة وحجمُها وعددُها للمرفقات، والحدودُ للرقم، وسقفُ التقييم).
   المفاتيح كلُّها snake_case لأنّها تُخزَّن كما هي ويقرؤها الخادم حرفياً.
   ====================================================== */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { MousePointerClick, Settings2, SlidersHorizontal } from 'lucide-react'
import {
  FORM_FIELD_PALETTE,
  FORM_FIELD_TYPE_MAP,
  fieldTypeHasOptions,
  fieldTypeStoresAnswer,
  getFieldTypeDefaults,
  isAttachmentFieldType,
} from '@/modules/forms/constants'
import type { FormFieldSettings, FormFieldType } from '@/modules/forms/types'
import { WsBlock, WsEmpty, WsField, WsInput, WsSelect, WsSwitch, WsTextarea } from '@/shared/workspace'
import { FieldOptionsEditor } from './field-options-editor'
import type { DraftField, FieldError } from './designer-model'

/**
 * الصيغُ المعروضة للاختيار. الخادم لا يفرض قائمةً بيضاء (يطابق الامتداد
 * بما في `allowed_types` وحده)، فهذه راحةُ اختيارٍ لا قيدُ أمان — ولذلك
 * تشمل صيغَ المستندات للملفّ وصيغَ الصور وحدها للصورة.
 */
const EXTENSION_CHOICES: Record<'file' | 'image', string[]> = {
  file: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip'],
  image: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'],
}

/** الأنواع التي يعني فيها «النص البديل» شيئاً — بقيّتها لا مُدخل نصّي لها */
const PLACEHOLDER_TYPES = new Set<FormFieldType>(['text', 'textarea', 'number', 'phone', 'email'])

interface FieldPropertiesPanelProps {
  field: DraftField | null
  errors?: FieldError
  disabled?: boolean
  /** يُركّز على التسمية فور إضافة سؤالٍ جديد — لا عند كل نقرة اختيار */
  focusLabelKey?: string | null
  onPatch: (patch: Partial<DraftField>) => void
  onRetype: (type: FormFieldType) => void
  onSettings: (patch: FormFieldSettings) => void
}

export function FieldPropertiesPanel({
  field,
  errors,
  disabled = false,
  focusLabelKey,
  onPatch,
  onRetype,
  onSettings,
}: FieldPropertiesPanelProps) {
  const labelRef = useRef<HTMLInputElement>(null)
  const localId = field?.localId ?? null

  // التبعيّة على المعرّف لا على كائن الحقل: الكائن يُستبدل مع كل حرفٍ يُكتب،
  // فلو تعلّق الأثر به لأعاد التركيز وتحديدَ النصّ في كل ضغطة زرّ.
  useEffect(() => {
    if (localId && focusLabelKey === localId) {
      labelRef.current?.focus()
      labelRef.current?.select()
    }
  }, [localId, focusLabelKey])

  if (!field) {
    return <WsEmpty icon={MousePointerClick}>اختر سؤالاً من اللوح لتظهر خصائصه هنا.</WsEmpty>
  }

  const meta = FORM_FIELD_TYPE_MAP[field.type]
  const settings = field.settings ?? {}
  const hiddenType = meta && !meta.paletteVisible

  return (
    <div className="ws-sidecol__scroll">
      <WsBlock title="أساسيات السؤال" icon={SlidersHorizontal} padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WsField label="عنوان السؤال *">
            <WsInput
              ref={labelRef}
              value={field.label}
              onChange={(event) => onPatch({ label: event.target.value })}
              placeholder="مثال: سبب الطلب"
              disabled={disabled}
              style={{ borderColor: errors?.label ? 'var(--ws-red)' : undefined }}
            />
            {errors?.label && <ErrorNote>{errors.label}</ErrorNote>}
          </WsField>

          <WsField label="نوع السؤال">
            <WsSelect
              value={field.type}
              onChange={(event) => onRetype(event.target.value as FormFieldType)}
              disabled={disabled}
            >
              {FORM_FIELD_PALETTE.map((group) => (
                <optgroup key={group.group} label={group.label}>
                  {group.types.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              {/* نوعٌ محجوبٌ عن اللوحة قد يحمله نموذجٌ قديم: يُعرض كي لا تُقرأ
                  القائمةُ فارغةً، ولا يُختار من جديد */}
              {hiddenType && (
                <optgroup label="نوع غير مدعوم في واجهة وليّ الأمر">
                  <option value={field.type}>{meta?.label ?? field.type}</option>
                </optgroup>
              )}
            </WsSelect>
            {meta && (
              <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>{meta.description}</p>
            )}
          </WsField>

          <WsField label="مفتاح الحقل *">
            <WsInput
              value={field.field_key}
              onChange={(event) => onPatch({ field_key: event.target.value.trim(), autoKey: false })}
              placeholder="request_reason"
              dir="ltr"
              disabled={disabled}
              style={{ borderColor: errors?.field_key ? 'var(--ws-red)' : undefined, textAlign: 'left' }}
            />
            {errors?.field_key ? (
              <ErrorNote>{errors.field_key}</ErrorNote>
            ) : (
              <p style={{ fontSize: 10.5, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>
                اسمُ الحقل في الإجابات والتصدير — يُولَّد تلقائياً حتى تحرّره بنفسك.
              </p>
            )}
          </WsField>

          <WsField label="وصف تحت العنوان">
            <WsTextarea
              value={field.description ?? ''}
              onChange={(event) => onPatch({ description: event.target.value })}
              rows={2}
              placeholder="شرحٌ يظهر لوليّ الأمر تحت السؤال"
              disabled={disabled}
            />
          </WsField>

          <WsField label="نص مساعد أسفل الحقل">
            <WsInput
              value={field.helper_text ?? ''}
              onChange={(event) => onPatch({ helper_text: event.target.value })}
              placeholder="مثال: اذكر التفاصيل إن وجدت"
              disabled={disabled}
            />
          </WsField>

          {PLACEHOLDER_TYPES.has(field.type) && (
            <WsField label="نص بديل داخل الحقل">
              <WsInput
                value={field.placeholder ?? ''}
                onChange={(event) => onPatch({ placeholder: event.target.value })}
                placeholder="مثال: أدخل السبب هنا"
                disabled={disabled}
              />
            </WsField>
          )}

          {fieldTypeStoresAnswer(field.type) && (
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}
            >
              <WsSwitch
                checked={Boolean(field.is_required)}
                onChange={(checked) => onPatch({ is_required: checked })}
                disabled={disabled}
              />
              إجابةٌ إجبارية
            </label>
          )}
        </div>
      </WsBlock>

      {fieldTypeHasOptions(field.type) && (
        <WsBlock title="الخيارات" icon={Settings2} padded>
          {/* المفتاح يُجبر المحرّر على البدء من جديد مع كلّ سؤال: وضعُ «لصق دفعة»
              يحتفظ بنصّه في حالةٍ محلّية، فبقاء المكوّن نفسه بين سؤالين يعني أن
              يُكتب نصُّ الأوّل على خيارات الثاني عند مغادرة الحقل */}
          <FieldOptionsEditor
            key={field.localId}
            options={settings.options ?? []}
            disabled={disabled}
            error={errors?.options}
            onChange={(options) => onSettings({ options })}
          />
        </WsBlock>
      )}

      {isAttachmentFieldType(field.type) && (
        <WsBlock title="إعدادات المرفق" icon={Settings2} padded>
          <AttachmentSettings
            type={field.type}
            settings={settings}
            disabled={disabled}
            onSettings={onSettings}
          />
        </WsBlock>
      )}

      {field.type === 'number' && (
        <WsBlock title="حدود الرقم" icon={Settings2} padded>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <NumberSetting
              label="أدنى"
              value={settings.min}
              disabled={disabled}
              onChange={(min) => onSettings({ min })}
            />
            <NumberSetting
              label="أعلى"
              value={settings.max}
              disabled={disabled}
              onChange={(max) => onSettings({ max })}
            />
            <NumberSetting
              label="الخطوة"
              value={settings.step}
              disabled={disabled}
              onChange={(step) => onSettings({ step })}
            />
          </div>
        </WsBlock>
      )}

      {field.type === 'rating' && (
        <WsBlock title="التقييم" icon={Settings2} padded>
          <NumberSetting
            label="أقصى عدد نجوم"
            value={settings.max_rating ?? getFieldTypeDefaults('rating').max_rating}
            min={2}
            max={10}
            disabled={disabled}
            onChange={(max_rating) => onSettings({ max_rating })}
          />
        </WsBlock>
      )}

      {(field.type === 'text' || field.type === 'textarea') && (
        <WsBlock title="حدود النصّ" icon={Settings2} padded>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberSetting
              label="أقل عدد أحرف"
              value={settings.min_length}
              disabled={disabled}
              onChange={(min_length) => onSettings({ min_length })}
            />
            <NumberSetting
              label="أكثر عدد أحرف"
              value={settings.max_length}
              disabled={disabled}
              onChange={(max_length) => onSettings({ max_length })}
            />
          </div>
        </WsBlock>
      )}
    </div>
  )
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--ws-red)', margin: '2px 0 0' }} role="alert">
      {children}
    </p>
  )
}

function NumberSetting({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string
  value?: number | null
  min?: number
  max?: number
  disabled?: boolean
  onChange: (value: number | null) => void
}) {
  return (
    <WsField label={label}>
      <WsInput
        type="number"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
        disabled={disabled}
        style={{ width: '100%' }}
      />
    </WsField>
  )
}

function AttachmentSettings({
  type,
  settings,
  disabled,
  onSettings,
}: {
  type: 'file' | 'image'
  settings: FormFieldSettings
  disabled?: boolean
  onSettings: (patch: FormFieldSettings) => void
}) {
  const defaults = getFieldTypeDefaults(type)
  const allowed = settings.allowed_types ?? defaults.allowed_types ?? []

  const toggle = (extension: string) => {
    const next = allowed.includes(extension)
      ? allowed.filter((item) => item !== extension)
      : [...allowed, extension]

    // قائمةٌ فارغة تعني «لا صيغة مقبولة» فيرتدّ كلُّ رفع: نعيدها للافتراض بدلها
    onSettings({ allowed_types: next.length > 0 ? next : (defaults.allowed_types ?? []) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="ws-label">الصيغ المسموحة</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {EXTENSION_CHOICES[type].map((extension) => {
            const active = allowed.includes(extension)
            return (
              <button
                key={extension}
                type="button"
                className="ws-chip"
                onClick={() => toggle(extension)}
                disabled={disabled}
                style={{
                  direction: 'ltr',
                  cursor: 'pointer',
                  background: active ? 'var(--ws-accent-soft)' : undefined,
                  borderColor: active ? 'var(--ws-accent)' : undefined,
                  color: active ? 'var(--ws-accent)' : undefined,
                }}
              >
                {extension}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <NumberSetting
          label="أقصى عدد ملفّات"
          value={settings.max_files ?? defaults.max_files}
          min={1}
          max={20}
          disabled={disabled}
          onChange={(max_files) => onSettings({ max_files })}
        />
        <NumberSetting
          label="أقصى حجم (ك.ب)"
          value={settings.max_size_kb ?? defaults.max_size_kb}
          min={64}
          disabled={disabled}
          onChange={(max_size_kb) => onSettings({ max_size_kb })}
        />
      </div>

      <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: 0 }}>
        {type === 'image'
          ? 'حقل الصورة يخزَّن كالملفّ تماماً، ويفترق عنه بمعاينةٍ مصغّرة قبل الإرسال وبفتح الكاميرا على الجوال.'
          : 'الحدودُ هنا يفرضها الخادم عند الرفع، لا الواجهةُ وحدها.'}
      </p>
    </div>
  )
}

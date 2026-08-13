/* ======================================================
   محرِّر خيارات السؤال (قائمة/متعددة/أزرار)
   ------------------------------------------------------
   وضعان: صفوفٌ للتحرير الدقيق، ولصقٌ دفعةً واحدة للقوائم الطويلة.
   القيمة (value) هي ما يُخزَّن في الإجابة ويُطابَق به في الخادم، فهي
   لاتينيةٌ فريدة تُشتق من التسمية ما لم يكتبها المصمّم بيده.
   ====================================================== */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FormFieldOption } from '@/modules/forms/types'
import { WsBtn, WsIconBtn, WsInput, WsTextarea } from '@/shared/workspace'
import { slugifyKey } from './designer-model'

interface FieldOptionsEditorProps {
  options: FormFieldOption[]
  disabled?: boolean
  error?: string
  onChange: (options: FormFieldOption[]) => void
}

/** قيمةٌ لاتينية فريدة: التسمية العربية لا تُنتج حروفاً لاتينية فتُرقَّم بموضعها */
function deriveValue(label: string, index: number, taken: Set<string>): string {
  const base = slugifyKey(label) || `option_${index + 1}`
  if (!taken.has(base)) return base

  let counter = 2
  while (taken.has(`${base}_${counter}`)) counter += 1
  return `${base}_${counter}`
}

function optionsToText(options: FormFieldOption[]): string {
  return options.map((option) => `${option.label} | ${option.value}`).join('\n')
}

function textToOptions(text: string): FormFieldOption[] {
  const taken = new Set<string>()

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelPart, valuePart] = line.split('|').map((part) => part.trim())
      const label = labelPart || `خيار ${index + 1}`
      const value = valuePart ? deriveValue(valuePart, index, taken) : deriveValue(label, index, taken)
      taken.add(value)
      return { label, value }
    })
}

export function FieldOptionsEditor({ options, disabled = false, error, onChange }: FieldOptionsEditorProps) {
  const [bulkMode, setBulkMode] = useState(false)
  /**
   * نصُّ اللصق يعيش في حالةٍ محلّية ولا يُشتقّ من `options` في كلّ رسمة.
   *
   * كان النصُّ مشتقّاً، والتحرير يُعيد بناء الخيارات ثمّ يُعيد كتابة النصّ منها
   * فيُقحم « | value» خلف ما يكتبه المصمّم حرفاً بحرف ويقفز المؤشّر إلى الآخر —
   * فلا تصلح إلا لصقةٌ واحدة، وأيُّ حرفٍ بعدها يفسد السطر. الآن يُلتقط النصُّ عند
   * دخول الوضع، ويُطبَّق على الخيارات عند مغادرة الحقل أو الخروج من الوضع.
   */
  const [bulkText, setBulkText] = useState('')

  const openBulkMode = () => {
    setBulkText(optionsToText(options))
    setBulkMode(true)
  }

  const commitBulkText = () => {
    onChange(textToOptions(bulkText))
  }

  const updateOption = (index: number, patch: Partial<FormFieldOption>) => {
    const next = options.map((option, position) => (position === index ? { ...option, ...patch } : option))

    // تغييرُ التسمية يجرّ القيمةَ معه ما دامت مشتقّةً منها؛ فإن حرّرها المصمّم
    // بيده صارت ملكه ولا نلمسها — القيمةُ المحفوظة في إجاباتٍ سابقة لا تُبدَّل عبثاً.
    if (patch.label !== undefined) {
      const current = options[index]
      const wasDerived = !current.value || current.value === slugifyKey(current.label) || /^option_\d+$/.test(current.value)
      if (wasDerived) {
        const taken = new Set(next.filter((_, position) => position !== index).map((option) => option.value))
        next[index] = { ...next[index], value: deriveValue(patch.label, index, taken) }
      }
    }

    onChange(next)
  }

  const addOption = () => {
    const taken = new Set(options.map((option) => option.value))
    const label = `خيار ${options.length + 1}`
    onChange([...options, { label, value: deriveValue(label, options.length, taken) }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="ws-label">الخيارات ({options.length})</span>
        <button
          type="button"
          className="ws-seg__btn"
          style={{ border: '1px solid var(--ws-border)', borderRadius: 7, height: 24 }}
          onClick={() => {
            if (bulkMode) {
              // الخروج يُطبّق ما كُتب: مغادرةٌ صامتة تُضيّع ما لصقه المصمّم للتوّ
              commitBulkText()
              setBulkMode(false)
              return
            }
            openBulkMode()
          }}
          disabled={disabled}
        >
          {bulkMode ? 'تحرير صفوف' : 'لصق دفعة'}
        </button>
      </div>

      {bulkMode ? (
        <>
          <WsTextarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            onBlur={commitBulkText}
            rows={6}
            disabled={disabled}
            placeholder={'خيار في كل سطر، ويمكن تحديد القيمة بعد | مثل:\nموافق | yes\nغير موافق | no'}
            dir="auto"
          />
          <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: 0 }}>
            سطرٌ لكل خيار. القيمةُ تُولَّد تلقائياً إن تركت ما بعد الخط العمودي فارغاً، وتُطبَّق
            التغييرات عند مغادرة الحقل أو العودة إلى «تحرير صفوف».
          </p>
        </>
      ) : (
        <>
          {options.length === 0 ? (
            <p style={{ fontSize: 11.5, color: 'var(--ws-text-2)', margin: 0 }}>
              لا خيارات بعد — وسؤالٌ بلا خيارات يصل وليَّ الأمر فارغاً لا يستطيع الإجابة عليه.
            </p>
          ) : (
            options.map((option, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WsInput
                  value={option.label}
                  onChange={(event) => updateOption(index, { label: event.target.value })}
                  placeholder={`خيار ${index + 1}`}
                  disabled={disabled}
                  style={{ flex: 1, minWidth: 0 }}
                  aria-label={`تسمية الخيار ${index + 1}`}
                />
                <WsInput
                  value={option.value}
                  onChange={(event) => updateOption(index, { value: event.target.value })}
                  placeholder="value"
                  disabled={disabled}
                  dir="ltr"
                  style={{ width: 96, flexShrink: 0, fontSize: 11 }}
                  aria-label={`قيمة الخيار ${index + 1}`}
                />
                <WsIconBtn
                  icon={Trash2}
                  label={`حذف الخيار ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange(options.filter((_, position) => position !== index))}
                />
              </div>
            ))
          )}

          <WsBtn size="sm" icon={Plus} onClick={addOption} disabled={disabled}>
            خيار جديد
          </WsBtn>
        </>
      )}

      {error && (
        <p style={{ fontSize: 11.5, color: 'var(--ws-red)', margin: 0 }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

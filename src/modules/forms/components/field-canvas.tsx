/* ======================================================
   لوح الأسئلة — صفوفٌ مطويّة كثيفة
   ------------------------------------------------------
   لا حقلَ مفتوحٌ داخل اللوح: الصفُّ يُعرِّف بنفسه (رتبته، نوعه،
   تسميته، مفتاحه، إلزامه) وخصائصُه تُحرَّر في العمود المجاور.
   نموذجٌ بعشرين سؤالاً يُرى كاملاً في شاشةٍ واحدة بدل عشرين شاشة.
   ====================================================== */
import { useState } from 'react'
import { AlertTriangle, Copy, GripVertical, ListPlus, Lock, Trash2 } from 'lucide-react'
import { FORM_FIELD_TYPE_MAP } from '@/modules/forms/constants'
import { WsChip, WsEmpty, WsIconBtn } from '@/shared/workspace'
import type { DraftField, FieldError } from './designer-model'

interface FieldCanvasProps {
  fields: DraftField[]
  selectedId: string | null
  errors: Record<string, FieldError>
  /** وصلت ردود: البنية مقفلة، فلا ترتيب ولا حذف ولا تكرار */
  locked: boolean
  onSelect: (localId: string) => void
  onDuplicate: (localId: string) => void
  onRemove: (localId: string) => void
  onMove: (from: number, to: number) => void
}

export function FieldCanvas({
  fields,
  selectedId,
  errors,
  locked,
  onSelect,
  onDuplicate,
  onRemove,
  onMove,
}: FieldCanvasProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (fields.length === 0) {
    return (
      <WsEmpty icon={ListPlus}>
        لا أسئلة بعد.
        <br />
        اختر نوعاً من لوحة الأنواع ليُضاف هنا.
      </WsEmpty>
    )
  }

  const finishDrag = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className="ws-rows">
      {fields.map((field, index) => {
        const meta = FORM_FIELD_TYPE_MAP[field.type]
        const Icon = meta?.icon
        const fieldErrors = errors[field.localId]
        const errorText = fieldErrors ? Object.values(fieldErrors).filter(Boolean).join(' · ') : ''
        const isSelected = field.localId === selectedId
        const isSpacer = field.type === 'section_break'

        return (
          <div
            key={field.localId}
            role="button"
            tabIndex={0}
            aria-current={isSelected}
            className="ws-row"
            draggable={!locked}
            onDragStart={(event) => {
              setDragIndex(index)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(event) => {
              if (dragIndex === null) return
              event.preventDefault()
              setOverIndex(index)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index)
              finishDrag()
            }}
            onDragEnd={finishDrag}
            onClick={() => onSelect(field.localId)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(field.localId)
              }
            }}
            style={{
              cursor: 'pointer',
              // التحديد بغسلةٍ وإطارٍ كامل — لا شريط جانبي ملوّن
              background: isSelected
                ? 'var(--ws-accent-soft)'
                : isSpacer
                  ? 'var(--ws-surface-2)'
                  : undefined,
              boxShadow: isSelected ? 'inset 0 0 0 1px var(--ws-accent)' : undefined,
              outline: overIndex === index && dragIndex !== null ? '1px dashed var(--ws-accent-2)' : undefined,
              outlineOffset: -1,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
              {locked ? (
                <Lock style={{ width: 13, height: 13, color: 'var(--ws-text-2)', flexShrink: 0 }} />
              ) : (
                <span
                  role="button"
                  tabIndex={0}
                  title="اسحب للترتيب، أو استعمل السهمين بعد التركيز"
                  aria-label={`ترتيب السؤال ${index + 1}`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp' && index > 0) {
                      event.preventDefault()
                      onMove(index, index - 1)
                    }
                    if (event.key === 'ArrowDown' && index < fields.length - 1) {
                      event.preventDefault()
                      onMove(index, index + 1)
                    }
                  }}
                  style={{ display: 'inline-flex', color: 'var(--ws-text-2)', cursor: 'grab', flexShrink: 0 }}
                >
                  <GripVertical style={{ width: 14, height: 14 }} />
                </span>
              )}

              <span
                style={{
                  minWidth: 18,
                  textAlign: 'center',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--ws-text-2)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {index + 1}
              </span>

              {Icon && (
                <Icon style={{ width: 14, height: 14, color: 'var(--ws-accent-2)', flexShrink: 0 }} />
              )}

              <span style={{ minWidth: 0 }}>
                <span className="ws-row__name" style={{ display: 'block' }}>
                  {field.label.trim() || 'سؤال بلا عنوان'}
                </span>
                <span className="ws-pick__sub" style={{ direction: 'ltr', textAlign: 'right' }}>
                  {field.field_key}
                </span>
              </span>
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {errorText && (
                <span title={errorText} aria-label={errorText} style={{ display: 'inline-flex' }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: 'var(--ws-red)' }} />
                </span>
              )}
              <WsChip>{meta?.label ?? field.type}</WsChip>
              {field.is_required && <WsChip tone="amber">مطلوب</WsChip>}
              {!locked && (
                <>
                  <WsIconBtn
                    icon={Copy}
                    label="تكرار السؤال"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDuplicate(field.localId)
                    }}
                  />
                  <WsIconBtn
                    icon={Trash2}
                    label="حذف السؤال"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemove(field.localId)
                    }}
                  />
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

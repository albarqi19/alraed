/* ======================================================
   لوحة أنواع الحقول — العمود الأيمن في المصمّم
   ------------------------------------------------------
   مصدرها الوحيد `FORM_FIELD_PALETTE` من constants.ts، بمجموعاتها
   وترتيبها وأيقوناتها. النقر يُضيف الحقل إلى آخر اللوح ويختاره.
   ====================================================== */
import { useMemo, useState } from 'react'
import { Calendar, ListChecks, Paperclip, Search, SeparatorHorizontal, Type } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FORM_FIELD_PALETTE } from '@/modules/forms/constants'
import type { FormFieldGroup, FormFieldTypeMeta } from '@/modules/forms/constants'
import type { FormFieldType } from '@/modules/forms/types'
import { WsBlock, WsEmpty, WsInput } from '@/shared/workspace'

/** أيقونةُ المجموعة زينةٌ للرأس وحدها — أيقونةُ النوع نفسها تأتي من المصدر */
const GROUP_ICONS: Record<FormFieldGroup, LucideIcon> = {
  text: Type,
  choice: ListChecks,
  datetime: Calendar,
  attachment: Paperclip,
  layout: SeparatorHorizontal,
}

interface FieldTypePaletteProps {
  disabled?: boolean
  onAdd: (type: FormFieldType) => void
}

export function FieldTypePalette({ disabled = false, onAdd }: FieldTypePaletteProps) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim()
    if (!needle) return FORM_FIELD_PALETTE

    return FORM_FIELD_PALETTE.map((group) => ({
      ...group,
      types: group.types.filter(
        (meta) => meta.label.includes(needle) || meta.description.includes(needle),
      ),
    })).filter((group) => group.types.length > 0)
  }, [query])

  return (
    <>
      <div className="ws-block__body" style={{ paddingBottom: 8 }}>
        <div style={{ position: 'relative' }}>
          <Search
            style={{
              position: 'absolute',
              insetInlineStart: 8,
              top: 8,
              width: 14,
              height: 14,
              color: 'var(--ws-text-2)',
              pointerEvents: 'none',
            }}
          />
          <WsInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن نوع…"
            aria-label="بحث في أنواع الحقول"
            style={{ width: '100%', paddingInlineStart: 28 }}
          />
        </div>
      </div>

      <div className="ws-sidecol__scroll">
        {groups.length === 0 ? (
          <WsEmpty icon={Search}>لا نوع يطابق «{query}»</WsEmpty>
        ) : (
          groups.map((group) => (
            <WsBlock key={group.group} title={group.label} icon={GROUP_ICONS[group.group]} padded>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {group.types.map((meta) => (
                  <PaletteTile key={meta.value} meta={meta} disabled={disabled} onAdd={onAdd} />
                ))}
              </div>
            </WsBlock>
          ))
        )}
      </div>
    </>
  )
}

function PaletteTile({
  meta,
  disabled,
  onAdd,
}: {
  meta: FormFieldTypeMeta
  disabled: boolean
  onAdd: (type: FormFieldType) => void
}) {
  const Icon = meta.icon

  return (
    <button
      type="button"
      className="ws-btn ws-btn--sm"
      style={{ justifyContent: 'flex-start', width: '100%', minWidth: 0 }}
      title={meta.description}
      disabled={disabled}
      onClick={() => onAdd(meta.value)}
    >
      {/* تطعيمٌ بالكروما لا بشريطٍ جانبي: الأيقونة وحدها تحمل لون الأكسنت */}
      <span style={{ display: 'inline-flex', color: 'var(--ws-accent-2)', flexShrink: 0 }}>
        <Icon />
      </span>
      <span
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
      >
        {meta.label}
      </span>
    </button>
  )
}

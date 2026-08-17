/* ======================================================
   لوحة المصمّم — العمود الأيمن
   ------------------------------------------------------
   لوحان: «أنواع الحقول» مصدرها `FORM_FIELD_PALETTE`، و«بيانات
   الطالب» مصدرها معجمُ السمات من الخادم. النقر في الأولى يضيف
   حقلاً حرّاً، وفي الثانية يضيفه **مربوطاً بمفتاح سمة** — فيهبط
   جوابه في ملفّ الطالب عند اعتماد الرد.
   ====================================================== */
import { useMemo, useState } from 'react'
import {
  Calendar,
  HeartPulse,
  ListChecks,
  Lock,
  Paperclip,
  Search,
  SeparatorHorizontal,
  Type,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FORM_FIELD_PALETTE } from '@/modules/forms/constants'
import type { FormFieldGroup, FormFieldTypeMeta } from '@/modules/forms/constants'
import type { FormFieldType } from '@/modules/forms/types'
import { useAttributeDefinitions } from '@/modules/student-attributes/hooks'
import type { AttributeDefinition } from '@/modules/student-attributes/types'
import { WsBlock, WsEmpty, WsInput } from '@/shared/workspace'
import { TONES, ToneChip } from '@/shared/workspace/tones'

/** أيقونةُ المجموعة زينةٌ للرأس وحدها — أيقونةُ النوع نفسها تأتي من المصدر */
const GROUP_ICONS: Record<FormFieldGroup, LucideIcon> = {
  text: Type,
  choice: ListChecks,
  datetime: Calendar,
  attachment: Paperclip,
  layout: SeparatorHorizontal,
}

type PaletteTab = 'types' | 'attributes'

interface FieldTypePaletteProps {
  disabled?: boolean
  onAdd: (type: FormFieldType) => void
  onAddAttribute?: (attribute: AttributeDefinition) => void
  /** المفاتيح المستعملة في اللوح — سمةٌ مضافةٌ لا تُضاف مرّتين */
  usedAttributeKeys?: string[]
}

export function FieldTypePalette({
  disabled = false,
  onAdd,
  onAddAttribute,
  usedAttributeKeys = [],
}: FieldTypePaletteProps) {
  const [tab, setTab] = useState<PaletteTab>('types')
  const [query, setQuery] = useState('')

  // لا يُجلب المعجم إلا حين يُفتح لوحُه — أغلبُ النماذج لا تلمس سمةً واحدة
  const { data: definitions, isLoading } = useAttributeDefinitions(
    tab === 'attributes' && Boolean(onAddAttribute),
  )

  const typeGroups = useMemo(() => {
    const needle = query.trim()
    if (!needle) return FORM_FIELD_PALETTE

    return FORM_FIELD_PALETTE.map((group) => ({
      ...group,
      types: group.types.filter(
        (meta) => meta.label.includes(needle) || meta.description.includes(needle),
      ),
    })).filter((group) => group.types.length > 0)
  }, [query])

  const attributeGroups = useMemo(() => {
    const needle = query.trim()
    const groups = definitions?.data ?? []
    if (!needle) return groups

    return groups
      .map((group) => ({
        ...group,
        attributes: group.attributes.filter(
          (attribute) => attribute.label.includes(needle) || attribute.key.includes(needle),
        ),
      }))
      .filter((group) => group.attributes.length > 0)
  }, [definitions, query])

  return (
    <>
      <div className="ws-block__body" style={{ paddingBottom: 8, display: 'grid', gap: 8 }}>
        {onAddAttribute ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <TabButton active={tab === 'types'} icon={Type} onClick={() => setTab('types')}>
              أنواع الحقول
            </TabButton>
            <TabButton
              active={tab === 'attributes'}
              icon={UserRound}
              onClick={() => setTab('attributes')}
            >
              بيانات الطالب
            </TabButton>
          </div>
        ) : null}

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
            placeholder={tab === 'types' ? 'ابحث عن نوع…' : 'ابحث عن سمة…'}
            aria-label={tab === 'types' ? 'بحث في أنواع الحقول' : 'بحث في سمات الطالب'}
            style={{ width: '100%', paddingInlineStart: 28 }}
          />
        </div>
      </div>

      <div className="ws-sidecol__scroll">
        {tab === 'types' ? (
          typeGroups.length === 0 ? (
            <WsEmpty icon={Search}>لا نوع يطابق «{query}»</WsEmpty>
          ) : (
            typeGroups.map((group) => (
              <WsBlock key={group.group} title={group.label} icon={GROUP_ICONS[group.group]} padded>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {group.types.map((meta) => (
                    <PaletteTile key={meta.value} meta={meta} disabled={disabled} onAdd={onAdd} />
                  ))}
                </div>
              </WsBlock>
            ))
          )
        ) : isLoading ? (
          <WsEmpty icon={UserRound}>يُحمَّل المعجم…</WsEmpty>
        ) : attributeGroups.length === 0 ? (
          <WsEmpty icon={Search}>لا سمة تطابق «{query}»</WsEmpty>
        ) : (
          <>
            <div
              style={{
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.7,
                color: 'var(--ws-text-2)',
                background: 'var(--ws-sunken)',
                borderBottom: '1px solid var(--ws-hairline)',
              }}
            >
              السؤال المسحوب من هنا يهبط جوابُه في ملفّ الطالب عند اعتماد الردّ. صياغتُه لك،
              والمفتاح ثابتٌ عند كل المدارس.
            </div>

            {attributeGroups.map((group) => (
              <WsBlock
                key={group.section}
                title={group.label}
                icon={group.section === 'health' ? HeartPulse : UserRound}
                count={group.attributes.length}
                padded
              >
                <div style={{ display: 'grid', gap: 5 }}>
                  {group.attributes.map((attribute) => (
                    <AttributeTile
                      key={attribute.key}
                      attribute={attribute}
                      disabled={disabled}
                      used={usedAttributeKeys.includes(attribute.key)}
                      onAdd={onAddAttribute!}
                    />
                  ))}
                </div>
              </WsBlock>
            ))}
          </>
        )}
      </div>
    </>
  )
}

function TabButton({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean
  icon: LucideIcon
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={active ? 'ws-btn ws-btn--sm ws-btn--primary' : 'ws-btn ws-btn--sm'}
      style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </button>
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

/**
 * بلاطةُ سمة.
 *
 * درجةُ الحساسية تُعرَض للمصمّم عمداً: هو يقرّر أيّ سؤالٍ يضع في نموذجه، ومن
 * حقّه أن يعرف أن جواب هذا السؤال لن يراه إلا الموجّه. والقفلُ علامةُ إغلاقٍ لا
 * منعِ إضافة.
 */
function AttributeTile({
  attribute,
  disabled,
  used,
  onAdd,
}: {
  attribute: AttributeDefinition
  disabled: boolean
  used: boolean
  onAdd: (attribute: AttributeDefinition) => void
}) {
  const tone =
    attribute.sensitivity === 'closed'
      ? TONES.red
      : attribute.sensitivity === 'restricted'
        ? TONES.amber
        : TONES.green

  return (
    <button
      type="button"
      className="ws-btn ws-btn--sm"
      style={{
        justifyContent: 'space-between',
        width: '100%',
        minWidth: 0,
        gap: 8,
        opacity: used ? 0.5 : 1,
      }}
      title={used ? 'مضافةٌ في هذا النموذج' : (attribute.note ?? attribute.key)}
      disabled={disabled || used}
      onClick={() => onAdd(attribute)}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {attribute.sensitivity === 'closed' ? (
          <Lock style={{ width: 13, height: 13, color: TONES.red.tx, flexShrink: 0 }} />
        ) : null}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {attribute.label}
        </span>
      </span>

      <ToneChip tone={tone}>{attribute.sensitivity_label}</ToneChip>
    </button>
  )
}

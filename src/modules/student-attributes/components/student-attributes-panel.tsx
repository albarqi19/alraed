/* ======================================================
   لوحة سمات الطالب في ملفّه
   ------------------------------------------------------
   القاعدة التي تحكم هذا الملفّ كلَّه: **لا شرطَ إخفاءٍ هنا.**
   القيمةُ المحجوبة تصل `null` من الخادم ومعها `is_redacted`،
   فليس في المتصفّح ما يُخفى. ما نرسمه شريطُ طمسٍ فوق فراغ.
   ====================================================== */
import { HeartPulse, Landmark, Lock, ShieldCheck, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStudentAttributes } from '../hooks'
import type { AttributeSection, StudentAttributeValue } from '../types'
import { WsAlert, WsBlock, WsChip, WsEmpty } from '@/shared/workspace'

const SECTION_ICONS: Record<AttributeSection, LucideIcon> = {
  profile: UserRound,
  social: Users,
  financial: Landmark,
  health: HeartPulse,
  military: ShieldCheck,
}

export function StudentAttributesPanel({ studentId }: { studentId: number | null }) {
  const { data, isLoading, isError } = useStudentAttributes(studentId)

  if (studentId === null) {
    return <WsEmpty icon={UserRound}>اختر طالباً لعرض بطاقته</WsEmpty>
  }

  if (isLoading) {
    return <WsEmpty icon={UserRound}>تُحمَّل بطاقة الطالب…</WsEmpty>
  }

  if (isError) {
    return <WsAlert tone="error" boxed>تعذّر تحميل بطاقة الطالب.</WsAlert>
  }

  const groups = data?.data ?? []
  const meta = data?.meta

  if (groups.length === 0) {
    return (
      <WsAlert tone="info" boxed>
        لم تُملأ بطاقة حصر المعلومات لهذا الطالب بعد. تُملأ عبر نموذجٍ يرسله وليّ الأمر، وتهبط
        بياناتها هنا بعد اعتماد الموجّه للردّ.
      </WsAlert>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* «علم الوجود» للمدير: يعرف أن للطالب بطاقةً مسجَّلة ولا يعرف ما فيها */}
      {meta?.has_closed_data && !meta.viewer_sees_closed ? (
        <WsAlert tone="warn" boxed>
          لهذا الطالب {meta.redacted} من البيانات المحاطة بالسرّية، لا يطّلع عليها سوى الموجّه
          الطلابي.
        </WsAlert>
      ) : null}

      {meta?.via_inheritance ? (
        <WsAlert tone="info" boxed>
          تراها بصفتك مديراً لمدرسةٍ لا موجّه طلابيّ فيها — ويُسجَّل اطّلاعك.
        </WsAlert>
      ) : null}

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}
      >
        {groups.map((group) => (
          <WsBlock
            key={group.section}
            title={group.label}
            icon={SECTION_ICONS[group.section] ?? UserRound}
            count={group.attributes.length}
            padded
          >
            <div style={{ display: 'grid', gap: 2 }}>
              {group.attributes.map((attribute) => (
                <AttributeRow key={attribute.key} attribute={attribute} />
              ))}
            </div>
          </WsBlock>
        ))}
      </div>
    </div>
  )
}

function AttributeRow({ attribute }: { attribute: StudentAttributeValue }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '7px 0',
        borderBottom: '1px solid var(--ws-hairline)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--ws-text-2)', flexShrink: 0 }}>
        {attribute.label}
      </span>

      {attribute.is_redacted ? (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          title="لا يظهر إلا للموجّه الطلابي"
        >
          <Lock style={{ width: 12, height: 12, color: 'var(--ws-text-2)' }} />
          <span
            aria-label="قيمة محجوبة"
            style={{
              display: 'inline-block',
              width: 84,
              height: 13,
              borderRadius: 2,
              background:
                'repeating-linear-gradient(135deg, var(--ws-border-strong) 0 6px, var(--ws-border) 6px 12px)',
            }}
          />
        </span>
      ) : (
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            textAlign: 'end',
            wordBreak: 'break-word',
          }}
        >
          {formatValue(attribute.value)}
        </span>
      )}
    </div>
  )
}

/** القيمةُ نصّاً — الباك يرسل الخام، والعرضُ العربيّ يُبنى هنا. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (Array.isArray(value)) return value.length ? value.join('، ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)

  return String(value)
}

/** شريحةُ «له بطاقة» لبطاقة الطالب الجانبية — وجودٌ بلا محتوى. */
export function StudentCardBadge({ studentId }: { studentId: number | null }) {
  const { data } = useStudentAttributes(studentId)

  if (!data || data.meta.total === 0) return null

  return (
    <WsChip tone={data.meta.has_closed_data ? 'amber' : 'green'}>
      بطاقة معلومات · {data.meta.total}
    </WsChip>
  )
}

/* ======================================================
   لوحة سمات الطالب في ملفّه
   ------------------------------------------------------
   القاعدة التي تحكم هذا الملفّ كلَّه: **لا شرطَ إخفاءٍ هنا.**
   القيمةُ المحجوبة تصل `null` من الخادم ومعها `is_redacted`،
   فليس في المتصفّح ما يُخفى. ما نرسمه شريطُ طمسٍ فوق فراغ.
   ====================================================== */
import { HeartPulse, ImageIcon, Landmark, Lock, ShieldCheck, UserRound, Users } from 'lucide-react'
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

  /*
   * الصورةُ تُرفع صدرَ الملفّ لا سطراً في جدول.
   *
   * هي أوّلُ ما يبحث عنه من يفتح ملفَّ طالب — يريد أن يعرف الوجهَ قبل أن يقرأ
   * البيانات. وعرضُها صفّاً بين «الجنسية» و«الهوايات» يجعلها مرفقاً يُنقر، لا
   * تعريفاً يُرى.
   */
  const photo = groups
    .flatMap((group) => group.attributes)
    .find((attribute) => attribute.key === 'profile.photo' && !attribute.is_redacted && attribute.file?.url)

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

      {photo ? <StudentPhotoCard photo={photo} /> : null}

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

/** الصورةُ الشخصية في صدر الملفّ — مربّعةٌ مقصوصةٌ بلا تشويه. */
function StudentPhotoCard({ photo }: { photo: StudentAttributeValue }) {
  return (
    <WsBlock title="الصورة الشخصية" icon={ImageIcon} padded>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <a
          href={photo.file?.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          title="فتح الصورة بالحجم الكامل"
          style={{ lineHeight: 0, flexShrink: 0 }}
        >
          <img
            src={photo.file?.url ?? undefined}
            alt="الصورة الشخصية للطالب"
            loading="lazy"
            style={{
              width: 96,
              height: 96,
              // `cover` لا `contain`: صورةُ الجوّال طوليّةٌ غالباً، واحتواؤها
              // في مربّعٍ يترك شريطَين فارغَين حولها
              objectFit: 'cover',
              borderRadius: 10,
              border: '1px solid var(--ws-border)',
              background: 'var(--ws-sunken)',
            }}
          />
        </a>

        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ws-text-2)' }}>
            رفعها وليّ الأمر ضمن بطاقة المعلومات
          </span>
          {photo.updated_at ? (
            <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>
              آخر تحديث: {photo.updated_at.slice(0, 10)}
            </span>
          ) : null}
        </div>
      </div>
    </WsBlock>
  )
}

function AttributeRow({ attribute }: { attribute: StudentAttributeValue }) {
  // المرفقُ في الجدول رابطٌ لا مسارٌ خام
  if (attribute.file?.url) {
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
        <span style={{ fontSize: 12.5, color: 'var(--ws-text-2)' }}>{attribute.label}</span>
        <a
          href={attribute.file.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ws-accent)' }}
        >
          {attribute.file.filename ?? 'فتح المرفق'}
        </a>
      </div>
    )
  }

  return <AttributeTextRow attribute={attribute} />
}

function AttributeTextRow({ attribute }: { attribute: StudentAttributeValue }) {
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

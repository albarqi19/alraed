import { useMemo } from 'react'
import { TONES, WsAlert } from '@/shared/workspace'
import type { ImportStudentsPreview } from '../types'

/* ═══════════════════════════════════════════════════════════
   وحدات استيراد البيانات — «الغِطاء»
   الملفُ غِطاءٌ يُلقى على السجل. ما غطّاه بقي، وما لم يغطّه سقط.
   هذه الصفحة وحدها في النظام تحذف بالإغفال — بأن لا يذكرك ملفٌ —
   فالهندسة ترسم قِصَر الغطاء لا رقماً أحمر.
   ═══════════════════════════════════════════════════════════ */

const blank = (g?: string, c?: string) => !g?.trim() || !c?.trim()

export interface CoverModel {
  width: number // المقام الثابت = DB + N_parsed
  db: number
  fileRows: number
  E: number // المطابَقون المتمايزون
  Nparsed: number // الجدد المتمايزون
  D: number // المرشّحون للحذف
  Neff: number // جدد سيُنشأون فعلاً
  notCreated: number // بلغهم الملف وفشل الإنشاء (صف/فصل فارغ)
  Ceff: number // تحديثات فعّالة
  still: number // لن يُمسّوا
  care: number // ملفات إرشاد بين المحذوفين
  seats: number // مجموع صفوف الحضور للمحذوفين
  fileUnread: boolean // الملف لم يُقرأ منه صف — لغم القالب
  afterExecute: (armed: boolean) => number
}

export function buildCover(preview: ImportStudentsPreview): CoverModel {
  const existing = preview.existing_students ?? []
  const news = preview.new_students ?? []
  const deleted = preview.to_be_deleted ?? []

  const E = new Set(existing.map((s) => s.id)).size
  const newIds = new Set(news.map((s) => s.national_id))
  const Nparsed = newIds.size

  const db = preview.total_in_database ?? E + preview.to_be_deleted_count
  const D = preview.to_be_deleted_count
  const width = Math.max(1, db + Nparsed)

  // ما يفحصه التنفيذ ولا تفحصه المعاينة: صف/فصل فارغ يُفقد الطالب
  const notCreated = news.filter((s) => blank(s.grade, s.class_name)).length
  const notUpdated = existing.filter(
    (s) => (s.has_changes ?? Object.keys(s.changes ?? {}).length > 0) && blank(s.new_data?.grade, s.new_data?.class_name),
  ).length

  const Neff = Nparsed - notCreated
  const changes = preview.students_with_changes
  const Ceff = changes - notUpdated
  const still = E - changes + notUpdated

  const care = deleted.filter((s) => s.has_care_file).length
  const seats = deleted.reduce((sum, s) => sum + (s.attendance_count ?? 0), 0)

  const fileUnread = E === 0 && Nparsed === 0 && preview.errors_count > 0

  return {
    width,
    db,
    fileRows: preview.total_in_file ?? preview.total_students ?? 0,
    E,
    Nparsed,
    D,
    Neff,
    notCreated,
    Ceff,
    still,
    care,
    seats,
    fileUnread,
    afterExecute: (armed: boolean) => db + Neff - (armed ? D : 0),
  }
}

/** ★ الغِطاء — سِكّة الغطاء فوق شريط السجل، والمقطع المنكشف ينفصل عند التسليح */
export function ImportCover({
  preview,
  armed,
}: {
  preview: ImportStudentsPreview
  armed: boolean
}) {
  const c = useMemo(() => buildCover(preview), [preview])

  // نسب المقاطع من المقام الثابت
  const pct = (n: number) => `${(n / c.width) * 100}%`
  const railWidth = ((c.E + c.Nparsed) / c.width) * 100

  return (
    <div>
      {c.fileUnread && (
        <WsAlert tone="error" boxed>
          لم يُقرأ أي صف من الملف ({preview.errors_count} خطأ). الرقم {c.D} ليس نتيجة مقارنة — إنه
          <b> كل من في السجل</b>. راجع أعمدة القالب.
        </WsAlert>
      )}

      <div
        style={{
          border: '1px solid var(--ws-border)',
          borderRadius: 8,
          background: 'var(--ws-surface)',
          padding: '12px 14px 8px',
        }}
      >
        {/* الطبقة ١ — سطر المقام */}
        <p style={{ margin: '0 0 6px', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
          السجل {c.db.toLocaleString('ar-SA')} اسماً · الملف {c.fileRows.toLocaleString('ar-SA')} صفاً · بعد التنفيذ{' '}
          <b style={{ color: 'var(--ws-text)' }}>{c.afterExecute(armed).toLocaleString('ar-SA')}</b>
        </p>

        {/* الطبقة ٢ — سِكّة الغطاء (ما يبلغه الملف) */}
        <div style={{ position: 'relative', height: 5, marginBottom: 3 }}>
          <span
            style={{
              display: 'block',
              width: `${railWidth}%`,
              height: 5,
              background: TONES.sky.tx,
              borderRadius: 2,
              transition: 'width .22s ease-out',
            }}
          />
        </div>

        {/* الطبقة ٣ — شريط السجل */}
        <div style={{ display: 'flex', direction: 'rtl', height: 44, borderRadius: 5, overflow: 'visible' }}>
          {/* باقٍ بلا تغيير */}
          {c.still > 0 && (
            <Segment width={pct(c.still)} bg="var(--ws-surface-2)" title={`${c.still} يبقون كما هم`} first />
          )}
          {/* يُحدَّث */}
          {c.Ceff > 0 && (
            <Segment width={pct(c.Ceff)} bg={TONES.amber.bg} title={`${c.Ceff} سيُحدَّثون`} />
          )}
          {/* بلغهم الملف وفشل الإنشاء — أحمر تحت السكّة */}
          {c.notCreated > 0 && (
            <Segment width={pct(c.notCreated)} bg={TONES.red.bg} title={`${c.notCreated} بلغهم الملف وفشلوا (صف/فصل فارغ)`} />
          )}
          {/* جدد */}
          {c.Neff > 0 && (
            <Segment width={pct(c.Neff)} bg={TONES.sky.bg} title={`${c.Neff} سيُضافون`} />
          )}
          {/* المنكشف — لم يذكرهم الملف */}
          {c.D > 0 && (
            <span
              style={{
                position: 'relative',
                flex: `0 0 ${pct(c.D)}`,
                background: armed ? TONES.red.bg : TONES.gray.bg,
                borderRadius: '0 0 5px 0',
                marginInlineStart: armed ? 4 : 0,
                transform: armed ? 'translateY(4px)' : undefined,
                transition: 'transform .18s ease-out, background .18s, margin .18s',
              }}
              title={armed ? `${c.D} سيُقتلعون` : `${c.D} لم يذكرهم الملف — لن يُمسّوا`}
            >
              {/* علامات ملف الإرشاد — لا مجموع يقولها */}
              {armed &&
                c.care > 0 &&
                (preview.to_be_deleted ?? [])
                  .map((s, i) => ({ s, i }))
                  .filter(({ s }) => s.has_care_file)
                  .map(({ i }) => (
                    <span
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        insetInlineStart: `${(i / Math.max(1, c.D)) * 100}%`,
                        width: 2,
                        background: TONES.red.tx,
                        opacity: 0.55,
                      }}
                    />
                  ))}
            </span>
          )}
        </div>

        {/* الطبقة ٤ — سطر الحكم */}
        <p style={{ margin: '8px 0 0', fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>
          {c.D === 0 ? (
            <span style={{ color: 'var(--ws-text-2)' }}>الملف يغطّي السجل كاملاً.</span>
          ) : armed ? (
            <span style={{ color: TONES.red.tx }}>
              سيُقتلع {c.D} اسماً
              {c.seats > 0 && ` — ومعهم ${c.seats.toLocaleString('ar-SA')} صفاً في الجداول`}
              {c.care > 0 && `، منها ${c.care} ملف إرشاد`}. بلا رجعة.
            </span>
          ) : (
            <span style={{ color: 'var(--ws-text-2)' }}>
              {c.D} اسماً في السجل لم يذكرهم الملف — لن يُمسّوا.
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function Segment({ width, bg, title, first }: { width: string; bg: string; title: string; first?: boolean }) {
  return (
    <span
      title={title}
      style={{
        flex: `0 0 ${width}`,
        background: bg,
        borderRadius: first ? '5px 0 0 5px' : undefined,
      }}
    />
  )
}

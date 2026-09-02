import { TONES } from '@/shared/workspace'

import type { LdCell, LdRail, LdSection, LdShadow, LdTrack } from '../types'

/**
 * «المِحَكّ» — لمسةُ توقيع صفحة صعوبات التعلّم، بوجهَين متلاصقَين.
 *
 * الوجهُ الأول (الشهادة): أعمدةٌ = الأبعاد، وعرضُ العمود ∝ وزنِ القسم؛ ومساراتٌ
 * = الشهود. والفراغُ ≠ الصفر: «قِيس فلم يشتعل» رماديٌّ مصمت، و«لم يُقَس أصلاً»
 * خاوٍ محاط — وفي التشخيص هذا هو الفرقُ كلُّه.
 *
 * والوجهُ الثاني (الظِّلّ): سككٌ تقيس الطالبَ بأقرانِ فصلِه، لأنّ أوّل بندٍ في
 * كلّ بروتوكولِ تشخيصٍ استبعادُ نقصِ فرصةِ التعلّم قبل الحكم على العقل.
 */

const CONSENSUS_RATIO = 0.67

/** التعبئةُ درجاتُ نبرةٍ لا عرضٌ جزئيّ: العرضُ محجوزٌ للوزن. */
function fillFor(ratio: number | null): string {
  if (ratio === null) return 'var(--ws-sunken)'
  if (ratio <= 0) return 'var(--ws-sunken)'
  if (ratio < 0.34) return `color-mix(in srgb, ${TONES.amber.bd} 60%, #fff)`
  if (ratio <= 0.67) return TONES.amber.bd
  if (ratio <= 0.85) return TONES.red.bd
  return TONES.red.tx
}

function cellTitle(section: LdSection, cell: LdCell | undefined, teacher: string | null): string {
  if (!cell || !cell.measured) return `${section.title}: لم يقسه ${teacher ?? 'هذا الشاهد'}`
  if (cell.ratio === null) return `${section.title}: قِيس ولا يميّز (إجابتاه سواء)`

  return `${section.title}: ${cell.score}/${cell.max} = ${Math.round(cell.ratio * 100)}% — ${teacher ?? ''}`
}

interface WitnessGridProps {
  sections: LdSection[]
  tracks: LdTrack[]
  consensusSectionIds: number[]
  /** المضغوطُ داخل صفّ الجدول، والممتدُّ في اللوحة الجانبية. */
  expanded?: boolean
  width?: number
  onSectionClick?: (sectionId: number) => void
}

export function WitnessGrid({
  sections,
  tracks,
  consensusSectionIds,
  expanded = false,
  width = 190,
  onSectionClick,
}: WitnessGridProps) {
  if (!sections.length || !tracks.length) {
    return <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>—</span>
  }

  const totalWeight = sections.reduce((sum, s) => sum + Math.max(s.weight, 1), 0)
  const shown = expanded ? tracks : tracks.slice(0, 4)
  const hidden = tracks.length - shown.length

  // ارتفاعُ المسار يتقلّص بعدد الشهود كي يبقى الصفُّ ٢٦px
  const trackHeight = expanded ? 22 : shown.length <= 1 ? 24 : shown.length === 2 ? 11 : shown.length === 3 ? 7 : 5
  const gap = shown.length > 1 ? 2 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: expanded ? '100%' : width }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {shown.map((track) => (
          <div
            key={track.response_id}
            style={{ display: 'flex', gap: 0, opacity: track.withdrawn ? 0.45 : 1 }}
          >
            {sections.map((section, index) => {
              const cell = track.cells.find((c) => c.section_id === section.section_id)
              const isNewForm = index > 0 && sections[index - 1].form_id !== section.form_id
              const flexWeight = Math.max(section.weight, 1) / totalWeight

              const notMeasured = !cell || !cell.measured

              return (
                <div
                  key={section.section_id}
                  title={cellTitle(section, cell, track.teacher_name)}
                  onClick={onSectionClick ? () => onSectionClick(section.section_id) : undefined}
                  style={{
                    flex: `${flexWeight} 1 0`,
                    height: trackHeight,
                    marginInlineStart: isNewForm ? 2 : 0,
                    // الخاوي: إطارٌ بلا حشو — «لم يُقَس» لا «قِيس فخمد»
                    background: notMeasured
                      ? 'var(--ws-bg)'
                      : track.withdrawn
                        ? 'transparent'
                        : fillFor(cell!.ratio),
                    border: notMeasured
                      ? '1px solid var(--ws-hairline)'
                      : track.withdrawn
                        ? `1px solid ${fillFor(cell!.ratio)}`
                        : 'none',
                    cursor: onSectionClick ? 'pointer' : 'default',
                    boxSizing: 'border-box',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* خطُّ الإجماع: لا يرسمه شاهدٌ واحد أبداً */}
      <div style={{ display: 'flex', gap: 0, height: 3 }}>
        {sections.map((section, index) => {
          const agreed = consensusSectionIds.includes(section.section_id)
          const isNewForm = index > 0 && sections[index - 1].form_id !== section.form_id

          return (
            <div
              key={section.section_id}
              title={
                agreed
                  ? `«${section.title}» — اتفق عليه شاهدان مستقلان فأكثر (≥ ${Math.round(CONSENSUS_RATIO * 100)}%)`
                  : section.title
              }
              style={{
                flex: `${Math.max(section.weight, 1) / totalWeight} 1 0`,
                marginInlineStart: isNewForm ? 2 : 0,
                height: agreed ? 3 : 1,
                alignSelf: 'flex-start',
                background: agreed ? TONES.red.tx : 'var(--ws-hairline)',
              }}
            />
          )
        })}
      </div>

      {hidden > 0 && (
        <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}>+{hidden} شاهد آخر</span>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--ws-text-2)' }}>
          <LegendSwatch background="var(--ws-bg)" border="1px solid var(--ws-hairline)" label="لم يُقَس" />
          <LegendSwatch background="var(--ws-sunken)" label="قِيس فلم يشتعل" />
          <LegendSwatch background={TONES.red.bd} label="مشتعل" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 3, background: TONES.red.tx, display: 'inline-block' }} />
            بُعدٌ بإجماع
          </span>
        </div>
      )}
    </div>
  )
}

function LegendSwatch({ background, border, label }: { background: string; border?: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 12, height: 10, background, border, display: 'inline-block', boxSizing: 'border-box' }} />
      {label}
    </span>
  )
}

const RAIL_LABELS: Record<string, string> = {
  absence: 'الغياب',
  late: 'التأخر',
  behavior: 'السلوك',
}

interface ShadowRailsProps {
  shadow: LdShadow
  expanded?: boolean
  width?: number
}

export function ShadowRails({ shadow, expanded = false, width = 56 }: ShadowRailsProps) {
  if (!shadow?.comparable) {
    const why =
      shadow?.reason === 'few_peers'
        ? `لا مقارنة بعد — ${shadow?.peers_count ?? 0} أقران فقط`
        : `لا مقارنة بعد — ${shadow?.working_days ?? 0} يوم دراسة`

    return (
      <span style={{ fontSize: expanded ? 12 : 10, color: 'var(--ws-text-2)' }} title={why}>
        {expanded ? why : 'لا مقارنة بعد'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: expanded ? '100%' : width }}>
      {shadow.rails.map((rail) => (
        <Rail key={rail.key} rail={rail} expanded={expanded} />
      ))}
    </div>
  )
}

function Rail({ rail, expanded }: { rail: LdRail; expanded: boolean }) {
  const height = expanded ? 10 : 7

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {expanded && (
        <span style={{ fontSize: 11, color: 'var(--ws-text-2)', width: 40, flexShrink: 0 }}>
          {RAIL_LABELS[rail.key]}
        </span>
      )}

      <div
        title={rail.raw_label}
        style={{
          position: 'relative',
          flex: 1,
          height,
          background: 'var(--ws-sunken)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* شرطةٌ لكل زميل في موضعه المطبَّع */}
        {rail.peers.map((position, index) => (
          <span
            key={index}
            style={{
              position: 'absolute',
              insetInlineStart: `${position * 100}%`,
              top: 0,
              width: 1,
              height: '100%',
              background: 'color-mix(in srgb, var(--ws-border) 45%, transparent)',
            }}
          />
        ))}

        {/* علامةُ الطالب نفسِه */}
        <span
          style={{
            position: 'absolute',
            insetInlineStart: `calc(${rail.self_position * 100}% - 1.5px)`,
            top: 0,
            width: 3,
            height: '100%',
            background: rail.ignited ? TONES.red.tx : 'var(--ws-text-2)',
          }}
        />
      </div>

      {expanded && (
        <span style={{ fontSize: 11, color: rail.ignited ? TONES.red.tx : 'var(--ws-text-2)', flexShrink: 0 }}>
          {rail.value}
          {rail.denominator ? `/${rail.denominator}` : ''}
        </span>
      )}
    </div>
  )
}

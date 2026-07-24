import { ClipboardCheck, Link2Off } from 'lucide-react'
import { TONES, ToneChip, WsAlert, WsProgress, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, ProfileTable, StatGrid, StatMini } from './profile-ui'
import type { TeacherPreparationResponse } from '../types'

const PREP_STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  prepared: { label: 'محضّر', tone: TONES.green },
  waiting: { label: 'لم يحضّر', tone: TONES.amber },
  warning: { label: 'تحذير', tone: TONES.gray },
  activity: { label: 'نشاط', tone: TONES.sky },
  empty: { label: 'فارغ', tone: TONES.gray },
}

interface PreparationSectionProps {
  data: TeacherPreparationResponse
}

export function PreparationSection({ data }: PreparationSectionProps) {
  if (!data.is_linked) {
    return (
      <EmptyState
        icon={Link2Off}
        title="المعلم غير مرتبط بمنصة مدرستي"
        description="يجب ربط المعلم بحسابه في منصة مدرستي لتتبع التحضير"
      />
    )
  }

  if (data.records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="لا توجد بيانات تحضير"
        description="لم يتم استيراد أي بيانات تحضير في الفترة المحددة"
      />
    )
  }

  const summary = data.summary!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* معلومات الربط */}
      {data.madrasati_name && (
        <WsAlert tone="info" boxed>
          حساب مدرستي: <b>{data.madrasati_name}</b>
        </WsAlert>
      )}

      {/* ملخص */}
      <StatGrid>
        <StatMini label="إجمالي الحصص" value={summary.total} />
        <StatMini label="محضّر" value={summary.prepared} tone={TONES.green} />
        <StatMini label="لم يحضّر" value={summary.unprepared} tone={TONES.amber} />
        <StatMini label="نسبة التحضير" value={summary.rate} suffix="%" tone={TONES.purple} />
      </StatGrid>

      {/* شريط النسبة */}
      <WsProgress value={summary.rate} label="نسبة الإنجاز" />

      {/* جدول */}
      <ProfilePanel title="سجل التحضير" icon={ClipboardCheck} padded={false}>
        <ProfileTable>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>الحصة</th>
              <th>الفصل</th>
              <th>الدرس</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody className="ws-tbl-rise">
            {data.records.map((record) => {
              const statusInfo = PREP_STATUS_MAP[record.status] ?? PREP_STATUS_MAP.empty
              return (
                <tr key={record.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(record.extraction_date).toLocaleDateString('ar-SA-u-nu-latn')}
                  </td>
                  <td>{record.day}</td>
                  <td>{record.period_number}</td>
                  <td>{record.class_name}</td>
                  <td
                    className="ws-cell-sub"
                    style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={record.lesson_title}
                  >
                    {record.lesson_title || '-'}
                  </td>
                  <td>
                    <ToneChip tone={statusInfo.tone}>{statusInfo.label}</ToneChip>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </ProfileTable>
      </ProfilePanel>
    </div>
  )
}

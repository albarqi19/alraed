import { CalendarCheck } from 'lucide-react'
import { TONES, ToneChip, type Tone } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfileTable, StatGrid, StatMini } from './profile-ui'
import type { TeacherAttendanceResponse } from '../types'

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  on_time: { label: 'في الوقت', tone: TONES.green },
  delayed: { label: 'متأخر', tone: TONES.amber },
  excused: { label: 'معذور', tone: TONES.sky },
  absent: { label: 'غائب', tone: TONES.red },
  unknown: { label: 'غير محدد', tone: TONES.gray },
}

const LOGIN_METHOD_MAP: Record<string, string> = {
  face: 'وجه',
  fingerprint: 'بصمة',
  card: 'بطاقة',
  voice: 'صوت',
  manual: 'يدوي',
  unknown: '-',
}

interface AttendanceSectionProps {
  data: TeacherAttendanceResponse
}

export function AttendanceSection({ data }: AttendanceSectionProps) {
  if (data.records.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="لا توجد سجلات حضور"
        description="لم يتم تسجيل أي حضور في الفترة المحددة"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ملخص */}
      <StatGrid>
        <StatMini label="إجمالي" value={data.summary.total} />
        <StatMini label="في الوقت" value={data.summary.on_time} tone={TONES.green} />
        <StatMini label="حاضر" value={data.summary.present} tone={TONES.sky} />
        <StatMini label="متأخر" value={data.summary.delayed} tone={TONES.amber} />
        <StatMini label="غائب" value={data.summary.absent} tone={TONES.red} />
      </StatGrid>

      {/* جدول */}
      <ProfileTable>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th>الحضور</th>
            <th>الانصراف</th>
            <th>التأخر</th>
            <th>الطريقة</th>
            <th>سبب الغياب</th>
          </tr>
        </thead>
        <tbody className="ws-tbl-rise">
          {data.records.map((record) => {
            const statusInfo = STATUS_MAP[record.delay_status] ?? STATUS_MAP.unknown
            return (
              <tr key={record.id}>
                <td style={{ fontWeight: 600 }}>
                  {new Date(record.attendance_date).toLocaleDateString('ar-SA-u-nu-latn', { weekday: 'short', month: 'short', day: 'numeric' })}
                </td>
                <td>
                  <ToneChip tone={statusInfo.tone}>{statusInfo.label}</ToneChip>
                </td>
                <td>
                  {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td>
                  {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td>
                  {record.delay_minutes && record.delay_minutes > 0 ? (
                    <span style={{ fontWeight: 700, color: TONES.amber.tx }}>{record.delay_minutes} د</span>
                  ) : '-'}
                </td>
                <td className="ws-cell-sub">
                  {LOGIN_METHOD_MAP[record.login_method ?? ''] ?? '-'}
                </td>
                <td className="ws-cell-sub">
                  {record.absence_reason_label ?? '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </ProfileTable>
    </div>
  )
}

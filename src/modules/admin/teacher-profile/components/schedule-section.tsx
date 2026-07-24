import { Calendar, BookOpen, Users } from 'lucide-react'
import { TONES, ToneChip } from '@/shared/workspace'
import { EmptyState } from './empty-state'
import { ProfilePanel, StatGrid, StatMini } from './profile-ui'
import type { TeacherScheduleResponse, TeacherStudentAttendanceStats } from '../types'

const DAY_ORDER = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']

interface ScheduleSectionProps {
  schedule: TeacherScheduleResponse
  studentStats: TeacherStudentAttendanceStats | undefined
}

export function ScheduleSection({ schedule, studentStats }: ScheduleSectionProps) {
  if (schedule.sessions.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="لا يوجد جدول دراسي"
        description="لم يتم تعيين حصص لهذا المعلم"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ملخص */}
      <StatGrid>
        <StatMini label="حصة أسبوعياً" value={schedule.summary.total_sessions} tone={TONES.sky} />
        <StatMini label="مادة" value={schedule.summary.subjects_count} tone={TONES.purple} />
        <StatMini label="فصل" value={schedule.summary.classes_count} tone={TONES.green} />
        {studentStats && (
          <StatMini label="يوم حضّر الطلاب" value={studentStats.daily.days_recorded} tone={TONES.amber} />
        )}
      </StatGrid>

      {/* المواد والفصول */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <ProfilePanel title="المواد" icon={BookOpen}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {schedule.subjects.map((subject) => (
              <ToneChip key={subject} tone={TONES.purple}>
                {subject}
              </ToneChip>
            ))}
          </div>
        </ProfilePanel>
        <ProfilePanel title="الفصول" icon={Users}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {schedule.classes.map((cls) => (
              <ToneChip key={cls} tone={TONES.sky}>
                {cls}
              </ToneChip>
            ))}
          </div>
        </ProfilePanel>
      </div>

      {/* الجدول الأسبوعي */}
      <ProfilePanel title="الجدول الأسبوعي" icon={Calendar}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAY_ORDER.map((day) => {
            const sessions = schedule.by_day[day]
            if (!sessions || sessions.length === 0) return null

            return (
              <div key={day}>
                <p style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text)' }}>
                  {day}
                  <span className="ws-count">{sessions.length}</span>
                </p>
                <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid var(--ws-hairline)',
                        borderRadius: 8,
                        background: 'var(--ws-surface)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span
                          style={{
                            padding: '1px 7px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--ws-accent)',
                            background: 'var(--ws-accent-soft)',
                          }}
                        >
                          ح{session.period_number}
                        </span>
                        {session.start_time && (
                          <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                            {session.start_time?.slice(0, 5)}
                          </span>
                        )}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text)' }}>
                        {session.subject_name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--ws-text-2)' }}>
                        {session.grade} - {session.class_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ProfilePanel>

      {/* إحصائيات تحضير الطلاب */}
      {studentStats && (studentStats.daily.total > 0 || studentStats.period.total > 0) && (
        <ProfilePanel title="إحصائيات تحضير الطلاب بواسطة المعلم" icon={Users}>
          <StatGrid>
            <StatMini
              label="تحضير يومي"
              value={studentStats.daily.total}
              sub={`حاضر: ${studentStats.daily.present} · غائب: ${studentStats.daily.absent}`}
              tone={TONES.green}
            />
            <StatMini
              label="تحضير حصصي"
              value={studentStats.period.total}
              sub={`حاضر: ${studentStats.period.present} · غائب: ${studentStats.period.absent}`}
              tone={TONES.sky}
            />
          </StatGrid>
        </ProfilePanel>
      )}
    </div>
  )
}

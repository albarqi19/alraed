import { Calendar, IdCard, Phone } from 'lucide-react'
import { getRoleLabel } from '@/modules/auth/constants/roles'
import type { UserRole } from '@/modules/auth/types'
import { InitialAvatar, TONES, ToneChip, WsFact, type Tone } from '@/shared/workspace'
import type { TeacherProfileInfo } from '../types'
import { roleProfileTone } from './profile-ui'
import { AppreciationButton } from './appreciation-button'

/** شارة الانضباط: نبرة واحدة لكل مدى — نفس عتبات التقييم السابقة */
function performanceBadge(rate: number): { label: string; tone: Tone } {
  if (rate >= 95) return { label: 'انضباط ممتاز', tone: TONES.green }
  if (rate >= 85) return { label: 'جيد جداً', tone: TONES.sky }
  if (rate >= 75) return { label: 'جيد', tone: TONES.amber }
  return { label: 'يحتاج متابعة', tone: TONES.gray }
}

interface ProfileHeaderProps {
  teacher: TeacherProfileInfo
  attendanceRate?: number
  teacherId?: number | null
}

export function ProfileHeader({ teacher, attendanceRate, teacherId }: ProfileHeaderProps) {
  const roleTone = roleProfileTone(teacher.role)
  const perf = attendanceRate !== undefined ? performanceBadge(attendanceRate) : null

  return (
    <div className="ws-profile-hero">
      <InitialAvatar name={teacher.name} tone={roleTone} size={54} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* الاسم والشارات */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ws-text)' }}>{teacher.name}</h2>
          <ToneChip tone={roleTone}>{getRoleLabel(teacher.role as UserRole)}</ToneChip>
          {teacher.secondary_role && (
            <ToneChip tone={TONES.purple}>{getRoleLabel(teacher.secondary_role as UserRole)}</ToneChip>
          )}
          <ToneChip tone={teacher.status === 'active' ? TONES.green : TONES.red}>
            {teacher.status === 'active' ? 'نشط' : 'غير نشط'}
          </ToneChip>
          {perf && <ToneChip tone={perf.tone}>{perf.label}</ToneChip>}
        </div>

        {/* الحقائق + زر الشكر في أقصى اليسار */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px' }}>
          <WsFact icon={IdCard}>{teacher.national_id}</WsFact>
          {teacher.phone && <WsFact icon={Phone}>{teacher.phone}</WsFact>}
          {teacher.created_at && (
            <WsFact icon={Calendar}>منذ {new Date(teacher.created_at).toLocaleDateString('ar-SA-u-nu-latn')}</WsFact>
          )}
          <span style={{ marginInlineStart: 'auto' }}>
            <AppreciationButton teacherId={teacherId ?? null} teacherPhone={teacher.phone} />
          </span>
        </div>
      </div>
    </div>
  )
}

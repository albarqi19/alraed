import { Badge } from '@/components/ui/badge'
import { getRoleLabel, getRoleColor } from '@/modules/auth/constants/roles'
import type { TeacherProfileInfo } from '../types'
import type { UserRole } from '@/modules/auth/types'
import { Phone, IdCard, Calendar } from 'lucide-react'

interface ProfileHeaderProps {
  teacher: TeacherProfileInfo
}

export function ProfileHeader({ teacher }: ProfileHeaderProps) {
  const roleColor = getRoleColor(teacher.role as UserRole)

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-${roleColor}-100 text-xl font-bold text-${roleColor}-600`}
      >
        {teacher.name.charAt(0)}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">{teacher.name}</h2>
          <Badge variant="outline" className={`text-${roleColor}-700 border-${roleColor}-200 bg-${roleColor}-50`}>
            {getRoleLabel(teacher.role as UserRole)}
          </Badge>
          {teacher.secondary_role && (
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
              {getRoleLabel(teacher.secondary_role as UserRole)}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={
              teacher.status === 'active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }
          >
            {teacher.status === 'active' ? 'نشط' : 'غير نشط'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <IdCard className="h-3.5 w-3.5" />
            {teacher.national_id}
          </span>
          {teacher.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {teacher.phone}
            </span>
          )}
          {teacher.created_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              منذ {new Date(teacher.created_at).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

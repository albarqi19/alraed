import type { UserRole } from '../types'

export interface RoleInfo {
  value: UserRole
  label: string
  description?: string
  color?: string
  icon?: string
}

export const USER_ROLES: Record<UserRole, RoleInfo> = {
  super_admin: {
    value: 'super_admin',
    label: 'مدير النظام',
    description: 'صلاحيات كاملة على جميع المدارس',
    color: 'purple',
    icon: '👑',
  },
  school_principal: {
    value: 'school_principal',
    label: 'مدير المدرسة',
    description: 'إدارة كاملة للمدرسة',
    color: 'blue',
    icon: '🏫',
  },
  deputy_teachers: {
    value: 'deputy_teachers',
    label: 'وكيل المدرسة',
    description: 'إدارة شؤون المعلمين والحصص',
    color: 'indigo',
    icon: '👔',
  },
  deputy_students: {
    value: 'deputy_students',
    label: 'وكيل الطلاب',
    description: 'إدارة شؤون الطلاب والسلوك',
    color: 'cyan',
    icon: '👨‍🎓',
  },
  student_counselor: {
    value: 'student_counselor',
    label: 'الموجه الطلابي',
    description: 'متابعة الحالات السلوكية والإرشاد',
    color: 'green',
    icon: '🎯',
  },
  administrative_staff: {
    value: 'administrative_staff',
    label: 'موظف إداري',
    description: 'المهام الإدارية والكتابية',
    color: 'gray',
    icon: '📋',
  },
  learning_resources_admin: {
    value: 'learning_resources_admin',
    label: 'أمين مصادر التعلم',
    description: 'إدارة المكتبة ومصادر التعلم',
    color: 'amber',
    icon: '📚',
  },
  teacher: {
    value: 'teacher',
    label: 'معلم',
    description: 'تسجيل الحضور والغياب',
    color: 'emerald',
    icon: '👨‍🏫',
  },
  admin: {
    value: 'admin',
    label: 'مدير (قديم)',
    description: 'دور قديم - سيتم تحويله',
    color: 'slate',
    icon: '⚠️',
  },
}

export const ROLE_OPTIONS: RoleInfo[] = [
  USER_ROLES.school_principal,
  USER_ROLES.deputy_teachers,
  USER_ROLES.deputy_students,
  USER_ROLES.student_counselor,
  USER_ROLES.learning_resources_admin,
  USER_ROLES.administrative_staff,
  USER_ROLES.teacher,
]

export const MANAGEMENT_ROLES: UserRole[] = [
  'admin', // backward compatibility
  'super_admin',
  'school_principal',
  'deputy_teachers',
  'deputy_students',
  'student_counselor',
  'administrative_staff',
  'learning_resources_admin',
]

export const STAFF_ROLES: UserRole[] = [
  'administrative_staff',
  'student_counselor',
  'learning_resources_admin',
]

export function getRoleLabel(role: UserRole): string {
  return USER_ROLES[role]?.label || 'غير محدد'
}

export function getRoleColor(role: UserRole): string {
  return USER_ROLES[role]?.color || 'gray'
}

export function getRoleIcon(role: UserRole): string {
  return USER_ROLES[role]?.icon || '👤'
}

export function hasManagementAccess(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role)
}

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role)
}

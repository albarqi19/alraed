import type { UserRole } from '../types'

/**
 * الأدوارُ الوظيفيّة — مرآةُ `App\Enums\UserRole` في الباك.
 *
 * القيمُ والتسمياتُ والنبراتُ هنا يجب أن تطابق الـEnum حرفاً بحرف. ومن أضاف دوراً
 * فليضفه في أربعة مواضعَ لا خامسَ لها:
 *   ١. `App\Enums\UserRole`               (الباك: القيمة والتسمية والبوّابة)
 *   ٢. مهاجرةٌ تُلحقه بعمودَي `users`     (القاعدة)
 *   ٣. `USER_ROLE_VALUES` أدناه           (الفرونت: النوع)
 *   ٤. `USER_ROLES` أدناه                 (الفرونت: العرض)
 *
 * والثالثُ والرابعُ متلازمان بحكم النوع: `Record<UserRole, RoleInfo>` شاملٌ لا
 * جزئيّ، فمن وسّع الاتحادَ ولم يملأ الخريطةَ أسقط `npm run build` فوراً. وهذا
 * مقصود — الفشلُ الصريحُ عند البناء خيرٌ من دورٍ يظهر بلا اسم في شاشةٍ حيّة.
 */

export type RolePortal = 'platform' | 'admin' | 'teacher'

export interface RoleInfo {
  value: UserRole
  label: string
  description?: string
  /** مفتاحٌ من لوحة `TONES` — ستُّ نبراتٍ لا أكثر */
  color?: string
  icon?: string
  /** البوّابةُ التي يعمل فيها الدور — منها تُشتقّ كلُّ قرارات التوجيه */
  portal: RolePortal
  /** هل يُعرَض في قوائم اختيار الدور؟ `admin` و`super_admin` لا يُسنَدان من مدرسة */
  selectable: boolean
}

export const USER_ROLES: Record<UserRole, RoleInfo> = {
  super_admin: {
    value: 'super_admin',
    label: 'مدير النظام',
    description: 'صلاحيات كاملة على جميع المدارس',
    color: 'purple',
    icon: '👑',
    portal: 'platform',
    selectable: false,
  },
  school_principal: {
    value: 'school_principal',
    label: 'مدير المدرسة',
    description: 'إدارة كاملة للمدرسة',
    color: 'sky',
    icon: '🏫',
    portal: 'admin',
    selectable: true,
  },
  deputy_teachers: {
    value: 'deputy_teachers',
    label: 'وكيل شؤون المعلمين',
    description: 'شؤون المعلمين والحصص والجداول',
    color: 'sky',
    icon: '👔',
    portal: 'admin',
    selectable: true,
  },
  deputy_students: {
    value: 'deputy_students',
    label: 'وكيل شؤون الطلاب',
    description: 'شؤون الطلاب والسلوك والإحالات',
    color: 'sky',
    icon: '👨‍🎓',
    portal: 'admin',
    selectable: true,
  },
  student_counselor: {
    value: 'student_counselor',
    label: 'الموجه الطلابي',
    description: 'الحالات السلوكية والإرشاد الطلابي',
    color: 'green',
    icon: '🎯',
    portal: 'admin',
    selectable: true,
  },
  health_counselor: {
    value: 'health_counselor',
    label: 'الموجه الصحي',
    description: 'متابعة الشؤون الصحية للطلاب',
    color: 'red',
    icon: '🏥',
    portal: 'admin',
    selectable: true,
  },
  learning_resources_admin: {
    value: 'learning_resources_admin',
    label: 'أمين مصادر التعلم',
    description: 'المكتبة ومصادر التعلم',
    color: 'amber',
    icon: '📚',
    portal: 'admin',
    selectable: true,
  },
  activity_leader: {
    value: 'activity_leader',
    label: 'رائد النشاط',
    description: 'الأنشطة الطلابية والبرامج الإثرائية',
    color: 'green',
    icon: '🎪',
    portal: 'admin',
    selectable: true,
  },
  lab_technician: {
    value: 'lab_technician',
    label: 'محضر مختبر',
    description: 'تجهيز المختبرات ومتابعة عهدتها',
    color: 'amber',
    icon: '🔬',
    portal: 'admin',
    selectable: true,
  },
  gifted_teacher: {
    value: 'gifted_teacher',
    label: 'معلم موهوبين',
    description: 'رعاية الموهوبين وبرامجهم',
    color: 'purple',
    icon: '💡',
    portal: 'admin',
    selectable: true,
  },
  administrative_staff: {
    value: 'administrative_staff',
    label: 'موظف إداري',
    description: 'المهام الإدارية والكتابية',
    color: 'gray',
    icon: '📋',
    portal: 'admin',
    selectable: true,
  },
  administrative_assistant: {
    value: 'administrative_assistant',
    label: 'مساعد إداري',
    description: 'معاونة الإدارة في الأعمال المكتبية',
    color: 'gray',
    icon: '🗂️',
    portal: 'admin',
    selectable: true,
  },
  data_registrar: {
    value: 'data_registrar',
    label: 'مسجل معلومات',
    description: 'إدخال بيانات الطلاب والمعلمين وتحديثها',
    color: 'gray',
    icon: '🗃️',
    portal: 'admin',
    selectable: true,
  },
  teacher: {
    value: 'teacher',
    label: 'معلم',
    description: 'تسجيل الحضور وإدارة الحصص',
    color: 'gray',
    icon: '👨‍🏫',
    portal: 'teacher',
    selectable: true,
  },
  teacher_assistant: {
    value: 'teacher_assistant',
    label: 'مساعد معلم',
    description: 'معاونة المعلم داخل الفصل',
    color: 'green',
    icon: '🤝',
    portal: 'teacher',
    selectable: true,
  },
  admin: {
    value: 'admin',
    label: 'مدير المدرسة (قديم)',
    description: 'دور موروث — يعادل مدير المدرسة',
    color: 'gray',
    icon: '⚠️',
    portal: 'admin',
    selectable: false,
  },
}

/**
 * خياراتُ القوائم المنسدلة — مشتقّةٌ لا مسرودة.
 *
 * كانت مصفوفةً يدويّةً منفصلة عن `USER_ROLES`، فكان الدورُ يُضاف للخريطة ويُنسى
 * هنا فلا يظهر في أيّ منسدلة — موجودٌ في القاعدة وغيرُ قابلٍ للإسناد.
 */
export const ROLE_OPTIONS: RoleInfo[] = Object.values(USER_ROLES).filter((r) => r.selectable)

/** أدوارُ بوّابة الأدمن — بوّابةُ `/admin` كلِّها عبر `RequireAuth requireManagement` */
export const MANAGEMENT_ROLES: UserRole[] = Object.values(USER_ROLES)
  .filter((r) => r.portal === 'admin' || r.portal === 'platform')
  .map((r) => r.value)

/** أدوارُ بوّابة المعلّم — `/teacher/*` كلُّها */
export const TEACHER_PORTAL_ROLES: UserRole[] = Object.values(USER_ROLES)
  .filter((r) => r.portal === 'teacher')
  .map((r) => r.value)

/** أدوارُ الدعم والإسناد — ليست قيادةً وليست تدريساً */
export const STAFF_ROLES: UserRole[] = [
  'administrative_staff',
  'administrative_assistant',
  'student_counselor',
  'health_counselor',
  'learning_resources_admin',
  'activity_leader',
  'lab_technician',
  'gifted_teacher',
  'data_registrar',
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

export function getRolePortal(role: UserRole): RolePortal {
  return USER_ROLES[role]?.portal ?? 'teacher'
}

export function hasManagementAccess(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role)
}

export function isTeacherPortalRole(role: UserRole): boolean {
  return TEACHER_PORTAL_ROLES.includes(role)
}

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role)
}

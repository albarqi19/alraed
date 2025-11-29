import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Upload,
  Calendar,
  Clock,
  ListTodo,
  ClipboardCheck,
  UserCheck,
  Timer,
  Settings,
  Headphones,
  MessageCircle,
  FileText,
  HeartHandshake,
  ClipboardList,
  Target,
  Award,
  Lightbulb,
  UserPlus,
  Send,
  FileEdit,
  DoorOpen,
  IdCard,
  Palette,
  BellRing,
  Megaphone,
  CalendarDays,
  School,
  ShoppingCart,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Fingerprint,
  Smartphone,
  ClipboardPen,
  CreditCard,
  FileCheck,
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon?: LucideIcon
  exact?: boolean
  soon?: boolean
  permission?: string // Slug الصلاحية المطلوبة لعرض هذا العنصر
}

export interface AdminNavGroup {
  title: string
  icon: LucideIcon
  items: AdminNavItem[]
}

export const primaryAdminNavGroups: AdminNavGroup[] = [
  {
    title: 'إدارة المدرسة',
    icon: GraduationCap,
    items: [
      { to: '/admin/dashboard', label: 'نظرة عامة', icon: LayoutDashboard, exact: true, permission: 'admin.dashboard' },
      { to: '/admin/teachers', label: 'إدارة المعلمين', icon: Users, permission: 'admin.teachers' },
      { to: '/admin/teacher-attendance', label: 'حضور المعلمين', icon: Fingerprint, permission: 'admin.teacher-attendance' },
      { to: '/admin/teacher-preparation', label: 'تحضير مدرستي', icon: ClipboardPen, permission: 'admin.teacher-preparation' },
      { to: '/admin/students', label: 'إدارة الطلاب', icon: GraduationCap, permission: 'admin.students' },
      { to: '/admin/forms', label: 'النماذج الإلكترونية', icon: FileText, permission: 'admin.forms' },
      { to: '/admin/students/profile', label: 'ملف الطالب', icon: IdCard, permission: 'admin.students' },
      { to: '/admin/subjects', label: 'إدارة المواد', icon: BookOpen, permission: 'admin.subjects' },
      { to: '/admin/import', label: 'استيراد البيانات', icon: Upload, permission: 'admin.import' },
    ],
  },
  {
    title: 'الجداول والحصص',
    icon: Calendar,
    items: [
      { to: '/admin/class-schedules', label: 'جداول الفصول', icon: Calendar, permission: 'admin.class-schedules' },
      { to: '/admin/teacher-schedules', label: 'جداول المعلمين', icon: Users, permission: 'admin.teacher-schedules' },
      { to: '/admin/class-sessions', label: 'إدارة الحصص', icon: Clock, permission: 'admin.class-sessions' },
      { to: '/admin/schedules', label: 'الخطط الزمنية', icon: ListTodo, permission: 'admin.schedules' },
    ],
  },
  {
    title: 'الحضور والغياب',
    icon: ClipboardCheck,
    items: [
      { to: '/admin/attendance', label: 'تقارير الحضور', icon: ClipboardCheck, permission: 'admin.attendance' },
      { to: '/admin/attendance-report', label: 'كشف الغياب', icon: FileText, permission: 'admin.attendance-report' },
      { to: '/admin/approval', label: 'اعتماد التحضير', icon: UserCheck, permission: 'admin.approval' },
      { to: '/admin/absence-messages', label: 'إدارة رسائل الغياب', icon: MessageCircle, permission: 'admin.absence-messages' },
      { to: '/admin/late-arrivals', label: 'إدارة التأخير', icon: Timer, permission: 'admin.late-arrivals' },
      { to: '/admin/absence-excuses', label: 'أعذار الغياب', icon: FileCheck, permission: 'admin.absence-excuses' },
      { to: '/admin/leave-requests', label: 'طلبات الاستئذان', icon: DoorOpen, permission: 'admin.leave-requests' },
    ],
  },
  {
    title: 'السلوك والانضباط',
    icon: ShieldAlert,
    items: [
      { to: '/admin/behavior', label: 'سجل المخالفات', icon: AlertTriangle, permission: 'admin.behavior' },
      { to: '/admin/behavior/plans', label: 'خطط المعالجة', icon: ClipboardList, soon: true, permission: 'admin.behavior' },
      { to: '/admin/behavior/analytics', label: 'مؤشرات السلوك', icon: Activity, soon: true, permission: 'admin.behavior' },
    ],
  },
  {
    title: 'التوجيه الطلابي',
    icon: HeartHandshake,
    items: [
      { to: '/admin/student-cases', label: 'الحالات الطلابية', icon: ClipboardList, permission: 'admin.student-cases' },
      { to: '/admin/treatment-plans', label: 'الخطط العلاجية', icon: Target, permission: 'admin.treatment-plans' },
      { to: '/admin/points-program', label: 'برنامج نقاطي', icon: Award, permission: 'admin.points-program' },
      { to: '/admin/e-store', label: 'المتجر الالكتروني', icon: ShoppingCart, permission: 'admin.e-store' },
      { to: '/admin/guidance-programs', label: 'البرامج الإرشادية', icon: Lightbulb, soon: true, permission: 'admin.guidance-programs' },
      { to: '/admin/summons', label: 'الاستدعاءات والتوصيات', icon: UserPlus, soon: true, permission: 'admin.summons' },
    ],
  },
  {
    title: 'أدوات المدرسة',
    icon: School,
    items: [
      { to: '/admin/school-tools/bell', label: 'الجرس المدرسي', icon: BellRing, soon: true, permission: 'admin.school-tools.bell' },
      { to: '/admin/school-tools/auto-call', label: 'النداء الآلي', icon: Megaphone, soon: true, permission: 'admin.school-tools.auto-call' },
      { to: '/admin/school-tools/academic-calendar', label: 'التقويم الدراسي', icon: CalendarDays, soon: true, permission: 'admin.school-tools.academic-calendar' },
    ],
  },
]

export const secondaryAdminNav: AdminNavItem[] = [
  { to: '/admin/whatsapp', label: 'إدارة الواتساب', icon: MessageCircle, permission: 'admin.whatsapp' },
  { to: '/admin/whatsapp-send', label: 'إرسال الرسائل', icon: Send, permission: 'admin.whatsapp' },
  { to: '/admin/whatsapp-templates', label: 'قوالب الرسائل', icon: FileEdit, permission: 'admin.whatsapp' },
  { to: '/admin/teacher-messages', label: 'رسائل المعلمين', icon: Send, permission: 'admin.teacher-messages' },
  { to: '/admin/sms-gateway', label: 'رسائل SMS', icon: Smartphone, permission: 'admin.sms-gateway' },
]

export const settingsAdminNav: AdminNavGroup = {
  title: 'الإعدادات والدعم',
  icon: Settings,
  items: [
    { to: '/admin/subscription', label: 'الاشتراك والفوترة', icon: CreditCard, permission: 'admin.subscription' },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings, permission: 'admin.settings' },
    { to: '/admin/theme', label: 'المظهر والألوان', icon: Palette, permission: 'admin.theme' },
    { to: '/admin/permissions', label: 'إدارة الصلاحيات', icon: ShieldAlert, permission: 'admin.permissions' },
    { to: '/admin/support', label: 'الدعم الفني', icon: Headphones, soon: true },
  ],
}

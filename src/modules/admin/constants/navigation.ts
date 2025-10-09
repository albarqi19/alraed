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
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon?: LucideIcon
  exact?: boolean
  soon?: boolean
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
      { to: '/admin/dashboard', label: 'نظرة عامة', icon: LayoutDashboard, exact: true },
      { to: '/admin/teachers', label: 'إدارة المعلمين', icon: Users },
      { to: '/admin/students', label: 'إدارة الطلاب', icon: GraduationCap },
      { to: '/admin/subjects', label: 'إدارة المواد', icon: BookOpen },
      { to: '/admin/import', label: 'استيراد الملفات', icon: Upload },
    ],
  },
  {
    title: 'الجداول والحصص',
    icon: Calendar,
    items: [
      { to: '/admin/class-schedules', label: 'جداول الفصول', icon: Calendar },
      { to: '/admin/class-sessions', label: 'إدارة الحصص', icon: Clock },
      { to: '/admin/schedules', label: 'الخطط الزمنية', icon: ListTodo },
    ],
  },
  {
    title: 'الحضور والغياب',
    icon: ClipboardCheck,
    items: [
      { to: '/admin/attendance', label: 'تقارير الحضور', icon: ClipboardCheck },
      { to: '/admin/attendance-report', label: 'كشف الغياب', icon: FileText },
      { to: '/admin/approval', label: 'اعتماد التحضير', icon: UserCheck },
      { to: '/admin/late-arrivals', label: 'إدارة التأخير', icon: Timer },
    ],
  },
  {
    title: 'التوجيه الطلابي',
    icon: HeartHandshake,
    items: [
      { to: '/admin/student-cases', label: 'الحالات الطلابية', icon: ClipboardList },
      { to: '/admin/treatment-plans', label: 'الخطط العلاجية', icon: Target },
      { to: '/admin/points-program', label: 'برنامج نقاطي', icon: Award },
      { to: '/admin/guidance-programs', label: 'البرامج الإرشادية', icon: Lightbulb },
      { to: '/admin/summons', label: 'الاستدعاءات والتوصيات', icon: UserPlus },
    ],
  },
]

export const secondaryAdminNav: AdminNavItem[] = [
  { to: '/admin/whatsapp', label: 'إدارة الواتساب', icon: MessageCircle },
  { to: '/admin/whatsapp-send', label: 'إرسال الرسائل', icon: Send },
  { to: '/admin/whatsapp-templates', label: 'قوالب الرسائل', icon: FileEdit },
  { to: '/admin/teacher-messages', label: 'رسائل المعلمين', icon: Send },
]

export const settingsAdminNav: AdminNavGroup = {
  title: 'الإعدادات والدعم',
  icon: Settings,
  items: [
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
    { to: '/admin/support', label: 'الدعم الفني', icon: Headphones, soon: true },
  ],
}

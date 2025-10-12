import type { ComponentType } from 'react'
import { Building2, GaugeCircle, LineChart, Receipt, Settings2 } from 'lucide-react'

export interface SuperAdminNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

export const primaryPlatformNav: SuperAdminNavItem[] = [
  {
    to: '/platform/overview',
    label: 'نظرة عامة',
    icon: GaugeCircle,
    exact: true,
  },
  {
    to: '/platform/schools',
    label: 'المدارس',
    icon: Building2,
  },
  {
    to: '/platform/revenue',
    label: 'الإيرادات',
    icon: LineChart,
  },
  {
    to: '/platform/invoices',
    label: 'الفواتير',
    icon: Receipt,
  },
]

export const secondaryPlatformNav: SuperAdminNavItem[] = [
  {
    to: '/admin/settings',
    label: 'إعدادات النظام',
    icon: Settings2,
  },
]

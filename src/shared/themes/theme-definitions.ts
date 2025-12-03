export interface ThemeColors {
  background: string
  surface: string
  primary: string
  primaryDark: string
  primaryLight: string
  accent: string
  danger: string
  success: string
  warning: string
  muted: string
  textPrimary: string
  textSecondary: string
  border: string
  sidebar: string
  header: string
  sidebarText: string
}

export interface ThemeDensity {
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  buttonPadding: {
    sm: string
    md: string
    lg: string
  }
  tablePadding: {
    cell: string
    header: string
  }
  cardPadding: string
  inputHeight: {
    sm: string
    md: string
    lg: string
  }
}

export interface Theme {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  colors: ThemeColors
  density?: ThemeDensity
}

export const themes: Record<string, Theme> = {
  default: {
    id: 'default',
    name: 'Natural Green',
    nameAr: 'الأخضر الطبيعي',
    description: 'A calm and professional green theme',
    descriptionAr: 'ثيم أخضر هادئ واحترافي',
    colors: {
      background: '#F8F5F0',
      surface: '#FFFFFF',
      primary: '#4CAF50',
      primaryDark: '#3F6F55',
      primaryLight: '#66BB6A',
      accent: '#E2D9C9',
      danger: '#E57373',
      success: '#66BB6A',
      warning: '#D4AF37',
      muted: '#777777',
      textPrimary: '#333333',
      textSecondary: '#777777',
      border: '#D6CEC2',
      sidebar: '#2F4E3A',
      header: '#3F6F55',
      sidebarText: '#FDFCFB',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    nameAr: 'البحري الهادئ',
    description: 'A calm and elegant ocean-inspired theme',
    descriptionAr: 'ثيم بحري هادئ وراقي',
    colors: {
      background: '#F5F9FC',
      surface: '#FFFFFF',
      primary: '#3B82F6',
      primaryDark: '#2E5C8A',
      primaryLight: '#60A5FA',
      accent: '#DCE6F1',
      danger: '#D47575',
      success: '#4CAF70',
      warning: '#D4AF37',
      muted: '#7A8696',
      textPrimary: '#2A2F36',
      textSecondary: '#7A8696',
      border: '#D3DDE7',
      sidebar: '#1E3A5F',
      header: '#2E5C8A',
      sidebarText: '#FFFFFF',
    },
  },
  warm: {
    id: 'warm',
    name: 'Warm Success',
    nameAr: 'دفء النجاح',
    description: 'A warm and welcoming earthy theme',
    descriptionAr: 'ثيم دافئ وترابي مريح',
    colors: {
      background: '#FDF8F2',
      surface: '#FFFFFF',
      primary: '#E8953B',
      primaryDark: '#D4843B',
      primaryLight: '#F0A755',
      accent: '#E5D3BF',
      danger: '#C55A4A',
      success: '#7FB069',
      warning: '#CFAF50',
      muted: '#7A6A5E',
      textPrimary: '#3B2C22',
      textSecondary: '#7A6A5E',
      border: '#DCCFC3',
      sidebar: '#5A3E2B',
      header: '#D4843B',
      sidebarText: '#FDFCFB',
    },
  },
  'classic-admin': {
    id: 'classic-admin',
    name: 'Classic Control',
    nameAr: 'لوحة الإدارة الكلاسيكية',
    description: 'A dense, understated dashboard theme inspired by classic admin UIs',
    descriptionAr: 'ثيم لوحة تحكم كلاسيكي بكثافة عالية وتصميم بسيط',
    colors: {
      background: '#F3F4F6',
      surface: '#FFFFFF',
      primary: '#1F2A37',
      primaryDark: '#111827',
      primaryLight: '#374151',
      accent: '#E5E7EB',
      danger: '#B91C1C',
      success: '#047857',
      warning: '#B45309',
      muted: '#6B7280',
      textPrimary: '#1F2933',
      textSecondary: '#4B5563',
      border: '#D1D5DB',
      sidebar: '#0F172A',
      header: '#1F2933',
      sidebarText: '#E5E7EB',
    },
  },
  'enterprise-compact': {
    id: 'enterprise-compact',
    name: 'Enterprise Compact',
    nameAr: 'المؤسسي المضغوط',
    description: 'Ultra-compact enterprise theme with minimal spacing for maximum data density',
    descriptionAr: 'مظهر مؤسسي مضغوط بأقصى كثافة للبيانات وأقل فراغات',
    colors: {
      background: '#EBEEF2',
      surface: '#FFFFFF',
      primary: '#2563EB',
      primaryDark: '#1D4ED8',
      primaryLight: '#3B82F6',
      accent: '#E2E8F0',
      danger: '#DC2626',
      success: '#16A34A',
      warning: '#CA8A04',
      muted: '#64748B',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      border: '#CBD5E1',
      sidebar: '#1E293B',
      header: '#334155',
      sidebarText: '#F1F5F9',
    },
    density: {
      fontSize: {
        xs: '0.75rem',
        sm: '0.8125rem',
        base: '0.875rem',
        lg: '0.9375rem',
        xl: '1.0625rem',
      },
      spacing: {
        xs: '0.1875rem',
        sm: '0.3125rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
      },
      borderRadius: {
        sm: '0.1875rem',
        md: '0.3125rem',
        lg: '0.4375rem',
        xl: '0.5625rem',
      },
      buttonPadding: {
        sm: '0.3125rem 0.625rem',
        md: '0.4375rem 0.875rem',
        lg: '0.5625rem 1.125rem',
      },
      tablePadding: {
        cell: '0.4375rem 0.625rem',
        header: '0.5625rem 0.625rem',
      },
      cardPadding: '0.875rem',
      inputHeight: {
        sm: '1.625rem',
        md: '1.875rem',
        lg: '2.125rem',
      },
    },
  },
}

export const getThemeById = (id: string): Theme => {
  return themes[id] || themes.default
}

export const getAllThemes = (): Theme[] => {
  return Object.values(themes)
}

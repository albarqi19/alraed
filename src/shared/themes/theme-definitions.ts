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
  'dark-green': {
    id: 'dark-green',
    name: 'Dark Green',
    nameAr: 'الأخضر الداكن',
    description: 'A comprehensive dark theme with green accents',
    descriptionAr: 'ثيم داكن شامل بلمسات خضراء احترافية',
    colors: {
      background: '#0D1A12',
      surface: '#152A1E',
      primary: '#4CAF50',
      primaryDark: '#388E3C',
      primaryLight: '#81C784',
      accent: '#1C3025',
      danger: '#EF5350',
      success: '#66BB6A',
      warning: '#FFB300',
      muted: '#6B8A76',
      textPrimary: '#E2EDE5',
      textSecondary: '#8FAA96',
      border: '#243D2C',
      sidebar: '#091210',
      header: '#0A1510',
      sidebarText: '#E2EDE5',
    },
  },
  'enterprise-compact': {
    id: 'enterprise-compact',
    name: 'Enterprise Compact',
    nameAr: 'المؤسسي المضغوط',
    description: 'Ultra-compact enterprise theme with minimal spacing for maximum data density',
    descriptionAr: 'مظهر مؤسسي مضغوط بأقصى كثافة للبيانات وأقل فراغات',
    colors: {
      background: '#F8F5F0',
      surface: '#FFFFFF',
      primary: '#C9A961',
      primaryDark: '#A68B4B',
      primaryLight: '#D4BC7A',
      accent: '#E2D9C9',
      danger: '#C53030',
      success: '#276749',
      warning: '#C05621',
      muted: '#6B7280',
      textPrimary: '#1A1A1A',
      textSecondary: '#4A4A4A',
      border: '#D4CFC5',
      sidebar: '#1A1A2E',
      header: '#1A1A2E',
      sidebarText: '#F8F5F0',
    },
    density: {
      fontSize: {
        xs: '0.6875rem',
        sm: '0.75rem',
        base: '0.8125rem',
        lg: '0.875rem',
        xl: '1rem',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.625rem',
      },
      buttonPadding: {
        sm: '0.375rem 0.75rem',
        md: '0.5rem 1rem',
        lg: '0.625rem 1.25rem',
      },
      tablePadding: {
        cell: '0.5rem 0.75rem',
        header: '0.625rem 0.75rem',
      },
      cardPadding: '1rem',
      inputHeight: {
        sm: '1.75rem',
        md: '2rem',
        lg: '2.25rem',
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

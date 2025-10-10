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

export interface Theme {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  colors: ThemeColors
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
}

export const getThemeById = (id: string): Theme => {
  return themes[id] || themes.default
}

export const getAllThemes = (): Theme[] => {
  return Object.values(themes)
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getThemeById, themes, type Theme } from './theme-definitions'

const defaultDensity = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  buttonPadding: {
    sm: '0.5rem 1rem',
    md: '0.625rem 1.25rem',
    lg: '0.75rem 1.5rem',
  },
  tablePadding: {
    cell: '0.75rem 1rem',
    header: '0.875rem 1rem',
  },
  cardPadding: '1.5rem',
  inputHeight: {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
  },
}

interface ThemeContextValue {
  currentTheme: Theme
  setTheme: (themeId: string) => void
  availableThemes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'app-theme-preference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved || 'default'
  })

  const currentTheme = getThemeById(currentThemeId)
  const availableThemes = Object.values(themes)

  useEffect(() => {
    const root = document.documentElement
    const colors = currentTheme.colors
    const density = currentTheme.density || defaultDensity

    root.setAttribute('data-theme', currentTheme.id)

    root.style.setProperty('--color-background', colors.background)
    root.style.setProperty('--color-surface', colors.surface)
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-dark', colors.primaryDark)
    root.style.setProperty('--color-primary-light', colors.primaryLight)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-danger', colors.danger)
    root.style.setProperty('--color-success', colors.success)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-muted', colors.muted)
    root.style.setProperty('--color-text-primary', colors.textPrimary)
    root.style.setProperty('--color-text-secondary', colors.textSecondary)
    root.style.setProperty('--color-border', colors.border)
    root.style.setProperty('--color-sidebar', colors.sidebar)
    root.style.setProperty('--color-header', colors.header)
    root.style.setProperty('--color-sidebar-text', colors.sidebarText)

    root.style.setProperty('--font-size-xs', density.fontSize.xs)
    root.style.setProperty('--font-size-sm', density.fontSize.sm)
    root.style.setProperty('--font-size-base', density.fontSize.base)
    root.style.setProperty('--font-size-lg', density.fontSize.lg)
    root.style.setProperty('--font-size-xl', density.fontSize.xl)

    root.style.setProperty('--spacing-xs', density.spacing.xs)
    root.style.setProperty('--spacing-sm', density.spacing.sm)
    root.style.setProperty('--spacing-md', density.spacing.md)
    root.style.setProperty('--spacing-lg', density.spacing.lg)
    root.style.setProperty('--spacing-xl', density.spacing.xl)

    root.style.setProperty('--radius-sm', density.borderRadius.sm)
    root.style.setProperty('--radius-md', density.borderRadius.md)
    root.style.setProperty('--radius-lg', density.borderRadius.lg)
    root.style.setProperty('--radius-xl', density.borderRadius.xl)

    root.style.setProperty('--btn-padding-sm', density.buttonPadding.sm)
    root.style.setProperty('--btn-padding-md', density.buttonPadding.md)
    root.style.setProperty('--btn-padding-lg', density.buttonPadding.lg)

    root.style.setProperty('--table-cell-padding', density.tablePadding.cell)
    root.style.setProperty('--table-header-padding', density.tablePadding.header)

    root.style.setProperty('--card-padding', density.cardPadding)

    root.style.setProperty('--input-height-sm', density.inputHeight.sm)
    root.style.setProperty('--input-height-md', density.inputHeight.md)
    root.style.setProperty('--input-height-lg', density.inputHeight.lg)

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', colors.sidebar)
    }

    const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (appleStatusBarMeta) {
      appleStatusBarMeta.setAttribute('content', 'black-translucent')
    }

    const msTileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]')
    if (msTileColorMeta) {
      msTileColorMeta.setAttribute('content', colors.sidebar)
    }
  }, [currentTheme])

  const setTheme = (themeId: string) => {
    setCurrentThemeId(themeId)
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

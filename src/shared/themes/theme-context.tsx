import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getThemeById, themes, type Theme } from './theme-definitions'

interface ThemeContextValue {
  currentTheme: Theme
  setTheme: (themeId: string) => void
  availableThemes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'app-theme-preference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    // جلب الثيم المحفوظ من localStorage
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved || 'default'
  })

  const currentTheme = getThemeById(currentThemeId)
  const availableThemes = Object.values(themes)

  // تطبيق الألوان على CSS Variables
  useEffect(() => {
    const root = document.documentElement
    const colors = currentTheme.colors

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

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

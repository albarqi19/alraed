import { useState, useEffect, useCallback, useMemo } from 'react'

type DarkModePreference = 'auto' | 'light' | 'dark'

const STORAGE_KEY = 'teacher-dark-mode'

function getStoredMode(): DarkModePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored
  return 'auto'
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTeacherDarkMode() {
  const [mode, setModeState] = useState<DarkModePreference>(getStoredMode)
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark)

  const isDark = useMemo(() => {
    if (mode === 'dark') return true
    if (mode === 'light') return false
    return systemDark
  }, [mode, systemDark])

  // Listen for system theme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Update meta theme-color
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', isDark ? '#0f172a' : '#218081')
    }
  }, [isDark])

  // Clean up the preload class from blocking script
  useEffect(() => {
    document.documentElement.classList.remove('teacher-prefers-dark')
  }, [])

  const setMode = useCallback((newMode: DarkModePreference) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark')
  }, [isDark, setMode])

  return { isDark, mode, setMode, toggle }
}

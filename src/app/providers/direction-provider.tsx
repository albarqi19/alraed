import { type ReactNode, useEffect } from 'react'

interface DirectionProviderProps {
  children: ReactNode
}

export function DirectionProvider({ children }: DirectionProviderProps) {
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', 'ar')
    html.setAttribute('dir', 'rtl')
  }, [])

  return children
}

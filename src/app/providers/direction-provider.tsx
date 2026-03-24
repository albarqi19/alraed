import { type ReactNode, useEffect } from 'react'
import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction'

interface DirectionProviderProps {
  children: ReactNode
}

export function DirectionProvider({ children }: DirectionProviderProps) {
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('lang', 'ar')
    html.setAttribute('dir', 'rtl')
  }, [])

  return (
    <RadixDirectionProvider dir="rtl">
      {children}
    </RadixDirectionProvider>
  )
}

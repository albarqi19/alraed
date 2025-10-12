import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { DirectionProvider } from './direction-provider'
import { ToastProvider } from '@/shared/feedback/toast-provider'
import { AuthBootstrap } from './auth-bootstrap'
import { ThemeProvider } from '@/shared/themes'
import { BellManagerProvider } from '@/modules/admin/school-bell/context/bell-manager-context'
import { AutoCallProvider } from '@/modules/auto-call/context/auto-call-provider'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60, // دقيقة واحدة
          },
          mutations: {
            retry: 1,
          },
        },
      }),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DirectionProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthBootstrap>
                <BellManagerProvider>
                  <AutoCallProvider>{children}</AutoCallProvider>
                </BellManagerProvider>
              </AuthBootstrap>
            </ToastProvider>
          </ThemeProvider>
        </DirectionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

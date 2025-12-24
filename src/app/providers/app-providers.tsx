import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { DirectionProvider } from './direction-provider'
import { ToastProvider } from '@/shared/feedback/toast-provider'
import { AuthBootstrap } from './auth-bootstrap'
import { ThemeProvider } from '@/shared/themes'
import { BellManagerProvider } from '@/modules/admin/school-bell/context/bell-manager-context'
import { AutoCallProvider } from '@/modules/auto-call/context/auto-call-provider'
import { IdleTimeoutProvider } from './idle-timeout-provider'

interface AppProvidersProps {
  children: ReactNode
}

/** المسارات التي تحتاج AutoCallProvider */
const AUTO_CALL_ENABLED_PATHS = [
  '/admin/auto-call',
  '/auto-call',
  '/guardian',
]

/** المسارات التي تحتاج BellManagerProvider (جرس المدرسة) */
const BELL_MANAGER_ENABLED_PATHS = [
  '/admin',
]

function ProvidersWrapper({ children }: { children: ReactNode }) {
  const location = useLocation()

  // تفعيل AutoCall فقط على المسارات المحددة
  const isAutoCallEnabled = AUTO_CALL_ENABLED_PATHS.some(
    (path) => location.pathname.startsWith(path)
  )

  // تفعيل BellManager فقط على صفحات الأدمن
  const isBellManagerEnabled = BELL_MANAGER_ENABLED_PATHS.some(
    (path) => location.pathname.startsWith(path)
  )

  return (
    <BellManagerProvider disabled={!isBellManagerEnabled}>
      <AutoCallProvider disabled={!isAutoCallEnabled}>
        {children}
      </AutoCallProvider>
    </BellManagerProvider>
  )
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
                <IdleTimeoutProvider>
                  <ProvidersWrapper>{children}</ProvidersWrapper>
                </IdleTimeoutProvider>
              </AuthBootstrap>
            </ToastProvider>
          </ThemeProvider>
        </DirectionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

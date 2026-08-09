import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { DirectionProvider } from './direction-provider'
import { Toaster, sileo } from 'sileo'
import { getErrorMessage, getStatusCode } from '@/services/api/errors'
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
        /**
         * شبكة أمان لفشل الطفرات.
         *
         * ١٣٨ طفرة في الواجهة بلا onError خاص بها: المستخدم يضغط الزر، يفشل
         * الطلب، **ولا يحدث شيء** — لا رسالة ولا مؤشّر. يظنّ أن ضغطته لم تُسجَّل
         * فيعيد المحاولة، أو يظنّ العملية نجحت وهي لم تنجح.
         *
         * لا يُزاحم المعالجات الخاصة: الطفرة التي تتكفّل بخطئها تُستثنى، فلا
         * تظهر رسالتان.
         */
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (mutation.options.onError) {
              return
            }

            // 401 يتكفّل به معترض apiClient (يمسح الجلسة ويعيد للدخول)،
            // و402 يوجّه لصفحة الاشتراك — إظهار رسالة فوقهما تشويش
            const status = getStatusCode(error)
            if (status === 401 || status === 402) {
              return
            }

            sileo.error({
              title: getErrorMessage(error, 'تعذّر إتمام العملية'),
              duration: 5000,
            })
          },
        }),
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
            <Toaster
              position="bottom-center"
              offset={{ bottom: 80 }}
              options={{
                fill: 'var(--color-surface)',
                roundness: 16,
                autopilot: true,
              }}
            />
              <AuthBootstrap>
                <IdleTimeoutProvider>
                  <ProvidersWrapper>{children}</ProvidersWrapper>
                </IdleTimeoutProvider>
              </AuthBootstrap>
          </ThemeProvider>
        </DirectionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

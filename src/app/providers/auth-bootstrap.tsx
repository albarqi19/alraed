import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from '@/modules/auth/api'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useEffect } from 'react'

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const shouldFetch = Boolean(token && !user)

  const { data, error, isFetching } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    enabled: shouldFetch,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })

  useEffect(() => {
    if (data) {
      setUser(data)
    }
  }, [data, setUser])

  useEffect(() => {
    if (error) {
      clearAuth()
    }
  }, [clearAuth, error])

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-slate-700">
        <div className="space-y-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500/30 border-t-teal-500" />
          <p className="text-sm font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    )
  }

  return children
}

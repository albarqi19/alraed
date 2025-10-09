import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthenticatedUser, LoginResponse } from '../types'

interface AuthState {
  token?: string
  tokenType?: string
  user?: AuthenticatedUser
  isAuthenticated: boolean
  setAuth: (payload: LoginResponse) => void
  setUser: (user: AuthenticatedUser) => void
  clearAuth: () => void
}

function cacheToken(token?: string) {
  if (token) {
    window.localStorage.setItem('auth_token', token)
  } else {
    window.localStorage.removeItem('auth_token')
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      tokenType: undefined,
      user: undefined,
      isAuthenticated: false,
      setAuth: ({ token, token_type, user }) => {
        cacheToken(token)
        set({ token, tokenType: token_type ?? 'Bearer', user, isAuthenticated: true })
      },
      setUser: (user) => set((state) => ({ ...state, user })),
      clearAuth: () => {
        cacheToken(undefined)
        set({ token: undefined, tokenType: undefined, user: undefined, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, tokenType: state.tokenType, user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)

export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectUser = (state: AuthState) => state.user
export const selectToken = (state: AuthState) => state.token
export const selectTokenType = (state: AuthState) => state.tokenType

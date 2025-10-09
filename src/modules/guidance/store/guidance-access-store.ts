import { create } from 'zustand'

interface GuidanceAccessState {
  sessionId: number | null
  maskedPhone: string | null
  token: string | null
  expiresAt: string | null
  setPendingSession: (sessionId: number, maskedPhone: string) => void
  setVerifiedSession: (token: string, expiresAt?: string | null) => void
  clearSession: () => void
  isTokenValid: () => boolean
}

const STORAGE_KEY = 'guidance_access_session'

function loadInitialState(): Pick<GuidanceAccessState, 'sessionId' | 'maskedPhone' | 'token' | 'expiresAt'> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { sessionId: null, maskedPhone: null, token: null, expiresAt: null }
    const parsed = JSON.parse(raw)
    return {
      sessionId: parsed.sessionId ?? null,
      maskedPhone: parsed.maskedPhone ?? null,
      token: parsed.token ?? null,
      expiresAt: parsed.expiresAt ?? null,
    }
  } catch (error) {
    console.warn('Failed to load guidance session', error)
    return { sessionId: null, maskedPhone: null, token: null, expiresAt: null }
  }
}

function persist(state: Pick<GuidanceAccessState, 'sessionId' | 'maskedPhone' | 'token' | 'expiresAt'>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useGuidanceAccessStore = create<GuidanceAccessState>((set, get) => ({
  ...loadInitialState(),
  setPendingSession: (sessionId, maskedPhone) => {
    const next = { sessionId, maskedPhone, token: null, expiresAt: null }
    persist(next)
    set(next)
  },
  setVerifiedSession: (token, expiresAt) => {
    const next = {
      sessionId: null,
      maskedPhone: null,
      token,
      expiresAt: expiresAt ?? null,
    }
    persist(next)
    set(next)
  },
  clearSession: () => {
    persist({ sessionId: null, maskedPhone: null, token: null, expiresAt: null })
    set({ sessionId: null, maskedPhone: null, token: null, expiresAt: null })
  },
  isTokenValid: () => {
    const { token, expiresAt } = get()
    if (!token) return false
    if (!expiresAt) return true
    return new Date(expiresAt).getTime() > Date.now()
  },
}))

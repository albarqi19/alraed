import type { BiometricPunchFilters } from './types'

export const biometricQueryKeys = {
  root: ['admin', 'biometric'] as const,

  devices: () => ['admin', 'biometric', 'devices'] as const,

  punches: (filters: BiometricPunchFilters = {}) =>
    ['admin', 'biometric', 'punches', filters] as const,

  stats: () => ['admin', 'biometric', 'stats'] as const,
}

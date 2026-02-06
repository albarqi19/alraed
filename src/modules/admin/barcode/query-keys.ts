import type { BarcodeScanFilters, BarcodeHistoryFilters } from './types'

export const barcodeQueryKeys = {
  root: ['admin', 'barcode'] as const,

  today: (filters: BarcodeScanFilters = {}) =>
    ['admin', 'barcode', 'today', filters] as const,

  stats: () => ['admin', 'barcode', 'stats'] as const,

  history: (filters: BarcodeHistoryFilters) =>
    ['admin', 'barcode', 'history', filters] as const,

  settings: () => ['admin', 'barcode', 'settings'] as const,

  devices: () => ['admin', 'barcode', 'devices'] as const,

  students: (filters: Record<string, unknown> = {}) =>
    ['admin', 'barcode', 'students', filters] as const,
}

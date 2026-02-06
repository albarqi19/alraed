import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import { barcodeQueryKeys } from './query-keys'
import {
  scanBarcode,
  fetchBarcodeTodayScans,
  fetchBarcodeStats,
  fetchBarcodeHistory,
  fetchBarcodeSettings,
  updateBarcodeSettings,
  fetchScannerDevices,
  createScannerDevice,
  updateScannerDevice,
  deleteScannerDevice,
  regenerateDeviceToken,
  fetchBarcodeStudents,
  printBarcodesBatch,
} from './api'
import type { BarcodeScanFilters, BarcodeHistoryFilters, BarcodeSettings, ScannerDevice } from './types'

// ========== Query Hooks ==========

export function useBarcodeTodayScansQuery(filters: BarcodeScanFilters = {}) {
  return useQuery({
    queryKey: barcodeQueryKeys.today(filters),
    queryFn: () => fetchBarcodeTodayScans(filters),
    refetchInterval: 30_000, // تحديث كل 30 ثانية
  })
}

export function useBarcodeStatsQuery() {
  return useQuery({
    queryKey: barcodeQueryKeys.stats(),
    queryFn: fetchBarcodeStats,
    refetchInterval: 15_000, // تحديث كل 15 ثانية
  })
}

export function useBarcodeHistoryQuery(filters: BarcodeHistoryFilters, enabled = true) {
  return useQuery({
    queryKey: barcodeQueryKeys.history(filters),
    queryFn: () => fetchBarcodeHistory(filters),
    enabled,
  })
}

export function useBarcodeSettingsQuery() {
  return useQuery({
    queryKey: barcodeQueryKeys.settings(),
    queryFn: fetchBarcodeSettings,
  })
}

export function useScannerDevicesQuery() {
  return useQuery({
    queryKey: barcodeQueryKeys.devices(),
    queryFn: fetchScannerDevices,
  })
}

export function useBarcodeStudentsQuery(filters: { grade?: string; class_name?: string; search?: string } = {}) {
  return useQuery({
    queryKey: barcodeQueryKeys.students(filters),
    queryFn: () => fetchBarcodeStudents(filters),
  })
}

// ========== Mutation Hooks ==========

export function useScanBarcodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: scanBarcode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.today() })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.stats() })
    },
  })
}

export function useUpdateBarcodeSettingsMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<BarcodeSettings>) => updateBarcodeSettings(settings),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث الإعدادات بنجاح' })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.settings() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر تحديث الإعدادات' })
    },
  })
}

export function useCreateScannerDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createScannerDevice,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تسجيل الجهاز بنجاح' })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر تسجيل الجهاز' })
    },
  })
}

export function useUpdateScannerDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Partial<Pick<ScannerDevice, 'device_name' | 'status' | 'notes'>>) =>
      updateScannerDevice(id, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تحديث الجهاز بنجاح' })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر تحديث الجهاز' })
    },
  })
}

export function useDeleteScannerDeviceMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteScannerDevice,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف الجهاز بنجاح' })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر حذف الجهاز' })
    },
  })
}

export function useRegenerateDeviceTokenMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: regenerateDeviceToken,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم تجديد التوكن بنجاح' })
      queryClient.invalidateQueries({ queryKey: barcodeQueryKeys.devices() })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر تجديد التوكن' })
    },
  })
}

export function usePrintBarcodesBatchMutation() {
  const toast = useToast()

  return useMutation({
    mutationFn: printBarcodesBatch,
    onSuccess: (blob) => {
      // تحميل الملف
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'barcode-cards.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      toast({ type: 'success', title: 'تم تحميل ملف الباركود بنجاح' })
    },
    onError: () => {
      toast({ type: 'error', title: 'تعذر تحميل ملف الباركود' })
    },
  })
}

/**
 * Hook لإدارة تحميل الملفات الصوتية للعمل offline
 */

import { useState, useCallback } from 'react'
import { useBellManager } from './context/bell-manager-context'
import {
  deleteCachedAudio,
  clearAllCachedAudios,
  getTotalCacheSize,
  formatCacheSize,
  isCacheStorageSupported,
} from './audio-cache'

export interface DownloadProgress {
  soundId: string
  progress: number
  isDownloading: boolean
  error: string | null
}

export interface UseAudioDownloadResult {
  /** هل يدعم المتصفح التخزين المحلي */
  isSupported: boolean
  /** تحميل ملف صوتي واحد */
  download: (soundId: string) => Promise<boolean>
  /** تحميل جميع الملفات الصوتية */
  downloadAll: () => Promise<void>
  /** حذف ملف صوتي من التخزين المحلي */
  remove: (soundId: string) => Promise<boolean>
  /** حذف جميع الملفات من التخزين المحلي */
  clearAll: () => Promise<boolean>
  /** الحصول على الحجم الإجمالي للملفات المخزنة */
  getTotalSize: () => Promise<string>
  /** حالة التحميل الحالية */
  progress: DownloadProgress | null
  /** هل يتم تحميل ملف حالياً */
  isDownloading: boolean
}

export function useAudioDownload(): UseAudioDownloadResult {
  const { state, downloadAudio, updateAudioCacheStatus } = useBellManager()
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const isSupported = isCacheStorageSupported()

  const download = useCallback(
    async (soundId: string): Promise<boolean> => {
      if (!isSupported) {
        console.warn('[AudioDownload] التخزين المحلي غير مدعوم')
        return false
      }

      setIsDownloading(true)
      setProgress({
        soundId,
        progress: 0,
        isDownloading: true,
        error: null,
      })

      try {
        const success = await downloadAudio(soundId, (p) => {
          setProgress((prev) =>
            prev ? { ...prev, progress: p } : null
          )
        })

        setProgress((prev) =>
          prev
            ? {
                ...prev,
                progress: 100,
                isDownloading: false,
                error: success ? null : 'فشل التحميل',
              }
            : null
        )

        return success
      } catch (error) {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                isDownloading: false,
                error: error instanceof Error ? error.message : 'فشل التحميل',
              }
            : null
        )
        return false
      } finally {
        setIsDownloading(false)
      }
    },
    [downloadAudio, isSupported],
  )

  const downloadAll = useCallback(async (): Promise<void> => {
    if (!isSupported) return

    const assetsToDownload = state.audioAssets.filter(
      (asset) => asset.url && asset.cacheStatus !== 'cached'
    )

    for (const asset of assetsToDownload) {
      await download(asset.id)
    }
  }, [state.audioAssets, download, isSupported])

  const remove = useCallback(
    async (soundId: string): Promise<boolean> => {
      if (!isSupported) return false

      const success = await deleteCachedAudio(soundId)
      if (success) {
        updateAudioCacheStatus(soundId, 'not-cached')
      }
      return success
    },
    [updateAudioCacheStatus, isSupported],
  )

  const clearAll = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    const success = await clearAllCachedAudios()
    if (success) {
      state.audioAssets.forEach((asset) => {
        updateAudioCacheStatus(asset.id, 'not-cached')
      })
    }
    return success
  }, [state.audioAssets, updateAudioCacheStatus, isSupported])

  const getTotalSize = useCallback(async (): Promise<string> => {
    if (!isSupported) return '0 B'
    const size = await getTotalCacheSize()
    return formatCacheSize(size)
  }, [isSupported])

  return {
    isSupported,
    download,
    downloadAll,
    remove,
    clearAll,
    getTotalSize,
    progress,
    isDownloading,
  }
}

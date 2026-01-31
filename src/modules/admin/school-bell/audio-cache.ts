/**
 * خدمة تخزين الملفات الصوتية للعمل offline
 * يستخدم CacheStorage API لحفظ الملفات محلياً
 */

const CACHE_NAME = 'norin-bell-audio-v1'

export type CacheStatus = 'not-cached' | 'downloading' | 'cached' | 'error'

export interface AudioCacheEntry {
  id: string
  url: string
  cachedAt: string
  sizeBytes: number
}

/**
 * التحقق من دعم المتصفح لـ CacheStorage
 */
export function isCacheStorageSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window
}

/**
 * فتح الـ Cache
 */
async function openCache(): Promise<Cache | null> {
  if (!isCacheStorageSupported()) {
    console.warn('[AudioCache] CacheStorage غير مدعوم في هذا المتصفح')
    return null
  }
  try {
    return await caches.open(CACHE_NAME)
  } catch (error) {
    console.error('[AudioCache] فشل فتح الـ Cache:', error)
    return null
  }
}

/**
 * تحميل وتخزين ملف صوتي
 */
export async function cacheAudioFile(
  id: string,
  url: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const cache = await openCache()
  if (!cache) return false

  try {
    // إنشاء مفتاح فريد للملف
    const cacheKey = buildCacheKey(id)

    // تحميل الملف
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // قراءة الحجم الكلي إن وجد
    const contentLength = response.headers.get('content-length')
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0

    // قراءة البيانات مع متابعة التقدم
    if (response.body && totalSize > 0 && onProgress) {
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        receivedLength += value.length
        onProgress(Math.round((receivedLength / totalSize) * 100))
      }

      // تجميع البيانات
      const blob = new Blob(chunks as BlobPart[], { type: response.headers.get('content-type') || 'audio/mpeg' })
      const cachedResponse = new Response(blob, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
          'X-Cached-At': new Date().toISOString(),
          'X-Audio-Id': id,
          'X-Original-Url': url,
        },
      })

      await cache.put(cacheKey, cachedResponse)
    } else {
      // تخزين مباشر بدون متابعة التقدم
      const clonedResponse = response.clone()
      const blob = await clonedResponse.blob()
      const cachedResponse = new Response(blob, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
          'X-Cached-At': new Date().toISOString(),
          'X-Audio-Id': id,
          'X-Original-Url': url,
        },
      })

      await cache.put(cacheKey, cachedResponse)
      if (onProgress) onProgress(100)
    }

    console.log(`[AudioCache] تم تخزين الملف: ${id}`)
    return true
  } catch (error) {
    console.error(`[AudioCache] فشل تخزين الملف ${id}:`, error)
    return false
  }
}

/**
 * الحصول على ملف صوتي من الـ Cache
 */
export async function getCachedAudio(id: string): Promise<Blob | null> {
  const cache = await openCache()
  if (!cache) return null

  try {
    const cacheKey = buildCacheKey(id)
    const response = await cache.match(cacheKey)
    if (!response) return null
    return await response.blob()
  } catch (error) {
    console.error(`[AudioCache] فشل قراءة الملف ${id}:`, error)
    return null
  }
}

/**
 * الحصول على URL محلي للملف المخزن (blob URL)
 */
export async function getCachedAudioUrl(id: string): Promise<string | null> {
  const blob = await getCachedAudio(id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

/**
 * التحقق من وجود ملف في الـ Cache
 */
export async function isAudioCached(id: string): Promise<boolean> {
  const cache = await openCache()
  if (!cache) return false

  try {
    const cacheKey = buildCacheKey(id)
    const response = await cache.match(cacheKey)
    return response !== undefined
  } catch {
    return false
  }
}

/**
 * حذف ملف من الـ Cache
 */
export async function deleteCachedAudio(id: string): Promise<boolean> {
  const cache = await openCache()
  if (!cache) return false

  try {
    const cacheKey = buildCacheKey(id)
    const deleted = await cache.delete(cacheKey)
    if (deleted) {
      console.log(`[AudioCache] تم حذف الملف: ${id}`)
    }
    return deleted
  } catch (error) {
    console.error(`[AudioCache] فشل حذف الملف ${id}:`, error)
    return false
  }
}

/**
 * الحصول على قائمة الملفات المخزنة
 */
export async function listCachedAudios(): Promise<AudioCacheEntry[]> {
  const cache = await openCache()
  if (!cache) return []

  try {
    const keys = await cache.keys()
    const entries: AudioCacheEntry[] = []

    for (const request of keys) {
      const response = await cache.match(request)
      if (!response) continue

      const id = response.headers.get('X-Audio-Id') || extractIdFromUrl(request.url)
      const cachedAt = response.headers.get('X-Cached-At') || ''
      const originalUrl = response.headers.get('X-Original-Url') || ''
      const blob = await response.clone().blob()

      entries.push({
        id,
        url: originalUrl,
        cachedAt,
        sizeBytes: blob.size,
      })
    }

    return entries
  } catch (error) {
    console.error('[AudioCache] فشل قراءة قائمة الملفات:', error)
    return []
  }
}

/**
 * حذف جميع الملفات المخزنة
 */
export async function clearAllCachedAudios(): Promise<boolean> {
  if (!isCacheStorageSupported()) return false

  try {
    const deleted = await caches.delete(CACHE_NAME)
    if (deleted) {
      console.log('[AudioCache] تم حذف جميع الملفات المخزنة')
    }
    return deleted
  } catch (error) {
    console.error('[AudioCache] فشل حذف الـ Cache:', error)
    return false
  }
}

/**
 * الحصول على الحجم الإجمالي للملفات المخزنة
 */
export async function getTotalCacheSize(): Promise<number> {
  const entries = await listCachedAudios()
  return entries.reduce((total, entry) => total + entry.sizeBytes, 0)
}

/**
 * تنسيق الحجم للعرض
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ============ Helper Functions ============

function buildCacheKey(id: string): string {
  return `bell-audio://${id}`
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/bell-audio:\/\/(.+)/)
  return match ? match[1] : url
}

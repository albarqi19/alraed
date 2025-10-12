import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BellAudioAsset, BellEvent } from './types'

export type PlaybackOutcome = 'played' | 'fallback-played' | 'failed'

interface UseSchoolBellEngineOptions {
  baseUrl?: string
  volume?: number
}

interface UseSchoolBellEngineResult {
  playEvent: (event: BellEvent) => Promise<PlaybackOutcome>
  previewSound: (soundId: string) => Promise<PlaybackOutcome>
  resolveAssetUrl: (soundId: string) => string | null
  readySoundIds: string[]
  isAnyAudioReady: boolean
  lastError: string | null
}

const FALLBACK_DURATION_MS = 5000

export function useSchoolBellEngine(
  audioAssets: BellAudioAsset[],
  { baseUrl = '/school-bell-audio', volume = 0.9 }: UseSchoolBellEngineOptions = {},
): UseSchoolBellEngineResult {
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>())
  const loadPromisesRef = useRef(new Map<string, Promise<HTMLAudioElement | null>>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const readySoundIds = useMemo(() => audioAssets.filter((asset) => asset.status === 'ready').map((asset) => asset.id), [audioAssets])

  useEffect(() => {
    const validIds = new Set(audioAssets.map((asset) => asset.id))
    for (const key of audioElementsRef.current.keys()) {
      if (!validIds.has(key)) {
        const element = audioElementsRef.current.get(key)
        element?.pause()
        audioElementsRef.current.delete(key)
      }
    }
  }, [audioAssets])

  const resolveAssetUrl = useCallback(
    (soundId: string) => {
      const asset = audioAssets.find((item) => item.id === soundId)
      if (!asset) return null
      if (asset.status === 'missing') return null
      return `${baseUrl}/${soundId}.mp3`
    },
    [audioAssets, baseUrl],
  )

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
      return null
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
      } catch (error) {
        console.warn('تعذر استئناف AudioContext', error)
      }
    }

    return audioContextRef.current
  }, [])

  const playFallbackTone = useCallback(async () => {
    const audioContext = await ensureAudioContext()
    if (!audioContext) {
      return false
    }

    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.value = 880
      gainNode.gain.value = 0
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05)
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.9)
      gainNode.gain.linearRampToValueAtTime(0, now + FALLBACK_DURATION_MS / 1000)

      oscillator.start(now)
      oscillator.stop(now + FALLBACK_DURATION_MS / 1000)
      return true
    } catch (error) {
      console.error('فشل تشغيل النغمة البديلة', error)
      setLastError('تعذر تشغيل الصوت الاحتياطي')
      return false
    }
  }, [ensureAudioContext])

  const loadAudioElement = useCallback(
    (soundId: string) => {
      if (loadPromisesRef.current.has(soundId)) {
        return loadPromisesRef.current.get(soundId) as Promise<HTMLAudioElement | null>
      }

      const url = resolveAssetUrl(soundId)
      if (!url) {
        const promise = Promise.resolve(null)
        loadPromisesRef.current.set(soundId, promise)
        return promise
      }

      const existing = audioElementsRef.current.get(soundId)
      if (existing) {
        return Promise.resolve(existing)
      }

      const promise = new Promise<HTMLAudioElement | null>((resolve) => {
        const audio = new Audio(url)
        audio.preload = 'auto'
        audio.crossOrigin = 'anonymous'
        audio.volume = volume

        const cleanup = () => {
          audio.removeEventListener('canplaythrough', handleReady)
          audio.removeEventListener('error', handleError)
        }

        const handleReady = () => {
          cleanup()
          audioElementsRef.current.set(soundId, audio)
          resolve(audio)
        }

        const handleError = () => {
          cleanup()
          setLastError(`تعذر تحميل الصوت: ${soundId}`)
          resolve(null)
        }

        audio.addEventListener('canplaythrough', handleReady)
        audio.addEventListener('error', handleError)
        audio.load()
      })

      loadPromisesRef.current.set(soundId, promise)
      return promise
    },
    [resolveAssetUrl, volume],
  )

  const playFromElement = useCallback(async (element: HTMLAudioElement) => {
    try {
      element.currentTime = 0
      const playback = element.play()
      if (playback && typeof playback.then === 'function') {
        await playback
      }
      return true
    } catch (error) {
      console.error('تعذر تشغيل الصوت المحدد', error)
      setLastError('فشل تشغيل النغمة المحددة')
      return false
    }
  }, [])

  const playBySoundId = useCallback(
    async (soundId: string): Promise<PlaybackOutcome> => {
      const element = await loadAudioElement(soundId)
      if (element) {
        const success = await playFromElement(element)
        if (success) {
          return 'played'
        }
      }

      const fallbackPlayed = await playFallbackTone()
      return fallbackPlayed ? 'fallback-played' : 'failed'
    },
    [loadAudioElement, playFromElement, playFallbackTone],
  )

  const playEvent = useCallback(
    async (event: BellEvent): Promise<PlaybackOutcome> => {
      if (!event.soundId) {
        return (await playFallbackTone()) ? 'fallback-played' : 'failed'
      }
      return playBySoundId(event.soundId)
    },
    [playBySoundId, playFallbackTone],
  )

  const previewSound = useCallback((soundId: string) => playBySoundId(soundId), [playBySoundId])

  return {
    playEvent,
    previewSound,
    resolveAssetUrl,
    readySoundIds,
    isAnyAudioReady: readySoundIds.length > 0,
    lastError,
  }
}

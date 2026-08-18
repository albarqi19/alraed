import { useCallback, useEffect, useRef, useState } from 'react'
import type { AutoCallQueueEntry, AutoCallSettings } from '../types'
import {
  announceNextByToken,
  fetchDisplayState,
  finishAnnouncementByToken,
  type DisplayAcknowledgement,
  type DisplayState,
} from '../api/display-api'

/**
 * مغذّي شاشة البوّابة حين تعمل برمزٍ لا بجلسة.
 *
 * لا Echo هنا عمداً: قناةُ البثّ خاصّةٌ تُصرَّح برمز موظّف، وشاشةُ الرمز لا
 * تملكه. والاستطلاعُ كلَّ ثلاث ثوانٍ يكفي ويزيد لغرضٍ إيقاعُه دقائق: وليُّ
 * الأمر يضغط الزرَّ ثمّ يسير من سيّارته إلى البوّابة. وهو أمتنُ من البثّ في
 * هذا الموضع بالذات — جهازٌ يعمل ساعاتٍ متّصلةً على شبكة مدرسةٍ متقطّعة، و
 * WebSocket ساقطٌ يصمت بلا خبر، بينما الاستطلاعُ يشفي نفسه في الدورة التالية.
 */

const POLL_MS = 3_000

export interface DisplayFeed {
  settings: AutoCallSettings | null
  queue: AutoCallQueueEntry[]
  recentAcknowledged: DisplayAcknowledgement[]
  schoolName: string | null
  isLoading: boolean
  error: string | null
  /** فارقُ ساعة الجهاز عن ساعة الخادم بالمللي ثانية (موجبٌ إن كان الجهاز متأخّراً). */
  clockSkewMs: number
  announceNext: () => Promise<AutoCallQueueEntry | null>
  finishAnnouncement: (callId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useDisplayFeed(token: string | null): DisplayFeed {
  const [state, setState] = useState<DisplayState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clockSkewMs, setClockSkewMs] = useState(0)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // طلبٌ واحدٌ في الطريق: الدورةُ كلَّ ثلاث ثوانٍ، والكنسُ في الخادم قد يطول
  // في أوّل قراءةٍ بعد النشر. بلا هذا الحارس تتراكم الطلبات على شبكةٍ بطيئة
  // فتُغرق الشاشةُ خادمَها بطلباتٍ لا تنتظر جوابها.
  const inFlightRef = useRef(false)

  const load = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      setError('رابط الشاشة ناقص — افتح الرابط الكامل من لوحة النداء الآلي')
      return
    }

    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true

    try {
      const next = await fetchDisplayState(token)
      if (!isMountedRef.current) return

      setState(next)
      setError(null)

      if (next.serverTime) {
        // إزاحةٌ تُقاس في كلّ دورة: صناديق العرض الرخيصة تنحرف ساعتها مع
        // الوقت، ولا نريد تصحيحاً واحداً في الصباح يفسد بعد الظهر.
        const skew = new Date(next.serverTime).getTime() - Date.now()
        if (Number.isFinite(skew)) {
          setClockSkewMs(skew)
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return

      const status = (err as { response?: { status?: number } })?.response?.status
      setError(
        status === 404
          ? 'رابط الشاشة غير صالح — أعد توليده من لوحة النداء الآلي'
          : 'تعذّر الاتصال بالخادم — تُعاد المحاولة تلقائياً'
      )
    } finally {
      inFlightRef.current = false

      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [token])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const announceNext = useCallback(async () => {
    if (!token) return null

    const promoted = await announceNextByToken(token)

    if (promoted) {
      // تحديثٌ تفاؤليّ: دورةُ الاستطلاع التالية قد تتأخّر ثلاثَ ثوانٍ، وفي
      // أثنائها يجب أن يظهر الاسمُ ويُنطق.
      setState((prev) =>
        prev
          ? { ...prev, queue: prev.queue.map((q) => (q.id === promoted.id ? promoted : q)) }
          : prev
      )
    }

    return promoted
  }, [token])

  const finishAnnouncement = useCallback(async (callId: string) => {
    if (!token) return

    await finishAnnouncementByToken(token, callId)
    setState((prev) =>
      prev
        ? {
            ...prev,
            queue: prev.queue.map((q) => (q.id === callId ? { ...q, status: 'pending' } : q)),
          }
        : prev
    )
  }, [token])

  return {
    settings: state?.settings ?? null,
    queue: state?.queue ?? [],
    recentAcknowledged: state?.recentAcknowledged ?? [],
    schoolName: state?.schoolName ?? null,
    isLoading,
    error,
    clockSkewMs,
    announceNext,
    finishAnnouncement,
    refresh: load,
  }
}

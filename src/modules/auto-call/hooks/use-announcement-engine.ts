import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AUTO_CALL_ENGINE_TICK_MS, DEFAULT_AUTO_CALL_SETTINGS } from '../constants'
import type { AutoCallQueueEntry, AutoCallSettings } from '../types'
import { pickVoice, useSpeechVoices } from './use-speech-voices'

/**
 * محرّكُ النداء على شاشة البوّابة.
 *
 * قبل هذا الملفّ لم يكن في النظام كلِّه ما ينقل نداءً من «بانتظار» إلى
 * «يُنادى عليه» إلا زرٌّ يضغطه موظّفٌ في لوحة الأدمن. فمن طلب النداءَ ولم يجلس
 * أحدٌ أمام اللوحة، بقي طلبُه في طابورٍ صامتٍ حتى تنتهي مهلتُه — وهذا حالُ
 * الميزة كلِّها منذ ولادتها: اسمُها «النداء الآليّ» ولا شيءَ فيها آليّ.
 *
 * والمحرّكُ هنا **يسأل ولا يقرّر**: الترقيةُ تقع في الخادم تحت قفلٍ، فشاشتان
 * مفتوحتان عند بوّابتين لا تنطقان اسمين معاً. وكلُّ ما تفعله هذه الحلقة أن
 * تسأل «هل من نداءٍ تالٍ؟» كلَّ ثانية، وتنطق ما يُعطى لها.
 *
 * الدورة:
 *   ١. نداءٌ يُنطق الآن؟ ⇒ إن انقضت مدّةُ عرضه أعِدْه إلى الطابور ليأخذ غيرُه دورَه.
 *   ٢. لا نداءَ يُنطق، والنطقُ التلقائيّ مفعَّل ⇒ اطلب التالي.
 *   ٣. وصل نداءٌ جديدٌ (أو ازداد عدّادُ نداءاته) ⇒ انطق اسمه.
 */

export type AnnouncementEngineMode = 'auto' | 'manual' | 'idle'

interface EngineParams {
  settings: AutoCallSettings | null
  queue: AutoCallQueueEntry[]
  announceNext: () => Promise<AutoCallQueueEntry | null>
  finishAnnouncement: (callId: string) => Promise<void>
  /** هل أذِن المتصفّحُ بالصوت بعد؟ بلا إذنٍ لا نُرقّي نداءً لن يُسمع. */
  isAudioReady: boolean
  /** إيقافُ المحرّك كلّه (شاشةٌ غير مرئيّة، أو معاينةٌ في لوحة الأدمن). */
  enabled?: boolean
  /**
   * فارقُ ساعة الجهاز عن ساعة الخادم بالمللي ثانية.
   *
   * ليس تجميلاً: المحرّك يقارن `Date.now()` بطابعٍ ولّده الخادم
   * (`last_announced_at`) ليقرّر متى تنتهي دورةُ النطق. وصندوقُ عرضٍ متأخّرةٌ
   * ساعتُه دقائقَ لا يبلغ الشرطَ أبداً، فلا يُنهي الدورة، فيقفل الطابورَ خلفه
   * حتى يُحرّره حارسُ العالق في الخادم — أي نصفُ دقيقةٍ من الصمت بعد كلّ نداء.
   * والمتقدّمةُ ساعتُه تُنهي الدورةَ قبل أن يُنطق الاسمُ كاملاً.
   */
  clockSkewMs?: number
}

export interface AnnouncementEngine {
  mode: AnnouncementEngineMode
  /** النداءُ الذي يُنطق الآن. */
  announcing: AutoCallQueueEntry | null
  /** ثوانٍ متبقّيةٌ من مدّة عرضه. */
  secondsRemaining: number
  /** آخرُ نصٍّ نُطق — يُعرض تحت البطاقة كي يعرف الواقفُ أن الشاشة حيّة. */
  lastSpokenText: string | null
  /** هل المُركِّبُ الصوتيُّ ينطق الآن؟ */
  isSpeaking: boolean
  /** نطقٌ يدويٌّ لنداءٍ بعينه (زرّ «أعد النداء»). */
  speakNow: (entry: AutoCallQueueEntry) => void
  /** ترقيةٌ يدويّةٌ للتالي حين يكون النطقُ التلقائيّ مطفأً. */
  triggerNext: () => Promise<void>
}

/** نصُّ النداء كما يُسمع عند البوّابة. */
export function buildAnnouncementText(entry: AutoCallQueueEntry, withClass: boolean): string {
  const name = (entry.studentName ?? '').trim()

  if (!name) {
    // اسمٌ فارغٌ يعني حمولةً ناقصة — ولا يُنطق فراغ. (كان يقع فعلاً: حدثُ
    // تغيّرِ الحالة لا يحمل الاسم، فيُمحى من الصفّ المعروض ثم يُنطق خواءً.)
    return ''
  }

  const classLabel = (entry.classLabel ?? '').trim()

  return withClass && classLabel
    ? `نداء للطالب ${name}، ${classLabel}`
    : `نداء للطالب ${name}`
}

export function useAnnouncementEngine({
  settings,
  queue,
  announceNext,
  finishAnnouncement,
  isAudioReady,
  enabled = true,
  clockSkewMs = 0,
}: EngineParams): AnnouncementEngine {
  const voices = useSpeechVoices()
  const [now, setNow] = useState(() => Date.now())
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // بصمةُ آخرِ ما نُطق: المعرِّف مع عدّاد النداءات. بلا العدّاد لا تُعاد
  // مناداةُ الطالب نفسه أبداً؛ وبلا المعرِّف يُعاد النطقُ عند كلّ إعادة رسم.
  const lastSpokenKeyRef = useRef<string | null>(null)

  // طلبٌ واحدٌ في الطريق: الدورةُ كلَّ ثانية، والشبكةُ قد تتأخّر ثلاثاً. بلا
  // هذا القفل تتراكم الطلبات فتُرقّى نداءاتٌ متتاليةٌ في ثانيةٍ واحدة.
  const inFlightRef = useRef(false)

  // بعد فشلٍ لا نُلحّ: الخادمُ ساقطٌ أو الشبكةُ مقطوعة، وطلبٌ كلَّ ثانيةٍ يزيد
  // الطين بلّة ويملأ السجلّ بألفِ خطأ في الدقيقة.
  const backoffUntilRef = useRef(0)

  const resolved = useMemo(() => ({
    enableSpeech: settings?.enableSpeech ?? DEFAULT_AUTO_CALL_SETTINGS.enableSpeech,
    autoAnnounce: settings?.autoAnnounce ?? DEFAULT_AUTO_CALL_SETTINGS.autoAnnounce,
    announceWithClass: settings?.announceWithClass ?? DEFAULT_AUTO_CALL_SETTINGS.announceWithClass,
    speechRate: settings?.speechRate ?? DEFAULT_AUTO_CALL_SETTINGS.speechRate,
    voiceGender: settings?.voiceGender ?? DEFAULT_AUTO_CALL_SETTINGS.voiceGender,
    voiceLocale: settings?.voiceLocale ?? DEFAULT_AUTO_CALL_SETTINGS.voiceLocale,
    durationSeconds: Math.max(
      5,
      settings?.announcementDurationSeconds ?? DEFAULT_AUTO_CALL_SETTINGS.announcementDurationSeconds
    ),
    isOpen: settings?.enabled ?? false,
  }), [settings])

  const announcing = useMemo(
    () => queue.find((entry) => entry.status === 'announcing') ?? null,
    [queue]
  )

  /**
   * هل في الطابور من يستحقّ نداءً الآن؟
   *
   * «منتظرٌ» وحدها لا تكفي: الطالبُ الذي بلغ حدَّ نداءاته يبقى في الطابور حتى
   * تنتهي مهلتُه (نصفَ ساعةٍ افتراضاً) وهو غيرُ مؤهَّلٍ لنداءٍ جديد. ولولا هذا
   * الشرط لسألت الشاشةُ الخادمَ «مَن التالي؟» كلَّ ثانيةٍ طَوال تلك النصف ساعة
   * فيردّ «لا أحد» ألفاً وثمانمئة مرّة — ضجيجٌ على الخادم بلا أثرٍ واحد.
   */
  const hasEligibleWaiting = useMemo(() => {
    const limit = Math.max(1, settings?.maxAnnouncements ?? DEFAULT_AUTO_CALL_SETTINGS.maxAnnouncements)
    return queue.some((entry) => entry.status === 'pending' && entry.announcedCount < limit)
  }, [queue, settings?.maxAnnouncements])

  /** النطقُ نفسه — منفصلٌ عن الحلقة كي يُستدعى يدويّاً أيضاً. */
  const speak = useCallback((entry: AutoCallQueueEntry) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }

    const text = buildAnnouncementText(entry, resolved.announceWithClass)

    if (!text) {
      return
    }

    setLastSpokenText(text)

    if (!resolved.enableSpeech) {
      // النطقُ مطفأٌ في الإعدادات: الاسمُ يُعرض ولا يُنطق. حالةٌ مقصودةٌ في
      // مدرسةٍ لها مُكبِّرُ صوتٍ منفصل.
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = resolved.voiceLocale || 'ar-SA'
    utterance.rate = resolved.speechRate
    utterance.pitch = 1
    utterance.volume = 1

    const voice = pickVoice(voices, utterance.lang, resolved.voiceGender)
    if (voice) {
      utterance.voice = voice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    // `cancel` قبل `speak`: نداءٌ جديدٌ يقطع سابقَه ولا يصطفّ خلفه. الاصطفافُ
    // يعني أن يسمع الواقفُ اسمَ طالبٍ انصرف قبل دقيقة.
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [resolved, voices])

  const speakNow = useCallback((entry: AutoCallQueueEntry) => {
    lastSpokenKeyRef.current = `${entry.id}:${entry.announcedCount}`
    speak(entry)
  }, [speak])

  const triggerNext = useCallback(async () => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true

    try {
      const promoted = await announceNext()

      if (!promoted) {
        // «لا أحد يستحقّ الآن» جوابٌ صحيحٌ لا خطأ: الفاصلُ الزمنيّ لم ينقضِ
        // بعد، أو الخدمةُ خارج نافذتها. مهلةٌ قصيرةٌ قبل السؤال ثانيةً تكفي
        // لئلّا نسأل السؤال نفسه ستّين مرّةً في الدقيقة.
        backoffUntilRef.current = Date.now() + 4_000
      }
    } catch {
      backoffUntilRef.current = Date.now() + 15_000
    } finally {
      inFlightRef.current = false
    }
  }, [announceNext])

  // ساعةُ المحرّك.
  useEffect(() => {
    if (!enabled) {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), AUTO_CALL_ENGINE_TICK_MS)
    return () => window.clearInterval(timer)
  }, [enabled])

  // ١+٢: إنهاءُ الدورة المنتهية، ثمّ طلبُ التالي.
  useEffect(() => {
    if (!enabled || !resolved.isOpen) {
      return
    }

    if (Date.now() < backoffUntilRef.current) {
      return
    }

    if (announcing) {
      const startedAt = announcing.lastAnnouncedAt ?? announcing.createdAt
      const elapsed = (Date.now() + clockSkewMs - new Date(startedAt).getTime()) / 1000

      if (elapsed >= resolved.durationSeconds && !inFlightRef.current) {
        inFlightRef.current = true
        finishAnnouncement(announcing.id)
          .catch(() => {
            backoffUntilRef.current = Date.now() + 15_000
          })
          .finally(() => {
            inFlightRef.current = false
          })
      }

      return
    }

    // لا نُرقّي نداءً لن يُسمع: المتصفّحُ يمنع الصوتَ قبل أوّل تفاعل، فترقيةٌ
    // في تلك اللحظة تحرق دورةَ نداءٍ صامتة، وتزيد عدّادَ «نودي عليه» لطالبٍ لم
    // يُنادَ عليه — ثمّ تُحسب على وليّه مخالفةٌ آخرَ اليوم.
    if (!resolved.autoAnnounce || !hasEligibleWaiting || !isAudioReady) {
      return
    }

    void triggerNext()
  }, [
    announcing,
    clockSkewMs,
    enabled,
    finishAnnouncement,
    hasEligibleWaiting,
    isAudioReady,
    now,
    resolved.autoAnnounce,
    resolved.durationSeconds,
    resolved.isOpen,
    triggerNext,
  ])

  // ٣: نداءٌ جديدٌ على الشاشة ⇒ انطقه مرّةً واحدة.
  useEffect(() => {
    if (!enabled || !announcing) {
      return
    }

    const key = `${announcing.id}:${announcing.announcedCount}`

    if (lastSpokenKeyRef.current === key) {
      return
    }

    lastSpokenKeyRef.current = key
    speak(announcing)
  }, [announcing, enabled, speak])

  // تنظيفٌ عند مغادرة الشاشة: مُركِّبُ الصوت يُكمل ما في طابوره بعد تفكيك
  // المكوّن، فتظلّ الصفحةُ المغلقةُ تنطق.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const secondsRemaining = useMemo(() => {
    if (!announcing) {
      return resolved.durationSeconds
    }

    const startedAt = announcing.lastAnnouncedAt ?? announcing.createdAt
    const elapsed = (now + clockSkewMs - new Date(startedAt).getTime()) / 1000

    return Math.max(0, Math.round(resolved.durationSeconds - elapsed))
  }, [announcing, clockSkewMs, now, resolved.durationSeconds])

  const mode: AnnouncementEngineMode = !resolved.isOpen
    ? 'idle'
    : resolved.autoAnnounce
      ? 'auto'
      : 'manual'

  return {
    mode,
    announcing,
    secondsRemaining,
    lastSpokenText,
    isSpeaking,
    speakNow,
    triggerNext,
  }
}

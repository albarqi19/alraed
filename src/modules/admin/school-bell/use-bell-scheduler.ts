import { useEffect, useRef } from 'react'
import type { BellEvent, BellSchedule } from './types'

export interface UpcomingEventInfo {
  event: BellEvent
  occurrence: Date
  schedule: BellSchedule
}

interface UseBellSchedulerOptions {
  enabled: boolean
  upcomingEvent: UpcomingEventInfo | null
  onTrigger: (info: { event: BellEvent; occurrence: Date; source: 'foreground' | 'background' }) => void
}

interface WorkerMessageTrigger {
  type: 'trigger'
  payload: {
    eventId: string
    scheduleId: string
    title: string
    triggeredAt: number
  }
}

export function useBellScheduler({ enabled, upcomingEvent, onTrigger }: UseBellSchedulerOptions) {
  const workerRef = useRef<Worker | null>(null)
  const scheduledKeyRef = useRef<string | null>(null)
  const triggeredKeysRef = useRef(new Set<string>())
  const foregroundTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      scheduledKeyRef.current = null
      triggeredKeysRef.current.clear()
      if (foregroundTimerRef.current) {
        window.clearTimeout(foregroundTimerRef.current)
        foregroundTimerRef.current = null
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'cancel' })
        workerRef.current.terminate()
        workerRef.current = null
      }
      return
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/school-bell-timer.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current.onmessage = (message: MessageEvent<WorkerMessageTrigger>) => {
        if (message.data?.type === 'trigger') {
          const { eventId, triggeredAt } = message.data.payload
          const key = `${eventId}:${triggeredAt}`
          if (triggeredKeysRef.current.has(key)) {
            return
          }
          triggeredKeysRef.current.add(key)
          if (upcomingEvent && upcomingEvent.event.id === eventId) {
            onTrigger({ event: upcomingEvent.event, occurrence: new Date(triggeredAt), source: 'background' })
          }
        }
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'cancel' })
      }
      if (foregroundTimerRef.current) {
        window.clearTimeout(foregroundTimerRef.current)
        foregroundTimerRef.current = null
      }
    }
  }, [enabled, onTrigger, upcomingEvent])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (!upcomingEvent) {
      if (foregroundTimerRef.current) {
        window.clearTimeout(foregroundTimerRef.current)
        foregroundTimerRef.current = null
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'cancel' })
      }
      scheduledKeyRef.current = null
      return
    }

    const occurrenceTimestamp = upcomingEvent.occurrence.getTime()
    const scheduleKey = `${upcomingEvent.event.id}:${occurrenceTimestamp}`

    triggeredKeysRef.current.delete(scheduleKey)

    if (foregroundTimerRef.current) {
      window.clearTimeout(foregroundTimerRef.current)
    }

    const diff = Math.max(occurrenceTimestamp - Date.now(), 0)
    foregroundTimerRef.current = window.setTimeout(() => {
      onTrigger({ event: upcomingEvent.event, occurrence: new Date(), source: 'foreground' })
    }, diff)

    if (workerRef.current && scheduledKeyRef.current !== scheduleKey) {
      workerRef.current.postMessage({
        type: 'schedule',
        payload: {
          eventId: upcomingEvent.event.id,
          scheduleId: upcomingEvent.schedule.id,
          title: upcomingEvent.event.title,
          occurrenceTimestamp,
        },
      })
      scheduledKeyRef.current = scheduleKey
    }
  }, [enabled, upcomingEvent, onTrigger])
}

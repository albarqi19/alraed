interface ScheduleMessage {
  type: 'schedule'
  payload: {
    eventId: string
    scheduleId: string
    title: string
    occurrenceTimestamp: number
  }
}

interface CancelMessage {
  type: 'cancel'
}

interface TerminateMessage {
  type: 'terminate'
}

type WorkerMessage = ScheduleMessage | CancelMessage | TerminateMessage

type PostMessagePayload =
  | {
      type: 'trigger'
      payload: {
        eventId: string
        scheduleId: string
        title: string
        triggeredAt: number
      }
    }
  | {
      type: 'scheduled'
      payload: {
        eventId: string
        occurrenceTimestamp: number
      }
    }
  | {
      type: 'cancelled'
    }

let currentTimeout: ReturnType<typeof setTimeout> | null = null
let currentEventKey: string | null = null

function clearCurrentTimer() {
  if (currentTimeout) {
    clearTimeout(currentTimeout)
    currentTimeout = null
  }
  currentEventKey = null
}

function scheduleEvent(message: ScheduleMessage) {
  const { eventId, occurrenceTimestamp, title, scheduleId } = message.payload
  const eventKey = `${eventId}:${occurrenceTimestamp}`

  if (currentEventKey === eventKey) {
    return
  }

  clearCurrentTimer()

  const delay = Math.max(occurrenceTimestamp - Date.now(), 0)
  currentEventKey = eventKey

  currentTimeout = setTimeout(() => {
    currentTimeout = null
    currentEventKey = null
    postMessage({
      type: 'trigger',
      payload: {
        eventId,
        scheduleId,
        title,
        triggeredAt: Date.now(),
      },
    } satisfies PostMessagePayload)
  }, delay)

  postMessage({
    type: 'scheduled',
    payload: {
      eventId,
      occurrenceTimestamp,
    },
  } satisfies PostMessagePayload)
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (!message) {
    return
  }

  switch (message.type) {
    case 'schedule':
      scheduleEvent(message)
      break
    case 'cancel':
      clearCurrentTimer()
      postMessage({ type: 'cancelled' } satisfies PostMessagePayload)
      break
    case 'terminate':
      clearCurrentTimer()
      close()
      break
    default:
      break
  }
}

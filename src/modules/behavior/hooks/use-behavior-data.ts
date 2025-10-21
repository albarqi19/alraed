import { useCallback, useEffect, useMemo, useState } from 'react'
import { mockBehaviorIncidents, mockBehaviorTrend } from '../data/mock-incidents'
import type { BehaviorDashboardMetrics, BehaviorIncident, BehaviorTrendPoint } from '../types'

interface BehaviorDataState {
  incidents: BehaviorIncident[]
  trend: BehaviorTrendPoint[]
  metrics: BehaviorDashboardMetrics
  isLoading: boolean
  isError: boolean
  lastSyncedAt: string | null
  refetch: () => void
}

function computeMetrics(incidents: BehaviorIncident[]): BehaviorDashboardMetrics {
  const today = new Date().toISOString().slice(0, 10)

  return incidents.reduce<BehaviorDashboardMetrics>(
    (acc, incident) => {
      acc.totalIncidents += 1
      acc.totalPoints += incident.points
      if (incident.requiresGuardianMeeting) acc.guardianMeetings += 1
      if (incident.severity === 'critical' && incident.status !== 'resolved') acc.criticalOpen += 1

      switch (incident.status) {
        case 'pending':
          acc.pendingCount += 1
          break
        case 'under_review':
          acc.underReviewCount += 1
          break
        case 'resolved':
          acc.resolvedCount += 1
          break
        case 'escalated':
          acc.escalatedCount += 1
          break
        default:
          break
      }

      if (incident.followUps.some((followUp) => followUp.recordedAt.slice(0, 10) === today)) {
        acc.followUpsToday += 1
      }

      return acc
    },
    {
      totalIncidents: 0,
      pendingCount: 0,
      underReviewCount: 0,
      resolvedCount: 0,
      escalatedCount: 0,
      totalPoints: 0,
      guardianMeetings: 0,
      followUpsToday: 0,
      criticalOpen: 0,
    },
  )
}

export function useBehaviorData(): BehaviorDataState {
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setIsError(false)

    const timer = setTimeout(() => {
      try {
        setIncidents(mockBehaviorIncidents)
        setLastSyncedAt(new Date().toISOString())
      } catch (error) {
        console.error('Failed to load behavior incidents', error)
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [load])

  const metrics = useMemo(() => computeMetrics(incidents), [incidents])

  return {
    incidents,
    trend: mockBehaviorTrend,
    metrics,
    isLoading,
    isError,
    lastSyncedAt,
    refetch: load,
  }
}

export type BehaviorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type BehaviorStatus = 'pending' | 'under_review' | 'resolved' | 'escalated'

export interface BehaviorIncidentFollowUp {
  id: number
  recordedAt: string
  recordedBy: string
  notes: string
  actionTaken?: string
  nextFollowUpDate?: string
  communicationChannel?: 'phone' | 'whatsapp' | 'meeting'
}

export interface BehaviorIncident {
  id: number
  code: string
  studentId: number
  studentName: string
  studentClass: string
  guardianName?: string
  guardianPhone?: string
  category: string
  subCategory?: string
  severity: BehaviorSeverity
  status: BehaviorStatus
  points: number
  recordedAt: string
  lastUpdatedAt: string
  reportedBy: string
  summary: string
  triggers?: string[]
  actionsTaken: string[]
  nextSteps?: string[]
  followUps: BehaviorIncidentFollowUp[]
  attachmentsCount: number
  requiresGuardianMeeting: boolean
}

export interface BehaviorDashboardMetrics {
  totalIncidents: number
  pendingCount: number
  underReviewCount: number
  resolvedCount: number
  escalatedCount: number
  totalPoints: number
  guardianMeetings: number
  followUpsToday: number
  criticalOpen: number
}

export interface BehaviorTrendPoint {
  month: string
  total: number
  resolved: number
  critical: number
}

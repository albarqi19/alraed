import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeGuidanceCase,
  createGuidanceAction,
  createGuidanceCase,
  createGuidanceFollowup,
  fetchGuidanceCase,
  fetchGuidanceCases,
  fetchGuidanceStats,
  fetchGuidanceStudents,
  reopenGuidanceCase,
  requestGuidanceAccess,
  updateGuidanceCase,
  updateGuidanceFollowupStatus,
  uploadGuidanceDocument,
  verifyGuidanceOtp,
  fetchTreatmentPlans,
  fetchTreatmentPlan,
  createTreatmentPlan,
  updateTreatmentPlan,
  deleteTreatmentPlan,
  addTreatmentGoal,
  updateTreatmentGoal,
  deleteTreatmentGoal,
  addIntervention,
  deleteIntervention,
  addTreatmentFollowup,
  addTreatmentEvaluation,
} from './api'
import type {
  GuidanceCaseFilters,
  GuidanceCaseRecord,
  GuidanceCaseFollowup,
  GuidanceStatsSummary,
  GuidanceStudentSummary,
  TreatmentPlanFilters,
  TreatmentPlanFormData,
  TreatmentGoalFormData,
  TreatmentFollowupFormData,
  TreatmentEvaluationFormData,
} from './types'
import { useGuidanceAccessStore } from './store/guidance-access-store'

const CASES_QUERY_KEY = ['guidance', 'cases']
const CASE_DETAILS_QUERY_KEY = (id: number) => ['guidance', 'cases', id]
const STATS_QUERY_KEY = ['guidance', 'stats']
const STUDENTS_QUERY_KEY = ['guidance', 'students']
const TREATMENT_PLANS_QUERY_KEY = ['guidance', 'treatment-plans']
const TREATMENT_PLAN_DETAILS_QUERY_KEY = (id: number) => ['guidance', 'treatment-plans', id]

export function useGuidanceSession() {
  const sessionId = useGuidanceAccessStore((state) => state.sessionId)
  const maskedPhone = useGuidanceAccessStore((state) => state.maskedPhone)
  const token = useGuidanceAccessStore((state) => state.token)
  const expiresAt = useGuidanceAccessStore((state) => state.expiresAt)
  const isTokenValid = useGuidanceAccessStore((state) => state.isTokenValid)
  const setPendingSession = useGuidanceAccessStore((state) => state.setPendingSession)
  const setVerifiedSession = useGuidanceAccessStore((state) => state.setVerifiedSession)
  const clearSession = useGuidanceAccessStore((state) => state.clearSession)

  return {
    sessionId,
    maskedPhone,
    token,
    expiresAt,
    isTokenValid,
    setPendingSession,
    setVerifiedSession,
    clearSession,
  }
}

export function useGuidanceCases(filters: GuidanceCaseFilters) {
  const { token, isTokenValid } = useGuidanceSession()

  return useQuery({
    queryKey: [...CASES_QUERY_KEY, filters],
    queryFn: () => {
      if (!token || !isTokenValid()) {
        throw new Error('TokenMissing')
      }
      return fetchGuidanceCases(token, filters)
    },
    enabled: Boolean(token && isTokenValid()),
    staleTime: 30_000,
  })
}

export function useGuidanceStats() {
  const { token, isTokenValid } = useGuidanceSession()
  return useQuery<GuidanceStatsSummary>({
    queryKey: STATS_QUERY_KEY,
    queryFn: () => {
      if (!token || !isTokenValid()) {
        throw new Error('TokenMissing')
      }
      return fetchGuidanceStats(token)
    },
    enabled: Boolean(token && isTokenValid()),
    staleTime: 60_000,
  })
}

export function useGuidanceStudents() {
  const { token, isTokenValid } = useGuidanceSession()
  return useQuery<GuidanceStudentSummary[]>({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => {
      if (!token || !isTokenValid()) {
        throw new Error('TokenMissing')
      }
      return fetchGuidanceStudents(token)
    },
    enabled: Boolean(token && isTokenValid()),
    staleTime: 5 * 60_000,
  })
}

export function useGuidanceCase(caseId: number) {
  const { token, isTokenValid } = useGuidanceSession()
  return useQuery<GuidanceCaseRecord>({
    queryKey: CASE_DETAILS_QUERY_KEY(caseId),
    queryFn: () => {
      if (!token || !isTokenValid()) {
        throw new Error('TokenMissing')
      }
      return fetchGuidanceCase(token, caseId)
    },
    enabled: Boolean(caseId && token && isTokenValid()),
    staleTime: 15_000,
  })
}

export function useGuidanceAccessMutations() {
  const { setPendingSession, setVerifiedSession, clearSession } = useGuidanceSession()

  const requestMutation = useMutation({
    mutationFn: requestGuidanceAccess,
    onSuccess: (data) => {
      setPendingSession(data.session_id, data.masked_phone)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: ({ sessionId, code }: { sessionId: number; code: string }) => verifyGuidanceOtp(sessionId, code),
    onSuccess: (data) => {
      setVerifiedSession(data.token, data.expires_at)
    },
    onError: () => {
      clearSession()
    },
  })

  return {
    requestMutation,
    verifyMutation,
  }
}

export function useGuidanceCaseMutations() {
  const queryClient = useQueryClient()
  const { token, isTokenValid } = useGuidanceSession()

  const ensureToken = () => {
    if (!token || !isTokenValid()) {
      throw new Error('TokenMissing')
    }
    return token
  }

  const createCase = useMutation({
    mutationFn: (payload: Partial<GuidanceCaseRecord>) => createGuidanceCase(ensureToken(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const updateCaseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<GuidanceCaseRecord> }) =>
      updateGuidanceCase(ensureToken(), id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(variables.id) })
    },
  })

  const closeCaseMutation = useMutation({
    mutationFn: (id: number) => closeGuidanceCase(ensureToken(), id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const reopenCaseMutation = useMutation({
    mutationFn: (id: number) => reopenGuidanceCase(ensureToken(), id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const addActionMutation = useMutation({
    mutationFn: ({ caseId, payload }: { caseId: number; payload: Record<string, unknown> }) =>
      createGuidanceAction(ensureToken(), caseId, payload),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
    },
  })

  const addFollowupMutation = useMutation({
    mutationFn: ({ caseId, payload }: { caseId: number; payload: Record<string, unknown> }) =>
      createGuidanceFollowup(ensureToken(), caseId, payload),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
    },
  })

  const updateFollowupStatusMutation = useMutation({
    mutationFn: ({
      caseId,
      followupId,
      payload,
    }: {
      caseId: number
      followupId: number
      payload: { status: GuidanceCaseFollowup['status']; notes?: string | null }
    }) => updateGuidanceFollowupStatus(ensureToken(), caseId, followupId, payload),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ caseId, file, description }: { caseId: number; file: File; description?: string | null }) =>
      uploadGuidanceDocument(ensureToken(), caseId, file, description ?? undefined),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
    },
  })

  return {
    createCase,
    updateCase: updateCaseMutation,
    closeCase: closeCaseMutation,
    reopenCase: reopenCaseMutation,
    addAction: addActionMutation,
    addFollowup: addFollowupMutation,
    updateFollowupStatus: updateFollowupStatusMutation,
    uploadDocument: uploadDocumentMutation,
  }
}

// ==================== Treatment Plans Hooks ====================

export function useTreatmentPlans(filters: TreatmentPlanFilters) {
  const { token, isTokenValid } = useGuidanceSession()

  return useQuery({
    queryKey: [...TREATMENT_PLANS_QUERY_KEY, filters],
    queryFn: () => fetchTreatmentPlans(token!, filters),
    enabled: isTokenValid(),
  })
}

export function useTreatmentPlan(planId: number | null) {
  const { token, isTokenValid } = useGuidanceSession()

  return useQuery({
    queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId!),
    queryFn: () => fetchTreatmentPlan(token!, planId!),
    enabled: isTokenValid() && planId !== null,
  })
}

export function useTreatmentPlanMutations() {
  const { token } = useGuidanceSession()
  const queryClient = useQueryClient()

  const createPlan = useMutation({
    mutationFn: (data: TreatmentPlanFormData) => createTreatmentPlan(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const updatePlan = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: Partial<TreatmentPlanFormData> }) =>
      updateTreatmentPlan(token!, planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const deletePlan = useMutation({
    mutationFn: (planId: number) => deleteTreatmentPlan(token!, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const addGoal = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentGoalFormData }) =>
      addTreatmentGoal(token!, planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const updateGoal = useMutation({
    mutationFn: ({ planId, goalId, data }: { planId: number; goalId: number; data: Partial<TreatmentGoalFormData> }) =>
      updateTreatmentGoal(token!, planId, goalId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const deleteGoal = useMutation({
    mutationFn: ({ planId, goalId }: { planId: number; goalId: number }) =>
      deleteTreatmentGoal(token!, planId, goalId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const addInterventionMutation = useMutation({
    mutationFn: ({
      planId,
      goalId,
      data,
    }: {
      planId: number
      goalId: number
      data: { intervention_type: string; description: string }
    }) => addIntervention(token!, planId, goalId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const deleteInterventionMutation = useMutation({
    mutationFn: ({ planId, goalId, interventionId }: { planId: number; goalId: number; interventionId: number }) =>
      deleteIntervention(token!, planId, goalId, interventionId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const addFollowup = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentFollowupFormData }) =>
      addTreatmentFollowup(token!, planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const addEvaluation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentEvaluationFormData }) =>
      addTreatmentEvaluation(token!, planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  return {
    createPlan,
    updatePlan,
    deletePlan,
    addGoal,
    updateGoal,
    deleteGoal,
    addIntervention: addInterventionMutation,
    deleteIntervention: deleteInterventionMutation,
    addFollowup,
    addEvaluation,
  }
}


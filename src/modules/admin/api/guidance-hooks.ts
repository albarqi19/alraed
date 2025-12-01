/**
 * Hooks for Guidance module - uses standard auth (no separate guidance token needed)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeGuidanceCase,
  createGuidanceAction,
  createGuidanceCase,
  createGuidanceFollowup,
  deleteGuidanceCase,
  fetchGuidanceCase,
  fetchGuidanceCases,
  fetchGuidanceStats,
  fetchGuidanceStudents,
  reopenGuidanceCase,
  updateGuidanceCase,
  updateGuidanceFollowupStatus,
  uploadGuidanceDocument,
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
} from './guidance-api'
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
} from '@/modules/guidance/types'

const CASES_QUERY_KEY = ['admin', 'guidance', 'cases']
const CASE_DETAILS_QUERY_KEY = (id: number) => ['admin', 'guidance', 'cases', id]
const STATS_QUERY_KEY = ['admin', 'guidance', 'stats']
const STUDENTS_QUERY_KEY = ['admin', 'guidance', 'students']
const TREATMENT_PLANS_QUERY_KEY = ['admin', 'guidance', 'treatment-plans']
const TREATMENT_PLAN_DETAILS_QUERY_KEY = (id: number) => ['admin', 'guidance', 'treatment-plans', id]

// ==================== Student Cases Hooks ====================

export function useAdminGuidanceCases(filters: GuidanceCaseFilters) {
  return useQuery({
    queryKey: [...CASES_QUERY_KEY, filters],
    queryFn: () => fetchGuidanceCases(filters),
    staleTime: 30_000,
  })
}

export function useAdminGuidanceStats() {
  return useQuery<GuidanceStatsSummary>({
    queryKey: STATS_QUERY_KEY,
    queryFn: fetchGuidanceStats,
    staleTime: 60_000,
  })
}

export function useAdminGuidanceStudents() {
  return useQuery<GuidanceStudentSummary[]>({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: fetchGuidanceStudents,
    staleTime: 5 * 60_000,
  })
}

export function useAdminGuidanceCase(caseId: number | null) {
  return useQuery<GuidanceCaseRecord>({
    queryKey: CASE_DETAILS_QUERY_KEY(caseId!),
    queryFn: () => fetchGuidanceCase(caseId!),
    enabled: caseId !== null,
    staleTime: 15_000,
  })
}

export function useAdminGuidanceCaseMutations() {
  const queryClient = useQueryClient()

  const createCase = useMutation({
    mutationFn: (payload: Partial<GuidanceCaseRecord>) => createGuidanceCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const updateCaseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<GuidanceCaseRecord> }) =>
      updateGuidanceCase(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(variables.id) })
    },
  })

  const closeCaseMutation = useMutation({
    mutationFn: (id: number) => closeGuidanceCase(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const reopenCaseMutation = useMutation({
    mutationFn: (id: number) => reopenGuidanceCase(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(id) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const deleteCaseMutation = useMutation({
    mutationFn: (id: number) => deleteGuidanceCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const addActionMutation = useMutation({
    mutationFn: ({ caseId, payload }: { caseId: number; payload: Record<string, unknown> }) =>
      createGuidanceAction(caseId, payload),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
    },
  })

  const addFollowupMutation = useMutation({
    mutationFn: ({ caseId, payload }: { caseId: number; payload: Record<string, unknown> }) =>
      createGuidanceFollowup(caseId, payload),
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
    }) => updateGuidanceFollowupStatus(caseId, followupId, payload),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
    },
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ caseId, file, description }: { caseId: number; file: File; description?: string | null }) =>
      uploadGuidanceDocument(caseId, file, description ?? undefined),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: CASE_DETAILS_QUERY_KEY(caseId) })
    },
  })

  return {
    createCase,
    updateCase: updateCaseMutation,
    deleteCase: deleteCaseMutation,
    closeCase: closeCaseMutation,
    reopenCase: reopenCaseMutation,
    addAction: addActionMutation,
    addFollowup: addFollowupMutation,
    updateFollowupStatus: updateFollowupStatusMutation,
    uploadDocument: uploadDocumentMutation,
  }
}

// ==================== Treatment Plans Hooks ====================

export function useAdminTreatmentPlans(filters: TreatmentPlanFilters) {
  return useQuery({
    queryKey: [...TREATMENT_PLANS_QUERY_KEY, filters],
    queryFn: () => fetchTreatmentPlans(filters),
  })
}

export function useAdminTreatmentPlan(planId: number | null) {
  return useQuery({
    queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId!),
    queryFn: () => fetchTreatmentPlan(planId!),
    enabled: planId !== null,
  })
}

export function useAdminTreatmentPlanMutations() {
  const queryClient = useQueryClient()

  const createPlan = useMutation({
    mutationFn: (data: TreatmentPlanFormData) => createTreatmentPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const updatePlan = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: Partial<TreatmentPlanFormData> }) =>
      updateTreatmentPlan(planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const deletePlan = useMutation({
    mutationFn: (planId: number) => deleteTreatmentPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLANS_QUERY_KEY })
    },
  })

  const addGoal = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentGoalFormData }) =>
      addTreatmentGoal(planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const updateGoal = useMutation({
    mutationFn: ({ planId, goalId, data }: { planId: number; goalId: number; data: Partial<TreatmentGoalFormData> }) =>
      updateTreatmentGoal(planId, goalId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const deleteGoal = useMutation({
    mutationFn: ({ planId, goalId }: { planId: number; goalId: number }) =>
      deleteTreatmentGoal(planId, goalId),
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
    }) => addIntervention(planId, goalId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const deleteInterventionMutation = useMutation({
    mutationFn: ({ planId, goalId, interventionId }: { planId: number; goalId: number; interventionId: number }) =>
      deleteIntervention(planId, goalId, interventionId),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const addFollowup = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentFollowupFormData }) =>
      addTreatmentFollowup(planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: TREATMENT_PLAN_DETAILS_QUERY_KEY(planId) })
    },
  })

  const addEvaluation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: TreatmentEvaluationFormData }) =>
      addTreatmentEvaluation(planId, data),
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

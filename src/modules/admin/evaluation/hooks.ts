import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/feedback/use-toast'
import {
  fetchBehaviorTypes,
  createBehaviorType,
  updateBehaviorType,
  deleteBehaviorType,
  reorderBehaviorTypes,
  fetchEvaluationStats,
} from './api'
import type { BehaviorTypeFormValues } from './types'

const BEHAVIOR_TYPES_KEY = ['admin', 'behavior-types'] as const
const EVALUATION_STATS_KEY = ['admin', 'evaluation-stats'] as const

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export function useBehaviorTypesQuery() {
  return useQuery({
    queryKey: [...BEHAVIOR_TYPES_KEY],
    queryFn: fetchBehaviorTypes,
  })
}

export function useEvaluationStatsQuery() {
  return useQuery({
    queryKey: [...EVALUATION_STATS_KEY],
    queryFn: fetchEvaluationStats,
    refetchInterval: 60_000,
  })
}

export function useCreateBehaviorTypeMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<BehaviorTypeFormValues>) => createBehaviorType(payload),
    onSuccess: (behaviorType) => {
      toast({ type: 'success', title: `تم إنشاء "${behaviorType.name}" بنجاح` })
      queryClient.invalidateQueries({ queryKey: [...BEHAVIOR_TYPES_KEY] })
      queryClient.invalidateQueries({ queryKey: [...EVALUATION_STATS_KEY] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر إنشاء نمط السلوك') })
    },
  })
}

export function useUpdateBehaviorTypeMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<BehaviorTypeFormValues> }) =>
      updateBehaviorType(id, payload),
    onSuccess: (behaviorType) => {
      toast({ type: 'success', title: `تم تحديث "${behaviorType.name}"` })
      queryClient.invalidateQueries({ queryKey: [...BEHAVIOR_TYPES_KEY] })
      queryClient.invalidateQueries({ queryKey: [...EVALUATION_STATS_KEY] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر تحديث نمط السلوك') })
    },
  })
}

export function useReorderBehaviorTypesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderedIds: number[]) => reorderBehaviorTypes(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BEHAVIOR_TYPES_KEY] })
    },
  })
}

export function useDeleteBehaviorTypeMutation() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteBehaviorType,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم حذف نمط السلوك' })
      queryClient.invalidateQueries({ queryKey: [...BEHAVIOR_TYPES_KEY] })
      queryClient.invalidateQueries({ queryKey: [...EVALUATION_STATS_KEY] })
    },
    onError: (error) => {
      toast({ type: 'error', title: getErrorMessage(error, 'تعذر حذف نمط السلوك') })
    },
  })
}

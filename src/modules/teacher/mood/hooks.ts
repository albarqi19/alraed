import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTodayMood, submitMood, fetchMoodHistory } from './api'
import type { MoodType, TodayMoodResponse, SubmitMoodResponse, MoodHistoryResponse } from './types'
import { useToast } from '@/shared/feedback/use-toast'

export const teacherMoodQueryKeys = {
  all: ['teacher', 'mood'] as const,
  today: () => [...teacherMoodQueryKeys.all, 'today'] as const,
  history: (days?: number) => [...teacherMoodQueryKeys.all, 'history', days] as const,
}

/**
 * Query to check if the teacher has submitted a mood today
 */
export function useTodayMoodQuery() {
  return useQuery<TodayMoodResponse>({
    queryKey: teacherMoodQueryKeys.today(),
    queryFn: fetchTodayMood,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

/**
 * Mutation to submit the teacher's mood
 */
export function useSubmitMoodMutation(options?: { onSuccess?: (data: SubmitMoodResponse) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mood: MoodType) => submitMood(mood),
    onSuccess: (data) => {
      // Update the today query to reflect that mood has been submitted
      queryClient.setQueryData<TodayMoodResponse>(teacherMoodQueryKeys.today(), {
        has_mood: true,
        mood: data.mood,
        mood_label: data.mood_label,
        mood_emoji: data.mood_emoji,
      })

      // Show the personalized response message
      toast({
        type: 'success',
        title: data.response_message,
        duration: 6000,
      })

      options?.onSuccess?.(data)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر تسجيل الحالة المزاجية'
      toast({ type: 'error', title: message })
    },
  })
}

/**
 * Query to get the teacher's mood history
 */
export function useMoodHistoryQuery(days: number = 30) {
  return useQuery<MoodHistoryResponse>({
    queryKey: teacherMoodQueryKeys.history(days),
    queryFn: () => fetchMoodHistory(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

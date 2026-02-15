import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { NoteFilters, GuideType, AskMeRequest } from './types'

// ========== Query Keys ==========

export const noteKeys = {
  all: ['personal-notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: NoteFilters) => [...noteKeys.lists(), filters] as const,
  stats: () => [...noteKeys.all, 'stats'] as const,
}

export const guideKeys = {
  all: ['guides'] as const,
  list: () => [...guideKeys.all, 'list'] as const,
  detail: (type: GuideType) => [...guideKeys.all, type] as const,
  tree: (guideId: number) => [...guideKeys.all, 'tree', guideId] as const,
  section: (id: number) => [...guideKeys.all, 'section', id] as const,
  search: (guideId: number, q: string) => [...guideKeys.all, 'search', guideId, q] as const,
  bookmarks: (guideId: number) => [...guideKeys.all, 'bookmarks', guideId] as const,
}

// ========== المفكرة الشخصية ==========

export function useNotes(filters: NoteFilters = {}) {
  return useQuery({
    queryKey: noteKeys.list(filters),
    queryFn: () => api.fetchNotes(filters),
  })
}

export function useNoteStats() {
  return useQuery({
    queryKey: noteKeys.stats(),
    queryFn: api.fetchNoteStatistics,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: noteKeys.stats() })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof api.updateNote>[1] }) =>
      api.updateNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: noteKeys.stats() })
    },
  })
}

export function useTogglePin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.toggleNotePin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useToggleComplete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.toggleNoteComplete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.invalidateQueries({ queryKey: noteKeys.stats() })
    },
  })
}

// ========== الأدلة المدرسية ==========

export function useGuides() {
  return useQuery({
    queryKey: guideKeys.list(),
    queryFn: api.fetchGuides,
  })
}

export function useGuideByType(type: GuideType) {
  return useQuery({
    queryKey: guideKeys.detail(type),
    queryFn: () => api.fetchGuideByType(type),
    enabled: !!type,
  })
}

export function useGuideSectionTree(guideId: number | undefined) {
  return useQuery({
    queryKey: guideKeys.tree(guideId!),
    queryFn: () => api.fetchGuideSectionTree(guideId!),
    enabled: !!guideId,
  })
}

export function useGuideSection(sectionId: number | null) {
  return useQuery({
    queryKey: guideKeys.section(sectionId!),
    queryFn: () => api.fetchGuideSection(sectionId!),
    enabled: !!sectionId,
  })
}

export function useSearchGuide(guideId: number | undefined, query: string) {
  return useQuery({
    queryKey: guideKeys.search(guideId!, query),
    queryFn: () => api.searchGuide(guideId!, query),
    enabled: !!guideId && query.length >= 2,
  })
}

export function useAskGuide() {
  return useMutation({
    mutationFn: ({ guideId, payload }: { guideId: number; payload: AskMeRequest }) =>
      api.askGuide(guideId, payload),
  })
}

// ========== المفضلة ==========

export function useGuideBookmarks(guideId: number | undefined) {
  return useQuery({
    queryKey: guideKeys.bookmarks(guideId!),
    queryFn: () => api.fetchGuideBookmarks(guideId!),
    enabled: !!guideId,
  })
}

export function useToggleBookmark() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.toggleBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guideKeys.all })
    },
  })
}

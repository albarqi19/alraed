import { apiClient } from '@/services/api/client'
import type {
  PersonalNote,
  NoteFilters,
  NoteStatistics,
  CreateNotePayload,
  UpdateNotePayload,
  SchoolGuide,
  GuideSection,
  GuideBookmark,
  GuideType,
  AskMeRequest,
  AskMeResponse,
} from './types'

// ========== المفكرة الشخصية ==========

export async function fetchNotes(filters?: NoteFilters): Promise<PersonalNote[]> {
  const params: Record<string, string> = {}
  if (filters?.category && filters.category !== 'all') params.category = filters.category
  if (filters?.search) params.search = filters.search
  const { data } = await apiClient.get('/admin/personal-notes', { params })
  return data
}

export async function fetchNoteStatistics(): Promise<NoteStatistics> {
  const { data } = await apiClient.get('/admin/personal-notes/statistics')
  return data
}

export async function createNote(payload: CreateNotePayload): Promise<PersonalNote> {
  const { data } = await apiClient.post('/admin/personal-notes', payload)
  return data
}

export async function updateNote(id: number, payload: UpdateNotePayload): Promise<PersonalNote> {
  const { data } = await apiClient.put(`/admin/personal-notes/${id}`, payload)
  return data
}

export async function deleteNote(id: number): Promise<void> {
  await apiClient.delete(`/admin/personal-notes/${id}`)
}

export async function toggleNotePin(id: number): Promise<PersonalNote> {
  const { data } = await apiClient.patch(`/admin/personal-notes/${id}/pin`)
  return data
}

export async function toggleNoteComplete(id: number): Promise<PersonalNote> {
  const { data } = await apiClient.patch(`/admin/personal-notes/${id}/complete`)
  return data
}

// ========== الأدلة المدرسية ==========

export async function fetchGuides(): Promise<SchoolGuide[]> {
  const { data } = await apiClient.get('/admin/guides')
  return data
}

export async function fetchGuideByType(type: GuideType): Promise<SchoolGuide> {
  const { data } = await apiClient.get(`/admin/guides/${type}`)
  return data
}

export async function fetchGuideSectionTree(guideId: number): Promise<GuideSection[]> {
  const { data } = await apiClient.get(`/admin/guides/${guideId}/sections/tree`)
  return data
}

export async function fetchGuideSection(sectionId: number): Promise<GuideSection> {
  const { data } = await apiClient.get(`/admin/guides/sections/${sectionId}`)
  return data
}

export async function searchGuide(guideId: number, query: string): Promise<GuideSection[]> {
  const { data } = await apiClient.get(`/admin/guides/${guideId}/search`, { params: { q: query } })
  return data
}

export async function askGuide(guideId: number, payload: AskMeRequest): Promise<AskMeResponse> {
  const { data } = await apiClient.post(`/admin/guides/${guideId}/ask`, payload)
  return data
}

// ========== المفضلة ==========

export async function fetchGuideBookmarks(guideId: number): Promise<GuideBookmark[]> {
  const { data } = await apiClient.get(`/admin/guides/${guideId}/bookmarks`)
  return data
}

export async function toggleBookmark(sectionId: number): Promise<{ bookmarked: boolean; bookmark?: GuideBookmark }> {
  const { data } = await apiClient.post(`/admin/guides/sections/${sectionId}/bookmark`)
  return data
}

export async function updateBookmarkNote(bookmarkId: number, note: string): Promise<GuideBookmark> {
  const { data } = await apiClient.put(`/admin/guides/bookmarks/${bookmarkId}`, { note })
  return data
}

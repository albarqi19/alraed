import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { isAxiosError } from 'axios'
import type { BehaviorReporter, BehaviorStudent, BehaviorViolation } from '../types'
import {
  createBehaviorViolations,
  fetchBehaviorReporters,
  fetchBehaviorStudents,
  fetchBehaviorViolation,
  fetchBehaviorViolations,
  deleteBehaviorViolation,
  toggleBehaviorProcedure,
  toggleBehaviorProcedureTask,
  updateBehaviorProcedureNotes,
  type CreateBehaviorViolationPayload,
  type FetchBehaviorViolationsParams,
} from '../api'

interface BehaviorState {
  students: BehaviorStudent[]
  violations: BehaviorViolation[]
  reporters: BehaviorReporter[]
  isLoadingStudents: boolean
  isLoadingViolations: boolean
  isLoadingReporters: boolean
  studentsLoaded: boolean
  violationsLoaded: boolean
  reportersLoaded: boolean
  isCreating: boolean
  procedureMutations: Record<string, boolean>
  lastError: string | null
  clearError: () => void
  fetchStudents: (search?: string) => Promise<BehaviorStudent[]>
  fetchViolations: (params?: FetchBehaviorViolationsParams) => Promise<BehaviorViolation[]>
  fetchViolationById: (id: string) => Promise<BehaviorViolation | null>
  fetchReporters: () => Promise<BehaviorReporter[]>
  createViolations: (payload: CreateBehaviorViolationPayload) => Promise<BehaviorViolation[]>
  deleteViolation: (id: string) => Promise<void>
  toggleProcedure: (violationId: string, step: number) => Promise<BehaviorViolation | null>
  toggleProcedureTask: (violationId: string, step: number, taskId: number) => Promise<BehaviorViolation | null>
  updateProcedureNotes: (violationId: string, step: number, notes: string) => void
}

const notesUpdateTimers = new Map<string, number>()

const sortViolations = (violations: BehaviorViolation[]): BehaviorViolation[] =>
  [...violations].sort((first, second) => {
    const firstDateTime = `${second.date ?? ''}${second.time ?? ''}`
    const secondDateTime = `${first.date ?? ''}${first.time ?? ''}`
    return firstDateTime.localeCompare(secondDateTime)
  })

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    return (
      (typeof error.response?.data?.message === 'string' && error.response?.data?.message) ||
      fallback
    )
  }

  return fallback
}

export const useBehaviorStore = create<BehaviorState>()(
  devtools((set, get) => ({
    students: [],
    violations: [],
    reporters: [],
    isLoadingStudents: false,
    isLoadingViolations: false,
    isLoadingReporters: false,
    studentsLoaded: false,
    violationsLoaded: false,
    reportersLoaded: false,
    isCreating: false,
    procedureMutations: {},
    lastError: null,

    clearError: () => set({ lastError: null }),

    fetchStudents: async (search) => {
      set({ isLoadingStudents: true, lastError: null })

      try {
        const data = await fetchBehaviorStudents(search)
        set({
          students: data,
          isLoadingStudents: false,
          studentsLoaded: true,
        })
        return data
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحميل قائمة الطلاب')
        set({ isLoadingStudents: false, lastError: message })
        throw error
      }
    },

    fetchReporters: async () => {
      if (get().reportersLoaded && get().reporters.length > 0) {
        return get().reporters
      }

      set({ isLoadingReporters: true, lastError: null })

      try {
        const data = await fetchBehaviorReporters()
        set({
          reporters: data,
          isLoadingReporters: false,
          reportersLoaded: true,
        })
        return data
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحميل قائمة المعلمين المبلغين')
        set({ isLoadingReporters: false, lastError: message })
        throw error
      }
    },

    fetchViolations: async (params) => {
      set({ isLoadingViolations: true, lastError: null })

      try {
        const data = await fetchBehaviorViolations(params)
        set({
          violations: sortViolations(data),
          isLoadingViolations: false,
          violationsLoaded: true,
        })
        return data
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحميل سجل المخالفات')
        set({ isLoadingViolations: false, lastError: message })
        throw error
      }
    },

    fetchViolationById: async (id) => {
      try {
        const violation = await fetchBehaviorViolation(id)
        set((state) => {
          const exists = state.violations.some((item) => item.id === violation.id)
          const merged = exists
            ? state.violations.map((item) => (item.id === violation.id ? violation : item))
            : [violation, ...state.violations]

          return {
            violations: sortViolations(merged),
            violationsLoaded: true,
          }
        })
        return violation
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحميل تفاصيل المخالفة')
        set({ lastError: message })
        return null
      }
    },

    createViolations: async (payload) => {
      set({ isCreating: true, lastError: null })

      try {
        const created = await createBehaviorViolations(payload)

        set((state) => {
          const filtered = state.violations.filter(
            (violation) => !created.some((item) => item.id === violation.id),
          )

          return {
            violations: sortViolations([...created, ...filtered]),
            violationsLoaded: true,
          }
        })

        try {
          await get().fetchStudents()
        } catch (error) {
          const message = resolveErrorMessage(error, 'تم حفظ المخالفة لكن تعذر تحديث بيانات الطلاب')
          set({ lastError: message })
        }

        return created
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر رصد المخالفة الجديدة')
        set({ lastError: message })
        throw error
      } finally {
        set({ isCreating: false })
      }
    },

    deleteViolation: async (violationId) => {
      set({ lastError: null })

      try {
        await deleteBehaviorViolation(violationId)

        set((state) => ({
          violations: state.violations.filter((violation) => violation.id !== violationId),
        }))

        try {
          await get().fetchStudents()
        } catch (error) {
          const message = resolveErrorMessage(error, 'تم الحذف لكن تعذر تحديث بيانات الطلاب')
          set({ lastError: message })
        }
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر حذف المخالفة')
        set({ lastError: message })
        throw error
      }
    },

    toggleProcedure: async (violationId, step) => {
      const key = `${violationId}-${step}`
      set((state) => ({
        procedureMutations: { ...state.procedureMutations, [key]: true },
        lastError: null,
      }))

      try {
        const updated = await toggleBehaviorProcedure(violationId, step)
        set((state) => {
          const nextMutations = { ...state.procedureMutations }
          delete nextMutations[key]

          return {
            procedureMutations: nextMutations,
            violations: state.violations.map((violation) =>
              violation.id === updated.id ? updated : violation,
            ),
          }
        })

        return updated
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحديث حالة الإجراء')
        set((state) => {
          const nextMutations = { ...state.procedureMutations }
          delete nextMutations[key]
          return { procedureMutations: nextMutations, lastError: message }
        })
        throw error
      }
    },

    toggleProcedureTask: async (violationId, step, taskId) => {
      const key = `${violationId}-${step}-${taskId}`
      set((state) => ({
        procedureMutations: { ...state.procedureMutations, [key]: true },
        lastError: null,
      }))

      try {
        const updated = await toggleBehaviorProcedureTask(violationId, step, taskId)
        set((state) => {
          const nextMutations = { ...state.procedureMutations }
          delete nextMutations[key]

          return {
            procedureMutations: nextMutations,
            violations: state.violations.map((violation) =>
              violation.id === updated.id ? updated : violation,
            ),
          }
        })

        return updated
      } catch (error) {
        const message = resolveErrorMessage(error, 'تعذر تحديث حالة الخطوة')
        set((state) => {
          const nextMutations = { ...state.procedureMutations }
          delete nextMutations[key]
          return { procedureMutations: nextMutations, lastError: message }
        })
        throw error
      }
    },

    updateProcedureNotes: (violationId, step, notes) => {
      set((state) => ({
        violations: state.violations.map((violation) =>
          violation.id === violationId
            ? {
                ...violation,
                procedures: violation.procedures.map((procedure) =>
                  procedure.step === step ? { ...procedure, notes } : procedure,
                ),
              }
            : violation,
        ),
      }))

      const key = `${violationId}-${step}`

      if (notesUpdateTimers.has(key)) {
        clearTimeout(notesUpdateTimers.get(key)!)
      }

      const timerId = window.setTimeout(async () => {
        try {
          const updated = await updateBehaviorProcedureNotes(violationId, step, notes)
          set((state) => ({
            violations: state.violations.map((violation) =>
              violation.id === updated.id ? updated : violation,
            ),
          }))
        } catch (error) {
          const message = resolveErrorMessage(error, 'تعذر حفظ ملاحظات الإجراء')
          set({ lastError: message })
        } finally {
          notesUpdateTimers.delete(key)
        }
      }, 600)
      
      notesUpdateTimers.set(key, timerId)
    },
  })),
)

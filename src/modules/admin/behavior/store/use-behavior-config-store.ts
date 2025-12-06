import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  BehaviorActionCategory,
  BehaviorDegree,
  BehaviorDegreeConfig,
  BehaviorProcedureConfig,
  BehaviorProcedureDefinition,
  BehaviorRole,
  BehaviorStatus,
  BehaviorViolationTypeConfig,
} from '../types'
import {
  fetchActionCategories,
  fetchNotificationTemplates,
  fetchProcedures,
  fetchProceduresForViolation,
  fetchRoles,
  fetchSystemTriggers,
  fetchViolationTypes,
} from '../api'

interface BehaviorConfigState {
  // البيانات
  violationTypesByDegree: Record<BehaviorDegree, BehaviorViolationTypeConfig[]>
  proceduresByDegree: Record<BehaviorDegree, BehaviorProcedureDefinition[]>
  degreeConfigs: BehaviorDegreeConfig[]
  procedureConfigs: BehaviorProcedureConfig[]
  roles: Record<BehaviorRole, string>
  actionCategories: Record<BehaviorActionCategory, string>
  systemTriggers: Record<string, string>
  notificationTemplates: Record<string, string>
  statuses: BehaviorStatus[]

  // حالة التحميل
  isLoading: boolean
  isLoaded: boolean
  lastError: string | null

  // الدوال
  loadConfig: () => Promise<void>
  loadViolationTypes: (degree?: BehaviorDegree) => Promise<void>
  loadProcedures: (degree?: BehaviorDegree) => Promise<void>
  getProceduresForViolation: (degree: BehaviorDegree, repetition: number) => Promise<BehaviorProcedureDefinition | null>
  getViolationsForDegree: (degree: BehaviorDegree) => string[]
  getProceduresForDegree: (degree: BehaviorDegree) => BehaviorProcedureDefinition[]
  getRoleLabel: (role: BehaviorRole) => string
  getActionCategoryLabel: (category: BehaviorActionCategory) => string
  getSystemTriggerLabel: (trigger: string) => string
}

export const useBehaviorConfigStore = create<BehaviorConfigState>()(
  devtools(
    (set, get) => ({
      // البيانات الأولية
      violationTypesByDegree: {
        1: [],
        2: [],
        3: [],
        4: [],
      },
      proceduresByDegree: {
        1: [],
        2: [],
        3: [],
        4: [],
      },
      degreeConfigs: [],
      procedureConfigs: [],
      roles: {} as Record<BehaviorRole, string>,
      actionCategories: {} as Record<BehaviorActionCategory, string>,
      systemTriggers: {},
      notificationTemplates: {},
      statuses: ['قيد المعالجة', 'جاري التنفيذ', 'مكتملة', 'ملغاة'],

      isLoading: false,
      isLoaded: false,
      lastError: null,

      /**
       * تحميل جميع الإعدادات
       */
      loadConfig: async () => {
        if (get().isLoaded) return

        set({ isLoading: true, lastError: null })

        try {
          const [roles, actionCategories, systemTriggers, notificationTemplates] = await Promise.all([
            fetchRoles(),
            fetchActionCategories(),
            fetchSystemTriggers(),
            fetchNotificationTemplates(),
          ])

          set({
            roles: roles as Record<BehaviorRole, string>,
            actionCategories: actionCategories as Record<BehaviorActionCategory, string>,
            systemTriggers,
            notificationTemplates,
            isLoading: false,
            isLoaded: true,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'فشل في تحميل الإعدادات'
          set({ lastError: message, isLoading: false })
        }
      },

      /**
       * تحميل أنواع المخالفات
       */
      loadViolationTypes: async (degree?: BehaviorDegree) => {
        set({ isLoading: true, lastError: null })

        try {
          const data = await fetchViolationTypes('elementary', degree)

          const violationTypesByDegree = { ...get().violationTypesByDegree }
          for (const config of data) {
            violationTypesByDegree[config.degree] = config.violations
          }

          set({
            degreeConfigs: data,
            violationTypesByDegree,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'فشل في تحميل أنواع المخالفات'
          set({ lastError: message, isLoading: false })
        }
      },

      /**
       * تحميل الإجراءات
       */
      loadProcedures: async (degree?: BehaviorDegree) => {
        set({ isLoading: true, lastError: null })

        try {
          const data = await fetchProcedures('elementary', degree)

          const proceduresByDegree = { ...get().proceduresByDegree }
          for (const config of data) {
            proceduresByDegree[config.degree] = config.procedures
          }

          set({
            procedureConfigs: data,
            proceduresByDegree,
            isLoading: false,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'فشل في تحميل الإجراءات'
          set({ lastError: message, isLoading: false })
        }
      },

      /**
       * الحصول على إجراءات لمخالفة معينة
       */
      getProceduresForViolation: async (degree: BehaviorDegree, repetition: number) => {
        try {
          const procedure = await fetchProceduresForViolation(degree, repetition, 'elementary')
          return procedure
        } catch (error) {
          console.error('فشل في جلب الإجراءات:', error)
          return null
        }
      },

      /**
       * الحصول على أنواع المخالفات لدرجة معينة (كأسماء فقط)
       */
      getViolationsForDegree: (degree: BehaviorDegree) => {
        const violations = get().violationTypesByDegree[degree]
        return violations.map((v) => v.name)
      },

      /**
       * الحصول على الإجراءات لدرجة معينة
       */
      getProceduresForDegree: (degree: BehaviorDegree) => {
        return get().proceduresByDegree[degree]
      },

      /**
       * الحصول على اسم الدور
       */
      getRoleLabel: (role: BehaviorRole) => {
        return get().roles[role] ?? role
      },

      /**
       * الحصول على اسم فئة الإجراء
       */
      getActionCategoryLabel: (category: BehaviorActionCategory) => {
        return get().actionCategories[category] ?? category
      },

      /**
       * الحصول على اسم System Trigger
       */
      getSystemTriggerLabel: (trigger: string) => {
        return get().systemTriggers[trigger] ?? trigger
      },
    }),
    { name: 'behavior-config-store' },
  ),
)

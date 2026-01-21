/**
 * صفحة إجراءات تأخير المعلمين
 * عرض وإدارة التنبيهات وقرارات الحسم للمعلمين المتأخرين
 */

import { useState, useMemo, useCallback } from 'react'
import { RefreshCw, Search, Filter, ChevronDown, Eye, Settings } from 'lucide-react'
import {
  useDelayActionsStatisticsQuery,
  useTeacherDelayListQuery,
  useDelayActionsHistoryQuery,
  useRecordWarningMutation,
  useRecordDeductionMutation,
  useMarkActionSignedMutation,
} from '../hooks'
import { fetchAndOpenPrintPage } from '../api'
import { DelayActionsStats } from '../components/delay-actions-stats'
import { PendingActionsTable } from '../components/pending-actions-table'
import { ActionsHistoryTable } from '../components/actions-history-table'
import { TeacherDelayDetailsSheet } from '../components/teacher-delay-details-sheet'
import { ActionConfirmationDialog } from '../components/action-confirmation-dialog'
import { DelayActionsSettingsDialog } from '../components/delay-actions-settings-dialog'
import type { DelayActionType, DelayActionsFilters, DelayActionsHistoryFilters } from '../types'

type ActiveTab = 'pending' | 'history'

export function AdminDelayActionsPage() {
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  // الحالة المحلية
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending')
  const [filters, setFilters] = useState<DelayActionsFilters>({
    fiscal_year: currentYear,
    pending_action: 'all',
    search: '',
  })
  const [historyFilters, setHistoryFilters] = useState<DelayActionsHistoryFilters>({
    fiscal_year: currentYear,
    action_type: 'all',
    page: 1,
    per_page: 20,
  })

  // هل نحن في وضع العرض فقط (السنة السابقة)
  const isReadOnly = selectedYear !== currentYear
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: DelayActionType
    userId: number
    teacherName: string
  } | null>(null)

  // جلب البيانات
  const statsQuery = useDelayActionsStatisticsQuery(filters.fiscal_year)
  const teacherListQuery = useTeacherDelayListQuery(filters)
  const historyQuery = useDelayActionsHistoryQuery(historyFilters, {
    enabled: activeTab === 'history',
  })

  // Mutations
  const recordWarningMutation = useRecordWarningMutation()
  const recordDeductionMutation = useRecordDeductionMutation()
  const markSignedMutation = useMarkActionSignedMutation()

  // معالجات الأحداث
  const handleFilterChange = useCallback(
    <K extends keyof DelayActionsFilters>(key: K, value: DelayActionsFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleHistoryFilterChange = useCallback(
    <K extends keyof DelayActionsHistoryFilters>(key: K, value: DelayActionsHistoryFilters[K]) => {
      setHistoryFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value as number : 1 }))
    },
    [],
  )

  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year)
    setFilters((prev) => ({ ...prev, fiscal_year: year }))
    setHistoryFilters((prev) => ({ ...prev, fiscal_year: year, page: 1 }))
  }, [])

  const handleTeacherClick = useCallback((userId: number) => {
    setSelectedTeacherId(userId)
  }, [])

  const handleRecordAction = useCallback(
    (action: { type: DelayActionType; userId: number; teacherName: string }) => {
      setPendingAction(action)
    },
    [],
  )

  const handleConfirmAction = useCallback(
    (payload: { userId: number; notes?: string; sendNotification: boolean }) => {
      if (!pendingAction) return

      const mutationPayload = {
        user_id: payload.userId,
        notes: payload.notes,
        send_notification: payload.sendNotification,
      }

      const mutation = pendingAction.type === 'warning' ? recordWarningMutation : recordDeductionMutation

      mutation.mutate(mutationPayload, {
        onSuccess: (data) => {
          setPendingAction(null)
          // فتح الطباعة في نافذة جديدة
          void fetchAndOpenPrintPage(data.id)
        },
      })
    },
    [pendingAction, recordWarningMutation, recordDeductionMutation],
  )

  const handleCancelAction = useCallback(() => {
    if (recordWarningMutation.isPending || recordDeductionMutation.isPending) return
    setPendingAction(null)
  }, [recordWarningMutation.isPending, recordDeductionMutation.isPending])

  const handlePrintAction = useCallback((actionId: number) => {
    void fetchAndOpenPrintPage(actionId)
  }, [])

  const handleMarkSigned = useCallback(
    (actionId: number) => {
      markSignedMutation.mutate({
        actionId,
        payload: { signed_by_name: 'الموقع' }, // سيتم تحديثه من الـ dialog
      })
    },
    [markSignedMutation],
  )

  const handleRefresh = useCallback(() => {
    void statsQuery.refetch()
    void teacherListQuery.refetch()
    if (activeTab === 'history') {
      void historyQuery.refetch()
    }
  }, [statsQuery, teacherListQuery, historyQuery, activeTab])

  // البيانات المعالجة
  const teacherList = useMemo(() => teacherListQuery.data?.data ?? [], [teacherListQuery.data])
  const historyList = useMemo(() => historyQuery.data?.data ?? [], [historyQuery.data])
  const historyMeta = useMemo(() => historyQuery.data?.meta, [historyQuery.data])

  const isSubmitting = recordWarningMutation.isPending || recordDeductionMutation.isPending

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">إجراءات التأخير</h1>
            <p className="text-sm text-muted">
              إدارة التنبيهات وقرارات الحسم للمعلمين بناءً على تراكم ساعات التأخير خلال العام المالي.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Settings className="h-4 w-4" />
              الإعدادات
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
              disabled={statsQuery.isFetching || teacherListQuery.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${statsQuery.isFetching || teacherListQuery.isFetching ? 'animate-spin' : ''}`}
              />
              تحديث
            </button>
            {/* اختيار العام المالي */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className={`appearance-none rounded-full py-2 pr-4 pl-8 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                  isReadOnly
                    ? 'border-2 border-amber-300 bg-amber-50 text-amber-700'
                    : 'border border-indigo-200 bg-indigo-50 text-indigo-700'
                }`}
              >
                <option value={currentYear}>{currentYear} (الحالي)</option>
                <option value={previousYear}>{previousYear}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>
      </header>

      {/* بانر وضع العرض فقط */}
      {isReadOnly && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Eye className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              وضع العرض فقط - بيانات العام المالي {selectedYear}
            </p>
            <p className="text-xs text-amber-600">
              لا يمكن تسجيل إجراءات جديدة للسنة السابقة. للتسجيل، اختر العام الحالي ({currentYear}).
            </p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <DelayActionsStats data={statsQuery.data} isLoading={statsQuery.isLoading} />

      {/* Main Content */}
      <div className="glass-card space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`relative px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'pending'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ينتظرون إجراء
            {activeTab === 'pending' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`relative px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'history'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            سجل الإجراءات
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Filters */}
        {activeTab === 'pending' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={filters.search ?? ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ابحث باسم المعلم..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600">نوع الإجراء المستحق</label>
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={filters.pending_action ?? 'all'}
                  onChange={(e) =>
                    handleFilterChange('pending_action', e.target.value as 'warning' | 'deduction' | 'all')
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">الكل</option>
                  <option value="warning">تنبيه فقط</option>
                  <option value="deduction">حسم فقط</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 text-right">
              <label className="text-xs font-semibold text-slate-600">نوع الإجراء</label>
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={historyFilters.action_type ?? 'all'}
                  onChange={(e) =>
                    handleHistoryFilterChange('action_type', e.target.value as DelayActionType | 'all')
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">جميع الإجراءات</option>
                  <option value="warning">التنبيهات</option>
                  <option value="deduction">قرارات الحسم</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tables */}
        {activeTab === 'pending' ? (
          <PendingActionsTable
            data={teacherList}
            isLoading={teacherListQuery.isLoading}
            onTeacherClick={handleTeacherClick}
            onRecordAction={handleRecordAction}
            readOnly={isReadOnly}
          />
        ) : (
          <ActionsHistoryTable
            data={historyList}
            meta={historyMeta}
            isLoading={historyQuery.isLoading}
            onPageChange={(page) => handleHistoryFilterChange('page', page)}
            onMarkSigned={handleMarkSigned}
          />
        )}
      </div>

      {/* Teacher Details Sheet */}
      <TeacherDelayDetailsSheet
        userId={selectedTeacherId}
        fiscalYear={selectedYear}
        open={selectedTeacherId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeacherId(null)
        }}
        onRecordAction={handleRecordAction}
        onPrint={handlePrintAction}
        readOnly={isReadOnly}
      />

      {/* Action Confirmation Dialog */}
      <ActionConfirmationDialog
        action={pendingAction}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

      {/* Settings Dialog */}
      <DelayActionsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </section>
  )
}

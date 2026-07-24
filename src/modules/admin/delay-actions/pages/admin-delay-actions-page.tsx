/**
 * صفحة إجراءات تأخير المعلمين
 * عرض وإدارة التنبيهات وقرارات الحسم للمعلمين المتأخرين
 */

import { useState, useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  ClipboardCheck,
  Eye,
  FileQuestion,
  FileWarning,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import {
  useDelayActionsStatisticsQuery,
  useTeacherDelayListQuery,
  useDelayActionsHistoryQuery,
  useRecordWarningMutation,
  useRecordDeductionMutation,
  useMarkActionSignedMutation,
} from '../hooks'
import { fetchAndOpenPrintPage } from '../api'
import { PendingActionsTable } from '../components/pending-actions-table'
import { ActionsHistoryTable } from '../components/actions-history-table'
import { TeacherDelayDetailsSheet } from '../components/teacher-delay-details-sheet'
import { ActionConfirmationDialog } from '../components/action-confirmation-dialog'
import { DelayActionsSettingsDialog } from '../components/delay-actions-settings-dialog'
import { DelayExcusesPanel } from '../components/delay-excuses-tab'
import { DelayExcusesSettingsDialog } from '../components/delay-excuses-settings-dialog'
import type { DelayActionType, DelayActionsFilters, DelayActionsHistoryFilters } from '../types'
import {
  WsAlert,
  WsBlock,
  WsBtn,
  WsFact,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsPage,
  WsSelect,
  WsSideCol,
  WsToolbar,
} from '@/shared/workspace'

type ActiveTab = 'pending' | 'history'

const TABS: Array<{ value: ActiveTab; label: string }> = [
  { value: 'pending', label: 'ينتظرون إجراء' },
  { value: 'history', label: 'سجل الإجراءات' },
]

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
  const [excusesSettingsOpen, setExcusesSettingsOpen] = useState(false)
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
  const stats = statsQuery.data

  const activeTabLabel = TABS.find((tab) => tab.value === activeTab)?.label ?? ''

  return (
    <WsPage>
      <WsHeader
        title="إجراءات التأخير"
        badge={`العام المالي ${selectedYear}`}
        actions={
          <>
            <WsSelect
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              style={isReadOnly ? { borderColor: 'var(--ws-amber)', color: 'var(--ws-amber)', fontWeight: 700 } : undefined}
              title="العام المالي"
            >
              <option value={currentYear}>{currentYear} (الحالي)</option>
              <option value={previousYear}>{previousYear}</option>
            </WsSelect>
            <WsBtn icon={Settings} onClick={() => setSettingsOpen(true)}>
              الإعدادات
            </WsBtn>
            <WsBtn
              icon={RefreshCw}
              onClick={handleRefresh}
              disabled={statsQuery.isFetching || teacherListQuery.isFetching}
            >
              تحديث
            </WsBtn>
          </>
        }
        facts={
          stats ? (
            <>
              <WsFact icon={Users} label="معلمون لديهم تأخير:">
                {stats.teachers_with_delay.toLocaleString('ar-SA-u-nu-latn')}
              </WsFact>
              <WsFact icon={AlertTriangle} label="ينتظرون تنبيه:">
                {stats.pending_warnings.toLocaleString('ar-SA-u-nu-latn')}
              </WsFact>
              <WsFact icon={FileWarning} label="ينتظرون حسم:">
                {stats.pending_deductions.toLocaleString('ar-SA-u-nu-latn')}
              </WsFact>
              <WsFact icon={ClipboardCheck} label="إجراءات هذا العام:">
                {(stats.total_warnings_issued + stats.total_deductions_issued).toLocaleString('ar-SA-u-nu-latn')}
              </WsFact>
            </>
          ) : undefined
        }
      />

      {/* بانر وضع العرض فقط */}
      {isReadOnly && (
        <WsAlert tone="warn" icon={Eye}>
          <b>وضع العرض فقط — بيانات العام المالي {selectedYear}.</b>
          لا يمكن تسجيل إجراءات جديدة للسنة السابقة؛ للتسجيل اختر العام الحالي ({currentYear}).
        </WsAlert>
      )}

      <WsToolbar>
        {/* التبويبات كشرائح مدمجة */}
        <div className="ws-seg" style={{ alignSelf: 'flex-end' }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`ws-seg__btn ${activeTab === tab.value ? 'is-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'pending' && (
          <>
            <WsField label="البحث باسم المعلم" htmlFor="ws-delay-search" grow>
              <WsInput
                id="ws-delay-search"
                type="search"
                value={filters.search ?? ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="ابحث باسم المعلم..."
              />
            </WsField>
            <WsField label="نوع الإجراء المستحق" htmlFor="ws-delay-pending-type">
              <WsSelect
                id="ws-delay-pending-type"
                value={filters.pending_action ?? 'all'}
                onChange={(e) =>
                  handleFilterChange('pending_action', e.target.value as 'warning' | 'deduction' | 'all')
                }
              >
                <option value="all">الكل</option>
                <option value="warning">تنبيه فقط</option>
                <option value="deduction">حسم فقط</option>
              </WsSelect>
            </WsField>
          </>
        )}

        {activeTab === 'history' && (
          <WsField label="نوع الإجراء" htmlFor="ws-delay-history-type">
            <WsSelect
              id="ws-delay-history-type"
              value={historyFilters.action_type ?? 'all'}
              onChange={(e) =>
                handleHistoryFilterChange('action_type', e.target.value as DelayActionType | 'all')
              }
            >
              <option value="all">جميع الإجراءات</option>
              <option value="warning">التنبيهات</option>
              <option value="deduction">قرارات الحسم</option>
            </WsSelect>
          </WsField>
        )}

      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock title={activeTabLabel} icon={FileWarning} fill>
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
          </WsBlock>
        </WsMain>

        {/* العمود الأيسر: أعذار التأخير — مراجعة فورية من مكانها */}
        <WsSideCol
          title="أعذار التأخير"
          icon={FileQuestion}
          width={330}
          storageKey="ws:delay-actions:excuses"
          tools={
            <WsBtn size="sm" icon={Settings} onClick={() => setExcusesSettingsOpen(true)}>
              الإعدادات
            </WsBtn>
          }
        >
          <DelayExcusesPanel key={selectedYear} fiscalYear={selectedYear} readOnly={isReadOnly} />
        </WsSideCol>
      </WsLayout>

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

      {/* Excuses Settings Dialog */}
      <DelayExcusesSettingsDialog
        open={excusesSettingsOpen}
        onOpenChange={setExcusesSettingsOpen}
      />
    </WsPage>
  )
}

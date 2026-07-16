/**
 * بانل أعذار التأخير — عمود جانبي حي
 * عرض قائمة الأعذار المقدمة من المعلمين مع إمكانية القبول أو الرفض من مكانها
 */

import { useState, useCallback, useMemo } from 'react'
import { Check, X, Eye, Clock3, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useDelayExcusesQuery, useApproveExcuseMutation, useRejectExcuseMutation } from '../hooks'
import type { DelayExcusesFilters, ExcuseStatus, DelayExcuse } from '../types'
import { ExcuseReviewDialog } from './excuse-review-dialog'
import { WsBlock, WsBtn, WsChip, WsEmpty, WsIconBtn, WsInput, type WsChipTone } from '@/shared/workspace'

interface DelayExcusesPanelProps {
  fiscalYear: number
  readOnly?: boolean
}

const STATUS_TONES: Record<ExcuseStatus, WsChipTone | undefined> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
}

const STATUS_FILTERS: Array<{ value: ExcuseStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'معلقة' },
  { value: 'all', label: 'الكل' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]

function StatusChip({ status, label }: { status: ExcuseStatus; label: string }) {
  const icon = status === 'pending' ? Clock3 : status === 'approved' ? Check : X
  return (
    <WsChip tone={STATUS_TONES[status]} icon={icon}>
      {label}
    </WsChip>
  )
}

export function DelayExcusesPanel({ fiscalYear, readOnly = false }: DelayExcusesPanelProps) {
  const [filters, setFilters] = useState<DelayExcusesFilters>({
    fiscal_year: fiscalYear,
    status: 'pending',
    search: '',
    page: 1,
    per_page: 20,
  })
  const [selectedExcuse, setSelectedExcuse] = useState<DelayExcuse | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)

  // جلب البيانات
  const excusesQuery = useDelayExcusesQuery(filters)
  const approveMutation = useApproveExcuseMutation()
  const rejectMutation = useRejectExcuseMutation()

  // معالجات الأحداث
  const handleFilterChange = useCallback(
    <K extends keyof DelayExcusesFilters>(key: K, value: DelayExcusesFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value as number : 1 }))
    },
    [],
  )

  const handleReview = useCallback((excuse: DelayExcuse, action: 'approve' | 'reject') => {
    setSelectedExcuse(excuse)
    setReviewAction(action)
  }, [])

  const handleConfirmReview = useCallback(
    (notes?: string) => {
      if (!selectedExcuse || !reviewAction) return

      const mutation = reviewAction === 'approve' ? approveMutation : rejectMutation
      mutation.mutate(
        { id: selectedExcuse.id, payload: notes ? { notes } : {} },
        {
          onSuccess: () => {
            setSelectedExcuse(null)
            setReviewAction(null)
          },
        },
      )
    },
    [selectedExcuse, reviewAction, approveMutation, rejectMutation],
  )

  const handleCancelReview = useCallback(() => {
    if (approveMutation.isPending || rejectMutation.isPending) return
    setSelectedExcuse(null)
    setReviewAction(null)
  }, [approveMutation.isPending, rejectMutation.isPending])

  // البيانات
  const excuses = useMemo(() => excusesQuery.data?.data ?? [], [excusesQuery.data])
  const meta = useMemo(() => excusesQuery.data?.meta, [excusesQuery.data])

  return (
    <>
      {/* الفلاتر: شرائح الحالة + بحث */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid var(--ws-hairline)',
        }}
      >
        <div className="ws-seg" style={{ display: 'flex' }}>
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange('status', option.value)}
              className={`ws-seg__btn ${(filters.status ?? 'all') === option.value ? 'is-active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <WsInput
          type="search"
          value={filters.search ?? ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="ابحث باسم المعلم..."
        />
      </div>

      {/* القائمة */}
      <WsBlock
        title="الأعذار"
        count={(meta?.total ?? excuses.length).toLocaleString('ar-SA')}
        fill
        scroll
      >
        {excusesQuery.isLoading ? (
          <WsEmpty loading>جاري تحميل الأعذار...</WsEmpty>
        ) : excuses.length === 0 ? (
          <WsEmpty icon={Inbox}>لا توجد أعذار مقدمة بالمعايير الحالية.</WsEmpty>
        ) : (
          <div>
            {excuses.map((excuse) => (
              <div
                key={excuse.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>{excuse.teacher_name}</span>
                  <StatusChip status={excuse.status} label={excuse.status_label} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginTop: 3,
                    fontSize: 10.5,
                    color: 'var(--ws-text-2)',
                  }}
                >
                  <span>{excuse.delay_date_formatted}</span>
                  <span style={{ color: 'var(--ws-red)', fontWeight: 700 }}>{excuse.delay_minutes} دقيقة</span>
                  <span>قُدّم {new Date(excuse.submitted_at).toLocaleDateString('ar-SA')}</span>
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11.5,
                    lineHeight: 1.6,
                    color: 'var(--ws-text)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                  title={excuse.excuse_text}
                >
                  {excuse.excuse_text}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  {excuse.status === 'pending' && !readOnly && (
                    <>
                      <WsBtn size="sm" icon={Check} onClick={() => handleReview(excuse, 'approve')} style={{ flex: 1 }}>
                        قبول
                      </WsBtn>
                      <WsBtn
                        size="sm"
                        variant="danger"
                        icon={X}
                        onClick={() => handleReview(excuse, 'reject')}
                        style={{ flex: 1 }}
                      >
                        رفض
                      </WsBtn>
                    </>
                  )}
                  <WsIconBtn
                    icon={Eye}
                    label="عرض التفاصيل"
                    onClick={() => {
                      setSelectedExcuse(excuse)
                      setReviewAction(null)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </WsBlock>

      {/* ترقيم الصفحات */}
      {meta && meta.last_page > 1 && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 10px',
            borderTop: '1px solid var(--ws-hairline)',
          }}
        >
          <WsIconBtn
            icon={ChevronRight}
            label="السابق"
            onClick={() => handleFilterChange('page', meta.current_page - 1)}
            disabled={meta.current_page === 1}
          />
          <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
            {meta.current_page} / {meta.last_page}
          </span>
          <WsIconBtn
            icon={ChevronLeft}
            label="التالي"
            onClick={() => handleFilterChange('page', meta.current_page + 1)}
            disabled={meta.current_page === meta.last_page}
          />
        </div>
      )}

      {/* نافذة المراجعة */}
      <ExcuseReviewDialog
        excuse={selectedExcuse}
        action={reviewAction}
        isSubmitting={approveMutation.isPending || rejectMutation.isPending}
        onConfirm={handleConfirmReview}
        onCancel={handleCancelReview}
        readOnly={readOnly}
      />
    </>
  )
}

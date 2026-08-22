import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Inbox,
  MessageCircle,
  Plus,
  RefreshCcw,
  Send,
  Smartphone,
  Trash2,
} from 'lucide-react'
import {
  useCreateWhatsappTemplateMutation,
  useDeleteAllPendingWhatsappMessagesMutation,
  useDeleteWhatsappQueueItemMutation,
  useDeleteWhatsappTemplateMutation,
  useSendPendingWhatsappMessagesMutation,
  useSendSingleWhatsappMessageMutation,
  useUpdateWhatsappTemplateMutation,
  useWhatsappHistoryQuery,
  useWhatsappQueueQuery,
  useWhatsappStatisticsQuery,
  useWhatsappTemplatesQuery,
} from '../hooks'
import { useYearScope, YearScopeSelect, YearScopeEmptyNote } from '@/modules/admin/academic-years'
import { fetchWhatsappInstances } from '../api'
import type { WhatsappHistoryItem, WhatsappQueueItem, WhatsappTemplate, WhatsappTemplateVariable, WhatsappInstance } from '../types'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsField,
  WsHeader,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsSelect,
  WsSideCol,
  WsTable,
  WsTextarea,
} from '@/shared/workspace'
import type { WsChipTone } from '@/shared/workspace'

type TabKey = 'queue' | 'history' | 'templates'

type TemplateFormState = {
  name: string
  body: string
  category: string
  status: 'active' | 'inactive'
  variables: WhatsappTemplateVariable[]
}

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  body: '',
  category: '',
  status: 'active',
  variables: [],
}

const TABS: Array<{ key: TabKey; label: string; icon: typeof Inbox }> = [
  { key: 'history', label: 'سجل الرسائل', icon: ClipboardList },
  { key: 'queue', label: 'قائمة الانتظار', icon: Inbox },
  { key: 'templates', label: 'القوالب', icon: FileText },
]

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA-u-nu-latn')
  }
}

function formatStatisticValue(value: unknown) {
  if (value == null) return '0'
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return numericValue.toLocaleString('ar-SA-u-nu-latn')
}

const QUEUE_STATUS_META: Record<string, { tone: WsChipTone; label: string }> = {
  sent: { tone: 'green', label: 'تم الإرسال' },
  processing: { tone: 'sky', label: 'قيد المعالجة' },
  failed: { tone: 'red', label: 'فشل الإرسال' },
  pending: { tone: 'amber', label: 'بانتظار الإرسال' },
}

function QueueStatusBadge({ status }: { status: WhatsappQueueItem['status'] }) {
  const meta = QUEUE_STATUS_META[status] ?? QUEUE_STATUS_META.pending
  return <WsChip tone={meta.tone}>{meta.label}</WsChip>
}

function HistoryStatusBadge({ status }: { status: WhatsappHistoryItem['status'] }) {
  return status === 'sent' ? <WsChip tone="green">مرسلة</WsChip> : <WsChip tone="red">فشلت</WsChip>
}

function TemplateStatusBadge({ status }: { status: WhatsappTemplate['status'] }) {
  return status === 'active' ? <WsChip tone="green">مفعّل</WsChip> : <WsChip tone="amber">موقوف</WsChip>
}

const INSTANCE_STATUS_META: Record<string, { tone: WsChipTone | undefined; label: string; dot: string; pulse: boolean }> = {
  connected: { tone: 'green', label: 'متصل', dot: 'var(--ws-green)', pulse: true },
  connecting: { tone: 'amber', label: 'جاري الاتصال', dot: 'var(--ws-amber)', pulse: false },
  disconnected: { tone: 'red', label: 'غير متصل', dot: 'var(--ws-red)', pulse: false },
}

export function WhatsappHubPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('history')
  const { scope: yearScope, setScope: setYearScope } = useYearScope()
  const [templateSelection, setTemplateSelection] = useState<number | 'new' | null>(null)
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM)
  const [modalHistoryId, setModalHistoryId] = useState<number | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const statisticsQuery = useWhatsappStatisticsQuery()
  const { data: instances = [], isLoading: isLoadingInstances } = useQuery({
    queryKey: ['admin', 'whatsapp', 'instances'],
    queryFn: fetchWhatsappInstances,
    refetchInterval: 30000,
  })
  const queueQuery = useWhatsappQueueQuery()
  /* الطابور بلا قصّ عام — رسالةٌ عالقةٌ من سنةٍ مضت ما زالت تسدّه اليوم،
     فإخفاؤها يُري المشغّلَ صفراً بينما الطابور ممتلئ. السجلُّ وحده يُقصّ. */
  const historyQuery = useWhatsappHistoryQuery({ academic_year: yearScope })
  const templatesQuery = useWhatsappTemplatesQuery()

  const sendPendingMutation = useSendPendingWhatsappMessagesMutation()
  const sendSingleMutation = useSendSingleWhatsappMessageMutation()
  const deleteQueueMutation = useDeleteWhatsappQueueItemMutation()
  const deleteAllPendingMutation = useDeleteAllPendingWhatsappMessagesMutation()

  const createTemplateMutation = useCreateWhatsappTemplateMutation()
  const updateTemplateMutation = useUpdateWhatsappTemplateMutation()
  const deleteTemplateMutation = useDeleteWhatsappTemplateMutation()

  const queueItems = useMemo(() => queueQuery.data ?? [], [queueQuery.data])
  const historyItems = useMemo(() => historyQuery.data ?? [], [historyQuery.data])
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])

  const selectedTemplate = useMemo(() => {
    if (templateSelection === null || templateSelection === 'new') return null
    return templates.find((template) => template.id === templateSelection) ?? null
  }, [templateSelection, templates])

  useEffect(() => {
    if (templateSelection === 'new') {
      setTemplateForm(DEFAULT_TEMPLATE_FORM)
      return
    }

    if (selectedTemplate) {
      setTemplateForm({
        name: selectedTemplate.name,
        body: selectedTemplate.body,
        category: selectedTemplate.category ?? '',
        status: selectedTemplate.status,
        variables: selectedTemplate.variables ? [...selectedTemplate.variables] : [],
      })
    }
  }, [selectedTemplate, templateSelection])

  const handleTemplateFieldChange = <Key extends keyof TemplateFormState>(key: Key, value: TemplateFormState[Key]) => {
    setTemplateForm((prev) => ({ ...prev, [key]: value }))
  }

  const openHistoryModal = (id: number) => {
    setModalHistoryId(id)
  }

  const closeHistoryModal = () => {
    setModalHistoryId(null)
  }

  const modalHistoryItem = useMemo(() => {
    if (modalHistoryId === null) return null
    return historyItems.find((item) => item.id === modalHistoryId) ?? null
  }, [modalHistoryId, historyItems])

  const historyColumns = useMemo<ColumnDef<WhatsappHistoryItem>[]>(
    () => [
      {
        id: 'recipient',
        header: 'المستلم',
        accessorFn: (row) => {
          return row.parent_name ?? row.recipient_name ?? row.student_name ?? row.recipient ?? '—'
        },
        cell: ({ row }) => {
          const item = row.original
          // الحقول الفعلية في جدول teacher_sent_messages: parent_name, parent_phone
          const recipientName = item.parent_name ?? item.recipient_name ?? item.student_name ?? item.recipient ?? '—'
          const recipientPhone = item.parent_phone ?? item.recipient_phone ?? item.phone_number ?? null

          return (
            <span>
              <span style={{ display: 'block', fontWeight: 700 }}>{recipientName}</span>
              {recipientPhone ? <span className="ws-cell-sub">{recipientPhone}</span> : null}
            </span>
          )
        },
        size: 170,
      },
      {
        id: 'message',
        header: 'نص الرسالة',
        accessorFn: (row) => {
          const metadataMessage =
            row.metadata && typeof row.metadata === 'object' && row.metadata !== null
              ? (() => {
                const meta = row.metadata as Record<string, unknown>
                const messageValue = meta.message ?? meta.body ?? meta.content
                return typeof messageValue === 'string' ? messageValue : undefined
              })()
              : undefined

          return row.message_content ?? row.message_body ?? row.message_preview ?? metadataMessage ?? '—'
        },
        cell: ({ getValue }) => {
          const messagePreview = getValue() as string
          return (
            <span
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: 11.5,
                color: 'var(--ws-text-2)',
                lineHeight: 1.6,
              }}
            >
              {messagePreview}
            </span>
          )
        },
        size: 300,
      },
      {
        id: 'template',
        header: 'القالب',
        accessorKey: 'template_name',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          return value ? <WsChip>{value}</WsChip> : <span className="ws-cell-sub">—</span>
        },
        size: 130,
      },
      {
        id: 'date',
        header: 'تاريخ الإرسال',
        accessorFn: (row) => row.sent_at ?? row.created_at,
        cell: ({ row }) => {
          const item = row.original
          const sentAt = formatDateTime(item.sent_at ?? item.created_at)
          return <span className="ws-cell-sub">{sentAt}</span>
        },
        size: 140,
      },
      {
        id: 'status',
        header: 'الحالة',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const status = getValue() as WhatsappHistoryItem['status']
          return <HistoryStatusBadge status={status} />
        },
        size: 90,
      },
    ],
    [],
  )

  const historyTable = useReactTable({
    data: historyItems,
    columns: historyColumns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const handleVariableChange = (
    index: number,
    field: keyof WhatsappTemplateVariable,
    value: WhatsappTemplateVariable[keyof WhatsappTemplateVariable],
  ) => {
    setTemplateForm((prev) => {
      const variables = [...prev.variables]
      variables[index] = { ...variables[index], [field]: value }
      return { ...prev, variables }
    })
  }

  const handleAddVariable = () => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: [...prev.variables, { key: '', label: '', example: '' }],
    }))
  }

  const handleRemoveVariable = (index: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }))
  }

  const isTemplateDirty = useMemo(() => {
    if (templateSelection === null) return false
    if (templateSelection === 'new') {
      return JSON.stringify(templateForm) !== JSON.stringify(DEFAULT_TEMPLATE_FORM)
    }
    if (!selectedTemplate) return false
    const normalized: TemplateFormState = {
      name: selectedTemplate.name,
      body: selectedTemplate.body,
      category: selectedTemplate.category ?? '',
      status: selectedTemplate.status,
      variables: selectedTemplate.variables ? selectedTemplate.variables.map((variable) => ({ ...variable })) : [],
    }
    return JSON.stringify(templateForm) !== JSON.stringify(normalized)
  }, [selectedTemplate, templateForm, templateSelection])

  const handleSaveTemplate = () => {
    if (!isTemplateDirty) return

    if (templateSelection === 'new' || templateSelection === null) {
      createTemplateMutation.mutate(templateForm, {
        onSuccess: (created) => {
          setTemplateSelection(created.id)
        },
      })
      return
    }

    if (selectedTemplate) {
      updateTemplateMutation.mutate(
        { id: selectedTemplate.id, payload: templateForm },
        {
          onSuccess: (updated) => {
            setTemplateSelection(updated.id)
          },
        },
      )
    }
  }

  const handleDeleteTemplate = (template: WhatsappTemplate) => {
    deleteTemplateMutation.mutate(template.id, {
      onSuccess: () => {
        setTemplateSelection(null)
        setTemplateForm(DEFAULT_TEMPLATE_FORM)
      },
    })
  }

  const isBusySendingAll = sendPendingMutation.isPending

  const deleteQueueTarget = deleteQueueMutation.variables ?? null
  const sendSingleTarget = sendSingleMutation.variables ?? null

  const formattedTotalSent = formatStatisticValue(statisticsQuery.data?.total_sent)
  const formattedQueueSize = formatStatisticValue(statisticsQuery.data?.queue_size)
  const formattedTotalFailed = formatStatisticValue(statisticsQuery.data?.total_failed)

  const connectedCount = instances.filter((instance: WhatsappInstance) => instance.status === 'connected').length
  const pendingQueueCount = queueItems.filter((item) => item.status !== 'sent').length

  return (
    <WsPage>
      <WsHeader
        title="مركز الواتساب"
        badge="القناة الرسمية للمدرسة"
        actions={
          <>
            {/* يقصّ السجلَّ وحده — التبويبات الأخرى (الطابور، القوالب) حالةٌ
                قائمة لا تاريخ، فلا معنى لعامٍ فيها. */}
            {activeTab === 'history' && <YearScopeSelect scope={yearScope} onChange={setYearScope} />}
            <WsBtn
              icon={RefreshCcw}
              onClick={() => {
                statisticsQuery.refetch()
                queueQuery.refetch()
                historyQuery.refetch()
              }}
            >
              تحديث
            </WsBtn>
            <Link to="/admin/whatsapp-send" className="ws-btn ws-btn--primary">
              <Send style={{ width: 13, height: 13 }} />
              رسالة جديدة
            </Link>
          </>
        }
        facts={
          <>
            <WsFact icon={MessageCircle} label="مرسلة:">
              {formattedTotalSent}
            </WsFact>
            <WsFact icon={Inbox} label="معلقة:">
              {formattedQueueSize}
            </WsFact>
            <WsFact label="فاشلة:">{formattedTotalFailed}</WsFact>
            <WsFact icon={Smartphone} label="أرقام متصلة:">
              {connectedCount} / {instances.length}
            </WsFact>
          </>
        }
      >
        {connectedCount === 0 && !isLoadingInstances && instances.length > 0 ? (
          <WsChip tone="red">القناة غير متصلة!</WsChip>
        ) : null}
      </WsHeader>

      <WsLayout>
        {/* العمود الأيمن: القناة والعمليات الحرجة */}
        <WsSideCol title="القناة" icon={Smartphone} side="start" width={280} storageKey="ws:whatsapp-hub:channel">
          <WsBlock title="أرقام الواتساب" count={instances.length} scroll>
            {isLoadingInstances ? (
              <WsEmpty loading>جارٍ فحص الاتصال...</WsEmpty>
            ) : instances.length === 0 ? (
              <WsEmpty icon={Smartphone}>
                لا توجد أرقام واتساب مرتبطة — أضف رقماً من صفحة الإعدادات.
              </WsEmpty>
            ) : (
              <div>
                {instances.map((instance: WhatsappInstance) => {
                  const meta = INSTANCE_STATUS_META[instance.status] ?? INSTANCE_STATUS_META.disconnected
                  return (
                    <div key={instance.id} style={{ padding: '9px 12px', borderBottom: '1px solid var(--ws-hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span
                            className={meta.pulse ? 'ws-pulse' : undefined}
                            style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{instance.instance_name}</span>
                        </span>
                        <WsChip tone={meta.tone}>{meta.label}</WsChip>
                      </div>
                      {instance.phone_number && (
                        <span className="ws-cell-sub" style={{ display: 'block', marginTop: 3 }} dir="ltr">
                          {instance.phone_number}
                        </span>
                      )}
                      {instance.department && (
                        <span className="ws-cell-sub" style={{ display: 'block' }}>{instance.department}</span>
                      )}
                      {instance.last_connected_at && (
                        <span className="ws-cell-sub" style={{ display: 'block', marginTop: 2 }}>
                          آخر اتصال: {formatDateTime(instance.last_connected_at)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </WsBlock>

          <WsBlock title="قائمة الانتظار" icon={Inbox} count={pendingQueueCount.toLocaleString('ar-SA-u-nu-latn')} fill padded>
            <p style={{ margin: '0 0 10px', fontSize: 11, lineHeight: 1.8, color: 'var(--ws-text-2)' }}>
              رسائل بانتظار الإرسال عبر القناة — أرسلها دفعة واحدة أو راجعها من تبويب «قائمة الانتظار».
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <WsBtn
                variant="primary"
                icon={Send}
                onClick={() => sendPendingMutation.mutate()}
                disabled={isBusySendingAll || pendingQueueCount === 0}
                style={{ justifyContent: 'center' }}
              >
                {isBusySendingAll ? 'جارٍ الإرسال...' : 'إرسال جميع المعلّق'}
              </WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من حذف جميع الرسائل المعلقة؟')) {
                    deleteAllPendingMutation.mutate()
                  }
                }}
                disabled={deleteAllPendingMutation.isPending || queueItems.length === 0}
                style={{ justifyContent: 'center' }}
              >
                {deleteAllPendingMutation.isPending ? 'جارٍ الحذف...' : 'حذف جميع المعلّق'}
              </WsBtn>
            </div>
          </WsBlock>
        </WsSideCol>

        {/* الوسط: التبويبات */}
        <WsMain>
          <WsBlock
            title={
              <span className="ws-seg" style={{ display: 'inline-flex' }}>
                {TABS.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                    >
                      <TabIcon style={{ width: 12, height: 12 }} />
                      {tab.label}
                      {tab.key === 'queue' && pendingQueueCount > 0 ? (
                        <span className="ws-count">{pendingQueueCount}</span>
                      ) : null}
                    </button>
                  )
                })}
              </span>
            }
            tools={
              activeTab === 'history' ? (
                <WsBtn size="sm" icon={RefreshCcw} onClick={() => historyQuery.refetch()}>
                  تحديث السجل
                </WsBtn>
              ) : activeTab === 'queue' ? (
                <WsBtn size="sm" icon={RefreshCcw} onClick={() => queueQuery.refetch()}>
                  تحديث القائمة
                </WsBtn>
              ) : (
                <WsBtn
                  size="sm"
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setTemplateSelection('new')
                    setTemplateForm(DEFAULT_TEMPLATE_FORM)
                  }}
                >
                  قالب جديد
                </WsBtn>
              )
            }
            fill
          >
            {/* ══ السجل ══ */}
            {activeTab === 'history' &&
              (historyQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل السجل...</WsEmpty>
              ) : historyItems.length === 0 ? (
                <WsEmpty icon={ClipboardList}>
                  لا توجد رسائل في هذا العام.
                  <YearScopeEmptyNote scope={yearScope} onShowAll={() => setYearScope('all')} />
                </WsEmpty>
              ) : (
                <>
                  <WsTable className="is-clickable">
                    <thead>
                      {historyTable.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} style={{ width: header.column.getSize() }}>
                              {header.isPlaceholder ? null : (
                                <span
                                  onClick={header.column.getToggleSortingHandler()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                                    userSelect: 'none',
                                  }}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {{
                                    asc: <ChevronUp style={{ width: 11, height: 11 }} />,
                                    desc: <ChevronDown style={{ width: 11, height: 11 }} />,
                                  }[header.column.getIsSorted() as string] ?? null}
                                </span>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {historyTable.getRowModel().rows.map((row) => (
                        <tr key={row.id} onClick={() => openHistoryModal(row.original.id)}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </WsTable>

                  {/* شريط الترقيم */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                      padding: '7px 12px',
                      borderTop: '1px solid var(--ws-hairline)',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
                      إجمالي {historyTable.getFilteredRowModel().rows.length.toLocaleString('ar-SA-u-nu-latn')} رسالة — انقر أي صف
                      للتفاصيل
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <WsBtn size="sm" onClick={() => historyTable.setPageIndex(0)} disabled={!historyTable.getCanPreviousPage()}>
                        الأولى
                      </WsBtn>
                      <WsBtn size="sm" onClick={() => historyTable.previousPage()} disabled={!historyTable.getCanPreviousPage()}>
                        السابق
                      </WsBtn>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '0 6px' }}>
                        {(historyTable.getState().pagination.pageIndex + 1).toLocaleString('ar-SA-u-nu-latn')} /{' '}
                        {Math.max(1, historyTable.getPageCount()).toLocaleString('ar-SA-u-nu-latn')}
                      </span>
                      <WsBtn size="sm" onClick={() => historyTable.nextPage()} disabled={!historyTable.getCanNextPage()}>
                        التالي
                      </WsBtn>
                      <WsBtn
                        size="sm"
                        onClick={() => historyTable.setPageIndex(historyTable.getPageCount() - 1)}
                        disabled={!historyTable.getCanNextPage()}
                      >
                        الأخيرة
                      </WsBtn>
                    </span>
                  </div>
                </>
              ))}

            {/* ══ قائمة الانتظار ══ */}
            {activeTab === 'queue' &&
              (queueQuery.isLoading ? (
                <WsEmpty loading>جاري تحميل قائمة الانتظار...</WsEmpty>
              ) : queueItems.length === 0 ? (
                <WsEmpty icon={Inbox}>لا توجد رسائل في قائمة الانتظار.</WsEmpty>
              ) : (
                <WsTable>
                  <thead>
                    <tr>
                      <th>المستلم</th>
                      <th>القالب</th>
                      <th>أضيفت</th>
                      <th>الجدولة</th>
                      <th>الحالة</th>
                      <th>الخطأ</th>
                      <th style={{ width: 170 }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map((item) => {
                      const isDeleting = deleteQueueTarget === item.id && deleteQueueMutation.isPending
                      const isSending = sendSingleTarget === item.id && sendSingleMutation.isPending
                      return (
                        <tr key={item.id}>
                          <td>
                            <span style={{ display: 'block', fontWeight: 700 }} dir="ltr">
                              {item.parent_phone}
                            </span>
                            {item.student_name ? <span className="ws-cell-sub">{item.student_name}</span> : null}
                          </td>
                          <td>{item.template_name ?? '—'}</td>
                          <td>
                            <span className="ws-cell-sub">{formatDateTime(item.created_at)}</span>
                          </td>
                          <td>
                            <span className="ws-cell-sub">{formatDateTime(item.scheduled_at)}</span>
                          </td>
                          <td>
                            <QueueStatusBadge status={item.status} />
                          </td>
                          <td>
                            {item.error_message ? (
                              <span style={{ fontSize: 10.5, color: 'var(--ws-red)' }}>{item.error_message}</span>
                            ) : (
                              <span className="ws-cell-sub">—</span>
                            )}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', gap: 4 }}>
                              <WsBtn
                                size="sm"
                                icon={Send}
                                onClick={() => sendSingleMutation.mutate(item.id)}
                                disabled={isSending || item.status === 'sent'}
                              >
                                {isSending ? 'جارٍ الإرسال...' : 'إرسال الآن'}
                              </WsBtn>
                              <WsBtn
                                size="sm"
                                variant="danger"
                                icon={Trash2}
                                onClick={() => deleteQueueMutation.mutate(item.id)}
                                disabled={isDeleting}
                              />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </WsTable>
              ))}

            {/* ══ القوالب ══ */}
            {activeTab === 'templates' && (
              <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                {/* قائمة القوالب */}
                <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', borderInlineEnd: '1px solid var(--ws-hairline)' }}>
                  {templatesQuery.isLoading ? (
                    <WsEmpty loading>جاري تحميل القوالب...</WsEmpty>
                  ) : templates.length === 0 ? (
                    <WsEmpty icon={FileText}>لا توجد قوالب مسجلة حتى الآن.</WsEmpty>
                  ) : (
                    <div>
                      {templates.map((template) => {
                        const isActive = templateSelection === template.id
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setTemplateSelection(template.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              width: '100%',
                              textAlign: 'right',
                              padding: '9px 12px',
                              border: 'none',
                              borderBottom: '1px solid var(--ws-hairline)',
                              background: isActive ? 'var(--ws-accent-soft)' : 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 12.5, fontWeight: isActive ? 700 : 600, color: 'var(--ws-text)' }}>
                                {template.name}
                              </span>
                              <span className="ws-cell-sub">{template.category ?? 'غير مصنف'}</span>
                            </span>
                            <TemplateStatusBadge status={template.status} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* محرر القالب */}
                <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {templateSelection === null ? (
                    <WsEmpty icon={FileText}>اختر قالبًا لعرض التفاصيل أو أنشئ قالبًا جديدًا.</WsEmpty>
                  ) : (
                    <>
                      <div className="ws-block__head" style={{ flexShrink: 0 }}>
                        <span className="ws-block__title">
                          {templateSelection === 'new' ? 'إنشاء قالب جديد' : 'تعديل القالب'}
                          {isTemplateDirty && <WsChip tone="amber">غير محفوظ</WsChip>}
                        </span>
                        <span className="ws-block__tools">
                          {templateSelection !== 'new' && selectedTemplate ? (
                            <WsBtn
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              onClick={() => handleDeleteTemplate(selectedTemplate)}
                              disabled={deleteTemplateMutation.isPending && deleteTemplateMutation.variables === selectedTemplate.id}
                            />
                          ) : null}
                          <WsBtn
                            size="sm"
                            variant="primary"
                            onClick={handleSaveTemplate}
                            disabled={!isTemplateDirty || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                          >
                            {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
                          </WsBtn>
                        </span>
                      </div>

                      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <WsField label="اسم القالب">
                          <WsInput
                            type="text"
                            value={templateForm.name}
                            onChange={(event) => handleTemplateFieldChange('name', event.target.value)}
                            placeholder="مثال: إشعار غياب"
                          />
                        </WsField>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <WsField label="التصنيف">
                            <WsInput
                              type="text"
                              value={templateForm.category}
                              onChange={(event) => handleTemplateFieldChange('category', event.target.value)}
                              placeholder="مثال: الحضور"
                            />
                          </WsField>
                          <WsField label="الحالة">
                            <WsSelect
                              value={templateForm.status}
                              onChange={(event) =>
                                handleTemplateFieldChange('status', event.target.value as TemplateFormState['status'])
                              }
                            >
                              <option value="active">مفعّل</option>
                              <option value="inactive">موقوف</option>
                            </WsSelect>
                          </WsField>
                        </div>

                        <WsField label="نص الرسالة">
                          <WsTextarea
                            value={templateForm.body}
                            onChange={(event) => handleTemplateFieldChange('body', event.target.value)}
                            placeholder="اكتب نص الرسالة مع المتغيرات مثل {student_name}"
                            rows={6}
                          />
                        </WsField>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>المتغيرات الديناميكية</span>
                            <WsBtn size="sm" icon={Plus} onClick={handleAddVariable}>
                              متغير
                            </WsBtn>
                          </div>

                          {templateForm.variables.length === 0 ? (
                            <p
                              style={{
                                margin: 0,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px dashed var(--ws-border)',
                                fontSize: 10.5,
                                color: 'var(--ws-text-2)',
                              }}
                            >
                              لم يتم تعريف متغيرات لهذا القالب.
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {templateForm.variables.map((variable, index) => (
                                <div
                                  key={index}
                                  style={{ borderRadius: 8, border: '1px solid var(--ws-hairline)', padding: 8 }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom: 6,
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                    }}
                                  >
                                    المتغير #{index + 1}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVariable(index)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--ws-red)',
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                      }}
                                    >
                                      حذف
                                    </button>
                                  </div>
                                  <div style={{ display: 'grid', gap: 5 }}>
                                    <WsInput
                                      type="text"
                                      value={variable.key}
                                      onChange={(event) => handleVariableChange(index, 'key', event.target.value)}
                                      placeholder="المفتاح (مثال: student_name)"
                                    />
                                    <WsInput
                                      type="text"
                                      value={variable.label}
                                      onChange={(event) => handleVariableChange(index, 'label', event.target.value)}
                                      placeholder="الوصف (اسم الطالب)"
                                    />
                                    <WsInput
                                      type="text"
                                      value={variable.example ?? ''}
                                      onChange={(event) => handleVariableChange(index, 'example', event.target.value)}
                                      placeholder="قيمة افتراضية (مثال: محمد)"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      {/* مودال تفاصيل الرسالة */}
      <WsModal
        open={Boolean(modalHistoryItem)}
        onClose={closeHistoryModal}
        title="تفاصيل الرسالة"
        sub={modalHistoryItem ? formatDateTime(modalHistoryItem.sent_at ?? modalHistoryItem.created_at) : undefined}
        maxWidth={600}
        footer={<WsBtn onClick={closeHistoryModal}>إغلاق</WsBtn>}
      >
        {modalHistoryItem ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <HistoryStatusBadge status={modalHistoryItem.status} />
            </div>

            <div
              style={{
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface-2)',
                padding: '10px 12px',
                fontSize: 12,
                lineHeight: 1.9,
                whiteSpace: 'pre-wrap',
              }}
            >
              {(() => {
                const metadataMessage =
                  modalHistoryItem.metadata && typeof modalHistoryItem.metadata === 'object' && modalHistoryItem.metadata !== null
                    ? (() => {
                      const meta = modalHistoryItem.metadata as Record<string, unknown>
                      const messageValue = meta.message ?? meta.body ?? meta.content
                      return typeof messageValue === 'string' ? messageValue : undefined
                    })()
                    : undefined
                return modalHistoryItem.message_content ?? modalHistoryItem.message_body ?? modalHistoryItem.message_preview ?? metadataMessage ?? '—'
              })()}
            </div>

            <WsFactsList>
              <WsFactRow label="الاسم">
                {(() => {
                  const fallbackRecipient =
                    modalHistoryItem.recipient && /[^0-9]/.test(modalHistoryItem.recipient) ? modalHistoryItem.recipient : null
                  return modalHistoryItem.student_name ?? modalHistoryItem.recipient_name ?? fallbackRecipient ?? '—'
                })()}
              </WsFactRow>
              <WsFactRow label="رقم الهاتف">
                <span dir="ltr">
                  {(() => {
                    const fallbackRecipient =
                      modalHistoryItem.recipient && /[^0-9]/.test(modalHistoryItem.recipient) ? modalHistoryItem.recipient : null
                    return (
                      modalHistoryItem.phone_number ??
                      modalHistoryItem.recipient_phone ??
                      (fallbackRecipient ? null : modalHistoryItem.recipient) ??
                      '—'
                    )
                  })()}
                </span>
              </WsFactRow>
              {(modalHistoryItem.student_grade || modalHistoryItem.student_class) && (
                <WsFactRow label="الصف / الفصل">
                  {[modalHistoryItem.student_grade, modalHistoryItem.student_class].filter(Boolean).join(' - ')}
                </WsFactRow>
              )}
              {modalHistoryItem.delivered_at && (
                <WsFactRow label="تاريخ الوصول">
                  <span style={{ color: 'var(--ws-green)' }}>{formatDateTime(modalHistoryItem.delivered_at)}</span>
                </WsFactRow>
              )}
              {modalHistoryItem.template_name && (
                <WsFactRow label="القالب المستخدم">{modalHistoryItem.template_name}</WsFactRow>
              )}
            </WsFactsList>

            {modalHistoryItem.error_message && (
              <div
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--ws-red-bd)',
                  background: 'var(--ws-red-bg)',
                  padding: '8px 12px',
                  fontSize: 11.5,
                  color: 'var(--ws-red)',
                  lineHeight: 1.8,
                }}
              >
                <b>رسالة الخطأ:</b> {modalHistoryItem.error_message}
              </div>
            )}

            {(() => {
              const metadataEntries =
                modalHistoryItem.metadata && typeof modalHistoryItem.metadata === 'object' && modalHistoryItem.metadata !== null
                  ? Object.entries(modalHistoryItem.metadata as Record<string, unknown>)
                    .filter((entry): entry is [string, string | number] => {
                      const [key, value] = entry
                      if (['message', 'body', 'content', 'text'].includes(key)) return false
                      return typeof value === 'string' || typeof value === 'number'
                    })
                  : []

              if (metadataEntries.length === 0) return null

              return (
                <WsFactsList>
                  {metadataEntries.map(([key, value], index) => {
                    const normalizedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                    return (
                      <WsFactRow key={index} label={normalizedKey}>
                        {String(value)}
                      </WsFactRow>
                    )
                  })}
                </WsFactsList>
              )
            })()}
          </>
        ) : null}
      </WsModal>
    </WsPage>
  )
}

import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { fetchWhatsappInstances } from '../api'
import type { WhatsappHistoryItem, WhatsappQueueItem, WhatsappTemplate, WhatsappTemplateVariable, WhatsappInstance } from '../types'

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

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'history', label: 'سجل الرسائل' },
  { key: 'queue', label: 'قائمة الانتظار' },
  { key: 'templates', label: 'القوالب' },
]

const PANEL_CLASS = 'rounded-3xl border border-slate-200 bg-white'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString('ar-SA')
  }
}

function formatStatisticValue(value: unknown) {
  if (value == null) return '0'
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return numericValue.toLocaleString('ar-SA')
}

function StatusPill({ tone, icon, label }: { tone: 'success' | 'warning' | 'danger' | 'info'; icon: string; label: string }) {
  const toneClasses = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
  } as const

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <i className={`bi ${icon}`} />
      {label}
    </span>
  )
}

function QueueStatusBadge({ status }: { status: WhatsappQueueItem['status'] }) {
  switch (status) {
    case 'sent':
      return <StatusPill tone="success" icon="bi-check-circle" label="تم الإرسال" />
    case 'processing':
      return <StatusPill tone="info" icon="bi-arrow-repeat" label="قيد المعالجة" />
    case 'failed':
      return <StatusPill tone="danger" icon="bi-exclamation-triangle" label="فشل الإرسال" />
    default:
      return <StatusPill tone="warning" icon="bi-clock-history" label="بانتظار الإرسال" />
  }
}

function HistoryStatusBadge({ status }: { status: WhatsappHistoryItem['status'] }) {
  return status === 'sent' ? (
    <StatusPill tone="success" icon="bi-check2-circle" label="مرسلة" />
  ) : (
    <StatusPill tone="danger" icon="bi-x-circle" label="فشلت" />
  )
}

function TemplateStatusBadge({ status }: { status: WhatsappTemplate['status'] }) {
  return status === 'active' ? (
    <StatusPill tone="success" icon="bi-lightning" label="مفعّل" />
  ) : (
    <StatusPill tone="warning" icon="bi-pause-circle" label="موقوف" />
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
        }`}
    >
      {label}
    </button>
  )
}

export function WhatsappHubPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('history')
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
  const historyQuery = useWhatsappHistoryQuery()
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
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">{recipientName}</p>
              {recipientPhone ? <p className="text-xs text-slate-500">{recipientPhone}</p> : null}
            </div>
          )
        },
        size: 180,
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
            <p className="line-clamp-2 text-sm text-slate-700">
              {messagePreview}
            </p>
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
          return <span className="text-sm text-slate-600">{value ?? '—'}</span>
        },
        size: 140,
      },
      {
        id: 'date',
        header: 'تاريخ الإرسال',
        accessorFn: (row) => row.sent_at ?? row.created_at,
        cell: ({ row }) => {
          const item = row.original
          const sentAt = formatDateTime(item.sent_at ?? item.created_at)
          return <p className="text-xs text-slate-500">{sentAt}</p>
        },
        size: 150,
      },
      {
        id: 'status',
        header: 'الحالة',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const status = getValue() as WhatsappHistoryItem['status']
          return <HistoryStatusBadge status={status} />
        },
        size: 110,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openHistoryModal(row.original.id)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            التفاصيل
          </button>
        ),
        size: 80,
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

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <h1 className="text-3xl font-bold text-slate-900">إدارة الواتساب</h1>
            <p className="text-sm text-muted">تابع حالة الرسائل، راجع السجل، وادمج القوالب الذكية مع الطلاب وأولياء الأمور.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <TabButton key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(320px,1fr)]">
        <div className={`${PANEL_CLASS} space-y-6 p-6 lg:p-8`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statisticsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
              ))
            ) : statisticsQuery.data ? (
              <>
                <article className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">الرسائل المرسلة</p>
                  <p className="mt-2 text-2xl font-bold text-indigo-900">{formattedTotalSent}</p>
                </article>
                <article className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">رسائل معلقة</p>
                  <p className="mt-2 text-2xl font-bold text-amber-800">{formattedQueueSize}</p>
                </article>
                <article className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">رسائل فاشلة</p>
                  <p className="mt-2 text-2xl font-bold text-rose-800">{formattedTotalFailed}</p>
                </article>
              </>
            ) : (
              <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                تعذر تحميل إحصائيات الواتساب.
              </div>
            )}
          </div>
        </div>

        <aside className={`${PANEL_CLASS} space-y-4 p-6 lg:p-8`}>
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">حالة الاتصال</p>
            <h2 className="text-lg font-semibold text-slate-900">أرقام الواتساب</h2>
          </div>
          {isLoadingInstances ? (
            <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ) : instances.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-muted">لا توجد أرقام واتساب مرتبطة</p>
              <p className="mt-2 text-xs text-slate-500">قم بإضافة رقم واتساب من صفحة الإعدادات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance: WhatsappInstance) => (
                <div
                  key={instance.id}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{instance.instance_name}</p>
                      {instance.phone_number && (
                        <p className="text-xs text-slate-600">{instance.phone_number}</p>
                      )}
                      {instance.department && (
                        <p className="text-xs text-muted">{instance.department}</p>
                      )}
                    </div>
                    {instance.status === 'connected' && (
                      <StatusPill tone="success" icon="bi-check-circle" label="متصل" />
                    )}
                    {instance.status === 'connecting' && (
                      <StatusPill tone="warning" icon="bi-arrow-repeat" label="جاري الاتصال" />
                    )}
                    {instance.status === 'disconnected' && (
                      <StatusPill tone="danger" icon="bi-exclamation-circle" label="غير متصل" />
                    )}
                  </div>
                  {instance.last_connected_at && (
                    <p className="text-xs text-muted">
                      آخر اتصال: {formatDateTime(instance.last_connected_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="button-secondary" onClick={() => statisticsQuery.refetch()}>
              تحديث الإحصائيات
            </button>
          </div>
        </aside>
      </section>

      <section className={`${PANEL_CLASS} space-y-6 p-6 lg:p-8`}>
        {activeTab === 'queue' ? (
          <section className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-right">
                <h2 className="text-xl font-semibold text-slate-900">قائمة انتظار الرسائل</h2>
                <p className="text-sm text-muted">تابع الرسائل المعلقة، أعد الإرسال يدويًا أو أزل العناصر المعطلة.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => queueQuery.refetch()}
                >
                  تحديث القائمة
                </button>
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من حذف جميع الرسائل المعلقة؟')) {
                      deleteAllPendingMutation.mutate()
                    }
                  }}
                  disabled={deleteAllPendingMutation.isPending || queueItems.length === 0}
                >
                  {deleteAllPendingMutation.isPending ? 'جارٍ الحذف...' : 'حذف جميع المعلّق'}
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => sendPendingMutation.mutate()}
                  disabled={isBusySendingAll}
                >
                  {isBusySendingAll ? 'جارٍ الإرسال...' : 'إرسال جميع المعلّق'}
                </button>
              </div>
            </header>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {queueQuery.isLoading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  جاري تحميل قائمة الانتظار...
                </div>
              ) : queueItems.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                  <i className="bi bi-inboxes text-3xl text-slate-300" />
                  لا توجد رسائل في قائمة الانتظار.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] table-fixed text-right text-sm">
                    <thead className="bg-slate-50/80 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">المستلم</th>
                        <th className="px-4 py-3 font-semibold">القالب</th>
                        <th className="px-4 py-3 font-semibold">أضيفت</th>
                        <th className="px-4 py-3 font-semibold">الجدولة</th>
                        <th className="px-4 py-3 font-semibold">الحالة</th>
                        <th className="px-4 py-3 font-semibold">تفاصيل</th>
                        <th className="px-4 py-3 font-semibold">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueItems.map((item) => {
                        const isDeleting = deleteQueueTarget === item.id && deleteQueueMutation.isPending
                        const isSending = sendSingleTarget === item.id && sendSingleMutation.isPending
                        return (
                          <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">{item.parent_phone}</p>
                              {item.student_name ? <p className="text-xs text-muted">{item.student_name}</p> : null}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{item.template_name ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(item.created_at)}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(item.scheduled_at)}</td>
                            <td className="px-4 py-3">
                              <QueueStatusBadge status={item.status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-rose-600">{item.error_message ?? '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="button-secondary"
                                  onClick={() => sendSingleMutation.mutate(item.id)}
                                  disabled={isSending || item.status === 'sent'}
                                >
                                  {isSending ? 'جارٍ الإرسال...' : 'إرسال الآن'}
                                </button>
                                <button
                                  type="button"
                                  className="button-secondary"
                                  onClick={() => deleteQueueMutation.mutate(item.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? 'جارٍ الحذف...' : 'حذف'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'history' ? (
          <section className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-right">
                <h2 className="text-xl font-semibold text-slate-900">سجل الرسائل</h2>
                <p className="text-sm text-muted">راجع أحدث الرسائل المرسلة وتحقق من الأخطاء المرتبطة بها.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="button-secondary" onClick={() => historyQuery.refetch()}>
                  تحديث السجل
                </button>
              </div>
            </header>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {historyQuery.isLoading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  جاري تحميل السجل...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-muted">
                  <i className="bi bi-journal-text text-3xl text-slate-300" />
                  لا توجد بيانات في السجل خلال الفترة الحالية.
                </div>
              ) : (
                <div className="space-y-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full w-full table-auto text-right">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        {historyTable.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                style={{ width: header.column.getSize() }}
                                className="px-3 py-2 text-xs font-semibold text-slate-600"
                              >
                                {header.isPlaceholder ? null : (
                                  <div
                                    className={
                                      header.column.getCanSort()
                                        ? 'flex cursor-pointer select-none items-center justify-start gap-2 transition hover:text-indigo-600'
                                        : 'flex items-center justify-start'
                                    }
                                    onClick={header.column.getToggleSortingHandler()}
                                  >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                    {{
                                      asc: <i className="bi bi-arrow-up text-[10px]" />,
                                      desc: <i className="bi bi-arrow-down text-[10px]" />,
                                    }[header.column.getIsSorted() as string] ?? null}
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {historyTable.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-slate-100 hover:bg-slate-50/70 transition cursor-pointer"
                            onClick={() => openHistoryModal(row.original.id)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-2.5">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>
                        الصفحة {historyTable.getState().pagination.pageIndex + 1} من {historyTable.getPageCount()}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span>إجمالي: {historyTable.getFilteredRowModel().rows.length} رسالة</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          historyTable.setPageIndex(0)
                        }}
                        disabled={!historyTable.getCanPreviousPage()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="bi bi-chevron-bar-right" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          historyTable.previousPage()
                        }}
                        disabled={!historyTable.getCanPreviousPage()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          historyTable.nextPage()
                        }}
                        disabled={!historyTable.getCanNextPage()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="bi bi-chevron-left" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          historyTable.setPageIndex(historyTable.getPageCount() - 1)
                        }}
                        disabled={!historyTable.getCanNextPage()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <i className="bi bi-chevron-bar-left" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'templates' ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr),420px]">
            <div className="space-y-4">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-right">
                  <h2 className="text-xl font-semibold text-slate-900">قوالب الرسائل</h2>
                  <p className="text-sm text-muted">أنشئ قوالب جديدة أو عدّل القوالب الحالية لاستخدامها في الرسائل الذكية.</p>
                </div>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    setTemplateSelection('new')
                    setTemplateForm(DEFAULT_TEMPLATE_FORM)
                  }}
                >
                  قالب جديد
                </button>
              </header>

              <div className="rounded-3xl border border-slate-200 bg-white">
                {templatesQuery.isLoading ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-sm text-muted">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    جاري تحميل القوالب...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-sm text-muted">
                    <i className="bi bi-layout-text-window-reverse text-3xl text-slate-300" />
                    لا توجد قوالب مسجلة حتى الآن.
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    <ul className="divide-y divide-slate-100">
                      {templates.map((template) => {
                        const isActive = templateSelection === template.id
                        return (
                          <li
                            key={template.id}
                            className={`flex flex-col gap-2 px-5 py-4 transition ${isActive ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => setTemplateSelection(template.id)}
                              className="flex items-center justify-between gap-3 text-right"
                            >
                              <span className="space-y-1">
                                <span className="block text-sm font-semibold text-slate-900">{template.name}</span>
                                <span className="block text-xs text-muted">{template.category ?? 'غير مصنف'}</span>
                              </span>
                              <TemplateStatusBadge status={template.status} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
              {templateSelection === null ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm text-muted">
                  <i className="bi bi-arrow-left-circle text-3xl text-slate-300" />
                  اختر قالبًا لعرض التفاصيل أو أنشئ قالبًا جديدًا.
                </div>
              ) : (
                <Fragment>
                  <header className="space-y-1 text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                      {templateSelection === 'new' ? 'قالب جديد' : 'تعديل القالب'}
                    </p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {templateSelection === 'new' ? 'إنشاء قالب واتساب' : templateForm.name || 'قالب بدون اسم'}
                    </h3>
                  </header>

                  <div className="space-y-3 text-right text-sm">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">اسم القالب</label>
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(event) => handleTemplateFieldChange('name', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="مثال: إشعار غياب"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">التصنيف</label>
                      <input
                        type="text"
                        value={templateForm.category}
                        onChange={(event) => handleTemplateFieldChange('category', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="مثال: الحضور"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">حالة القالب</label>
                      <select
                        value={templateForm.status}
                        onChange={(event) => handleTemplateFieldChange('status', event.target.value as TemplateFormState['status'])}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="active">مفعّل</option>
                        <option value="inactive">موقوف</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600">نص الرسالة</label>
                      <textarea
                        value={templateForm.body}
                        onChange={(event) => handleTemplateFieldChange('body', event.target.value)}
                        placeholder="اكتب نص الرسالة مع المتغيرات مثل {student_name}"
                        className="h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold">المتغيرات الديناميكية</span>
                        <button type="button" className="button-secondary" onClick={handleAddVariable}>
                          إضافة متغير
                        </button>
                      </div>

                      {templateForm.variables.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-xs text-muted">
                          لم يتم تعريف متغيرات لهذا القالب.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {templateForm.variables.map((variable, index) => (
                            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                                <strong>المتغير #{index + 1}</strong>
                                <button type="button" onClick={() => handleRemoveVariable(index)} className="text-rose-600">
                                  حذف
                                </button>
                              </div>
                              <div className="mt-2 grid gap-2">
                                <input
                                  type="text"
                                  value={variable.key}
                                  onChange={(event) => handleVariableChange(index, 'key', event.target.value)}
                                  placeholder="المفتاح (مثال: student_name)"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <input
                                  type="text"
                                  value={variable.label}
                                  onChange={(event) => handleVariableChange(index, 'label', event.target.value)}
                                  placeholder="الوصف (اسم الطالب)"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <input
                                  type="text"
                                  value={variable.example ?? ''}
                                  onChange={(event) => handleVariableChange(index, 'example', event.target.value)}
                                  placeholder="قيمة افتراضية (مثال: محمد)"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <footer className="flex flex-wrap items-center justify-end gap-2">
                    {templateSelection !== 'new' && selectedTemplate ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => handleDeleteTemplate(selectedTemplate)}
                        disabled={deleteTemplateMutation.isPending && deleteTemplateMutation.variables === selectedTemplate.id}
                      >
                        {deleteTemplateMutation.isPending && deleteTemplateMutation.variables === selectedTemplate.id
                          ? 'جارٍ الحذف...'
                          : 'حذف القالب'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button-primary"
                      onClick={handleSaveTemplate}
                      disabled={!isTemplateDirty || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ القالب'}
                    </button>
                  </footer>
                </Fragment>
              )}
            </aside>
          </section>
        ) : null}
      </section>

      {/* History Details Modal */}
      {modalHistoryItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeHistoryModal}
        >
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">تفاصيل الرسالة</h3>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                aria-label="إغلاق"
              >
                <i className="bi bi-x-lg text-lg" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Message Content */}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-600">نص الرسالة الكامل</h4>
                <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
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
                </pre>
              </section>

              {/* Recipient Info */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">معلومات المستلم</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">الاسم</p>
                      <p className="font-semibold text-slate-900">
                        {(() => {
                          const fallbackRecipient = modalHistoryItem.recipient && /[^0-9]/.test(modalHistoryItem.recipient) ? modalHistoryItem.recipient : null
                          return modalHistoryItem.student_name ?? modalHistoryItem.recipient_name ?? fallbackRecipient ?? '—'
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">رقم الهاتف</p>
                      <p className="font-medium text-slate-700">
                        {(() => {
                          const fallbackRecipient = modalHistoryItem.recipient && /[^0-9]/.test(modalHistoryItem.recipient) ? modalHistoryItem.recipient : null
                          return modalHistoryItem.phone_number ?? modalHistoryItem.recipient_phone ?? (fallbackRecipient ? null : modalHistoryItem.recipient) ?? '—'
                        })()}
                      </p>
                    </div>
                    {(modalHistoryItem.student_grade || modalHistoryItem.student_class) && (
                      <div>
                        <p className="text-xs text-slate-500">الصف / الفصل</p>
                        <p className="font-medium text-slate-700">
                          {[modalHistoryItem.student_grade, modalHistoryItem.student_class].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">حالة الإرسال</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">الحالة</p>
                      <div className="mt-1">
                        <HistoryStatusBadge status={modalHistoryItem.status} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">تاريخ الإرسال</p>
                      <p className="font-medium text-slate-700">
                        {formatDateTime(modalHistoryItem.sent_at ?? modalHistoryItem.created_at)}
                      </p>
                    </div>
                    {modalHistoryItem.delivered_at && (
                      <div>
                        <p className="text-xs text-slate-500">تاريخ الوصول</p>
                        <p className="font-medium text-emerald-600">
                          {formatDateTime(modalHistoryItem.delivered_at)}
                        </p>
                      </div>
                    )}
                    {modalHistoryItem.template_name && (
                      <div>
                        <p className="text-xs text-slate-500">القالب المستخدم</p>
                        <p className="font-medium text-slate-700">
                          {modalHistoryItem.template_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Error Message */}
              {modalHistoryItem.error_message && (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 mb-2">رسالة الخطأ</p>
                  <p className="text-sm text-rose-700 leading-relaxed">{modalHistoryItem.error_message}</p>
                </section>
              )}

              {/* Additional Metadata */}
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
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">تفاصيل إضافية</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {metadataEntries.map(([key, value], index) => {
                        const normalizedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                        return (
                          <div key={index} className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                            <p className="text-xs text-slate-500">{normalizedKey}</p>
                            <p className="text-sm font-medium text-slate-700 mt-0.5">{String(value)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

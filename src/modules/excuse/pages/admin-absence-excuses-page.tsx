import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  ChevronDown,
  Search,
  RefreshCw,
  Image,
  FileText,
  CloudUpload,
  Download,
  Plus,
  Settings,
  RotateCcw,
  History,
  Info,
  Inbox,
  Lock,
  Clock3,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ListChecks,
} from 'lucide-react'
import { CreateAdminExcuseModal } from '../components/create-admin-excuse-modal'
import { ExcuseSettingsModal } from '../components/excuse-settings-modal'
import {
  getAbsenceExcuses,
  getExcuseDetails,
  approveExcuse,
  rejectExcuse,
  reopenExcuse,
  markExcuseNoorSynced,
} from '../api'
import type { AbsenceExcuseRecord, ExcuseReviewHistoryItem } from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import {
  WsBlock,
  WsBtn,
  WsChip,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsHeader,
  WsIconBtn,
  WsInput,
  WsLayout,
  WsMain,
  WsModal,
  WsPage,
  WsSideCol,
  WsTable,
  WsTextarea,
  WsToolbar,
  type WsChipTone,
} from '@/shared/workspace'

type TabValue = 'all' | 'pending' | 'approved' | 'rejected'

const statusMap: Record<string, { label: string; tone: WsChipTone | undefined }> = {
  pending: { label: 'قيد المراجعة', tone: 'amber' },
  approved: { label: 'مقبول', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
}

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
]

function StatusChip({ status }: { status: string }) {
  const meta = statusMap[status]
  return <WsChip tone={meta?.tone}>{meta?.label || status}</WsChip>
}

export function AdminAbsenceExcusesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { token, user } = useAuthStore()
  const isPrincipal = user?.role === 'school_principal'
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedGrades, setSelectedGrades] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('excuses_selected_grades')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false)
  const gradeDropdownRef = useRef<HTMLDivElement>(null)

  // Create excuse modal
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Settings modal
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  // العذر المعروض في عمود التفاصيل
  const [selectedExcuse, setSelectedExcuse] = useState<AbsenceExcuseRecord | null>(null)

  // Approve dialog
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveMessage, setApproveMessage] = useState('')

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Reopen dialog (مدير المدرسة فقط)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  // صلاحية إعادة الفتح للعذر المعروض حالياً (تأتي من السيرفر)
  const [canReopenSelected, setCanReopenSelected] = useState(false)
  // سجل تاريخ مراجعات العذر المعروض حالياً
  const [reviewsHistory, setReviewsHistory] = useState<ExcuseReviewHistoryItem[]>([])

  // Helper function to add auth token to file URLs
  const getAuthenticatedFileUrl = useMemo(() => {
    return (fileUrl: string | null | undefined): string | null => {
      if (!fileUrl || !token) return null
      const separator = fileUrl.includes('?') ? '&' : '?'
      return `${fileUrl}${separator}token=${token}`
    }
  }, [token])

  // Query
  const excusesQuery = useQuery({
    queryKey: ['admin', 'absence-excuses', page, activeTab, searchQuery, selectedGrades],
    queryFn: () =>
      getAbsenceExcuses({
        page,
        per_page: 15,
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
        grades: selectedGrades.length > 0 ? selectedGrades : undefined,
      }),
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) => approveExcuse(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      setApproveDialogOpen(false)
      toast({ type: 'success', title: 'تم قبول العذر', description: 'تم قبول العذر بنجاح وإرسال إشعار للولي' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء قبول العذر' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectExcuse(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      setRejectDialogOpen(false)
      toast({ type: 'success', title: 'تم رفض العذر', description: 'تم رفض العذر وإرسال إشعار للولي' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء رفض العذر' })
    },
  })

  const noorSyncMutation = useMutation({
    mutationFn: (id: number) => markExcuseNoorSynced(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      toast({ type: 'success', title: 'تم التحديث', description: 'تم تسجيل مزامنة العذر مع نور' })
    },
    onError: () => {
      toast({ type: 'error', title: 'خطأ', description: 'حدث خطأ أثناء تحديث حالة المزامنة' })
    },
  })

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => reopenExcuse(id, reason),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })
      setReopenDialogOpen(false)
      setReopenReason('')
      // تحديث العذر المعروض بالبيانات الجديدة (status=pending + سجل محدث)
      if (response.data) {
        setSelectedExcuse(response.data)
        setReviewsHistory(response.data.reviews_history ?? [])
        setCanReopenSelected(false)
      }
      toast({
        type: 'success',
        title: 'تم إعادة الفتح',
        description: 'العذر الآن قيد المراجعة من جديد',
      })
    },
    onError: (error: unknown) => {
      const errorObj = error as { response?: { data?: { message?: string } } }
      const message = errorObj?.response?.data?.message ?? 'حدث خطأ أثناء إعادة فتح المراجعة'
      toast({ type: 'error', title: 'خطأ', description: message })
    },
  })

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPage(1)
  }

  // اختيار عذر لعرضه في عمود التفاصيل + جلب تفاصيله الكاملة
  const handleViewExcuse = async (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setReviewsHistory(excuse.reviews_history ?? [])
    setCanReopenSelected(false)
    try {
      const response = await getExcuseDetails(excuse.id)
      setSelectedExcuse(response.data)
      setReviewsHistory(response.data.reviews_history ?? [])
      setCanReopenSelected(Boolean(response.permissions?.can_reopen))
    } catch {
      // Keep existing data if details fetch fails
    }
  }

  const handleOpenApproveDialog = (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setApproveMessage('')
    setApproveDialogOpen(true)
  }

  const handleOpenRejectDialog = (excuse: AbsenceExcuseRecord) => {
    setSelectedExcuse(excuse)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleApprove = () => {
    if (!selectedExcuse) return
    approveMutation.mutate({ id: selectedExcuse.id, message: approveMessage || undefined })
  }

  const handleReject = () => {
    if (!selectedExcuse || !rejectReason.trim()) return
    rejectMutation.mutate({ id: selectedExcuse.id, reason: rejectReason })
  }

  const handleMarkNoorSynced = (excuse: AbsenceExcuseRecord) => {
    noorSyncMutation.mutate(excuse.id)
  }

  const handleOpenReopenDialog = () => {
    if (!selectedExcuse) return
    setReopenReason('')
    setReopenDialogOpen(true)
  }

  const handleReopen = () => {
    if (!selectedExcuse || reopenReason.trim().length < 5) return
    reopenMutation.mutate({ id: selectedExcuse.id, reason: reopenReason.trim() })
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const formatDateOnly = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return null
    if (fileType.startsWith('image/')) {
      return <Image style={{ width: 15, height: 15, color: 'var(--ws-sky)' }} />
    }
    return <FileText style={{ width: 15, height: 15, color: 'var(--ws-red)' }} />
  }

  // حفظ الصفوف المحددة في localStorage
  useEffect(() => {
    localStorage.setItem('excuses_selected_grades', JSON.stringify(selectedGrades))
  }, [selectedGrades])

  // إغلاق قائمة الصفوف عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gradeDropdownRef.current && !gradeDropdownRef.current.contains(event.target as Node)) {
        setIsGradeDropdownOpen(false)
      }
    }
    if (isGradeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isGradeDropdownOpen])

  const excuses = excusesQuery.data?.data ?? []
  const totalPages = excusesQuery.data?.meta?.last_page ?? 1
  const pendingCount = excusesQuery.data?.stats?.pending ?? 0

  // الصفوف المتاحة للفلترة - من الـ API
  const availableGrades = useMemo(() => {
    const apiGrades = excusesQuery.data?.available_grades ?? []
    // إضافة الصفوف المحددة التي قد لا تكون في النتائج
    const allGrades = new Set([...apiGrades, ...selectedGrades])
    return Array.from(allGrades).sort()
  }, [excusesQuery.data?.available_grades, selectedGrades])

  return (
    <WsPage>
      <WsHeader
        title="أعذار الغياب"
        badge="مراجعة الأعذار"
        actions={
          <>
            <WsBtn icon={Settings} onClick={() => setSettingsModalOpen(true)}>
              الإعدادات
            </WsBtn>
            <WsBtn
              icon={RefreshCw}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'absence-excuses'] })}
            >
              تحديث
            </WsBtn>
            <WsBtn variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
              إضافة عذر
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={Clock3} label="قيد المراجعة:">
              {Number(pendingCount).toLocaleString('ar-SA')}
            </WsFact>
            <WsFact icon={FileText} label="نتائج الصفحة:">
              {excuses.length.toLocaleString('ar-SA')}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        {/* تبويبات الحالة كشرائح مدمجة */}
        <div className="ws-seg" style={{ alignSelf: 'flex-end' }}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`ws-seg__btn ${activeTab === tab.value ? 'is-active' : ''}`}
            >
              {tab.label}
              {tab.value === 'pending' && pendingCount ? <span className="ws-count">{pendingCount}</span> : null}
            </button>
          ))}
        </div>

        <div className="ws-field ws-field--grow">
          <label className="ws-label" htmlFor="ws-excuse-search">
            بحث باسم الطالب أو رقم الهوية
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <WsInput
              id="ws-excuse-search"
              type="search"
              placeholder="بحث..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1 }}
            />
            <WsBtn icon={Search} onClick={handleSearch}>
              بحث
            </WsBtn>
          </div>
        </div>

        {/* فلتر الصف - متعدد الاختيار */}
        <div style={{ position: 'relative', alignSelf: 'flex-end' }} ref={gradeDropdownRef}>
          <WsBtn onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}>
            {selectedGrades.length === 0 ? 'جميع الصفوف' : `${selectedGrades.length} صف محدد`}
            <ChevronDown style={{ transform: isGradeDropdownOpen ? 'rotate(180deg)' : undefined }} />
          </WsBtn>
          {isGradeDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                insetInlineEnd: 0,
                marginTop: 4,
                minWidth: 200,
                maxHeight: 260,
                overflowY: 'auto',
                background: 'var(--ws-surface)',
                border: '1px solid var(--ws-border)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 40,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px 6px',
                  borderBottom: '1px solid var(--ws-hairline)',
                }}
              >
                <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{availableGrades.length} صف</span>
                <WsBtn size="sm" onClick={() => setSelectedGrades([])}>
                  إلغاء التحديد
                </WsBtn>
              </div>
              {availableGrades.map((grade) => (
                <label key={grade} className={`ws-pick ${selectedGrades.includes(grade) ? 'is-checked' : ''}`}>
                  <span className="ws-pick__name">{grade}</span>
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(grade)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGrades((prev) => [...prev, grade])
                      } else {
                        setSelectedGrades((prev) => prev.filter((g) => g !== grade))
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* شارات الصفوف المحددة */}
        {selectedGrades.map((grade) => (
          <WsChip key={grade} tone="green" style={{ alignSelf: 'flex-end', marginBottom: 5 }}>
            {grade}
            <button
              type="button"
              onClick={() => setSelectedGrades((prev) => prev.filter((g) => g !== grade))}
              style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
              title="إزالة"
            >
              <X style={{ width: 10, height: 10 }} />
            </button>
          </WsChip>
        ))}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock title="الأعذار" icon={FileText} count={excuses.length.toLocaleString('ar-SA')} fill>
            {excusesQuery.isLoading ? (
              <WsEmpty loading>جاري تحميل الأعذار...</WsEmpty>
            ) : excuses.length === 0 ? (
              <WsEmpty icon={Inbox}>لا توجد أعذار.</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>تاريخ الغياب</th>
                    <th>تاريخ التقديم</th>
                    <th>الحالة</th>
                    <th>مرفق</th>
                    <th>نور</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {excuses.map((excuse) => {
                    const isSelected = excuse.id === selectedExcuse?.id
                    return (
                      <tr
                        key={excuse.id}
                        onClick={() => handleViewExcuse(excuse)}
                        className={`is-clickable ${isSelected ? 'is-selected' : ''}`}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{excuse.student?.name || '-'}</span>
                          <span className="ws-cell-sub">
                            {excuse.student?.grade && excuse.student?.class_name
                              ? `${excuse.student.grade} • ${excuse.student.class_name}`
                              : excuse.student?.grade || excuse.student?.class_name || ''}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {excuse.absence_date ? new Date(excuse.absence_date).toLocaleDateString('ar-SA') : '-'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(excuse.created_at)}</td>
                        <td>
                          <StatusChip status={excuse.status} />
                        </td>
                        <td>{excuse.file_url ? getFileIcon(excuse.file_type) : <span style={{ color: 'var(--ws-text-2)' }}>—</span>}</td>
                        <td>
                          {excuse.status === 'approved' &&
                            (excuse.noor_synced ? (
                              <WsChip tone="green" icon={Check}>
                                تمت المزامنة
                              </WsChip>
                            ) : (
                              <WsChip>لم تتم</WsChip>
                            ))}
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <span style={{ display: 'inline-flex', gap: 2 }}>
                            {excuse.status === 'pending' && (
                              <>
                                <WsIconBtn
                                  icon={Check}
                                  label="قبول"
                                  style={{ color: 'var(--ws-green)' }}
                                  onClick={() => handleOpenApproveDialog(excuse)}
                                />
                                <WsIconBtn
                                  icon={X}
                                  label="رفض"
                                  style={{ color: 'var(--ws-red)' }}
                                  onClick={() => handleOpenRejectDialog(excuse)}
                                />
                              </>
                            )}
                            {excuse.status === 'approved' && !excuse.noor_synced && (
                              <WsIconBtn
                                icon={CloudUpload}
                                label="تم رفعه على نور"
                                style={{ color: 'var(--ws-sky)' }}
                                onClick={() => handleMarkNoorSynced(excuse)}
                                disabled={noorSyncMutation.isPending}
                              />
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}

            {/* ترقيم الصفحات */}
            {totalPages > 1 && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderTop: '1px solid var(--ws-hairline)',
                }}
              >
                <WsBtn size="sm" icon={ChevronRight} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  السابق
                </WsBtn>
                <span style={{ fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                  صفحة {page} من {totalPages}
                </span>
                <WsBtn
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  التالي
                </WsBtn>
              </div>
            )}
          </WsBlock>
        </WsMain>

        {/* عمود تفاصيل العذر — بدل المودال */}
        <WsSideCol title="تفاصيل العذر" icon={ListChecks} storageKey="ws:absence-excuses:sidecol" width={360}>
          {selectedExcuse ? (
            <div className="ws-sidecol__scroll">
              <WsBlock padded>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{selectedExcuse.student?.name || '-'}</span>
                  <StatusChip status={selectedExcuse.status} />
                </div>
                <WsFactsList>
                  <WsFactRow label="رقم الهوية">{selectedExcuse.student?.national_id || '—'}</WsFactRow>
                  <WsFactRow label="تاريخ الغياب">{formatDateOnly(selectedExcuse.absence_date)}</WsFactRow>
                  <WsFactRow label="تاريخ التقديم">{formatDate(selectedExcuse.created_at)}</WsFactRow>
                  {selectedExcuse.reviewed_at && (
                    <>
                      <WsFactRow label="روجع بواسطة">{selectedExcuse.reviewer?.name || '—'}</WsFactRow>
                      <WsFactRow label="تاريخ المراجعة">{formatDate(selectedExcuse.reviewed_at)}</WsFactRow>
                    </>
                  )}
                </WsFactsList>

                {selectedExcuse.status === 'approved' && (
                  <div style={{ marginTop: 8 }}>
                    {selectedExcuse.noor_synced ? (
                      <WsChip tone="green" icon={Check}>
                        تمت مزامنة نور {selectedExcuse.noor_synced_at ? `— ${formatDate(selectedExcuse.noor_synced_at)}` : ''}
                      </WsChip>
                    ) : (
                      <WsChip>لم تتم مزامنة نور</WsChip>
                    )}
                  </div>
                )}

                {/* الإجراءات */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {selectedExcuse.status === 'pending' && (
                    <>
                      <WsBtn
                        variant="primary"
                        icon={CheckCircle2}
                        onClick={() => handleOpenApproveDialog(selectedExcuse)}
                        style={{ flex: 1 }}
                      >
                        قبول
                      </WsBtn>
                      <WsBtn
                        variant="danger"
                        icon={XCircle}
                        onClick={() => handleOpenRejectDialog(selectedExcuse)}
                        style={{ flex: 1 }}
                      >
                        رفض
                      </WsBtn>
                    </>
                  )}
                  {selectedExcuse.status === 'approved' && !selectedExcuse.noor_synced && (
                    <WsBtn
                      variant="primary"
                      icon={CloudUpload}
                      onClick={() => handleMarkNoorSynced(selectedExcuse)}
                      disabled={noorSyncMutation.isPending}
                      style={{ flex: 1 }}
                    >
                      تم رفعه على نور
                    </WsBtn>
                  )}
                  {isPrincipal &&
                    selectedExcuse.status !== 'pending' &&
                    (canReopenSelected ? (
                      <WsBtn icon={RotateCcw} onClick={handleOpenReopenDialog} style={{ flex: 1 }}>
                        إعادة فتح المراجعة
                      </WsBtn>
                    ) : selectedExcuse.noor_synced ? (
                      <WsChip icon={Lock} title="لا يمكن إعادة الفتح بعد المزامنة مع نور">
                        مؤمَّن بعد مزامنة نور
                      </WsChip>
                    ) : null)}
                </div>
              </WsBlock>

              <WsBlock title="نص العذر" padded>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedExcuse.excuse_text || 'لم يتم إدخال نص'}
                </p>
              </WsBlock>

              {selectedExcuse.status === 'approved' && selectedExcuse.response_message && (
                <WsBlock title="رسالة الموافقة" padded style={{ background: 'var(--ws-green-bg)' }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7 }}>{selectedExcuse.response_message}</p>
                </WsBlock>
              )}

              {selectedExcuse.status === 'rejected' && (selectedExcuse.review_notes || selectedExcuse.response_message) && (
                <WsBlock title="سبب الرفض" padded style={{ background: 'var(--ws-red-bg)' }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7 }}>
                    {selectedExcuse.review_notes || selectedExcuse.response_message}
                  </p>
                </WsBlock>
              )}

              {selectedExcuse.file_url && (
                <WsBlock
                  title="الملف المرفق"
                  padded
                  tools={
                    <a
                      href={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ws-btn ws-btn--sm"
                      style={{ textDecoration: 'none' }}
                    >
                      <Download />
                      تحميل
                    </a>
                  }
                >
                  {selectedExcuse.file_type?.startsWith('image/') && (
                    <a
                      href={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? ''}
                        alt="صورة العذر"
                        style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid var(--ws-hairline)' }}
                      />
                    </a>
                  )}
                  {selectedExcuse.file_type === 'application/pdf' && (
                    <iframe
                      src={getAuthenticatedFileUrl(selectedExcuse.file_url) ?? ''}
                      title="ملف العذر PDF"
                      style={{ width: '100%', height: 260, borderRadius: 8, border: '1px solid var(--ws-hairline)' }}
                    />
                  )}
                </WsBlock>
              )}

              {/* سجل تاريخ المراجعات */}
              {reviewsHistory.length > 0 && (
                <WsBlock title="سجل المراجعات" icon={History} count={reviewsHistory.length} padded>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {reviewsHistory.map((entry, idx) => {
                      const toneMap: Record<string, { dot: string; tone: WsChipTone | undefined }> = {
                        approved: { dot: 'var(--ws-green)', tone: 'green' },
                        rejected: { dot: 'var(--ws-red)', tone: 'red' },
                        reopened: { dot: 'var(--ws-sky)', tone: 'sky' },
                      }
                      const colors = toneMap[entry.action] ?? { dot: 'var(--ws-text-2)', tone: undefined }
                      const isLast = idx === reviewsHistory.length - 1
                      return (
                        <div key={entry.id} style={{ display: 'flex', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: colors.dot,
                                marginTop: 4,
                                flexShrink: 0,
                              }}
                            />
                            {!isLast && <span style={{ width: 1, flex: 1, background: 'var(--ws-hairline)', marginTop: 2 }} />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <WsChip tone={colors.tone}>{entry.action_label}</WsChip>
                              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>{formatDate(entry.performed_at)}</span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                              بواسطة <b style={{ color: 'var(--ws-text)' }}>{entry.performer?.name ?? 'غير معروف'}</b>
                            </p>
                            {entry.notes && (
                              <p
                                style={{
                                  margin: '4px 0 0',
                                  fontSize: 11.5,
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap',
                                  padding: '5px 8px',
                                  background: 'var(--ws-surface-2)',
                                  border: '1px solid var(--ws-hairline)',
                                  borderRadius: 7,
                                }}
                              >
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </WsBlock>
              )}
            </div>
          ) : (
            <WsEmpty icon={Info}>اختر عذراً من الجدول لعرض تفاصيله ومراجعته هنا.</WsEmpty>
          )}
        </WsSideCol>
      </WsLayout>

      {/* Approve Dialog */}
      {selectedExcuse && (
        <WsModal
          open={approveDialogOpen}
          onClose={() => !approveMutation.isPending && setApproveDialogOpen(false)}
          title="قبول العذر"
          sub={`هل أنت متأكد من قبول عذر الطالب ${selectedExcuse.student?.name}؟`}
          footer={
            <>
              <WsBtn onClick={() => setApproveDialogOpen(false)} disabled={approveMutation.isPending}>
                إلغاء
              </WsBtn>
              <WsBtn variant="primary" icon={Check} onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? 'جاري القبول...' : 'قبول العذر'}
              </WsBtn>
            </>
          }
        >
          <div className="flex flex-col gap-1.5">
            <label className="ws-label" htmlFor="ws-approve-message">
              رسالة للولي (اختياري)
            </label>
            <WsTextarea
              id="ws-approve-message"
              value={approveMessage}
              onChange={(e) => setApproveMessage(e.target.value)}
              placeholder="يمكنك إضافة رسالة ستُرسل لولي الأمر..."
              rows={3}
            />
          </div>
        </WsModal>
      )}

      {/* Reject Dialog */}
      {selectedExcuse && (
        <WsModal
          open={rejectDialogOpen}
          onClose={() => !rejectMutation.isPending && setRejectDialogOpen(false)}
          title="رفض العذر"
          sub={`هل أنت متأكد من رفض عذر الطالب ${selectedExcuse.student?.name}؟`}
          footer={
            <>
              <WsBtn onClick={() => setRejectDialogOpen(false)} disabled={rejectMutation.isPending}>
                إلغاء
              </WsBtn>
              <WsBtn
                variant="danger"
                icon={X}
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                {rejectMutation.isPending ? 'جاري الرفض...' : 'رفض العذر'}
              </WsBtn>
            </>
          }
        >
          <div className="flex flex-col gap-1.5">
            <label className="ws-label" htmlFor="ws-reject-reason">
              سبب الرفض <span style={{ color: 'var(--ws-red)' }}>*</span>
            </label>
            <WsTextarea
              id="ws-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="يرجى كتابة سبب الرفض..."
              rows={3}
              style={!rejectReason.trim() ? { borderColor: 'var(--ws-red)' } : undefined}
            />
            {!rejectReason.trim() && (
              <span style={{ fontSize: 11, color: 'var(--ws-red)', fontWeight: 600 }}>سبب الرفض مطلوب</span>
            )}
          </div>
        </WsModal>
      )}

      {/* Reopen Dialog (مدير المدرسة فقط) */}
      {selectedExcuse && (
        <WsModal
          open={reopenDialogOpen}
          onClose={() => !reopenMutation.isPending && setReopenDialogOpen(false)}
          title="إعادة فتح المراجعة"
          sub={`سيُرجَع عذر ${selectedExcuse.student?.name} إلى حالة «قيد المراجعة» ويُحفظ القرار السابق في سجل التاريخ.`}
          footer={
            <>
              <WsBtn onClick={() => setReopenDialogOpen(false)} disabled={reopenMutation.isPending}>
                إلغاء
              </WsBtn>
              <WsBtn
                variant="primary"
                icon={RotateCcw}
                onClick={handleReopen}
                disabled={reopenMutation.isPending || reopenReason.trim().length < 5}
              >
                {reopenMutation.isPending ? 'جاري إعادة الفتح...' : 'تأكيد إعادة الفتح'}
              </WsBtn>
            </>
          }
        >
          <div className="flex flex-col gap-1.5">
            <label className="ws-label" htmlFor="ws-reopen-reason">
              سبب إعادة الفتح <span style={{ color: 'var(--ws-red)' }}>*</span>
            </label>
            <WsTextarea
              id="ws-reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="مثال: تبيّن أن العذر صحيح بعد مراجعة المستندات الإضافية..."
              rows={4}
              maxLength={500}
              style={reopenReason.trim().length < 5 ? { borderColor: 'var(--ws-red)' } : undefined}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: reopenReason.trim().length < 5 ? 'var(--ws-red)' : 'var(--ws-text-2)', fontWeight: 600 }}>
                {reopenReason.trim().length < 5 ? 'الحد الأدنى 5 أحرف' : 'سبب موثَّق'}
              </span>
              <span style={{ color: 'var(--ws-text-2)' }}>{reopenReason.length}/500</span>
            </div>
          </div>
        </WsModal>
      )}

      {/* Create Admin Excuse Modal */}
      <CreateAdminExcuseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Settings Modal */}
      <ExcuseSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </WsPage>
  )
}

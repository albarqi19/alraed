import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { MessageSquare, School, Calendar, CheckCheck, ExternalLink, Inbox, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
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
  WsPage,
  WsSelect,
  WsSideCol,
  WsToolbar,
} from '@/shared/workspace'

interface ParentReply {
  id: number
  type: 'referral' | 'teacher_message'
  type_label: string
  student_name: string
  student_grade: string
  student_class: string
  source_title: string
  source_id: number
  sent_message: string | null
  reply_text: string
  replied_at: string
  replied_at_formatted: string
  is_read: boolean
  read_at: string | null
  receiver_name: string
}

interface ParentRepliesStats {
  total: number
  unread: number
  referral: { total: number; unread: number }
  teacher_message: { total: number; unread: number }
}

interface ParentRepliesResponse {
  success: boolean
  data: ParentReply[]
  stats: ParentRepliesStats
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export function AdminParentRepliesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'all' | 'referral' | 'teacher_message'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedReply, setSelectedReply] = useState<ParentReply | null>(null)

  // جلب خيارات الفلاتر (الصفوف وفصولُ كلِّ صفّ)
  const { data: filterOptions } = useQuery<{
    success: boolean
    data: { grades: string[]; grades_with_classes?: { grade: string; classes: string[] }[]; classes: string[] }
  }>({
    queryKey: ['parent-replies-filter-options'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/parent-replies/filter-options')
      return response.data
    },
  })

  /**
   * فصولُ الصفِّ المختار وحدَه.
   *
   * `class_name` رقمٌ مجرَّد يعيد كلُّ صفٍّ استعمالَه، فالقائمةُ المسطَّحة
   * القديمة كانت خمسةَ أرقامٍ تخصُّ ستّةَ صفوف: يختار المشرفُ «1» بلا صفٍّ
   * فتجتمع أمامه ردودُ أوّلِ ابتدائيٍّ وسادسِه.
   */
  const classOptions = useMemo(() => {
    if (gradeFilter === 'all') return [] as string[]
    return filterOptions?.data.grades_with_classes?.find((entry) => entry.grade === gradeFilter)?.classes ?? []
  }, [filterOptions, gradeFilter])

  /**
   * تغييرُ الصفِّ يصفّر الفصل.
   *
   * وهذا العطلُ كان أخطرَ من خلطِ الصفوف: من رشّح «الأول · 5» ثم انتقل إلى
   * «الثالث» — ولا فصلَ خامسَ فيه — بقي «5» عالقاً في الطلب، فتُخفى عنه ردودٌ
   * موجودةٌ وتبدو الشاشةُ فارغةً بلا سبب. ردُّ وليِّ أمرٍ لا يُقرأ لأنّ فلتراً
   * منسيّاً يحجبه.
   */
  const handleGradeChange = (value: string) => {
    setGradeFilter(value)
    setClassFilter('all')
  }

  const { data, isLoading, error } = useQuery<ParentRepliesResponse>({
    queryKey: ['parent-replies', activeTab, statusFilter, gradeFilter, classFilter, searchQuery],
    queryFn: async () => {
      const response = await apiClient.get<ParentRepliesResponse>('/admin/parent-replies', {
        params: {
          type: activeTab,
          status: statusFilter,
          grade: gradeFilter !== 'all' ? gradeFilter : undefined,
          class_name: classFilter !== 'all' ? classFilter : undefined,
          search: searchQuery || undefined,
        }
      })
      return response.data
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: (reply: ParentReply) =>
      apiClient.post(`/admin/parent-replies/${reply.type}/${reply.id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-replies'] })
      toast.success('تم تحديد الرد كمقروء')
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث حالة الرد')
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ message: string }>('/admin/parent-replies/mark-all-read', { type: activeTab })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parent-replies'] })
      toast.success(data.message)
    },
    onError: () => {
      toast.error('حدث خطأ')
    }
  })

  const handleReplyClick = (reply: ParentReply) => {
    setSelectedReply(reply)
    if (!reply.is_read) {
      markAsReadMutation.mutate(reply)
    }
  }

  const stats = data?.stats

  const tabs: Array<{ key: 'all' | 'referral' | 'teacher_message'; label: string; count?: number; unread?: number }> = [
    { key: 'all', label: 'الكل', count: stats?.total, unread: stats?.unread },
    { key: 'referral', label: 'الإحالات', count: stats?.referral.total, unread: stats?.referral.unread },
    { key: 'teacher_message', label: 'رسائل المعلمين', count: stats?.teacher_message.total, unread: stats?.teacher_message.unread },
  ]

  return (
    <WsPage>
      <WsHeader
        title="ردود أولياء الأمور"
        badge="الوارد"
        actions={
          stats && stats.unread > 0 ? (
            <WsBtn icon={CheckCheck} onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}>
              {markAllAsReadMutation.isPending ? 'جارٍ التحديث...' : 'تحديد الكل كمقروء'}
            </WsBtn>
          ) : undefined
        }
        facts={
          <>
            <WsFact icon={Inbox} label="إجمالي الردود:">
              {(stats?.total ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={School} label="الإحالات:">
              {(stats?.referral.total ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
            <WsFact icon={MessageSquare} label="رسائل المعلمين:">
              {(stats?.teacher_message.total ?? 0).toLocaleString('ar-SA-u-nu-latn')}
            </WsFact>
          </>
        }
      >
        {stats && stats.unread > 0 ? (
          <WsChip tone="sky">
            <span className="ws-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ws-sky)' }} />
            {stats.unread.toLocaleString('ar-SA-u-nu-latn')} غير مقروء
          </WsChip>
        ) : null}
      </WsHeader>

      <WsToolbar>
        <WsField label="بحث" htmlFor="replies-search" grow>
          <WsInput
            id="replies-search"
            type="text"
            placeholder="بحث باسم الطالب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </WsField>
        <WsField label="حالة القراءة" htmlFor="replies-status">
          <WsSelect id="replies-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">الكل</option>
            <option value="unread">غير مقروء</option>
            <option value="read">مقروء</option>
          </WsSelect>
        </WsField>
        <WsField label="الصف" htmlFor="replies-grade">
          <WsSelect id="replies-grade" value={gradeFilter} onChange={(e) => handleGradeChange(e.target.value)}>
            <option value="all">الكل</option>
            {filterOptions?.data.grades.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </WsSelect>
        </WsField>
        {/* الفصلُ لا يظهر إلّا بعد الصف: رقمُه وحدَه لا يدلّ على أحد */}
        {gradeFilter !== 'all' ? (
          <WsField label="الفصل" htmlFor="replies-class">
            <WsSelect
              id="replies-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={classOptions.length === 0}
            >
              <option value="all">جميع فصول {gradeFilter}</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>فصل {className}</option>
              ))}
            </WsSelect>
          </WsField>
        ) : null}
      </WsToolbar>

      <WsLayout>
        {/* العمود الأيمن: صندوق الوارد */}
        <WsSideCol title="الوارد" icon={Inbox} side="start" width={330} storageKey="ws:parent-replies:inbox">
          <div style={{ flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
            <div className="ws-seg" style={{ display: 'flex' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {tab.label}
                  {tab.unread && tab.unread > 0 ? <span className="ws-count">{tab.unread}</span> : null}
                </button>
              ))}
            </div>
          </div>

          <WsBlock fill scroll count={data?.data.length.toLocaleString('ar-SA-u-nu-latn')} title="الردود">
            {isLoading ? (
              <WsEmpty loading>جاري تحميل الردود...</WsEmpty>
            ) : error ? (
              <WsEmpty icon={Inbox}>حدث خطأ في تحميل البيانات.</WsEmpty>
            ) : data?.data.length === 0 ? (
              <WsEmpty icon={MessageSquare}>لا توجد ردود بالمعايير الحالية.</WsEmpty>
            ) : (
              <div>
                {data?.data.map((reply) => {
                  const isSelected = selectedReply?.id === reply.id && selectedReply?.type === reply.type
                  return (
                    <button
                      key={`${reply.type}-${reply.id}`}
                      type="button"
                      onClick={() => handleReplyClick(reply)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'right',
                        padding: '9px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--ws-hairline)',
                        background: isSelected
                          ? 'var(--ws-accent-soft)'
                          : reply.is_read
                            ? 'transparent'
                            : 'var(--ws-sky-bg)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {!reply.is_read && (
                          <span
                            className="ws-pulse"
                            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ws-sky)', flexShrink: 0 }}
                          />
                        )}
                        <span style={{ fontSize: 12.5, fontWeight: reply.is_read ? 600 : 800, color: 'var(--ws-text)', minWidth: 0 }}>
                          {reply.student_name}
                        </span>
                        <WsChip tone={reply.type === 'referral' ? 'sky' : 'green'}>{reply.type_label}</WsChip>
                      </span>
                      <span className="ws-cell-sub" style={{ display: 'block', marginTop: 3 }}>
                        {reply.source_title}
                        {reply.type === 'teacher_message' && reply.receiver_name ? ` — ${reply.receiver_name}` : ''}
                      </span>
                      <span className="ws-cell-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Calendar style={{ width: 10, height: 10 }} />
                        {reply.replied_at_formatted}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        {/* الوسط: المحادثة */}
        <WsMain>
          <WsBlock
            title={selectedReply ? `رد ولي أمر: ${selectedReply.student_name}` : 'تفاصيل الرد'}
            icon={MessageSquare}
            tools={
              selectedReply?.type === 'referral' && selectedReply.source_id ? (
                <Link to={`/admin/referrals/${selectedReply.source_id}`} className="ws-btn ws-btn--sm">
                  <ExternalLink style={{ width: 12, height: 12 }} />
                  عرض الإحالة
                </Link>
              ) : undefined
            }
            fill
            scroll
          >
            {!selectedReply ? (
              <WsEmpty icon={MessageSquare}>اختر رداً من الوارد على اليمين لعرض المحادثة كاملة.</WsEmpty>
            ) : (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
                {/* بطاقة الطالب */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderRadius: 10,
                    border: '1px solid var(--ws-hairline)',
                    background: 'var(--ws-surface-2)',
                    padding: '10px 12px',
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'var(--ws-accent-soft)',
                      color: 'var(--ws-accent-2)',
                      flexShrink: 0,
                    }}
                  >
                    <UserRound style={{ width: 17, height: 17 }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{selectedReply.student_name}</span>
                    <span className="ws-cell-sub">
                      {selectedReply.student_grade} - {selectedReply.student_class}
                    </span>
                  </span>
                  <span style={{ marginInlineStart: 'auto' }}>
                    <WsChip tone={selectedReply.type === 'referral' ? 'sky' : 'green'}>{selectedReply.type_label}</WsChip>
                  </span>
                </div>

                {/* المحادثة */}
                <div
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--ws-hairline)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background:
                      'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 0 2px, transparent 2px) 0 0 / 26px 26px, var(--ws-surface-2)',
                  }}
                >
                  {selectedReply.sent_message && (
                    <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 3, textAlign: 'left' }}>
                        رسالة المدرسة — {selectedReply.receiver_name}
                      </div>
                      <div
                        style={{
                          borderRadius: '10px 2px 10px 10px',
                          background: '#D5F5DF',
                          color: '#12261A',
                          padding: '9px 11px',
                          fontSize: 12,
                          lineHeight: 1.9,
                          whiteSpace: 'pre-wrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        }}
                      >
                        {selectedReply.sent_message}
                        <span
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 3,
                            marginTop: 4,
                            fontSize: 9,
                            color: '#5a7a66',
                          }}
                        >
                          <CheckCheck style={{ width: 12, height: 12, color: '#4FA3DE' }} />
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--ws-text-2)', marginBottom: 3 }}>
                      رد ولي الأمر — {selectedReply.replied_at_formatted}
                    </div>
                    <div
                      style={{
                        borderRadius: '2px 10px 10px 10px',
                        background: 'var(--ws-surface)',
                        border: '1px solid var(--ws-hairline)',
                        color: 'var(--ws-text)',
                        padding: '9px 11px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        lineHeight: 1.9,
                        whiteSpace: 'pre-wrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      }}
                    >
                      {selectedReply.reply_text}
                    </div>
                  </div>
                </div>

                {/* البيانات الوصفية */}
                <WsFactsList>
                  <WsFactRow label="بخصوص">{selectedReply.source_title}</WsFactRow>
                  <WsFactRow label="المستلم">{selectedReply.receiver_name}</WsFactRow>
                  <WsFactRow label="وقت الرد">{selectedReply.replied_at_formatted}</WsFactRow>
                  {selectedReply.read_at && (
                    <WsFactRow label="تمت القراءة">{new Date(selectedReply.read_at).toLocaleString('ar-SA-u-nu-latn')}</WsFactRow>
                  )}
                </WsFactsList>
              </div>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}

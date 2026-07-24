import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  HeartPulse,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  StickyNote,
  Tag,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  WsIconBtn,
  WsInput,
  WsTextarea,
  WsField,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
} from '@/shared/workspace'
import { useAdminGuidanceCase, useAdminGuidanceCaseMutations } from '../api/guidance-hooks'
import { TONES, STATUS_META, categoryTone, ToneChip, SeverityBadge, InitialAvatar, type Tone } from './student-cases-ui'

type CaseStatus = 'open' | 'in_progress' | 'on_hold' | 'closed'
type Severity = 'low' | 'medium' | 'high' | 'critical'

const ACTION_TYPES = [
  'اتصال هاتفي',
  'اجتماع مع الطالب',
  'اجتماع مع ولي الأمر',
  'إحالة للأخصائي',
  'إحالة للإدارة',
  'متابعة',
  'ملاحظة',
  'أخرى',
]

/* لكل نوع إجراء أيقونة ولون من اللوحة المعتمدة — تُلوّن عقد التايم لاين */
const ACTION_META: Record<string, { icon: LucideIcon; tone: Tone }> = {
  'اتصال هاتفي': { icon: Phone, tone: TONES.sky },
  'اجتماع مع الطالب': { icon: UserRound, tone: TONES.purple },
  'اجتماع مع ولي الأمر': { icon: Users, tone: TONES.amber },
  'إحالة للأخصائي': { icon: HeartPulse, tone: TONES.red },
  'إحالة للإدارة': { icon: Building2, tone: TONES.purple },
  متابعة: { icon: CalendarClock, tone: TONES.green },
  ملاحظة: { icon: StickyNote, tone: TONES.amber },
  أخرى: { icon: MoreHorizontal, tone: TONES.gray },
}

const actionMeta = (type: string) => ACTION_META[type] ?? { icon: Zap, tone: TONES.gray }

const DAY_MS = 86_400_000

export function AdminStudentCaseDetailsPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { data: caseData, isLoading, error } = useAdminGuidanceCase(caseId ? Number(caseId) : null)
  const { closeCase, reopenCase, deleteCase, addAction, addFollowup, updateFollowupStatus, uploadDocument } = useAdminGuidanceCaseMutations()

  type CaseDetailsTabKey = 'overview' | 'actions' | 'followups' | 'documents'

  const [activeTab, setActiveTab] = useState<CaseDetailsTabKey>('overview')
  const [showActionForm, setShowActionForm] = useState(false)
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [showDocumentForm, setShowDocumentForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Action Form State
  const [actionType, setActionType] = useState('')
  const [actionNotes, setActionNotes] = useState('')

  // Followup Form State
  const [followupTitle, setFollowupTitle] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupDate, setFollowupDate] = useState('')

  // Document Form State
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentDescription, setDocumentDescription] = useState('')

  if (isLoading) {
    return (
      <WsPage>
        <WsHeader title="تفاصيل الحالة" />
        <WsBlock fill>
          <WsEmpty loading>جاري التحميل...</WsEmpty>
        </WsBlock>
      </WsPage>
    )
  }

  if (error || !caseData) {
    return (
      <WsPage>
        <WsHeader
          title="تفاصيل الحالة"
          actions={<WsBtn icon={ArrowRight} onClick={() => navigate('/admin/student-cases')}>العودة للقائمة</WsBtn>}
        />
        <WsBlock fill padded>
          <WsAlert tone="error" boxed>لم يتم العثور على الحالة المطلوبة</WsAlert>
        </WsBlock>
      </WsPage>
    )
  }

  const handleCloseCase = async () => {
    if (confirm('هل أنت متأكد من إغلاق هذه الحالة؟')) {
      await closeCase.mutateAsync(caseData.id)
    }
  }

  const handleReopenCase = async () => {
    await reopenCase.mutateAsync(caseData.id)
  }

  const handleDeleteCase = async () => {
    if (deleteConfirm) {
      try {
        await deleteCase.mutateAsync(caseData.id)
        navigate('/admin/student-cases')
      } catch (error) {
        console.error('Failed to delete case:', error)
      }
    } else {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
    }
  }

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionType || !actionNotes) return

    try {
      await addAction.mutateAsync({
        caseId: caseData.id,
        payload: { action_type: actionType, notes: actionNotes },
      })
      setActionType('')
      setActionNotes('')
      setShowActionForm(false)
    } catch (error) {
      console.error('Failed to add action:', error)
    }
  }

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!followupTitle || !followupDate) return

    try {
      await addFollowup.mutateAsync({
        caseId: caseData.id,
        payload: {
          title: followupTitle,
          scheduled_for: followupDate,
          notes: followupNotes,
          status: 'pending',
        },
      })
      setFollowupTitle('')
      setFollowupNotes('')
      setFollowupDate('')
      setShowFollowupForm(false)
    } catch (error) {
      console.error('Failed to add followup:', error)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documentFile) return

    try {
      await uploadDocument.mutateAsync({
        caseId: caseData.id,
        file: documentFile,
        description: documentDescription,
      })
      setDocumentFile(null)
      setDocumentDescription('')
      setShowDocumentForm(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
    }
  }

  const handleCompleteFollowup = async (followupId: number) => {
    await updateFollowupStatus.mutateAsync({
      caseId: caseData.id,
      followupId,
      payload: { status: 'completed' },
    })
  }

  const statusMeta = STATUS_META[caseData.status as CaseStatus] ?? STATUS_META.open
  const catTone = categoryTone(caseData.category)

  const actionsCount = caseData.actions?.length || 0
  const followupsCount = caseData.followups?.length || 0
  const documentsCount = caseData.documents?.length || 0
  const overdueCount = caseData.followups?.filter(
    (f) => f.status === 'pending' && new Date(f.scheduled_for).getTime() < Date.now(),
  ).length ?? 0

  const caseAgeDays = Math.max(1, Math.ceil((Date.now() - new Date(caseData.opened_at).getTime()) / DAY_MS))

  const lastAction = actionsCount > 0 ? caseData.actions![actionsCount - 1] : null
  const nextFollowup = caseData.followups
    ? [...caseData.followups]
        .filter((f) => f.status === 'pending')
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0] ?? null
    : null

  const tabs: Array<{ key: CaseDetailsTabKey; label: string; icon: LucideIcon; count: number | null }> = [
    { key: 'overview', label: 'نظرة عامة', icon: FileText, count: null },
    { key: 'actions', label: 'الإجراءات', icon: Zap, count: actionsCount },
    { key: 'followups', label: 'المتابعات', icon: CalendarClock, count: followupsCount },
    { key: 'documents', label: 'المستندات', icon: Paperclip, count: documentsCount },
  ]

  return (
    <WsPage>
      <WsHeader
        title={caseData.title}
        badge={caseData.case_number}
        actions={
          <>
            <WsIconBtn icon={ArrowRight} label="العودة للقائمة" onClick={() => navigate('/admin/student-cases')} />
            <WsBtn icon={Pencil} onClick={() => navigate(`/admin/student-cases/${caseData.id}/edit`)}>تعديل</WsBtn>
            {caseData.status !== 'closed' ? (
              <WsBtn variant="primary" icon={CheckCircle2} onClick={handleCloseCase} disabled={closeCase.isPending}>
                إغلاق الحالة
              </WsBtn>
            ) : (
              <WsBtn icon={RotateCcw} onClick={handleReopenCase} disabled={reopenCase.isPending}>
                إعادة فتح
              </WsBtn>
            )}
            <WsBtn
              variant={deleteConfirm ? 'danger' : undefined}
              icon={Trash2}
              onClick={handleDeleteCase}
              style={!deleteConfirm ? { color: TONES.red.tx } : undefined}
            >
              {deleteConfirm ? 'تأكيد الحذف' : 'حذف'}
            </WsBtn>
          </>
        }
        facts={
          <>
            <WsFact icon={UserRound} label="الطالب">{caseData.student.name}</WsFact>
            <WsFact icon={Tag} label="التصنيف">
              <span style={{ color: catTone.tx }}>{caseData.category}</span>
            </WsFact>
            <WsFact icon={Clock} label="عمر الحالة">{caseAgeDays} يوم</WsFact>
            <WsFact icon={Zap} label="إجراءات">{actionsCount}</WsFact>
            <WsFact icon={CalendarClock} label="متابعات">{followupsCount}</WsFact>
            {overdueCount > 0 && (
              <WsFact icon={CalendarClock} label="متأخرة">
                <span className="ws-soft-pulse" style={{ color: TONES.red.tx }}>{overdueCount}</span>
              </WsFact>
            )}
          </>
        }
      >
        <ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip>
        <SeverityBadge severity={caseData.severity as Severity} />
      </WsHeader>

      <WsLayout>
        <WsSideCol side="start" title="بطاقة الطالب" icon={UserRound} storageKey="ws:student-case:sidecol">
          <WsBlock padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <InitialAvatar name={caseData.student.name} tone={catTone} size={44} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>{caseData.student.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ws-text-2)' }}>
                  {caseData.student.grade} - {caseData.student.class_name}
                </p>
              </div>
            </div>
            {(caseData.student.parent_name || caseData.student.parent_phone) && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid var(--ws-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                }}
              >
                {caseData.student.parent_name && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ws-text-2)' }}>
                    <Users style={{ width: 13, height: 13, flexShrink: 0 }} />
                    {caseData.student.parent_name}
                  </span>
                )}
                {caseData.student.parent_phone && (
                  <a
                    href={`tel:${caseData.student.parent_phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ws-accent)', textDecoration: 'none', direction: 'ltr', justifyContent: 'flex-end' }}
                  >
                    {caseData.student.parent_phone}
                    <Phone style={{ width: 13, height: 13, flexShrink: 0 }} />
                  </a>
                )}
              </div>
            )}
          </WsBlock>

          <WsBlock title="بيانات الحالة" icon={FileText} padded>
            <WsFactsList>
              <WsFactRow label="التصنيف"><ToneChip tone={catTone}>{caseData.category}</ToneChip></WsFactRow>
              <WsFactRow label="الحالة"><ToneChip tone={statusMeta.tone}>{statusMeta.label}</ToneChip></WsFactRow>
              <WsFactRow label="الأولوية"><SeverityBadge severity={caseData.severity as Severity} /></WsFactRow>
              <WsFactRow label="تاريخ الفتح">{new Date(caseData.opened_at).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              {caseData.closed_at && (
                <WsFactRow label="تاريخ الإغلاق">{new Date(caseData.closed_at).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              )}
              {caseData.opened_by?.name && <WsFactRow label="فتحها">{caseData.opened_by.name}</WsFactRow>}
              {caseData.last_activity_at && (
                <WsFactRow label="آخر نشاط">{new Date(caseData.last_activity_at).toLocaleDateString('ar-SA-u-nu-latn')}</WsFactRow>
              )}
            </WsFactsList>
          </WsBlock>

          {caseData.tags && caseData.tags.length > 0 && (
            <WsBlock title="الوسوم" icon={Tag} padded fill>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {caseData.tags.map((tag) => (
                  <span key={tag} className="ws-chip" style={{ background: 'var(--ws-accent-soft)', color: 'var(--ws-accent)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </WsBlock>
          )}
        </WsSideCol>

        <WsMain>
          <div className="ws-block ws-block--fill">
            <div className="ws-block__head">
              <div className="ws-seg">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      className={`ws-seg__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <TabIcon style={{ width: 13, height: 13 }} />
                      {tab.label}
                      {tab.count != null && <span className="ws-count">{tab.count}</span>}
                      {tab.key === 'followups' && overdueCount > 0 && <span className="ws-pulse ws-pulse--red" />}
                    </button>
                  )
                })}
              </div>
              <span className="ws-block__tools">
                {activeTab === 'actions' && (
                  <WsBtn
                    size="sm"
                    variant={showActionForm ? undefined : 'primary'}
                    icon={showActionForm ? X : Plus}
                    onClick={() => setShowActionForm(!showActionForm)}
                  >
                    {showActionForm ? 'إلغاء' : 'إضافة إجراء'}
                  </WsBtn>
                )}
                {activeTab === 'followups' && (
                  <WsBtn
                    size="sm"
                    variant={showFollowupForm ? undefined : 'primary'}
                    icon={showFollowupForm ? X : Plus}
                    onClick={() => setShowFollowupForm(!showFollowupForm)}
                  >
                    {showFollowupForm ? 'إلغاء' : 'إضافة متابعة'}
                  </WsBtn>
                )}
                {activeTab === 'documents' && (
                  <WsBtn
                    size="sm"
                    variant={showDocumentForm ? undefined : 'primary'}
                    icon={showDocumentForm ? X : Upload}
                    onClick={() => setShowDocumentForm(!showDocumentForm)}
                  >
                    {showDocumentForm ? 'إلغاء' : 'رفع مستند'}
                  </WsBtn>
                )}
              </span>
            </div>

            <div className="ws-block__scroll">
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeTab === 'overview' && (
                  <>
                    <div>
                      <p className="ws-label" style={{ marginBottom: 6 }}>ملخص الحالة</p>
                      <div
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 14,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                          {caseData.summary || 'لا يوجد ملخص مسجل لهذه الحالة.'}
                        </p>
                      </div>
                    </div>

                    {/* نبض الحالة: آخر إجراء + المتابعة القادمة */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                      <div style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12 }}>
                        <p className="ws-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Zap style={{ width: 12, height: 12 }} /> آخر إجراء
                        </p>
                        {lastAction ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <ToneChip tone={actionMeta(lastAction.action_type).tone}>{lastAction.action_type}</ToneChip>
                              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                {new Date(lastAction.created_at).toLocaleString('ar-SA-u-nu-latn')}
                              </span>
                            </div>
                            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ws-text-2)' }}>{lastAction.notes}</p>
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>لم يُسجل أي إجراء بعد.</p>
                        )}
                      </div>
                      <div style={{ border: '1px solid var(--ws-border)', borderRadius: 10, padding: 12 }}>
                        <p className="ws-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CalendarClock style={{ width: 12, height: 12 }} /> المتابعة القادمة
                        </p>
                        {nextFollowup ? (
                          <>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5 }}>{nextFollowup.title}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                              <FollowupTimingChip scheduledFor={nextFollowup.scheduled_for} />
                              <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                {new Date(nextFollowup.scheduled_for).toLocaleString('ar-SA-u-nu-latn')}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>لا توجد متابعات معلقة.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'actions' && (
                  <>
                    {showActionForm && (
                      <form
                        onSubmit={handleAddAction}
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div>
                          <p className="ws-label" style={{ marginBottom: 6 }}>نوع الإجراء</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                            {ACTION_TYPES.map((type) => {
                              const meta = actionMeta(type)
                              const TypeIcon = meta.icon
                              const isSelected = actionType === type
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  className={`ws-choice ${isSelected ? 'is-selected' : ''}`}
                                  style={isSelected
                                    ? { background: meta.tone.bg, borderColor: meta.tone.tx, color: meta.tone.tx, boxShadow: `0 0 0 1px ${meta.tone.tx}` }
                                    : undefined}
                                  onClick={() => setActionType(type)}
                                >
                                  <TypeIcon />
                                  {type}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <WsField label="الملاحظات">
                          <WsTextarea
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            rows={3}
                            placeholder="أضف ملاحظاتك هنا..."
                            required
                          />
                        </WsField>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <WsBtn type="submit" variant="primary" icon={Plus} disabled={addAction.isPending || !actionType || !actionNotes}>
                            {addAction.isPending ? 'جاري الإضافة...' : 'إضافة الإجراء'}
                          </WsBtn>
                        </div>
                      </form>
                    )}

                    {caseData.actions && caseData.actions.length > 0 ? (
                      <div className="ws-timeline">
                        {caseData.actions.map((action, index) => {
                          const meta = actionMeta(action.action_type)
                          const ActionIcon = meta.icon
                          return (
                            <div key={action.id} className="ws-timeline__item">
                              <span className="ws-timeline__node">
                                <span
                                  className="ws-timeline__dot"
                                  style={{ background: meta.tone.bg, color: meta.tone.tx }}
                                >
                                  <ActionIcon />
                                </span>
                                <span className="ws-timeline__time">#{index + 1}</span>
                              </span>
                              <div className="ws-timeline__card">
                                <div className="ws-timeline__card-head">
                                  <ToneChip tone={meta.tone}>{action.action_type}</ToneChip>
                                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                                    {new Date(action.created_at).toLocaleString('ar-SA-u-nu-latn')}
                                  </span>
                                </div>
                                <p style={{ margin: 0, padding: '9px 12px', fontSize: 12, lineHeight: 1.8 }}>{action.notes}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <WsEmpty icon={Zap}>لم يتم تسجيل أي إجراءات بعد</WsEmpty>
                    )}
                  </>
                )}

                {activeTab === 'followups' && (
                  <>
                    {showFollowupForm && (
                      <form
                        onSubmit={handleAddFollowup}
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                          <WsField label="عنوان المتابعة">
                            <WsInput
                              type="text"
                              value={followupTitle}
                              onChange={(e) => setFollowupTitle(e.target.value)}
                              placeholder="عنوان المتابعة"
                              required
                            />
                          </WsField>
                          <WsField label="موعد المتابعة">
                            <WsInput
                              type="datetime-local"
                              value={followupDate}
                              onChange={(e) => setFollowupDate(e.target.value)}
                              required
                            />
                          </WsField>
                        </div>
                        <WsField label="ملاحظات">
                          <WsTextarea
                            value={followupNotes}
                            onChange={(e) => setFollowupNotes(e.target.value)}
                            rows={2}
                            placeholder="ملاحظات إضافية..."
                          />
                        </WsField>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <WsBtn type="submit" variant="primary" icon={Plus} disabled={addFollowup.isPending}>
                            {addFollowup.isPending ? 'جاري الإضافة...' : 'إضافة المتابعة'}
                          </WsBtn>
                        </div>
                      </form>
                    )}

                    {caseData.followups && caseData.followups.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {caseData.followups.map((followup) => {
                          const isOverdue = followup.status === 'pending' && new Date(followup.scheduled_for).getTime() < Date.now()
                          const rowTone = followup.status === 'completed'
                            ? TONES.green
                            : followup.status === 'cancelled'
                              ? TONES.gray
                              : isOverdue
                                ? TONES.red
                                : TONES.amber
                          return (
                            <div
                              key={followup.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                border: '1px solid var(--ws-border)',
                                borderRadius: 10,
                                padding: 10,
                                background: isOverdue ? TONES.red.bg : 'var(--ws-surface)',
                              }}
                            >
                              <span
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: rowTone.bg,
                                  color: rowTone.tx,
                                  border: `1px solid ${rowTone.bd}`,
                                }}
                              >
                                <CalendarClock style={{ width: 14, height: 14 }} />
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5 }}>{followup.title}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                                  {new Date(followup.scheduled_for).toLocaleString('ar-SA-u-nu-latn')}
                                </p>
                                {followup.notes && (
                                  <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--ws-text-2)' }}>{followup.notes}</p>
                                )}
                              </div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {followup.status === 'completed' ? (
                                  <ToneChip tone={TONES.green}>منجز</ToneChip>
                                ) : followup.status === 'cancelled' ? (
                                  <ToneChip tone={TONES.gray}>ملغي</ToneChip>
                                ) : (
                                  <FollowupTimingChip scheduledFor={followup.scheduled_for} />
                                )}
                                {followup.status === 'pending' && (
                                  <WsIconBtn
                                    icon={Check}
                                    label="تحديد كمنجز"
                                    onClick={() => handleCompleteFollowup(followup.id)}
                                    style={{ color: TONES.green.tx, borderColor: TONES.green.bd, background: TONES.green.bg }}
                                  />
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <WsEmpty icon={CalendarClock}>لا توجد متابعات مجدولة</WsEmpty>
                    )}
                  </>
                )}

                {activeTab === 'documents' && (
                  <>
                    {showDocumentForm && (
                      <form
                        onSubmit={handleUploadDocument}
                        style={{
                          background: 'var(--ws-surface-2)',
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 10,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            border: '2px dashed var(--ws-border)',
                            borderRadius: 10,
                            padding: 18,
                            textAlign: 'center',
                            background: 'var(--ws-surface)',
                          }}
                        >
                          <input
                            type="file"
                            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                            id="file-upload"
                            required
                          />
                          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            <Upload style={{ width: 24, height: 24, color: 'var(--ws-text-2)', margin: '0 auto 6px' }} />
                            <p style={{ margin: 0, fontSize: 12, color: documentFile ? 'var(--ws-accent)' : 'var(--ws-text-2)', fontWeight: documentFile ? 700 : 400 }}>
                              {documentFile ? documentFile.name : 'اضغط لاختيار ملف'}
                            </p>
                          </label>
                        </div>
                        <WsField label="وصف المستند (اختياري)">
                          <WsInput
                            type="text"
                            value={documentDescription}
                            onChange={(e) => setDocumentDescription(e.target.value)}
                            placeholder="وصف المستند"
                          />
                        </WsField>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <WsBtn type="submit" variant="primary" icon={Upload} disabled={uploadDocument.isPending || !documentFile}>
                            {uploadDocument.isPending ? 'جاري الرفع...' : 'رفع المستند'}
                          </WsBtn>
                        </div>
                      </form>
                    )}

                    {caseData.documents && caseData.documents.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {caseData.documents.map((doc) => (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              border: '1px solid var(--ws-border)',
                              borderRadius: 10,
                              padding: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--ws-accent-soft)',
                                color: 'var(--ws-accent)',
                              }}
                            >
                              <FileText style={{ width: 15, height: 15 }} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {doc.original_name}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>
                                {doc.metadata?.description ? String(doc.metadata.description) : 'بدون وصف'}
                              </p>
                            </div>
                            <a
                              href={`/api/guidance/cases/${caseData.id}/documents/${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ws-icon-btn"
                              title="تحميل المستند"
                              aria-label="تحميل المستند"
                              style={{ flexShrink: 0 }}
                            >
                              <Download />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <WsEmpty icon={Paperclip}>لا توجد مستندات مرفقة</WsEmpty>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </WsMain>
      </WsLayout>
    </WsPage>
  )
}

/** شريحة توقيت المتابعة المعلقة: متأخرة (حمراء نابضة) / اليوم / بعد X يوم */
function FollowupTimingChip({ scheduledFor }: { scheduledFor: string }) {
  const days = Math.ceil((new Date(scheduledFor).getTime() - Date.now()) / DAY_MS)
  if (days < 0) {
    return (
      <span className="ws-chip ws-soft-pulse" style={{ background: TONES.red.bg, borderColor: TONES.red.bd, color: TONES.red.tx }}>
        متأخرة {Math.abs(days)} يوم
      </span>
    )
  }
  return (
    <ToneChip tone={TONES.amber}>{days === 0 ? 'اليوم' : `بعد ${days} يوم`}</ToneChip>
  )
}

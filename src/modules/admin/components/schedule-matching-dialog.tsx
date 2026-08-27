import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPendingMatches,
  linkTeacher,
  linkSubject,
  createAndLinkSubject,
  type LinkTeacherResult,
  type PendingMatchSession,
  type UnmatchedTeacher,
  type UnmatchedSubject,
} from '../api'
import { X, Check, Plus, AlertTriangle, User, UserPlus, BookOpen, RefreshCw } from 'lucide-react'
import { WsAlert, WsBtn, WsChip, WsEmpty, WsInput } from '@/shared/workspace'

interface ScheduleMatchingDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ScheduleMatchingDialog({ isOpen, onClose }: ScheduleMatchingDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects'>('teachers')
  const [selectedTeacher, setSelectedTeacher] = useState<UnmatchedTeacher | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<UnmatchedSubject | null>(null)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showCreateSubject, setShowCreateSubject] = useState(false)
  // الحصصُ المنتقاة للاسم المحدَّد — فارغةٌ تعني «كلَّها»
  const [pickedSessionIds, setPickedSessionIds] = useState<number[]>([])
  const [linkOutcome, setLinkOutcome] = useState<
    { tone: 'success' | 'warn' | 'error'; text: string } | null
  >(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schedule-matching-pending'],
    queryFn: fetchPendingMatches,
    enabled: isOpen,
  })

  // تبديلُ الاسم يُعيد الانتقاء إلى «كل الحصص» ويمسح تقرير المحاولة السابقة
  useEffect(() => {
    setPickedSessionIds(selectedTeacher?.sessions?.map((session) => session.id) ?? [])
    setLinkOutcome(null)
  }, [selectedTeacher])

  const linkTeacherMutation = useMutation({
    mutationFn: ({
      chromeName,
      teacherId,
      sessionIds,
    }: {
      chromeName: string
      teacherId: number
      sessionIds?: number[]
    }) => linkTeacher(chromeName, teacherId, sessionIds),
    onSuccess: (result: LinkTeacherResult) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setLinkOutcome({
        tone: result.blocked.length > 0 ? 'warn' : 'success',
        text: result.message,
      })
      // ما بقيت حصصٌ متعذّرة يبقى الاسمُ مفتوحاً ليُعالجها المدير
      if (result.blocked.length === 0) {
        setSelectedTeacher(null)
      }
    },
    onError: (error: unknown) => {
      setLinkOutcome({ tone: 'error', text: readErrorMessage(error) })
    },
  })

  const linkSubjectMutation = useMutation({
    mutationFn: ({ chromeName, subjectId }: { chromeName: string; subjectId: number }) =>
      linkSubject(chromeName, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedSubject(null)
    },
  })

  const createSubjectMutation = useMutation({
    mutationFn: ({ chromeName, name }: { chromeName: string; name: string }) =>
      createAndLinkSubject(chromeName, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedSubject(null)
      setNewSubjectName('')
      setShowCreateSubject(false)
    },
  })

  if (!isOpen) return null

  const unmatchedTeachers = data?.unmatched_teachers || []
  const unmatchedSubjects = data?.unmatched_subjects || []
  const availableTeachers = data?.available_teachers || []
  const availableSubjects = data?.available_subjects || []

  return (
    <div className="ws-modal" role="dialog" aria-modal onClick={onClose}>
      <div
        className="ws-modal__panel"
        style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-modal__head" style={{ position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--ws-accent-2)' }}>
            <RefreshCw style={{ width: 12, height: 12 }} />
            ربط أسماء «مدرستي» بسجلات النظام
          </span>
          <h3 className="ws-modal__title" style={{ fontSize: 15 }}>المطابقة اليدوية</h3>
          <p className="ws-modal__sub">{data?.total_sessions_need_review || 0} حصة تحتاج مراجعة</p>
          <button
            type="button"
            className="ws-icon-btn"
            style={{ position: 'absolute', insetInlineEnd: 12, top: 10 }}
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X />
          </button>
        </header>

        {/* التبويبات */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--ws-hairline)' }}>
          <div className="ws-seg" style={{ display: 'flex' }}>
            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className={`ws-seg__btn ${activeTab === 'teachers' ? 'is-active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <User style={{ width: 12, height: 12 }} />
              المعلمون ({unmatchedTeachers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`ws-seg__btn ${activeTab === 'subjects' ? 'is-active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <BookOpen style={{ width: 12, height: 12 }} />
              المواد ({unmatchedSubjects.length})
            </button>
          </div>
        </div>

        {/* المحتوى: لوحان متقابلان */}
        <div style={{ height: '54vh', display: 'flex', overflow: 'hidden' }}>
          {isLoading ? (
            <WsEmpty loading style={{ flex: 1 }}>
              جاري تحميل بيانات المطابقة...
            </WsEmpty>
          ) : activeTab === 'teachers' ? (
            <MatchingPanes
              kind="teachers"
              unmatched={unmatchedTeachers}
              available={availableTeachers}
              selected={selectedTeacher}
              onSelect={setSelectedTeacher}
              onLink={(chromeName, id) =>
                linkTeacherMutation.mutate({
                  chromeName,
                  teacherId: id,
                  // انتقاءُ الكلّ يُرسَل بلا session_ids ليُحفظ الاسمُ للاستيراد القادم
                  sessionIds:
                    pickedSessionIds.length === (selectedTeacher?.sessions?.length ?? 0)
                      ? undefined
                      : pickedSessionIds,
                })
              }
              isLinking={linkTeacherMutation.isPending}
              sessionPicker={{
                pickedIds: pickedSessionIds,
                setPickedIds: setPickedSessionIds,
                outcome: linkOutcome,
              }}
            />
          ) : (
            <MatchingPanes
              kind="subjects"
              unmatched={unmatchedSubjects}
              available={availableSubjects}
              selected={selectedSubject}
              onSelect={setSelectedSubject}
              onLink={(chromeName, id) => linkSubjectMutation.mutate({ chromeName, subjectId: id })}
              isLinking={linkSubjectMutation.isPending}
              create={{
                onCreate: (chromeName, name) => createSubjectMutation.mutate({ chromeName, name }),
                isCreating: createSubjectMutation.isPending,
                showCreate: showCreateSubject,
                setShowCreate: setShowCreateSubject,
                newName: newSubjectName,
                setNewName: setNewSubjectName,
              }}
            />
          )}
        </div>

        <footer className="ws-modal__foot" style={{ justifyContent: 'space-between' }}>
          <WsBtn icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </WsBtn>
          <WsBtn onClick={onClose}>إغلاق</WsBtn>
        </footer>
      </div>
    </div>
  )
}

type MatchingItem = {
  chrome_name: string
  sessions_count: number
  current_match?: { name: string } | null
  sessions?: PendingMatchSession[]
  conflicting_slots?: { day: string; period_number: number; classes: string[] }[]
}
type AvailableItem = { id: number; name: string }

/** انتقاءُ الحصص — للمعلمين وحدهم؛ المادةُ لا يحرسها فهرسُ خانة. */
interface SessionPicker {
  pickedIds: number[]
  setPickedIds: (ids: number[]) => void
  outcome: { tone: 'success' | 'warn' | 'error'; text: string } | null
}

function readErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
    const message = (error as { message?: string }).message
    if (message) return message
  }
  return 'تعذّر الربط'
}

/** ما يلزم لإنشاء سجلٍ ناقصٍ وربطه من داخل الحوار. */
interface CreateAffordance {
  onCreate: (chromeName: string, name: string) => void
  isCreating: boolean
  showCreate: boolean
  setShowCreate: (v: boolean) => void
  newName: string
  setNewName: (v: string) => void
}

interface MatchingPanesProps<TUnmatched extends MatchingItem> {
  kind: 'teachers' | 'subjects'
  unmatched: TUnmatched[]
  available: AvailableItem[]
  selected: TUnmatched | null
  onSelect: (item: TUnmatched | null) => void
  onLink: (chromeName: string, id: number) => void
  isLinking: boolean
  /**
   * الإنشاء يُمرَّر للمواد وحدها. المادة اسمٌ ولا شيء غيره، أما المعلم فحسابُ
   * دخولٍ مفتاحُه رقم الهوية — ولا يحمله ملفُ «مدرستي» — فيُضاف من صفحة
   * المعلمين ثم يُربط من هنا.
   */
  create?: CreateAffordance
  /** يُمرَّر للمعلمين وحدهم — انتقاءُ الحصص وتقريرُ نتيجة الربط. */
  sessionPicker?: SessionPicker
}

function MatchingPanes<TUnmatched extends MatchingItem>({
  kind,
  unmatched,
  available,
  selected,
  onSelect,
  onLink,
  isLinking,
  create,
  sessionPicker,
}: MatchingPanesProps<TUnmatched>) {
  const isTeachers = kind === 'teachers'
  const EntityIcon = isTeachers ? User : BookOpen
  const nothingPicked =
    sessionPicker != null
    && (selected?.sessions?.length ?? 0) > 0
    && sessionPicker.pickedIds.length === 0

  if (unmatched.length === 0) {
    return (
      <WsEmpty icon={Check} style={{ flex: 1 }}>
        {isTeachers ? 'جميع المعلمين متطابقون!' : 'جميع المواد متطابقة!'}
      </WsEmpty>
    )
  }

  const paneHeadStyle = {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'var(--ws-surface-2)',
    borderBottom: '1px solid var(--ws-hairline)',
    fontSize: 11,
    fontWeight: 700,
  }

  return (
    <>
      {/* اللوح الأيمن: غير المتطابقين من مدرستي */}
      <div style={{ width: '50%', overflowY: 'auto', borderInlineEnd: '1px solid var(--ws-hairline)' }}>
        <div style={paneHeadStyle}>
          <AlertTriangle style={{ width: 13, height: 13, color: 'var(--ws-amber)' }} />
          من مدرستي ({isTeachers ? 'غير متطابقين' : 'غير متطابقة'})
        </div>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {unmatched.map((item) => {
            const isSelected = selected?.chrome_name === item.chrome_name
            return (
              <button
                key={item.chrome_name}
                type="button"
                onClick={() => onSelect(isSelected ? null : item)}
                style={{
                  width: '100%',
                  textAlign: 'right',
                  padding: '8px 11px',
                  borderRadius: 8,
                  border: isSelected ? '1px solid var(--ws-accent-2)' : '1px solid var(--ws-hairline)',
                  background: isSelected ? 'var(--ws-accent-soft)' : 'var(--ws-surface)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>
                  {item.chrome_name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                  <WsChip tone="sky">{item.sessions_count} حصة</WsChip>
                  {item.current_match && (
                    <WsChip tone="amber">
                      {isTeachers ? 'مرتبط حالياً بـ' : 'مرتبطة حالياً بـ'}: {item.current_match.name}
                    </WsChip>
                  )}
                  {(item.conflicting_slots?.length ?? 0) > 0 && (
                    <WsChip tone="red" icon={AlertTriangle}>
                      {item.conflicting_slots!.length} خانة مزدحمة
                    </WsChip>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* اللوح الأيسر: سجلات النظام المتاحة */}
      <div style={{ width: '50%', overflowY: 'auto' }}>
        <div style={paneHeadStyle}>
          <EntityIcon style={{ width: 13, height: 13, color: 'var(--ws-accent-2)' }} />
          {isTeachers ? 'اختر المعلم من النظام' : 'اختر المادة من النظام'}
        </div>

        {selected ? (
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                borderRadius: 8,
                border: '1px solid var(--ws-sky-bd)',
                background: 'var(--ws-sky-bg)',
                color: 'var(--ws-sky)',
                padding: '7px 11px',
                fontSize: 11.5,
              }}
            >
              ربط <b>{selected.chrome_name}</b> مع:
            </div>

            {sessionPicker?.outcome && (
              <WsAlert
                tone={
                  sessionPicker.outcome.tone === 'success'
                    ? 'success'
                    : sessionPicker.outcome.tone === 'warn'
                      ? 'warn'
                      : 'error'
                }
                boxed
              >
                {sessionPicker.outcome.text}
              </WsAlert>
            )}

            {sessionPicker && selected.sessions && selected.sessions.length > 0 && (
              <SessionPickerPane
                sessions={selected.sessions}
                conflicts={selected.conflicting_slots ?? []}
                picker={sessionPicker}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {available.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onLink(selected.chrome_name, option.id)}
                  disabled={isLinking || nothingPicked}
                  style={{
                    opacity: nothingPicked ? 0.45 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    width: '100%',
                    textAlign: 'right',
                    padding: '7px 11px',
                    borderRadius: 8,
                    border: '1px solid var(--ws-hairline)',
                    background: 'var(--ws-surface)',
                    cursor: isLinking ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ws-text)',
                  }}
                >
                  <span style={{ minWidth: 0 }}>{option.name}</span>
                  <Check style={{ width: 14, height: 14, color: 'var(--ws-green)', flexShrink: 0 }} />
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--ws-hairline)', paddingTop: 8 }}>
              {create ? (
                <CreatePane create={create} chromeName={selected.chrome_name} />
              ) : (
                <MissingTeacherNote />
              )}
            </div>
          </div>
        ) : (
          <WsEmpty icon={EntityIcon} style={{ padding: '32px 16px' }}>
            {isTeachers ? 'اختر معلماً من القائمة اليمنى للبدء' : 'اختر مادة من القائمة اليمنى للبدء'}
          </WsEmpty>
        )}
      </div>
    </>
  )
}

/**
 * انتقاءُ الحصص قبل الربط.
 *
 * الاسمُ الواحد في «مدرستي» قد يكون شخصين، وقد يكون شخصاً واحداً في
 * مجموعةٍ مدمجة. وكلاهما لا يُحسم بالاسم بل بالحصة — فهذه اللوحةُ هي
 * المكانُ الذي يقول فيه المديرُ: هذه له، وتلك لغيره.
 */
function SessionPickerPane({
  sessions,
  conflicts,
  picker,
}: {
  sessions: PendingMatchSession[]
  conflicts: { day: string; period_number: number; classes: string[] }[]
  picker: SessionPicker
}) {
  const conflictKeys = useMemo(
    () => new Set(conflicts.map((slot) => `${slot.day}|${slot.period_number}`)),
    [conflicts],
  )

  const allIds = sessions.map((session) => session.id)
  const allPicked = picker.pickedIds.length === allIds.length

  const toggle = (id: number) => {
    picker.setPickedIds(
      picker.pickedIds.includes(id)
        ? picker.pickedIds.filter((value) => value !== id)
        : [...picker.pickedIds, id],
    )
  }

  return (
    <div style={{ border: '1px solid var(--ws-hairline)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 10px',
          background: 'var(--ws-surface-2)',
          borderBottom: '1px solid var(--ws-hairline)',
        }}
      >
        <span className="ws-label">
          الحصص المشمولة ({picker.pickedIds.length} من {allIds.length})
        </span>
        <WsBtn
          size="sm"
          onClick={() => picker.setPickedIds(allPicked ? [] : allIds)}
        >
          {allPicked ? 'إلغاء الكل' : 'تحديد الكل'}
        </WsBtn>
      </div>

      {conflicts.length > 0 && (
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--ws-hairline)' }}>
          <WsAlert tone="warn" boxed>
            خاناتٌ يشغلها هذا الاسم بأكثر من حصة — لا يمكن إسنادُها كلُّها لمعلّمٍ واحد:{' '}
            {conflicts
              .map((slot) => `${slot.day} حصة ${slot.period_number} (${slot.classes.join(' + ')})`)
              .join('، ')}
          </WsAlert>
        </div>
      )}

      <div style={{ maxHeight: 168, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sessions.map((session) => {
          const isPicked = picker.pickedIds.includes(session.id)
          const isCrowded = conflictKeys.has(`${session.day}|${session.period_number}`)

          return (
            <label
              key={session.id}
              className="ws-pick"
              style={{
                borderColor: isPicked ? 'var(--ws-accent-2)' : 'var(--ws-border)',
                background: isPicked ? 'var(--ws-accent-softer)' : 'var(--ws-surface)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <input type="checkbox" checked={isPicked} onChange={() => toggle(session.id)} />
                <span style={{ minWidth: 0 }}>
                  <span className="ws-pick__name">
                    {session.grade} / {session.class_name}
                  </span>
                  <span className="ws-pick__sub">
                    {session.day} · الحصة {session.period_number}
                    {session.subject_name ? ` · ${session.subject_name}` : ''}
                  </span>
                </span>
              </span>
              {isCrowded && <WsChip tone="red">مزدحمة</WsChip>}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/** إنشاء سجلٍ ناقصٍ وربطه في خطوة واحدة — للمواد وحدها. */
function CreatePane({ create, chromeName }: { create: CreateAffordance; chromeName: string }) {
  if (!create.showCreate) {
    return (
      <button
        type="button"
        onClick={() => {
          create.setNewName(chromeName)
          create.setShowCreate(true)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '8px 11px',
          borderRadius: 8,
          border: '2px dashed var(--ws-border)',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--ws-text-2)',
        }}
      >
        <Plus style={{ width: 13, height: 13 }} />
        إنشاء مادة جديدة
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <WsInput
        type="text"
        value={create.newName}
        onChange={(e) => create.setNewName(e.target.value)}
        placeholder="اسم المادة الجديدة"
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <WsBtn
          variant="primary"
          icon={Plus}
          onClick={() => create.onCreate(chromeName, create.newName || chromeName)}
          disabled={create.isCreating}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          إنشاء وربط
        </WsBtn>
        <WsBtn onClick={() => create.setShowCreate(false)}>إلغاء</WsBtn>
      </div>
    </div>
  )
}

/**
 * بديلُ زرِّ «إنشاء معلم جديد» الذي كان هنا.
 *
 * حسابُ المعلم مفتاحُه رقم الهوية: عشرة أرقام، فريدةٌ في المدرسة، وبها
 * يدخل النظامَ ويُطابَق حضورُه على جهاز البصمة. وملفُّ «مدرستي» لا يحمل
 * أرقامَ الهويات — فاختلاقُ رقمٍ هنا كان يُنتج حساباً لا يدخل به صاحبه
 * وقد يصادم هويةً حقيقية. فصار الإرشاد بدل الزر.
 */
function MissingTeacherNote() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 7,
        padding: '8px 11px',
        borderRadius: 8,
        border: '1px solid var(--ws-border)',
        background: 'var(--ws-surface-2)',
        fontSize: 11,
        lineHeight: 1.7,
        color: 'var(--ws-text-2)',
      }}
    >
      <UserPlus style={{ width: 13, height: 13, flexShrink: 0, marginTop: 3 }} />
      <span>
        المعلم غير موجود في القائمة؟ أضِفه من <b>صفحة المعلمين</b> برقم هويته، ثم عُد إلى هنا لربطه.
        حسابُ المعلم يحتاج رقمَ هويةٍ حقيقياً ليدخل به ولتُطابَق بصمتُه، وهو ما لا يحمله ملفُّ «مدرستي».
      </span>
    </div>
  )
}

export default ScheduleMatchingDialog

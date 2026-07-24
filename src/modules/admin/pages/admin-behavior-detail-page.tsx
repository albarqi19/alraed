import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Circle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  Printer,
  ShieldAlert,
  StickyNote,
  User,
  UserRoundCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useBehaviorStore } from '@/modules/admin/behavior/store/use-behavior-store'
import { ViolationBadge } from '@/modules/admin/behavior/components/violation-badge'
import { AutomationTriggerButton } from '@/modules/admin/behavior/components/automation-trigger-button'
import type { BehaviorStatus, BehaviorSystemTrigger } from '@/modules/admin/behavior/types'
import { generateCounselorReferralHtml } from '@/modules/admin/behavior/counselor-referral-template'
import { generateGuardianInvitationHtml } from '@/modules/admin/behavior/generate-guardian-invitation.tsx'
import { useAdminSettingsQuery } from '@/modules/admin/hooks'
import { executeAutomation } from '@/modules/admin/behavior/api'
import {
  TONES,
  ToneChip,
  WsBlock,
  WsBtn,
  WsEmpty,
  WsFact,
  WsFactRow,
  WsFactsList,
  WsHeader,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
  WsTextarea,
  type Tone,
} from '@/shared/workspace'
import { chip } from './dashboard-ui'

const STATUS_TONES: Record<BehaviorStatus, Tone> = {
  'قيد المعالجة': TONES.amber,
  'جاري التنفيذ': TONES.sky,
  مكتملة: TONES.green,
  ملغاة: TONES.gray,
}

/** مؤشر السلوك يلبس حاله: ٨٠+ أخضر، ٦٠+ كهرماني، دونها أحمر */
const scoreTone = (score: number): Tone =>
  score >= 80 ? TONES.green : score >= 60 ? TONES.amber : TONES.red

export function AdminBehaviorDetailPage() {
  const { violationId = '' } = useParams<{ violationId: string }>()
  const navigate = useNavigate()
  const violations = useBehaviorStore((state) => state.violations)
  const students = useBehaviorStore((state) => state.students)
  const toggleProcedure = useBehaviorStore((state) => state.toggleProcedure)
  const toggleProcedureTask = useBehaviorStore((state) => state.toggleProcedureTask)
  const updateProcedureNotes = useBehaviorStore((state) => state.updateProcedureNotes)
  const procedureMutations = useBehaviorStore((state) => state.procedureMutations)
  const fetchViolationById = useBehaviorStore((state) => state.fetchViolationById)

  const adminSettingsQuery = useAdminSettingsQuery()

  const [documentModal, setDocumentModal] = useState<{
    title: string
    html: string
    fileName: string
  } | null>(null)

  // طيّ/فتح ملاحظات كل إجراء — تنفتح تلقائياً إن وُجدت ملاحظات محفوظة
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({})

  // جلب المخالفة عند تحميل الصفحة أو تغيير المعرف
  useEffect(() => {
    if (violationId) {
      // التحقق إذا كانت المخالفة موجودة بالفعل في المتجر
      const existingViolation = violations.find((item) => item.id === violationId)
      if (!existingViolation) {
        fetchViolationById(violationId)
      }
    }
  }, [violationId, fetchViolationById])

  const violation = useMemo(
    () => violations.find((item) => item.id === violationId) ?? null,
    [violationId, violations],
  )

  const student = useMemo(
    () =>
      violation?.studentId
        ? students.find((item) => item.id === violation.studentId) ?? null
        : null,
    [students, violation?.studentId],
  )

  const completion = useMemo(() => {
    if (!violation || violation.procedures.length === 0) return { percent: 0, completed: 0 }
    const completedCount = violation.procedures.filter((procedure) => procedure.completed).length
    const percent = Math.round((completedCount / violation.procedures.length) * 100)
    return { percent, completed: completedCount }
  }, [violation])

  const relatedViolations = useMemo(() => {
    if (!violation) return []
    return violations
      .filter((item) => item.studentId === violation.studentId && item.id !== violation.id)
      .sort((first, second) => (first.date < second.date ? 1 : -1))
      .slice(0, 4)
  }, [violation, violations])

  const handleOpenReferralForm = () => {
    if (!violation) return

    const schoolName = adminSettingsQuery.data?.school_name?.trim() || 'مدرسة الرائد الأهلية'
    const studentName = student?.name ?? violation.studentName
    const studentNumber = student?.studentId ?? violation.studentNumber

    const html = generateCounselorReferralHtml({
      schoolName,
      studentName,
      studentNumber,
      grade: violation.grade,
      className: violation.class,
      violationType: violation.type,
      violationDegree: violation.degree,
      violationDate: violation.date,
      violationTime: violation.time || '--:--',
      violationLocation: violation.location || 'غير محدد',
      violationDescription: violation.description,
      referralDate: new Date().toLocaleDateString('ar-SA-u-nu-latn'),
      referralReason: 'تحويل الطالب إلى المرشد الطلابي لدراسة حالته ووضع خطة تعديل السلوك المناسبة.',
    })

    setDocumentModal({
      title: `نموذج إحالة طالب — ${studentName}`,
      html,
      fileName: `counselor-referral-${violation.id}`,
    })
  }

  const handleOpenGuardianInvitation = () => {
    if (!violation) return

    const adminSettings = adminSettingsQuery.data
    const schoolName = adminSettings?.school_name?.trim() || 'مدرسة الرائد الأهلية'
    const region = typeof adminSettings?.school_region === 'string' ? adminSettings.school_region : undefined
    const principalName = typeof adminSettings?.school_principal_name === 'string' ? adminSettings.school_principal_name : undefined

    const parseDate = (value: string | null | undefined): Date => {
      if (!value) return new Date()
      const date = new Date(`${value}T00:00:00`)
      return Number.isNaN(date.getTime()) ? new Date() : date
    }

    const safeFormat = (
      locales: string,
      options: Intl.DateTimeFormatOptions,
      target: Date,
      fallbackLocales: string = 'ar-SA-u-nu-latn',
    ) => {
      try {
        return new Intl.DateTimeFormat(locales, options).format(target)
      } catch {
        return new Intl.DateTimeFormat(fallbackLocales, options).format(target)
      }
    }

    const meetingDate = parseDate(violation.date)
    const now = new Date()

    const meetingDay = safeFormat('ar-SA-u-nu-latn', { weekday: 'long' }, meetingDate)
    const meetingDateGregorian = safeFormat('ar-SA-u-nu-latn', { day: '2-digit', month: 'long', year: 'numeric' }, meetingDate)
    const meetingDateHijri = safeFormat(
      'ar-SA-u-ca-islamic-nu-latn',
      { day: '2-digit', month: 'long', year: 'numeric' },
      meetingDate,
    )
    const issueDateGregorian = safeFormat('ar-SA-u-nu-latn', { day: '2-digit', month: 'long', year: 'numeric' }, now)
    const issueDateHijri = safeFormat(
      'ar-SA-u-ca-islamic-nu-latn',
      { day: '2-digit', month: 'long', year: 'numeric' },
      now,
    )

    const html = generateGuardianInvitationHtml({
      schoolName,
      region,
      studentName: student?.name ?? violation.studentName,
      grade: violation.grade,
      className: violation.class,
      meetingDay,
      meetingDateHijri,
      meetingDateGregorian,
      meetingPurpose: `مناقشة المخالفة السلوكية من الدرجة ${violation.degree}`,
      meetingTime: violation.time || '..............',
      issueDateHijri,
      issueDateGregorian,
      principalName,
    })

    setDocumentModal({
      title: `دعوة ولي الأمر — ${student?.name ?? violation.studentName}`,
      html,
      fileName: `guardian-invitation-${violation.id}`,
    })
  }

  const handleCloseDocumentModal = () => {
    setDocumentModal(null)
  }

  const handlePrintDocument = () => {
    if (!documentModal || typeof window === 'undefined') return
    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) return
    printWindow.document.write(documentModal.html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleDownloadDocument = () => {
    if (!documentModal || typeof window === 'undefined' || typeof document === 'undefined') return
    const blob = new Blob([documentModal.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentModal.fileName}.html`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  if (!violation) {
    return (
      <WsPage className="ws-rich">
        <WsHeader title="تفاصيل المخالفة" badge="السلوك والمواظبة" />
        <WsLayout>
          <WsMain>
            <WsBlock fill>
              <WsEmpty icon={AlertCircle}>
                لم يتم العثور على المخالفة — ربما أُزيلت أو أن المعرّف غير صحيح.
                <WsBtn icon={ChevronLeft} onClick={() => navigate('/admin/behavior')}>
                  العودة إلى سجل المخالفات
                </WsBtn>
              </WsEmpty>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  const statusTone = STATUS_TONES[violation.status] ?? TONES.gray
  const completionLabel = `${completion.completed} / ${violation.procedures.length}`
  const behaviorScore = student?.behaviorScore

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title={violation.studentName}
        badge={`المخالفة ${violation.id.split('-')[0]}`}
        actions={
          <WsBtn icon={ChevronLeft} onClick={() => navigate('/admin/behavior')}>
            العودة إلى السجل
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Clock} label="التاريخ والوقت">
              {violation.date} · {violation.time || '—'}
            </WsFact>
            <WsFact icon={MapPin} label="الموقع">
              {violation.location || 'غير محدد'}
            </WsFact>
            <WsFact icon={UserRoundCheck} label="المبلّغ">
              {violation.reportedBy}
            </WsFact>
          </>
        }
      >
        <ToneChip tone={statusTone}>{violation.status}</ToneChip>
      </WsHeader>

      <WsLayout>
        <WsMain>
          {/* بطاقة المخالفة — تلبس درجتها */}
          <WsBlock padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <ViolationBadge degree={violation.degree} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{violation.type}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                  درجة المخالفة {violation.degree} · رقم الطالب {violation.studentNumber}
                </p>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: `1px solid ${statusTone.bd}`,
                  background: chip(statusTone),
                  color: statusTone.tx,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <ShieldAlert style={{ width: 14, height: 14 }} />
                {violation.status}
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface-2)',
                padding: '10px 12px',
              }}
            >
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>وصف الحالة</p>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {violation.description || 'لا توجد تفاصيل إضافية مسجلة لهذه المخالفة.'}
              </p>
            </div>
          </WsBlock>

          {/* الإجراءات التصحيحية */}
          <WsBlock
            fill
            scroll
            title="الإجراءات التصحيحية"
            icon={ClipboardList}
            count={completionLabel}
            tools={
              <b
                style={{
                  fontSize: 13.5,
                  fontVariantNumeric: 'tabular-nums',
                  color: completion.percent === 100 ? TONES.green.tx : 'var(--ws-text)',
                }}
              >
                {completion.percent}%
              </b>
            }
          >
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* شريط الإنجاز */}
              <div style={{ height: 7, borderRadius: 4, background: 'var(--ws-surface-2)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${completion.percent}%`,
                    background: completion.percent === 100 ? TONES.green.bd : TONES.sky.bd,
                    transition: 'width .25s ease-out',
                  }}
                />
              </div>

              {violation.procedures.map((procedure) => {
                const procedureMutationKey = `${violation.id}-${procedure.step}`
                const isProcedureMutating = Boolean(procedureMutations[procedureMutationKey])
                // تقدّم خطوات الإجراء — يظهر مصغّراً في الترويسة بجانب زر الإكمال
                const tasksDone = procedure.tasks.filter((task) => task.completed).length
                const tasksTotal = procedure.tasks.length
                const notesOpen = openNotes[procedure.step] ?? Boolean(procedure.notes?.trim())

                return (
                  <article
                    key={procedure.step}
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${procedure.completed ? TONES.green.bd : 'var(--ws-hairline)'}`,
                      background: procedure.completed ? chip(TONES.green) : 'var(--ws-surface)',
                      padding: 12,
                    }}
                  >
                    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13.5,
                            fontWeight: 800,
                            background: 'var(--ws-surface)',
                            border: `1px solid ${procedure.completed ? TONES.green.bd : TONES.sky.bd}`,
                            color: procedure.completed ? TONES.green.tx : TONES.sky.tx,
                          }}
                        >
                          {procedure.step}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 14, fontWeight: 700 }}>
                            {procedure.title}
                            {procedure.mandatory ? <ToneChip tone={TONES.red}>إجراء إلزامي</ToneChip> : null}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ws-text-2)' }}>{procedure.description}</p>
                        </div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {tasksTotal > 0 ? (
                          <span
                            title={`${tasksDone} من ${tasksTotal} خطوات منجزة`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <b
                              style={{
                                fontSize: 12,
                                fontVariantNumeric: 'tabular-nums',
                                color: tasksDone === tasksTotal ? TONES.green.tx : 'var(--ws-text-2)',
                              }}
                            >
                              {tasksDone}/{tasksTotal}
                            </b>
                            <span
                              style={{
                                width: 56,
                                height: 5,
                                borderRadius: 3,
                                background: 'var(--ws-surface-2)',
                                border: '1px solid var(--ws-hairline)',
                                overflow: 'hidden',
                              }}
                            >
                              <span
                                style={{
                                  display: 'block',
                                  height: '100%',
                                  width: `${Math.round((tasksDone / tasksTotal) * 100)}%`,
                                  background: tasksDone === tasksTotal ? TONES.green.bd : TONES.sky.bd,
                                  transition: 'width .2s ease-out',
                                }}
                              />
                            </span>
                          </span>
                        ) : null}
                        <WsBtn
                          size="sm"
                          icon={isProcedureMutating ? Loader2 : procedure.completed ? CheckCircle2 : Circle}
                          onClick={() => {
                            void toggleProcedure(violation.id, procedure.step).catch(() => undefined)
                          }}
                          disabled={isProcedureMutating}
                          style={
                            procedure.completed
                              ? { background: 'var(--ws-surface)', borderColor: TONES.green.bd, color: TONES.green.tx }
                              : undefined
                          }
                        >
                          {procedure.completed ? 'مكتمل' : 'تعليم كمكتمل'}
                        </WsBtn>
                      </span>
                    </header>

                    {procedure.tasks.length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--ws-text-2)' }}>خطوات الإجراء</p>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {procedure.tasks.map((task) => {
                            const taskKey = `${violation.id}-${procedure.step}-${task.id}`
                            const isTaskMutating = Boolean(procedureMutations[taskKey])
                            const isTaskDisabled = isTaskMutating || isProcedureMutating
                            const matchesGuardianInvitation =
                              task.actionType === 'guardian_invitation' ||
                              task.title.includes('دعوة ولي أمر') ||
                              task.title.includes('دعوة ولي الأمر') ||
                              task.title.includes('دعوة ولي الامر')

                            return (
                              <li
                                key={task.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 10,
                                  borderRadius: 8,
                                  border: `1px solid ${task.completed ? TONES.green.bd : 'var(--ws-hairline)'}`,
                                  background: 'var(--ws-surface)',
                                  padding: '8px 10px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    void toggleProcedureTask(
                                      violation.id,
                                      procedure.step,
                                      task.id,
                                    ).catch(() => undefined)
                                  }}
                                  disabled={isTaskDisabled}
                                  title={task.completed ? 'إلغاء الإكمال' : 'تعليم كمكتمل'}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    flexShrink: 0,
                                    marginTop: 2,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${task.completed ? TONES.green.bd : 'var(--ws-border)'}`,
                                    background: task.completed ? chip(TONES.green) : 'var(--ws-surface)',
                                    color: task.completed ? TONES.green.tx : 'var(--ws-text-2)',
                                    cursor: isTaskDisabled ? 'default' : 'pointer',
                                    opacity: isTaskDisabled ? 0.6 : 1,
                                  }}
                                >
                                  {isTaskMutating ? (
                                    <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                                  ) : task.completed ? (
                                    <CheckCircle2 style={{ width: 14, height: 14 }} />
                                  ) : (
                                    <Circle style={{ width: 14, height: 14 }} />
                                  )}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      textDecoration: task.completed ? 'line-through' : undefined,
                                      color: task.completed ? 'var(--ws-text-2)' : undefined,
                                    }}
                                  >
                                    {task.title}
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                    {task.mandatory ? <ToneChip tone={TONES.red}>إلزامية</ToneChip> : null}
                                    {task.roleLabel ? <ToneChip tone={TONES.purple}>{task.roleLabel}</ToneChip> : null}
                                    {task.actionCategoryLabel ? (
                                      <ToneChip tone={TONES.sky}>{task.actionCategoryLabel}</ToneChip>
                                    ) : null}
                                    {task.pointsToDeduct && task.pointsToDeduct > 0 ? (
                                      <ToneChip tone={TONES.red}>خصم {task.pointsToDeduct} نقطة</ToneChip>
                                    ) : null}
                                    {task.systemTriggerLabel ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          padding: '1.5px 8px',
                                          borderRadius: 999,
                                          border: `1px solid ${TONES.amber.bd}`,
                                          background: chip(TONES.amber),
                                          color: TONES.amber.tx,
                                          fontSize: 11,
                                          fontWeight: 700,
                                        }}
                                      >
                                        <Zap style={{ width: 11, height: 11 }} />
                                        أتمتة: {task.systemTriggerLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                  {/* تذييل المهمة: الحالة يميناً وإجراؤها يساراً في صف واحد */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: 8,
                                      flexWrap: 'wrap',
                                      marginTop: 5,
                                    }}
                                  >
                                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ws-text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {task.completedDate ? (
                                        <>
                                          <CheckCircle2 style={{ width: 12, height: 12, color: TONES.green.tx }} />
                                          أُنجز بتاريخ {task.completedDate}
                                        </>
                                      ) : task.completed ? (
                                        <>
                                          <CheckCircle2 style={{ width: 12, height: 12, color: TONES.green.tx }} />
                                          تم التعليم كمكتمل
                                        </>
                                      ) : task.mandatory ? (
                                        <>
                                          <Clock style={{ width: 12, height: 12, color: TONES.amber.tx }} />
                                          <span style={{ color: TONES.amber.tx }}>بانتظار التنفيذ</span>
                                        </>
                                      ) : (
                                        'خطوة اختيارية'
                                      )}
                                    </p>
                                    {task.actionType === 'counselor_referral' ? (
                                      <WsBtn size="sm" icon={FileText} onClick={handleOpenReferralForm}>
                                        نموذج التحويل
                                      </WsBtn>
                                    ) : matchesGuardianInvitation ? (
                                      <WsBtn size="sm" icon={Users} onClick={handleOpenGuardianInvitation}>
                                        دعوة ولي الأمر
                                      </WsBtn>
                                    ) : task.systemTrigger ? (
                                      <AutomationTriggerButton
                                        systemTrigger={task.systemTrigger as BehaviorSystemTrigger}
                                        systemTriggerLabel={task.systemTriggerLabel ?? task.systemTrigger}
                                        pointsToDeduct={task.pointsToDeduct}
                                        disabled={task.completed}
                                        style={{ marginTop: 0 }}
                                        onExecute={async () => {
                                          await executeAutomation({
                                            violationId: violation.id,
                                            procedureStep: procedure.step,
                                            taskId: task.id,
                                            systemTrigger: task.systemTrigger as string,
                                          })
                                        }}
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {/* تذييل الإجراء: حالة التنفيذ يميناً وزرّ الملاحظات يساراً */}
                    <div
                      style={{
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ws-text-2)' }}>
                        <Clock style={{ width: 13, height: 13 }} />
                        {procedure.completed
                          ? `أُنجز بتاريخ ${procedure.completedDate ?? 'غير محدد'}`
                          : 'لم يتم التنفيذ بعد'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpenNotes((prev) => ({ ...prev, [procedure.step]: !notesOpen }))}
                        aria-expanded={notesOpen}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          font: 'inherit',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--ws-accent)',
                        }}
                      >
                        <StickyNote style={{ width: 13, height: 13 }} />
                        الملاحظات
                        {procedure.notes?.trim() ? (
                          <span
                            title="توجد ملاحظات محفوظة"
                            style={{ width: 6, height: 6, borderRadius: '50%', background: TONES.green.bd }}
                          />
                        ) : null}
                        <ChevronDown
                          style={{
                            width: 13,
                            height: 13,
                            transform: notesOpen ? 'rotate(180deg)' : undefined,
                            transition: 'transform .15s',
                          }}
                        />
                      </button>
                    </div>
                    {notesOpen ? (
                      <div style={{ marginTop: 6 }}>
                        <WsTextarea
                          value={procedure.notes ?? ''}
                          onChange={(event) =>
                            updateProcedureNotes(violation.id, procedure.step, event.target.value)
                          }
                          placeholder="أضف تحديثات أو تفاصيل حول تنفيذ الإجراء"
                          aria-label={`ملاحظات الإجراء ${procedure.title}`}
                          rows={3}
                        />
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </WsBlock>
        </WsMain>

        {/* القسم الثاني: بطاقة الطالب وسجله */}
        <WsSideCol side="end" title="بطاقة الطالب" icon={User} storageKey="ws:behavior-detail:sidecol" width={300}>
          <WsBlock padded>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>
                {student?.name ?? violation.studentName}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: chip(TONES.sky),
                  border: `1px solid ${TONES.sky.bd}`,
                  color: TONES.sky.tx,
                }}
              >
                {student?.studentId ?? violation.studentNumber}
              </span>
            </div>
            <WsFactsList>
              <WsFactRow label="الصف">{violation.grade}</WsFactRow>
              <WsFactRow label="الشعبة">{violation.class}</WsFactRow>
              <WsFactRow label="عدد المخالفات">
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{student?.violationsCount ?? '—'}</b>
              </WsFactRow>
            </WsFactsList>
            {typeof behaviorScore === 'number' ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>مؤشر السلوك</span>
                  <b style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums', color: scoreTone(behaviorScore).tx }}>
                    {behaviorScore} / 100
                  </b>
                </div>
                <div style={{ height: 7, marginTop: 5, borderRadius: 4, background: 'var(--ws-surface-2)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, behaviorScore))}%`,
                      background: scoreTone(behaviorScore).bd,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </WsBlock>

          <WsBlock
            title="سجل الطالب"
            icon={ClipboardList}
            count={relatedViolations.length || undefined}
            fill
            scroll
          >
            {relatedViolations.length === 0 ? (
              <WsEmpty icon={ClipboardList}>لا توجد مخالفات أخرى مسجلة لهذا الطالب.</WsEmpty>
            ) : (
              <div>
                {relatedViolations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/admin/behavior/${item.id}`)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'start',
                      padding: '8px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--ws-hairline)',
                      background: 'transparent',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'var(--ws-text)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13.5,
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.type}
                      </span>
                      <ViolationBadge degree={item.degree} size="sm" />
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--ws-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                        {item.date}
                      </span>
                      <ToneChip tone={STATUS_TONES[item.status] ?? TONES.gray}>{item.status}</ToneChip>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* مودال النماذج الرسمية (إحالة / دعوة ولي أمر) */}
      {documentModal ? (
        <div className="ws-modal" onClick={handleCloseDocumentModal}>
          <div
            className="ws-modal__panel"
            style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '90vh' }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ws-modal__head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <h3 className="ws-modal__title">{documentModal.title}</h3>
                <p className="ws-modal__sub">راجع البيانات ثم اطبع النموذج الرسمي أو نزّله.</p>
              </div>
              <span style={{ display: 'inline-flex', gap: 6, flexShrink: 0 }}>
                <WsBtn size="sm" icon={Download} onClick={handleDownloadDocument}>
                  تنزيل
                </WsBtn>
                <WsBtn size="sm" variant="primary" icon={Printer} onClick={handlePrintDocument}>
                  طباعة
                </WsBtn>
              </span>
            </header>
            <div className="ws-modal__body" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  border: '1px solid var(--ws-hairline)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--ws-surface-2)',
                }}
              >
                <iframe
                  title={documentModal.title}
                  srcDoc={documentModal.html}
                  style={{ width: '100%', height: '68vh', border: 'none', background: '#FFFFFF' }}
                />
              </div>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={handleCloseDocumentModal}>إغلاق</WsBtn>
            </footer>
          </div>
        </div>
      ) : null}
    </WsPage>
  )
}

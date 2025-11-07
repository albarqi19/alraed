import { type ReactNode, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  Printer,
  ShieldAlert,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { useBehaviorStore } from '@/modules/admin/behavior/store/use-behavior-store'
import { ViolationBadge } from '@/modules/admin/behavior/components/violation-badge'
import type { BehaviorStatus, BehaviorViolation } from '@/modules/admin/behavior/types'
import { generateCounselorReferralHtml } from '@/modules/admin/behavior/counselor-referral-template'
import { generateGuardianInvitationHtml } from '@/modules/admin/behavior/guardian-invitation-template'
import { useAdminSettingsQuery } from '@/modules/admin/hooks'

const STATUS_META: Record<BehaviorStatus, string> = {
  'قيد المعالجة': 'bg-amber-50 text-amber-700 border border-amber-200',
  'جاري التنفيذ': 'bg-sky-50 text-sky-700 border border-sky-200',
  مكتملة: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ملغاة: 'bg-rose-50 text-rose-600 border border-rose-200',
}

export function AdminBehaviorDetailPage() {
  const { violationId = '' } = useParams<{ violationId: string }>()
  const violations = useBehaviorStore((state) => state.violations)
  const students = useBehaviorStore((state) => state.students)
  const toggleProcedure = useBehaviorStore((state) => state.toggleProcedure)
  const toggleProcedureTask = useBehaviorStore((state) => state.toggleProcedureTask)
  const updateProcedureNotes = useBehaviorStore((state) => state.updateProcedureNotes)
  const procedureMutations = useBehaviorStore((state) => state.procedureMutations)

  const adminSettingsQuery = useAdminSettingsQuery()

  const [documentModal, setDocumentModal] = useState<{
    title: string
    html: string
    fileName: string
  } | null>(null)

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
      referralDate: new Date().toLocaleDateString('ar-SA'),
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
      fallbackLocales: string = 'ar-SA',
    ) => {
      try {
        return new Intl.DateTimeFormat(locales, options).format(target)
      } catch (error) {
        return new Intl.DateTimeFormat(fallbackLocales, options).format(target)
      }
    }

    const meetingDate = parseDate(violation.date)
    const now = new Date()

    const meetingDay = safeFormat('ar-SA', { weekday: 'long' }, meetingDate)
    const meetingDateGregorian = safeFormat('ar-SA', { day: '2-digit', month: 'long', year: 'numeric' }, meetingDate)
    const meetingDateHijri = safeFormat(
      'ar-SA-u-ca-islamic',
      { day: '2-digit', month: 'long', year: 'numeric' },
      meetingDate,
    )
    const issueDateGregorian = safeFormat('ar-SA', { day: '2-digit', month: 'long', year: 'numeric' }, now)
    const issueDateHijri = safeFormat(
      'ar-SA-u-ca-islamic',
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
      <section className="mx-auto max-w-4xl space-y-6 py-10">
        <header className="flex items-center gap-3">
          <div className="rounded-full bg-amber-50 p-2 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">لم يتم العثور على المخالفة</h1>
            <p className="text-sm text-muted">تحقق من الرابط أو عد إلى سجل المخالفات.</p>
          </div>
        </header>
        <div className="glass-card flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              ربما تمت إزالة هذه المخالفة أو أن المعرف المستخدم غير صحيح.
            </p>
            <p className="mt-1 text-xs text-muted">
              يمكنك الرجوع إلى سجل المخالفات للبحث عن الطالب أو المخالفة المطلوبة.
            </p>
          </div>
          <Link to="/admin/behavior" className="button-primary inline-flex items-center gap-2 text-sm">
            العودة إلى سجل المخالفات
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    )
  }

  const statusClass = STATUS_META[violation.status]
  const completionLabel = `${completion.completed} / ${violation.procedures.length}`

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-700">متابعة المخالفة السلوكية</p>
          <h1 className="text-3xl font-bold text-slate-900">{violation.studentName}</h1>
          <p className="mt-1 text-sm text-muted">
            تفاصيل المخالفة رقم{' '}
            <span className="font-mono text-xs text-slate-500" title={violation.id}>
              {violation.id.split('-')[0]}
            </span>
          </p>
        </div>
        <Link
          to="/admin/behavior"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          العودة إلى سجل المخالفات
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section className="glass-card space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ViolationBadge degree={violation.degree} />
                <div>
                  <p className="text-lg font-semibold text-slate-900">{violation.type}</p>
                  <p className="text-sm text-muted">درجة المخالفة {violation.degree}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                <ShieldAlert className="h-4 w-4" />
                {violation.status}
              </span>
            </header>

            <div className="grid gap-4 text-sm text-muted md:grid-cols-2">
              <InfoRow icon={<Clock className="h-4 w-4" />} label="التاريخ والوقت">
                {violation.date} · {violation.time}
              </InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="مكان المخالفة">
                {violation.location || 'غير محدد'}
              </InfoRow>
              <InfoRow icon={<UserRoundCheck className="h-4 w-4" />} label="المبلّغ">
                {violation.reportedBy}
              </InfoRow>
              <InfoRow icon={<FileText className="h-4 w-4" />} label="رقم الطالب">
                {violation.studentNumber}
              </InfoRow>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">وصف الحالة</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {violation.description || 'لا توجد تفاصيل إضافية مسجلة لهذه المخالفة.'}
              </p>
            </div>
          </section>

          <section className="glass-card space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary-700">متابعة الإجراءات</p>
                <h2 className="text-xl font-bold text-slate-900">الإجراءات التصحيحية</h2>
              </div>
              <div className="text-right text-xs text-muted">
                <p>نسبة الإنجاز</p>
                <p className="text-sm font-semibold text-slate-900">
                  {completion.percent}% <span className="text-xs text-muted">({completionLabel})</span>
                </p>
              </div>
            </header>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70 transition-all"
                style={{ width: `${completion.percent}%` }}
              />
            </div>

            <div className="space-y-4">
              {violation.procedures.map((procedure) => {
                const procedureMutationKey = `${violation.id}-${procedure.step}`
                const isProcedureMutating = Boolean(procedureMutations[procedureMutationKey])

                return (
                  <article
                    key={procedure.step}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:border-primary/40"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {procedure.step}
                        </span>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{procedure.title}</p>
                          <p className="text-xs text-muted">{procedure.description}</p>
                          {procedure.mandatory ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                              <AlertCircle className="h-3 w-3" /> إجراء إلزامي
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void toggleProcedure(violation.id, procedure.step).catch(() => undefined)
                        }}
                        disabled={isProcedureMutating}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          procedure.completed
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {isProcedureMutating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : procedure.completed ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            مكتمل
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4" />
                            تعليم كمكتمل
                          </>
                        )}
                      </button>
                    </header>

                    {procedure.tasks.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">خطوات الإجراء</p>
                        <ul className="space-y-2">
                          {procedure.tasks.map((task) => {
                            const taskKey = `${violation.id}-${procedure.step}-${task.id}`
                            const isTaskMutating = Boolean(procedureMutations[taskKey])
                            const isTaskDisabled = isTaskMutating || isProcedureMutating
                            const toggleClasses = task.completed
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                            const matchesGuardianInvitation =
                              task.actionType === 'guardian_invitation' ||
                              task.title.includes('دعوة ولي أمر') ||
                              task.title.includes('دعوة ولي الأمر') ||
                              task.title.includes('دعوة ولي الامر')

                            // Debug log
                            if (matchesGuardianInvitation) {
                              console.log('Guardian invitation task found:', {
                                title: task.title,
                                actionType: task.actionType,
                                procedureStep: procedure.step,
                              })
                            }

                            return (
                              <li
                                key={task.id}
                                className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                                  task.completed
                                    ? 'border-emerald-200 bg-emerald-50/70'
                                    : 'border-slate-200 bg-white/80'
                                }`}
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
                                  className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toggleClasses}`}
                                >
                                  {isTaskMutating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : task.completed ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <Circle className="h-4 w-4" />
                                  )}
                                </button>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium text-slate-800">{task.title}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                                    <span
                                      className={`rounded-full px-2 py-0.5 font-semibold ${
                                        task.mandatory
                                          ? 'bg-rose-50 text-rose-600'
                                          : 'bg-sky-50 text-sky-700'
                                      }`}
                                    >
                                      {task.mandatory ? 'إلزامية' : 'اختيارية'}
                                    </span>
                                    {task.completedDate ? (
                                      <span>أُنجز بتاريخ {task.completedDate}</span>
                                    ) : task.completed ? (
                                      <span>تم التعليم كمكتمل</span>
                                    ) : task.mandatory ? (
                                      <span>بانتظار التنفيذ</span>
                                    ) : (
                                      <span>خطوة اختيارية</span>
                                    )}
                                  </div>
                                  {task.actionType === 'counselor_referral' ? (
                                    <button
                                      type="button"
                                      onClick={handleOpenReferralForm}
                                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                      >
                                        <path
                                          d="M15 12H9m3-3v6m8 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                      التحويل
                                    </button>
                                  ) : matchesGuardianInvitation ? (
                                    <button
                                      type="button"
                                      onClick={handleOpenGuardianInvitation}
                                      className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                      >
                                        <path
                                          d="M18 8a4 4 0 10-4.875 3.875L9 17H7l-4 4h18l-4-4h-2l-2.344-5.468A4 4 0 0018 8z"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                      دعوة ولي الأمر
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {procedure.completed
                            ? `أُنجز بتاريخ ${procedure.completedDate ?? 'غير محدد'}`
                            : 'لم يتم التنفيذ بعد'}
                        </span>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          ملاحظات الإجراء
                        </p>
                        <textarea
                          value={procedure.notes ?? ''}
                          onChange={(event) =>
                            updateProcedureNotes(violation.id, procedure.step, event.target.value)
                          }
                          placeholder="أضف تحديثات أو تفاصيل حول تنفيذ الإجراء"
                          className="h-24 w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass-card space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary-700">بيانات الطالب</p>
                <h2 className="text-xl font-bold text-slate-900">{student?.name ?? violation.studentName}</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {student?.studentId ?? violation.studentNumber}
              </span>
            </header>
            <div className="grid gap-3 text-sm text-muted">
              <InfoRow icon={<UserRoundCheck className="h-4 w-4" />} label="الصف">
                {violation.grade}
              </InfoRow>
              <InfoRow icon={<UserRoundCheck className="h-4 w-4" />} label="الشعبة">
                {violation.class}
              </InfoRow>
              <InfoRow icon={<ShieldAlert className="h-4 w-4" />} label="عدد المخالفات">
                {student?.violationsCount ?? '—'}
              </InfoRow>
              <InfoRow icon={<ShieldAlert className="h-4 w-4" />} label="مؤشر السلوك">
                {student?.behaviorScore ?? '—'} / 100
              </InfoRow>
            </div>
          </section>

          <section className="glass-card space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary-700">مخالفات مرتبطة</p>
                <h2 className="text-lg font-bold text-slate-900">سجل الطالب</h2>
              </div>
              <span className="text-xs text-muted">
                {relatedViolations.length > 0 ? `آخر ${relatedViolations.length} سجلات` : 'لا توجد سجلات إضافية'}
              </span>
            </header>

            {relatedViolations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-muted">
                لا توجد مخالفات أخرى مسجلة لهذا الطالب.
              </div>
            ) : (
              <ul className="space-y-3">
                {relatedViolations.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.type}</p>
                        <p className="text-xs text-muted">
                          {item.date} · {item.status}
                        </p>
                      </div>
                      <ViolationBadge degree={item.degree} size="sm" />
                    </div>
                    <Link
                      to={`/admin/behavior/${item.id}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      عرض التفاصيل
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {documentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3 text-right">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">{documentModal.title}</h3>
                <p className="text-sm text-muted">
                  راجع البيانات ثم استخدم خيارات الطباعة أو التنزيل لإصدار النموذج الرسمي.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDocumentModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" className="button-secondary text-xs" onClick={handleDownloadDocument}>
                  <Download className="h-4 w-4" /> تنزيل النموذج
                </button>
                <button type="button" className="button-primary text-xs" onClick={handlePrintDocument}>
                  <Printer className="h-4 w-4" /> طباعة النموذج
                </button>
              </div>

              <div className="overflow-auto rounded-3xl border border-slate-200 bg-slate-100 p-2">
                <iframe
                  title={documentModal.title}
                  srcDoc={documentModal.html}
                  className="h-[70vh] w-full min-w-[520px] rounded-2xl bg-white shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

interface InfoRowProps {
  icon: ReactNode
  label: string
  children: ReactNode
}

function InfoRow({ icon, label, children }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-sm text-slate-700">{children}</p>
      </div>
    </div>
  )
}

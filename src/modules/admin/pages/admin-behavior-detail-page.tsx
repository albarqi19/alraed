import { type ReactNode, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  FileText,
  MapPin,
  ShieldAlert,
  UserRoundCheck,
} from 'lucide-react'
import { useBehaviorStore } from '@/modules/admin/behavior/store/use-behavior-store'
import { ViolationBadge } from '@/modules/admin/behavior/components/violation-badge'
import type { BehaviorStatus } from '@/modules/admin/behavior/types'

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
  const updateProcedureNotes = useBehaviorStore((state) => state.updateProcedureNotes)

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
            <span className="font-mono text-xs text-slate-500">{violation.id}</span>
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
              {violation.procedures.map((procedure) => (
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
                      onClick={() => toggleProcedure(violation.id, procedure.step)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        procedure.completed
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {procedure.completed ? (
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
              ))}
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

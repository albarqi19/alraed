import { useState } from 'react'
import { ChevronDown, Link2, Plus, Power, School, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useCreateReferralCodeMutation,
  useReferralCodeSchoolsQuery,
  useReferralCodesQuery,
  useToggleReferralCodeMutation,
} from '../hooks'
import type { ReferralCode, ReferralCodePayload } from '../types'

/**
 * رموزُ الإحالة — «من دلَّ هذه المدرسة علينا؟».
 *
 * الشاشةُ تجيب سؤالاً واحداً، فبُنيت حوله: عمودُ العدد هو أعرضُ ما فيها،
 * والترتيبُ عليه لا على تاريخ الإنشاء — فأوّلُ ما تراه العينُ هو أنفعُ
 * الشركاء، لا آخرُ رمزٍ أُنشئ.
 *
 * ولا ذكرَ للخصم في أيّ نصٍّ يراه غيرُ المالك: هذه الشاشةُ خلف `super-admin`،
 * وما فيها من نسبٍ ومُدَدٍ لا يخرج منها. أمّا شاشةُ التسجيل فتسأل عن الرمز
 * ولا تَعِد بشيء — انظر تعليقَ الحقل هناك.
 */
export function PlatformReferralsPage() {
  const { data, isLoading, isError, error } = useReferralCodesQuery()
  const createMutation = useCreateReferralCodeMutation()
  const toggleMutation = useToggleReferralCodeMutation()

  const [isFormOpen, setFormOpen] = useState(false)
  /* بطاقةٌ واحدةٌ مفتوحةٌ في كلّ مرّة: فتحُ الثانية يُغلق الأولى، فلا تصير
     الصفحةُ طوابيرَ مدارسَ متجاورةً لا يُعرف أيُّها لأيّ رمز. */
  const [openCodeId, setOpenCodeId] = useState<number | null>(null)

  const codes = data?.items ?? []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Link2 className="h-6 w-6 text-emerald-600" />
            رموز الإحالة
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            لكلّ شريكٍ رمزٌ يوزّعه، ومن سجّل به تُعرف وجهتُه.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)}>
          <Plus className="ml-1.5 h-4 w-4" />
          رمز جديد
        </Button>
      </header>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="الرموز" value={summary.codes} icon={Link2} />
          <StatCard label="المفعّلة" value={summary.active_codes} icon={Power} />
          <StatCard label="مدارس جاءت من إحالة" value={summary.schools} icon={School} />
        </div>
      ) : null}

      {isFormOpen ? (
        <CodeForm
          isSaving={createMutation.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={(payload) =>
            createMutation.mutate(payload, { onSuccess: () => setFormOpen(false) })
          }
        />
      ) : null}

      {isLoading ? <p className="py-10 text-center text-sm text-slate-400">جارٍ التحميل…</p> : null}

      {isError ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {(error as Error)?.message ?? 'تعذر تحميل الرموز'}
        </p>
      ) : null}

      {!isLoading && !isError && codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <Link2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">لا رموز بعد. أنشئ رمزاً وأعطه لمن يدلّ عليك.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {codes.map((code) => (
          <CodeRow
            key={code.id}
            code={code}
            isOpen={openCodeId === code.id}
            isToggling={toggleMutation.isPending && toggleMutation.variables === code.id}
            onToggleOpen={() => setOpenCodeId((current) => (current === code.id ? null : code.id))}
            onToggleActive={() => toggleMutation.mutate(code.id)}
          />
        ))}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Link2
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function CodeRow({
  code,
  isOpen,
  isToggling,
  onToggleOpen,
  onToggleActive,
}: {
  code: ReferralCode
  isOpen: boolean
  isToggling: boolean
  onToggleOpen: () => void
  onToggleActive: () => void
}) {
  /* الفرقُ بين العدّادين هو ما حُذف من المدارس. يُعرَض حين يوجد فقط —
     صفرٌ محذوفٌ ليس خبراً، ووجودُه دائماً يُضيف ضجيجاً لكلّ صفّ. */
  const deleted = code.schools_count - code.active_schools_count

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex flex-1 items-center gap-3 text-right"
        >
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-bold text-slate-800">
                {code.code}
              </code>
              {!code.is_active ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  مُوقَف
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-slate-600">
              {code.owner_name}
              {code.owner_phone ? (
                <span className="text-slate-400"> · <span dir="ltr">{code.owner_phone}</span></span>
              ) : null}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 text-center">
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5">
            <p className="text-lg font-bold leading-none text-emerald-700">{code.active_schools_count}</p>
            <p className="mt-0.5 text-[11px] text-emerald-600">مدرسة</p>
          </div>
          {deleted > 0 ? (
            <div className="rounded-lg bg-slate-50 px-3 py-1.5">
              <p className="text-lg font-bold leading-none text-slate-400">{deleted}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">محذوفة</p>
            </div>
          ) : null}
        </div>

        <div className="text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">{Number(code.discount_percent)}%</p>
          <p>{code.discount_months} شهراً</p>
        </div>

        <Button variant="outline" size="sm" onClick={onToggleActive} disabled={isToggling}>
          <Power className="ml-1.5 h-3.5 w-3.5" />
          {code.is_active ? 'إيقاف' : 'تفعيل'}
        </Button>
      </div>

      {isOpen ? <CodeSchools codeId={code.id} /> : null}
    </div>
  )
}

function CodeSchools({ codeId }: { codeId: number }) {
  const { data, isLoading, isError } = useReferralCodeSchoolsQuery(codeId)

  if (isLoading) {
    return <p className="border-t border-slate-100 p-4 text-sm text-slate-400">جارٍ التحميل…</p>
  }

  if (isError) {
    return <p className="border-t border-slate-100 p-4 text-sm text-red-600">تعذر تحميل المدارس</p>
  }

  const schools = data?.schools ?? []

  if (schools.length === 0) {
    return (
      <p className="border-t border-slate-100 p-4 text-sm text-slate-400">
        لم تسجّل أيّ مدرسة بهذا الرمز بعد.
      </p>
    )
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="text-[11px] font-semibold text-slate-500">
            <th className="px-4 py-2">المدرسة</th>
            <th className="px-4 py-2">المدير</th>
            <th className="px-4 py-2">سجّلت في</th>
            <th className="px-4 py-2">الخصم</th>
          </tr>
        </thead>
        <tbody>
          {schools.map((school) => (
            <tr key={school.id} className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-semibold text-slate-800">{school.name}</td>
              <td className="px-4 py-2.5 text-slate-600">
                {school.admin_name ?? '—'}
                {school.admin_email ? (
                  <span className="block text-xs text-slate-400" dir="ltr">
                    {school.admin_email}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-slate-500" dir="ltr">
                {school.created_at?.slice(0, 10) ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                {school.discount_active ? (
                  <span className="text-xs font-semibold text-emerald-700">
                    سارٍ حتى <span dir="ltr">{school.referral_discount_ends_at?.slice(0, 10)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">انقضى</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeForm({
  isSaving,
  onCancel,
  onSubmit,
}: {
  isSaving: boolean
  onCancel: () => void
  onSubmit: (payload: ReferralCodePayload) => void
}) {
  const [form, setForm] = useState<ReferralCodePayload>({
    code: '',
    owner_name: '',
    owner_phone: '',
    discount_percent: 5,
    discount_months: 12,
  })

  const canSubmit = Boolean(form.code?.trim()) && Boolean(form.owner_name?.trim())

  return (
    <form
      className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) return
        onSubmit({
          ...form,
          code: form.code?.trim(),
          owner_name: form.owner_name?.trim(),
          owner_phone: form.owner_phone?.trim() || null,
        })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الرمز">
          <input
            required
            dir="ltr"
            value={form.code ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="AHMED10"
            /* الكبيرُ عرضاً لا في الحالة — الخادم يوحّد الصورة عنده. */
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left font-mono text-sm uppercase"
          />
        </Field>
        <Field label="صاحب الرمز">
          <input
            required
            value={form.owner_name ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, owner_name: event.target.value }))}
            placeholder="أحمد الشمري"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="الجوال — اختياري">
          <input
            dir="ltr"
            value={form.owner_phone ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, owner_phone: event.target.value }))}
            placeholder="05xxxxxxxx"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نسبة الخصم %">
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.discount_percent ?? 5}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discount_percent: Number(event.target.value) }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="مدّته بالأشهر">
            <input
              type="number"
              min={1}
              max={120}
              value={form.discount_months ?? 12}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discount_months: Number(event.target.value) }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Users className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        النسبة والمدّة تُنسخان في صفّ المدرسة وقت التسجيل — تعديلهما لاحقاً يخصّ من يسجّل بعده،
        ولا يمسّ صفقةَ مدرسةٍ قائمة.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          إلغاء
        </Button>
        <Button type="submit" disabled={!canSubmit || isSaving}>
          {isSaving ? 'جارٍ الحفظ…' : 'إنشاء'}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
      {label}
      {children}
    </label>
  )
}

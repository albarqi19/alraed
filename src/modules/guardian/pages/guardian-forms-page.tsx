import { useEffect, useMemo, useState } from 'react'
import { GuardianPortalHeader } from '../components/guardian-portal-header'
import { GuardianFormRenderer } from '../components/forms/guardian-form-renderer'
import { useGuardianForms } from '@/modules/forms/hooks'
import type { PublicFormDetails } from '@/modules/forms/types'
import { useToast } from '@/shared/feedback/use-toast'

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value ?? '—'
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(date)
  } catch {
    return date.toLocaleDateString('ar-SA')
  }
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export function GuardianFormsPage() {
  const [nationalIdInput, setNationalIdInput] = useState('')
  const [activeNationalId, setActiveNationalId] = useState<string | null>(null)
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const toast = useToast()

  const formsQuery = useGuardianForms(activeNationalId ?? '')
  const forms = formsQuery.data ?? []

  useEffect(() => {
    if (!forms || forms.length === 0) {
      setSelectedFormId(null)
      return
    }
    if (selectedFormId == null || !forms.some((form) => form.id === selectedFormId)) {
      setSelectedFormId(forms[0]?.id ?? null)
    }
  }, [forms, selectedFormId])

  const selectedForm: PublicFormDetails | null = useMemo(() => {
    if (!forms || forms.length === 0) return null
    if (selectedFormId == null) return forms[0]
    return forms.find((form) => form.id === selectedFormId) ?? forms[0]
  }, [forms, selectedFormId])

  const handleSubmitNationalId = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const sanitized = nationalIdInput.replace(/\D/g, '').slice(0, 10)
    if (sanitized.length !== 10) {
      setInputError('يرجى إدخال رقم هوية مكون من 10 أرقام')
      return
    }
    setInputError(null)
    setActiveNationalId(sanitized)
  }

  const handleFormSubmitted = () => {
    formsQuery.refetch().catch(() => {
      toast({ type: 'error', title: 'تعذر تحديث قائمة النماذج بعد الإرسال' })
    })
  }

  return (
    <section className="guardian-portal-page space-y-6 sm:space-y-8">
      <GuardianPortalHeader isLoggedIn={Boolean(activeNationalId)} />

      <div className="glass-card space-y-5 sm:space-y-6">
        <form className="space-y-3" onSubmit={handleSubmitNationalId}>
          <label className="block text-right text-xs font-semibold text-slate-600">رقم هوية الطالب</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              className={`w-full rounded-2xl border px-4 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${inputError ? 'border-rose-300' : 'border-slate-200'}`}
              placeholder="أدخل رقم هوية الطالب"
              value={nationalIdInput}
              onChange={(event) => {
                const sanitized = event.target.value.replace(/\D/g, '')
                setNationalIdInput(sanitized.slice(0, 10))
              }}
              disabled={formsQuery.isFetching}
            />
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={formsQuery.isFetching}
            >
              {formsQuery.isFetching ? 'جاري التحميل...' : 'عرض النماذج'}
            </button>
          </div>
          {inputError ? <p className="text-xs text-rose-600">{inputError}</p> : null}
        </form>

        {activeNationalId ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-700">
            رقم الهوية الحالي: <span className="font-semibold">{activeNationalId}</span>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-muted">
            أدخل رقم الهوية لعرض النماذج الإلكترونية الموجهة لطالبك. يتم تحميل النماذج النشطة فقط والتي تنتظر الرد.
          </p>
        )}
      </div>

      {formsQuery.isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-center text-sm text-rose-700">
          {resolveErrorMessage(formsQuery.error, 'تعذر تحميل النماذج. يرجى المحاولة لاحقاً.')}
        </div>
      ) : null}

      {activeNationalId && formsQuery.isFetching ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {formsQuery.isSuccess && forms.length > 0 ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-800">
            لديك <span className="font-bold">{forms.length}</span> {forms.length > 1 ? 'نماذج' : 'نموذج'} بانتظار تعبئتك. يرجى إكمال الردود قبل انتهاء المدة المحددة.
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
            <aside className="space-y-3">
              {forms.map((form) => {
                const isActive = selectedForm?.id === form.id
                return (
                  <button
                    type="button"
                    key={form.id}
                    onClick={() => setSelectedFormId(form.id)}
                    className={`relative w-full rounded-3xl border px-4 py-4 text-right transition ${
                      isActive
                        ? 'border-indigo-400 bg-white shadow-md'
                        : 'border-slate-200 bg-white/60 hover:border-indigo-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{form.title}</p>
                        {form.description ? (
                          <p className="text-xs text-muted line-clamp-2">{form.description}</p>
                        ) : null}
                        <p className="text-[11px] text-slate-400">
                          متاح حتى {formatDate(form.end_at)}
                        </p>
                      </div>
                      <i className={`bi ${isActive ? 'bi-check-circle-fill text-emerald-500' : 'bi-circle text-slate-300'}`} />
                    </div>
                  </button>
                )
              })}
            </aside>

            <main className="space-y-4">
              {selectedForm ? (
                <div className="space-y-4">
                  <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedForm.title}</h2>
                    {selectedForm.description ? (
                      <p className="mt-2 text-sm text-muted">{selectedForm.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 px-3 py-1">
                        يبدأ: {formatDate(selectedForm.start_at)}
                      </span>
                      <span className="rounded-full border border-slate-200 px-3 py-1">
                        ينتهي: {formatDate(selectedForm.end_at)}
                      </span>
                      {selectedForm.allow_multiple_submissions ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                          يسمح بأكثر من رد واحد
                        </span>
                      ) : null}
                    </div>
                  </header>

                  {activeNationalId ? (
                    <GuardianFormRenderer
                      form={selectedForm}
                      nationalId={activeNationalId}
                      onSubmitted={handleFormSubmitted}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-muted">
                  اختر نموذجاً من القائمة لبدء تعبئته.
                </div>
              )}
            </main>
          </div>
        </div>
      ) : null}

      {formsQuery.isSuccess && activeNationalId && forms.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-muted">
          لا توجد نماذج مطلوبة حالياً لهذا الطالب. في حال ظهور نموذج جديد سنخبرك هنا فوراً.
        </div>
      ) : null}
    </section>
  )
}

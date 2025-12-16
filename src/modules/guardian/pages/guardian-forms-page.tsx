import { useEffect, useMemo, useState } from 'react'
import { FileText, Calendar, CheckCircle } from 'lucide-react'
import { GuardianFormRenderer } from '../components/forms/guardian-form-renderer'
import { useGuardianForms } from '@/modules/forms/hooks'
import type { PublicFormDetails } from '@/modules/forms/types'
import { useToast } from '@/shared/feedback/use-toast'
import { useGuardianContext } from '../context/guardian-context'

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
  const { currentNationalId } = useGuardianContext()
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null)
  const toast = useToast()

  const formsQuery = useGuardianForms(currentNationalId ?? '')
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

  const handleFormSubmitted = () => {
    formsQuery.refetch().catch(() => {
      toast({ type: 'error', title: 'تعذر تحديث قائمة النماذج بعد الإرسال' })
    })
  }

  // Refetch forms when page is visited
  useEffect(() => {
    if (currentNationalId) {
      formsQuery.refetch()
    }
  }, [currentNationalId])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900">النماذج الإلكترونية</h2>
        <p className="mt-1 text-sm text-slate-500">النماذج المطلوب تعبئتها</p>
      </div>

      {/* Loading */}
      {formsQuery.isFetching && (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {formsQuery.isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
          {resolveErrorMessage(formsQuery.error, 'تعذر تحميل النماذج. يرجى المحاولة لاحقاً.')}
        </div>
      )}

      {/* Forms list */}
      {formsQuery.isSuccess && forms.length > 0 && (
        <div className="space-y-4">
          {/* Alert */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-bold">{forms.length}</span> {forms.length > 1 ? 'نماذج' : 'نموذج'} بانتظار تعبئتك
          </div>

          {/* Forms grid */}
          <div className="space-y-3">
            {forms.map((form) => {
              const isActive = selectedForm?.id === form.id
              return (
                <button
                  type="button"
                  key={form.id}
                  onClick={() => setSelectedFormId(form.id)}
                  className={`w-full rounded-2xl border p-4 text-right transition ${isActive
                      ? 'border-indigo-400 bg-indigo-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                      <FileText className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>
                        {form.title}
                      </p>
                      {form.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{form.description}</p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        متاح حتى {formatDate(form.end_at)}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle className="h-5 w-5 text-indigo-500" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected form details */}
          {selectedForm && currentNationalId && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{selectedForm.title}</h3>
              {selectedForm.description && (
                <p className="mt-2 text-sm text-slate-500">{selectedForm.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  يبدأ: {formatDate(selectedForm.start_at)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                  ينتهي: {formatDate(selectedForm.end_at)}
                </span>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <GuardianFormRenderer
                  form={selectedForm}
                  nationalId={currentNationalId}
                  onSubmitted={handleFormSubmitted}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {formsQuery.isSuccess && forms.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            لا توجد نماذج مطلوبة حالياً
          </p>
          <p className="mt-1 text-xs text-slate-400">
            سيتم إشعارك عند وجود نماذج جديدة
          </p>
        </div>
      )}
    </div>
  )
}

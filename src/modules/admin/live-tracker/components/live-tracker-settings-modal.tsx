import { useEffect, useState } from 'react'
import { Info, Loader2, MessageSquare, X } from 'lucide-react'

import {
  useTeacherAttendanceSettingsQuery,
  useUpdateTeacherAttendanceSettingsMutation,
} from '@/modules/admin/hooks'
import type { TeacherAttendanceSettingsPayload } from '@/modules/admin/types'

type FormState = {
  sendWhatsappForPeriodAbsence: boolean
  sendWhatsappForPeriodLate: boolean
  sendWhatsappForAssemblyAbsence: boolean
  periodAbsenceTemplateId: number | null
}

const DEFAULT_FORM: FormState = {
  sendWhatsappForPeriodAbsence: false,
  sendWhatsappForPeriodLate: false,
  sendWhatsappForAssemblyAbsence: false,
  periodAbsenceTemplateId: null,
}

type LiveTrackerSettingsModalProps = {
  open: boolean
  onClose: () => void
}

export function LiveTrackerSettingsModal({ open, onClose }: LiveTrackerSettingsModalProps) {
  const settingsQuery = useTeacherAttendanceSettingsQuery({ enabled: open })
  const updateMutation = useUpdateTeacherAttendanceSettingsMutation()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        sendWhatsappForPeriodAbsence: Boolean(settingsQuery.data.send_whatsapp_for_period_absence),
        sendWhatsappForPeriodLate: Boolean(settingsQuery.data.send_whatsapp_for_period_late),
        sendWhatsappForAssemblyAbsence: Boolean(settingsQuery.data.send_whatsapp_for_assembly_absence),
        periodAbsenceTemplateId: settingsQuery.data.period_absence_template_id ?? null,
      })
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (!open) return

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [open, onClose])

  if (!open) return null

  const isLoading = settingsQuery.isLoading
  const isSaving = updateMutation.isPending
  const templates = settingsQuery.data?.available_templates ?? []

  const handleCheckboxChange = (field: keyof FormState, checked: boolean) => {
    setForm((current) => ({ ...current, [field]: checked }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const payload: TeacherAttendanceSettingsPayload = {
      send_whatsapp_for_period_absence: form.sendWhatsappForPeriodAbsence,
      send_whatsapp_for_period_late: form.sendWhatsappForPeriodLate,
      send_whatsapp_for_assembly_absence: form.sendWhatsappForAssemblyAbsence,
      period_absence_template_id: form.periodAbsenceTemplateId,
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800">إشعارات المتابعة المباشرة</h2>
              <p className="text-xs text-slate-500">إعدادات إرسال واتساب عند الغياب والتأخر</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* القسم 1: إشعارات الحصص */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">إشعارات الحصص الدراسية</h3>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.sendWhatsappForPeriodAbsence}
                    onChange={(e) => handleCheckboxChange('sendWhatsappForPeriodAbsence', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">إشعار غياب الحصة</span>
                    <p className="text-xs text-slate-500">إرسال رسالة واتساب للمعلم عند تسجيل غيابه عن حصة</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.sendWhatsappForPeriodLate}
                    onChange={(e) => handleCheckboxChange('sendWhatsappForPeriodLate', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">إشعار تأخر الحصة</span>
                    <p className="text-xs text-slate-500">إرسال رسالة واتساب للمعلم عند تسجيل تأخره عن حصة</p>
                  </div>
                </label>
              </div>

              <hr className="border-slate-200" />

              {/* القسم 2: إشعارات الطابور */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">إشعارات الطابور الصباحي</h3>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.sendWhatsappForAssemblyAbsence}
                    onChange={(e) => handleCheckboxChange('sendWhatsappForAssemblyAbsence', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">إشعار غياب الطابور</span>
                    <p className="text-xs text-slate-500">إرسال رسالة واتساب للمعلم عند تسجيل غيابه عن الطابور</p>
                  </div>
                </label>
              </div>

              <hr className="border-slate-200" />

              {/* القسم 3: قالب الرسالة */}
              {(form.sendWhatsappForPeriodAbsence || form.sendWhatsappForPeriodLate || form.sendWhatsappForAssemblyAbsence) && templates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">قالب الرسالة (اختياري)</h3>
                  <select
                    value={form.periodAbsenceTemplateId ?? ''}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        periodAbsenceTemplateId: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="">الرسالة الافتراضية</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ملاحظة */}
              <div className="flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-xs leading-relaxed text-blue-700">
                  إعدادات إشعارات غياب الإشراف والمناوبة متاحة في صفحة الإشراف اليومي ضمن الإعدادات.
                </p>
              </div>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useActivateRemoteDayMutation } from '../remote-attendance/hooks'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string
  onSuccess?: () => void
}

export function RemoteDayActivationModal({
  isOpen,
  onClose,
  date,
  onSuccess,
}: Props) {
  const [note, setNote] = useState('')
  const activateMutation = useActivateRemoteDayMutation()

  if (!isOpen) return null

  const dateObj = new Date(date)
  const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' })
  const formattedDate = dateObj.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const handleSubmit = () => {
    activateMutation.mutate(
      { date, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setNote('')
          onClose()
          onSuccess?.()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* رأس النافذة */}
        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <i className="bi bi-laptop text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              تحويل الدوام إلى عن بعد
            </h2>
            <p className="text-sm text-slate-500">
              {dayName} - {formattedDate}
            </p>
          </div>
        </div>

        {/* المحتوى */}
        <div className="space-y-4 p-5">
          {/* تنبيهات */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-xl bg-purple-50 p-3 text-sm text-purple-800">
              <i className="bi bi-info-circle mt-0.5 flex-shrink-0" />
              <span>
                سيتم تحويل دوام اليوم لعن بعد لهذه المدرسة فقط
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <i className="bi bi-upload mt-0.5 flex-shrink-0" />
              <span>
                سيظهر للمعلمين واجهة رفع ملف حضور التيمز بدلاً من التحضير
                العادي
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              <i className="bi bi-bar-chart mt-0.5 flex-shrink-0" />
              <span>
                يمكنك متابعة رفع الملفات من صفحة متابعة الدوام عن بعد
              </span>
            </div>
          </div>

          {/* ملاحظة اختيارية */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ملاحظة (اختيارية)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: بسبب الأحوال الجوية"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-colors focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        {/* أزرار */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            disabled={activateMutation.isPending}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={activateMutation.isPending}
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 disabled:opacity-60"
          >
            {activateMutation.isPending ? (
              <>
                <i className="bi bi-hourglass-split ml-1 animate-spin" />
                جاري التحويل...
              </>
            ) : (
              <>
                <i className="bi bi-laptop ml-1" />
                تأكيد التحويل
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

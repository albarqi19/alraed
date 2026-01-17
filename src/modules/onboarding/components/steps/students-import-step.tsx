import { useId, useState } from 'react'
import {
  useDownloadStudentsTemplateMutation,
  useImportStudentsMutation,
  usePreviewImportStudentsMutation,
} from '@/modules/admin/hooks'
import type { ImportStudentsPreview, ImportSummary } from '@/modules/admin/types'
import { useToast } from '@/shared/feedback/use-toast'
import type { StepComponentProps } from '../../types'

export function StudentsImportStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const showToast = useToast()
  const inputId = useId()

  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [studentPreview, setStudentPreview] = useState<ImportStudentsPreview | null>(null)
  const [studentError, setStudentError] = useState<string | null>(null)
  const [studentImportSummary, setStudentImportSummary] = useState<ImportSummary | null>(null)

  const previewStudentsMutation = usePreviewImportStudentsMutation()
  const importStudentsMutation = useImportStudentsMutation()
  const downloadStudentsTemplateMutation = useDownloadStudentsTemplateMutation()

  const handleStudentFileSelected = (file: File) => {
    setStudentFile(file)
    setStudentError(null)
    setStudentImportSummary(null)
    const formData = new FormData()
    formData.append('file', file)
    previewStudentsMutation.mutate(formData, {
      onSuccess: (data) => {
        setStudentPreview(data)
      },
      onError: () => {
        setStudentPreview(null)
        setStudentError('تعذر قراءة الملف. تأكد من البنية وامتداد الملف.')
      },
    })
  }

  const handleStudentImport = () => {
    if (!studentFile) return
    if (!studentPreview) {
      setStudentError('يرجى إجراء المعاينة أولاً قبل الاستيراد.')
      return
    }

    setStudentError(null)
    const formData = new FormData()
    formData.append('file', studentFile)

    importStudentsMutation.mutate(
      {
        formData,
        options: {
          update_existing: true,
          delete_missing: false,
        },
      },
      {
        onSuccess: (summary) => {
          setStudentImportSummary(summary)
          showToast({
            type: 'success',
            title: 'تم استيراد الطلاب بنجاح',
            description: `تم إضافة ${summary.new_count ?? 0} طالب جديد`,
          })
        },
        onError: () => {
          setStudentError('حدث خطأ أثناء تنفيذ الاستيراد. حاول مجددًا أو راجع ملف البيانات.')
        },
      },
    )
  }

  const isLoading = previewStudentsMutation.isPending || importStudentsMutation.isPending
  const canProceed = stats.students_count > 0 || (studentImportSummary && (studentImportSummary.new_count ?? 0) > 0)

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="mb-2 font-semibold text-blue-800">
          <i className="bi bi-info-circle ml-2" />
          كيفية الحصول على ملف الطلاب
        </h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
          <li>ادخل على نظام نور</li>
          <li>اذهب إلى "التقارير" ثم "تقارير الطلاب"</li>
          <li>اختر "كشف بأسماء الطلاب"</li>
          <li>صدّر الملف بصيغة Excel</li>
          <li>ارفع الملف هنا</li>
        </ol>
      </div>

      {/* Current Status */}
      {stats.students_count > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <i className="bi bi-check-lg text-xl" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">تم إضافة الطلاب</p>
              <p className="text-sm text-emerald-600">
                يوجد حالياً {stats.students_count.toLocaleString('ar-SA')} طالب في النظام
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Download Template */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <p className="font-semibold text-slate-800">قالب الاستيراد</p>
          <p className="text-sm text-slate-500">حمّل القالب إذا أردت الإدخال اليدوي</p>
        </div>
        <button
          type="button"
          onClick={() => downloadStudentsTemplateMutation.mutate()}
          className="button-secondary text-sm"
          disabled={downloadStudentsTemplateMutation.isPending}
        >
          <i className="bi bi-download" />
          تنزيل القالب
        </button>
      </div>

      {/* Upload Area */}
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6">
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-6 py-10 text-center transition hover:border-teal-300 hover:bg-teal-50/60 ${
            isLoading ? 'pointer-events-none opacity-70' : ''
          }`}
        >
          <input
            id={inputId}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              handleStudentFileSelected(file)
              event.target.value = ''
            }}
            className="hidden"
            disabled={isLoading}
          />
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <i className="bi bi-cloud-arrow-up text-2xl" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              {isLoading ? 'جارٍ معالجة الملف...' : 'اضغط هنا أو اسحب الملف لإسقاطه'}
            </p>
            <p className="text-xs text-slate-500">يدعم ملفات Excel و CSV</p>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {studentError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-700">
          <i className="bi bi-exclamation-triangle ml-2" />
          {studentError}
        </div>
      )}

      {/* Preview Summary */}
      {studentPreview && !studentImportSummary && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{studentPreview.new_students_count}</p>
              <p className="text-xs text-emerald-700">طلاب جدد</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{studentPreview.students_with_changes}</p>
              <p className="text-xs text-amber-700">بحاجة لتحديث</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-center">
              <p className="text-2xl font-bold text-slate-600">{studentPreview.total_students}</p>
              <p className="text-xs text-slate-700">إجمالي السجلات</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStudentImport}
            className="button-primary w-full"
            disabled={importStudentsMutation.isPending}
          >
            {importStudentsMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ الاستيراد...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle" />
                تنفيذ الاستيراد
              </>
            )}
          </button>
        </div>
      )}

      {/* Import Summary */}
      {studentImportSummary && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <h4 className="mb-3 font-semibold text-emerald-800">
            <i className="bi bi-check-circle-fill ml-2" />
            تم الاستيراد بنجاح
          </h4>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-emerald-700">
              طلاب جدد: <strong>{studentImportSummary.new_count ?? 0}</strong>
            </p>
            <p className="text-emerald-700">
              تم تحديثهم: <strong>{studentImportSummary.updated_count ?? 0}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يجب إضافة طالب واحد على الأقل للمتابعة
        </p>
      )}
    </div>
  )
}

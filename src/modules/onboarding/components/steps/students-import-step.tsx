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

  // الباك يشترط وجود طالب واحد في المدرسة فحسب. الاكتفاء بـ new_count كان يحجز
  // المدير في الخطوة إذا كان الاستيراد تحديثاً لطلاب موجودين (new_count = 0).
  const importedAnyStudent =
    studentImportSummary !== null &&
    ((studentImportSummary.new_count ?? 0) > 0 || (studentImportSummary.updated_count ?? 0) > 0)

  const canProceed = stats.students_count > 0 || importedAnyStudent

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="ws-alert ws-alert--info ws-alert--boxed items-start">
        <div className="min-w-0 flex-1">
          <h4 className="mb-1.5 text-[13px] font-bold">
            <i className="bi bi-info-circle ml-2" />
            كيفية الحصول على ملف الطلاب
          </h4>
          <ol className="list-inside list-decimal space-y-0.5 text-[12px] font-normal">
            <li>ادخل على نظام نور</li>
            <li>اذهب إلى "التقارير" ثم "تقارير الطلاب"</li>
            <li>اختر "كشف بأسماء الطلاب"</li>
            <li>صدّر الملف بصيغة Excel</li>
            <li>ارفع الملف هنا</li>
          </ol>
        </div>
      </div>

      {/* Current Status */}
      {stats.students_count > 0 && (
        <div className="ws-alert ws-alert--success ws-alert--boxed items-start">
          <i className="bi bi-check-circle-fill mt-0.5 text-[14px]" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold">تم إضافة الطلاب</p>
            <p className="text-[12px] font-normal">
              يوجد حالياً {stats.students_count.toLocaleString('ar-SA-u-nu-latn')} طالب في النظام
            </p>
          </div>
        </div>
      )}

      {/* Download Template */}
      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[var(--color-text-primary)]">قالب الاستيراد</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">حمّل القالب إذا أردت الإدخال اليدوي</p>
        </div>
        <button
          type="button"
          onClick={() => downloadStudentsTemplateMutation.mutate()}
          className="ws-btn ws-btn--sm shrink-0"
          disabled={downloadStudentsTemplateMutation.isPending}
        >
          <i className="bi bi-download" />
          تنزيل القالب
        </button>
      </div>

      {/* Upload Area */}
      <div>
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[10px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-sunken)] px-5 py-5 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)] ${
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
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-primary-dark)]">
            <i className="bi bi-cloud-arrow-up text-xl" />
          </span>
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold text-[var(--color-text-primary)]">
              {isLoading ? 'جارٍ معالجة الملف...' : 'اضغط هنا أو اسحب الملف لإسقاطه'}
            </p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">يدعم ملفات Excel و CSV</p>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {studentError && (
        <div className="ws-alert ws-alert--boxed">
          <i className="bi bi-exclamation-triangle" />
          {studentError}
        </div>
      )}

      {/* Preview Summary */}
      {studentPreview && !studentImportSummary && (
        <div className="space-y-3">
          <div className="ws-statgrid">
            <div className="ws-stat">
              <span className="ws-stat__label">طلاب جدد</span>
              <span className="ws-stat__value">{studentPreview.new_students_count}</span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">بحاجة لتحديث</span>
              <span className="ws-stat__value">{studentPreview.students_with_changes}</span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">إجمالي السجلات</span>
              <span className="ws-stat__value">{studentPreview.total_students}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStudentImport}
            className="ws-btn ws-btn--primary w-full"
            disabled={importStudentsMutation.isPending}
          >
            {importStudentsMutation.isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
        <div className="ws-alert ws-alert--success ws-alert--boxed items-start">
          <i className="bi bi-check-circle-fill mt-0.5 text-[14px]" />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[13px] font-bold">تم الاستيراد بنجاح</p>
            <div className="grid gap-1 text-[12px] font-normal sm:grid-cols-2">
              <p>
                طلاب جدد: <strong>{studentImportSummary.new_count ?? 0}</strong>
              </p>
              <p>
                تم تحديثهم: <strong>{studentImportSummary.updated_count ?? 0}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-hairline)] pt-4">
        {/* تخطي — الخطوات الإلزامية تمر بتأكيد من المعالج */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-[12px] text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي وإكمالها لاحقاً'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          يجب إضافة طالب واحد على الأقل للمتابعة
        </div>
      )}
    </div>
  )
}

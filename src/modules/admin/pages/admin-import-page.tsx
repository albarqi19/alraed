import { useId, useMemo, useState } from 'react'
import {
  useDownloadStudentsTemplateMutation,
  useDownloadTeachersTemplateMutation,
  useImportStudentsMutation,
  useImportTeachersMutation,
  usePreviewImportStudentsMutation,
} from '../hooks'
import type { ImportStudentsPreview, ImportSummary, ImportTeachersSummary } from '../types'
import { useToast } from '@/shared/feedback/use-toast'

interface PlatformImportButtonProps {
  platform: 'noor' | 'madrasati'
  label: string
  logo: string
  onClick: () => void
}

function PlatformImportButton({ label, logo, onClick }: Omit<PlatformImportButtonProps, 'platform'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-teal-400 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2 ring-2 ring-slate-100 transition-all group-hover:ring-teal-400">
        <img src={logo} alt={label} className="h-full w-full object-contain" />
      </div>
      <p className="text-base font-bold text-slate-900">{label}</p>
    </button>
  )
}

interface UploadCardProps {
  title: string
  description: string
  onFileSelected: (file: File) => void
  isLoading: boolean
  accept?: string
  helper?: string
}

function UploadCard({ title, description, onFileSelected, isLoading, accept, helper }: UploadCardProps) {
  const inputId = useId()

  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-6 text-right shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <div className="mt-6">
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-6 py-10 text-center transition hover:border-teal-300 hover:bg-teal-50/60 ${
            isLoading ? 'pointer-events-none opacity-70' : ''
          }`}
        >
          <input
            id={inputId}
            type="file"
            accept={accept ?? '.xlsx,.xls,.csv'}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              onFileSelected(file)
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
              {isLoading ? 'جارٍ رفع الملف...' : 'اضغط هنا أو اسحب الملف لإسقاطه'}
            </p>
            <p className="text-xs text-muted">{helper ?? 'يدعم ملفات Excel و CSV'}</p>
          </div>
        </label>
      </div>
    </div>
  )
}

function StatBadge({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'success' | 'warn' | 'danger' }) {
  const toneStyles: Record<typeof tone, string> = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  }

  return (
    <div className={`rounded-2xl px-4 py-3 text-right shadow-sm ${toneStyles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</p>
    </div>
  )
}

function StudentPreviewSummary({ preview }: { preview: ImportStudentsPreview }) {
  const stats = useMemo(
    () => [
      { label: 'إجمالي السجلات', value: preview.total_students },
      { label: 'طلاب جدد', value: preview.new_students_count, tone: 'success' as const },
      { label: 'طلاب بحاجة لتحديث', value: preview.students_with_changes, tone: 'warn' as const },
      { label: 'مرشحون للحذف', value: preview.to_be_deleted_count, tone: 'danger' as const },
      { label: 'أخطاء في الملف', value: preview.errors_count, tone: preview.errors_count > 0 ? ('danger' as const) : ('default' as const) },
    ],
    [preview],
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((item) => (
        <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </div>
  )
}

function StudentPreviewDetails({ preview }: { preview: ImportStudentsPreview }) {
  const hasUpdates = preview.students_with_changes > 0
  const hasNew = preview.new_students_count > 0
  const hasDeletes = preview.to_be_deleted_count > 0
  const hasErrors = preview.errors_count > 0

  const newStudents = preview.new_students.slice(0, 5)
  const updatedStudents = preview.existing_students.slice(0, 5)
  const deletedStudents = preview.to_be_deleted.slice(0, 5)

  return (
    <div className="space-y-6">
      {hasErrors ? (
        <article className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5 text-right">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">أخطاء حرجة</p>
              <h3 className="text-lg font-semibold text-rose-700">راجع البيانات التالية قبل المتابعة</h3>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
              {preview.errors.length}
            </span>
          </header>
          <ul className="mt-4 space-y-2 text-xs font-semibold text-rose-700">
            {preview.errors.map((error, index) => (
              <li key={`${error}-${index}`} className="rounded-2xl bg-white/80 px-4 py-2">
                {error}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {hasNew ? (
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">طلاب جدد</p>
              <h3 className="text-lg font-semibold text-slate-900">سيتم إضافة {preview.new_students_count.toLocaleString('ar-SA')} طالبًا</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {preview.new_students_count.toLocaleString('ar-SA')}
            </span>
          </header>
          <div className="overflow-x-auto rounded-3xl border border-slate-200">
            <table className="min-w-[640px] table-fixed text-right text-sm">
              <thead className="bg-emerald-50/80 text-xs uppercase text-emerald-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">الاسم</th>
                  <th className="px-4 py-3 font-semibold">الصف</th>
                  <th className="px-4 py-3 font-semibold">الفصل</th>
                  <th className="px-4 py-3 font-semibold">هوية ولي الأمر</th>
                  <th className="px-4 py-3 font-semibold">هاتف ولي الأمر</th>
                </tr>
              </thead>
              <tbody>
                {newStudents.map((student) => (
                  <tr key={`${student.national_id}-${student.name}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.grade}</td>
                    <td className="px-4 py-3 text-slate-600">{student.class_name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.parent_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{student.parent_phone ?? '—'}</td>
                  </tr>
                ))}
                {preview.new_students_count > newStudents.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-xs text-muted">
                      تم إخفاء {preview.new_students_count - newStudents.length} طالب من القائمة
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {hasUpdates ? (
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">تعديلات مقترحة</p>
              <h3 className="text-lg font-semibold text-slate-900">
                سيتم تحديث {preview.students_with_changes.toLocaleString('ar-SA')} سجلًا قائمًا
              </h3>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {preview.students_with_changes.toLocaleString('ar-SA')}
            </span>
          </header>

          <div className="space-y-3">
            {updatedStudents.map((item) => (
              <article key={item.id} className="rounded-3xl border border-amber-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-right">
                    <h4 className="text-sm font-semibold text-slate-800">{item.current_data.name}</h4>
                    <p className="text-xs text-muted">
                      {item.current_data.grade} / {item.current_data.class_name}
                    </p>
                  </div>
                  {item.attendance_count ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      سجلات حضور: {item.attendance_count.toLocaleString('ar-SA')}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Object.entries(item.changes).map(([field, change]) => (
                    <div key={field} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs">
                      <p className="font-semibold text-slate-600">{field}</p>
                      <div className="mt-1 space-y-1 text-[11px] text-slate-500">
                        <p>القيمة الحالية: {change.old ?? '—'}</p>
                        <p>القيمة الجديدة: {change.new ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {preview.students_with_changes > updatedStudents.length ? (
              <p className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-2 text-center text-xs text-amber-700">
                يوجد {preview.students_with_changes - updatedStudents.length} سجل إضافي لن يتم عرضه هنا.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasDeletes ? (
        <section className="space-y-3">
          <header className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">حذف محتمل</p>
              <h3 className="text-lg font-semibold text-slate-900">
                سيتم حذف {preview.to_be_deleted_count.toLocaleString('ar-SA')} سجلًا غير موجود في الملف
              </h3>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              {preview.to_be_deleted_count.toLocaleString('ar-SA')}
            </span>
          </header>
          <div className="overflow-x-auto rounded-3xl border border-rose-200">
            <table className="min-w-[540px] table-fixed text-right text-sm">
              <thead className="bg-rose-50/70 text-xs uppercase text-rose-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">الاسم</th>
                  <th className="px-4 py-3 font-semibold">الصف</th>
                  <th className="px-4 py-3 font-semibold">الفصل</th>
                  <th className="px-4 py-3 font-semibold">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {deletedStudents.map((student) => (
                  <tr key={`${student.id}-${student.name}`} className="border-t border-rose-100">
                    <td className="px-4 py-3 text-slate-700">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.grade}</td>
                    <td className="px-4 py-3 text-slate-600">{student.class_name}</td>
                    <td className="px-4 py-3 text-slate-500">{student.updated_at ? new Date(student.updated_at).toLocaleDateString('ar-SA') : '—'}</td>
                  </tr>
                ))}
                {preview.to_be_deleted_count > deletedStudents.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-xs text-muted">
                      يوجد {preview.to_be_deleted_count - deletedStudents.length} سجلات إضافية مرشحة للحذف.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ImportSummaryCard({ summary, title }: { summary: ImportSummary; title: string }) {
  const items = [
    summary.new_count !== undefined ? { label: 'سجلات جديدة', value: summary.new_count, tone: 'success' as const } : null,
    summary.updated_count !== undefined ? { label: 'تم تحديثها', value: summary.updated_count, tone: 'warn' as const } : null,
    summary.deleted_count !== undefined ? { label: 'تم حذفها', value: summary.deleted_count, tone: 'danger' as const } : null,
    summary.errors_count !== undefined ? { label: 'أخطاء', value: summary.errors_count, tone: 'danger' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; tone: 'default' | 'success' | 'warn' | 'danger' }>

  return (
    <article className="space-y-4 rounded-3xl border border-teal-200 bg-teal-50/70 p-5 text-right">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">ملخص العملية</p>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {summary.message ? <p className="mt-1 text-sm text-muted">{summary.message}</p> : null}
      </header>
      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>
      ) : null}
      {summary.errors && summary.errors.length > 0 ? (
        <ul className="space-y-2 text-xs font-semibold text-rose-700">
          {summary.errors.map((error, index) => (
            <li key={`${error}-${index}`} className="rounded-2xl bg-white/80 px-4 py-2">
              {error}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

export function AdminImportPage() {
  const showToast = useToast()
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [studentPreview, setStudentPreview] = useState<ImportStudentsPreview | null>(null)
  const [studentOptions, setStudentOptions] = useState<{ update_existing: boolean; delete_missing: boolean }>(
    () => ({ update_existing: true, delete_missing: false }),
  )
  const [studentError, setStudentError] = useState<string | null>(null)
  const [studentImportSummary, setStudentImportSummary] = useState<ImportSummary | null>(null)

  const [teacherFile, setTeacherFile] = useState<File | null>(null)
  const [teacherSummary, setTeacherSummary] = useState<ImportTeachersSummary | null>(null)
  const [teacherError, setTeacherError] = useState<string | null>(null)

  const previewStudentsMutation = usePreviewImportStudentsMutation()
  const importStudentsMutation = useImportStudentsMutation()
  const importTeachersMutation = useImportTeachersMutation()
  const downloadStudentsTemplateMutation = useDownloadStudentsTemplateMutation()
  const downloadTeachersTemplateMutation = useDownloadTeachersTemplateMutation()

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
          update_existing: studentOptions.update_existing,
          delete_missing: studentOptions.delete_missing,
        },
      },
      {
        onSuccess: (summary) => {
          setStudentImportSummary(summary)
        },
        onError: () => {
          setStudentError('حدث خطأ أثناء تنفيذ الاستيراد. حاول مجددًا أو راجع ملف البيانات.')
        },
      },
    )
  }

  const handleTeacherFileSelected = (file: File) => {
    setTeacherFile(file)
    setTeacherSummary(null)
    setTeacherError(null)
  }

  const handleTeacherImport = () => {
    if (!teacherFile) {
      setTeacherError('اختر ملف المعلمين أولاً.')
      return
    }
    setTeacherError(null)
    const formData = new FormData()
    formData.append('file', teacherFile)

    importTeachersMutation.mutate(formData, {
      onSuccess: (summary) => {
        setTeacherSummary(summary)
      },
      onError: () => {
        setTeacherError('تعذر استيراد البيانات. تأكد من القالب أو أعد المحاولة لاحقًا.')
      },
    })
  }

  const isStudentBusy = previewStudentsMutation.isPending || importStudentsMutation.isPending
  const isTeacherBusy = importTeachersMutation.isPending

  const handlePlatformImport = (platform: 'noor' | 'madrasati') => {
    showToast({
      title: `الاستيراد من ${platform === 'noor' ? 'نظام نور' : 'منصة مدرستي'}`,
      description: 'سيتم تفعيل هذه الميزة قريباً',
      type: 'info',
    })
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">استيراد البيانات</h1>
        <p className="text-sm text-muted">
          قم برفع ملفات Excel أو CSV للطلاب والمعلمين مع معاينة ذكية قبل التنفيذ وخيارات مخصصة للتحديث والحذف.
        </p>
      </header>

      {/* Platform Import Buttons */}
      <div className="glass-card">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">استيراد سريع</p>
          <h2 className="text-xl font-bold text-slate-900">استيراد من المنصات التعليمية</h2>
          <p className="mt-1 text-sm text-muted">
            اختر المنصة التي تريد الاستيراد منها لتحميل البيانات مباشرة
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <PlatformImportButton
            label="استيراد من نظام نور"
            logo="https://noor.moe.gov.sa/Noor/images/home_login/noor_logo.png"
            onClick={() => handlePlatformImport('noor')}
          />
          <PlatformImportButton
            label="استيراد من منصة مدرستي"
            logo="https://object.moe.gov.sa/nasaq/edu/files/logo-2-638593241344546491.png"
            onClick={() => handlePlatformImport('madrasati')}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students Import Section */}
        <section className="glass-card space-y-6 flex flex-col h-full min-h-[600px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">الطلاب</p>
            <h2 className="text-2xl font-bold text-slate-900">استيراد ملفات الطلاب</h2>
            <p className="mt-1 text-sm text-muted">
              تجري المعاينة دون أي تغييرات، تأكد من النتائج ثم نفذ الاستيراد مع خياراتك المفضلة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadStudentsTemplateMutation.mutate()}
            className="button-secondary"
            disabled={downloadStudentsTemplateMutation.isPending}
          >
            <i className="bi bi-download" /> تنزيل قالب الطلاب
          </button>
        </header>

        <UploadCard
          title="رفع ملف الطلاب"
          description="استخدم الملف المُصدّر من نور أو من النظام الحالي لضمان توافق الحقول."
          onFileSelected={handleStudentFileSelected}
          isLoading={previewStudentsMutation.isPending}
          helper="يدعم XLSX / CSV حتى حجم 10MB"
        />

        {studentError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 px-5 py-4 text-sm font-semibold text-rose-700">
            {studentError}
          </div>
        ) : null}

        {studentPreview ? (
          <section className="space-y-6">
            <StudentPreviewSummary preview={studentPreview} />

            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
              <h3 className="text-base font-semibold text-slate-900">خيارات التنفيذ</h3>
              <p className="mt-1 text-xs text-muted">
                تفعيل الخيارات التالية يؤثر على كيفية تطبيق النتائج أثناء الاستيراد النهائي.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    checked={studentOptions.update_existing}
                    onChange={(event) =>
                      setStudentOptions((prev) => ({ ...prev, update_existing: event.target.checked }))
                    }
                    disabled={isStudentBusy}
                  />
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-semibold text-slate-800">تحديث السجلات الموجودة</p>
                    <p className="text-xs text-muted">
                      يحدّث بيانات الطلاب الحاليين طبقًا للملف، مع عرض الحقول المتغيرة قبل التنفيذ.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    checked={studentOptions.delete_missing}
                    onChange={(event) =>
                      setStudentOptions((prev) => ({ ...prev, delete_missing: event.target.checked }))
                    }
                    disabled={isStudentBusy}
                  />
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-semibold text-slate-800">حذف السجلات غير الموجودة في الملف</p>
                    <p className="text-xs text-muted">
                      يستخدم للمواءمة الكاملة مع الملف المرفوع. تأكد من أن الملف يحتوي على جميع الطلاب قبل التفعيل.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStudentPreview(null)
                    setStudentImportSummary(null)
                    setStudentFile(null)
                  }}
                  className="button-secondary"
                  disabled={isStudentBusy}
                >
                  إعادة المعاينة
                </button>
                <button
                  type="button"
                  onClick={handleStudentImport}
                  className="button-primary"
                  disabled={isStudentBusy || !studentPreview}
                >
                  {importStudentsMutation.isPending ? 'جارٍ تنفيذ الاستيراد...' : 'تنفيذ الاستيراد الآن'}
                </button>
              </div>
            </div>

            <StudentPreviewDetails preview={studentPreview} />
          </section>
        ) : null}

        {studentImportSummary ? (
          <ImportSummaryCard summary={studentImportSummary} title="نتائج استيراد الطلاب" />
        ) : null}
      </section>

      {/* Teachers Import Section */}
      <section className="glass-card space-y-6 flex flex-col h-full min-h-[600px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">المعلمون</p>
            <h2 className="text-2xl font-bold text-slate-900">استيراد ملفات المعلمين</h2>
            <p className="mt-1 text-sm text-muted">
              سيتم إنشاء الحسابات الجديدة وإرجاع كلمات المرور المؤقتة إن وُجدت.
            </p>
          </div>
          <button
            type="button"
            onClick={() => downloadTeachersTemplateMutation.mutate()}
            className="button-secondary"
            disabled={downloadTeachersTemplateMutation.isPending}
          >
            <i className="bi bi-download" /> تنزيل قالب المعلمين
          </button>
        </header>

        <UploadCard
          title="رفع ملف المعلمين"
          description="يدعم القالب المعتمد مع أعمدة الاسم، الهوية، البريد، رقم الجوال، والتخصص."
          onFileSelected={handleTeacherFileSelected}
          isLoading={isTeacherBusy}
        />

        {teacherError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 px-5 py-4 text-sm font-semibold text-rose-700">
            {teacherError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setTeacherFile(null)
              setTeacherSummary(null)
            }}
            className="button-secondary"
            disabled={isTeacherBusy}
          >
            إعادة تعيين
          </button>
          <button
            type="button"
            onClick={handleTeacherImport}
            className="button-primary"
            disabled={isTeacherBusy || !teacherFile}
          >
            {isTeacherBusy ? 'جارٍ استيراد المعلمين...' : 'تنفيذ الاستيراد'}
          </button>
        </div>

        {teacherSummary ? (
          <div className="space-y-6">
            <ImportSummaryCard summary={teacherSummary} title="نتائج استيراد المعلمين" />
            {teacherSummary.credentials && teacherSummary.credentials.length > 0 ? (
              <article className="rounded-3xl border border-slate-200 bg-white/70 p-5">
                <header className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">حسابات جديدة</p>
                    <h3 className="text-lg font-semibold text-slate-900">كلمات المرور المؤقتة</h3>
                    <p className="text-xs text-muted">
                      سلم هذه البيانات للمعلمين الجدد ليتمكنوا من الدخول وتغيير كلمة المرور لاحقًا.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {teacherSummary.credentials.length.toLocaleString('ar-SA')}
                  </span>
                </header>
                <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200">
                  <table className="min-w-[420px] table-fixed text-right text-sm">
                    <thead className="bg-slate-50/80 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">رقم الهوية / المستخدم</th>
                        <th className="px-4 py-3 font-semibold">كلمة المرور المؤقتة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherSummary.credentials.map((credential) => (
                        <tr key={`${credential.national_id}-${credential.password}`} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-700">{credential.national_id}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono">{credential.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted">
                  يتم استخدام رقم الهوية كاسم مستخدم افتراضي، ويمكن للمعلم تغيير كلمة المرور بعد تسجيل الدخول الأول.
                </p>
              </article>
            ) : null}
          </div>
        ) : null}
      </section>
      </div>
    </section>
  )
}

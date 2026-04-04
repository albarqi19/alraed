import { useEffect, useId, useMemo, useState } from 'react'
import {
  useDownloadStudentsTemplateMutation,
  useDownloadTeachersTemplateMutation,
  useImportStudentsMutation,
  useImportTeachersMutation,
  usePreviewImportStudentsMutation,
} from '../hooks'
import type { ImportStudentsPreview, ImportSummary, ImportTeachersSummary } from '../types'
import { useToast } from '@/shared/feedback/use-toast'
import { TimeTableImportDialog } from '../components/timetable-import-dialog'
import {
  UploadCloud,
  Download,
  RefreshCw,
  CheckSquare,
  AlertTriangle,
  Trash2,
  Users,
  GraduationCap,
  Calendar,
  Puzzle,
  ChevronLeft,
  FileUp,
} from 'lucide-react'

// ─── Platform Import Button ────────────────────────────────────────────────
function PlatformImportButton({
  label,
  logo,
  onClick,
}: {
  label: string
  logo: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-right transition hover:border-teal-300 hover:bg-teal-50/20 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white p-1 ring-1 ring-slate-200 transition group-hover:ring-teal-300">
        <img src={logo} alt={label} className="h-full w-full object-contain" />
      </div>
      <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700 flex-1">{label}</p>
      <ChevronLeft className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-x-0.5 group-hover:text-teal-500" />
    </button>
  )
}

// ─── Extension Detector ────────────────────────────────────────────────────
function ExtensionDetector() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null)
  const CHROME_STORE_URL =
    'https://chromewebstore.google.com/detail/الرَّائِد-مساعد-استيراد-ا/kglcgomelgkhgaefhjmakcfalfdficll'

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ALRAED_EXTENSION_DETECTED') setIsInstalled(true)
    }
    window.addEventListener('message', handleMessage)
    window.postMessage({ type: 'ALRAED_DETECT_EXTENSION' }, '*')
    const timeout = setTimeout(() => {
      if (isInstalled === null) setIsInstalled(false)
    }, 1000)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [isInstalled])

  if (isInstalled === null) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
        <p className="text-xs text-slate-400">جاري الكشف عن الإضافة...</p>
      </div>
    )
  }

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-white text-sm font-bold text-slate-900 ring-1 ring-emerald-200">
          R
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-700">إضافة الرَّائِد مُثبّتة ✓</p>
          <p className="text-[11px] text-emerald-600">يمكنك الآن الاستيراد التلقائي</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-white text-sm font-bold text-slate-900 ring-1 ring-amber-200">
        R
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800">إضافة الاستيراد التلقائي</p>
        <p className="text-[11px] text-amber-700">ثبّت الإضافة للاستيراد المباشر من نور ومدرستي</p>
      </div>
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-shrink-0 items-center gap-1 rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
      >
        <Download className="h-3 w-3" /> تحميل
      </a>
    </div>
  )
}

// ─── Upload Card ───────────────────────────────────────────────────────────
function UploadCard({
  onFileSelected,
  isLoading,
  accept,
  helper,
  fileName,
}: {
  onFileSelected: (file: File) => void
  isLoading: boolean
  accept?: string
  helper?: string
  fileName?: string | null
}) {
  const inputId = useId()

  return (
    <label
      htmlFor={inputId}
      className={`flex cursor-pointer items-center gap-4 rounded-md border px-4 py-3 transition ${fileName
        ? 'border-teal-300 bg-teal-50/40 hover:bg-teal-50'
        : 'border-dashed border-slate-300 bg-slate-50/60 hover:border-teal-300 hover:bg-teal-50/20'
        } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
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
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${fileName ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'
          }`}
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">
          {isLoading ? 'جارٍ معالجة الملف...' : fileName ? fileName : 'اضغط لاختيار ملف'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{helper ?? 'يدعم Excel و CSV'}</p>
      </div>
      {!fileName && !isLoading && (
        <span className="flex-shrink-0 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700">
          اختيار
        </span>
      )}
    </label>
  )
}

// ─── Stat Badge ────────────────────────────────────────────────────────────
function StatBadge({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'warn' | 'danger'
}) {
  const toneStyles: Record<typeof tone, string> = {
    default: 'bg-slate-50 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <div className={`rounded-md border px-3 py-2 ${toneStyles[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
      </p>
    </div>
  )
}

// ─── Student Preview Summary ───────────────────────────────────────────────
function StudentPreviewSummary({ preview }: { preview: ImportStudentsPreview }) {
  const stats = useMemo(
    () => [
      { label: 'إجمالي', value: preview.total_students },
      { label: 'جدد', value: preview.new_students_count, tone: 'success' as const },
      { label: 'تحديث', value: preview.students_with_changes, tone: 'warn' as const },
      { label: 'حذف', value: preview.to_be_deleted_count, tone: 'danger' as const },
      {
        label: 'أخطاء',
        value: preview.errors_count,
        tone: preview.errors_count > 0 ? ('danger' as const) : ('default' as const),
      },
    ],
    [preview],
  )

  return (
    <div className="grid grid-cols-5 gap-2">
      {stats.map((item) => (
        <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </div>
  )
}

// ─── Student Preview Details ───────────────────────────────────────────────
function StudentPreviewDetails({ preview }: { preview: ImportStudentsPreview }) {
  const hasUpdates = preview.students_with_changes > 0
  const hasNew = preview.new_students_count > 0
  const hasDeletes = preview.to_be_deleted_count > 0
  const hasErrors = preview.errors_count > 0

  const newStudents = preview.new_students.slice(0, 5)
  const updatedStudents = preview.existing_students.slice(0, 5)
  const deletedStudents = preview.to_be_deleted.slice(0, 5)

  return (
    <div className="space-y-3">
      {hasErrors && (
        <article className="rounded-md border border-rose-200 bg-rose-50/60 p-3">
          <header className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            <h3 className="text-xs font-bold text-rose-700">أخطاء حرجة — راجع البيانات</h3>
            <span className="mr-auto rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
              {preview.errors.length}
            </span>
          </header>
          <ul className="space-y-1 text-xs text-rose-700">
            {preview.errors.map((error, index) => (
              <li key={`${error}-${index}`} className="rounded bg-white/80 px-3 py-1.5 border border-rose-100">
                {error}
              </li>
            ))}
          </ul>
        </article>
      )}

      {hasNew && (
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-bold text-slate-700">
              طلاب جدد ({preview.new_students_count.toLocaleString('en-US')})
            </h3>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-[480px] table-fixed text-right text-xs">
              <thead className="bg-emerald-50 text-emerald-700 border-b border-emerald-100">
                <tr>
                  <th className="px-3 py-2 font-semibold">الاسم</th>
                  <th className="px-3 py-2 font-semibold">الهوية</th>
                  <th className="px-3 py-2 font-semibold">الصف</th>
                  <th className="px-3 py-2 font-semibold">الفصل</th>
                  <th className="px-3 py-2 font-semibold">هاتف ولي الأمر</th>
                </tr>
              </thead>
              <tbody>
                {newStudents.map((student) => (
                  <tr
                    key={`new-${student.national_id}-${student.name}`}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 text-slate-700 font-medium">{student.name}</td>
                    <td className="px-3 py-2 text-slate-400 font-mono">{student.national_id ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{student.grade}</td>
                    <td className="px-3 py-2 text-slate-500">{student.class_name}</td>
                    <td className="px-3 py-2 text-slate-400">{student.parent_phone ?? '—'}</td>
                  </tr>
                ))}
                {preview.new_students_count > newStudents.length && (
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-3 py-2 text-center text-[11px] text-slate-400">
                      + {(preview.new_students_count - newStudents.length).toLocaleString('en-US')} طالب إضافي
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {hasUpdates && (
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold text-slate-700">
              تعديلات مقترحة ({preview.students_with_changes.toLocaleString('en-US')})
            </h3>
          </div>
          <div className="space-y-2">
            {updatedStudents.map((item) => (
              <article key={item.id} className="rounded-md border border-amber-200 bg-amber-50/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.current_data.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.current_data.grade} / {item.current_data.class_name}
                    </p>
                  </div>
                  {item.attendance_count ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {item.attendance_count.toLocaleString('en-US')} سجل
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(item.changes).map(([field, change]) => (
                    <div
                      key={field}
                      className="rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px]"
                    >
                      <p className="font-semibold text-slate-500 mb-0.5">{field}</p>
                      <span className="text-rose-500 line-through">{change.old ?? '—'}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="text-emerald-600 font-semibold">{change.new ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {preview.students_with_changes > updatedStudents.length && (
              <p className="rounded border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 text-center text-xs text-amber-600">
                + {(preview.students_with_changes - updatedStudents.length).toLocaleString('en-US')} سجل إضافي
              </p>
            )}
          </div>
        </section>
      )}

      {hasDeletes && (
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <h3 className="text-xs font-bold text-slate-700">
              مرشحون للحذف ({preview.to_be_deleted_count.toLocaleString('en-US')})
            </h3>
          </div>
          <div className="overflow-x-auto rounded-md border border-rose-200">
            <table className="min-w-[400px] table-fixed text-right text-xs">
              <thead className="bg-rose-50 text-rose-700 border-b border-rose-100">
                <tr>
                  <th className="px-3 py-2 font-semibold">الاسم</th>
                  <th className="px-3 py-2 font-semibold">الصف</th>
                  <th className="px-3 py-2 font-semibold">الفصل</th>
                  <th className="px-3 py-2 font-semibold">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {deletedStudents.map((student) => (
                  <tr
                    key={`del-${student.id}-${student.name}`}
                    className="border-t border-rose-100 hover:bg-rose-50/40"
                  >
                    <td className="px-3 py-2 text-slate-700">{student.name}</td>
                    <td className="px-3 py-2 text-slate-500">{student.grade}</td>
                    <td className="px-3 py-2 text-slate-500">{student.class_name}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {student.updated_at
                        ? new Date(student.updated_at).toLocaleDateString('ar-SA')
                        : '—'}
                    </td>
                  </tr>
                ))}
                {preview.to_be_deleted_count > deletedStudents.length && (
                  <tr className="bg-rose-50/40">
                    <td colSpan={4} className="px-3 py-2 text-center text-[11px] text-rose-400">
                      + {(preview.to_be_deleted_count - deletedStudents.length).toLocaleString('en-US')} سجل إضافي
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Import Summary Card ───────────────────────────────────────────────────
function ImportSummaryCard({ summary, title }: { summary: ImportSummary; title: string }) {
  const items = [
    summary.new_count !== undefined
      ? { label: 'سجلات جديدة', value: summary.new_count, tone: 'success' as const }
      : null,
    summary.updated_count !== undefined
      ? { label: 'تم تحديثها', value: summary.updated_count, tone: 'warn' as const }
      : null,
    summary.deleted_count !== undefined
      ? { label: 'تم حذفها', value: summary.deleted_count, tone: 'danger' as const }
      : null,
    summary.skipped_count !== undefined
      ? { label: 'تم تجاهلها', value: summary.skipped_count, tone: 'default' as const }
      : null,
    summary.duplicates_in_file !== undefined && summary.duplicates_in_file > 0
      ? { label: 'مكررات', value: summary.duplicates_in_file, tone: 'warn' as const }
      : null,
    summary.errors_count !== undefined
      ? { label: 'أخطاء', value: summary.errors_count, tone: 'danger' as const }
      : null,
  ].filter(Boolean) as Array<{
    label: string
    value: number
    tone: 'default' | 'success' | 'warn' | 'danger'
  }>

  return (
    <article className="rounded-md border border-teal-200 bg-teal-50/40 p-4 space-y-3">
      <header className="flex items-center gap-2 border-b border-teal-100 pb-3">
        <CheckSquare className="h-4 w-4 text-teal-600" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600">ملخص العملية</p>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {summary.message && (
          <p className="mr-auto text-xs text-slate-400">{summary.message}</p>
        )}
      </header>

      {items.length > 0 && (
        <div className="grid gap-2 grid-cols-3">
          {items.map((item) => (
            <StatBadge key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>
      )}

      {summary.deleted_students && summary.deleted_students.length > 0 && (
        <section className="rounded-md border border-rose-200 bg-white p-3 space-y-2">
          <header className="flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            <h4 className="text-xs font-bold text-rose-800">
              طلاب تم حذفهم ({summary.deleted_students.length})
            </h4>
          </header>
          <div className="overflow-x-auto rounded border border-rose-100">
            <table className="w-full text-xs text-right">
              <thead className="bg-rose-50 text-rose-700">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">الاسم</th>
                  <th className="px-3 py-1.5 font-semibold">رقم الهوية</th>
                  <th className="px-3 py-1.5 font-semibold">الصف</th>
                  <th className="px-3 py-1.5 font-semibold">الفصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {summary.deleted_students.map((student) => (
                  <tr key={student.id} className="hover:bg-rose-50/50">
                    <td className="px-3 py-1.5 text-slate-700">{student.name}</td>
                    <td className="px-3 py-1.5 text-slate-400 font-mono">{student.national_id}</td>
                    <td className="px-3 py-1.5 text-slate-500">{student.grade}</td>
                    <td className="px-3 py-1.5 text-slate-500">{student.class_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-rose-500">لم يكونوا في الملف المرفوع وتم حذفهم من النظام</p>
        </section>
      )}

      {summary.warnings && summary.warnings.length > 0 && (
        <section className="rounded-md border border-amber-200 bg-amber-50/40 p-3 space-y-1.5">
          <header className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <h4 className="text-xs font-bold text-amber-800">تنبيهات ({summary.warnings.length})</h4>
          </header>
          <ul className="space-y-1 text-xs text-amber-700">
            {summary.warnings.map((warning, index) => (
              <li key={index} className="rounded bg-white/80 px-3 py-1.5 border border-amber-100">
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.errors && summary.errors.length > 0 && (
        <ul className="space-y-1 text-xs text-rose-700">
          {summary.errors.map((error, index) => (
            <li key={`${error}-${index}`} className="rounded bg-white/80 px-3 py-1.5 border border-rose-100">
              {error}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

// ─── Tab Types ─────────────────────────────────────────────────────────────
type TabId = 'people' | 'schedules' | 'platforms'

interface TabDef {
  id: TabId
  label: string
  subLabel: string
  icon: React.ReactNode
  dotColor: string
}

const TABS: TabDef[] = [
  {
    id: 'people',
    label: 'الطلاب والمعلمون',
    subLabel: 'استيراد البيانات',
    icon: (
      <span className="flex items-center -space-x-1 rtl:space-x-reverse">
        <GraduationCap className="h-3.5 w-3.5" />
        <Users className="h-3.5 w-3.5" />
      </span>
    ),
    dotColor: 'bg-teal-500',
  },
  {
    id: 'schedules',
    label: 'الجداول',
    subLabel: 'aSc TimeTable',
    icon: <Calendar className="h-3.5 w-3.5" />,
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'platforms',
    label: 'المنصات',
    subLabel: 'نور · مدرستي',
    icon: <Puzzle className="h-3.5 w-3.5" />,
    dotColor: 'bg-amber-500',
  },
]

// ─── Main Page ─────────────────────────────────────────────────────────────
export function AdminImportPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('people')

  // Students state
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [studentPreview, setStudentPreview] = useState<ImportStudentsPreview | null>(null)
  const [studentOptions, setStudentOptions] = useState(() => ({
    update_existing: true,
    delete_missing: false,
  }))
  const [studentError, setStudentError] = useState<string | null>(null)
  const [studentImportSummary, setStudentImportSummary] = useState<ImportSummary | null>(null)

  // Teachers state
  const [teacherFile, setTeacherFile] = useState<File | null>(null)
  const [teacherSummary, setTeacherSummary] = useState<ImportTeachersSummary | null>(null)
  const [teacherError, setTeacherError] = useState<string | null>(null)

  const [isTimeTableDialogOpen, setIsTimeTableDialogOpen] = useState(false)

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
      onSuccess: (data) => setStudentPreview(data),
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
        onSuccess: (summary) => setStudentImportSummary(summary),
        onError: () =>
          setStudentError('حدث خطأ أثناء تنفيذ الاستيراد. حاول مجددًا.'),
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
      onSuccess: (summary) => setTeacherSummary(summary),
      onError: () =>
        setTeacherError('تعذر استيراد البيانات. تأكد من القالب أو أعد المحاولة.'),
    })
  }

  const handlePlatformImport = (platform: 'noor' | 'madrasati') => {
    showToast({
      title: `الاستيراد من ${platform === 'noor' ? 'نظام نور' : 'منصة مدرستي'}`,
      description: 'سيتم تفعيل هذه الميزة قريباً',
      type: 'info',
    })
  }

  const isStudentBusy = previewStudentsMutation.isPending || importStudentsMutation.isPending
  const isTeacherBusy = importTeachersMutation.isPending

  return (
    <section className="space-y-4">
      {/* ── Page Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">استيراد البيانات</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            رفع ملفات Excel أو CSV مع معاينة ذكية قبل التنفيذ
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
          <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">يدعم XLSX · CSV · XML</span>
        </div>
      </header>

      {/* ── Improved Tab Navigation (Pill Style) ── */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/70 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {/* Active dot indicator */}
              {isActive && (
                <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${tab.dotColor}`} />
              )}
              <span className={isActive ? 'text-slate-600' : 'text-slate-400'}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' و')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB: الطلاب والمعلمون — Side by Side
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'people' && (
        <div className="grid gap-4 lg:grid-cols-2">

          {/* ── Students Column ── */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-50 border border-teal-200">
                  <GraduationCap className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-teal-600">الطلاب</p>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">استيراد ملفات الطلاب</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadStudentsTemplateMutation.mutate()}
                disabled={downloadStudentsTemplateMutation.isPending}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
              >
                <Download className="h-3 w-3" /> قالب
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 p-4 space-y-3">
              <p className="text-xs text-slate-400">
                المعاينة لا تحدث بيانات — راجع النتائج ثم نفّذ الاستيراد.
              </p>

              <UploadCard
                onFileSelected={handleStudentFileSelected}
                isLoading={previewStudentsMutation.isPending}
                helper="XLSX / CSV · حتى 10MB"
                fileName={studentFile?.name}
              />

              {studentError && (
                <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {studentError}
                </div>
              )}

              {studentPreview && (
                <section className="space-y-3">
                  <StudentPreviewSummary preview={studentPreview} />

                  {/* Options */}
                  <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      خيارات التنفيذ
                    </p>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:border-teal-200 transition text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          checked={studentOptions.update_existing}
                          onChange={(e) =>
                            setStudentOptions((prev) => ({ ...prev, update_existing: e.target.checked }))
                          }
                          disabled={isStudentBusy}
                        />
                        <div>
                          <p className="font-bold text-slate-700">تحديث السجلات الموجودة</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">تحديث بيانات الطلاب الحاليين وفق الملف</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50/30 px-3 py-2 cursor-pointer hover:border-rose-300 transition text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                          checked={studentOptions.delete_missing}
                          onChange={(e) =>
                            setStudentOptions((prev) => ({ ...prev, delete_missing: e.target.checked }))
                          }
                          disabled={isStudentBusy}
                        />
                        <div>
                          <p className="font-bold text-slate-700">حذف السجلات غير الموجودة</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">تأكد أن الملف يحتوي على جميع الطلاب</p>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setStudentPreview(null); setStudentImportSummary(null); setStudentFile(null) }}
                        disabled={isStudentBusy}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                      >
                        <RefreshCw className="h-3 w-3" /> إعادة
                      </button>
                      <button
                        type="button"
                        onClick={handleStudentImport}
                        disabled={isStudentBusy || !studentPreview}
                        className="inline-flex items-center gap-1 rounded bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 transition"
                      >
                        <UploadCloud className="h-3 w-3" />
                        {importStudentsMutation.isPending ? 'جارٍ التنفيذ...' : 'تنفيذ الاستيراد'}
                      </button>
                    </div>
                  </div>

                  <StudentPreviewDetails preview={studentPreview} />
                </section>
              )}

              {studentImportSummary && (
                <ImportSummaryCard summary={studentImportSummary} title="نتائج استيراد الطلاب" />
              )}
            </div>
          </div>

          {/* ── Teachers Column ── */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 border border-indigo-200">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">المعلمون</p>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">استيراد ملفات المعلمين</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadTeachersTemplateMutation.mutate()}
                disabled={downloadTeachersTemplateMutation.isPending}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                <Download className="h-3 w-3" /> قالب
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 p-4 space-y-3">
              <p className="text-xs text-slate-400">
                سيتم إنشاء الحسابات الجديدة وإرجاع كلمات المرور المؤقتة إن وُجدت.
              </p>

              <UploadCard
                onFileSelected={handleTeacherFileSelected}
                isLoading={isTeacherBusy}
                helper="الاسم · الهوية · البريد · الجوال · التخصص"
                fileName={teacherFile?.name}
              />

              {teacherError && (
                <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {teacherError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setTeacherFile(null); setTeacherSummary(null) }}
                  disabled={isTeacherBusy}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <RefreshCw className="h-3 w-3" /> إعادة تعيين
                </button>
                <button
                  type="button"
                  onClick={handleTeacherImport}
                  disabled={isTeacherBusy || !teacherFile}
                  className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <UploadCloud className="h-3 w-3" />
                  {isTeacherBusy ? 'جارٍ الاستيراد...' : 'تنفيذ الاستيراد'}
                </button>
              </div>

              {teacherSummary && (
                <div className="space-y-3">
                  <ImportSummaryCard summary={teacherSummary} title="نتائج استيراد المعلمين" />

                  {teacherSummary.credentials && teacherSummary.credentials.length > 0 && (
                    <article className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
                      <header className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            حسابات جديدة
                          </p>
                          <h3 className="text-sm font-bold text-slate-800">كلمات المرور المؤقتة</h3>
                        </div>
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-500">
                          {teacherSummary.credentials.length.toLocaleString('en-US')}
                        </span>
                      </header>
                      <div className="overflow-x-auto rounded-md border border-slate-200">
                        <table className="min-w-[300px] table-fixed text-right text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-slate-500">رقم الهوية</th>
                              <th className="px-3 py-2 font-semibold text-slate-500">كلمة المرور</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherSummary.credentials.map((credential) => (
                              <tr
                                key={`${credential.national_id}-${credential.password}`}
                                className="border-t border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-3 py-2 text-slate-700">{credential.national_id}</td>
                                <td className="px-3 py-2 text-slate-500 font-mono">{credential.password}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        رقم الهوية يُستخدم كاسم مستخدم، ويمكن تغيير كلمة المرور بعد أول دخول.
                      </p>
                    </article>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: الجداول
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'schedules' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 border border-emerald-200">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">جداول الحصص</p>
                <h2 className="text-sm font-bold text-slate-800">استيراد من aSc TimeTable</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsTimeTableDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <UploadCloud className="h-3.5 w-3.5" /> استيراد جدول
            </button>
          </header>

          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-500">
              استيراد جداول الحصص من برنامج aSc TimeTable بصيغة XML مع مطابقة ذكية للمعلمين والمواد.
            </p>

            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-emerald-100">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">aSc TimeTable XML</p>
                <p className="text-xs text-slate-400">ملفات XML بترميز windows-1256 (عربي)</p>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">مميزات الاستيراد</p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {[
                  'دعم ملفات XML بترميز windows-1256 (العربية)',
                  'مطابقة ذكية للمعلمين والمواد مع النظام',
                  'تحويل أسماء الفصول تلقائياً (أول 1 → الصف الأول / 1)',
                  'إمكانية استبدال الحصص القديمة أو الإضافة عليها',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: المنصات
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'platforms' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 border border-amber-200">
              <Puzzle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">استيراد سريع</p>
              <h2 className="text-sm font-bold text-slate-800">الاستيراد من المنصات التعليمية</h2>
            </div>
          </header>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-500">
              اختر المنصة للاستيراد المباشر — يتطلب تثبيت إضافة الرَّائِد على Chrome.
            </p>

            <ExtensionDetector />

            <div className="grid gap-2 sm:grid-cols-2">
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

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/40 p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">يتطلب إضافة المتصفح</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  للاستيراد التلقائي من المنصات يجب تثبيت إضافة الرَّائِد على متصفح Google Chrome
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TimeTable Dialog ── */}
      <TimeTableImportDialog
        isOpen={isTimeTableDialogOpen}
        onClose={() => setIsTimeTableDialogOpen(false)}
      />
    </section>
  )
}

import { useEffect, useId, useMemo, useState } from 'react'
import {
  useDownloadStudentsTemplateMutation,
  useDownloadTeachersTemplateMutation,
  useImportStudentsMutation,
  useImportTeachersMutation,
  usePreviewImportStudentsMutation,
} from '../hooks'
import type { ImportStudentsPreview, ImportSummary, ImportTeachersSummary } from '../types'
import { ImportCover } from './import-ui'
import { useToast } from '@/shared/feedback/use-toast'
import { TimeTableImportDialog } from '../components/timetable-import-dialog'
import { SmartScheduleImportDialog } from '../components/smart-schedule-import-dialog'
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
  Chrome,
  FileUp,
  Info,
  KeyRound,
  ListChecks,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  TONES,
  WsAlert,
  WsBlock,
  WsBtn,
  WsFact,
  WsHeader,
  WsLayout,
  WsMain,
  WsPage,
  WsSideCol,
  WsTable,
  WsToolbar,
  type Tone,
} from '@/shared/workspace'
import { chip } from './dashboard-ui'

/**
 * مُنسّقُ عرضٍ لا يُسقط الصفحة.
 *
 * كان `(n: number) => n.toLocaleString(...)`، والنوع يَعِد بعددٍ دائماً — لكن
 * العقد مع الخادم كان يكذب: بطاقة «في الملف» تقرأ `total_students` والمعاينة
 * لا تُرجعه (تُرجع `total_in_file`). فيصل `undefined` إلى دالةٍ نوعُها يقول إنه
 * مستحيل، فترتطم بـ«Cannot read properties of undefined» وتُفرغ الصفحة كلَّها
 * بعد «جاري المعالجة» — بلا رسالة ولا أثر يدلّ المستخدم على شيء.
 *
 * والحارس هنا ليس بديلاً عن إصلاح العقد (أُصلح)، بل لأن رقماً ناقصاً في بطاقة
 * إحصاء لا يجوز بحالٍ أن يُخفي نتيجة استيرادٍ اكتمل. الشرطة تقول «لا رقم»
 * وتُبقي الباقي مرئياً.
 */
const ar = (n: number | null | undefined) =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('ar-SA-u-nu-latn') : '—'

// ─── بطاقة الرفع ───────────────────────────────────────────────────────────
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
  const chosen = Boolean(fileName)

  return (
    <label
      htmlFor={inputId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 8,
        cursor: isLoading ? 'default' : 'pointer',
        border: chosen ? `1px solid ${TONES.sky.bd}` : '1px dashed var(--ws-border)',
        background: chosen ? chip(TONES.sky) : 'var(--ws-surface-2)',
        opacity: isLoading ? 0.65 : 1,
        pointerEvents: isLoading ? 'none' : undefined,
      }}
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
        style={{ display: 'none' }}
        disabled={isLoading}
      />
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--ws-surface)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <RefreshCw className="animate-spin" style={{ width: 16, height: 16, color: TONES.sky.tx }} />
        ) : (
          <FileUp style={{ width: 16, height: 16, color: chosen ? TONES.sky.tx : 'var(--ws-text-2)' }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 13.5,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isLoading ? 'جارٍ معالجة الملف...' : fileName ? fileName : 'اضغط لاختيار ملف'}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', marginTop: 2 }}>
          {helper ?? 'يدعم Excel و CSV'}
        </span>
      </span>
      {!chosen && !isLoading && (
        <WsBtn size="sm" style={{ pointerEvents: 'none' }}>
          اختيار
        </WsBtn>
      )}
    </label>
  )
}

// ─── إحصاءة مصغّرة بلغة الإغناء ─────────────────────────────────────────────
function MiniStat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${tone.bd}`,
        background: chip(tone),
      }}
    >
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>{label}</span>
      <span
        style={{
          display: 'block',
          marginTop: 2,
          fontSize: 20,
          fontWeight: 800,
          color: tone.tx,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ar(value)}
      </span>
    </div>
  )
}

// ─── ملخص معاينة الطلاب ────────────────────────────────────────────────────
function StudentPreviewSummary({ preview }: { preview: ImportStudentsPreview }) {
  const stats = useMemo(
    () => [
      // المعاينة تُرجع `total_in_file`؛ و`total_students` مفتاحُ استجابة
      // **التنفيذ** لا المعاينة. قراءته هنا كانت تعطي undefined دائماً.
      { label: 'في الملف', value: preview.total_in_file ?? preview.total_students, tone: TONES.sky },
      { label: 'جدد', value: preview.new_students_count, tone: TONES.green },
      { label: 'تحديث', value: preview.students_with_changes, tone: TONES.amber },
      { label: 'تعطيل', value: preview.to_be_deleted_count, tone: TONES.amber },
      { label: 'أخطاء', value: preview.errors_count, tone: preview.errors_count > 0 ? TONES.red : TONES.gray },
    ],
    [preview],
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
      {stats.map((item) => (
        <MiniStat key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </div>
  )
}

// ─── عنوان قسم داخل المعاينة ───────────────────────────────────────────────
function SectionTitle({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.tx, flexShrink: 0 }} />
      <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{children}</h3>
    </div>
  )
}

const tableWrap: React.CSSProperties = {
  border: '1px solid var(--ws-hairline)',
  borderRadius: 8,
  overflow: 'hidden',
}

// ─── تفاصيل معاينة الطلاب ──────────────────────────────────────────────────
function StudentPreviewDetails({ preview }: { preview: ImportStudentsPreview }) {
  const newStudents = preview.new_students.slice(0, 5)
  const updatedStudents = preview.existing_students.slice(0, 5)
  const deletedStudents = preview.to_be_deleted.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {preview.errors_count > 0 && (
        <div>
          <SectionTitle tone={TONES.red}>أخطاء حرجة — راجع البيانات ({ar(preview.errors.length)})</SectionTitle>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {preview.errors.map((error, index) => (
              <li
                key={`${error}-${index}`}
                style={{
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: `1px solid ${TONES.red.bd}`,
                  background: chip(TONES.red),
                  fontSize: 12.5,
                  color: TONES.red.tx,
                }}
              >
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.new_students_count > 0 && (
        <div>
          <SectionTitle tone={TONES.green}>طلاب جدد ({ar(preview.new_students_count)})</SectionTitle>
          <div style={tableWrap}>
            <WsTable>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهوية</th>
                  <th>الصف</th>
                  <th>الفصل</th>
                  <th>هاتف ولي الأمر</th>
                </tr>
              </thead>
              <tbody>
                {newStudents.map((student) => (
                  <tr key={`new-${student.national_id}-${student.name}`}>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--ws-text-2)' }}>{student.national_id ?? '—'}</td>
                    <td>{student.grade}</td>
                    <td>{student.class_name}</td>
                    <td style={{ color: 'var(--ws-text-2)' }}>{student.parent_phone ?? '—'}</td>
                  </tr>
                ))}
                {preview.new_students_count > newStudents.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ws-text-2)', fontSize: 12 }}>
                      + {ar(preview.new_students_count - newStudents.length)} طالب إضافي
                    </td>
                  </tr>
                )}
              </tbody>
            </WsTable>
          </div>
        </div>
      )}

      {preview.students_with_changes > 0 && (
        <div>
          <SectionTitle tone={TONES.amber}>تعديلات مقترحة ({ar(preview.students_with_changes)})</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {updatedStudents.map((item) => (
              <article
                key={item.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${TONES.amber.bd}`,
                  background: chip(TONES.amber),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{item.current_data.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>
                      {item.current_data.grade} / {item.current_data.class_name}
                    </p>
                  </div>
                  {item.attendance_count ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'var(--ws-surface)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--ws-text-2)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {ar(item.attendance_count)} سجل حضور
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
                  {Object.entries(item.changes).map(([field, change]) => (
                    <div
                      key={field}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--ws-hairline)',
                        background: 'var(--ws-surface)',
                        fontSize: 12,
                      }}
                    >
                      <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--ws-text-2)' }}>{field}</p>
                      <span style={{ color: TONES.red.tx, textDecoration: 'line-through' }}>{change.old ?? '—'}</span>
                      <span style={{ margin: '0 4px', color: 'var(--ws-text-2)' }}>←</span>
                      <span style={{ color: TONES.green.tx, fontWeight: 700 }}>{change.new ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {preview.students_with_changes > updatedStudents.length && (
              <p
                style={{
                  margin: 0,
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: `1px dashed ${TONES.amber.bd}`,
                  textAlign: 'center',
                  fontSize: 12,
                  color: TONES.amber.tx,
                }}
              >
                + {ar(preview.students_with_changes - updatedStudents.length)} سجل إضافي
              </p>
            )}
          </div>
        </div>
      )}

      {preview.to_be_deleted_count > 0 && (
        <div>
          <SectionTitle tone={TONES.amber}>مرشحون للتعطيل ({ar(preview.to_be_deleted_count)})</SectionTitle>
          <div style={tableWrap}>
            <WsTable>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الصف</th>
                  <th>الفصل</th>
                  <th>آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {deletedStudents.map((student) => (
                  <tr key={`del-${student.id}-${student.name}`}>
                    <td>{student.name}</td>
                    <td>{student.grade}</td>
                    <td>{student.class_name}</td>
                    <td style={{ color: 'var(--ws-text-2)' }}>
                      {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ar-SA-u-nu-latn') : '—'}
                    </td>
                  </tr>
                ))}
                {preview.to_be_deleted_count > deletedStudents.length && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: TONES.red.tx, fontSize: 12 }}>
                      + {ar(preview.to_be_deleted_count - deletedStudents.length)} سجل إضافي
                    </td>
                  </tr>
                )}
              </tbody>
            </WsTable>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── بطاقة نتائج التنفيذ ───────────────────────────────────────────────────
function ImportSummaryCard({ summary, title }: { summary: ImportSummary; title: string }) {
  const items = [
    summary.new_count !== undefined ? { label: 'سجلات جديدة', value: summary.new_count, tone: TONES.green } : null,
    summary.updated_count !== undefined ? { label: 'تم تحديثها', value: summary.updated_count, tone: TONES.amber } : null,
    summary.deleted_count !== undefined ? { label: 'تم تعطيلها', value: summary.deleted_count, tone: TONES.amber } : null,
    summary.skipped_count !== undefined ? { label: 'تم تجاهلها', value: summary.skipped_count, tone: TONES.gray } : null,
    summary.duplicates_in_file !== undefined && summary.duplicates_in_file > 0
      ? { label: 'مكررات في الملف', value: summary.duplicates_in_file, tone: TONES.amber }
      : null,
    summary.errors_count !== undefined ? { label: 'أخطاء', value: summary.errors_count, tone: summary.errors_count > 0 ? TONES.red : TONES.gray } : null,
  ].filter(Boolean) as Array<{ label: string; value: number; tone: Tone }>

  return (
    <article
      style={{
        padding: 12,
        borderRadius: 10,
        border: `1px solid ${TONES.green.bd}`,
        background: chip(TONES.green),
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--ws-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckSquare style={{ width: 16, height: 16, color: TONES.green.tx }} />
        </span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>{title}</h3>
        {summary.message && <span style={{ fontSize: 12, color: 'var(--ws-text-2)' }}>{summary.message}</span>}
      </header>

      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--ws-hairline)',
                background: 'var(--ws-surface)',
              }}
            >
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ws-text)' }}>{item.label}</span>
              <span
                style={{
                  display: 'block',
                  marginTop: 2,
                  fontSize: 18,
                  fontWeight: 800,
                  color: item.tone.tx,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {ar(item.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {summary.deleted_students && summary.deleted_students.length > 0 && (
        <section
          style={{
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${TONES.red.bd}`,
            background: 'var(--ws-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <header style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 style={{ width: 14, height: 14, color: TONES.red.tx }} />
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
              طلاب غادروا — عُطِّلوا وسجلّهم محفوظ ({ar(summary.deleted_students.length)})
            </h4>
          </header>
          <div style={tableWrap}>
            <WsTable>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>رقم الهوية</th>
                  <th>الصف</th>
                  <th>الفصل</th>
                </tr>
              </thead>
              <tbody>
                {summary.deleted_students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--ws-text-2)' }}>{student.national_id}</td>
                    <td>{student.grade}</td>
                    <td>{student.class_name}</td>
                  </tr>
                ))}
              </tbody>
            </WsTable>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: TONES.red.tx }}>
            لم يكونوا في الملف المرفوع وتم حذفهم من النظام.
          </p>
        </section>
      )}

      {summary.warnings && summary.warnings.length > 0 && (
        <WsAlert tone="warn" boxed icon={AlertTriangle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {summary.warnings.map((warning, index) => (
              <span key={index}>{warning}</span>
            ))}
          </div>
        </WsAlert>
      )}

      {summary.errors && summary.errors.length > 0 && (
        <WsAlert tone="error" boxed>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {summary.errors.map((error, index) => (
              <span key={`${error}-${index}`}>{error}</span>
            ))}
          </div>
        </WsAlert>
      )}
    </article>
  )
}

// ─── خيار تنفيذ ────────────────────────────────────────────────────────────
function OptionCheck({
  label,
  desc,
  danger,
  checked,
  onChange,
  disabled,
}: {
  label: string
  desc: string
  danger?: boolean
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${danger ? TONES.red.bd : 'var(--ws-hairline)'}`,
        background: danger ? chip(TONES.red) : 'var(--ws-surface)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: 14, height: 14, marginTop: 3, accentColor: danger ? TONES.red.tx : 'var(--ws-accent-2)' }}
      />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', marginTop: 1 }}>{desc}</span>
      </span>
    </label>
  )
}

// ─── زر منصة ───────────────────────────────────────────────────────────────
function PlatformImportButton({ label, logo, onClick }: { label: string; logo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ws-callrow"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid var(--ws-hairline)',
        background: 'var(--ws-surface)',
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'start',
        color: 'var(--ws-text)',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#FFFFFF',
          border: '1px solid var(--ws-hairline)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: 4,
          flexShrink: 0,
        }}
      >
        <img src={logo} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{label}</span>
      <ChevronLeft style={{ width: 15, height: 15, color: 'var(--ws-text-2)', flexShrink: 0 }} />
    </button>
  )
}

// ─── إضافة الرَّائِد: كشف + بطاقة إبراز ────────────────────────────────────
const RAED_CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/الرَّائِد-مساعد-استيراد-ا/kglcgomelgkhgaefhjmakcfalfdficll'

/** كشف إضافة الرَّائِد — null: جارٍ الكشف · true: مثبتة · false: غير مثبتة */
function useRaedExtension(): boolean | null {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ALRAED_EXTENSION_DETECTED') setIsInstalled(true)
    }
    window.addEventListener('message', handleMessage)
    window.postMessage({ type: 'ALRAED_DETECT_EXTENSION' }, '*')
    const timeout = setTimeout(() => {
      setIsInstalled((prev) => (prev === null ? false : prev))
    }, 1000)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [])

  return isInstalled
}

/** الشارة المدمجة — تُعرض في العمود الجانبي فتبقى الإضافة حاضرة في كل التبويبات.
    عمودية التركيب لتتنفس في الأعمدة الضيقة: عنوان ثم وصف ثم زر بعرض كامل */
function ExtensionDetector() {
  const isInstalled = useRaedExtension()
  const tone = isInstalled === null ? TONES.gray : isInstalled ? TONES.green : TONES.amber

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${tone.bd}`,
        background: chip(tone),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--ws-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Chrome style={{ width: 16, height: 16, color: tone.tx }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          {isInstalled === null ? (
            <span style={{ fontSize: 12.5, color: 'var(--ws-text-2)' }}>جاري الكشف عن الإضافة...</span>
          ) : isInstalled ? (
            <>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: tone.tx }}>
                إضافة الرَّائِد مُثبّتة ✓
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)' }}>
                يمكنك الآن الاستيراد التلقائي
              </span>
            </>
          ) : (
            <>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>إضافة الرَّائِد لكروم</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', lineHeight: 1.6 }}>
                استيراد مباشر من نور ومدرستي بلا ملفات
              </span>
            </>
          )}
        </span>
      </div>
      {isInstalled === false && (
        <a
          href={RAED_CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ws-btn ws-btn--primary"
          style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}
        >
          <Download style={{ width: 13, height: 13 }} />
          تحميل الإضافة
        </a>
      )}
    </div>
  )
}

/** ★ بطاقة البطل — إبراز إضافة كروم كمسار الاستيراد الأسرع: بلا ملفات ولا قوالب */
function ExtensionHeroCard() {
  const isInstalled = useRaedExtension()
  const tone = isInstalled === null ? TONES.gray : isInstalled ? TONES.green : TONES.sky

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${tone.bd}`,
        background: chip(tone),
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: 'var(--ws-surface)',
            border: `1px solid ${tone.bd}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Chrome style={{ width: 24, height: 24, color: tone.tx }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 800 }}>
            إضافة الرَّائِد لمتصفح كروم
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ws-text-2)', marginTop: 2, lineHeight: 1.6 }}>
            تستورد الطلاب والمعلمين مباشرة من نظام نور ومنصة مدرستي بضغطة واحدة — بلا ملفات ولا قوالب.
          </span>
        </span>
        {isInstalled !== null && (
          <span
            className="ws-chip"
            style={{
              background: 'var(--ws-surface)',
              borderColor: tone.bd,
              color: tone.tx,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {isInstalled ? 'مُثبّتة ✓' : 'غير مُثبّتة'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6  }}>
        {[
          { icon: Zap, text: 'استيراد بضغطة واحدة' },
          { icon: FileUp, text: 'بلا ملفات إكسل' },
          { icon: CheckSquare, text: 'قراءة مباشرة من المنصة' },
        ].map((f) => (
          <span
            key={f.text}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'var(--ws-surface)',
              border: `1px solid ${tone.bd}`,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ws-text)',
            }}
          >
            <f.icon style={{ width: 12, height: 12, color: tone.tx }} />
            {f.text}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {isInstalled === false && (
          <a
            href={RAED_CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-btn ws-btn--primary"
            style={{ textDecoration: 'none' }}
          >
            <Download style={{ width: 14, height: 14 }} />
            تحميل الإضافة من Chrome Web Store
          </a>
        )}
        <span style={{ fontSize: 12, color: 'var(--ws-text-2)', lineHeight: 1.6 }}>
          {isInstalled
            ? 'افتح نظام نور أو منصة مدرستي وستجد أدوات الاستيراد مدمجة في الصفحة.'
            : 'بعد التثبيت افتح نظام نور أو منصة مدرستي وستجد أدوات الاستيراد مدمجة في الصفحة.'}
        </span>
      </div>
    </div>
  )
}

// ─── سلّم خطوات الاستيراد (يتتبّع مسار الطلاب) ─────────────────────────────
function ImportSteps({ dones }: { dones: boolean[] }) {
  const STEPS = [
    { label: 'حمّل القالب وعبّئه', sub: 'أو صدّر الملف من نور' },
    { label: 'ارفع الملف', sub: 'تُعرض معاينة آمنة لا تغيّر شيئاً' },
    { label: 'راجع الغِطاء والفروقات', sub: 'الجدد والتحديثات ومرشّحو الحذف' },
    { label: 'نفّذ الاستيراد', sub: 'وستصلك نتائج التنفيذ هنا' },
  ]
  const current = dones.findIndex((d) => !d)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {STEPS.map((step, i) => {
        const state = dones[i] ? 'done' : i === current ? 'current' : 'todo'
        const tone = state === 'done' ? TONES.green : state === 'current' ? TONES.sky : null
        return (
          <div
            key={step.label}
            className="ws-tbl-rise"
            style={{
              animationDelay: `${i * 60}ms`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              border: tone ? `1px solid ${tone.bd}` : '1px solid var(--ws-hairline)',
              background: tone ? chip(tone) : 'var(--ws-surface)',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12.5,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                background: tone ? 'var(--ws-surface)' : 'transparent',
                border: tone ? undefined : `1px solid ${TONES.gray.bd}`,
                color: tone ? tone.tx : 'var(--ws-text-2)',
              }}
            >
              {ar(i + 1)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{step.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)', marginTop: 1 }}>{step.sub}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── التبويبات ─────────────────────────────────────────────────────────────
type TabId = 'people' | 'schedules' | 'platforms'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'people', label: 'الطلاب والمعلمون' },
  { id: 'schedules', label: 'الجداول' },
  { id: 'platforms', label: 'المنصات' },
]

// ─── الصفحة ────────────────────────────────────────────────────────────────
export function AdminImportPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('people')

  // حالة الطلاب
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [studentPreview, setStudentPreview] = useState<ImportStudentsPreview | null>(null)
  const [studentOptions, setStudentOptions] = useState(() => ({
    update_existing: true,
    delete_missing: false,
  }))
  const [studentError, setStudentError] = useState<string | null>(null)
  const [studentImportSummary, setStudentImportSummary] = useState<ImportSummary | null>(null)

  // حالة المعلمين
  const [teacherFile, setTeacherFile] = useState<File | null>(null)
  const [teacherSummary, setTeacherSummary] = useState<ImportTeachersSummary | null>(null)
  const [teacherError, setTeacherError] = useState<string | null>(null)

  const [isTimeTableDialogOpen, setIsTimeTableDialogOpen] = useState(false)
  const [isSmartScheduleDialogOpen, setIsSmartScheduleDialogOpen] = useState(false)

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
        onError: () => setStudentError('حدث خطأ أثناء تنفيذ الاستيراد. حاول مجددًا.'),
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
      onError: () => setTeacherError('تعذر استيراد البيانات. تأكد من القالب أو أعد المحاولة.'),
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

  const stepDones = [
    Boolean(studentFile),
    Boolean(studentPreview),
    Boolean(studentImportSummary),
    Boolean(studentImportSummary),
  ]

  return (
    <WsPage className="ws-rich">
      <WsHeader
        title="استيراد البيانات"
        badge="معاينة قبل التنفيذ"
        facts={
          <WsFact icon={UploadCloud} label="الصيغ المدعومة">
            XLSX · CSV · XML
          </WsFact>
        }
      />

      <WsToolbar>
        <div className="ws-seg" style={{ display: 'flex', flex: 1, maxWidth: 480 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`ws-seg__btn ${activeTab === tab.id ? 'is-active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {activeTab === 'people' && (
            <div className="ws-import-duo ws-fade-in">
              {/* ── عمود الطلاب ── */}
              <WsBlock
                title="الطلاب"
                icon={GraduationCap}
                tools={
                  <WsBtn
                    size="sm"
                    icon={Download}
                    onClick={() => downloadStudentsTemplateMutation.mutate()}
                    disabled={downloadStudentsTemplateMutation.isPending}
                  >
                    القالب
                  </WsBtn>
                }
                padded
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                    المعاينة لا تحدّث بيانات — راجع النتائج ثم نفّذ الاستيراد.
                  </p>

                  <UploadCard
                    onFileSelected={handleStudentFileSelected}
                    isLoading={previewStudentsMutation.isPending}
                    helper="XLSX / CSV · حتى 10MB"
                    fileName={studentFile?.name}
                  />

                  {studentError && (
                    <WsAlert tone="error" boxed icon={AlertTriangle}>
                      {studentError}
                    </WsAlert>
                  )}

                  {studentPreview && (
                    <>
                      {/* «الغِطاء» — الملف غطاءٌ، ومن لم يغطّه سقط */}
                      <ImportCover preview={studentPreview} armed={studentOptions.delete_missing} />
                      <StudentPreviewSummary preview={studentPreview} />

                      <div
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid var(--ws-hairline)',
                          background: 'var(--ws-surface-2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ws-text-2)' }}>خيارات التنفيذ</span>
                        <OptionCheck
                          label="تحديث السجلات الموجودة"
                          desc="تحديث بيانات الطلاب الحاليين وفق الملف"
                          checked={studentOptions.update_existing}
                          onChange={(v) => setStudentOptions((prev) => ({ ...prev, update_existing: v }))}
                          disabled={isStudentBusy}
                        />
                        <OptionCheck
                          label="حذف السجلات غير الموجودة"
                          desc="يقتلع من لم يذكرهم الملف — تأكد أن الملف يشمل جميع الطلاب"
                          danger
                          checked={studentOptions.delete_missing}
                          onChange={(v) => setStudentOptions((prev) => ({ ...prev, delete_missing: v }))}
                          disabled={isStudentBusy}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                          <WsBtn
                            size="sm"
                            icon={RefreshCw}
                            onClick={() => {
                              setStudentPreview(null)
                              setStudentImportSummary(null)
                              setStudentFile(null)
                            }}
                            disabled={isStudentBusy}
                          >
                            إعادة
                          </WsBtn>
                          <WsBtn
                            size="sm"
                            variant="primary"
                            icon={UploadCloud}
                            onClick={handleStudentImport}
                            disabled={isStudentBusy || !studentPreview}
                          >
                            {importStudentsMutation.isPending ? 'جارٍ التنفيذ...' : 'تنفيذ الاستيراد'}
                          </WsBtn>
                        </div>
                      </div>

                      <StudentPreviewDetails preview={studentPreview} />
                    </>
                  )}

                  {studentImportSummary && (
                    <ImportSummaryCard summary={studentImportSummary} title="نتائج استيراد الطلاب" />
                  )}
                </div>
              </WsBlock>

              {/* الفاصل بين العمودين — لونه وشكله من CSS ليتبع الهوية */}
              <span className="ws-import-duo__bar" aria-hidden />

              {/* ── عمود المعلمين ── */}
              <WsBlock
                title="المعلمون"
                icon={Users}
                tools={
                  <WsBtn
                    size="sm"
                    icon={Download}
                    onClick={() => downloadTeachersTemplateMutation.mutate()}
                    disabled={downloadTeachersTemplateMutation.isPending}
                  >
                    القالب
                  </WsBtn>
                }
                padded
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                    سيتم إنشاء الحسابات الجديدة وإرجاع كلمات المرور المؤقتة إن وُجدت.
                  </p>

                  <UploadCard
                    onFileSelected={handleTeacherFileSelected}
                    isLoading={isTeacherBusy}
                    helper="الاسم · الهوية · البريد · الجوال · التخصص"
                    fileName={teacherFile?.name}
                  />

                  {teacherError && (
                    <WsAlert tone="error" boxed icon={AlertTriangle}>
                      {teacherError}
                    </WsAlert>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <WsBtn
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => {
                        setTeacherFile(null)
                        setTeacherSummary(null)
                      }}
                      disabled={isTeacherBusy}
                    >
                      إعادة تعيين
                    </WsBtn>
                    <WsBtn
                      size="sm"
                      variant="primary"
                      icon={UploadCloud}
                      onClick={handleTeacherImport}
                      disabled={isTeacherBusy || !teacherFile}
                    >
                      {isTeacherBusy ? 'جارٍ الاستيراد...' : 'تنفيذ الاستيراد'}
                    </WsBtn>
                  </div>

                  {teacherSummary && (
                    <>
                      <ImportSummaryCard summary={teacherSummary} title="نتائج استيراد المعلمين" />

                      {teacherSummary.credentials && teacherSummary.credentials.length > 0 && (
                        <div
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            border: `1px solid ${TONES.amber.bd}`,
                            background: chip(TONES.amber),
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <header style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <KeyRound style={{ width: 14, height: 14, color: TONES.amber.tx }} />
                            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, flex: 1 }}>
                              كلمات المرور المؤقتة ({ar(teacherSummary.credentials.length)})
                            </h4>
                          </header>
                          <div style={{ ...tableWrap, background: 'var(--ws-surface)' }}>
                            <WsTable>
                              <thead>
                                <tr>
                                  <th>رقم الهوية</th>
                                  <th>كلمة المرور</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teacherSummary.credentials.map((credential) => (
                                  <tr key={`${credential.national_id}-${credential.password}`}>
                                    <td>{credential.national_id}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{credential.password}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </WsTable>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--ws-text-2)' }}>
                            رقم الهوية يُستخدم اسمَ مستخدم — انسخ الكلمات الآن فلن تُعرض مرة أخرى.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </WsBlock>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <WsBlock
              title="استيراد من aSc TimeTable"
              icon={Calendar}
              className="ws-fade-in"
              tools={
                <WsBtn size="sm" variant="primary" icon={UploadCloud} onClick={() => setIsTimeTableDialogOpen(true)}>
                  استيراد جدول
                </WsBtn>
              }
              padded
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                  استيراد جداول الحصص من برنامج aSc TimeTable بصيغة XML مع مطابقة ذكية للمعلمين والمواد.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${TONES.green.bd}`,
                    background: chip(TONES.green),
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--ws-surface)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Calendar style={{ width: 16, height: 16, color: TONES.green.tx }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>aSc TimeTable XML</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)' }}>
                      ملفات XML بترميز windows-1256 (عربي)
                    </span>
                  </span>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--ws-hairline)',
                    background: 'var(--ws-surface-2)',
                  }}
                >
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--ws-text-2)' }}>
                    مميزات الاستيراد
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      'دعم ملفات XML بترميز windows-1256 (العربية)',
                      'مطابقة ذكية للمعلمين والمواد مع النظام',
                      'تحويل أسماء الفصول تلقائياً (أول 1 ← الصف الأول / 1)',
                      'إمكانية استبدال الحصص القديمة أو الإضافة عليها',
                    ].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: TONES.green.tx,
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </WsBlock>

            <WsBlock
              title="استيراد من الجدول الذكي"
              icon={Sparkles}
              className="ws-fade-in"
              tools={
                <WsBtn size="sm" variant="primary" icon={UploadCloud} onClick={() => setIsSmartScheduleDialogOpen(true)}>
                  استيراد جدول
                </WsBtn>
              }
              padded
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ws-text-2)' }}>
                  استيراد تصدير «جداول المعلمين» من برنامج الجدول الذكي: مصنّف Excel فيه ورقةٌ لكل معلم،
                  يُقلَب إلى حصص فصول مع مطابقة المعلمين والمواد.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${TONES.purple.bd}`,
                    background: chip(TONES.purple),
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--ws-surface)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles style={{ width: 16, height: 16, color: TONES.purple.tx }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>الجدول الذكي — Excel</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ws-text-2)' }}>
                      ورقة لكل معلم · خلية «سادس 4 رياضيات»
                    </span>
                  </span>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--ws-hairline)',
                    background: 'var(--ws-surface-2)',
                  }}
                >
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--ws-text-2)' }}>
                    مميزات الاستيراد
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      'يقلب جداول المعلمين إلى حصص فصول تلقائياً',
                      'يفكّ الخلية إلى صف وفصل ومادة («ثألث 2 لغتي» ← الصف الثالث / 2)',
                      'يطابق المواد المختصرة بالمسجّلة، ويُنشئ ما ينقص منها',
                      'يكشف تعارضات الملف قبل الكتابة، والاستيراد كلّه أو لا شيء',
                    ].map((item) => (
                      <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: TONES.purple.tx,
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </WsBlock>
            </div>
          )}

          {activeTab === 'platforms' && (
            <WsBlock title="الاستيراد من المنصات التعليمية" icon={Puzzle} padded className="ws-fade-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* ★ إضافة كروم هي البطل هنا — مسار الاستيراد الأسرع */}
                <ExtensionHeroCard />

                <div>
                  <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: 'var(--ws-text-2)' }}>
                    الاستيراد من داخل النظام (يتطلب الإضافة)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
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
              </div>
            </WsBlock>
          )}
        </WsMain>

        {/* الدليل — سلّم الخطوات الحيّ وتحذيرات ما قبل التنفيذ */}
        <WsSideCol side="end" title="الدليل" icon={Info} storageKey="ws:import:sidecol" width={300}>
          {/* إضافة كروم حاضرة في كل التبويبات — لا تُدفن في تبويب المنصات */}
          <WsBlock title="أداة كروم" icon={Chrome} padded>
            <ExtensionDetector />
          </WsBlock>

          <WsBlock title="خطوات الاستيراد" icon={ListChecks} padded>
            <ImportSteps dones={stepDones} />
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ws-text-2)' }}>
              السلّم يتتبّع مسار استيراد الطلاب في هذه الجلسة.
            </p>
          </WsBlock>

          <WsBlock title="قبل أن تنفّذ" icon={AlertTriangle} padded fill scroll>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { tone: TONES.green, text: 'المعاينة آمنة تماماً — لا تغيّر بيانات النظام.' },
                { tone: TONES.red, text: 'خيار «حذف السجلات غير الموجودة» يقتلع كل من لم يذكرهم الملف، ومعهم سجلات حضورهم.' },
                { tone: TONES.amber, text: 'كلمات مرور المعلمين الجدد تظهر مرة واحدة بعد التنفيذ — انسخها فوراً.' },
                { tone: TONES.sky, text: 'استيراد الجداول يعرض شاشة مطابقة للمعلمين والمواد قبل أي حفظ.' },
              ].map((item) => (
                <li key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.tone.tx,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <span style={{ fontSize: 12.5, lineHeight: 1.7 }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      <TimeTableImportDialog isOpen={isTimeTableDialogOpen} onClose={() => setIsTimeTableDialogOpen(false)} />
      <SmartScheduleImportDialog isOpen={isSmartScheduleDialogOpen} onClose={() => setIsSmartScheduleDialogOpen(false)} />
    </WsPage>
  )
}

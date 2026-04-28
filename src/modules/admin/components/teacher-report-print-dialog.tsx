import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Printer } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { academicCalendarApi, type AcademicSemesterSummary } from '@/services/api/academic-calendar'
import {
  fetchTeacherReport,
  type TeacherReportSectionKey,
  type TeacherReportSignatureKey,
} from '@/services/api/teacher-report'
import { printTeacherReport } from '../utils/print-teacher-report'

interface TeacherReportPrintDialogProps {
  teacherId: number | null
  teacherName?: string | null
  open: boolean
  onOpenChange: (value: boolean) => void
}

type PeriodMode = 'semester' | 'custom'

const SECTION_OPTIONS: Array<{ key: TeacherReportSectionKey; label: string; group: string }> = [
  { key: 'daily_attendance', label: 'ملخص الحضور', group: 'الحضور والالتزام' },
  { key: 'daily_lates', label: 'تفاصيل التأخيرات اليومية', group: 'الحضور والالتزام' },
  { key: 'daily_absences', label: 'تفاصيل الغيابات اليومية', group: 'الحضور والالتزام' },
  { key: 'period_actions', label: 'المتابعة المباشرة (إجراءات الحصص والمناوبات)', group: 'الحضور والالتزام' },
  { key: 'schedule', label: 'الجدول الأسبوعي', group: 'الأنشطة التعليمية' },
  { key: 'preparation', label: 'تحضير الدروس (مدرستي)', group: 'الأنشطة التعليمية' },
  { key: 'standby_coverage', label: 'حصص الانتظار التي غطّاها', group: 'المهام الإضافية' },
  { key: 'coverage_requests', label: 'طلبات التغطية', group: 'المهام الإضافية' },
  { key: 'referrals_sent', label: 'الإحالات المُرسلة', group: 'التفاعل مع الطلاب' },
  { key: 'admin_messages', label: 'الرسائل المُرسلة من الإدارة', group: 'الإدارة' },
]

const SECTION_GROUPS = ['الحضور والالتزام', 'الأنشطة التعليمية', 'المهام الإضافية', 'التفاعل مع الطلاب', 'الإدارة'] as const

const SIGNATURE_OPTIONS: Array<{ key: TeacherReportSignatureKey; label: string }> = [
  { key: 'teacher', label: 'المعلم' },
  { key: 'supervisor', label: 'المشرف التربوي' },
  { key: 'deputy', label: 'الوكيل' },
  { key: 'principal', label: 'مدير المدرسة' },
]

const ALL_SECTIONS_TRUE: Record<TeacherReportSectionKey, boolean> = {
  daily_attendance: true,
  daily_lates: true,
  daily_absences: true,
  period_actions: true,
  schedule: true,
  preparation: true,
  standby_coverage: true,
  coverage_requests: true,
  referrals_sent: true,
  admin_messages: true,
}

const DEFAULT_SIGNATURES: Record<TeacherReportSignatureKey, boolean> = {
  teacher: true,
  supervisor: false,
  deputy: false,
  principal: true,
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function TeacherReportPrintDialog({
  teacherId,
  teacherName,
  open,
  onOpenChange,
}: TeacherReportPrintDialogProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('semester')
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null)
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [sections, setSections] = useState<Record<TeacherReportSectionKey, boolean>>({ ...ALL_SECTIONS_TRUE })
  const [signatures, setSignatures] = useState<Record<TeacherReportSignatureKey, boolean>>({ ...DEFAULT_SIGNATURES })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const semestersQuery = useQuery({
    queryKey: ['academic-calendar', 'semesters'],
    queryFn: academicCalendarApi.getSemesters,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    const semesters = semestersQuery.data
    if (semesters && semesters.length > 0 && selectedSemesterId === null) {
      const current = semesters.find((s) => s.is_current) ?? semesters[0]
      setSelectedSemesterId(current.id)
    }
    if (customRange.start === '' || customRange.end === '') {
      const today = new Date()
      const past = new Date()
      past.setDate(past.getDate() - 29)
      setCustomRange({ start: toISODate(past), end: toISODate(today) })
    }
  }, [open, semestersQuery.data, selectedSemesterId, customRange.start, customRange.end])

  const selectedSectionKeys = useMemo(
    () => SECTION_OPTIONS.filter((opt) => sections[opt.key]).map((opt) => opt.key),
    [sections],
  )
  const selectedSignatureKeys = useMemo(
    () => SIGNATURE_OPTIONS.filter((opt) => signatures[opt.key]).map((opt) => opt.key),
    [signatures],
  )

  const toggleSection = (key: TeacherReportSectionKey) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const toggleSignature = (key: TeacherReportSignatureKey) =>
    setSignatures((prev) => ({ ...prev, [key]: !prev[key] }))

  const selectAll = () => setSections({ ...ALL_SECTIONS_TRUE })
  const deselectAll = () =>
    setSections((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, false])) as Record<TeacherReportSectionKey, boolean>)

  const canSubmit = useMemo(() => {
    if (!teacherId) return false
    if (selectedSectionKeys.length === 0) return false
    if (periodMode === 'semester') return selectedSemesterId !== null
    return Boolean(customRange.start && customRange.end && customRange.start <= customRange.end)
  }, [teacherId, selectedSectionKeys.length, periodMode, selectedSemesterId, customRange.start, customRange.end])

  const handleGenerate = async () => {
    if (!teacherId || !canSubmit) return
    setIsGenerating(true)
    setError(null)
    try {
      const params =
        periodMode === 'semester'
          ? { semester_id: selectedSemesterId!, include: selectedSectionKeys, signatures: selectedSignatureKeys }
          : {
              start_date: customRange.start,
              end_date: customRange.end,
              include: selectedSectionKeys,
              signatures: selectedSignatureKeys,
            }
      const data = await fetchTeacherReport(teacherId, params)
      printTeacherReport(data)
      onOpenChange(false)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'تعذّر إنشاء التقرير'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const semesters: AcademicSemesterSummary[] = semestersQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">طباعة تقرير شامل لملف المعلم</DialogTitle>
          <DialogDescription className="text-right">
            {teacherName ? `المعلم: ${teacherName}` : 'اختر الفترة والبنود ثم اضغط طباعة.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-right">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">الفترة</legend>
            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="period-mode"
                  checked={periodMode === 'semester'}
                  onChange={() => setPeriodMode('semester')}
                />
                فصل دراسي
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="period-mode"
                  checked={periodMode === 'custom'}
                  onChange={() => setPeriodMode('custom')}
                />
                مدى مخصص
              </label>
            </div>

            {periodMode === 'semester' ? (
              <div>
                <select
                  value={selectedSemesterId ?? ''}
                  onChange={(e) => setSelectedSemesterId(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  disabled={semestersQuery.isLoading || semesters.length === 0}
                >
                  {semestersQuery.isLoading ? (
                    <option>جارٍ التحميل...</option>
                  ) : semesters.length === 0 ? (
                    <option>لا توجد فصول دراسية</option>
                  ) : (
                    semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.is_current ? ' (الحالي)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">
                  من
                  <input
                    type="date"
                    value={customRange.start}
                    onChange={(e) => setCustomRange((p) => ({ ...p, start: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  إلى
                  <input
                    type="date"
                    value={customRange.end}
                    onChange={(e) => setCustomRange((p) => ({ ...p, end: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold text-slate-900">البنود المُضمّنة</legend>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-xs font-medium text-emerald-700 hover:underline">
                  تحديد الكل
                </button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={deselectAll} className="text-xs font-medium text-slate-600 hover:underline">
                  إلغاء الكل
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {SECTION_GROUPS.map((group) => {
                const groupOptions = SECTION_OPTIONS.filter((o) => o.group === group)
                if (groupOptions.length === 0) return null
                return (
                  <div key={group} className="rounded-md border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">{group}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {groupOptions.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={sections[opt.key]}
                            onChange={() => toggleSection(opt.key)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {selectedSectionKeys.length === 0 && (
              <p className="text-xs text-rose-600">يجب اختيار بند واحد على الأقل.</p>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">خانات التوقيع</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {SIGNATURE_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={signatures[opt.key]}
                    onChange={() => toggleSignature(opt.key)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            إلغاء
          </Button>
          <Button onClick={handleGenerate} disabled={!canSubmit || isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            إنشاء وطباعة التقرير
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

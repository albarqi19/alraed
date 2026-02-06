import { useState, useEffect, useRef, useCallback } from 'react'
import { Printer, Search, CheckSquare, Square, Download } from 'lucide-react'
import { useBarcodeStudentsQuery, usePrintBarcodesBatchMutation } from '../barcode/hooks'
import JsBarcode from 'jsbarcode'

// مكون عرض الباركود
function BarcodePreview({ value, width = 1.5, height = 40 }: { value: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          font: 'monospace',
        })
      } catch {
        // Invalid barcode value
      }
    }
  }, [value, width, height])

  return <svg ref={svgRef} />
}

// ==================== الصفحة الرئيسية ====================

export function AdminBarcodePrintPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [format, setFormat] = useState<'card' | 'label' | 'list'>('card')
  const [showPreview, setShowPreview] = useState(false)

  const { data: students = [], isLoading } = useBarcodeStudentsQuery({
    grade: selectedGrade || undefined,
    class_name: selectedClass || undefined,
    search: search || undefined,
  })

  const printMutation = usePrintBarcodesBatchMutation()

  // استخراج الصفوف والفصول الفريدة
  const grades = [...new Set(students.map((s) => s.grade))].sort()
  const classes = [...new Set(students.filter((s) => !selectedGrade || s.grade === selectedGrade).map((s) => s.class_name))].sort()

  // تحديد/إلغاء الكل
  const toggleAll = useCallback(() => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)))
    }
  }, [students, selectedIds])

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    if (selectedIds.size === 0) return
    printMutation.mutate({
      student_ids: Array.from(selectedIds),
      format,
    })
  }

  const selectedStudents = students.filter((s) => selectedIds.has(s.id))

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طباعة الباركود</h1>
          <p className="text-sm text-gray-500">توليد وطباعة بطاقات الباركود للطلاب</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              معاينة ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={selectedIds.size === 0 || printMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {printMutation.isPending ? 'جاري التحميل...' : `تحميل PDF (${selectedIds.size})`}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* القسم الأيسر: الفلاتر والقائمة */}
        <div className="lg:col-span-2 space-y-4">
          {/* الفلاتر */}
          <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setSelectedClass('')
                setSelectedIds(new Set())
              }}
              className="rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">جميع الصفوف</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedIds(new Set())
              }}
              className="rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">جميع الفصول</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الهوية..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border py-2 pr-9 pl-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* شكل الطباعة */}
          <div className="flex gap-2 rounded-xl border bg-white p-3 shadow-sm">
            <span className="text-sm text-gray-500 self-center ml-3">شكل الطباعة:</span>
            {[
              { id: 'card' as const, label: 'بطاقة' },
              { id: 'label' as const, label: 'ملصق' },
              { id: 'list' as const, label: 'قائمة' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  format === f.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* قائمة الطلاب */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-primary hover:underline">
                {selectedIds.size === students.length && students.length > 0 ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedIds.size === students.length && students.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
              <span className="text-xs text-gray-400">
                {students.length} طالب {selectedIds.size > 0 && `(${selectedIds.size} محدد)`}
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y">
              {isLoading ? (
                <div className="py-8 text-center text-gray-400">جاري التحميل...</div>
              ) : students.length === 0 ? (
                <div className="py-8 text-center text-gray-400">لا يوجد طلاب</div>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
                      selectedIds.has(student.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    {selectedIds.has(student.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-300" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-gray-500">
                        {student.grade} - {student.class_name}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-gray-400" dir="ltr">
                      {student.national_id}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* القسم الأيمن: المعاينة */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              <Printer className="inline h-4 w-4 ml-1" />
              معاينة الباركود
            </h3>

            {selectedStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Printer className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">اختر طلاب لمعاينة الباركود</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {selectedStudents.slice(0, 5).map((student) => (
                  <div key={student.id} className="rounded-lg border p-3 text-center">
                    <p className="text-sm font-semibold">{student.name}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      {student.grade} - {student.class_name}
                    </p>
                    {student.national_id && (
                      <div className="flex justify-center">
                        <BarcodePreview value={student.national_id} />
                      </div>
                    )}
                  </div>
                ))}
                {selectedStudents.length > 5 && (
                  <p className="text-center text-xs text-gray-400">
                    + {selectedStudents.length - 5} طالب آخر
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

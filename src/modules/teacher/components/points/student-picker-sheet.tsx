import { useEffect, useMemo, useState } from 'react'
import type { TeacherPointMode, TeacherPointStudent } from '@/modules/teacher/points/types'

interface StudentPickerSheetProps {
  isOpen: boolean
  students: TeacherPointStudent[]
  mode: TeacherPointMode
  reasonTitle?: string
  onSelect: (student: TeacherPointStudent) => void
  onClose: () => void
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function StudentPickerSheet({
  isOpen,
  students,
  mode,
  reasonTitle,
  onSelect,
  onClose,
}: StudentPickerSheetProps) {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSearch('')
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    if (!search.trim()) return students
    const term = normalize(search)

    return students.filter((student) => {
      const haystack = [student.name, student.grade, student.class_name, student.card_token]
        .filter(Boolean)
        .map((value) => normalize(String(value)))

      return haystack.some((value) => value.includes(term))
    })
  }, [students, search])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="space-y-1 text-right">
            <h2 className="text-lg font-semibold text-slate-900">اختر الطالب</h2>
            <p className="text-xs text-muted">
              {mode === 'reward'
                ? 'ابحث باسم الطالب أو الصف لإضافة النقاط دون استخدام الكاميرا.'
                : 'ابحث باسم الطالب لتسجيل المخالفة بسرعة.'}
            </p>
            {reasonTitle ? (
              <p className="text-[11px] font-semibold text-teal-600">السبب المختار: {reasonTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500"
            aria-label="إغلاق"
          >
            ×
          </button>
        </header>

        <div className="border-b border-slate-100 px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الطالب أو الصف"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-right text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-2 pb-4">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">لم يتم العثور على طلاب بالبحث الحالي.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(student)}
                    className={`w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right transition hover:border-amber-300`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{student.name}</p>
                        <p className="text-xs text-muted">
                          {student.grade ?? '—'} — {student.class_name ?? '—'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-amber-600">اختيار</span>
                    </div>
                    {!student.card_token ? (
                      <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                        ⚠ لم يتم تفعيل بطاقة الطالب بعد. ستحتاج لمسح الرمز لإتمام العملية.
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

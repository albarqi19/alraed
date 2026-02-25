import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, User } from 'lucide-react'
import { useTeachersQuery } from '@/modules/admin/hooks'
import type { TeacherRecord } from '@/modules/admin/types'

function normalizeArabicText(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

interface TeacherSelectorProps {
  selectedId: number | null
  onSelect: (id: number) => void
}

export function TeacherSelector({ selectedId, onSelect }: TeacherSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const teachersQuery = useTeachersQuery()
  const teachers: TeacherRecord[] = useMemo(() => teachersQuery.data ?? [], [teachersQuery.data])

  const filtered = useMemo(() => {
    const q = normalizeArabicText(searchTerm)
    if (!q) return teachers
    return teachers.filter((t) => {
      const nameMatch = normalizeArabicText(t.name).includes(q)
      const idMatch = t.national_id?.includes(searchTerm)
      return nameMatch || idMatch
    })
  }, [teachers, searchTerm])

  const currentIndex = useMemo(
    () => teachers.findIndex((t) => t.id === selectedId),
    [teachers, selectedId],
  )
  const selectedTeacher = teachers.find((t) => t.id === selectedId)

  const goPrev = () => {
    if (currentIndex > 0) onSelect(teachers[currentIndex - 1].id)
  }
  const goNext = () => {
    if (currentIndex < teachers.length - 1) onSelect(teachers[currentIndex + 1].id)
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={goPrev}
        disabled={currentIndex <= 0}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <User className="h-4 w-4 text-slate-400" />
          <span className="flex-1 text-right">
            {selectedTeacher?.name ?? 'اختر معلماً'}
          </span>
          {selectedId && (
            <span className="text-xs text-slate-400">
              {currentIndex + 1}/{teachers.length}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
                <div className="relative">
                  <Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث بالاسم أو رقم الهوية..."
                    className="w-full rounded-lg border border-slate-200 py-2 pe-3 ps-9 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">لا توجد نتائج</p>
                ) : (
                  filtered.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => {
                        onSelect(teacher.id)
                        setIsOpen(false)
                        setSearchTerm('')
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm transition hover:bg-slate-50 ${
                        teacher.id === selectedId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {teacher.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{teacher.name}</p>
                        <p className="text-xs text-slate-400">{teacher.national_id}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={goNext}
        disabled={currentIndex >= teachers.length - 1}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  )
}

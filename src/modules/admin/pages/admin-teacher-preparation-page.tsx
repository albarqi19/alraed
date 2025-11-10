import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/modules/auth/store/auth-store'

type PreparationStatus = 'prepared' | 'waiting' | 'warning' | 'activity' | 'empty'

type Lesson = {
  day: string
  period_number: number
  subject: string | null
  grade: string | null
  class_name: string | null
  status: PreparationStatus
}

type TeacherPreparation = {
  teacher_id: string
  teacher_name: string
  lessons: Lesson[]
}

type TeacherSummary = {
  teacher_id: string
  teacher_name: string
  total_lessons: number
  prepared_count: number
  waiting_count: number
  warning_count: number
  activity_count: number
  empty_count: number
  unprepared_count: number
  all_prepared: boolean
  lessons: Lesson[]
}

function getStatusLabel(status: PreparationStatus): string {
  const labels: Record<PreparationStatus, string> = {
    prepared: 'محضّر',
    waiting: 'بانتظار التحضير',
    warning: 'تحذير',
    activity: 'نشاط',
    empty: 'فارغ',
  }
  return labels[status]
}

function getStatusTone(status: PreparationStatus): string {
  const tones: Record<PreparationStatus, string> = {
    prepared: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    waiting: 'bg-amber-50 text-amber-700 border border-amber-200',
    warning: 'bg-rose-50 text-rose-700 border border-rose-200',
    activity: 'bg-blue-50 text-blue-700 border border-blue-200',
    empty: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return tones[status]
}

function getDayLabel(day: string): string {
  const days: Record<string, string> = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
  }
  return days[day.toLowerCase()] || day
}

function calculateTeacherSummary(teacher: TeacherPreparation): TeacherSummary {
  const prepared_count = teacher.lessons.filter((l) => l.status === 'prepared').length
  const waiting_count = teacher.lessons.filter((l) => l.status === 'waiting').length
  const warning_count = teacher.lessons.filter((l) => l.status === 'warning').length
  const activity_count = teacher.lessons.filter((l) => l.status === 'activity').length
  const empty_count = teacher.lessons.filter((l) => l.status === 'empty').length
  const unprepared_count = waiting_count + warning_count
  const all_prepared = unprepared_count === 0 && teacher.lessons.length > 0

  return {
    teacher_id: teacher.teacher_id,
    teacher_name: teacher.teacher_name,
    total_lessons: teacher.lessons.length,
    prepared_count,
    waiting_count,
    warning_count,
    activity_count,
    empty_count,
    unprepared_count,
    all_prepared,
    lessons: teacher.lessons,
  }
}

function TeacherCard({ summary, onExpand }: { summary: TeacherSummary; onExpand: () => void }) {
  return (
    <div
      onClick={onExpand}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="bi bi-person-fill text-xl text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">{summary.teacher_name}</h3>
        </div>
        {summary.all_prepared ? (
          <span className="text-2xl">✅</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
            <i className="bi bi-exclamation-triangle-fill" />
            {summary.unprepared_count} غير محضّر
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">إجمالي الدروس</div>
          <div className="text-lg font-bold text-slate-700">{summary.total_lessons}</div>
        </div>
        <div className="rounded bg-emerald-50 px-3 py-2">
          <div className="text-xs text-emerald-600">محضّر</div>
          <div className="text-lg font-bold text-emerald-700">{summary.prepared_count}</div>
        </div>
        <div className="rounded bg-amber-50 px-3 py-2">
          <div className="text-xs text-amber-600">بانتظار</div>
          <div className="text-lg font-bold text-amber-700">{summary.waiting_count}</div>
        </div>
        <div className="rounded bg-rose-50 px-3 py-2">
          <div className="text-xs text-rose-600">تحذير</div>
          <div className="text-lg font-bold text-rose-700">{summary.warning_count}</div>
        </div>
      </div>
    </div>
  )
}

function LessonDetailRow({ lesson }: { lesson: Lesson }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-700">{getDayLabel(lesson.day)}</td>
      <td className="px-4 py-3 text-center text-sm text-slate-700">{lesson.period_number}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{lesson.subject || '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{lesson.grade || '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{lesson.class_name || '—'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(lesson.status)}`}>
          {getStatusLabel(lesson.status)}
        </span>
      </td>
    </tr>
  )
}

function TeacherDetailDialog({ summary, onClose }: { summary: TeacherSummary; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <i className="bi bi-person-badge text-2xl text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">{summary.teacher_name}</h2>
              <p className="text-sm text-slate-600">تفاصيل التحضير الكاملة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 bg-white p-6 sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <div className="text-xs text-slate-500">إجمالي</div>
            <div className="text-2xl font-bold text-slate-700">{summary.total_lessons}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-center">
            <div className="text-xs text-emerald-600">محضّر</div>
            <div className="text-2xl font-bold text-emerald-700">{summary.prepared_count}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <div className="text-xs text-amber-600">بانتظار</div>
            <div className="text-2xl font-bold text-amber-700">{summary.waiting_count}</div>
          </div>
          <div className="rounded-lg bg-rose-50 p-3 text-center">
            <div className="text-xs text-rose-600">تحذير</div>
            <div className="text-2xl font-bold text-rose-700">{summary.warning_count}</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <div className="text-xs text-blue-600">نشاط</div>
            <div className="text-2xl font-bold text-blue-700">{summary.activity_count}</div>
          </div>
        </div>

        {/* Lessons Table */}
        <div className="max-h-[50vh] overflow-y-auto p-6">
          <table className="w-full table-auto">
            <thead className="sticky top-0 bg-slate-100">
              <tr className="border-b-2 border-slate-300">
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">اليوم</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-slate-700">الحصة</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">المادة</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">الصف</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">الفصل</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {summary.lessons.map((lesson, idx) => (
                <LessonDetailRow key={idx} lesson={lesson} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [sendToUnprepared, setSendToUnprepared] = useState(false)
  const [sendMotivational, setSendMotivational] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <i className="bi bi-gear-fill text-2xl text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">إعدادات تحضير المعلمين</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="bi bi-x-lg text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          {/* رسائل غير المحضرين */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-slate-800">
                  <i className="bi bi-exclamation-triangle-fill text-amber-600" /> إرسال رسائل للمعلمين غير المحضرين
                </h3>
                <p className="text-sm text-slate-600">
                  إرسال تنبيه تلقائي للمعلمين الذين لم يحضّروا دروسهم
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sendToUnprepared}
                  onChange={(e) => setSendToUnprepared(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:right-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-[-20px]"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="bi bi-info-circle" />
              <span>قريباً - قيد التطوير</span>
            </div>
          </div>

          {/* رسائل تحفيزية */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-slate-800">
                  <i className="bi bi-star-fill text-yellow-500" /> رسائل تحفيزية للمعلمين المنتظمين
                </h3>
                <p className="text-sm text-slate-600">
                  إرسال رسالة شكر للمعلمين الذين حضّروا كل دروسهم لمدة أسبوع
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sendMotivational}
                  onChange={(e) => setSendMotivational(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:right-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-600 peer-checked:after:translate-x-[-20px]"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <i className="bi bi-info-circle" />
              <span>قريباً - قيد التطوير</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminTeacherPreparationPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSummary | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [showSettings, setShowSettings] = useState(false)

  const { data: preparations, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-preparations', selectedDate],
    queryFn: async () => {
      const schoolId = user?.school_id ? String(user.school_id) : ''
      const url = selectedDate 
        ? `${import.meta.env.VITE_API_BASE_URL}/attendance/teacher-preparation?date=${selectedDate}`
        : `${import.meta.env.VITE_API_BASE_URL}/attendance/teacher-preparation`
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-School-Id': schoolId,
        },
      })
      if (!response.ok) {
        throw new Error('فشل تحميل بيانات التحضير')
      }
      const result = await response.json()
      return result.data as TeacherPreparation[]
    },
    enabled: !!token && !!user?.school_id,
  })

  const summaries = useMemo(() => {
    if (!preparations) return []
    return preparations.map(calculateTeacherSummary)
  }, [preparations])

  const filteredSummaries = useMemo(() => {
    if (!searchTerm.trim()) return summaries
    const term = searchTerm.toLowerCase()
    return summaries.filter((s) => s.teacher_name.toLowerCase().includes(term))
  }, [summaries, searchTerm])

  const stats = useMemo(() => {
    const total_teachers = summaries.length
    const all_prepared = summaries.filter((s) => s.all_prepared).length
    const has_unprepared = summaries.filter((s) => !s.all_prepared).length
    const total_lessons = summaries.reduce((acc, s) => acc + s.total_lessons, 0)
    const total_prepared = summaries.reduce((acc, s) => acc + s.prepared_count, 0)
    const total_unprepared = summaries.reduce((acc, s) => acc + s.unprepared_count, 0)

    return {
      total_teachers,
      all_prepared,
      has_unprepared,
      total_lessons,
      total_prepared,
      total_unprepared,
    }
  }, [summaries])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <i className="bi bi-arrow-repeat animate-spin text-4xl text-blue-600" />
          <p className="mt-4 text-slate-600">جاري تحميل بيانات التحضير...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-4xl text-rose-600" />
          <p className="mt-4 text-slate-600">حدث خطأ أثناء تحميل البيانات</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-slate-800">
          <i className="bi bi-clipboard-check text-blue-600" />
          تحضير مدرستي
        </h1>
        <p className="text-slate-600">متابعة حالة تحضير دروس المعلمين من منصة مدرستي</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">عدد المعلمين</div>
          <div className="text-2xl font-bold text-slate-700">{stats.total_teachers}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="text-xs text-emerald-600">الكل محضّر ✅</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.all_prepared}</div>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <div className="text-xs text-rose-600">لديهم غير محضّر</div>
          <div className="text-2xl font-bold text-rose-700">{stats.has_unprepared}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="text-xs text-slate-500">إجمالي الدروس</div>
          <div className="text-2xl font-bold text-slate-700">{stats.total_lessons}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="text-xs text-emerald-600">محضّر</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.total_prepared}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="text-xs text-amber-600">غير محضّر</div>
          <div className="text-2xl font-bold text-amber-700">{stats.total_unprepared}</div>
        </div>
      </div>

      {/* Controls Bar: Date, Search, Settings, Refresh */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* Date Picker */}
        <div className="sm:col-span-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">التاريخ</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Search Bar */}
        <div className="sm:col-span-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">البحث عن معلم</label>
          <div className="relative">
            <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن معلم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-10 text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Settings & Refresh Buttons */}
        <div className="flex gap-2 sm:col-span-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 opacity-0">.</label>
            <button
              onClick={() => setShowSettings(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <i className="bi bi-gear-fill" />
              <span className="hidden sm:inline">الإعدادات</span>
            </button>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 opacity-0">.</label>
            <button
              onClick={() => refetch()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <i className="bi bi-arrow-clockwise" />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {filteredSummaries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
          <i className="bi bi-inbox text-5xl text-slate-300" />
          <p className="mt-4 text-slate-600">لا توجد بيانات تحضير متاحة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSummaries.map((summary) => (
            <TeacherCard key={summary.teacher_id} summary={summary} onExpand={() => setSelectedTeacher(summary)} />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      {selectedTeacher && <TeacherDetailDialog summary={selectedTeacher} onClose={() => setSelectedTeacher(null)} />}

      {/* Settings Dialog */}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}

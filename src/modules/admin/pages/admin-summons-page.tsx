import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchSummons,
  createSummon,
  updateSummon,
  deleteSummon,
  sendSummonMessage,
  fetchCounselingSessions,
  createCounselingSession,
  updateCounselingSession,
  deleteCounselingSession,
  fetchRecommendations,
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
} from '@/modules/admin/guidance/api'
import {
  Calendar,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  X,
  Edit2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useToast } from '@/shared/feedback/use-toast'

// --- Types ---
type Tab = 'summons' | 'counseling' | 'recommendations'

// --- Main Component ---
export function AdminSummonsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('summons')
  const queryClient = useQueryClient()

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">التوجيه والإرشاد</h1>
          <p className="text-sm text-muted-foreground">
            إدارة الاستدعاءات، الجلسات الإرشادية، والتوصيات التربوية
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <TabButton
            active={activeTab === 'summons'}
            onClick={() => setActiveTab('summons')}
            icon={<FileText className="h-4 w-4" />}
            label="الاستدعاءات"
          />
          <TabButton
            active={activeTab === 'counseling'}
            onClick={() => setActiveTab('counseling')}
            icon={<Users className="h-4 w-4" />}
            label="الجلسات الإرشادية"
          />
          <TabButton
            active={activeTab === 'recommendations'}
            onClick={() => setActiveTab('recommendations')}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="التوصيات"
          />
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'summons' && <SummonsTab />}
        {activeTab === 'counseling' && <CounselingTab />}
        {activeTab === 'recommendations' && <RecommendationsTab />}
      </div>
    </div>
  )
}

// --- Tab Button Component ---
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// --- Summons Tab ---
function SummonsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: ['summons'],
    queryFn: () => fetchSummons(),
  })

  const queryClient = useQueryClient()

  const sendMessageMutation = useMutation({
    mutationFn: sendSummonMessage,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال الرسالة بنجاح' })
      queryClient.invalidateQueries({ queryKey: ['summons'] })
    },
    onError: () => toast({ type: 'error', title: 'فشل إرسال الرسالة' }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          استدعاء جديد
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">الطالب</th>
              <th className="px-4 py-3 font-medium">النوع</th>
              <th className="px-4 py-3 font-medium">السبب</th>
              <th className="px-4 py-3 font-medium">الموعد</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.data?.map((summon: any) => (
              <tr key={summon.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {summon.student?.name}
                </td>
                <td className="px-4 py-3">
                  {summon.type === 'guardian' ? 'ولي أمر' : 'طالب'}
                </td>
                <td className="px-4 py-3">{summon.reason}</td>
                <td className="px-4 py-3 text-slate-500">
                  {format(new Date(summon.scheduled_at), 'PPP p', { locale: ar })}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={summon.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendMessageMutation.mutate(summon.id)}
                      disabled={summon.status === 'sent'}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-green-600 disabled:opacity-50"
                      title="إرسال واتساب"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {/* Add Edit/Delete here */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <CreateSummonModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  )
}

// --- Counseling Tab ---
function CounselingTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['counseling-sessions'],
    queryFn: () => fetchCounselingSessions(),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          جلسة جديدة
        </button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">الموضوع</th>
              <th className="px-4 py-3 font-medium">النوع</th>
              <th className="px-4 py-3 font-medium">الطلاب</th>
              <th className="px-4 py-3 font-medium">الموعد</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.data?.map((session: any) => (
              <tr key={session.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {session.topic}
                </td>
                <td className="px-4 py-3">
                  {session.type === 'individual' ? 'فردي' : 'جماعي'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                    {session.students?.map((student: any) => (
                      <span
                        key={student.id}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs ring-2 ring-white"
                        title={student.name}
                      >
                        {student.name.charAt(0)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {format(new Date(session.scheduled_at), 'PPP p', { locale: ar })}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={session.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {isCreateOpen && (
        <CreateSessionModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  )
}

// --- Recommendations Tab ---
function RecommendationsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => fetchRecommendations(),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          توصية جديدة
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.data?.map((rec: any) => (
          <div key={rec.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {rec.type}
              </span>
              <StatusBadge status={rec.status} />
            </div>
            <p className="mb-1 font-medium text-slate-900">{rec.student?.name}</p>
            <p className="text-sm text-slate-600">{rec.content}</p>
            {rec.due_date && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>
                  يستحق في: {format(new Date(rec.due_date), 'PPP', { locale: ar })}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
       {isCreateOpen && (
        <CreateRecommendationModal onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  )
}

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    attended: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    missed: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
    scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }

  const labels: Record<string, string> = {
    pending: 'قيد الانتظار',
    sent: 'تم الإرسال',
    attended: 'حضر',
    missed: 'لم يحضر',
    cancelled: 'ملغي',
    scheduled: 'مجدول',
    completed: 'مكتمل',
    in_progress: 'قيد التنفيذ',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  )
}

// --- Modals (Simplified for brevity, ideally separate components) ---

function CreateSummonModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const createMutation = useMutation({
    mutationFn: createSummon,
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إنشاء الاستدعاء' })
      queryClient.invalidateQueries({ queryKey: ['summons'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    createMutation.mutate({
      student_id: formData.get('student_id'),
      type: formData.get('type'),
      reason: formData.get('reason'),
      scheduled_at: formData.get('scheduled_at'),
      notes: formData.get('notes'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold">استدعاء جديد</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">رقم الطالب (ID)</label>
            <input
              name="student_id"
              type="number"
              required
              className="w-full rounded-lg border p-2 text-sm"
              placeholder="أدخل رقم الطالب"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">نوع الاستدعاء</label>
            <select name="type" className="w-full rounded-lg border p-2 text-sm">
              <option value="guardian">ولي أمر</option>
              <option value="student">طالب</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">السبب</label>
            <input
              name="reason"
              required
              className="w-full rounded-lg border p-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">الموعد</label>
            <input
              name="scheduled_at"
              type="datetime-local"
              required
              className="w-full rounded-lg border p-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateSessionModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const createMutation = useMutation({
      mutationFn: createCounselingSession,
      onSuccess: () => {
        toast({ type: 'success', title: 'تم إنشاء الجلسة' })
        queryClient.invalidateQueries({ queryKey: ['counseling-sessions'] })
        onClose()
      },
    })
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      const formData = new FormData(e.target as HTMLFormElement)
      const studentId = formData.get('student_id')
      
      createMutation.mutate({
        topic: formData.get('topic'),
        type: formData.get('type'),
        scheduled_at: formData.get('scheduled_at'),
        student_ids: [studentId], // Simplified for single student selection for now
        notes: formData.get('notes'),
      })
    }
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold">جلسة إرشادية جديدة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">الموضوع</label>
              <input
                name="topic"
                required
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">النوع</label>
              <select name="type" className="w-full rounded-lg border p-2 text-sm">
                <option value="individual">فردي</option>
                <option value="group">جماعي</option>
              </select>
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium">رقم الطالب (ID)</label>
                <input
                name="student_id"
                type="number"
                required
                className="w-full rounded-lg border p-2 text-sm"
                placeholder="أدخل رقم الطالب"
                />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الموعد</label>
              <input
                name="scheduled_at"
                type="datetime-local"
                required
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  function CreateRecommendationModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const createMutation = useMutation({
      mutationFn: createRecommendation,
      onSuccess: () => {
        toast({ type: 'success', title: 'تم إضافة التوصية' })
        queryClient.invalidateQueries({ queryKey: ['recommendations'] })
        onClose()
      },
    })
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      const formData = new FormData(e.target as HTMLFormElement)
      
      createMutation.mutate({
        student_id: formData.get('student_id'),
        content: formData.get('content'),
        type: formData.get('type'),
        due_date: formData.get('due_date'),
      })
    }
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold">توصية جديدة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium">رقم الطالب (ID)</label>
                <input
                name="student_id"
                type="number"
                required
                className="w-full rounded-lg border p-2 text-sm"
                placeholder="أدخل رقم الطالب"
                />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">نص التوصية</label>
              <textarea
                name="content"
                required
                rows={3}
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">النوع</label>
              <select name="type" className="w-full rounded-lg border p-2 text-sm">
                <option value="academic">أكاديمي</option>
                <option value="behavioral">سلوكي</option>
                <option value="social">اجتماعي</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">تاريخ الاستحقاق</label>
              <input
                name="due_date"
                type="date"
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

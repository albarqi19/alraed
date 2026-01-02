import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchPendingMatches, 
  linkTeacher, 
  linkSubject,
  createAndLinkTeacher,
  createAndLinkSubject,
  type UnmatchedTeacher,
  type UnmatchedSubject,
  type AvailableTeacher,
  type AvailableSubject,
} from '../api'
import { X, Check, Plus, AlertTriangle, User, BookOpen, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduleMatchingDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ScheduleMatchingDialog({ isOpen, onClose }: ScheduleMatchingDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects'>('teachers')
  const [selectedTeacher, setSelectedTeacher] = useState<UnmatchedTeacher | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<UnmatchedSubject | null>(null)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [showCreateTeacher, setShowCreateTeacher] = useState(false)
  const [showCreateSubject, setShowCreateSubject] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schedule-matching-pending'],
    queryFn: fetchPendingMatches,
    enabled: isOpen,
  })

  const linkTeacherMutation = useMutation({
    mutationFn: ({ chromeName, teacherId }: { chromeName: string; teacherId: number }) =>
      linkTeacher(chromeName, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedTeacher(null)
    },
  })

  const linkSubjectMutation = useMutation({
    mutationFn: ({ chromeName, subjectId }: { chromeName: string; subjectId: number }) =>
      linkSubject(chromeName, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedSubject(null)
    },
  })

  const createTeacherMutation = useMutation({
    mutationFn: ({ chromeName, name }: { chromeName: string; name: string }) =>
      createAndLinkTeacher(chromeName, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedTeacher(null)
      setNewTeacherName('')
      setShowCreateTeacher(false)
    },
  })

  const createSubjectMutation = useMutation({
    mutationFn: ({ chromeName, name }: { chromeName: string; name: string }) =>
      createAndLinkSubject(chromeName, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-matching-pending'] })
      setSelectedSubject(null)
      setNewSubjectName('')
      setShowCreateSubject(false)
    },
  })

  if (!isOpen) return null

  const unmatchedTeachers = data?.unmatched_teachers || []
  const unmatchedSubjects = data?.unmatched_subjects || []
  const availableTeachers = data?.available_teachers || []
  const availableSubjects = data?.available_subjects || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-l from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">المطابقة اليدوية</h2>
              <p className="text-sm text-slate-500">
                {data?.total_sessions_need_review || 0} حصة تحتاج مراجعة
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('teachers')}
            className={cn(
              'flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              activeTab === 'teachers'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <User className="w-4 h-4" />
            المعلمين ({unmatchedTeachers.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={cn(
              'flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2',
              activeTab === 'subjects'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <BookOpen className="w-4 h-4" />
            المواد ({unmatchedSubjects.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'teachers' ? (
            <TeachersTab
              unmatchedTeachers={unmatchedTeachers}
              availableTeachers={availableTeachers}
              selectedTeacher={selectedTeacher}
              onSelectTeacher={setSelectedTeacher}
              onLink={(chromeName, teacherId) => linkTeacherMutation.mutate({ chromeName, teacherId })}
              onCreate={(chromeName, name) => createTeacherMutation.mutate({ chromeName, name })}
              isLinking={linkTeacherMutation.isPending}
              isCreating={createTeacherMutation.isPending}
              showCreate={showCreateTeacher}
              setShowCreate={setShowCreateTeacher}
              newName={newTeacherName}
              setNewName={setNewTeacherName}
            />
          ) : (
            <SubjectsTab
              unmatchedSubjects={unmatchedSubjects}
              availableSubjects={availableSubjects}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              onLink={(chromeName, subjectId) => linkSubjectMutation.mutate({ chromeName, subjectId })}
              onCreate={(chromeName, name) => createSubjectMutation.mutate({ chromeName, name })}
              isLinking={linkSubjectMutation.isPending}
              isCreating={createSubjectMutation.isPending}
              showCreate={showCreateSubject}
              setShowCreate={setShowCreateSubject}
              newName={newSubjectName}
              setNewName={setNewSubjectName}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

interface TeachersTabProps {
  unmatchedTeachers: UnmatchedTeacher[]
  availableTeachers: AvailableTeacher[]
  selectedTeacher: UnmatchedTeacher | null
  onSelectTeacher: (t: UnmatchedTeacher | null) => void
  onLink: (chromeName: string, teacherId: number) => void
  onCreate: (chromeName: string, name: string) => void
  isLinking: boolean
  isCreating: boolean
  showCreate: boolean
  setShowCreate: (v: boolean) => void
  newName: string
  setNewName: (v: string) => void
}

function TeachersTab({
  unmatchedTeachers,
  availableTeachers,
  selectedTeacher,
  onSelectTeacher,
  onLink,
  onCreate,
  isLinking,
  isCreating,
  showCreate,
  setShowCreate,
  newName,
  setNewName,
}: TeachersTabProps) {
  if (unmatchedTeachers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
        <Check className="w-12 h-12 text-green-500 mb-3" />
        <p className="font-medium">جميع المعلمين متطابقين!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Unmatched Teachers from مدرستي */}
      <div className="w-1/2 border-l overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          من مدرستي (غير متطابقين)
        </h3>
        <div className="space-y-2">
          {unmatchedTeachers.map((teacher) => (
            <button
              key={teacher.chrome_name}
              onClick={() => onSelectTeacher(selectedTeacher?.chrome_name === teacher.chrome_name ? null : teacher)}
              className={cn(
                'w-full text-right p-3 rounded-lg border transition-all',
                selectedTeacher?.chrome_name === teacher.chrome_name
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <div className="font-medium text-slate-900">{teacher.chrome_name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {teacher.sessions_count} حصة
                {teacher.current_match && (
                  <span className="text-amber-600 mr-2">
                    • مرتبط حالياً بـ: {teacher.current_match.name}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Available Teachers in System */}
      <div className="w-1/2 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">اختر المعلم من النظام</h3>
        
        {selectedTeacher ? (
          <>
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                ربط <strong>{selectedTeacher.chrome_name}</strong> مع:
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {availableTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => onLink(selectedTeacher.chrome_name, teacher.id)}
                  disabled={isLinking}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">{teacher.name}</span>
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              ))}
            </div>

            <div className="border-t pt-4">
              {showCreate ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="اسم المعلم الجديد"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => onCreate(selectedTeacher.chrome_name, newName || selectedTeacher.chrome_name)}
                      disabled={isCreating}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إنشاء وربط
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewName(selectedTeacher.chrome_name)
                    setShowCreate(true)
                  }}
                  className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-green-500 text-slate-600 hover:text-green-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء معلم جديد
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">اختر معلماً من اليسار للبدء</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface SubjectsTabProps {
  unmatchedSubjects: UnmatchedSubject[]
  availableSubjects: AvailableSubject[]
  selectedSubject: UnmatchedSubject | null
  onSelectSubject: (s: UnmatchedSubject | null) => void
  onLink: (chromeName: string, subjectId: number) => void
  onCreate: (chromeName: string, name: string) => void
  isLinking: boolean
  isCreating: boolean
  showCreate: boolean
  setShowCreate: (v: boolean) => void
  newName: string
  setNewName: (v: string) => void
}

function SubjectsTab({
  unmatchedSubjects,
  availableSubjects,
  selectedSubject,
  onSelectSubject,
  onLink,
  onCreate,
  isLinking,
  isCreating,
  showCreate,
  setShowCreate,
  newName,
  setNewName,
}: SubjectsTabProps) {
  if (unmatchedSubjects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
        <Check className="w-12 h-12 text-green-500 mb-3" />
        <p className="font-medium">جميع المواد متطابقة!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Unmatched Subjects from مدرستي */}
      <div className="w-1/2 border-l overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          من مدرستي (غير متطابقة)
        </h3>
        <div className="space-y-2">
          {unmatchedSubjects.map((subject) => (
            <button
              key={subject.chrome_name}
              onClick={() => onSelectSubject(selectedSubject?.chrome_name === subject.chrome_name ? null : subject)}
              className={cn(
                'w-full text-right p-3 rounded-lg border transition-all',
                selectedSubject?.chrome_name === subject.chrome_name
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <div className="font-medium text-slate-900">{subject.chrome_name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {subject.sessions_count} حصة
                {subject.current_match && (
                  <span className="text-amber-600 mr-2">
                    • مرتبطة حالياً بـ: {subject.current_match.name}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Available Subjects in System */}
      <div className="w-1/2 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">اختر المادة من النظام</h3>
        
        {selectedSubject ? (
          <>
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700">
                ربط <strong>{selectedSubject.chrome_name}</strong> مع:
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {availableSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => onLink(selectedSubject.chrome_name, subject.id)}
                  disabled={isLinking}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">{subject.name}</span>
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              ))}
            </div>

            <div className="border-t pt-4">
              {showCreate ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="اسم المادة الجديدة"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => onCreate(selectedSubject.chrome_name, newName || selectedSubject.chrome_name)}
                      disabled={isCreating}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      إنشاء وربط
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewName(selectedSubject.chrome_name)
                    setShowCreate(true)
                  }}
                  className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-green-500 text-slate-600 hover:text-green-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إنشاء مادة جديدة
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">اختر مادة من اليسار للبدء</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduleMatchingDialog

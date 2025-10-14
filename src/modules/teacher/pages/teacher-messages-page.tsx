import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import { sendTeacherMessages } from '../api'
import clsx from 'classnames'

interface MessageTemplate {
  id: number
  template_key: string
  title: string
  icon: string
  content: string
  color: string
  is_active: boolean
  sort_order: number
}

interface MessageSettings {
  id: number
  is_enabled: boolean
  daily_limit_per_teacher: number
  allowed_start_hour: number
  allowed_end_hour: number
  school_name: string
  teacher_name: string
}

interface TeacherClass {
  id: number
  grade: string
  class_name: string
  subject_name: string
}

interface Student {
  id: number
  name: string
  parent_name: string
  parent_phone: string
}

export function TeacherMessagesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  
  // State management
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['teacher', 'message-templates'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/templates')
      return response.data
    },
  })

  // Fetch settings
  const { data: settingsData } = useQuery({
    queryKey: ['teacher', 'message-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/settings')
      return response.data
    },
  })

  // Fetch today's stats
  const { data: statsData } = useQuery({
    queryKey: ['teacher', 'message-stats-today'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/stats/today')
      return response.data
    },
  })

  const templates: MessageTemplate[] = templatesData?.templates || []
  const settings: MessageSettings = settingsData?.settings || {
    id: 1,
    is_enabled: true,
    daily_limit_per_teacher: 10,
    allowed_start_hour: 7,
    allowed_end_hour: 11,
    school_name: 'مدرسة النور الأهلية',
    teacher_name: 'المعلم',
  }
  const todayStats = statsData?.stats || { sent_today: 0, remaining: 10 }

  // Fetch teacher classes
  const { data: classesData } = useQuery({
    queryKey: ['teacher', 'message-classes'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/classes')
      return response.data
    },
  })

  // Fetch students for selected class
  const { data: studentsData } = useQuery({
    queryKey: ['teacher', 'class-students', selectedClass?.id],
    queryFn: async () => {
      if (!selectedClass) return { students: [] }
      const response = await apiClient.get(`/teacher/messages/classes/${selectedClass.id}/students`)
      return response.data
    },
    enabled: !!selectedClass,
  })

  const teacherClasses: TeacherClass[] = classesData?.classes || []
  const students: Student[] = studentsData?.students || []

  // التحقق من وقت الإرسال
  const checkSendingTime = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay() // 0 = الأحد، 6 = السبت
    
    // التحقق من يوم الدوام (الأحد إلى الخميس)
    const isWorkDay = day >= 0 && day <= 4
    
    // التحقق من الوقت (من الإعدادات)
    const isAllowedTime = hour >= settings.allowed_start_hour && hour < settings.allowed_end_hour
    
    return {
      allowed: isWorkDay && isAllowedTime && settings.is_enabled,
      reason: !settings.is_enabled
        ? 'تم إيقاف نظام الرسائل من قبل الإدارة'
        : !isWorkDay 
        ? 'لا يمكن إرسال الرسائل في أيام العطلة (الجمعة والسبت)'
        : !isAllowedTime 
        ? `يمكن إرسال الرسائل فقط من الساعة ${settings.allowed_start_hour} صباحاً إلى ${settings.allowed_end_hour} صباحاً`
        : ''
    }
  }, [settings])

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
  }

  const handleSendMessages = async () => {
    if (!checkSendingTime.allowed) {
      if (checkSendingTime.reason) {
        toast({ type: 'warning', title: checkSendingTime.reason })
      }
      return
    }

    if (!selectedClass || !selectedTemplate || selectedStudents.length === 0) {
      toast({ type: 'warning', title: 'يرجى اختيار الفصل والطلاب والقالب قبل الإرسال' })
      return
    }

    setIsSending(true)

    try {
      const template = templates.find(t => t.id === selectedTemplate)
      if (!template) {
        toast({ type: 'error', title: 'القالب المختار غير موجود' })
        setIsSending(false)
        return
      }

      const result = await sendTeacherMessages({
        class_id: selectedClass.id,
        template_id: template.template_key,
        student_ids: selectedStudents,
      })

      toast({
        type: 'success',
        title: 'تم إرسال الرسائل',
        description:
          result.failedCount > 0
            ? `أُرسلت ${result.sentCount.toLocaleString('ar-SA')} رسائل، وتعذر إرسال ${result.failedCount.toLocaleString('ar-SA')}.`
            : `تم إرسال ${result.sentCount.toLocaleString('ar-SA')} رسالة بنجاح.`,
      })

      await queryClient.invalidateQueries({ queryKey: ['teacher', 'message-stats-today'] })

      setShowPreview(false)
      setSelectedClass(null)
      setSelectedStudents([])
      setSelectedTemplate(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر إرسال الرسائل حالياً، يرجى المحاولة لاحقاً.'
      toast({ type: 'error', title: message })
    } finally {
      setIsSending(false)
    }
  }

  const canPreview = selectedClass && selectedStudents.length > 0 && selectedTemplate

  return (
    <>
      {/* Modal للمعاينة */}
      {showPreview && selectedTemplateData && selectedClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6 text-right">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-2xl text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
                <h2 className="text-2xl font-bold text-slate-900">معاينة الرسالة</h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">{selectedTemplateData.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedTemplateData.title}</h3>
                </div>

                {/* محتوى الرسالة بالتنسيق المطلوب */}
                <div className="rounded-xl bg-white p-5 text-right space-y-3 border-2 border-slate-300">
                  <p className="text-base leading-relaxed text-slate-900">
                    <span className="font-bold text-teal-700">رسالة من المعلم:</span>{' '}
                    <span className="font-semibold">{settings.teacher_name}</span>
                  </p>

                  <p className="text-base leading-relaxed text-slate-900">
                    <span className="font-bold text-teal-700">ولي أمر الطالب:</span>{' '}
                    <span className="font-semibold">
                      {students.find(s => s.id === selectedStudents[0])?.name || 'اسم الطالب'}
                    </span>
                  </p>

                  <p className="text-base leading-relaxed text-slate-800 pt-2">
                    {selectedTemplateData.content}
                  </p>

                  <p className="text-base leading-relaxed text-slate-900 pt-3">
                    <span className="font-bold text-teal-700">المادة:</span>{' '}
                    <span className="font-semibold">{selectedClass.subject_name}</span>
                  </p>

                  <div className="border-t-2 border-slate-200 pt-3 mt-3">
                    <p className="text-sm text-slate-600 text-center">{settings.school_name}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800 text-center">
                  سيتم إرسال هذه الرسالة إلى <span className="font-bold">{selectedStudents.length}</span> ولي أمر
                </p>
              </div>

              {!checkSendingTime.allowed && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                  <p className="text-sm text-rose-800 text-center font-semibold">
                    ⏰ {checkSendingTime.reason}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="button-secondary flex-1"
                  disabled={isSending}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendMessages}
                  disabled={!checkSendingTime.allowed || isSending}
                  className="button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'جاري الإرسال...' : 'إرسال الرسائل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الصفحة الرئيسية */}
      <section className="space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4 text-right">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <i className="bi bi-arrow-right text-xl" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">إرسال رسائل لأولياء الأمور</h1>
            <p className="text-sm text-muted">تواصل مع أولياء أمور طلابك بسهولة</p>
          </div>
        </header>

        {/* بطاقة حالة النظام والإحصائيات */}
        <div className="glass-card">
          <div className="space-y-4">
            {/* السطر الأول: النظام مفعل + رسائل اليوم */}
            <div className="grid gap-4 grid-cols-2">
              {/* حالة النظام */}
              <div className={clsx(
                'rounded-xl border-2 p-4 text-center',
                settings.is_enabled 
                  ? 'border-emerald-300 bg-emerald-50' 
                  : 'border-rose-300 bg-rose-50'
              )}>
                <div className="text-3xl mb-2">{settings.is_enabled ? '✅' : '🚫'}</div>
                <p className="text-sm font-semibold text-slate-900">
                  {settings.is_enabled ? 'النظام مفعّل' : 'النظام معطّل'}
                </p>
                <p className="text-xs text-muted mt-1">
                  {settings.is_enabled ? 'يمكنك إرسال الرسائل' : 'تم الإيقاف من الإدارة'}
                </p>
              </div>

              {/* الرسائل المرسلة اليوم */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{todayStats.sent_today}</div>
                <p className="text-sm font-semibold text-slate-900 mt-2">رسائل اليوم</p>
                <p className="text-xs text-muted mt-1">تم الإرسال</p>
              </div>
            </div>

            {/* السطر الثاني: الرسائل المتبقية */}
            <div className={clsx(
              'rounded-xl border-2 p-4 text-center',
              todayStats.remaining > 0 ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50'
            )}>
              <div className={clsx(
                'text-3xl font-bold',
                todayStats.remaining > 0 ? 'text-teal-600' : 'text-amber-600'
              )}>
                {todayStats.remaining}
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-2">رسائل متبقية</p>
              <p className="text-xs text-muted mt-1">
                من أصل {settings.daily_limit_per_teacher} يومياً
              </p>
            </div>
          </div>
        </div>

        {/* تنبيه الوقت أو حالة النظام */}
        {!checkSendingTime.allowed && (
          <div className={clsx(
            'rounded-2xl border p-4 text-right',
            !settings.is_enabled 
              ? 'bg-rose-50 border-rose-200'
              : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{!settings.is_enabled ? '🚫' : '⏰'}</span>
              <div>
                <p className={clsx(
                  'font-semibold',
                  !settings.is_enabled ? 'text-rose-800' : 'text-amber-800'
                )}>
                  {checkSendingTime.reason}
                </p>
                {settings.is_enabled && (
                  <p className="text-sm text-amber-700 mt-1">
                    يمكنك تجهيز الرسالة الآن وإرسالها في الوقت المحدد.
                  </p>
                )}
                {!settings.is_enabled && (
                  <p className="text-sm text-rose-700 mt-1">
                    يرجى التواصل مع الإدارة لمعرفة سبب الإيقاف.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* اختيار الفصل */}
        <div className="glass-card space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 text-right">1. اختر الفصل</h2>
          
          {teacherClasses.length === 0 ? (
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-8 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-600 font-semibold">لا توجد فصول مسندة لك حالياً</p>
              <p className="text-sm text-muted mt-2">يرجى التواصل مع الإدارة</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teacherClasses.map((classItem) => (
                <button
                  key={classItem.id}
                  type="button"
                  onClick={() => {
                    setSelectedClass(classItem)
                    setSelectedStudents([])
                  }}
                  className={clsx(
                    'rounded-2xl border-2 p-4 text-right transition hover:border-teal-300',
                    selectedClass?.id === classItem.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 bg-white'
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      {classItem.grade} - {classItem.class_name}
                    </p>
                    <p className="text-sm text-muted">{classItem.subject_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* اختيار الطلاب */}
        {selectedClass && (
          <div className="glass-card space-y-4">
            <div className="flex items-center justify-between">
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  {selectedStudents.length === students.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              )}
              <h2 className="text-xl font-semibold text-slate-900">2. اختر الطلاب</h2>
            </div>
            
            {students.length === 0 ? (
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-8 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-slate-600 font-semibold">لا يوجد طلاب في هذا الفصل</p>
                <p className="text-sm text-muted mt-2">يرجى التواصل مع الإدارة</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className={clsx(
                      'rounded-2xl border-2 p-4 text-right transition cursor-pointer hover:border-teal-300',
                      selectedStudents.includes(student.id)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{student.name}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {students.length > 0 && selectedStudents.length > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-sm text-emerald-800">
                  تم تحديد <span className="font-bold">{selectedStudents.length}</span> من{' '}
                  {students.length} طالب
                </p>
              </div>
            )}
          </div>
        )}

        {/* اختيار نوع الرسالة */}
        {selectedStudents.length > 0 && (
          <div className="glass-card space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 text-right">3. اختر نوع الرسالة</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.filter(t => t.is_active).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={clsx(
                    'rounded-2xl border-2 p-6 text-center transition hover:scale-105',
                    selectedTemplate === template.id
                      ? 'border-2 border-teal-300 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="space-y-3">
                    <div className="text-4xl">{template.icon}</div>
                    <p className="font-bold text-slate-900">{template.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{template.content}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* زر المعاينة والإرسال */}
        {canPreview && (
          <div className="glass-card">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="button-primary w-full py-4 text-lg"
            >
              معاينة الرسالة وإرسالها
            </button>
          </div>
        )}
      </section>
    </>
  )
}

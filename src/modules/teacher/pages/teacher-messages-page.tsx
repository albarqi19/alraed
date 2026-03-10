import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api/client'
import { useToast } from '@/shared/feedback/use-toast'
import { sendTeacherMessages } from '../api'
import clsx from 'classnames'
import { HolidayBanner } from '@/shared/components/holiday-banner'
import { useCanSendMessages } from '@/hooks/use-academic-calendar'

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
  allow_custom_messages: boolean
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
  const [customMessage, setCustomMessage] = useState('')
  const [useCustomMessage, setUseCustomMessage] = useState(false)
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)

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
    allow_custom_messages: false,
  }
  const todayStats = statsData?.stats || { sent_today: 0, remaining: 10 }

  // Fetch unread replies count
  const { data: repliesData } = useQuery({
    queryKey: ['teacher', 'message-replies'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/replies')
      return response.data
    },
  })
  const unreadRepliesCount = repliesData?.unread_count || 0

  // Fetch teacher classes
  const { data: classesData } = useQuery({
    queryKey: ['teacher', 'message-classes'],
    queryFn: async () => {
      const response = await apiClient.get('/teacher/messages/classes')
      return response.data
    },
  })

  // Fetch students for selected class
  const {
    data: studentsData,
    isFetching: isFetchingStudents,
    isLoading: isLoadingStudents,
  } = useQuery({
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

  const studentsCardRef = useRef<HTMLDivElement | null>(null)
  const [highlightStudentsCard, setHighlightStudentsCard] = useState(false)
  const [studentsHint, setStudentsHint] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedClass) {
      setStudentsHint(null)
      setHighlightStudentsCard(false)
      return
    }

    if (isLoadingStudents || isFetchingStudents) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    const target = studentsCardRef.current
    if (!target) {
      return
    }

    window.requestAnimationFrame(() => {
      const offset = 120
      const top = target.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' })
    })

    setHighlightStudentsCard(true)
    setStudentsHint('تم فتح قائمة الطلاب في الأسفل، يمكنك المتابعة بالاختيار.')

    const highlightTimer = window.setTimeout(() => setHighlightStudentsCard(false), 1600)
    const hintTimer = window.setTimeout(() => setStudentsHint(null), 5000)

    return () => {
      window.clearTimeout(highlightTimer)
      window.clearTimeout(hintTimer)
    }
  }, [isFetchingStudents, isLoadingStudents, selectedClass])

  const messageTypeSectionRef = useRef<HTMLDivElement | null>(null)
  const previewSectionRef = useRef<HTMLDivElement | null>(null)
  const [highlightMessageSection, setHighlightMessageSection] = useState(false)
  const [messageHint, setMessageHint] = useState<string | null>(null)
  const [highlightPreviewSection, setHighlightPreviewSection] = useState(false)
  const [previewHint, setPreviewHint] = useState<string | null>(null)

  const messageHighlightTimerRef = useRef<number | null>(null)
  const messageHintTimerRef = useRef<number | null>(null)
  const previewHighlightTimerRef = useRef<number | null>(null)
  const previewHintTimerRef = useRef<number | null>(null)
  const previewScrollTimerRef = useRef<number | null>(null)

  const scrollToElement = useCallback((element: HTMLElement | null) => {
    if (!element || typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      const offset = 120
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: top > 0 ? top : 0, behavior: 'smooth' })
    })
  }, [])

  const triggerHighlight = useCallback((setHighlight: (value: boolean) => void, timerRef: MutableRefObject<number | null>) => {
    setHighlight(true)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      setHighlight(false)
      timerRef.current = null
    }, 1600)
  }, [])

  const triggerHint = useCallback(
    (setHint: (value: string | null) => void, message: string, timerRef: MutableRefObject<number | null>) => {
      setHint(message)
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        setHint(null)
        timerRef.current = null
      }, 5000)
    },
    [],
  )

  const handleGoToTemplates = useCallback(() => {
    if (!selectedStudents.length) {
      return
    }
    scrollToElement(messageTypeSectionRef.current)
    triggerHighlight(setHighlightMessageSection, messageHighlightTimerRef)
    triggerHint(setMessageHint, 'اختر نوع الرسالة لإكمال الخطوات.', messageHintTimerRef)
  }, [messageHighlightTimerRef, messageHintTimerRef, scrollToElement, selectedStudents.length, triggerHighlight, triggerHint])

  const handleTemplateSelect = useCallback(
    (templateId: number) => {
      setSelectedTemplate(templateId)

      if (previewScrollTimerRef.current) {
        window.clearTimeout(previewScrollTimerRef.current)
      }

      previewScrollTimerRef.current = window.setTimeout(() => {
        scrollToElement(previewSectionRef.current)
        triggerHighlight(setHighlightPreviewSection, previewHighlightTimerRef)
        triggerHint(setPreviewHint, 'يمكنك الآن معاينة الرسالة وإرسالها من القسم التالي.', previewHintTimerRef)
        previewScrollTimerRef.current = null
      }, 100)
    },
    [previewHighlightTimerRef, previewHintTimerRef, previewScrollTimerRef, scrollToElement, triggerHighlight, triggerHint],
  )

  useEffect(() => {
    return () => {
      if (messageHighlightTimerRef.current) {
        window.clearTimeout(messageHighlightTimerRef.current)
      }
      if (messageHintTimerRef.current) {
        window.clearTimeout(messageHintTimerRef.current)
      }
      if (previewHighlightTimerRef.current) {
        window.clearTimeout(previewHighlightTimerRef.current)
      }
      if (previewHintTimerRef.current) {
        window.clearTimeout(previewHintTimerRef.current)
      }
      if (previewScrollTimerRef.current) {
        window.clearTimeout(previewScrollTimerRef.current)
      }
    }
  }, [])

  // التحقق من حالة الإجازة الأكاديمية
  const { data: canSendMessagesData } = useCanSendMessages()

  // التحقق من وقت الإرسال (مع دمج حالة الإجازة الأكاديمية)
  const checkSendingTime = useMemo(() => {
    // أولاً: التحقق من الإجازة الأكاديمية
    if (canSendMessagesData && !canSendMessagesData.can_send) {
      return {
        allowed: false,
        reason: canSendMessagesData.message || 'لا يمكن إرسال الرسائل خلال الإجازة الأكاديمية',
        isAcademicHoliday: true,
      }
    }

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
            : '',
      isAcademicHoliday: false,
    }
  }, [settings, canSendMessagesData])

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

    const hasValidMessage = selectedTemplate || (useCustomMessage && customMessage.length >= 10)
    if (!selectedClass || !hasValidMessage || selectedStudents.length === 0) {
      toast({ type: 'warning', title: 'يرجى اختيار الفصل والطلاب ونوع الرسالة قبل الإرسال' })
      return
    }

    setIsSending(true)

    try {
      let result

      if (useCustomMessage) {
        result = await sendTeacherMessages({
          class_id: selectedClass.id,
          student_ids: selectedStudents,
          custom_message: customMessage,
        })
      } else {
        const template = templates.find(t => t.id === selectedTemplate)
        if (!template) {
          toast({ type: 'error', title: 'القالب المختار غير موجود' })
          setIsSending(false)
          return
        }

        result = await sendTeacherMessages({
          class_id: selectedClass.id,
          template_key: template.template_key,
          student_ids: selectedStudents,
        })
      }

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
      setCustomMessage('')
      setUseCustomMessage(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذر إرسال الرسائل حالياً، يرجى المحاولة لاحقاً.'
      toast({ type: 'error', title: message })
    } finally {
      setIsSending(false)
    }
  }

  const canPreview = selectedClass && selectedStudents.length > 0 &&
    (selectedTemplate || (useCustomMessage && customMessage.length >= 10))

  return (
    <>
      {/* Modal للمعاينة */}
      {showPreview && (selectedTemplateData || useCustomMessage) && selectedClass && (
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
                  <div className="text-4xl mb-2">{useCustomMessage ? '✍️' : selectedTemplateData?.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {useCustomMessage ? 'رسالة مخصصة' : selectedTemplateData?.title}
                  </h3>
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
                    {useCustomMessage ? customMessage : selectedTemplateData?.content}
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
        {/* Holiday Banner - عرض بانر الإجازة */}
        <HolidayBanner />

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
            <h1 className="text-3xl font-bold text-slate-900">الرسائل</h1>
            <p className="text-sm text-muted">تواصل مع أولياء الأمور</p>
          </div>
          {/* زر الردود */}
          <button
            type="button"
            onClick={() => navigate('/teacher/messages/replies')}
            className="relative rounded-xl border-2 border-teal-200 bg-teal-50 px-4 py-2 text-teal-700 font-semibold hover:bg-teal-100 transition flex items-center gap-2"
          >
            <i className="bi bi-reply-all text-lg" />
            <span>الردود</span>
            {unreadRepliesCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] flex items-center justify-center bg-rose-500 text-white text-xs font-bold rounded-full px-1 animate-pulse">
                {unreadRepliesCount > 99 ? '99+' : unreadRepliesCount}
              </span>
            )}
          </button>
        </header>

        {/* Compact Stats Row */}
        <div className="flex divide-x divide-x-reverse divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 mt-2">
          <div className={clsx("flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50 rounded-r-2xl", !settings.is_enabled && "bg-rose-50/50 opacity-90")}>
            <p className="text-2xl mb-1">{settings.is_enabled ? '✅' : '🚫'}</p>
            <p className="text-[10px] font-bold text-slate-700 sm:text-xs">{settings.is_enabled ? 'النظام مفعّل' : 'حساب معطّل'}</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50">
            <p className="text-2xl font-bold text-blue-600">{todayStats.sent_today}</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-500 sm:text-xs">رسائل اليوم</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-4 px-2 transition-all hover:bg-slate-50/50 rounded-l-2xl">
            <p className={clsx("text-2xl font-bold", todayStats.remaining > 0 ? 'text-teal-600' : 'text-amber-600')}>{todayStats.remaining}</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-500 sm:text-xs">رصيد متبقي</p>
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClassDropdownOpen(true)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-2xl border-2 bg-white px-5 py-4 text-right shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/10",
                  isClassDropdownOpen ? "border-teal-500" : "border-slate-200 hover:border-teal-300"
                )}
              >
                {selectedClass ? (
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-base font-bold text-slate-900">
                      {selectedClass.grade} - {selectedClass.class_name}
                    </span>
                    <span className="text-xs font-semibold text-teal-600 rounded-md bg-teal-50 px-2 py-0.5 border border-teal-100">
                      {selectedClass.subject_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-base font-bold text-slate-500">-- الرجاء اختيار الفصل --</span>
                )}
                <i className={clsx("bi bi-chevron-down text-lg text-slate-400 transition-transform duration-300", isClassDropdownOpen && "rotate-180")}></i>
              </button>

              {isClassDropdownOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div
                    className="absolute inset-0"
                    onClick={() => setIsClassDropdownOpen(false)}
                  />
                  <div className="relative w-full max-w-sm max-h-[70vh] flex flex-col rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="border-b border-slate-100 p-4 shrink-0 text-center">
                      <h3 className="font-bold text-slate-900">اختر الفصل</h3>
                    </div>
                    <div className="p-2 overflow-y-auto overscroll-contain">
                      {teacherClasses.map((classItem) => (
                        <button
                          key={classItem.id}
                          type="button"
                          onClick={() => {
                            setSelectedClass(classItem);
                            setSelectedStudents([]);
                            setIsClassDropdownOpen(false);
                          }}
                          className={clsx(
                            "flex w-full flex-col items-start rounded-xl px-4 py-3 text-right transition-colors active:bg-slate-100",
                            selectedClass?.id === classItem.id ? "bg-teal-50" : ""
                          )}
                        >
                          <span className={clsx("font-bold", selectedClass?.id === classItem.id ? "text-teal-900" : "text-slate-900")}>
                            {classItem.grade} - {classItem.class_name}
                          </span>
                          <span className={clsx("text-xs font-semibold mt-1", selectedClass?.id === classItem.id ? "text-teal-600" : "text-slate-500")}>
                            {classItem.subject_name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 shrink-0">
                      <button
                        onClick={() => setIsClassDropdownOpen(false)}
                        className="w-full rounded-xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {studentsHint ? (
            <p className="rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-2 text-xs font-semibold text-teal-700 text-right">
              {studentsHint}
            </p>
          ) : null}
        </div>

        {/* اختيار الطلاب */}
        {selectedClass && (
          <div
            ref={studentsCardRef}
            className={clsx(
              'glass-card space-y-4 scroll-mt-32 transition-shadow duration-500 pb-20 sm:pb-6',
              highlightStudentsCard && 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white shadow-lg',
            )}
          >
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
                      'rounded-xl border-2 py-2.5 px-3 text-right transition cursor-pointer hover:border-teal-300',
                      selectedStudents.includes(student.id)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {students.length > 0 && selectedStudents.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <p className="text-sm text-emerald-800">
                    تم تحديد <span className="font-bold">{selectedStudents.length}</span> من{' '}
                    {students.length} طالب
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoToTemplates}
                  className="button-primary hidden w-full py-3 text-sm font-semibold sm:block"
                >
                  التالي - اختيار نوع الرسالة
                </button>
              </div>
            ) : null}
          </div>
        )}

        {selectedClass && selectedStudents.length > 0 && !selectedTemplate && !messageHint ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:hidden">
            <button
              type="button"
              onClick={handleGoToTemplates}
              className="pointer-events-auto inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-teal-900/20 transition-all hover:bg-teal-700 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              التالي - اختيار نوع الرسالة
            </button>
          </div>
        ) : null}

        {/* اختيار نوع الرسالة */}
        {selectedStudents.length > 0 && (
          <div
            ref={messageTypeSectionRef}
            className={clsx(
              'glass-card space-y-4 scroll-mt-32 transition-shadow duration-500',
              highlightMessageSection && 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white shadow-lg',
            )}
          >
            <h2 className="text-xl font-semibold text-slate-900 text-right">3. اختر نوع الرسالة</h2>
            {messageHint ? (
              <p className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-2 text-xs font-semibold text-teal-700 text-right">
                {messageHint}
              </p>
            ) : null}

            {/* Toggle بين القوالب والرسالة المخصصة */}
            {settings.allow_custom_messages && (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomMessage(false)
                    setCustomMessage('')
                  }}
                  className={clsx(
                    'rounded-xl px-6 py-3 font-semibold transition',
                    !useCustomMessage
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  استخدام قالب جاهز
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomMessage(true)
                    setSelectedTemplate(null)
                  }}
                  className={clsx(
                    'rounded-xl px-6 py-3 font-semibold transition',
                    useCustomMessage
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  كتابة رسالة مخصصة
                </button>
              </div>
            )}

            {/* عرض القوالب أو حقل الرسالة المخصصة */}
            {useCustomMessage ? (
              <div className="space-y-4">
                <label className="block text-right">
                  <span className="text-lg font-semibold text-slate-900">اكتب رسالتك</span>
                  <span className="text-sm text-muted block mt-1">
                    (10-500 حرف)
                  </span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={5}
                  maxLength={500}
                  className="w-full rounded-xl border-2 border-slate-200 p-4 text-right focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                  dir="rtl"
                />
                <div className="flex justify-between text-sm text-muted">
                  <span className={customMessage.length < 10 ? 'text-amber-600' : 'text-emerald-600'}>
                    {customMessage.length < 10 ? `أدخل ${10 - customMessage.length} أحرف إضافية على الأقل` : 'جاهز للإرسال'}
                  </span>
                  <span>{customMessage.length}/500</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.filter(t => t.is_active).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
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
            )}
          </div>
        )}

        {/* زر المعاينة والإرسال */}
        {canPreview && (
          <div
            ref={previewSectionRef}
            className={clsx(
              'glass-card space-y-3 scroll-mt-32 transition-shadow duration-500',
              highlightPreviewSection && 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white shadow-lg',
            )}
          >
            {previewHint ? (
              <p className="rounded-2xl border border-teal-100 bg-teal-50/60 px-4 py-2 text-xs font-semibold text-teal-700 text-right">
                {previewHint}
              </p>
            ) : null}
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

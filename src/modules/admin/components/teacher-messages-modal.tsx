import { useState } from 'react'
import { X, User, MessageSquare, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { TeacherMessagesData } from '../api'

interface TeacherMessagesModalProps {
  isOpen: boolean
  onClose: () => void
  data: {
    period: string
    total_messages: number
    total_teachers: number
    teachers: TeacherMessagesData[]
  } | null
  title: string
}

export function TeacherMessagesModal({ isOpen, onClose, data, title }: TeacherMessagesModalProps) {
  const [expandedTeachers, setExpandedTeachers] = useState<Set<number>>(new Set())

  if (!isOpen || !data) return null

  const toggleTeacher = (teacherId: number) => {
    const newExpanded = new Set(expandedTeachers)
    if (newExpanded.has(teacherId)) {
      newExpanded.delete(teacherId)
    } else {
      newExpanded.add(teacherId)
    }
    setExpandedTeachers(newExpanded)
  }

  const periodLabels: Record<string, string> = {
    today: 'اليوم',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    active: 'المعلمين النشطين (آخر 30 يوم)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-br from-teal-50 to-blue-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-600 transition hover:bg-white/80 hover:text-slate-900"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              <p className="text-sm text-muted">{periodLabels[data.period] || data.period}</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <div className="text-3xl font-bold text-teal-600">{data.total_teachers}</div>
              <p className="mt-1 text-sm font-semibold text-slate-700">معلم</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <div className="text-3xl font-bold text-blue-600">{data.total_messages}</div>
              <p className="mt-1 text-sm font-semibold text-slate-700">رسالة</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {data.teachers.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-slate-300" />
              <p className="mt-4 text-lg font-semibold text-slate-600">لا توجد رسائل في هذه الفترة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.teachers.map((teacher) => {
                const isExpanded = expandedTeachers.has(teacher.teacher_id)
                
                return (
                  <div
                    key={teacher.teacher_id}
                    className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md"
                  >
                    {/* Teacher Header - Clickable */}
                    <button
                      type="button"
                      onClick={() => toggleTeacher(teacher.teacher_id)}
                      className="w-full px-6 py-4 text-right transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronUp className="h-6 w-6 text-teal-600 transition-transform" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-slate-400 transition-transform" />
                          )}
                          <div className="rounded-full bg-teal-100 p-2">
                            <User className="h-5 w-5 text-teal-600" />
                          </div>
                        </div>

                        <div className="flex flex-1 items-center justify-between gap-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-100 px-4 py-1.5">
                              <p className="text-sm font-bold text-blue-700">{teacher.total_messages} رسالة</p>
                            </div>
                            {teacher.teacher_national_id && (
                              <p className="text-xs text-muted">#{teacher.teacher_national_id}</p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <h3 className="text-lg font-bold text-slate-900">{teacher.teacher_name}</h3>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Messages List - Collapsible */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-4 animate-in slide-in-from-top duration-300">
                        <div className="space-y-3">
                          {teacher.messages.map((message) => (
                            <div
                              key={message.id}
                              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        message.status === 'sent'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : message.status === 'failed'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {message.status === 'sent'
                                        ? '✓ تم الإرسال'
                                        : message.status === 'failed'
                                          ? '✕ فشل'
                                          : '⏳ قيد الإرسال'}
                                    </span>
                                    <h4 className="text-lg font-bold text-slate-900">{message.student_name}</h4>
                                  </div>
                                  {message.student_grade && (
                                    <p className="mt-1 text-sm text-muted">الصف: {message.student_grade}</p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-muted">
                                    <Clock className="h-4 w-4" />
                                    <span>{message.sent_at_human}</span>
                                  </div>
                                  <span className="rounded-md bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
                                    {message.template_title}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-700">{message.message_content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="button-primary w-full"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

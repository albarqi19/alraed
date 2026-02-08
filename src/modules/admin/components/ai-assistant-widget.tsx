import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Bot, Check, AlertCircle, RotateCcw } from 'lucide-react'
import { useAuthStore, selectUser } from '@/modules/auth/store/auth-store'
import { sendAssistantChat, executeAssistantAction } from '../behavior/api'
import type { AssistantAction } from '../behavior/api'
import type { UserRole } from '@/modules/auth/types'

// ==================== Types ====================

interface ActionState {
  status: 'idle' | 'confirming' | 'executing' | 'success' | 'error'
  message?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: AssistantAction[]
  actionResults?: Record<string, ActionState>
}

// ==================== Bubble Texts ====================

const BUBBLE_TEXTS = [
  'ودك تدردش معي؟',
  'عندي أفكار تساعدك!',
  'خلني أساعدك اليوم',
  'اسألني أي شيء',
  'حاضر لخدمتك!',
]

// ==================== Role Config ====================

interface RoleConfig {
  greeting: string
  subtitle: string
  suggestions: string[]
}

function getRoleConfig(role: UserRole, firstName: string): RoleConfig {
  const configs: Partial<Record<UserRole, RoleConfig>> = {
    school_principal: {
      greeting: `أهلاً ${firstName}! أنا رائد، مساعدك الذكي. أقدر أساعدك بنظرة شاملة على المدرسة واتخاذ القرارات.`,
      subtitle: 'مساعد مدير المدرسة',
      suggestions: [
        'كيف حال المدرسة اليوم؟',
        'الطلاب الأكثر احتياجاً للتدخل',
        'مقارنة الحضور هذا الأسبوع',
        'توصيات لتحسين الأداء',
      ],
    },
    deputy_teachers: {
      greeting: `أهلاً ${firstName}! أنا رائد، مساعدك في شؤون المعلمين. أقدر أساعدك في المتابعة والتحليل.`,
      subtitle: 'مساعد وكيل المعلمين',
      suggestions: [
        'ملخص حضور المعلمين اليوم',
        'المعلمون المتأخرون هذا الأسبوع',
        'حالة مزاج المعلمين',
        'توصيات لدعم المعلمين',
      ],
    },
    deputy_students: {
      greeting: `أهلاً ${firstName}! أنا رائد، مساعدك في شؤون الطلاب. أقدر أساعدك في تحليل السلوك والتدخلات.`,
      subtitle: 'مساعد وكيل الطلاب',
      suggestions: [
        'ملخص الحالة السلوكية اليوم',
        'طلاب يحتاجون تدخل عاجل',
        'تحليل الغياب هذا الأسبوع',
        'فعالية الخطط العلاجية',
      ],
    },
    student_counselor: {
      greeting: `أهلاً ${firstName}! أنا رائد، مساعدك في التوجيه. أقدر أساعدك في تحليل الحالات والتوصيات.`,
      subtitle: 'مساعد الموجه الطلابي',
      suggestions: [
        'أولويات حالاتي اليوم',
        'طلاب في خطر',
        'ملخص أسبوعي لنشاطي',
        'اقتراح خطة علاجية',
      ],
    },
  }

  return configs[role] ?? {
    greeting: `أهلاً ${firstName}! أنا رائد، المساعد الذكي. كيف أقدر أساعدك اليوم؟`,
    subtitle: 'المساعد الذكي',
    suggestions: [
      'ملخص الحالة العامة',
      'الطلاب الأكثر احتياجاً',
      'تحليل الحضور',
      'توصيات عامة',
    ],
  }
}

// ==================== Markdown Renderer ====================

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function MiniMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (!trimmed) { elements.push(<div key={i} className="h-1.5" />); i++; continue }

    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="my-2 border-slate-200" />); i++; continue
    }

    if (trimmed.startsWith('#')) {
      const cleanLine = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      elements.push(
        <h4 key={i} className="mt-2 mb-1 text-xs font-bold text-slate-800">{cleanLine}</h4>,
      )
      i++; continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)?.[1]
      const text = trimmed.replace(/^\d+\.\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
          <span className="mt-0.5 shrink-0 font-bold text-teal-600">{num}.</span>
          <span>{renderInlineMarkdown(text)}</span>
        </div>,
      )
      i++; continue
    }

    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const text = trimmed.replace(/^[-*]\s*/, '')
      elements.push(
        <div key={i} className="flex items-start gap-1.5 pr-1 text-xs text-slate-700">
          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          <span>{renderInlineMarkdown(text)}</span>
        </div>,
      )
      i++; continue
    }

    elements.push(
      <p key={i} className="text-xs leading-relaxed text-slate-700">{renderInlineMarkdown(trimmed)}</p>,
    )
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

// ==================== Rotating Bubble Text ====================

function RotatingBubbleText({ firstName }: { firstName: string }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev >= BUBBLE_TEXTS.length - 1) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'

  return (
    <div className="space-y-0.5">
      <p className="text-[13px] font-semibold text-slate-800">{greeting} {firstName}!</p>
      <div className="h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="text-xs text-slate-500"
          >
            {BUBBLE_TEXTS[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ==================== Action Button ====================

const variantStyles: Record<string, { bg: string; hover: string; text: string; border: string }> = {
  success: { bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  danger: { bg: 'bg-red-50', hover: 'hover:bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
}

function ActionButton({
  action,
  state,
  onExecute,
  onConfirm,
  onCancel,
}: {
  action: AssistantAction
  state: ActionState
  onExecute: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const style = variantStyles[action.variant] ?? variantStyles.info

  if (state.status === 'success') {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
        <Check className="h-3 w-3 text-emerald-600" />
        <span className="text-[11px] text-emerald-700">{state.message || 'تم التنفيذ'}</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
          <AlertCircle className="h-3 w-3 text-red-600" />
          <span className="text-[11px] text-red-700">{state.message || 'فشل التنفيذ'}</span>
        </div>
        <button
          type="button"
          onClick={onExecute}
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (state.status === 'executing') {
    return (
      <div className={`flex items-center gap-1.5 rounded-lg border ${style.border} ${style.bg} px-2.5 py-1.5`}>
        <Loader2 className={`h-3 w-3 animate-spin ${style.text}`} />
        <span className={`text-[11px] ${style.text}`}>جاري التنفيذ...</span>
      </div>
    )
  }

  if (state.status === 'confirming') {
    return (
      <div className={`space-y-1.5 rounded-lg border ${style.border} ${style.bg} p-2`}>
        <p className={`text-[11px] font-medium ${style.text}`}>{action.label}</p>
        {action.description && (
          <p className="text-[10px] text-slate-500">{action.description}</p>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-slate-800 px-3 py-1 text-[10px] font-medium text-white transition hover:bg-slate-700"
          >
            تأكيد
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-600 transition hover:bg-slate-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    )
  }

  // idle state
  return (
    <button
      type="button"
      onClick={onExecute}
      className={`rounded-lg border ${style.border} ${style.bg} ${style.hover} px-2.5 py-1.5 text-[11px] font-medium ${style.text} transition`}
    >
      {action.label}
    </button>
  )
}

// ==================== Main Widget ====================

export function AIAssistantWidget() {
  const user = useAuthStore(selectUser)
  const [isOpen, setIsOpen] = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>()
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const firstName = user?.name?.split(' ')[0] ?? ''
  const role = user?.role ?? 'school_principal'
  const config = getRoleConfig(role, firstName)

  // فقاعة الترحيب - تظهر مرة واحدة في الجلسة
  useEffect(() => {
    const shown = sessionStorage.getItem('raed-bubble-shown')
    if (!shown && !isOpen) {
      const timer = setTimeout(() => {
        setShowBubble(true)
        sessionStorage.setItem('raed-bubble-shown', '1')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // إضافة رسالة الترحيب عند أول فتح
  useEffect(() => {
    if (isOpen && !initialized) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: config.greeting,
      }])
      setInitialized(true)
    }
  }, [isOpen, initialized, config.greeting])

  // التمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // التركيز على حقل الإدخال عند الفتح
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const data = await sendAssistantChat(messageText, sessionId)
      setSessionId(data.session_id)

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        actions: data.actions?.length ? data.actions : undefined,
        actionResults: data.actions?.length
          ? Object.fromEntries(data.actions.map((a) => [a.action_id, { status: 'idle' as const }]))
          : undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'عذراً، حدث خطأ. تأكد من تفعيل خدمة الذكاء الاصطناعي وحاول مرة أخرى.',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId])

  // تحديث حالة إجراء في رسالة
  const updateActionState = useCallback((msgId: string, actionId: string, state: ActionState) => {
    setMessages((prev) => prev.map((msg) => {
      if (msg.id !== msgId) return msg
      return { ...msg, actionResults: { ...msg.actionResults, [actionId]: state } }
    }))
  }, [])

  // تنفيذ إجراء بعد التأكيد
  const handleExecuteAction = useCallback(async (msgId: string, action: AssistantAction) => {
    if (!sessionId) return

    updateActionState(msgId, action.action_id, { status: 'executing' })

    try {
      const result = await executeAssistantAction({
        action_id: action.action_id,
        action_type: action.type,
        params: action.params,
        session_id: sessionId,
      })

      updateActionState(msgId, action.action_id, {
        status: result.success ? 'success' : 'error',
        message: result.message,
      })

      // إضافة رسالة نظام بالنتيجة
      if (result.success) {
        setMessages((prev) => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: result.message,
        }])
      }
    } catch {
      updateActionState(msgId, action.action_id, {
        status: 'error',
        message: 'حدث خطأ في الاتصال',
      })
    }
  }, [sessionId, updateActionState])

  const handleOpen = useCallback(() => {
    setShowBubble(false)
    setIsOpen(true)
  }, [])

  // إخفاء الزر عن وكيل المعلمين
  if (!user || user.role === 'deputy_teachers') return null

  return (
    <>
      {/* فقاعة الترحيب مع نصوص متحركة */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-[78px] left-[32px] z-[9999] cursor-pointer rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-xl"
            onClick={handleOpen}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowBubble(false) }}
              className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-sm transition hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
            <RotatingBubbleText firstName={firstName} />
            {/* سهم يشير للزر */}
            <div className="absolute -bottom-[6px] left-3 h-3 w-3 rotate-45 border-b border-r border-slate-200/80 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة الدردشة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-[80px] left-6 z-[9999] flex h-[520px] w-[370px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-0 max-sm:h-full max-sm:w-full max-sm:rounded-none"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: 'var(--color-primary, #0d9488)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">رائد</h3>
                  <p className="text-[11px] text-white/70">{config.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((msg) => {
                // رسائل النظام (نتائج الإجراءات)
                if (msg.role === 'system') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center"
                    >
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] text-emerald-700">{msg.content}</span>
                      </div>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        msg.role === 'user'
                          ? 'rounded-br-sm bg-slate-100 text-slate-800'
                          : 'rounded-bl-sm border border-slate-100 bg-white text-slate-700 shadow-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <MiniMarkdown content={msg.content} />
                          {/* أزرار الإجراءات */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                              {msg.actions.map((action) => {
                                const actionState = msg.actionResults?.[action.action_id] ?? { status: 'idle' as const }
                                return (
                                  <ActionButton
                                    key={action.action_id}
                                    action={action}
                                    state={actionState}
                                    onExecute={() => updateActionState(msg.id, action.action_id, { status: 'confirming' })}
                                    onConfirm={() => handleExecuteAction(msg.id, action)}
                                    onCancel={() => updateActionState(msg.id, action.action_id, { status: 'idle' })}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {/* مؤشر الكتابة */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-slate-100 bg-white px-3 py-2 shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                    <span className="text-xs text-slate-400">رائد يفكّر...</span>
                  </div>
                </motion.div>
              )}

              {/* الاقتراحات السريعة */}
              {messages.length <= 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap justify-end gap-1.5 pt-1"
                >
                  {config.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSend(suggestion)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 px-3 py-2.5">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend() }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-30"
                  style={{ backgroundColor: 'var(--color-primary, #0d9488)' }}
                >
                  <Send className="h-3.5 w-3.5 text-white" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الزر العائم - وجه رائد مع طفو ودوران */}
      <div className="fixed bottom-8 left-6 z-[9999]">
        {/* غلاف الطفو */}
        <motion.div
          animate={!isOpen ? { y: [0, -5, 0] } : { y: 0 }}
          transition={{ duration: 3, repeat: !isOpen ? Infinity : 0, ease: 'easeInOut' }}
        >
          <motion.button
            type="button"
            onClick={isOpen ? () => setIsOpen(false) : handleOpen}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
            style={{ backgroundColor: 'var(--color-primary, #0d9488)' }}
          >
            {/* الأيقونة - وجه مع تبديل */}
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <X className="h-5 w-5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="face"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative flex h-full w-full items-center justify-center"
                >
                  <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
                    <motion.circle
                      cx="14" cy="15" r="2.5"
                      fill="white"
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }}
                    />
                    <motion.circle
                      cx="26" cy="15" r="2.5"
                      fill="white"
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }}
                    />
                    <path
                      d="M13 24 C16 28, 24 28, 27 24"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <motion.circle
                      cx="30" cy="10" r="1.5"
                      fill="white"
                      opacity="0.6"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </>
  )
}

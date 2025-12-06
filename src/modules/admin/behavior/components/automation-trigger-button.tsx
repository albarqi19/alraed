import { useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Minus,
  Phone,
  Send,
  Zap,
} from 'lucide-react'
import type { BehaviorSystemTrigger } from '../types'

interface AutomationTriggerButtonProps {
  systemTrigger: BehaviorSystemTrigger
  systemTriggerLabel: string
  pointsToDeduct?: number | null
  disabled?: boolean
  onExecute?: () => Promise<void>
}

// خريطة الأيقونات حسب نوع الـ trigger
const TRIGGER_ICONS: Record<string, typeof Zap> = {
  trigger_parent_call: Phone,
  trigger_parent_sms: MessageSquare,
  trigger_parent_whatsapp: Send,
  deduct_score_1: Minus,
  deduct_score_2: Minus,
  deduct_score_3: Minus,
  deduct_score_10: Minus,
}

// خريطة الألوان حسب نوع الـ trigger
const TRIGGER_COLORS: Record<string, string> = {
  // الإشعارات - أخضر
  trigger_parent_call: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  trigger_parent_sms: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  trigger_parent_whatsapp: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  // حسم النقاط - أحمر
  deduct_score_1: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  deduct_score_2: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  deduct_score_3: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  deduct_score_10: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  // الإحالات - أزرق
  refer_to_counselor: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  refer_to_committee: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  // الاجتماعات - بنفسجي
  invite_parent_meeting: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  invite_parent_pledge: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  invite_parent_final_warning: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  committee_meeting: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  // التصعيد - برتقالي
  escalate_to_ed_dept: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  transfer_school: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  transfer_class: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  // افتراضي - رمادي
  default: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
}

export function AutomationTriggerButton({
  systemTrigger,
  systemTriggerLabel,
  pointsToDeduct,
  disabled = false,
  onExecute,
}: AutomationTriggerButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isExecuted, setIsExecuted] = useState(false)

  const Icon = TRIGGER_ICONS[systemTrigger] ?? Bot
  const colorClass = TRIGGER_COLORS[systemTrigger] ?? TRIGGER_COLORS.default

  const handleClick = async () => {
    if (isExecuting || isExecuted || disabled || !onExecute) return

    setIsExecuting(true)
    try {
      await onExecute()
      setIsExecuted(true)
    } catch (error) {
      console.error('Error executing automation trigger:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  // تحديد النص على الزر
  const getButtonText = () => {
    if (isExecuted) return 'تم التنفيذ'
    
    if (systemTrigger.startsWith('trigger_parent_')) {
      return 'إرسال إشعار'
    }
    if (systemTrigger.startsWith('deduct_score_')) {
      return pointsToDeduct ? `حسم ${pointsToDeduct} نقطة` : 'حسم النقاط'
    }
    if (systemTrigger.startsWith('refer_')) {
      return 'إحالة'
    }
    if (systemTrigger.startsWith('invite_parent_')) {
      return 'إرسال دعوة'
    }
    if (systemTrigger === 'committee_meeting') {
      return 'جدولة اجتماع'
    }
    if (systemTrigger.startsWith('transfer_')) {
      return 'إجراء النقل'
    }
    if (systemTrigger === 'escalate_to_ed_dept') {
      return 'رفع للإدارة'
    }
    
    return 'تنفيذ الأتمتة'
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isExecuting || isExecuted}
      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
      title={`أتمتة: ${systemTriggerLabel}`}
    >
      {isExecuting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isExecuted ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{getButtonText()}</span>
      {!isExecuted && (
        <Zap className="h-3 w-3 opacity-60" />
      )}
    </button>
  )
}

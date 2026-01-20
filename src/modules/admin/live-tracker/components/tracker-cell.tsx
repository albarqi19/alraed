// =============================================
// مكون خلية الجدول
// Tracker Cell Component
// =============================================

import { CheckCircle, XCircle, Eye, Flag, Clock, AlertTriangle, BookOpen, Hourglass, Coffee } from 'lucide-react'
import type {
  TrackerSlot,
  TrackerAssemblySlot,
  TrackerClassSlot,
  TrackerFreeSlot,
  TrackerStandbySlot,
  TrackerBreakDutySlot,
  TrackerDismissalDutySlot,
  TrackerRecordedAction,
} from '../types'
import { SLOT_BG_COLORS, PREPARATION_STATUS_COLORS } from '../types'
import { cn } from '@/lib/utils'

interface TrackerCellProps {
  slot: TrackerSlot
  isCurrentPeriod?: boolean
  teacherAbsent?: boolean
  onClick?: () => void
}

// مكون عرض الإجراء المسجل
function RecordedActionBadge({ action }: { action: TrackerRecordedAction }) {
  const getBadgeConfig = () => {
    switch (action.type) {
      case 'absent':
        return { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'غياب' }
      case 'late':
        return { icon: Clock, color: 'bg-amber-100 text-amber-700', label: `تأخر ${action.minutes || ''}د` }
      case 'early_leave':
        return { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', label: `انصراف ${action.minutes || ''}د` }
      case 'duty_absent':
        return { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'غياب مناوبة' }
      default:
        return null
    }
  }

  const config = getBadgeConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <div className={cn('absolute top-0.5 right-0.5 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px]', config.color)}>
      <Icon className="h-3 w-3" />
      <span className="max-w-[50px] truncate">{config.label}</span>
    </div>
  )
}

// خلية الطابور
function AssemblyCell({ slot }: { slot: TrackerAssemblySlot }) {
  const isPresent = slot.status === 'present'

  return (
    <div className="flex items-center justify-center gap-1">
      {isPresent ? (
        <>
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {slot.check_in_time && (
            <span className="text-[9px] text-slate-500">{slot.check_in_time}</span>
          )}
        </>
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
    </div>
  )
}

// خلية الحصة
function ClassCell({ slot }: { slot: TrackerClassSlot }) {
  // تحديد لون حالة التحضير
  const preparationBorder = slot.preparation_status
    ? PREPARATION_STATUS_COLORS[slot.preparation_status] || ''
    : ''

  const getPreparationIcon = () => {
    switch (slot.preparation_status) {
      case 'prepared':
        return <BookOpen className="h-3 w-3 text-emerald-600" />
      case 'waiting':
        return <Hourglass className="h-3 w-3 text-amber-500" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      case 'activity':
        return <BookOpen className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn('flex items-center justify-center gap-1', preparationBorder && `border-r-2 ${preparationBorder}`)}>
      <span className="text-xs font-medium text-slate-700">{slot.display}</span>
      {slot.preparation_status && getPreparationIcon()}
    </div>
  )
}

// خلية الفراغ (الفسحة)
function FreeCell({ slot: _slot }: { slot: TrackerFreeSlot }) {
  return (
    <div className="flex items-center justify-center">
      <Coffee className="h-3 w-3 text-slate-400" />
    </div>
  )
}

// خلية الانتظار
function StandbyCell({ slot }: { slot: TrackerStandbySlot }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-[10px] font-medium text-amber-700">انتظار</span>
      {slot.display && (
        <span className="text-[9px] text-amber-600">{slot.display}</span>
      )}
    </div>
  )
}

// خلية إشراف الفسحة
function BreakDutyCell({ slot }: { slot: TrackerBreakDutySlot }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Eye className="h-3 w-3 text-sky-600" />
      {slot.template_name && (
        <span className="text-[9px] text-sky-700 truncate max-w-[50px]">{slot.template_name}</span>
      )}
    </div>
  )
}

// خلية مناوبة الانصراف
function DismissalDutyCell({ slot: _slot }: { slot: TrackerDismissalDutySlot }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Flag className="h-3 w-3 text-purple-600" />
      <span className="text-[9px] text-purple-700">مناوبة</span>
    </div>
  )
}

// المكون الرئيسي
export function TrackerCell({ slot, isCurrentPeriod, teacherAbsent, onClick }: TrackerCellProps) {
  // تحديد لون الخلفية
  const bgColor = SLOT_BG_COLORS[slot.type] || 'bg-slate-50'

  // تحديد المحتوى حسب نوع الخانة
  const renderContent = () => {
    switch (slot.type) {
      case 'assembly':
        return <AssemblyCell slot={slot} />
      case 'class':
        return <ClassCell slot={slot} />
      case 'free':
        return <FreeCell slot={slot} />
      case 'standby':
        return <StandbyCell slot={slot} />
      case 'break_duty':
        return <BreakDutyCell slot={slot} />
      case 'dismissal_duty':
        return <DismissalDutyCell slot={slot} />
      default:
        return null
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative min-h-[32px] w-full p-1 transition-all',
        bgColor,
        isCurrentPeriod && 'ring-1 ring-indigo-500',
        teacherAbsent && 'opacity-50',
        onClick && 'cursor-pointer hover:brightness-95 active:brightness-90',
        !onClick && 'cursor-default'
      )}
    >
      {/* محتوى الخلية */}
      {renderContent()}

      {/* عرض الإجراء المسجل إن وجد */}
      {slot.action && <RecordedActionBadge action={slot.action} />}
    </button>
  )
}

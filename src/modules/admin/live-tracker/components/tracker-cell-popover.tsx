// =============================================
// مكون Popover للإجراءات
// Tracker Cell Actions Popover
// =============================================

import { useState } from 'react'
import { XCircle, Clock, LogOut, Trash2, Loader2 } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import type {
  TrackerSlot,
  TrackerTeacher,
  TrackerPeriod,
  TrackerActionType,
  TrackerPeriodType,
  RecordActionPayload,
  DeleteActionPayload,
} from '../types'
import { ACTION_TYPE_LABELS } from '../types'
import { TrackerCell } from './tracker-cell'
import { cn } from '@/lib/utils'

interface TrackerCellPopoverProps {
  teacher: TrackerTeacher
  period: TrackerPeriod
  slot: TrackerSlot
  date?: string | null
  isCurrentPeriod?: boolean
  onRecordAction: (payload: RecordActionPayload) => Promise<void>
  onDeleteAction: (payload: DeleteActionPayload) => Promise<void>
  isRecording?: boolean
  isDeleting?: boolean
}

// تحديد الإجراءات المتاحة حسب نوع الخانة
function getAvailableActions(slotType: TrackerSlot['type']): Array<{
  type: TrackerActionType
  label: string
  icon: typeof XCircle
  requiresMinutes: boolean
}> {
  switch (slotType) {
    case 'assembly':
      return [
        { type: 'absent', label: 'غياب الطابور', icon: XCircle, requiresMinutes: false },
        { type: 'late', label: 'تأخر عن الطابور', icon: Clock, requiresMinutes: true },
      ]
    case 'class':
      return [
        { type: 'absent', label: 'غياب الحصة', icon: XCircle, requiresMinutes: false },
        { type: 'late', label: 'تأخر عن الحصة', icon: Clock, requiresMinutes: true },
        { type: 'early_leave', label: 'انصراف مبكر', icon: LogOut, requiresMinutes: true },
      ]
    case 'standby':
      return [
        { type: 'absent', label: 'غياب الانتظار', icon: XCircle, requiresMinutes: false },
        { type: 'late', label: 'تأخر عن الانتظار', icon: Clock, requiresMinutes: true },
      ]
    case 'break_duty':
      return [
        { type: 'duty_absent', label: 'غياب الإشراف', icon: XCircle, requiresMinutes: false },
        { type: 'late', label: 'تأخر عن الإشراف', icon: Clock, requiresMinutes: true },
      ]
    case 'dismissal_duty':
      return [
        { type: 'duty_absent', label: 'غياب المناوبة', icon: XCircle, requiresMinutes: false },
        { type: 'late', label: 'تأخر عن المناوبة', icon: Clock, requiresMinutes: true },
      ]
    case 'free':
    default:
      return []
  }
}

// تحويل نوع الخانة إلى نوع الفترة
function slotTypeToPeriodType(slotType: TrackerSlot['type']): TrackerPeriodType {
  switch (slotType) {
    case 'assembly':
      return 'assembly'
    case 'class':
    case 'free':
    case 'standby':
      return 'class'
    case 'break_duty':
      return 'break'
    case 'dismissal_duty':
      return 'dismissal'
    default:
      return 'class'
  }
}

export function TrackerCellPopover({
  teacher,
  period,
  slot,
  date,
  isCurrentPeriod,
  onRecordAction,
  onDeleteAction,
  isRecording,
  isDeleting,
}: TrackerCellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [minutes, setMinutes] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<TrackerActionType | null>(null)

  const availableActions = getAvailableActions(slot.type)
  const hasExistingAction = !!slot.action

  // لا تفتح للفراغ
  if (slot.type === 'free') {
    return (
      <TrackerCell
        slot={slot}
        isCurrentPeriod={isCurrentPeriod}
        teacherAbsent={teacher.is_absent}
      />
    )
  }

  const handleRecordAction = async (actionType: TrackerActionType, needsMinutes: boolean) => {
    if (needsMinutes) {
      setSelectedAction(actionType)
      return
    }

    const periodType = slotTypeToPeriodType(slot.type)
    const payload: RecordActionPayload = {
      user_id: teacher.id,
      date: date || undefined,
      period_number: period.number,
      period_type: periodType,
      action_type: actionType,
      grade: slot.type === 'class' ? slot.grade : undefined,
      class_name: slot.type === 'class' ? slot.class_name : undefined,
    }

    await onRecordAction(payload)
    setIsOpen(false)
  }

  const handleSubmitWithMinutes = async () => {
    if (!selectedAction || !minutes) return

    const periodType = slotTypeToPeriodType(slot.type)
    const payload: RecordActionPayload = {
      user_id: teacher.id,
      date: date || undefined,
      period_number: period.number,
      period_type: periodType,
      action_type: selectedAction,
      minutes: parseInt(minutes, 10),
      grade: slot.type === 'class' ? slot.grade : undefined,
      class_name: slot.type === 'class' ? slot.class_name : undefined,
    }

    await onRecordAction(payload)
    setIsOpen(false)
    setMinutes('')
    setSelectedAction(null)
  }

  const handleDeleteAction = async () => {
    if (!slot.action) return

    const payload: DeleteActionPayload = {
      user_id: teacher.id,
      date: date || undefined,
      period_number: period.number,
      action_type: slot.action.type,
    }

    await onDeleteAction(payload)
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setMinutes('')
      setSelectedAction(null)
    }
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <div>
          <TrackerCell
            slot={slot}
            isCurrentPeriod={isCurrentPeriod}
            teacherAbsent={teacher.is_absent}
            onClick={() => setIsOpen(true)}
          />
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-lg border bg-white p-3 shadow-xl"
          sideOffset={5}
          align="center"
        >
          {/* العنوان */}
          <div className="mb-3 border-b pb-2">
            <p className="font-semibold text-slate-800">{teacher.name}</p>
            <p className="text-sm text-slate-500">{period.name}</p>
          </div>

          {/* إدخال الدقائق */}
          {selectedAction && (
            <div className="mb-3 space-y-2">
              <label className="text-sm text-slate-600">
                {ACTION_TYPE_LABELS[selectedAction]} - أدخل الدقائق:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="الدقائق"
                  className="flex-1 rounded-md border px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSubmitWithMinutes}
                  disabled={!minutes || isRecording}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors',
                    'bg-indigo-600 hover:bg-indigo-700',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تسجيل'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                رجوع
              </button>
            </div>
          )}

          {/* أزرار الإجراءات */}
          {!selectedAction && (
            <div className="space-y-1.5">
              {availableActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => handleRecordAction(action.type, action.requiresMinutes)}
                    disabled={isRecording}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      'bg-slate-50 hover:bg-slate-100',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    <Icon className="h-4 w-4 text-slate-600" />
                    <span>{action.label}</span>
                  </button>
                )
              })}

              {/* زر الحذف إذا كان هناك إجراء مسجل */}
              {hasExistingAction && (
                <>
                  <div className="my-2 border-t" />
                  <button
                    type="button"
                    onClick={handleDeleteAction}
                    disabled={isDeleting}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      'bg-red-50 text-red-600 hover:bg-red-100',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>حذف الإجراء المسجل</span>
                  </button>
                </>
              )}
            </div>
          )}

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

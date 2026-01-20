// =============================================
// صفحة مؤشر المتابعة المباشر
// Live Tracker Page
// =============================================

import { useState, useEffect } from 'react'
import { Activity, Calendar, Clock, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import {
  useLiveTrackerQuery,
  useRecordTrackerActionMutation,
  useDeleteTrackerActionMutation,
} from '../hooks'
import { LiveTrackerTable, TrackerLegend } from '../live-tracker/components'
import type { RecordActionPayload, DeleteActionPayload } from '../live-tracker/types'
import { cn } from '@/lib/utils'

export function LiveTrackerPage() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showLegend, setShowLegend] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')

  // جلب البيانات
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useLiveTrackerQuery(selectedDate || null)

  // Mutations
  const recordActionMutation = useRecordTrackerActionMutation()
  const deleteActionMutation = useDeleteTrackerActionMutation()

  // تحديث الوقت الحالي كل دقيقة
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  // معالجة تسجيل الإجراء
  const handleRecordAction = async (payload: RecordActionPayload) => {
    await recordActionMutation.mutateAsync(payload)
  }

  // معالجة حذف الإجراء
  const handleDeleteAction = async (payload: DeleteActionPayload) => {
    await deleteActionMutation.mutateAsync(payload)
  }

  // معالجة تغيير التاريخ
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  // زر اليوم
  const handleTodayClick = () => {
    setSelectedDate('')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-slate-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <Activity className="h-8 w-8 text-red-500" />
          </div>
          <p className="font-medium text-slate-800">حدث خطأ في تحميل البيانات</p>
          <p className="text-sm text-slate-500">
            {error instanceof Error ? error.message : 'خطأ غير معروف'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-500">لا توجد بيانات</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* الـ Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2">
            <Activity className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">مؤشر المتابعة المباشر</h1>
            <p className="text-sm text-slate-500">
              {data.day_name} - {data.date}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* مؤشر التحديث */}
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-xs text-indigo-600">جاري التحديث...</span>
            </div>
          )}

          {/* الوقت الحالي */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">{currentTime || data.current_time}</span>
          </div>

          {/* اختيار التاريخ */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="rounded-lg border bg-white py-1.5 pr-10 pl-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={handleTodayClick}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                !selectedDate
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              اليوم
            </button>
          </div>

          {/* زر التحديث */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {/* معلومات الفترة الحالية */}
      {data.current_period !== null && data.current_period !== undefined && (
        <div className="rounded-lg bg-indigo-50 px-4 py-2">
          <p className="text-sm text-indigo-700">
            <span className="font-medium">الفترة الحالية:</span>{' '}
            {data.periods.find((p) => p.number === data.current_period)?.name || `الفترة ${data.current_period}`}
          </p>
        </div>
      )}

      {/* دليل الألوان */}
      <div>
        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          {showLegend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>دليل الألوان والرموز</span>
        </button>
        {showLegend && (
          <div className="mt-2">
            <TrackerLegend />
          </div>
        )}
      </div>

      {/* الجدول */}
      <LiveTrackerTable
        data={data}
        onRecordAction={handleRecordAction}
        onDeleteAction={handleDeleteAction}
        isRecording={recordActionMutation.isPending}
        isDeleting={deleteActionMutation.isPending}
      />

      {/* ملاحظة التحديث التلقائي */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <RefreshCw className="h-3 w-3" />
        <span>يتم التحديث تلقائياً كل 30 ثانية</span>
      </div>
    </div>
  )
}

export default LiveTrackerPage

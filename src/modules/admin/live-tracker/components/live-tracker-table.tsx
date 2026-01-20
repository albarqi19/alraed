// =============================================
// جدول المتابعة المباشر
// Live Tracker Table Component
// =============================================

import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type {
  LiveTrackerData,
  TrackerTeacher,
  TrackerPeriod,
  TrackerSlot,
  RecordActionPayload,
  DeleteActionPayload,
} from '../types'
import { TrackerCellPopover } from './tracker-cell-popover'
import { TimeColumnHeader, TeacherNameHeader } from './time-column-header'
import { cn } from '@/lib/utils'

interface LiveTrackerTableProps {
  data: LiveTrackerData
  onRecordAction: (payload: RecordActionPayload) => Promise<void>
  onDeleteAction: (payload: DeleteActionPayload) => Promise<void>
  isRecording?: boolean
  isDeleting?: boolean
}

const columnHelper = createColumnHelper<TrackerTeacher>()

export function LiveTrackerTable({
  data,
  onRecordAction,
  onDeleteAction,
  isRecording,
  isDeleting,
}: LiveTrackerTableProps) {
  const [globalFilter, setGlobalFilter] = useState('')

  // بناء الأعمدة ديناميكياً
  const columns = useMemo(() => {
    // عمود اسم المعلم
    const teacherColumn = columnHelper.accessor('name', {
      id: 'teacher_name',
      header: () => <TeacherNameHeader schedules={data.schedules} />,
      cell: ({ row }) => {
        const teacher = row.original
        const hasMultipleSchedules = data.schedules.length > 1

        // تحديد لون مؤشر التوقيت
        const getLevelColor = (level: string | null | undefined) => {
          if (level === 'upper') return 'bg-blue-500'
          if (level === 'lower') return 'bg-green-500'
          return 'bg-slate-400'
        }

        return (
          <div className="flex items-center gap-1.5 px-2 py-1">
            {/* مؤشر التوقيت */}
            {hasMultipleSchedules && teacher.schedule_level && (
              <span
                className={cn('h-2 w-2 rounded-full flex-shrink-0', getLevelColor(teacher.schedule_level))}
                title={teacher.schedule_level === 'upper' ? 'العليا' : 'الدنيا'}
              />
            )}

            {/* الاسم فقط */}
            <span className={cn(
              'text-sm font-medium text-slate-800 truncate',
              teacher.is_absent && 'opacity-60 line-through'
            )}>
              {teacher.name}
            </span>

            {/* سبب الغياب */}
            {teacher.is_absent && teacher.absence_reason_label && (
              <span className="mr-auto rounded bg-red-100 px-1 py-0.5 text-[9px] text-red-600 flex-shrink-0">
                {teacher.absence_reason_label}
              </span>
            )}
          </div>
        )
      },
      filterFn: (row, _columnId, filterValue) => {
        return row.original.name.toLowerCase().includes(filterValue.toLowerCase())
      },
    })

    // أعمدة الفترات (استثناء الحصة 8 إن وجدت)
    const periodColumns = data.periods
      .filter((period: TrackerPeriod) => period.number !== 8)
      .map((period: TrackerPeriod) =>
      columnHelper.display({
        id: `period_${period.number}`,
        header: () => (
          <TimeColumnHeader
            period={period}
            schedules={data.schedules}
            isCurrentPeriod={period.is_current}
          />
        ),
        cell: ({ row }) => {
          const teacher = row.original
          const slot: TrackerSlot | undefined = teacher.slots[String(period.number)]

          // إذا لم تكن هناك خانة، أظهر خلية فارغة
          if (!slot) {
            return <div className="min-h-[32px] bg-slate-50" />
          }

          return (
            <TrackerCellPopover
              teacher={teacher}
              period={period}
              slot={slot}
              date={data.date}
              isCurrentPeriod={period.is_current}
              onRecordAction={onRecordAction}
              onDeleteAction={onDeleteAction}
              isRecording={isRecording}
              isDeleting={isDeleting}
            />
          )
        },
      })
    )

    return [teacherColumn, ...periodColumns]
  }, [data, onRecordAction, onDeleteAction, isRecording, isDeleting])

  // إعداد الجدول
  const table = useReactTable({
    data: data.teachers,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div>
      {/* الجدول */}
      <div className="overflow-x-auto border bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={cn(
                      'border-b text-right',
                      index === 0 ? 'sticky right-0 z-10 bg-slate-50 min-w-[140px]' : 'min-w-[70px]'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b transition-colors hover:bg-slate-50/50',
                  row.original.is_absent && 'bg-slate-100/50'
                )}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'p-0',
                      index === 0 && 'sticky right-0 z-10 bg-white border-l'
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* رسالة عند عدم وجود بيانات */}
        {table.getRowModel().rows.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-500">
            <p>لا توجد بيانات</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Clock, Users, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import {
  usePeriodAttendanceGridQuery,
  usePeriodAttendanceDetailsQuery,
  usePeriodAbsenceAlertsQuery,
  usePeriodAttendanceGradesQuery,
  useUpdatePeriodStatusMutation,
  useUpdatePeriodAlertStatusMutation,
} from '../hooks/period-attendance-hooks'
import type { PeriodCell, ClassPeriodRow } from '../types'

function formatToday(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export function AdminPeriodAttendancePage() {
  const [date, setDate] = useState(formatToday())
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedCell, setSelectedCell] = useState<{
    grade: string
    className: string
    periodNumber: number
  } | null>(null)

  const gradesQuery = usePeriodAttendanceGradesQuery()
  const gridQuery = usePeriodAttendanceGridQuery(date, selectedGrade === 'all' ? undefined : selectedGrade)
  const alertsQuery = usePeriodAbsenceAlertsQuery(date)

  const detailsQuery = usePeriodAttendanceDetailsQuery(
    date,
    selectedCell?.grade ?? '',
    selectedCell?.className ?? '',
    selectedCell?.periodNumber ?? 0,
    { enabled: !!selectedCell },
  )

  const updateStatusMutation = useUpdatePeriodStatusMutation()
  const updateAlertMutation = useUpdatePeriodAlertStatusMutation()

  const grid = gridQuery.data
  const alerts = alertsQuery.data

  function handleCellClick(row: ClassPeriodRow, periodNumber: number, cell: PeriodCell) {
    if (cell.status === 'no_session' || cell.status === 'not_submitted') return
    setSelectedCell({
      grade: row.grade,
      className: row.class_name,
      periodNumber,
    })
  }

  function handleStatusChange(attendanceId: number, newStatus: 'present' | 'absent' | 'late') {
    updateStatusMutation.mutate({ attendanceId, status: newStatus })
  }

  function getCellColor(cell: PeriodCell): string {
    if (cell.status === 'no_session') return 'bg-gray-50 text-gray-400'
    if (cell.status === 'not_submitted') return 'bg-gray-100 text-gray-500 cursor-default'
    if (cell.alerts_count > 0) return 'bg-amber-50 border-amber-300 cursor-pointer hover:bg-amber-100'
    if (cell.attendance_type === 'daily') return 'bg-green-50 border-green-300 cursor-pointer hover:bg-green-100'
    return 'bg-blue-50 border-blue-300 cursor-pointer hover:bg-blue-100'
  }

  function getCellBadge(cell: PeriodCell) {
    if (cell.status === 'no_session') return <span className="text-xs text-gray-400">--</span>
    if (cell.status === 'not_submitted') return <span className="text-xs text-gray-400">لم يُحضّر</span>
    return (
      <div className="flex flex-col items-center gap-0.5">
        <Badge
          variant={cell.attendance_type === 'daily' ? 'default' : 'secondary'}
          className={`text-[10px] px-1 py-0 ${
            cell.attendance_type === 'daily'
              ? 'bg-green-600'
              : 'bg-blue-600 text-white'
          }`}
        >
          {cell.attendance_type === 'daily' ? 'يومي' : 'حصة'}
        </Badge>
        <span className="text-[10px] leading-tight">
          <span className="text-green-700">{cell.present}</span>
          {cell.absent > 0 && <span className="text-red-600 mr-1">/{cell.absent}</span>}
          {cell.late > 0 && <span className="text-amber-600 mr-1">/{cell.late}</span>}
        </span>
        {cell.alerts_count > 0 && (
          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" />
            {cell.alerts_count}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تحضير الحصص</h1>
          <p className="text-gray-500 text-sm mt-1">
            متابعة تحضير المعلمين لكل حصة - الأخضر: يومي، الأزرق: حصة
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            gridQuery.refetch()
            alertsQuery.refetch()
          }}
          disabled={gridQuery.isFetching}
        >
          <RefreshCw className={`w-4 h-4 ml-2 ${gridQuery.isFetching ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">التاريخ</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">الصف</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الصفوف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {gradesQuery.data?.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {grid?.day_name && (
              <Badge variant="outline" className="text-sm h-9 px-3">
                {grid.day_name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts && alerts.counts.new > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
              تنبيهات عاجلة ({alerts.counts.new})
              <span className="text-xs font-normal text-amber-600">
                طلاب حاضرون يومياً لكن غائبون في حصة
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.alerts
                .filter((a) => a.alert_status === 'new')
                .map((alert) => (
                  <Alert key={alert.id} className="bg-white border-amber-200">
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-medium">{alert.student_name}</span>
                          <span className="text-gray-500 text-sm mr-2">
                            {alert.grade} {alert.class_name} - الحصة {alert.period_number}
                            {alert.subject_name && ` (${alert.subject_name})`}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateAlertMutation.mutate({ alertId: alert.id, alertStatus: 'seen' })
                        }
                      >
                        تم الاطلاع
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {gridQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="mr-3 text-gray-500">جاري تحميل الشبكة...</span>
          </CardContent>
        </Card>
      ) : !grid || grid.classes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">لا توجد حصص لهذا اليوم</p>
            <p className="text-sm">تأكد من وجود جدول دراسي وأن اليوم يوم عمل</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky right-0 bg-white z-10 min-w-[140px]">الفصل</TableHead>
                  {grid.period_headers.map((h) => (
                    <TableHead key={h.period_number} className="text-center min-w-[90px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold">{h.name}</span>
                        {h.start_time && (
                          <span className="text-[10px] text-gray-400">
                            {h.start_time} - {h.end_time}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grid.classes.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="sticky right-0 bg-white z-10 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {row.grade} {row.class_name}
                      </div>
                    </TableCell>
                    {grid.period_headers.map((h) => {
                      const cell = row.periods[h.period_number]
                      if (!cell) {
                        return <TableCell key={h.period_number} className="text-center bg-gray-50">--</TableCell>
                      }
                      return (
                        <TableCell
                          key={h.period_number}
                          className={`text-center p-1 border ${getCellColor(cell)}`}
                          onClick={() => handleCellClick(row, h.period_number, cell)}
                        >
                          {getCellBadge(cell)}
                          {cell.subject_name && (
                            <div className="text-[9px] text-gray-500 mt-0.5 truncate max-w-[80px]">
                              {cell.subject_name}
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span>تحضير يومي</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
          <span>تحضير حصة</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
          <span>لم يُحضّر</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
          <span>تنبيه عاجل</span>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              {detailsQuery.data?.session_info && (
                <span>
                  تفاصيل الحصة {detailsQuery.data.session_info.period_number} -{' '}
                  {detailsQuery.data.session_info.grade} {detailsQuery.data.session_info.class_name}
                  {detailsQuery.data.session_info.subject_name &&
                    ` (${detailsQuery.data.session_info.subject_name})`}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : detailsQuery.data ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">{detailsQuery.data.summary.total}</div>
                  <div className="text-xs text-gray-500">إجمالي</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-700">{detailsQuery.data.summary.present}</div>
                  <div className="text-xs text-green-600">حاضر</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-700">{detailsQuery.data.summary.absent}</div>
                  <div className="text-xs text-red-600">غائب</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="text-lg font-bold text-amber-700">{detailsQuery.data.summary.late}</div>
                  <div className="text-xs text-amber-600">متأخر</div>
                </div>
              </div>

              {/* Students Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الطالب</TableHead>
                    <TableHead className="text-center">الحالة اليومية</TableHead>
                    <TableHead className="text-center">حالة الحصة</TableHead>
                    <TableHead className="text-center">تنبيه</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailsQuery.data.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={student.daily_status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={student.period_status} lateMinutes={student.late_minutes} />
                      </TableCell>
                      <TableCell className="text-center">
                        {student.has_alert && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            تنبيه
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.period_status === 'absent' && student.attendance_type === 'period' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            disabled={updateStatusMutation.isPending}
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'تغيير لحاضر'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status, lateMinutes }: { status: string | null; lateMinutes?: number | null }) {
  if (!status) return <span className="text-gray-400 text-xs">--</span>

  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    present: { label: 'حاضر', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    absent: { label: 'غائب', className: 'bg-red-100 text-red-700', icon: XCircle },
    late: {
      label: lateMinutes ? `متأخر (${lateMinutes} د)` : 'متأخر',
      className: 'bg-amber-100 text-amber-700',
      icon: Clock,
    },
  }

  const c = config[status]
  if (!c) return <span className="text-xs">{status}</span>

  const Icon = c.icon
  return (
    <Badge variant="outline" className={`text-[10px] ${c.className}`}>
      <Icon className="w-3 h-3 ml-1" />
      {c.label}
    </Badge>
  )
}

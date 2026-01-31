/**
 * نافذة إعدادات أعذار التأخير
 * تكوين إعدادات تقديم الأعذار وإعدادات المعلمين الفردية
 */

import { useState, useEffect } from 'react'
import { X, Settings, Clock, Calendar, Users, Check, AlertCircle, Search } from 'lucide-react'
import {
  useDelayExcusesSettingsQuery,
  useUpdateDelayExcusesSettingsMutation,
  useTeacherExcuseSettingsQuery,
  useUpdateTeacherExcuseSettingMutation,
} from '../hooks'

interface DelayExcusesSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ActiveTab = 'general' | 'teachers'

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

export function DelayExcusesSettingsDialog({
  open,
  onOpenChange,
}: DelayExcusesSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('general')
  const [searchTerm, setSearchTerm] = useState('')

  // الإعدادات العامة
  const [enabled, setEnabled] = useState(true)
  const [submissionDays, setSubmissionDays] = useState(3)
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('14:00')

  // جلب البيانات
  const settingsQuery = useDelayExcusesSettingsQuery({ enabled: open })
  const teacherSettingsQuery = useTeacherExcuseSettingsQuery({ enabled: open && activeTab === 'teachers' })
  const updateSettingsMutation = useUpdateDelayExcusesSettingsMutation()
  const updateTeacherMutation = useUpdateTeacherExcuseSettingMutation()

  // تحميل الإعدادات عند فتح النافذة
  useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.delay_excuses_enabled)
      setSubmissionDays(settingsQuery.data.excuse_submission_days)
      setAllowedDays(settingsQuery.data.excuse_allowed_days)
      setStartTime(settingsQuery.data.excuse_start_time)
      setEndTime(settingsQuery.data.excuse_end_time)
    }
  }, [settingsQuery.data])

  // حفظ الإعدادات العامة
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      delay_excuses_enabled: enabled,
      excuse_submission_days: submissionDays,
      excuse_allowed_days: allowedDays,
      excuse_start_time: startTime,
      excuse_end_time: endTime,
    })
  }

  // تبديل حالة تفعيل الأعذار لمعلم
  const handleToggleTeacher = (userId: number, currentEnabled: boolean) => {
    updateTeacherMutation.mutate({
      userId,
      payload: { excuses_enabled: !currentEnabled },
    })
  }

  // تبديل يوم من أيام الأسبوع
  const handleToggleDay = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  // فلترة المعلمين
  const filteredTeachers = (teacherSettingsQuery.data ?? []).filter((teacher) =>
    teacher.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.national_id && teacher.national_id.includes(searchTerm)),
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
              <Settings className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إعدادات أعذار التأخير</h2>
              <p className="text-sm text-slate-500">تكوين إعدادات تقديم الأعذار</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`relative px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'general'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            الإعدادات العامة
            {activeTab === 'general' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`relative px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'teachers'
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            إعدادات المعلمين
            {activeTab === 'teachers' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {settingsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : activeTab === 'general' ? (
            <div className="space-y-6">
              {/* تفعيل الميزة */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    enabled ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <Check className={`h-5 w-5 ${enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">تفعيل أعذار التأخير</div>
                    <div className="text-sm text-slate-500">السماح للمعلمين بتقديم أعذار</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                      enabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* عدد أيام التقديم */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Calendar className="h-4 w-4" />
                  عدد أيام التقديم المسموحة
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={submissionDays}
                    onChange={(e) => setSubmissionDays(Number(e.target.value))}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-sm text-slate-500">يوم من تاريخ التأخير</span>
                </div>
              </div>

              {/* أيام الأسبوع المسموحة */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Calendar className="h-4 w-4" />
                  أيام الأسبوع المسموحة للتقديم
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(day.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        allowedDays.includes(day.value)
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ساعات التقديم */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock className="h-4 w-4" />
                  ساعات التقديم المسموحة
                </div>
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">من</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">إلى</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ملاحظة */}
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="text-sm text-amber-700">
                  سيتمكن المعلمون من تقديم أعذار التأخير فقط خلال الأيام والساعات المحددة أعلاه.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث عن معلم..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-10 pl-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* قائمة المعلمين */}
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4" />
                المعلمون الذين لديهم إعدادات خاصة
              </div>

              {teacherSettingsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="rounded-xl border border-slate-200 py-8 text-center text-slate-500">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد إعدادات خاصة بالمعلمين'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {filteredTeachers.map((teacher) => (
                    <div
                      key={teacher.user_id}
                      className="flex items-center justify-between p-4 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{teacher.teacher_name}</div>
                        {teacher.national_id && (
                          <div className="text-xs text-slate-500">{teacher.national_id}</div>
                        )}
                        {teacher.notes && (
                          <div className="mt-1 text-xs text-slate-400">{teacher.notes}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleTeacher(teacher.user_id, teacher.excuses_enabled)}
                        disabled={updateTeacherMutation.isPending}
                        className={`relative h-6 w-11 rounded-full transition ${
                          teacher.excuses_enabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                            teacher.excuses_enabled ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ملاحظة */}
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 text-slate-500" />
                <div className="text-sm text-slate-600">
                  يمكنك تعطيل الأعذار لمعلمين محددين. المعلمون غير المدرجين هنا يستخدمون الإعدادات الافتراضية.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'general' && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ الإعدادات'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

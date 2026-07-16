/**
 * نافذة إعدادات أعذار التأخير
 * تكوين إعدادات تقديم الأعذار وإعدادات المعلمين الفردية
 */

import { useState, useEffect } from 'react'
import { Settings, Users } from 'lucide-react'
import {
  useDelayExcusesSettingsQuery,
  useUpdateDelayExcusesSettingsMutation,
  useTeacherExcuseSettingsQuery,
  useUpdateTeacherExcuseSettingMutation,
} from '../hooks'
import {
  WsAlert,
  WsBtn,
  WsChip,
  WsField,
  WsInput,
  WsModal,
  WsSpinner,
  WsSwitch,
} from '@/shared/workspace'

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
    <WsModal
      open={open}
      onClose={() => onOpenChange(false)}
      title="إعدادات أعذار التأخير"
      sub="تكوين إعدادات تقديم الأعذار وإعدادات المعلمين الفردية."
      maxWidth={560}
      footer={
        activeTab === 'general' ? (
          <>
            <WsBtn onClick={() => onOpenChange(false)}>إلغاء</WsBtn>
            <WsBtn
              variant="primary"
              icon={Settings}
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </WsBtn>
          </>
        ) : (
          <WsBtn variant="primary" onClick={() => onOpenChange(false)}>
            إغلاق
          </WsBtn>
        )
      }
    >
      {/* التبويبات */}
      <div className="ws-seg" style={{ display: 'flex' }}>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`ws-seg__btn ${activeTab === 'general' ? 'is-active' : ''}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          الإعدادات العامة
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`ws-seg__btn ${activeTab === 'teachers' ? 'is-active' : ''}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          إعدادات المعلمين
        </button>
      </div>

      {settingsQuery.isLoading ? (
        <WsAlert tone="info" icon={null} boxed>
          <WsSpinner style={{ width: 13, height: 13 }} />
          جاري تحميل الإعدادات...
        </WsAlert>
      ) : activeTab === 'general' ? (
        <>
          {/* تفعيل الميزة */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '8px 10px',
              border: '1px solid var(--ws-hairline)',
              borderRadius: 8,
              background: 'var(--ws-surface-2)',
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>تفعيل أعذار التأخير</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                السماح للمعلمين بتقديم أعذار.
              </span>
            </span>
            <WsSwitch checked={enabled} onChange={setEnabled} />
          </div>

          {/* عدد أيام التقديم */}
          <WsField label="عدد أيام التقديم المسموحة (من تاريخ التأخير)">
            <WsInput
              type="number"
              min={1}
              max={30}
              value={submissionDays}
              onChange={(e) => setSubmissionDays(Number(e.target.value))}
              style={{ width: 100, textAlign: 'center' }}
            />
          </WsField>

          {/* أيام الأسبوع المسموحة */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="ws-label">أيام الأسبوع المسموحة للتقديم</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {DAYS_OF_WEEK.map((day) => (
                <WsChip
                  key={day.value}
                  tone={allowedDays.includes(day.value) ? 'green' : undefined}
                  onClick={() => handleToggleDay(day.value)}
                >
                  {day.label}
                </WsChip>
              ))}
            </div>
          </div>

          {/* ساعات التقديم */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <WsField label="من الساعة">
              <WsInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </WsField>
            <WsField label="إلى الساعة">
              <WsInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </WsField>
          </div>

          <WsAlert tone="warn" boxed>
            سيتمكن المعلمون من تقديم أعذار التأخير فقط خلال الأيام والساعات المحددة أعلاه.
          </WsAlert>
        </>
      ) : (
        <>
          {/* البحث */}
          <WsInput
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن معلم..."
          />

          <span className="ws-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Users style={{ width: 12, height: 12 }} />
            المعلمون الذين لديهم إعدادات خاصة
          </span>

          {teacherSettingsQuery.isLoading ? (
            <WsAlert tone="info" icon={null} boxed>
              <WsSpinner style={{ width: 13, height: 13 }} />
              جاري التحميل...
            </WsAlert>
          ) : filteredTeachers.length === 0 ? (
            <WsAlert tone="info" boxed>
              {searchTerm ? 'لا توجد نتائج للبحث.' : 'لا توجد إعدادات خاصة بالمعلمين.'}
            </WsAlert>
          ) : (
            <div
              style={{
                border: '1px solid var(--ws-hairline)',
                borderRadius: 8,
                maxHeight: '38vh',
                overflowY: 'auto',
              }}
            >
              {filteredTeachers.map((teacher) => (
                <div
                  key={teacher.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '7px 10px',
                    borderBottom: '1px solid var(--ws-hairline)',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{teacher.teacher_name}</span>
                    {teacher.national_id && (
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                        {teacher.national_id}
                      </span>
                    )}
                    {teacher.notes && (
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>{teacher.notes}</span>
                    )}
                  </span>
                  <WsSwitch
                    checked={teacher.excuses_enabled}
                    onChange={() => handleToggleTeacher(teacher.user_id, teacher.excuses_enabled)}
                    disabled={updateTeacherMutation.isPending}
                  />
                </div>
              ))}
            </div>
          )}

          <WsAlert tone="info" boxed>
            يمكنك تعطيل الأعذار لمعلمين محددين — المعلمون غير المدرجين هنا يستخدمون الإعدادات الافتراضية.
          </WsAlert>
        </>
      )}
    </WsModal>
  )
}

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  useReferralSettingsQuery,
  useUpdateReferralSettingsMutation,
  useTeachersWithSettingsQuery,
  useDisableTeacherReferralsMutation,
  useEnableTeacherReferralsMutation,
  useUpdateTeacherReferralSettingsMutation,
  useResetTeacherReferralSettingsMutation,
  type ReferralSettings,
  type TeacherWithSettings,
  type UpdateReferralSettingsPayload,
} from '../hooks'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type TabId = 'general' | 'types' | 'limits' | 'notifications' | 'teachers' | 'templates'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'general', label: 'الإعدادات العامة', icon: 'bi-gear' },
  { id: 'types', label: 'أنواع الإحالات', icon: 'bi-list-check' },
  { id: 'limits', label: 'الحدود والقيود', icon: 'bi-speedometer2' },
  { id: 'notifications', label: 'الإشعارات', icon: 'bi-bell' },
  { id: 'teachers', label: 'إعدادات المعلمين', icon: 'bi-people' },
  { id: 'templates', label: 'قوالب الرسائل', icon: 'bi-file-text' },
]

export function ReferralSettingsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [formData, setFormData] = useState<Partial<ReferralSettings>>({})
  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherFilter, setTeacherFilter] = useState<string>('')
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithSettings | null>(null)
  const [disableReason, setDisableReason] = useState('')
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState<{
    daily_referral_cap: string
    daily_per_student_cap: string
    weekly_referral_cap: string
  }>({ daily_referral_cap: '', daily_per_student_cap: '', weekly_referral_cap: '' })

  const { data: settings, isLoading: settingsLoading } = useReferralSettingsQuery()
  const { data: teachers, isLoading: teachersLoading } = useTeachersWithSettingsQuery({
    search: teacherSearch,
    status: teacherFilter,
  })

  const updateSettingsMutation = useUpdateReferralSettingsMutation()
  const disableTeacherMutation = useDisableTeacherReferralsMutation()
  const enableTeacherMutation = useEnableTeacherReferralsMutation()
  const updateTeacherMutation = useUpdateTeacherReferralSettingsMutation()
  const resetTeacherMutation = useResetTeacherReferralSettingsMutation()

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSaveSettings = async () => {
    try {
      const payload: UpdateReferralSettingsPayload = {
        referrals_enabled: formData.referrals_enabled,
        academic_weakness_enabled: formData.academic_weakness_enabled,
        behavioral_violation_enabled: formData.behavioral_violation_enabled,
        student_absence_enabled: formData.student_absence_enabled,
        daily_referral_cap: formData.daily_referral_cap,
        daily_per_student_cap: formData.daily_per_student_cap,
        weekly_referral_cap: formData.weekly_referral_cap,
        notify_on_create: formData.notify_on_create,
        notify_on_receive: formData.notify_on_receive,
        notify_on_complete: formData.notify_on_complete,
        notify_teacher_on_status_change: formData.notify_teacher_on_status_change,
        auto_notify_parent: formData.auto_notify_parent,
        parent_message_template: formData.parent_message_template,
      }
      await updateSettingsMutation.mutateAsync(payload)
      toast.success('تم حفظ الإعدادات بنجاح')
    } catch {
      toast.error('فشل حفظ الإعدادات')
    }
  }

  const handleDisableTeacher = async () => {
    if (!selectedTeacher || !disableReason.trim()) return
    try {
      await disableTeacherMutation.mutateAsync({
        teacherId: selectedTeacher.id,
        reason: disableReason,
      })
      toast.success(`تم إيقاف الإحالات للمعلم ${selectedTeacher.name}`)
      setShowDisableModal(false)
      setDisableReason('')
      setSelectedTeacher(null)
    } catch {
      toast.error('فشل إيقاف الإحالات')
    }
  }

  const handleEnableTeacher = async (teacher: TeacherWithSettings) => {
    try {
      await enableTeacherMutation.mutateAsync(teacher.id)
      toast.success(`تم تفعيل الإحالات للمعلم ${teacher.name}`)
    } catch {
      toast.error('فشل تفعيل الإحالات')
    }
  }

  const handleEditTeacher = (teacher: TeacherWithSettings) => {
    setSelectedTeacher(teacher)
    setEditFormData({
      daily_referral_cap: teacher.has_custom_settings ? String(teacher.daily_referral_cap) : '',
      daily_per_student_cap: teacher.has_custom_settings ? String(teacher.daily_per_student_cap) : '',
      weekly_referral_cap: teacher.weekly_referral_cap ? String(teacher.weekly_referral_cap) : '',
    })
    setShowEditModal(true)
  }

  const handleSaveTeacherSettings = async () => {
    if (!selectedTeacher) return
    try {
      await updateTeacherMutation.mutateAsync({
        teacherId: selectedTeacher.id,
        payload: {
          daily_referral_cap: editFormData.daily_referral_cap ? Number(editFormData.daily_referral_cap) : null,
          daily_per_student_cap: editFormData.daily_per_student_cap ? Number(editFormData.daily_per_student_cap) : null,
          weekly_referral_cap: editFormData.weekly_referral_cap ? Number(editFormData.weekly_referral_cap) : null,
        },
      })
      toast.success('تم حفظ إعدادات المعلم')
      setShowEditModal(false)
      setSelectedTeacher(null)
    } catch {
      toast.error('فشل حفظ الإعدادات')
    }
  }

  const handleResetTeacher = async (teacher: TeacherWithSettings) => {
    if (!confirm(`هل أنت متأكد من إعادة إعدادات ${teacher.name} للقيم الافتراضية؟`)) return
    try {
      await resetTeacherMutation.mutateAsync(teacher.id)
      toast.success('تم إعادة الإعدادات للقيم الافتراضية')
    } catch {
      toast.error('فشل إعادة الإعدادات')
    }
  }

  if (!isOpen) return null

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <h4 className="font-medium text-slate-900">تفعيل نظام الإحالات</h4>
          <p className="text-sm text-slate-500">السماح للمعلمين بإنشاء إحالات للطلاب</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.referrals_enabled ?? true}
            onChange={(e) => setFormData({ ...formData, referrals_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )

  const renderTypesTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 mb-4">حدد أنواع الإحالات المسموح بها في النظام</p>

      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <i className="bi bi-book text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">الضعف الدراسي</h4>
            <p className="text-sm text-slate-500">إحالة الطلاب ذوي الضعف الأكاديمي للموجه الطلابي</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.academic_weakness_enabled ?? true}
            onChange={(e) => setFormData({ ...formData, academic_weakness_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <i className="bi bi-exclamation-triangle text-red-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">المخالفات السلوكية</h4>
            <p className="text-sm text-slate-500">إحالة الطلاب المخالفين سلوكياً لوكيل شؤون الطلاب</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.behavioral_violation_enabled ?? true}
            onChange={(e) => setFormData({ ...formData, behavioral_violation_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <i className="bi bi-calendar-x text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-slate-900">غياب الطلاب</h4>
            <p className="text-sm text-slate-500">الإحالات التلقائية للطلاب الغائبين</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.student_absence_enabled ?? true}
            onChange={(e) => setFormData({ ...formData, student_absence_enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
        </label>
      </div>
    </div>
  )

  const renderLimitsTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <i className="bi bi-info-circle text-blue-600 text-lg mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">حول الحدود</h4>
            <p className="text-sm text-blue-700 mt-1">
              هذه الحدود تنطبق على جميع المعلمين بشكل افتراضي. يمكنك تخصيص حدود مختلفة لمعلمين محددين من تبويب "إعدادات المعلمين".
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الحد الأقصى للإحالات اليومية لكل معلم
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.daily_referral_cap ?? 10}
            onChange={(e) => setFormData({ ...formData, daily_referral_cap: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">عدد الإحالات التي يمكن للمعلم إنشاؤها يومياً</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الحد الأقصى للإحالات لكل طالب يومياً
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={formData.daily_per_student_cap ?? 3}
            onChange={(e) => setFormData({ ...formData, daily_per_student_cap: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">عدد الإحالات لنفس الطالب في اليوم الواحد</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            الحد الأقصى للإحالات الأسبوعية (اختياري)
          </label>
          <input
            type="number"
            min="0"
            max="500"
            value={formData.weekly_referral_cap ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                weekly_referral_cap: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="اتركه فارغاً لعدم التحديد"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">إجمالي الإحالات المسموحة للمعلم أسبوعياً</p>
        </div>
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 mb-4">تخصيص الإشعارات التلقائية للإحالات</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-900">إشعار عند إنشاء إحالة</h4>
            <p className="text-sm text-slate-500">إرسال إشعار للجهة المستهدفة عند إنشاء إحالة جديدة</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notify_on_create ?? true}
              onChange={(e) => setFormData({ ...formData, notify_on_create: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-900">إشعار عند استلام الإحالة</h4>
            <p className="text-sm text-slate-500">إرسال إشعار للمعلم عند استلام إحالته</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notify_on_receive ?? true}
              onChange={(e) => setFormData({ ...formData, notify_on_receive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-900">إشعار عند إكمال الإحالة</h4>
            <p className="text-sm text-slate-500">إرسال إشعار للمعلم عند إكمال معالجة إحالته</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notify_on_complete ?? true}
              onChange={(e) => setFormData({ ...formData, notify_on_complete: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-900">إشعار المعلم بتغيير الحالة</h4>
            <p className="text-sm text-slate-500">إشعار المعلم بأي تغيير في حالة الإحالة</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notify_teacher_on_status_change ?? true}
              onChange={(e) => setFormData({ ...formData, notify_teacher_on_status_change: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
          <div>
            <h4 className="font-medium text-slate-900">إشعار ولي الأمر تلقائياً</h4>
            <p className="text-sm text-slate-500">إرسال رسالة واتساب لولي الأمر عند إنشاء الإحالة</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_notify_parent ?? false}
              onChange={(e) => setFormData({ ...formData, auto_notify_parent: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderTeachersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="بحث عن معلم..."
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">جميع المعلمين</option>
          <option value="active">المفعّلين</option>
          <option value="disabled">الموقوفين</option>
          <option value="custom">لديهم إعدادات مخصصة</option>
        </select>
      </div>

      {teachersLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : teachers && teachers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-right py-3 px-2 font-medium text-slate-600">المعلم</th>
                <th className="text-center py-3 px-2 font-medium text-slate-600">الحالة</th>
                <th className="text-center py-3 px-2 font-medium text-slate-600">الحد اليومي</th>
                <th className="text-center py-3 px-2 font-medium text-slate-600">إحالات اليوم</th>
                <th className="text-center py-3 px-2 font-medium text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{teacher.name}</div>
                        {teacher.has_custom_settings && (
                          <span className="text-xs text-blue-600">إعدادات مخصصة</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {teacher.referrals_disabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                        <i className="bi bi-x-circle" />
                        موقوف
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                        <i className="bi bi-check-circle" />
                        مفعّل
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-medium">{teacher.daily_referral_cap}</td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`font-medium ${
                        teacher.today_referrals_count >= teacher.daily_referral_cap
                          ? 'text-red-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {teacher.today_referrals_count}
                    </span>
                    <span className="text-slate-400">/{teacher.daily_referral_cap}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEditTeacher(teacher)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="تعديل الإعدادات"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      {teacher.referrals_disabled ? (
                        <button
                          onClick={() => handleEnableTeacher(teacher)}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="تفعيل"
                        >
                          <i className="bi bi-check-circle" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher)
                            setShowDisableModal(true)
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="إيقاف"
                        >
                          <i className="bi bi-x-circle" />
                        </button>
                      )}
                      {teacher.has_custom_settings && (
                        <button
                          onClick={() => handleResetTeacher(teacher)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="إعادة للافتراضي"
                        >
                          <i className="bi bi-arrow-counterclockwise" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">لا يوجد معلمون</div>
      )}
    </div>
  )

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          قالب رسالة ولي الأمر
        </label>
        <textarea
          rows={6}
          value={formData.parent_message_template ?? ''}
          onChange={(e) => setFormData({ ...formData, parent_message_template: e.target.value })}
          placeholder="أدخل قالب الرسالة... استخدم {student_name} لاسم الطالب و {referral_type} لنوع الإحالة"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="mt-2 text-xs text-slate-500">
          <p className="font-medium mb-1">المتغيرات المتاحة:</p>
          <ul className="space-y-1">
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{student_name}'}</code> - اسم الطالب
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{referral_type}'}</code> - نوع الإحالة
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{school_name}'}</code> - اسم المدرسة
            </li>
            <li>
              <code className="bg-slate-200 px-1 rounded">{'{date}'}</code> - تاريخ الإحالة
            </li>
          </ul>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (settingsLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    switch (activeTab) {
      case 'general':
        return renderGeneralTab()
      case 'types':
        return renderTypesTab()
      case 'limits':
        return renderLimitsTab()
      case 'notifications':
        return renderNotificationsTab()
      case 'teachers':
        return renderTeachersTab()
      case 'templates':
        return renderTemplatesTab()
      default:
        return null
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col transform overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                <i className="bi bi-gear me-2 text-slate-600" />
                إعدادات الإحالات
              </h2>
              <p className="text-sm text-slate-500 mt-1">تخصيص إعدادات نظام الإحالات</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <i className="bi bi-x-lg text-slate-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 shrink-0">
            <div className="flex gap-1 overflow-x-auto py-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <i className={tab.icon} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              إغلاق
            </button>
            {activeTab !== 'teachers' && (
              <button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <span className="inline-block animate-spin me-2">
                      <i className="bi bi-arrow-repeat" />
                    </span>
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ الإعدادات'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disable Teacher Modal */}
      {showDisableModal && selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDisableModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">إيقاف الإحالات للمعلم</h3>
            <p className="text-sm text-slate-600 mb-4">
              سيتم إيقاف صلاحية إنشاء الإحالات للمعلم <strong>{selectedTeacher.name}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">سبب الإيقاف *</label>
              <textarea
                rows={3}
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="أدخل سبب إيقاف الإحالات..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDisableModal(false)
                  setDisableReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleDisableTeacher}
                disabled={!disableReason.trim() || disableTeacherMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {disableTeacherMutation.isPending ? 'جاري الإيقاف...' : 'إيقاف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {showEditModal && selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">تعديل إعدادات المعلم</h3>
            <p className="text-sm text-slate-600 mb-4">
              تعديل حدود الإحالات للمعلم <strong>{selectedTeacher.name}</strong>
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الحد اليومي</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.daily_referral_cap}
                  onChange={(e) => setEditFormData({ ...editFormData, daily_referral_cap: e.target.value })}
                  placeholder="اتركه فارغاً للقيمة الافتراضية"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الحد لكل طالب يومياً</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editFormData.daily_per_student_cap}
                  onChange={(e) => setEditFormData({ ...editFormData, daily_per_student_cap: e.target.value })}
                  placeholder="اتركه فارغاً للقيمة الافتراضية"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">الحد الأسبوعي</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={editFormData.weekly_referral_cap}
                  onChange={(e) => setEditFormData({ ...editFormData, weekly_referral_cap: e.target.value })}
                  placeholder="اتركه فارغاً لعدم التحديد"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveTeacherSettings}
                disabled={updateTeacherMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {updateTeacherMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

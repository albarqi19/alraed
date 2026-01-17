import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateTeacherMutation, useTeachersQuery } from '@/modules/admin/hooks'
import { useToast } from '@/shared/feedback/use-toast'
import type { StepComponentProps } from '../../types'
import type { StaffRole } from '@/modules/admin/types'

interface TeacherForm {
  name: string
  national_id: string
  phone: string
  role: StaffRole
}

const DEFAULT_TEACHER: TeacherForm = {
  name: '',
  national_id: '',
  phone: '',
  role: 'teacher',
}

const ROLES = [
  { value: 'teacher', label: 'معلم' },
  { value: 'deputy_teachers', label: 'وكيل المعلمين' },
  { value: 'deputy_students', label: 'وكيل الطلاب' },
  { value: 'administrative_staff', label: 'موظف إداري' },
  { value: 'student_counselor', label: 'الموجه الطلابي' },
  { value: 'learning_resources_admin', label: 'أمين مصادر التعلم' },
  { value: 'health_counselor', label: 'موجه صحي' },
]

export function TeachersAddStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [teacherForm, setTeacherForm] = useState<TeacherForm>(DEFAULT_TEACHER)
  const [addedTeachers, setAddedTeachers] = useState<Array<{ name: string; national_id: string }>>([])

  // جلب المعلمين الحاليين
  const { data: teachers = [] } = useTeachersQuery()

  // إنشاء معلم جديد
  const createMutation = useCreateTeacherMutation()

  const handleAddTeacher = async () => {
    if (!teacherForm.name.trim() || !teacherForm.national_id.trim()) {
      toast({ title: 'يرجى إدخال الاسم ورقم الهوية', type: 'error' })
      return
    }

    createMutation.mutate(
      {
        name: teacherForm.name.trim(),
        national_id: teacherForm.national_id.trim(),
        phone: teacherForm.phone.trim() || undefined,
        role: teacherForm.role,
      },
      {
        onSuccess: () => {
          setAddedTeachers((prev) => [
            ...prev,
            { name: teacherForm.name.trim(), national_id: teacherForm.national_id.trim() },
          ])
          setTeacherForm(DEFAULT_TEACHER)
          queryClient.invalidateQueries({ queryKey: ['onboarding', 'stats'] })
          toast({ title: 'تم إضافة المعلم بنجاح', type: 'success' })
        },
      },
    )
  }

  const totalTeachers = stats.teachers_count + addedTeachers.length
  const canProceed = totalTeachers > 0

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
        <h4 className="mb-2 font-semibold text-purple-800">
          <i className="bi bi-person-badge ml-2" />
          إضافة المعلمين
        </h4>
        <p className="text-sm text-purple-700">
          أضف المعلمين للنظام. سيتم إرسال كلمة المرور لهم تلقائياً عبر الواتساب إذا تم إدخال رقم الجوال.
        </p>
      </div>

      {/* Current Status */}
      {totalTeachers > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <i className="bi bi-people-fill text-xl" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">المعلمين في النظام</p>
              <p className="text-sm text-emerald-600">يوجد {totalTeachers.toLocaleString('ar-SA')} معلم حالياً</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="mb-4 font-semibold text-slate-800">
          <i className="bi bi-plus-circle ml-2 text-teal-500" />
          إضافة معلم جديد
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              اسم المعلم <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={teacherForm.name}
              onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="أدخل اسم المعلم"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              رقم الهوية <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={teacherForm.national_id}
              onChange={(e) => setTeacherForm((f) => ({ ...f, national_id: e.target.value }))}
              placeholder="أدخل رقم الهوية"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">رقم الجوال (اختياري)</label>
            <input
              type="tel"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="05xxxxxxxx"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              الدور الوظيفي <span className="text-rose-500">*</span>
            </label>
            <select
              value={teacherForm.role}
              onChange={(e) => setTeacherForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:border-teal-500 focus:outline-none"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAddTeacher}
            disabled={createMutation.isPending || !teacherForm.name.trim() || !teacherForm.national_id.trim()}
            className="button-primary"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري الإضافة...
              </>
            ) : (
              <>
                <i className="bi bi-plus-lg" />
                إضافة المعلم
              </>
            )}
          </button>
        </div>
      </div>

      {/* Added Teachers List */}
      {addedTeachers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-3 font-semibold text-slate-800">المعلمين المضافين في هذه الجلسة</h4>
          <div className="space-y-2">
            {addedTeachers.map((teacher, index) => (
              <div
                key={`${teacher.national_id}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3"
              >
                <i className="bi bi-check-circle-fill text-emerald-500" />
                <div>
                  <p className="font-medium text-slate-700">{teacher.name}</p>
                  <p className="text-xs text-slate-500">الهوية: {teacher.national_id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Teachers Preview */}
      {teachers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
          <h4 className="mb-3 font-semibold text-slate-700">المعلمين الحاليين ({teachers.length})</h4>
          <div className="flex flex-wrap gap-2">
            {teachers.slice(0, 10).map((teacher) => (
              <span key={teacher.id} className="rounded-full bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
                {teacher.name}
              </span>
            ))}
            {teachers.length > 10 && (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">
                +{teachers.length - 10} آخرين
              </span>
            )}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
        {/* Skip Button (للتجربة) */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-50"
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي (للتجربة)'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="button-primary"
        >
          {isCompleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left mr-2" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-amber-600">
          <i className="bi bi-exclamation-triangle ml-1" />
          يجب إضافة معلم واحد على الأقل للمتابعة
        </p>
      )}
    </div>
  )
}

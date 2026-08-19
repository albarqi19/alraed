import { ROLE_OPTIONS } from '@/modules/auth/constants/roles'
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

/**
 * كانت قائمةً محليّةً منفصلةً تنقصها `school_principal`، وتسمّي وكيلَ شؤون
 * المعلمين «وكيل المعلمين». ومدرسةٌ تُهيَّأ اليوم كانت لن ترى الأدوارَ الجديدة
 * عند إدخال كادرِها أوّلَ مرّة — وهي أسوأُ لحظةٍ لإخفائها.
 */
const ROLES = ROLE_OPTIONS

/** الباك يشترط هوية من عشر خانات رقمية بالضبط */
const NATIONAL_ID_LENGTH = 10

export function TeachersAddStep({ onComplete, onSkip, stats, isCompleting, isSkipping }: StepComponentProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [teacherForm, setTeacherForm] = useState<TeacherForm>(DEFAULT_TEACHER)

  // جلب المعلمين الحاليين
  const { data: teachers = [] } = useTeachersQuery()

  // إنشاء معلم جديد
  const createMutation = useCreateTeacherMutation()

  const trimmedName = teacherForm.name.trim()
  const nationalId = teacherForm.national_id.trim()
  const isNationalIdValid = new RegExp(`^\\d{${NATIONAL_ID_LENGTH}}$`).test(nationalId)
  const canSubmit = trimmedName.length > 0 && isNationalIdValid

  const handleAddTeacher = () => {
    if (!trimmedName) {
      toast({ title: 'أدخل اسم المعلم', type: 'error' })
      return
    }

    // التحقق محلياً يوفّر رحلة للخادم ويوضّح الشرط قبل الضغط لا بعده
    if (!isNationalIdValid) {
      toast({ title: `رقم الهوية يجب أن يكون ${NATIONAL_ID_LENGTH} أرقام`, type: 'error' })
      return
    }

    createMutation.mutate(
      {
        name: trimmedName,
        national_id: nationalId,
        phone: teacherForm.phone.trim() || undefined,
        role: teacherForm.role,
      },
      {
        onSuccess: () => {
          setTeacherForm(DEFAULT_TEACHER)
          // قائمة المعلمين هي مصدر الحقيقة الوحيد للعدّ — الاحتفاظ بعدّاد محلي
          // موازٍ كان يُنتج رقماً مضاعفاً متى أُعيد جلب الحالة.
          queryClient.invalidateQueries({ queryKey: ['onboarding'] })
        },
      },
    )
  }

  const totalTeachers = Math.max(stats.teachers_count, teachers.length)
  const canProceed = totalTeachers > 0

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="ws-alert ws-alert--info ws-alert--boxed items-start">
        <i className="bi bi-person-badge mt-[1px]" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-bold">إضافة المعلمين</span>
          <span className="text-xs font-normal" style={{ color: 'var(--color-text-secondary)' }}>
            أضف المعلمين للنظام. سيتم إرسال كلمة المرور لهم تلقائياً عبر الواتساب إذا تم إدخال رقم الجوال.
          </span>
        </div>
      </div>

      {/* Current Status */}
      {totalTeachers > 0 && (
        <div className="ws-alert ws-alert--success ws-alert--boxed items-center">
          <i className="bi bi-people-fill text-base" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-bold">المعلمين في النظام</span>
            <span className="text-xs font-normal">
              يوجد {totalTeachers.toLocaleString('ar-SA-u-nu-latn')} معلم حالياً
            </span>
          </div>
        </div>
      )}

      {/* Add Teacher Form */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <span className="ws-panel__title">
            <i className="bi bi-plus-circle" style={{ color: 'var(--color-primary-dark)' }} />
            إضافة معلم جديد
          </span>
        </div>

        <div className="ws-panel__body">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ws-field">
              <label className="ws-label">
                اسم المعلم <span style={{ color: 'var(--ws-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={teacherForm.name}
                onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="أدخل اسم المعلم"
                className="ws-input w-full"
              />
            </div>
            <div className="ws-field">
              <label className="ws-label">
                رقم الهوية <span style={{ color: 'var(--ws-red)' }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={NATIONAL_ID_LENGTH}
                value={teacherForm.national_id}
                onChange={(e) =>
                  setTeacherForm((f) => ({
                    ...f,
                    national_id: e.target.value.replace(/\D/g, '').slice(0, NATIONAL_ID_LENGTH),
                  }))
                }
                placeholder={'٠'.repeat(NATIONAL_ID_LENGTH)}
                className="ws-input w-full"
                dir="ltr"
                aria-invalid={nationalId.length > 0 && !isNationalIdValid}
              />
              <span
                className="text-[10.5px]"
                style={{
                  color:
                    nationalId.length > 0 && !isNationalIdValid
                      ? 'var(--ws-red)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {NATIONAL_ID_LENGTH} أرقام — وهو أيضاً اسم المستخدم عند الدخول
              </span>
            </div>
            <div className="ws-field">
              <label className="ws-label">رقم الجوال (اختياري)</label>
              <input
                type="tel"
                value={teacherForm.phone}
                onChange={(e) => setTeacherForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="05xxxxxxxx"
                className="ws-input w-full"
                dir="ltr"
              />
            </div>
            <div className="ws-field">
              <label className="ws-label">
                الدور الوظيفي <span style={{ color: 'var(--ws-red)' }}>*</span>
              </label>
              <select
                value={teacherForm.role}
                onChange={(e) => setTeacherForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
                className="ws-select w-full"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAddTeacher}
              disabled={createMutation.isPending || !canSubmit}
              className="ws-btn ws-btn--primary"
            >
              {createMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
      </div>

      {/* المعلمون المسجّلون — قائمة الخادم وحدها، بلا عدّاد محلي موازٍ */}
      {teachers.length > 0 && (
        <div className="ws-panel">
          <div className="ws-panel__head">
            <span className="ws-panel__title">المعلمون المسجّلون</span>
            <span className="ws-count">{teachers.length}</span>
          </div>
          <div className="ws-panel__body flex flex-wrap gap-1.5">
            {teachers.slice(0, 12).map((teacher) => (
              <span key={teacher.id} className="ws-chip">
                {teacher.name}
              </span>
            ))}
            {teachers.length > 12 && <span className="ws-chip">+{teachers.length - 12} آخرين</span>}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div
        className="flex items-center justify-between border-t pt-4"
        style={{ borderColor: 'var(--color-hairline)' }}
      >
        {/* تخطي — الخطوات الإلزامية تمر بتأكيد من المعالج */}
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping || isCompleting}
          className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {isSkipping ? 'جاري التخطي...' : 'تخطي وإكمالها لاحقاً'}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!canProceed || isCompleting}
          className="ws-btn ws-btn--primary"
        >
          {isCompleting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              جاري الحفظ...
            </>
          ) : (
            <>
              التالي
              <i className="bi bi-arrow-left" />
            </>
          )}
        </button>
      </div>

      {!canProceed && (
        <div className="ws-alert ws-alert--warn ws-alert--boxed justify-center">
          <i className="bi bi-exclamation-triangle" />
          يجب إضافة معلم واحد على الأقل للمتابعة
        </div>
      )}
    </div>
  )
}

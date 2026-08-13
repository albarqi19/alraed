/* ======================================================
   محرِّر الإسناد — من يرى هذا النموذج فعلاً
   ------------------------------------------------------
   كانت الواجهة تعرض خمسة خيارات جمهورٍ بلا منتقٍ خلفها، وتُرسل
   `assignments: []` دائماً — فأربعةٌ من خمسة تُنتج نموذجاً لا يراه
   أحد بلا رسالة. هنا يُختار المستهدَفون فعلاً، ويُعرض عددُ من
   سيصله النموذج قبل الحفظ لا بعده.
   ====================================================== */
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Search, Users, UserX } from 'lucide-react'
import { useGradesWithClassesQuery, useStudentsQuery } from '@/modules/admin/hooks'
import type { StudentRecord } from '@/modules/admin/types'
import type { FormAssignmentScope } from '@/modules/forms/types'
import { WsAlert, WsBtn, WsEmpty, WsField, WsInput, WsSelect, WsSpinner } from '@/shared/workspace'
import { AUDIENCE_OPTIONS, type AudienceSelection } from './designer-model'

/** سقفُ ما يُرسم من الطلاب دفعةً: قائمةٌ بألفِ صفٍّ تقتل الإطار لا تفيد */
const STUDENT_RENDER_CAP = 200

interface FormAssignmentEditorProps {
  audience: FormAssignmentScope
  selection: AudienceSelection
  disabled?: boolean
  error?: string
  onAudienceChange: (audience: FormAssignmentScope) => void
  onSelectionChange: (selection: AudienceSelection) => void
}

export function FormAssignmentEditor({
  audience,
  selection,
  disabled = false,
  error,
  onAudienceChange,
  onSelectionChange,
}: FormAssignmentEditorProps) {
  const needsTargets = audience !== 'all_students'
  const gradesQuery = useGradesWithClassesQuery({ enabled: needsTargets })
  // الطلاب يُجلَبون لكل جمهورٍ محدَّد لا لوضع اختيار الطلاب وحده: عليهم يُحسب
  // «كم سيصله النموذج»، وهو الرقم الذي يكشف الإسناد الميّت قبل الحفظ.
  const studentsQuery = useStudentsQuery({ enabled: needsTargets })

  const students = useMemo<StudentRecord[]>(() => studentsQuery.data ?? [], [studentsQuery.data])

  const reach = useMemo(() => {
    if (audience === 'all_students') return students.length || null
    if (students.length === 0) return null

    switch (audience) {
      case 'grade':
        return students.filter((student) => selection.grades.includes(student.grade)).length
      case 'class':
        return students.filter((student) =>
          selection.classes.some(
            (item) => item.grade === student.grade && item.class_name === student.class_name,
          ),
        ).length
      case 'student':
      case 'group':
        return students.filter((student) => selection.studentIds.includes(student.id)).length
      default:
        return null
    }
  }, [audience, selection, students])

  const activeOption = AUDIENCE_OPTIONS.find((option) => option.value === audience)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="ws-label">الجمهور المستهدف</span>
        <div className="ws-seg" style={{ flexWrap: 'wrap' }}>
          {AUDIENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ws-seg__btn ${audience === option.value ? 'is-active' : ''}`}
              onClick={() => onAudienceChange(option.value)}
              disabled={disabled}
              title={option.hint}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activeOption && (
          <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: '2px 0 0' }}>{activeOption.hint}</p>
        )}
      </div>

      {error && (
        <WsAlert tone="error" boxed>
          {error}
        </WsAlert>
      )}

      {needsTargets && (
        <>
          {gradesQuery.isLoading || studentsQuery.isLoading ? (
            <WsEmpty loading>جارٍ تحميل الصفوف والطلاب…</WsEmpty>
          ) : (
            <>
              {(audience === 'grade' || audience === 'class') && (
                <GradeClassPicker
                  audience={audience}
                  selection={selection}
                  disabled={disabled}
                  grades={gradesQuery.data ?? []}
                  onSelectionChange={onSelectionChange}
                />
              )}

              {(audience === 'student' || audience === 'group') && (
                <StudentPicker
                  students={students}
                  selection={selection}
                  disabled={disabled}
                  onSelectionChange={onSelectionChange}
                />
              )}
            </>
          )}
        </>
      )}

      <ReachLine audience={audience} reach={reach} loading={needsTargets && studentsQuery.isLoading} />
    </div>
  )
}

function ReachLine({
  audience,
  reach,
  loading,
}: {
  audience: FormAssignmentScope
  reach: number | null
  loading: boolean
}) {
  if (loading) {
    return (
      <span className="ws-fact">
        <WsSpinner style={{ width: 12, height: 12, borderWidth: 1.5 }} /> جارٍ حساب المستلمين…
      </span>
    )
  }

  if (reach === null) {
    return null
  }

  if (reach === 0) {
    return (
      <span className="ws-fact" style={{ color: 'var(--ws-red)' }}>
        <UserX style={{ color: 'var(--ws-red)' }} /> لا يطابق اختيارَك أيُّ طالب — النموذج لن يظهر لأحد
      </span>
    )
  }

  return (
    <span className="ws-fact">
      <Users /> سيصل النموذج إلى <b>{reach}</b> {reach === 1 ? 'طالب' : 'طالباً'}
      {audience === 'all_students' ? ' (كل طلاب المدرسة)' : ''}
    </span>
  )
}

function TargetChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="ws-chip"
      onClick={onClick}
      disabled={disabled}
      style={{
        cursor: 'pointer',
        background: active ? 'var(--ws-accent-soft)' : undefined,
        borderColor: active ? 'var(--ws-accent)' : undefined,
        color: active ? 'var(--ws-accent)' : undefined,
      }}
    >
      {children}
    </button>
  )
}

function GradeClassPicker({
  audience,
  selection,
  grades,
  disabled,
  onSelectionChange,
}: {
  audience: 'grade' | 'class'
  selection: AudienceSelection
  grades: Array<{ grade: string; classes: string[] }>
  disabled?: boolean
  onSelectionChange: (selection: AudienceSelection) => void
}) {
  if (grades.length === 0) {
    return <WsEmpty icon={UserX}>لا صفوف مسجّلة في المدرسة بعد.</WsEmpty>
  }

  const toggleGrade = (grade: string) => {
    const next = selection.grades.includes(grade)
      ? selection.grades.filter((item) => item !== grade)
      : [...selection.grades, grade]
    onSelectionChange({ ...selection, grades: next })
  }

  const toggleClass = (grade: string, className: string) => {
    const exists = selection.classes.some(
      (item) => item.grade === grade && item.class_name === className,
    )
    const next = exists
      ? selection.classes.filter((item) => !(item.grade === grade && item.class_name === className))
      : [...selection.classes, { grade, class_name: className }]
    onSelectionChange({ ...selection, classes: next })
  }

  if (audience === 'grade') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {grades.map((item) => (
          <TargetChip
            key={item.grade}
            active={selection.grades.includes(item.grade)}
            disabled={disabled}
            onClick={() => toggleGrade(item.grade)}
          >
            {item.grade}
          </TargetChip>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {grades.map((item) => (
        <div key={item.grade} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 92 }}>{item.grade}</span>
          {item.classes.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>لا فصول</span>
          ) : (
            item.classes.map((className) => (
              <TargetChip
                key={className}
                active={selection.classes.some(
                  (entry) => entry.grade === item.grade && entry.class_name === className,
                )}
                disabled={disabled}
                onClick={() => toggleClass(item.grade, className)}
              >
                {className}
              </TargetChip>
            ))
          )}
        </div>
      ))}
    </div>
  )
}

function StudentPicker({
  students,
  selection,
  disabled,
  onSelectionChange,
}: {
  students: StudentRecord[]
  selection: AudienceSelection
  disabled?: boolean
  onSelectionChange: (selection: AudienceSelection) => void
}) {
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [selectedOnly, setSelectedOnly] = useState(false)

  const grades = useMemo(
    () => [...new Set(students.map((student) => student.grade).filter(Boolean))],
    [students],
  )

  const filtered = useMemo(() => {
    const needle = query.trim()
    return students.filter((student) => {
      if (grade && student.grade !== grade) return false
      if (selectedOnly && !selection.studentIds.includes(student.id)) return false
      if (!needle) return true
      return student.name.includes(needle) || (student.national_id ?? '').includes(needle)
    })
  }, [students, query, grade, selectedOnly, selection.studentIds])

  const toggleStudent = (id: number) => {
    const next = selection.studentIds.includes(id)
      ? selection.studentIds.filter((item) => item !== id)
      : [...selection.studentIds, id]
    onSelectionChange({ ...selection, studentIds: next })
  }

  const visible = filtered.slice(0, STUDENT_RENDER_CAP)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <WsField label="بحث بالاسم أو الهوية" grow>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                insetInlineStart: 8,
                top: 8,
                width: 14,
                height: 14,
                color: 'var(--ws-text-2)',
                pointerEvents: 'none',
              }}
            />
            <WsInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="اكتب اسماً…"
              disabled={disabled}
              style={{ width: '100%', paddingInlineStart: 28 }}
            />
          </div>
        </WsField>
        <WsField label="الصف">
          <WsSelect value={grade} onChange={(event) => setGrade(event.target.value)} disabled={disabled}>
            <option value="">كل الصفوف</option>
            {grades.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </WsSelect>
        </WsField>
        <WsBtn size="sm" onClick={() => setSelectedOnly((previous) => !previous)} disabled={disabled}>
          {selectedOnly ? 'عرض الجميع' : `المختارون (${selection.studentIds.length})`}
        </WsBtn>
        {selection.studentIds.length > 0 && (
          <WsBtn
            size="sm"
            onClick={() => onSelectionChange({ ...selection, studentIds: [] })}
            disabled={disabled}
          >
            مسح الاختيار
          </WsBtn>
        )}
      </div>

      {visible.length === 0 ? (
        <WsEmpty icon={UserX}>لا طالب يطابق البحث.</WsEmpty>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 6,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {visible.map((student) => {
            const checked = selection.studentIds.includes(student.id)
            return (
              <label key={student.id} className={`ws-pick ${checked ? 'is-checked' : ''}`}>
                <span style={{ minWidth: 0 }}>
                  <span className="ws-pick__name">{student.name}</span>
                  <span className="ws-pick__sub">
                    {student.grade} · {student.class_name}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleStudent(student.id)}
                />
              </label>
            )
          })}
        </div>
      )}

      {filtered.length > visible.length && (
        <p style={{ fontSize: 11, color: 'var(--ws-text-2)', margin: 0 }}>
          يُعرض {visible.length} من {filtered.length} — ضيّق البحث للوصول إلى البقية.
        </p>
      )}
    </div>
  )
}

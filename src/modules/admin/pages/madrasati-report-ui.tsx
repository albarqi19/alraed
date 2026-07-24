import { useMemo } from 'react'
import { TONES } from '@/shared/workspace'
import type { MadrasatiCourse, MadrasatiTeacherRanking } from '../madrasati/types'

/* ═══════════════════════════════════════════════════════════
   وحدات تقرير مدرستي — «مِشط النصاب»
   الوحدة الذرّية في ذهن المدير هي (معلم × صف × مادة). والصفحة تُجبره
   على قراءة إجماليات المعلم فتسحق خمسة فصول في رقم واحد. المِشط
   يردّها: سنٌّ لكل مقرر، وصمتُ الصف يُقرأ بالعين.
   ═══════════════════════════════════════════════════════════ */

/** مقرَّر صامت: له طلاب ولا واجب واحد */
export const isSilent = (c: MadrasatiCourse) => c.homework === 0 && c.students > 0

export interface SchoolScale {
  hwMax: number
  stMax: number
}

export function schoolScale(teachers: MadrasatiTeacherRanking[]): SchoolScale {
  let hwMax = 1
  let stMax = 1
  for (const t of teachers) {
    for (const c of t.courses ?? []) {
      if (c.homework > hwMax) hwMax = c.homework
      if (c.students > stMax) stMax = c.students
    }
  }
  return { hwMax, stMax }
}

/** ★ مِشط النصاب — سنٌّ لكل مقرر، الارتفاع واجبات والعرض طلاب، والصمت أحمر */
export function DutyComb({ courses, scale }: { courses: MadrasatiCourse[]; scale: SchoolScale }) {
  const sorted = useMemo(
    () => [...courses].sort((a, b) => b.homework - a.homework),
    [courses],
  )

  if (sorted.length === 0) {
    return <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>—</span>
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: 2,
        height: 24,
        padding: '0 4px',
        background: TONES.gray.bg,
        borderRadius: 4,
      }}
    >
      {sorted.map((c, i) => {
        const silent = isSilent(c)
        const empty = c.homework === 0 && c.students === 0
        // الارتفاع كمّية (واجبات) — تُقاس بالارتفاع ولا تُلوّن
        const h = c.homework > 0 ? Math.min(24, Math.max(4, Math.round((c.homework / scale.hwMax) * 24))) : 3
        // العرض كمّية ثانية (طلاب ذلك المقرر وحده)
        const w = 5 + Math.round((c.students / scale.stMax) * 9)
        // المحور اللوني الوحيد: الصمت
        const color = silent ? TONES.red.tx : empty ? TONES.gray.bd : TONES.gray.tx
        return (
          <span
            key={i}
            title={`${c.grade} · ${c.subject} — ${c.homework} واجب · ${c.students} طالب`}
            style={{
              width: w,
              height: h,
              borderRadius: '2px 2px 0 0',
              background: color,
              flexShrink: 0,
            }}
          />
        )
      })}
    </span>
  )
}

export interface TeacherSilence {
  silentCourses: number
  silentSeats: number
  hasNoHomework: boolean
}

export function teacherSilence(teacher: MadrasatiTeacherRanking): TeacherSilence {
  const courses = teacher.courses ?? []
  let silentCourses = 0
  let silentSeats = 0
  for (const c of courses) {
    if (isSilent(c)) {
      silentCourses += 1
      silentSeats += c.students
    }
  }
  return {
    silentCourses,
    silentSeats,
    hasNoHomework: courses.length > 0 && courses.every((c) => c.homework === 0),
  }
}

export interface SubjectSilence {
  subject: string
  total: number
  silent: number
  silentSeats: number
  teachers: number
}

/** تجميع المواد بالصمت — مشتقّ كله في العميل من courses */
export function subjectSilenceMap(teachers: MadrasatiTeacherRanking[]): SubjectSilence[] {
  const map = new Map<string, { total: number; silent: number; silentSeats: number; teachers: Set<string> }>()
  for (const t of teachers) {
    for (const c of t.courses ?? []) {
      if (!map.has(c.subject)) map.set(c.subject, { total: 0, silent: 0, silentSeats: 0, teachers: new Set() })
      const e = map.get(c.subject)!
      e.total += 1
      e.teachers.add(t.teacher_id)
      if (isSilent(c)) {
        e.silent += 1
        e.silentSeats += c.students
      }
    }
  }
  return [...map.entries()]
    .map(([subject, e]) => ({
      subject,
      total: e.total,
      silent: e.silent,
      silentSeats: e.silentSeats,
      teachers: e.teachers.size,
    }))
    .sort((a, b) => b.silentSeats - a.silentSeats)
}

export const arNum = (n: number) => n.toLocaleString('ar-SA-u-nu-latn')

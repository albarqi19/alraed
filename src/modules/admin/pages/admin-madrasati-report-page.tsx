import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Armchair,
  BookOpen,
  Clock,
  FileCheck,
  GraduationCap,
  RefreshCw,
  Search,
  Users,
  VolumeX,
  X,
} from 'lucide-react'
import { useMadrasatiSchoolMetrics } from '../madrasati/hooks'
import type { MadrasatiTeacherRanking } from '../madrasati/types'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  DutyComb,
  schoolScale,
  teacherSilence,
  subjectSilenceMap,
  isSilent,
  arNum,
} from './madrasati-report-ui'

type StatusFilter = 'all' | 'has_silent' | 'no_homework'

export function AdminMadrasatiReportPage() {
  const { teacherId } = useParams<{ teacherId?: string }>()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const { data: metrics, isLoading, isError, refetch } = useMadrasatiSchoolMetrics()

  const teachers = useMemo(() => metrics?.teacher_rankings?.all_teachers ?? [], [metrics])
  const scale = useMemo(() => schoolScale(teachers), [teachers])
  const subjects = useMemo(() => subjectSilenceMap(teachers), [teachers])

  const facts = useMemo(() => {
    let totalCourses = 0
    let silentCourses = 0
    let silentSeats = 0
    for (const t of teachers) {
      for (const c of t.courses ?? []) {
        totalCourses += 1
        if (isSilent(c)) {
          silentCourses += 1
          silentSeats += c.students
        }
      }
    }
    return { totalCourses, silentCourses, silentSeats }
  }, [teachers])

  const filtered = useMemo(() => {
    let list = teachers
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((t) => t.teacher_name.toLowerCase().includes(q))
    if (selectedSubject) {
      list = list.filter((t) => (t.courses ?? []).some((c) => c.subject === selectedSubject))
    }
    if (statusFilter === 'has_silent') {
      list = list.filter((t) => teacherSilence(t).silentCourses > 0)
    } else if (statusFilter === 'no_homework') {
      list = list.filter((t) => teacherSilence(t).hasNoHomework)
    }
    return list
  }, [teachers, search, selectedSubject, statusFilter])

  const selectedTeacher = useMemo(
    () => (teacherId ? teachers.find((t) => t.teacher_id === teacherId) ?? null : null),
    [teachers, teacherId],
  )

  const silentTeacherCount = useMemo(
    () => teachers.filter((t) => teacherSilence(t).silentCourses > 0).length,
    [teachers],
  )
  const noHwCount = useMemo(
    () => teachers.filter((t) => teacherSilence(t).hasNoHomework).length,
    [teachers],
  )

  if (isError) {
    return (
      <WsPage>
        <WsHeader title="تقرير مدرستي" />
        <WsLayout>
          <WsMain>
            <WsBlock padded>
              <WsAlert tone="error" boxed>
                تعذّر تحميل بيانات مدرستي.
                <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>إعادة المحاولة</WsBtn>
              </WsAlert>
            </WsBlock>
          </WsMain>
        </WsLayout>
      </WsPage>
    )
  }

  const o = metrics?.overview
  const hw = metrics?.homework_metrics

  return (
    <WsPage>
      <WsHeader
        title="تقرير مدرستي"
        actions={<WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => void refetch()} />}
        facts={
          <>
            <WsFact icon={Users} label="معلم">{arNum(o?.total_teachers ?? 0)}</WsFact>
            <WsFact icon={BookOpen} label="مقرر">{arNum(facts.totalCourses || (o?.total_subjects ?? 0))}</WsFact>
            <WsFact icon={VolumeX} label="مقرر صامت">
              <span style={{ color: facts.silentCourses > 0 ? TONES.red.tx : undefined }}>
                {arNum(facts.silentCourses)}
              </span>
            </WsFact>
            <WsFact icon={Armchair} label="مقعد صامت">
              <span style={{ color: facts.silentSeats > 0 ? TONES.red.tx : undefined }}>
                {arNum(facts.silentSeats)}
              </span>
            </WsFact>
            <WsFact icon={FileCheck} label="واجب · تصحيح">
              {arNum(hw?.total_homework ?? 0)} · {arNum(hw?.total_corrected ?? 0)}
            </WsFact>
            {metrics?.last_extraction && (
              <WsFact icon={Clock} label="آخر استيراد">
                {new Date(metrics.last_extraction).toLocaleDateString('ar-SA')}
              </WsFact>
            )}
          </>
        }
      >
        <ToneChip tone={TONES.gray}>مدرستي — منصة خارجية</ToneChip>
      </WsHeader>

      <WsToolbar>
        <WsField label="بحث" htmlFor="mr-q" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              id="mr-q"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اسم معلم"
              style={{ width: '100%', paddingInlineStart: 26 }}
            />
            <Search style={{ width: 13, height: 13, position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ws-text-2)', pointerEvents: 'none' }} />
          </div>
        </WsField>
        <WsField label="الحالة">
          <div className="ws-seg">
            {([
              ['all', 'الكل'],
              ['has_silent', `له مقرر صامت (${silentTeacherCount})`],
              ['no_homework', `بلا واجب إطلاقاً (${noHwCount})`],
            ] as Array<[StatusFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ws-seg__btn ${statusFilter === value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </WsField>
      </WsToolbar>

      <WsLayout>
        {/* المواد — مرتّبة بالمقاعد الصامتة */}
        <WsSideCol side="start" title="المواد" icon={BookOpen} storageKey="ws:madrasati:subjects" width={224}>
          <WsBlock fill scroll>
            <div style={{ padding: 8 }}>
              <button
                type="button"
                className={`ws-pick ${selectedSubject === null ? 'is-checked' : ''}`}
                onClick={() => setSelectedSubject(null)}
                style={{ width: '100%', textAlign: 'right', marginBottom: 4 }}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="ws-pick__name">كل المواد</span>
                  <span className="ws-pick__sub">{facts.totalCourses} مقرر</span>
                </span>
              </button>
              {subjects.map((s) => (
                <button
                  key={s.subject}
                  type="button"
                  className={`ws-pick ${selectedSubject === s.subject ? 'is-checked' : ''}`}
                  onClick={() => setSelectedSubject((prev) => (prev === s.subject ? null : s.subject))}
                  style={{ width: '100%', textAlign: 'right', marginBottom: 2 }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="ws-pick__name">{s.subject}</span>
                    <span className="ws-pick__sub">
                      {s.total} مقرر · {s.teachers} معلماً
                    </span>
                  </span>
                  {s.silent > 0 && <ToneChip tone={TONES.red}>{s.silent}</ToneChip>}
                </button>
              ))}
            </div>
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <WsBlock fill scroll title="المعلمون" icon={Users} count={filtered.length}>
            {isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : teachers.length === 0 ? (
              <WsEmpty icon={Users}>لا بيانات مدرستي مستوردة</WsEmpty>
            ) : filtered.length === 0 ? (
              <WsEmpty icon={Users}>لا معلمين مطابقين</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th style={{ width: 150 }}>مِشط النصاب</th>
                    <th style={{ width: 96 }}>مقاعد صامتة</th>
                    <th style={{ width: 64 }}>الدرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((teacher) => {
                    const sil = teacherSilence(teacher)
                    return (
                      <tr
                        key={teacher.teacher_id}
                        className="is-clickable"
                        onClick={() => navigate(`/admin/madrasati-report/${teacher.teacher_id}`)}
                        style={sil.hasNoHomework ? { background: TONES.red.bg } : undefined}
                      >
                        <td>
                          <span style={{ fontWeight: 600 }}>{teacher.teacher_name}</span>
                          <span className="ws-cell-sub">{teacher.courses?.length ?? teacher.subjects_count} مقرر</span>
                        </td>
                        <td>
                          <DutyComb courses={teacher.courses ?? []} scale={scale} />
                        </td>
                        <td>
                          {sil.silentSeats > 0 ? (
                            <span style={{ color: TONES.red.tx, fontWeight: 700 }}>
                              {arNum(sil.silentSeats)}
                              <span style={{ fontSize: 10, fontWeight: 400 }}> · {sil.silentCourses}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ws-text-2)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <b>{Math.round(teacher.score)}</b>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        {/* تفاصيل المعلم — يُحلّ في العمود على نفس الصفحة (ربط عميق، صفر طلب) */}
        {selectedTeacher && (
          <WsSideCol side="end" title="تفاصيل المعلم" icon={GraduationCap} storageKey="ws:madrasati:detail" width={340}>
            <WsBlock fill scroll>
              <TeacherDetail teacher={selectedTeacher} onClose={() => navigate('/admin/madrasati-report')} />
            </WsBlock>
          </WsSideCol>
        )}
      </WsLayout>
    </WsPage>
  )
}

function TeacherDetail({ teacher, onClose }: { teacher: MadrasatiTeacherRanking; onClose: () => void }) {
  const courses = [...(teacher.courses ?? [])].sort((a, b) => b.students - a.students)
  const sil = teacherSilence(teacher)

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{teacher.teacher_name}</h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ws-text-2)' }}>الدرجة {Math.round(teacher.score)}</p>
        </div>
        <WsIconBtn icon={X} label="إغلاق" onClick={onClose} />
      </div>

      {sil.silentCourses > 0 && (
        <WsAlert tone="error" boxed icon={VolumeX}>
          {sil.silentCourses} مقرر صامت — {arNum(sil.silentSeats)} طالباً بلا واجب واحد.
        </WsAlert>
      )}

      <WsFactsList>
        <WsFactRow label="واجبات">{arNum(teacher.homework_count)}</WsFactRow>
        <WsFactRow label="تصحيحات">{arNum(teacher.homework_corrected)}</WsFactRow>
        <WsFactRow label="اختبارات">{arNum(teacher.tests_count)}</WsFactRow>
        <WsFactRow label="أنشطة">{arNum(teacher.activities_count)}</WsFactRow>
        <WsFactRow label="إثراءات">{arNum(teacher.enrichments_count)}</WsFactRow>
      </WsFactsList>

      <p className="ws-label" style={{ margin: '12px 0 6px' }}>المقرَّرات ({courses.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {courses.map((c, i) => {
          const silent = isSilent(c)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 9px',
                borderRadius: 7,
                border: '1px solid var(--ws-hairline)',
                background: silent ? TONES.red.bg : undefined,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>{c.subject}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                  {c.grade} · {arNum(c.students)} طالباً
                </span>
              </span>
              {silent ? (
                <ToneChip tone={TONES.red}>صامت</ToneChip>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--ws-text-2)', whiteSpace: 'nowrap' }}>
                  {c.homework} واجب · {c.corrected} مُصحَّح
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

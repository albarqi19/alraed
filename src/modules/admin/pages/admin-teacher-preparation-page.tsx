import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Link2,
  RefreshCw,
  Search,
  Send,
  Settings,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/auth-store'
import { useToast } from '@/shared/feedback/use-toast'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsLayout,
  WsMain,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  BellComb,
  bellScale,
  teacherPrepMetrics,
  isSnapshotLive,
  isoToMinutes,
  nowMinutes,
  minLabel,
  type BellPeriod,
  type PrepLesson,
} from './teacher-prep-ui'

interface LinkedUser {
  id: number
  name: string
  phone: string | null
  has_phone: boolean
}

interface Lesson extends PrepLesson {
  day: string
  grade: string | null
  notification_sent_at?: string | null
}

interface TeacherPrep {
  teacher_id: string
  teacher_name: string
  is_linked: boolean
  linked_user: LinkedUser | null
  notification_sent: boolean
  lessons: Lesson[]
}

interface PrepResponse {
  data: TeacherPrep[]
  date: string
  weekday: string | null
  bell: BellPeriod[]
  extracted_at: string | null
}

const API = import.meta.env.VITE_API_BASE_URL

export function AdminTeacherPreparationPage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [filter, setFilter] = useState<'all' | 'salvageable' | 'missed'>('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-preparations', selectedDate],
    queryFn: async (): Promise<PrepResponse> => {
      const schoolId = user?.school_id ? String(user.school_id) : ''
      const url = selectedDate
        ? `${API}/attendance/teacher-preparation?date=${selectedDate}`
        : `${API}/attendance/teacher-preparation`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-School-Id': schoolId },
      })
      if (!res.ok) throw new Error('فشل تحميل بيانات التحضير')
      return res.json()
    },
    enabled: !!token && !!user?.school_id,
    refetchInterval: 60_000,
  })

  const sendNotifications = useMutation({
    mutationFn: async () => {
      const schoolId = user?.school_id ? String(user.school_id) : ''
      const res = await fetch(`${API}/attendance/teacher-preparation/send-notifications?date=${selectedDate}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-School-Id': schoolId },
      })
      if (!res.ok) throw new Error('فشل إرسال الإشعارات')
      return res.json()
    },
    onSuccess: (result) => {
      if (result.queued > 0) toast({ title: `تم جدولة ${result.queued} إشعار`, type: 'success' })
      else toast({ title: result.message || 'لا إشعارات للإرسال', type: 'info' })
      if (result.skipped > 0) toast({ title: `تُخطّي ${result.skipped} معلم`, type: 'warning' })
      queryClient.invalidateQueries({ queryKey: ['teacher-preparations'] })
    },
    onError: () => toast({ title: 'فشل إرسال الإشعارات', type: 'error' }),
  })

  const teachers = useMemo(() => data?.data ?? [], [data])
  const bell = useMemo(() => data?.bell ?? [], [data])
  const scale = useMemo(() => bellScale(bell), [bell])
  const nowMin = nowMinutes()
  const extractedMin = isoToMinutes(data?.extracted_at)

  const live = useMemo(
    () => (data ? isSnapshotLive(data.weekday, data.date, new Date().toLocaleDateString('en-CA')) : false),
    [data],
  )

  // الحصص في الحقائق، المعلمون في الفلتر — مقامان منفصلان
  const facts = useMemo(() => {
    let salvageableLessons = 0
    let missedLessons = 0
    let salvageableTeachers = 0
    let missedTeachers = 0
    for (const t of teachers) {
      const m = teacherPrepMetrics(t.lessons, bell, nowMin, live)
      salvageableLessons += m.salvageable
      missedLessons += m.missed
      if (m.salvageable > 0) salvageableTeachers += 1
      if (m.missed > 0) missedTeachers += 1
    }
    return { salvageableLessons, missedLessons, salvageableTeachers, missedTeachers }
  }, [teachers, bell, nowMin, live])

  const filtered = useMemo(() => {
    let list = teachers
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((t) => t.teacher_name.toLowerCase().includes(q))
    if (filter !== 'all') {
      list = list.filter((t) => {
        const m = teacherPrepMetrics(t.lessons, bell, nowMin, live)
        return filter === 'salvageable' ? m.salvageable > 0 : m.missed > 0
      })
    }
    // فرز: من له حصص تُنقَذ أولاً (القرار الحيّ)
    return [...list].sort((a, b) => {
      const ma = teacherPrepMetrics(a.lessons, bell, nowMin, live)
      const mb = teacherPrepMetrics(b.lessons, bell, nowMin, live)
      return mb.salvageable - ma.salvageable || mb.missed - ma.missed
    })
  }, [teachers, search, filter, bell, nowMin, live])

  const unlinkedCount = useMemo(() => teachers.filter((t) => !t.is_linked).length, [teachers])

  return (
    <WsPage>
      <WsHeader
        title="تحضير مدرستي"
        badge={data?.weekday ? `${data.weekday}${live ? ' · حيّ' : ''}` : undefined}
        actions={
          <>
            {facts.salvageableTeachers > 0 && (
              <WsBtn
                variant="primary"
                icon={Send}
                onClick={() => sendNotifications.mutate()}
                disabled={sendNotifications.isPending}
              >
                إرسال للقابلين ({facts.salvageableTeachers})
              </WsBtn>
            )}
            <WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => void refetch()} />
          </>
        }
        facts={
          <>
            <WsFact icon={Users} label="معلم">{teachers.length}</WsFact>
            <WsFact icon={Bell} label="حصص تُنقَذ">
              <span style={{ color: facts.salvageableLessons > 0 ? TONES.amber.tx : undefined }}>
                {facts.salvageableLessons}
              </span>
            </WsFact>
            <WsFact icon={AlertTriangle} label="حصص فاتت">
              <span style={{ color: 'var(--ws-text-2)' }}>{facts.missedLessons}</span>
            </WsFact>
            {extractedMin != null && (
              <WsFact icon={CalendarDays} label="سُحب">{minLabel(extractedMin)}</WsFact>
            )}
          </>
        }
      />

      {/* اللقطة متعفّنة — لافتة على مستوى الصفحة لا لون في الجدول */}
      {data && !live && teachers.length > 0 && (
        <WsAlert tone="warn" boxed>
          هذه لقطة {data.weekday} ({data.date}) — ليست جدول اليوم الحيّ. «تُنقَذ» تُحسب مقابل وقت اللقطة لا الآن.
        </WsAlert>
      )}
      {unlinkedCount > 0 && (
        <WsAlert tone="warn" boxed icon={Link2}>
          {unlinkedCount} معلماً غير مربوط بحساب — لن تصلهم إشعارات حتى يُربطوا من صفحة الروابط.
        </WsAlert>
      )}

      <WsToolbar>
        <WsField label="التاريخ" htmlFor="tp-date">
          <WsInput
            id="tp-date"
            type="date"
            value={selectedDate}
            max={new Date().toLocaleDateString('en-CA')}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </WsField>
        <WsField label="بحث" htmlFor="tp-q" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              id="tp-q"
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
              ['salvageable', `تُنقَذ (${facts.salvageableTeachers})`],
              ['missed', `فاتت (${facts.missedTeachers})`],
            ] as Array<['all' | 'salvageable' | 'missed', string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ws-seg__btn ${filter === value ? 'is-active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </WsField>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock fill scroll title="المعلمون" icon={Users} count={filtered.length}>
            {isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل بيانات التحضير.
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>إعادة المحاولة</WsBtn>
                </WsAlert>
              </div>
            ) : isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : teachers.length === 0 ? (
              <WsEmpty icon={Users}>لا بيانات تحضير لهذا اليوم</WsEmpty>
            ) : filtered.length === 0 ? (
              <WsEmpty icon={Users}>لا معلمين مطابقين</WsEmpty>
            ) : !scale ? (
              <WsEmpty icon={Bell}>لا جدول جرس متاح</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>المعلم</th>
                    <th style={{ width: scale.width + 24 }}>مِشط الجرس</th>
                    <th style={{ width: 90 }}>تُنقَذ · فات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((teacher) => {
                    const m = teacherPrepMetrics(teacher.lessons, bell, nowMin, live)
                    return (
                      <tr key={teacher.teacher_id}>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600 }}>{teacher.teacher_name}</span>
                            {!teacher.is_linked && <ToneChip tone={TONES.gray}>غير مربوط</ToneChip>}
                          </span>
                          {teacher.notification_sent && (
                            <span className="ws-cell-sub" style={{ color: TONES.green.tx }}>أُرسل إشعار</span>
                          )}
                        </td>
                        <td>
                          <BellComb
                            lessons={teacher.lessons}
                            bell={bell}
                            scale={scale}
                            extractedMin={extractedMin}
                            nowMin={nowMin}
                            live={live}
                          />
                        </td>
                        <td>
                          {m.salvageable > 0 && (
                            <span style={{ color: TONES.amber.tx, fontWeight: 700 }}>{m.salvageable}</span>
                          )}
                          {m.salvageable > 0 && m.missed > 0 && <span style={{ color: 'var(--ws-text-2)' }}> · </span>}
                          {m.missed > 0 && <span style={{ color: 'var(--ws-text-2)' }}>{m.missed}</span>}
                          {m.salvageable === 0 && m.missed === 0 && <span style={{ color: 'var(--ws-text-2)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>
      </WsLayout>

      <div style={{ padding: '4px 12px' }}>
        <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
          <Settings style={{ width: 11, height: 11, verticalAlign: '-1px', marginInlineEnd: 3 }} />
          الجرس واحدٌ يتقاسمه الكل. الخانة الكهرمانية النابضة: حصة غير محضّرة تُنقَذ (لم تبدأ). الرمادية:
          فاتت. الخط المتقطّع لحظة السحب، والخط السماوي الآن — والمنطقة بينهما تعفّنت في الأثناء.
        </p>
      </div>
    </WsPage>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Clock,
  Hourglass,
  PartyPopper,
  RefreshCw,
  Send,
  ShieldAlert,
  UserX,
  Users,
} from 'lucide-react'
import { fetchAbsenceMessagesStats, resendAbsenceMessages } from '../api'
import { useToast } from '@/shared/feedback/use-toast'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsInput,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsTable,
  WsBtn,
  WsIconBtn,
  WsAlert,
  WsEmpty,
  WsProgress,
  WsFactsList,
  WsFactRow,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  GapCell,
  gapState,
  gapSeconds,
  fmtGap,
  STATE_META,
  type AbsenceRow,
} from './absence-messages-ui'

const todayLocal = () => new Date().toLocaleDateString('en-CA')

export function AdminAbsenceMessagesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(todayLocal())
  const [skipSent, setSkipSent] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(0)
  const [total, setTotal] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const cancelRef = useRef(false)

  const statsQuery = useQuery({
    queryKey: ['admin', 'absence-messages-stats', selectedDate],
    queryFn: () => fetchAbsenceMessagesStats(selectedDate),
    refetchInterval: isSending ? false : 30000,
  })

  const resendMutation = useMutation({
    mutationFn: (payload: { date: string; skip_sent: boolean; offset?: number }) => resendAbsenceMessages(payload),
  })

  // نبضة حياة كل ٣٠ ثانية — الصفوف المفتوحة تنمو، والفجوة بالدقائق فلا داعي للثانية
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const rows: AbsenceRow[] = useMemo(() => statsQuery.data?.students ?? [], [statsQuery.data])

  // فرز بالفجوة تنازلياً: الأعلى هو الأب الأطول جهلاً بغياب ابنه
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => gapSeconds(b, nowMs) - gapSeconds(a, nowMs)),
    [rows, nowMs],
  )

  const scaleSec = useMemo(
    () => Math.max(600, ...rows.map((r) => gapSeconds(r, nowMs))),
    [rows, nowMs],
  )

  // كل الحقائق من مقام واحد: عدّ الحالة على المصفوفة نفسها
  const counts = useMemo(() => {
    let s = 0
    let f = 0
    let u = 0
    let maxGap = 0
    for (const r of rows) {
      const st = gapState(r)
      if (st === 'sent') s++
      else if (st === 'failed') f++
      else u++
      if (st !== 'sent') maxGap = Math.max(maxGap, gapSeconds(r, nowMs))
    }
    return { sent: s, failed: f, unknocked: u, maxGap }
  }, [rows, nowMs])

  const failureReasons = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      if (gapState(r) === 'failed') {
        const reason = r.error_message?.trim() || 'فشل غير محدّد'
        map.set(reason, (map.get(reason) ?? 0) + 1)
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const noPhone = useMemo(() => rows.filter((r) => !r.student_phone).length, [rows])

  const runSend = async () => {
    setShowConfirm(false)
    setIsSending(true)
    setSent(0)
    cancelRef.current = false
    let offset = 0

    try {
      for (;;) {
        if (cancelRef.current) break
        const result = await resendMutation.mutateAsync({ date: selectedDate, skip_sent: skipSent, offset })
        setTotal(result.total_absent)
        setSent((prev) => prev + result.messages_sent)
        if (!result.has_more) break
        offset = result.next_offset
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-messages-stats'] })
      toast(
        cancelRef.current
          ? { type: 'info', title: 'أُوقف الإرسال', description: 'ما بدأ إرساله قد يكون اكتمل' }
          : { type: 'success', title: 'اكتمل الإرسال' },
      )
    } catch {
      toast({ type: 'error', title: 'تعذّر إكمال الإرسال', description: 'قد تكون بعض الرسائل أُرسلت' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'absence-messages-stats'] })
    } finally {
      setIsSending(false)
    }
  }

  const isPast = selectedDate !== todayLocal()

  return (
    <WsPage>
      <WsHeader
        title="إدارة رسائل الغياب"
        actions={<WsIconBtn icon={RefreshCw} label="تحديث" onClick={() => void statsQuery.refetch()} />}
        facts={
          <>
            <WsFact icon={UserX} label="غياب معتمَد">{rows.length}</WsFact>
            <WsFact icon={Check} label="أُرسل لوليّه">
              <span style={{ color: counts.sent > 0 ? TONES.green.tx : undefined }}>{counts.sent}</span>
            </WsFact>
            <WsFact icon={AlertCircle} label="لن يُرسَل">
              <span style={{ color: counts.failed > 0 ? TONES.red.tx : undefined }}>{counts.failed}</span>
            </WsFact>
            <WsFact icon={Clock} label="لم يُطرَق">
              <span style={{ color: counts.unknocked > 0 ? TONES.amber.tx : undefined }}>{counts.unknocked}</span>
            </WsFact>
            {counts.maxGap > 0 && (
              <WsFact icon={Hourglass} label="أطول انتظار">{fmtGap(counts.maxGap)}</WsFact>
            )}
          </>
        }
      />

      <WsToolbar>
        <WsField label="التاريخ" htmlFor="am-date">
          <WsInput
            id="am-date"
            type="date"
            value={selectedDate}
            max={todayLocal()}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </WsField>
        <WsField label="تخطّي المُبلَّغ فعلاً">
          <WsSwitch checked={skipSent} onChange={setSkipSent} />
        </WsField>
        {isSending ? (
          <WsBtn variant="danger" icon={ShieldAlert} onClick={() => (cancelRef.current = true)}>
            إيقاف
          </WsBtn>
        ) : (
          <WsBtn variant="primary" icon={Send} onClick={() => setShowConfirm(true)} disabled={rows.length === 0}>
            إرسال الرسائل
          </WsBtn>
        )}
      </WsToolbar>

      <WsLayout>
        <WsMain>
          {isSending && (
            <WsBlock padded>
              <WsProgress value={total > 0 ? (sent / total) * 100 : 0} label={`جارٍ الإرسال — ${sent} من ${total}`} />
            </WsBlock>
          )}

          <WsBlock fill scroll title="أولياء الأمور" icon={Users} count={rows.length}>
            {statsQuery.isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  {(statsQuery.error as Error)?.message ?? 'تعذّر تحميل الإحصائيات'}
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void statsQuery.refetch()}>
                    إعادة المحاولة
                  </WsBtn>
                </WsAlert>
              </div>
            ) : statsQuery.isLoading ? (
              <WsEmpty loading>جارٍ التحميل...</WsEmpty>
            ) : rows.length === 0 ? (
              <WsEmpty icon={PartyPopper}>لا غياب معتمَد في هذا اليوم</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th style={{ width: 130 }}>ولي الأمر</th>
                    <th style={{ width: 90 }}>الحالة</th>
                    <th style={{ width: 210 }}>فجوة العِلم</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const st = gapState(row)
                    return (
                      <tr key={row.attendance_id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{row.student_name}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, direction: 'ltr', textAlign: 'right' }}>
                          {row.student_phone ? (
                            row.student_phone
                          ) : (
                            <span style={{ color: TONES.red.tx, fontFamily: 'inherit' }} title="لا رقم لولي الأمر — لن تصله رسالة">
                              بلا رقم
                            </span>
                          )}
                        </td>
                        <td>
                          <ToneChip tone={STATE_META[st].tone}>{STATE_META[st].label}</ToneChip>
                        </td>
                        <td>
                          <GapCell row={row} scaleSec={scaleSec} nowMs={nowMs} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        {/* ما يمنع الإبلاغ — تشخيصيّ، يُطوى بقيّة الوقت */}
        <WsSideCol
          side="end"
          title="ما يمنع الإبلاغ"
          icon={ShieldAlert}
          storageKey="ws:absence-messages:blockers"
          width={300}
        >
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isPast && (
                <WsAlert tone="info" boxed>تعرض يوماً ماضياً — الأرقام تاريخية.</WsAlert>
              )}

              {counts.unknocked > 0 && (
                <WsAlert tone="warn" boxed>
                  {counts.unknocked} لم يُطرَق باب وليّه بعد — إما في الطابور أو لم تُجدَل لهم رسالة عند
                  الاعتماد (الإرسال التلقائي قد يكون متوقّفاً).
                </WsAlert>
              )}

              {noPhone > 0 && (
                <WsAlert tone="warn" boxed>
                  {noPhone} بلا رقم ولي أمر — لن تصلهم رسالة مهما أرسلت.
                </WsAlert>
              )}

              {failureReasons.length > 0 && (
                <div>
                  <p className="ws-label" style={{ marginBottom: 5 }}>أسباب الفشل</p>
                  <WsFactsList>
                    {failureReasons.map(([reason, n]) => (
                      <WsFactRow key={reason} label={reason}>
                        <span style={{ color: TONES.red.tx, fontWeight: 700 }}>{n}</span>
                      </WsFactRow>
                    ))}
                  </WsFactsList>
                </div>
              )}

              {counts.failed === 0 && counts.unknocked === 0 && noPhone === 0 && rows.length > 0 && (
                <WsEmpty icon={Check}>لا حواجز — كل من له رقم بُلِّغ وليّه</WsEmpty>
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* تأكيد الإرسال */}
      {showConfirm && (
        <div className="ws-modal" onClick={() => setShowConfirm(false)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">إرسال رسائل الغياب</h3>
              <p className="ws-modal__sub">{selectedDate}</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="warn" boxed>
                {skipSent
                  ? `سيُرسَل لمن لم يُبلَّغ بعد فقط (${counts.unknocked} ولي أمر).`
                  : `سيُرسَل لكل أولياء أمور الغائبين (${rows.length}) — بمن فيهم من بُلِّغ سابقاً.`}
              </WsAlert>
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ws-text-2)', lineHeight: 1.7 }}>
                يُرسَل على دفعات بفواصل زمنية. يمكنك الإيقاف أثناء الإرسال، لكن ما بدأ إرساله قد يكون اكتمل.
              </p>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setShowConfirm(false)}>إلغاء</WsBtn>
              <WsBtn variant="primary" icon={Send} onClick={runSend}>
                إرسال
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

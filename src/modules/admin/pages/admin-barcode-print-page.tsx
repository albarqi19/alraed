import { useMemo, useState } from 'react'
import {
  CheckSquare,
  Download,
  FileStack,
  LayoutGrid,
  ListTree,
  RefreshCw,
  ScanLine,
  Search,
  Square,
  Users,
} from 'lucide-react'
import {
  useBarcodeRosterQuery,
  usePrintBarcodesBatchMutation,
  useBarcodeSettingsQuery,
} from '../barcode/hooks'
import type { BarcodeStudentRecord } from '../barcode/types'
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
  WsAlert,
  WsEmpty,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  SHEET,
  buildStack,
  isScannable,
  BarcodeSvg,
  SheetFace,
  scopeKey,
  GRADE_ORDER,
  type PrintFormat,
} from './barcode-print-ui'

const FORMATS: PrintFormat[] = ['card', 'label', 'list']

export function AdminBarcodePrintPage() {
  const [scope, setScope] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [format, setFormat] = useState<PrintFormat>('card')
  const [selected, setSelected] = useState<Map<number, BarcodeStudentRecord>>(new Map())

  const { data: roster = [], isLoading, isError, refetch } = useBarcodeRosterQuery()
  const { data: settings } = useBarcodeSettingsQuery()
  const printMutation = usePrintBarcodesBatchMutation()

  const gateEnabled = settings?.barcode_enabled !== false

  // شجرة الصف ← الفصل، مشتقّة من الروستر الكامل — لا تنهار بنيوياً
  const tree = useMemo(() => {
    const byGrade = new Map<string, Map<string, number>>()
    for (const s of roster) {
      if (!byGrade.has(s.grade)) byGrade.set(s.grade, new Map())
      const cls = byGrade.get(s.grade)!
      cls.set(s.class_name, (cls.get(s.class_name) ?? 0) + 1)
    }
    return [...byGrade.entries()]
      .sort((a, b) => (GRADE_ORDER[a[0]] ?? 99) - (GRADE_ORDER[b[0]] ?? 99))
      .map(([grade, classes]) => ({
        grade,
        total: [...classes.values()].reduce((s, n) => s + n, 0),
        classes: [...classes.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ar')),
      }))
  }, [roster])

  // الطلاب المرئيون: نطاق + بحث، محلياً بالكامل
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const scoped = scope.size === 0 ? roster : roster.filter((s) => scope.has(scopeKey(s.grade, s.class_name)))
    if (!q) return scoped
    return scoped.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.national_id?.toLowerCase().includes(q) ||
        s.student_number?.toLowerCase().includes(q),
    )
  }, [roster, scope, search])

  const selectedList = useMemo(() => [...selected.values()], [selected])
  const unscannable = useMemo(() => selectedList.filter((s) => !isScannable(s.national_id)).length, [selectedList])
  const stack = useMemo(() => buildStack(selected.size, format, unscannable), [selected.size, format, unscannable])

  const toggleScope = (key: string, gradeClasses?: string[]) => {
    setScope((prev) => {
      const next = new Set(prev)
      if (gradeClasses) {
        // عقدة صف: كل فصولها معاً
        const allOn = gradeClasses.every((c) => next.has(c))
        gradeClasses.forEach((c) => (allOn ? next.delete(c) : next.add(c)))
      } else {
        next.has(key) ? next.delete(key) : next.add(key)
      }
      return next
    })
  }

  const toggleStudent = (s: BarcodeStudentRecord) => {
    setSelected((prev) => {
      const next = new Map(prev)
      next.has(s.id) ? next.delete(s.id) : next.set(s.id, s)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Map(prev)
      const allOn = visible.every((s) => next.has(s.id))
      visible.forEach((s) => (allOn ? next.delete(s.id) : next.set(s.id, s)))
      return next
    })
  }

  const buildFilename = () => {
    const scopeArr = [...scope]
    const stamp = new Date().toLocaleDateString('sv-SE')
    if (scopeArr.length === 1) {
      const [grade, cls] = scopeArr[0].split('|')
      return `باركود-${grade}-فصل-${cls}-${stamp}.pdf`
    }
    return `باركود-${selected.size}-طالب-${stamp}.pdf`
  }

  const handlePrint = () => {
    if (selected.size === 0) return
    printMutation.mutate({
      student_ids: selectedList.map((s) => s.id),
      format,
      filename: buildFilename(),
    })
  }

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id))

  return (
    <WsPage>
      <WsHeader
        title="طباعة الباركود"
        badge={
          !gateEnabled ? (
            <span style={{ color: TONES.red.tx, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ScanLine style={{ width: 12, height: 12 }} /> البوابة معطّلة
            </span>
          ) : undefined
        }
        actions={
          <WsBtn
            variant="primary"
            icon={Download}
            onClick={handlePrint}
            disabled={selected.size === 0 || printMutation.isPending}
          >
            {printMutation.isPending ? 'جارٍ التوليد...' : `تنزيل الرزمة (${selected.size})`}
          </WsBtn>
        }
        facts={
          <>
            <WsFact icon={Users} label="في النطاق">{visible.length}</WsFact>
            <WsFact icon={CheckSquare} label="محدَّد">{selected.size}</WsFact>
            <WsFact icon={FileStack} label="أوراق">{stack.sheets}</WsFact>
            {stack.sheets > 0 && (
              <WsFact icon={LayoutGrid} label="الورقة الأخيرة">
                {stack.lastSheetUsed}/{stack.perPage}
              </WsFact>
            )}
            {/* الرقم الذي يمنع كارثة على الباب لا يُطوى — يصعد للحقائق */}
            {unscannable > 0 && (
              <WsFact icon={ScanLine} label="لن يُقرأ">
                <span style={{ color: TONES.red.tx }}>{unscannable}</span>
              </WsFact>
            )}
          </>
        }
      />

      <WsLayout>
        {/* النطاق يميناً — الإدخال في RTL */}
        <WsSideCol side="start" title="النطاق" icon={ListTree} storageKey="ws:barcode-print:scope" width={260}>
          <WsBlock fill scroll>
            {tree.length === 0 ? (
              <WsEmpty icon={ListTree}>{isLoading ? 'جارٍ التحميل...' : 'لا طلاب'}</WsEmpty>
            ) : (
              <div style={{ padding: 8 }}>
                {tree.map((node) => {
                  const keys = node.classes.map(([c]) => scopeKey(node.grade, c))
                  const on = keys.filter((k) => scope.has(k)).length
                  const gradeState = on === 0 ? 'none' : on === keys.length ? 'all' : 'some'
                  return (
                    <div key={node.grade} style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => toggleScope(node.grade, keys)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          width: '100%',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: '3px 4px',
                          textAlign: 'right',
                        }}
                      >
                        <TriBox state={gradeState} />
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 12 }}>{node.grade}</span>
                        <span className="ws-count">{node.total}</span>
                      </button>
                      <div style={{ paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {node.classes.map(([cls, count]) => {
                          const key = scopeKey(node.grade, cls)
                          const active = scope.has(key)
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleScope(key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                width: '100%',
                                border: 'none',
                                borderRadius: 5,
                                background: active ? 'var(--ws-accent-soft)' : 'transparent',
                                color: active ? 'var(--ws-accent)' : 'var(--ws-text)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                padding: '3px 5px',
                                textAlign: 'right',
                                fontSize: 11.5,
                              }}
                            >
                              <TriBox state={active ? 'all' : 'none'} />
                              <span style={{ flex: 1 }}>فصل {cls}</span>
                              <span style={{ color: 'var(--ws-text-2)', fontSize: 10.5 }}>{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {scope.size > 0 && (
                  <WsBtn size="sm" onClick={() => setScope(new Set())} style={{ marginTop: 6 }}>
                    مسح النطاق
                  </WsBtn>
                )}
              </div>
            )}
          </WsBlock>
        </WsSideCol>

        <WsMain>
          <WsToolbar>
            <WsField label="بحث" htmlFor="bc-q" grow>
              <div style={{ position: 'relative' }}>
                <WsInput
                  id="bc-q"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="الاسم أو رقم الهوية أو رقم الطالب"
                  style={{ width: '100%', paddingInlineStart: 26 }}
                />
                <Search
                  style={{
                    width: 13,
                    height: 13,
                    position: 'absolute',
                    insetInlineStart: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--ws-text-2)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </WsField>
            <WsField label="شكل الطباعة">
              <div className="ws-seg">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`ws-seg__btn ${format === f ? 'is-active' : ''}`}
                    onClick={() => setFormat(f)}
                  >
                    {SHEET[f].label}
                  </button>
                ))}
              </div>
            </WsField>
          </WsToolbar>

          <WsBlock
            fill
            scroll
            title="الطلاب"
            icon={Users}
            count={visible.length}
            tools={
              visible.length > 0 ? (
                <WsBtn size="sm" icon={allVisibleSelected ? CheckSquare : Square} onClick={selectAllVisible}>
                  {allVisibleSelected ? 'إلغاء تحديد المعروض' : 'تحديد المعروض'}
                </WsBtn>
              ) : undefined
            }
          >
            {isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل الطلاب.
                  <WsBtn size="sm" icon={RefreshCw} onClick={() => void refetch()}>
                    إعادة المحاولة
                  </WsBtn>
                </WsAlert>
              </div>
            ) : isLoading ? (
              <WsEmpty loading>جارٍ تحميل الطلاب...</WsEmpty>
            ) : visible.length === 0 ? (
              <WsEmpty icon={Users}>لا طلاب مطابقون</WsEmpty>
            ) : (
              <WsTable>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>الطالب</th>
                    <th style={{ width: 130 }}>الصف / الفصل</th>
                    <th style={{ width: 140 }}>رقم الهوية</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => {
                    const sel = selected.has(s.id)
                    const bad = !isScannable(s.national_id)
                    return (
                      <tr
                        key={s.id}
                        className="is-clickable"
                        onClick={() => toggleStudent(s)}
                        style={sel ? { background: 'var(--ws-accent-soft)' } : bad ? { background: TONES.red.bg } : undefined}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={sel} onChange={() => toggleStudent(s)} />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          {bad && (
                            <>
                              {' '}
                              <ToneChip tone={TONES.red}>لن يُقرأ</ToneChip>
                            </>
                          )}
                        </td>
                        <td style={{ color: 'var(--ws-text-2)' }}>
                          {s.grade} / {s.class_name}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, direction: 'ltr', textAlign: 'right' }}>
                          {s.national_id}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </WsTable>
            )}
          </WsBlock>
        </WsMain>

        {/* الرصّة يساراً — المخرَج في RTL */}
        <WsSideCol side="end" title="الرصّة" icon={FileStack} storageKey="ws:barcode-print:ream" width={340}>
          <WsBlock fill scroll>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!gateEnabled && (
                <WsAlert tone="error" boxed>
                  البوابة معطّلة — لن تُقرأ هذه البطاقات عند المسح حتى تُفعَّل من «إعدادات البوابة».
                </WsAlert>
              )}

              {selected.size === 0 ? (
                <WsEmpty icon={FileStack}>اختر طلاباً لترى الرصّة</WsEmpty>
              ) : (
                <>
                  {/* الورقة الأخيرة مكشوفة بمقياس A4 حقيقي — تتنفّس مع كل نقرة */}
                  <div>
                    <p className="ws-label" style={{ marginBottom: 6 }}>
                      الورقة الأخيرة — {stack.lastSheetUsed} من {stack.perPage} خانة
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <SheetFace format={format} filled={stack.lastSheetUsed} width={230} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--ws-surface-2)',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>مجموع الأوراق</span>
                    <b style={{ fontSize: 18 }}>{stack.sheets}</b>
                  </div>

                  {unscannable > 0 && (
                    <WsAlert tone="error" boxed>
                      {unscannable} من المحدَّدين رقمهم لا يُرمَّز بـCODE128 — الماسح لن يقرأها.
                    </WsAlert>
                  )}

                  {/* عيّنة باركود حقيقية بهندسة القالب — لا معاينة تخالف الطباعة */}
                  {selectedList[0] && isScannable(selectedList[0].national_id) && (
                    <div>
                      <p className="ws-label" style={{ marginBottom: 5 }}>عيّنة كما ستُطبع</p>
                      <div
                        style={{
                          border: '1px solid var(--ws-hairline)',
                          borderRadius: 8,
                          padding: 10,
                          textAlign: 'center',
                          background: 'var(--ws-surface)',
                        }}
                      >
                        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700 }}>{selectedList[0].name}</p>
                        <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--ws-text-2)' }}>
                          {selectedList[0].grade} · {selectedList[0].class_name}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <BarcodeSvg value={selectedList[0].national_id} />
                        </div>
                      </div>
                    </div>
                  )}

                  <WsBtn size="sm" onClick={() => setSelected(new Map())}>
                    مسح التحديد
                  </WsBtn>
                </>
              )}
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}

function TriBox({ state }: { state: 'all' | 'some' | 'none' }) {
  return (
    <span
      style={{
        width: 13,
        height: 13,
        flexShrink: 0,
        borderRadius: 3,
        border: `1.5px solid ${state === 'none' ? 'var(--ws-border)' : 'var(--ws-accent)'}`,
        background: state === 'all' ? 'var(--ws-accent)' : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {state === 'all' && <CheckSquare style={{ width: 9, height: 9, color: '#fff' }} strokeWidth={3} />}
      {state === 'some' && <span style={{ width: 7, height: 2, background: 'var(--ws-accent)', borderRadius: 1 }} />}
    </span>
  )
}

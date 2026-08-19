import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TemplatePickerButton } from '@/modules/student-attributes/components/template-picker'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  TriangleAlert,
  Users, Lock,
} from 'lucide-react'
import {
  useAdminForms,
  usePublishAdminFormMutation,
  useArchiveAdminFormMutation,
  useDeleteAdminFormMutation,
} from '@/modules/forms/hooks'
import type { FormStatus, FormSummary } from '@/modules/forms/types'
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
  TONES,
  ToneChip,
} from '@/shared/workspace'
import {
  buildCloser,
  CloserTrack,
  closerTitle,
  formatDate,
  STATUS_LABELS,
  STATUS_TONES,
  type Closer,
} from './forms-ui'

type StatusFilter = FormStatus | 'all'

const TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'draft', label: 'مسودة' },
  { id: 'published', label: 'منشور' },
  { id: 'archived', label: 'مؤرشف' },
]

/** meta.total مقامٌ مفلتر — الخادم يرشّح قبل العدّ، فالتسمية تتبع الفلتر */
const FACT_LABEL: Record<StatusFilter, string> = {
  all: 'إجمالي النماذج',
  draft: 'مسودات',
  published: 'منشورة',
  archived: 'مؤرشفة',
}

export function AdminFormsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const initial = searchParams.get('status')
    if (initial === 'draft' || initial === 'published' || initial === 'archived') return initial
    return 'all'
  })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<FormSummary | null>(null)

  const formsQuery = useAdminForms({
    status: statusFilter === 'all' ? undefined : statusFilter,
    q: search.trim() || undefined,
    category: category.trim() || undefined,
    page,
  })

  const publishMutation = usePublishAdminFormMutation()
  const archiveMutation = useArchiveAdminFormMutation()
  const deleteMutation = useDeleteAdminFormMutation()

  const forms = formsQuery.data?.data ?? []
  const meta = formsQuery.data?.meta

  // المُغلِق يُبنى مرة واحدة لكل صف ويُقرأ في الجدول والعمود معاً
  const rows = useMemo(
    () => forms.map((form) => ({ form, closer: buildCloser(form) })),
    [forms],
  )

  const buckets = useMemo(() => {
    const filled = rows.filter((r) => r.closer.r != null && r.closer.r >= 1 && r.form.status === 'published')
    const expired = rows.filter(
      (r) => r.closer.t != null && r.closer.t >= 1 && r.form.status === 'published',
    )
    const empty = rows.filter((r) => r.form.status === 'draft' && r.form.fields_count === 0)
    const silent = rows.filter(
      (r) =>
        r.form.status === 'published' &&
        r.closer.daysLeft != null &&
        r.closer.daysLeft > 0 &&
        r.closer.daysLeft <= 7 &&
        r.closer.harvest === 0,
    )
    return { filled, expired, empty, silent }
  }, [rows])

  const changeStatus = (next: StatusFilter) => {
    setStatusFilter(next)
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('status')
    else params.set('status', next)
    setSearchParams(params)
  }

  const isStale = formsQuery.isFetching && !formsQuery.isLoading

  return (
    <WsPage>
      <WsHeader
        title="النماذج الإلكترونية"
        actions={
          <>
            <TemplatePickerButton />
            <Link to="/admin/forms/new" style={{ textDecoration: 'none' }}>
              <WsBtn variant="primary" icon={Plus}>نموذج جديد</WsBtn>
            </Link>
          </>
        }
        facts={
          <>
            <WsFact icon={FileText} label={FACT_LABEL[statusFilter]}>
              {meta?.total ?? forms.length}
            </WsFact>
            <WsFact icon={Users} label="ردود معروضة">
              {rows.reduce((sum, r) => sum + r.closer.harvest, 0)}
            </WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="الحالة">
          <div className="ws-seg">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ws-seg__btn ${statusFilter === tab.id ? 'is-active' : ''}`}
                onClick={() => changeStatus(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </WsField>
        <WsField label="بحث" grow>
          <div style={{ position: 'relative' }}>
            <WsInput
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="بحث في العنوان أو الوصف..."
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
        <WsField label="التصنيف">
          <WsInput
            type="text"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            placeholder="أي تصنيف"
            style={{ width: 130 }}
          />
        </WsField>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock
            fill
            title="قائمة النماذج"
            icon={FileText}
            count={forms.length}
            tools={
              meta && meta.last_page > 1 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--ws-text-2)' }}>
                    صفحة {meta.current_page} من {meta.last_page}
                  </span>
                  <WsIconBtn
                    icon={ChevronRight}
                    label="السابق"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <WsIconBtn
                    icon={ChevronLeft}
                    label="التالي"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  />
                </span>
              ) : undefined
            }
          >
            {/* isError يُفحص أولاً — كان الفشل ينزلق إلى «لا توجد نماذج» المطمئنة */}
            {formsQuery.isError ? (
              <div style={{ padding: 14 }}>
                <WsAlert tone="error" boxed>
                  تعذّر تحميل النماذج.
                  <WsBtn size="sm" onClick={() => void formsQuery.refetch()}>إعادة المحاولة</WsBtn>
                </WsAlert>
              </div>
            ) : formsQuery.isLoading ? (
              <WsEmpty loading>جارٍ تحميل النماذج...</WsEmpty>
            ) : forms.length === 0 ? (
              <WsEmpty icon={FileText}>لا توجد نماذج مطابقة</WsEmpty>
            ) : (
              /* keepPreviousData يُبقي صفوف الفلتر السابق — تُعتَّم بدل أن تُقرأ كأنها الجديد */
              <div style={{ opacity: isStale ? 0.5 : 1, transition: 'opacity .12s' }}>
                <WsTable>
                  <thead>
                    <tr>
                      <th>النموذج</th>
                      <th style={{ width: 168 }}>المُغلِق</th>
                      <th style={{ width: 92 }}>الردود</th>
                      <th style={{ width: 128 }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ form, closer }) => (
                      <FormRow
                        key={form.id}
                        form={form}
                        closer={closer}
                        onPublish={() => publishMutation.mutate(form.id)}
                        onArchive={() => archiveMutation.mutate(form.id)}
                        onDelete={() => setPendingDelete(form)}
                        busy={publishMutation.isPending || archiveMutation.isPending}
                      />
                    ))}
                  </tbody>
                </WsTable>
              </div>
            )}
          </WsBlock>
        </WsMain>

        <WsSideCol
          side="end"
          title="ما ينتظر قرارك"
          icon={TriangleAlert}
          storageKey="ws:forms:sidecol"
          width={320}
        >
          <WsBlock fill scroll>
            <div style={{ padding: '8px 10px 0' }}>
              {/* إفصاح إلزامي: هذه الأعداد من الصفحة المعروضة لا من كل النماذج */}
              <p style={{ margin: 0, fontSize: 10, color: 'var(--ws-text-2)' }}>
                من {forms.length} معروضاً في هذه الصفحة
              </p>
            </div>
            <WsBlock padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <BucketRow
                  label="امتلأت وتظهر نشطة"
                  sub="الخادم يردّ أولياء الأمور"
                  count={buckets.filled.length}
                  icon={CircleSlash}
                />
                <BucketRow
                  label="انتهى وقتها وما زالت منشورة"
                  sub="تنتظر الأرشفة"
                  count={buckets.expired.length}
                  icon={Clock}
                />
                <BucketRow
                  label="مسودات بلا أسئلة"
                  sub="لا يمكن نشرها"
                  count={buckets.empty.length}
                  icon={FileText}
                />
                <BucketRow
                  label="تُغلق خلال ٧ أيام بلا ردّ"
                  sub="لم يصل ردّ واحد"
                  count={buckets.silent.length}
                  icon={TriangleAlert}
                />
              </div>
            </WsBlock>
          </WsBlock>
        </WsSideCol>
      </WsLayout>

      {/* مودال الحذف — بدل window.confirm الخام */}
      {pendingDelete && (
        <div className="ws-modal" onClick={() => setPendingDelete(null)}>
          <div className="ws-modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <header className="ws-modal__head">
              <h3 className="ws-modal__title">حذف «{pendingDelete.title}»</h3>
              <p className="ws-modal__sub">لا يمكن التراجع عن هذا الإجراء</p>
            </header>
            <div className="ws-modal__body">
              <WsAlert tone="error" boxed>
                {(pendingDelete.submissions_count ?? 0) > 0
                  ? `سيُحذف النموذج ومعه ${pendingDelete.submissions_count} ردّاً من أولياء الأمور.`
                  : 'سيُحذف النموذج نهائياً.'}
              </WsAlert>
            </div>
            <footer className="ws-modal__foot">
              <WsBtn onClick={() => setPendingDelete(null)}>إلغاء</WsBtn>
              <WsBtn
                variant="danger"
                icon={Trash2}
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(pendingDelete.id)
                  setPendingDelete(null)
                }}
              >
                حذف نهائي
              </WsBtn>
            </footer>
          </div>
        </div>
      )}
    </WsPage>
  )
}

function FormRow({
  form,
  closer,
  onPublish,
  onArchive,
  onDelete,
  busy,
}: {
  form: FormSummary
  closer: Closer
  onPublish: () => void
  onArchive: () => void
  onDelete: () => void
  busy: boolean
}) {
  const noQuestions = form.fields_count === 0

  return (
    <tr
      // الغسلة الناعمة على ما يحمل حالة وحده — وهي ما يكسر رتابة الجدول
      style={closer.needsDecision ? { background: TONES.amber.bg } : undefined}
    >
      <td>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          {form.title}
          {/* شارةُ السرّية تُقرأ قبل فتح الردود، فلا يُفاجأ أحدٌ بـ403 */}
          {form.is_confidential ? (
            <span title="يحوي بياناتٍ سرّية — لا يرى ردودَه إلا الموجّه الطلابي">
              <Lock style={{ width: 13, height: 13, color: TONES.red.tx, flexShrink: 0 }} />
            </span>
          ) : null}
        </span>
        <span className="ws-cell-sub">
          {form.category ? `${form.category} · ` : ''}
          {form.fields_count != null ? `${form.fields_count} سؤالاً` : ''}
          {form.status !== 'published' && (
            <>
              {' · '}
              <ToneChip tone={STATUS_TONES[form.status]}>{STATUS_LABELS[form.status]}</ToneChip>
            </>
          )}
        </span>
      </td>
      <td title={closerTitle(closer)}>
        <CloserTrack closer={closer} />
        <span className="ws-cell-sub" style={{ color: closer.tone.tx }}>
          {closer.verdict}
        </span>
      </td>
      <td>
        <b style={{ fontSize: 14 }}>{closer.harvest}</b>
        {closer.ceiling != null && (
          <span style={{ fontSize: 10, color: 'var(--ws-text-2)' }}> / {closer.ceiling}</span>
        )}
        {form.end_at && <span className="ws-cell-sub">حتى {formatDate(form.end_at)}</span>}
      </td>
      <td>
        <span style={{ display: 'inline-flex', gap: 3 }}>
          <Link to={`/admin/forms/${form.id}`}>
            <WsIconBtn icon={Pencil} label="تحرير" />
          </Link>
          <Link to={`/admin/forms/${form.id}/submissions`}>
            <WsIconBtn icon={ListChecks} label="الردود" />
          </Link>
          {form.status === 'draft' && (
            <WsIconBtn
              icon={Send}
              label={noQuestions ? 'لا يمكن نشر نموذج بلا أسئلة' : 'نشر'}
              disabled={noQuestions || busy}
              onClick={onPublish}
            />
          )}
          {form.status === 'published' && (
            <WsIconBtn icon={Archive} label="أرشفة" disabled={busy} onClick={onArchive} />
          )}
          <WsIconBtn icon={Trash2} label="حذف" onClick={onDelete} />
        </span>
      </td>
    </tr>
  )
}

function BucketRow({
  label,
  sub,
  count,
  icon: Icon,
}: {
  label: string
  sub: string
  count: number
  icon: typeof FileText
}) {
  const hot = count > 0
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 7px',
        borderRadius: 7,
        background: hot ? TONES.amber.bg : undefined,
      }}
    >
      <Icon style={{ width: 13, height: 13, flexShrink: 0, color: hot ? TONES.amber.tx : 'var(--ws-text-2)' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'var(--ws-text-2)' }}>{sub}</span>
      </span>
      <b style={{ flexShrink: 0, color: hot ? TONES.amber.tx : 'var(--ws-text-2)' }}>{count}</b>
    </div>
  )
}

/* ======================================================
   مصمّم النموذج — ثلاثة أعمدة ملتصقة، لا تمريرَ طويل
   ------------------------------------------------------
   كان ٨٦٢ سطراً يفتح كلَّ حقلٍ بالكامل داخل تمريرةٍ واحدة، فنموذجٌ
   بعشرة أسئلة لا تُرى بنيتُه أبداً. صار: لوحةُ أنواعٍ يميناً، ولوحُ
   صفوفٍ مطويّة وسطاً، وخصائصُ السؤال المحدَّد يساراً — وثلاثةُ
   تبويبات تفصل البنية عن الإعدادات عن المعاينة.

   المسؤولية هنا: الحالة والتحقّق وبناء الحمولة. أمّا الرسمُ فمقسومٌ
   على مكوّناتٍ مجاورة في نفس المجلّد.
   ====================================================== */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Eye,
  LayoutList,
  ListChecks,
  Lock,
  Save,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { prepareAssignmentPayload } from '@/modules/forms/api'
import { fieldTypeStoresAnswer } from '@/modules/forms/constants'
import type { FormFieldSettings, FormFieldType, FormSummary, FormUpsertPayload } from '@/modules/forms/types'
import { WsAlert, WsBtn, WsChip, WsLayout, WsMain, WsSideCol, WsToolbar } from '@/shared/workspace'
import { FieldCanvas } from './field-canvas'
import { FieldPropertiesPanel } from './field-properties-panel'
import { FieldTypePalette } from './field-type-palette'
import { FormPreview } from './form-preview'
import { FormSettingsPanel } from './form-settings-panel'
import {
  buildAssignmentInputs,
  buildFieldsPayload,
  createDraftField,
  duplicateDraftField,
  getDefaultGeneralState,
  mapAssignmentsToSelection,
  mapFormToDraftFields,
  retypeDraftField,
  slugifyKey,
  structureUnchanged,
  toISOStringFromLocal,
  validateDraft,
} from './designer-model'
import type { AudienceSelection, DraftField, FieldError, GeneralError, GeneralState } from './designer-model'

type DesignerTab = 'fields' | 'settings' | 'preview'

interface FormDesignerProps {
  mode: 'create' | 'edit'
  initialForm?: FormSummary | null
  submitting?: boolean
  onSubmit: (payload: FormUpsertPayload) => Promise<void>
  onCancel?: () => void
}

/** بصمةٌ للمقارنة وحدها — تكشف «هل تغيّر شيء منذ آخر حفظ؟» */
function snapshotOf(general: GeneralState, fields: DraftField[], selection: AudienceSelection): string {
  return JSON.stringify({ general, fields: buildFieldsPayload(fields), selection })
}

export function FormDesigner({ mode, initialForm, submitting = false, onSubmit, onCancel }: FormDesignerProps) {
  const navigate = useNavigate()

  const [general, setGeneral] = useState<GeneralState>(() => getDefaultGeneralState(mode, initialForm))
  const [fields, setFields] = useState<DraftField[]>(() => mapFormToDraftFields(initialForm))
  const [selection, setSelection] = useState<AudienceSelection>(() =>
    mapAssignmentsToSelection(initialForm?.assignments ?? []),
  )
  const [baseline, setBaseline] = useState('')

  const [tab, setTab] = useState<DesignerTab>('fields')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusLabelKey, setFocusLabelKey] = useState<string | null>(null)
  const [generalErrors, setGeneralErrors] = useState<GeneralError>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError>>({})

  // إعادةُ التزامن مع الخادم: تتبع المعرّف و`updated_at` معاً، فيرتدّ خطُّ الأساس
  // بعد كلّ حفظٍ ناجح ولا يبقى المصمّم يزعم أن هناك تغييراتٍ غير محفوظة.
  useEffect(() => {
    const nextGeneral = getDefaultGeneralState(mode, initialForm)
    const nextFields = mapFormToDraftFields(initialForm)
    const nextSelection = mapAssignmentsToSelection(initialForm?.assignments ?? [])

    setGeneral(nextGeneral)
    setFields(nextFields)
    setSelection(nextSelection)
    setBaseline(snapshotOf(nextGeneral, nextFields, nextSelection))
    setGeneralErrors({})
    setFieldErrors({})
    // التبعيّة على قيمتين لا على الكائن عمداً: استعلامُ التفاصيل يعيد كائناً
    // جديداً مع كل إعادة جلب، فلو تعلّق الأثر به لمسح ما يكتبه المصمّم كلّما
    // ركّز نافذته. المعرّف و`updated_at` وحدهما يعنيان «وصلت نسخةٌ أخرى فعلاً».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialForm?.id, initialForm?.updated_at])

  /** ردٌّ واحدٌ يقفل البنية: الخادم يمسح الحقول ويعيدها عند أي مزامنة، والإجابات تتبعها حذفاً */
  const structureLocked = mode === 'edit' && (initialForm?.submissions_count ?? 0) > 0
  const storedSections = initialForm?.sections ?? []
  const editingDisabled = submitting || structureLocked

  const selectedField = fields.find((field) => field.localId === selectedId) ?? null
  const questionCount = fields.filter((field) => fieldTypeStoresAnswer(field.type)).length
  const errorCount = Object.keys(fieldErrors).length + Object.keys(generalErrors).length
  const isDirty = baseline !== '' && snapshotOf(general, fields, selection) !== baseline

  const assignments = useMemo(
    () => prepareAssignmentPayload(buildAssignmentInputs(general.target_audience, selection)),
    [general.target_audience, selection],
  )

  /* ── تحرير الحالة ── */

  /** كل تحريرٍ يمسح الخطأ الذي يخصّه وحده — لا يمسح أخطاء غيره فتختفي بلا إصلاح */
  const handleGeneralChange = <K extends keyof GeneralState>(key: K, value: GeneralState[K]) => {
    setGeneral((previous) => ({ ...previous, [key]: value }))
    setGeneralErrors((previous) => {
      const next = { ...previous }
      if (key === 'title') delete next.title
      if (key === 'target_audience') delete next.assignments
      if (key === 'start_at' || key === 'end_at') delete next.dates
      return next
    })
  }

  const handleAdd = (type: FormFieldType) => {
    if (editingDisabled) return

    const created = createDraftField(type, fields)
    setFields((previous) => [...previous, created])
    setSelectedId(created.localId)
    setFocusLabelKey(created.localId)
    setGeneralErrors((previous) => {
      const next = { ...previous }
      delete next.fields
      return next
    })
  }

  const handleSelect = (localId: string) => {
    setSelectedId(localId)
    setFocusLabelKey(null)
  }

  /** الخطأ يُنزَع لا يُفرَّغ: مفتاحٌ بقيمةٍ فارغة يبقى معدوداً في «كم خطأ يمنع الحفظ» */
  const clearFieldError = (localId: string) => {
    setFieldErrors((previous) => {
      if (!previous[localId]) return previous
      const next = { ...previous }
      delete next[localId]
      return next
    })
  }

  const patchField = (localId: string, patch: Partial<DraftField>) => {
    setFields((previous) =>
      previous.map((field) => {
        if (field.localId !== localId) return field

        const next = { ...field, ...patch }

        // المفتاح يتبع التسمية ما دام تلقائياً. والتسميةُ العربية لا تُنتج حرفاً
        // لاتينياً، فلو ولّدنا مفتاحاً عند كل ضغطةٍ لتغيّر المفتاح عشوائياً مع كل
        // حرف — لذلك نُبقي السابق حين لا يبقى من النصّ ما يُشتق منه.
        if (patch.label !== undefined && field.autoKey) {
          const derived = slugifyKey(patch.label)
          if (derived) next.field_key = derived
        }

        return next
      }),
    )
    clearFieldError(localId)
  }

  const handleRetype = (localId: string, type: FormFieldType) => {
    setFields((previous) =>
      previous.map((field) => (field.localId === localId ? retypeDraftField(field, type) : field)),
    )
  }

  const handleSettings = (localId: string, patch: FormFieldSettings) => {
    setFields((previous) =>
      previous.map((field) =>
        field.localId === localId ? { ...field, settings: { ...(field.settings ?? {}), ...patch } } : field,
      ),
    )
    clearFieldError(localId)
  }

  const handleDuplicate = (localId: string) => {
    const index = fields.findIndex((field) => field.localId === localId)
    if (index === -1) return

    const copy = duplicateDraftField(fields[index], fields)
    setFields((previous) => [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)])
    setSelectedId(copy.localId)
    setFocusLabelKey(null)
  }

  const handleRemove = (localId: string) => {
    setFields((previous) => previous.filter((field) => field.localId !== localId))
    clearFieldError(localId)
    setSelectedId((previous) => (previous === localId ? null : previous))
  }

  const handleMove = (from: number, to: number) => {
    setFields((previous) => {
      if (from === to || from < 0 || to < 0 || from >= previous.length || to >= previous.length) {
        return previous
      }
      const next = [...previous]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  /* ── الحفظ ── */

  const handleSubmit = async () => {
    if (submitting) return

    const result = validateDraft(general, fields, selection)
    setGeneralErrors(result.general)
    setFieldErrors(result.fields)

    if (!result.ok) {
      // ننقل المصمّم إلى موضع الخطأ بدل أن نتركه يبحث عنه بين التبويبات
      const firstBadField = fields.find((field) => result.fields[field.localId])
      if (firstBadField) {
        setTab('fields')
        setSelectedId(firstBadField.localId)
      } else {
        setTab('settings')
      }
      return
    }

    const previousSettings = (initialForm?.settings as Record<string, unknown> | null) ?? null

    // البنية لا تُرسَل إلا إذا تغيّرت فعلاً — انظر `structureSignature` في
    // designer-model: إرسالها بلا تغييرٍ كان يرتدّ ٤٢٢ على كل نموذجٍ وصله ردّ.
    // والمقفولُ لا يُرسل بنيةً أصلاً: التحرير معطّلٌ فيه فلا تغيير ممكن، وحملُها
    // يفتح باب رفضٍ لا سبب له (نموذجٌ بأقسامٍ يسطّحها المصمّم مثلاً).
    const sendStructure = mode === 'create' || (!structureLocked && !structureUnchanged(initialForm, fields))

    const payload: FormUpsertPayload = {
      title: general.title.trim(),
      description: general.description.trim() || null,
      status: general.status,
      category: general.category.trim() || null,
      target_audience: general.target_audience,
      max_responses: general.max_responses ? Number(general.max_responses) : null,
      allow_multiple_submissions: general.allow_multiple_submissions,
      allow_edit_after_submit: general.allow_edit_after_submit,
      requires_approval: general.requires_approval,
      start_at: toISOStringFromLocal(general.start_at),
      end_at: toISOStringFromLocal(general.end_at),
      settings: { ...(previousSettings ?? {}), requires_approval: general.requires_approval },
      assignments,
      ...(sendStructure ? { sections: [], fields: buildFieldsPayload(fields) } : {}),
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      console.error('Failed to submit form payload', error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    navigate('/admin/forms')
  }

  /* ── الرسم ── */

  const tabs: Array<{ value: DesignerTab; label: string; icon: LucideIcon; count?: number }> = [
    { value: 'fields', label: 'الأسئلة', icon: ListChecks, count: questionCount },
    { value: 'settings', label: 'الإعدادات', icon: Settings2 },
    { value: 'preview', label: 'المعاينة', icon: Eye },
  ]

  return (
    <WsLayout>
      {tab === 'fields' && (
        <WsSideCol
          side="start"
          title="أنواع الأسئلة"
          icon={LayoutList}
          storageKey="ws:form-designer:palette"
          width={300}
        >
          <FieldTypePalette disabled={editingDisabled} onAdd={handleAdd} />
        </WsSideCol>
      )}

      <WsMain>
        <WsToolbar>
          <div className="ws-seg">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`ws-seg__btn ${tab === item.value ? 'is-active' : ''}`}
                onClick={() => setTab(item.value)}
              >
                <item.icon style={{ width: 13, height: 13 }} />
                {item.label}
                {item.count != null && <span className="ws-count">{item.count}</span>}
              </button>
            ))}
          </div>

          {isDirty && <WsChip tone="amber">تغييرات غير محفوظة</WsChip>}
          {errorCount > 0 && (
            <WsChip tone="red" icon={AlertTriangle}>
              {errorCount === 1 ? 'خطأ واحد يمنع الحفظ' : `${errorCount} أخطاء تمنع الحفظ`}
            </WsChip>
          )}

          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <WsBtn icon={X} onClick={handleCancel} disabled={submitting}>
              إلغاء
            </WsBtn>
            <WsBtn variant="primary" icon={Save} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'جارٍ الحفظ…' : mode === 'create' ? 'حفظ النموذج' : 'حفظ التعديلات'}
            </WsBtn>
          </div>
        </WsToolbar>

        {structureLocked && (
          <WsAlert tone="warn" icon={Lock}>
            وصل هذا النموذج {initialForm?.submissions_count} ردّاً، فالأسئلة مقفلة: الإجابات المحفوظة مرتبطة
            بالأسئلة نفسها وتُحذف بحذفها. ويبقى مسموحاً تعديل العنوان والوصف والمواعيد وسقف الردود والجمهور.
          </WsAlert>
        )}

        {storedSections.length > 0 && (
          <WsAlert tone="warn">
            هذا النموذج يحتوي {storedSections.length} قسماً، والمصمّم يعرض أسئلتها في قائمةٍ واحدة — فحفظُه من هنا
            يدمج الأقسام ويُلغيها.
          </WsAlert>
        )}

        {generalErrors.fields && <WsAlert tone="error">{generalErrors.fields}</WsAlert>}
        {tab !== 'settings' && generalErrors.assignments && (
          <WsAlert tone="error">
            {generalErrors.assignments}
            <WsBtn size="sm" onClick={() => setTab('settings')}>
              فتح الإعدادات
            </WsBtn>
          </WsAlert>
        )}

        <div className="ws-block__scroll">
          {tab === 'fields' && (
            <FieldCanvas
              fields={fields}
              selectedId={selectedId}
              errors={fieldErrors}
              locked={editingDisabled}
              onSelect={handleSelect}
              onDuplicate={handleDuplicate}
              onRemove={handleRemove}
              onMove={handleMove}
            />
          )}

          {tab === 'settings' && (
            <FormSettingsPanel
              general={general}
              selection={selection}
              errors={generalErrors}
              disabled={submitting}
              onGeneralChange={handleGeneralChange}
              onSelectionChange={setSelection}
            />
          )}

          {tab === 'preview' && (
            <FormPreview general={general} fields={fields} formId={initialForm?.id ?? 0} />
          )}
        </div>
      </WsMain>

      {tab === 'fields' && (
        <WsSideCol title="خصائص السؤال" icon={SlidersHorizontal} storageKey="ws:form-designer:props">
          <FieldPropertiesPanel
            field={selectedField}
            errors={selectedField ? fieldErrors[selectedField.localId] : undefined}
            disabled={editingDisabled}
            focusLabelKey={focusLabelKey}
            onPatch={(patch) => selectedField && patchField(selectedField.localId, patch)}
            onRetype={(type) => selectedField && handleRetype(selectedField.localId, type)}
            onSettings={(patch) => selectedField && handleSettings(selectedField.localId, patch)}
          />
        </WsSideCol>
      )}
    </WsLayout>
  )
}

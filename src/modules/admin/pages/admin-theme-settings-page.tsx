import { useMemo, useState } from 'react'
import {
  Bell,
  Check,
  Monitor,
  Palette,
  RotateCcw,
  Search,
  Tags,
  Users,
} from 'lucide-react'
import {
  WsPage,
  WsHeader,
  WsFact,
  WsToolbar,
  WsField,
  WsSwitch,
  WsLayout,
  WsMain,
  WsSideCol,
  WsBlock,
  WsBtn,
  TONES,
  ToneChip,
} from '@/shared/workspace'
import { useTheme } from '@/shared/themes'
import type { ThemeColors } from '@/shared/themes/theme-definitions'

/* المناطق الست عشرة كما يحقنها ThemeProvider على :root — بلا زيادة ولا نقصان */
const COLOR_ZONES: Array<{ key: keyof ThemeColors; label: string; cssVar: string }> = [
  { key: 'background', label: 'الخلفية', cssVar: '--color-background' },
  { key: 'surface', label: 'السطح', cssVar: '--color-surface' },
  { key: 'primary', label: 'الأساسي', cssVar: '--color-primary' },
  { key: 'primaryDark', label: 'الأساسي الداكن', cssVar: '--color-primary-dark' },
  { key: 'primaryLight', label: 'الأساسي الفاتح', cssVar: '--color-primary-light' },
  { key: 'accent', label: 'الثانوي', cssVar: '--color-accent' },
  { key: 'danger', label: 'الخطر', cssVar: '--color-danger' },
  { key: 'success', label: 'النجاح', cssVar: '--color-success' },
  { key: 'warning', label: 'التحذير', cssVar: '--color-warning' },
  { key: 'muted', label: 'الخافت', cssVar: '--color-muted' },
  { key: 'textPrimary', label: 'النص الأساسي', cssVar: '--color-text-primary' },
  { key: 'textSecondary', label: 'النص الثانوي', cssVar: '--color-text-secondary' },
  { key: 'border', label: 'الحدود', cssVar: '--color-border' },
  { key: 'sidebar', label: 'القائمة الجانبية', cssVar: '--color-sidebar' },
  { key: 'header', label: 'الترويسة', cssVar: '--color-header' },
  { key: 'sidebarText', label: 'نص القائمة', cssVar: '--color-sidebar-text' },
]

export function AdminThemeSettingsPage() {
  const { currentTheme, setTheme, availableThemes } = useTheme()

  /* حالة عرض بحتة: المظهر المُحوَّم عليه — لا تكتب شيئاً ولا تلمس الكونتكست */
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)

  const fit = useMemo(
    () => availableThemes.find((t) => t.id === hoveredId) ?? currentTheme,
    [availableThemes, hoveredId, currentTheme],
  )
  const isFitting = fit.id !== currentTheme.id

  /**
   * ★ غرفة القياس — مرآة تُلبِس لوحتك المظهرَ المرشَّح قبل اعتماده.
   * صادقة بالبناء لا محاكاةً: المتغيرات الستة عشر لا يكتبها أحد إلا ThemeProvider
   * على :root سطرياً، وبلا !important — فإعلان سطري على الغلاف يفوز على شجرته الفرعية.
   * ولا data-theme هنا عمداً: الخصائص المخصّصة تُورَّث، فوضعه كان سيجعل الغرفة
   * ترث ما لا يخصّها وتكذب بالضبط حين يبحث المدير عن مخرج من ثيم داكن.
   */
  const mirrorVars = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const zone of COLOR_ZONES) {
      vars[zone.cssVar] = fit.colors[zone.key]
    }
    return vars as React.CSSProperties
  }, [fit])

  return (
    <WsPage>
      <WsHeader
        title="المظهر والألوان"
        badge={currentTheme.nameAr}
        actions={
          <>
            <WsBtn
              icon={RotateCcw}
              onClick={() => setTheme('default')}
              disabled={currentTheme.id === 'default'}
            >
              رجوع للافتراضي
            </WsBtn>
            {isFitting && (
              <WsBtn variant="primary" icon={Check} onClick={() => setTheme(fit.id)}>
                اعتماد {fit.nameAr}
              </WsBtn>
            )}
          </>
        }
        facts={
          <>
            <WsFact icon={Check} label="المُعتمد الآن">
              <span style={{ color: TONES.green.tx }}>{currentTheme.nameAr}</span>
            </WsFact>
            {isFitting && (
              <WsFact icon={Monitor} label="قيد القياس">
                <span style={{ color: TONES.purple.tx }}>{fit.nameAr}</span>
              </WsFact>
            )}
            <WsFact icon={Palette} label="المدى">صفحات الإدارة</WsFact>
            <WsFact icon={Monitor} label="الحفظ">هذا المتصفح</WsFact>
          </>
        }
      />

      <WsToolbar>
        <WsField label="تسمية المناطق">
          <WsSwitch checked={showLabels} onChange={setShowLabels} />
        </WsField>
        <span style={{ fontSize: 11, color: 'var(--ws-text-2)' }}>
          مرّر على أي مظهر لتقيسه في المرآة — النقر يعتمده فوراً ويُحفظ في هذا المتصفح
        </span>
      </WsToolbar>

      <WsLayout>
        <WsMain>
          <WsBlock
            fill
            scroll
            title={`غرفة القياس — ${fit.nameAr}`}
            icon={Monitor}
            tools={
              isFitting ? (
                <ToneChip tone={TONES.purple}>معاينة — غير معتمد</ToneChip>
              ) : (
                <ToneChip tone={TONES.green}>هذا مظهرك الحالي</ToneChip>
              )
            }
          >
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* المرآة: :root ثانٍ محصور في إطار */}
              <div
                className="ws-fitroom ws-rise"
                key={fit.id}
                style={{
                  ...mirrorVars,
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--ws-border)',
                  boxShadow: isFitting ? `0 0 0 2px ${TONES.purple.bd}` : undefined,
                }}
              >
                <div style={{ display: 'flex', minHeight: 320, background: 'var(--color-background)' }}>
                  {/* القائمة الجانبية */}
                  <div
                    style={{
                      width: 132,
                      flexShrink: 0,
                      background: 'var(--color-sidebar)',
                      color: 'var(--color-sidebar-text)',
                      padding: '10px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginBottom: 6 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: 'var(--color-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Palette style={{ width: 11, height: 11, color: '#fff' }} />
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>الرائد</span>
                    </div>
                    {[
                      { icon: Users, label: 'الطلاب', active: true },
                      { icon: Tags, label: 'الحضور', active: false },
                      { icon: Bell, label: 'الإشعارات', active: false },
                    ].map(({ icon: Icon, label, active }) => (
                      <span
                        key={label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 7px',
                          borderRadius: 7,
                          fontSize: 10.5,
                          fontWeight: active ? 800 : 500,
                          background: active ? 'var(--color-primary)' : 'transparent',
                          color: active ? '#fff' : 'var(--color-sidebar-text)',
                          opacity: active ? 1 : 0.75,
                        }}
                      >
                        <Icon style={{ width: 11, height: 11 }} />
                        {label}
                      </span>
                    ))}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* الترويسة */}
                    <div
                      style={{
                        background: 'var(--color-header)',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Search style={{ width: 12, height: 12, color: 'var(--color-sidebar-text)', opacity: 0.8 }} />
                        <span style={{ fontSize: 10.5, color: 'var(--color-sidebar-text)', opacity: 0.8 }}>بحث...</span>
                      </span>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 800,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        م
                      </span>
                    </div>

                    {/* الجسم */}
                    <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        تقرير الحضور اليومي
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--color-text-secondary)' }}>
                        هكذا سيبدو نص الصفحات الثانوي بهذا المظهر
                      </span>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <MirrorChip bg="var(--color-success)" label="حاضر" />
                        <MirrorChip bg="var(--color-warning)" label="متأخر" />
                        <MirrorChip bg="var(--color-danger)" label="غائب" />
                        <MirrorChip bg="var(--color-muted)" label="مستأذن" />
                      </div>

                      {/* سطح + حدود + جدول مصغّر */}
                      <div
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 9,
                          overflow: 'hidden',
                        }}
                      >
                        {['محمد العتيبي', 'سعد الحربي', 'فهد القحطاني'].map((name, index) => (
                          <div
                            key={name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 9px',
                              borderTop: index > 0 ? '1px solid var(--color-border)' : undefined,
                            }}
                          >
                            <span style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>{name}</span>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: 999,
                                background: index === 2 ? 'var(--color-danger)' : 'var(--color-success)',
                                color: '#fff',
                              }}
                            >
                              {index === 2 ? 'غائب' : 'حاضر'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        <span
                          style={{
                            padding: '5px 12px',
                            borderRadius: 8,
                            background: 'var(--color-primary)',
                            color: '#fff',
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        >
                          حفظ
                        </span>
                        <span
                          style={{
                            padding: '5px 12px',
                            borderRadius: 8,
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary-dark)',
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        >
                          إلغاء
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* تسمية المناطق: الحقيقة الخام تحت المرآة */}
              {showLabels && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 5 }}>
                  {COLOR_ZONES.map((zone) => (
                    <div
                      key={zone.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--ws-border)',
                        borderRadius: 7,
                        padding: '4px 6px',
                      }}
                    >
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          flexShrink: 0,
                          background: fit.colors[zone.key],
                          border: '1px solid var(--ws-border)',
                        }}
                      />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 700 }}>{zone.label}</span>
                        <span style={{ display: 'block', fontSize: 9, fontFamily: 'monospace', color: 'var(--ws-text-2)', direction: 'ltr' }}>
                          {fit.colors[zone.key]}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* نطاق المرآة معلَن لا مُدَّعى */}
              <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                المرآة صادقة في الألوان الستة عشر — وهي موضوع هذه الصفحة. أما كثافة الخطوط والمسافات
                فتُطبَّق على الصفحة كلها عند الاعتماد ولا تظهر داخل الإطار.
              </p>
            </div>
          </WsBlock>
        </WsMain>

        <WsSideCol side="end" title="المظاهر" icon={Palette} storageKey="ws:theme:sidecol" width={300}>
          <WsBlock fill scroll>
            {availableThemes.map((theme) => {
              const isCommitted = currentTheme.id === theme.id
              const isFit = fit.id === theme.id && !isCommitted
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  onMouseEnter={() => setHoveredId(theme.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(theme.id)}
                  onBlur={() => setHoveredId(null)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'right',
                    padding: '9px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--ws-hairline)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'var(--ws-text)',
                    background: isCommitted
                      ? 'var(--ws-accent-soft)'
                      : isFit
                        ? TONES.purple.bg
                        : 'transparent',
                    boxShadow: isCommitted
                      ? 'inset 0 0 0 1px var(--ws-accent)'
                      : isFit
                        ? `inset 0 0 0 1px ${TONES.purple.tx}`
                        : undefined,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme.colors.primary,
                      }}
                    >
                      <Palette style={{ width: 13, height: 13, color: '#fff' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{theme.nameAr}</span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: 'var(--ws-text-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {theme.descriptionAr}
                      </span>
                    </span>
                    {isCommitted && <Check style={{ width: 14, height: 14, color: 'var(--ws-accent)', flexShrink: 0 }} />}
                  </span>

                  {/* شريط الألوان: أربع مناطق تكفي للتمييز في 300px */}
                  <span style={{ display: 'flex', gap: 2, marginTop: 6, height: 8, borderRadius: 3, overflow: 'hidden' }}>
                    {(['primary', 'sidebar', 'header', 'accent'] as Array<keyof ThemeColors>).map((key) => (
                      <span key={key} style={{ flex: 1, background: theme.colors[key] }} />
                    ))}
                  </span>
                </button>
              )
            })}

            <div style={{ padding: 12 }}>
              <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ws-text-2)', lineHeight: 1.8 }}>
                يُحفظ اختيارك في هذا المتصفح ويُطبَّق فوراً على صفحات لوحة التحكم كلها. مرّر على أي
                مظهر لتقيسه في المرآة قبل النقر.
              </p>
            </div>
          </WsBlock>
        </WsSideCol>
      </WsLayout>
    </WsPage>
  )
}

/** شريحة داخل المرآة — تقرأ متغيرات الغرفة لا متغيرات الصفحة */
function MirrorChip({ bg, label }: { bg: string; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 999,
        background: bg,
        color: '#fff',
        fontSize: 9.5,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  )
}

import type { ReactNode } from 'react'
import { STEP_INFO } from '../constants'
import type { OnboardingStep, OnboardingStepKey } from '../types'

interface OnboardingLayoutProps {
  steps: OnboardingStep[]
  currentStep: OnboardingStepKey
  children: ReactNode
}

/* معالج الإعداد على «النمط الملتصق» نفسه الذي تعمل به لوحة الأدمن:
   ارتفاع الشاشة تماماً، عمود خطوات ملتصق بالحافة، والمحتوى وحده يتمرر
   داخلياً — لا تمرير للصفحة كلها.

   ما كان قبلاً: min-h-screen داخل قالب التسويق (هيدر «الدخول» فوق مدير
   سجّل دخوله للتو + فوتر + max-w-6xl)، فينتج هيدران وفوتران وارتفاعٌ
   يتجاوز الشاشة. ولوحة teal/emerald/slate غريبة عن النظام كلياً.

   العمود رأسي لا شريط أفقي: ثماني خطوات على شريط أفقي تُسحق عناوينها،
   وعمودياً يتّسع لكل عنوان مع حالته وتبقى الخريطة كاملة أمام العين. */
export function OnboardingLayout({ steps, currentStep, children }: OnboardingLayoutProps) {
  const stepInfo = STEP_INFO[currentStep]
  const currentIndex = steps.findIndex((s) => s.key === currentStep)
  const doneCount = steps.filter((s) => s.is_completed).length
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0

  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh]">
      <div className="ws-page">
        {/* ── ترويسة: عنوان الخطوة ووصفها ── */}
        <header className="ws-header">
          <div className="ws-header__top">
            <div className="ws-header__info">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[15px] font-black text-white"
                style={{ background: 'var(--color-primary-dark)' }}
                aria-hidden
              >
                ر
              </span>
              <div className="min-w-0">
                <h1 className="ws-header__title">{stepInfo.title}</h1>
                <p className="m-0 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {stepInfo.description}
                </p>
              </div>
            </div>
            <div className="ws-header__actions">
              <span className="ws-header__badge">
                الخطوة {currentIndex + 1} من {steps.length}
              </span>
            </div>
          </div>

          {/* شريط التقدّم — الوحيد الظاهر على الجوال حيث يُطوى العمود.
              الإخفاء بعلامة ! لأن workspace.css يُحمَّل بعد أدوات تايلويند،
              فقاعدة .ws-header__facts{display:flex} تغلب lg:hidden بلا إجبار */}
          <div className="ws-header__facts lg:!hidden">
            <div className="ws-progress w-full">
              <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                {pct}%
              </span>
              <div className="ws-progressbar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {STEP_INFO[currentStep].shortTitle}
              </span>
            </div>
          </div>
        </header>

        <div className="ws-layout">
          {/* ── المحتوى: يتمرر داخلياً وحده ── */}
          <main className="ws-main">
            <div className="ws-block ws-block--fill">
              <div className="ws-block__scroll">
                <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">{children}</div>
              </div>
            </div>
          </main>

          {/* ── عمود الخطوات (يمين في RTL) — يُطوى على الجوال.
                 العلامة ! لازمة هنا أيضاً: .ws-sidecol{display:flex} تغلب hidden ── */}
          <aside className="ws-sidecol ws-sidecol--start !hidden lg:!flex" style={{ width: 248 }}>
            <div className="ws-block__head">
              <span className="ws-block__title">خطوات الإعداد</span>
              <span className="ws-count">
                {doneCount}/{steps.length}
              </span>
            </div>

            <div className="px-3 pt-3">
              <div className="ws-progressbar">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>

            <nav className="ws-sidecol__scroll p-2" aria-label="خطوات الإعداد">
              <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
                {steps.map((step, index) => {
                  const info = STEP_INFO[step.key]
                  const isActive = step.key === currentStep
                  const isDone = step.is_completed

                  return (
                    <li key={step.key}>
                      <div
                        aria-current={isActive ? 'step' : undefined}
                        className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2"
                        style={{
                          background: isActive ? 'var(--ws-accent-soft)' : 'transparent',
                          boxShadow: isActive ? 'inset 2px 0 0 var(--color-primary)' : undefined,
                        }}
                      >
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black"
                          style={
                            isDone
                              ? { background: 'var(--ws-green)', color: '#fff' }
                              : isActive
                                ? { background: 'var(--color-primary-dark)', color: '#fff' }
                                : {
                                    background: 'var(--color-sunken)',
                                    color: 'var(--color-text-secondary)',
                                  }
                          }
                        >
                          {isDone ? <i className="bi bi-check text-[14px]" /> : index + 1}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[12.5px]"
                            style={{
                              color: isActive || isDone ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                              fontWeight: isActive ? 700 : 600,
                            }}
                          >
                            {info.shortTitle}
                          </span>
                        </span>

                        <i
                          className={`${info.icon} text-[13px] shrink-0`}
                          style={{
                            color: isActive
                              ? 'var(--color-primary-dark)'
                              : isDone
                                ? 'var(--ws-green)'
                                : 'var(--color-border-strong)',
                          }}
                          aria-hidden
                        />
                      </div>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div
              className="px-3 py-2.5 text-[11px]"
              style={{ borderTop: '1px solid var(--ws-hairline)', color: 'var(--color-text-secondary)' }}
            >
              نظام الرائد — إعداد المدرسة
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

import { Check, Crown, Sparkles, X, Eye } from 'lucide-react'
import type { SubscriptionPlanRecord } from '../types'
import clsx from 'classnames'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const FEATURE_LABELS: Record<string, string> = {
  guidance: 'التوجيه الطلابي',
  whatsapp: 'تكامل واتساب',
  points_program: 'برنامج نقاطي',
  advanced_reports: 'تقارير متقدمة',
  priority_support: 'دعم فني أولوية',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value)
}

interface PlanCardProps {
  plan: SubscriptionPlanRecord
  highlight?: boolean
  current?: boolean
  onAction?: (plan: SubscriptionPlanRecord) => void
  actionLabel?: string
  disabled?: boolean
  badge?: string
}

export function PlanCard({ plan, highlight = false, current = false, onAction, actionLabel, disabled, badge }: PlanCardProps) {
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const rawFeatures = plan.features ?? {}
  
  // التعامل مع شكلين من البيانات: array أو object
  const isArrayFormat = Array.isArray(rawFeatures)
  const featuresList = isArrayFormat ? rawFeatures : []
  const featuresObject = isArrayFormat ? {} : rawFeatures
  const customFeatures = !isArrayFormat ? (featuresObject.custom_features ?? []) : []

  const monthlyPrice = plan.monthly_price ?? 0
  const yearlyPrice = plan.yearly_price ?? null

  // عدد المميزات المراد عرضها مبدئياً (4 مميزات)
  const INITIAL_FEATURES_COUNT = 4
  const displayedFeatures = isArrayFormat 
    ? featuresList.slice(0, INITIAL_FEATURES_COUNT) 
    : Object.entries(featuresObject).slice(0, INITIAL_FEATURES_COUNT)
  const remainingFeaturesCount = isArrayFormat 
    ? Math.max(0, featuresList.length - INITIAL_FEATURES_COUNT)
    : Math.max(0, Object.keys(featuresObject).filter(key => key !== 'custom_features').length - INITIAL_FEATURES_COUNT)

  // منع التمرير عند فتح النافذة
  useEffect(() => {
    if (showAllFeatures) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAllFeatures])

  return (
    <article
      className={clsx(
        'flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg',
        highlight ? 'border-teal-500/80 shadow-lg' : 'border-white/40',
        current ? 'ring-2 ring-teal-500/70' : null,
      )}
      style={{ background: highlight ? 'linear-gradient(145deg, rgba(76, 175, 80, 0.08), rgba(244, 255, 248, 0.9))' : 'white' }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {highlight ? <Sparkles className="h-4 w-4" /> : <Crown className="h-4 w-4 text-amber-500" />} {plan.name}
          </div>
          {plan.description ? <p className="text-sm text-slate-600">{plan.description}</p> : null}
        </div>
        {badge ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{badge}</span> : null}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyPrice)}<span className="text-sm font-medium text-slate-500"> / شهرياً</span></p>
        {yearlyPrice ? (
          <p className="text-xs text-emerald-700">{formatCurrency(yearlyPrice)} <span className="font-medium">/ سنوياً</span></p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {/* المزايا - دعم الشكل الجديد (array) */}
        {isArrayFormat && displayedFeatures.length > 0 ? (
          displayedFeatures.map((feature: any, index: number) => {
            if (!feature || typeof feature !== 'object') return null
            const enabled = Boolean(feature.enabled ?? true)
            const label = String(feature.label || 'ميزة')
            return (
              <li key={index} className="flex items-center gap-2">
                <span
                  className={clsx(
                    'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-white',
                    enabled ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </span>
                <span className={clsx('text-xs', enabled ? 'text-slate-800' : 'text-slate-400 line-through')}>{label}</span>
              </li>
            )
          })
        ) : null}
        
        {/* المزايا - دعم الشكل القديم (object) */}
        {!isArrayFormat ? displayedFeatures.map(([key, value]) => {
          if (!(key in FEATURE_LABELS) || key === 'custom_features') return null
          const enabled = Boolean(value)
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className={clsx(
                  'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-white',
                  enabled ? 'bg-emerald-500' : 'bg-slate-300',
                )}
              >
                {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
              <span className={clsx('text-xs', enabled ? 'text-slate-800' : 'text-slate-400 line-through')}>{FEATURE_LABELS[key]}</span>
            </li>
          )
        }) : null}
        
        {/* زر عرض جميع المميزات */}
        {remainingFeaturesCount > 0 && (
          <li className="pt-2">
            <button
              type="button"
              onClick={() => setShowAllFeatures(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Eye className="h-4 w-4" />
              عرض جميع المميزات ({featuresList.length} ميزة)
            </button>
          </li>
        )}
        
        {/* حدود الطلاب والمعلمين */}
        {plan.student_limit ? (
          <li className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> حتى {plan.student_limit.toLocaleString('ar-SA')} طالب
          </li>
        ) : null}
        {plan.teacher_limit ? (
          <li className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" /> حتى {plan.teacher_limit.toLocaleString('ar-SA')} معلم
          </li>
        ) : null}
      </ul>

      <div className="mt-4 pt-4">
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={() => onAction(plan)}
            disabled={disabled || current}
            className={clsx(
              'w-full rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2',
              current
                ? 'cursor-not-allowed bg-emerald-100 text-emerald-600'
                : highlight
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-400/50'
                  : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-300/60',
            )}
          >
            {current ? 'الخطة الحالية' : actionLabel}
          </button>
        ) : null}
      </div>

      {/* نافذة عائمة لعرض جميع المميزات - خارج البطاقة باستخدام Portal */}
      {showAllFeatures && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            e.stopPropagation()
            setShowAllFeatures(false)
          }}
          style={{ margin: 0 }}
        >
          <div 
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-600">جميع المميزات المتاحة ({featuresList.length} ميزة)</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAllFeatures(false)
                  }}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {isArrayFormat ? (
                  featuresList.map((feature: any, index: number) => {
                    if (!feature || typeof feature !== 'object') return null
                    const enabled = Boolean(feature.enabled ?? true)
                    const label = String(feature.label || 'ميزة')
                    return (
                      <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <span
                          className={clsx(
                            'mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-white',
                            enabled ? 'bg-emerald-500' : 'bg-slate-300',
                          )}
                        >
                          {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </span>
                        <span className={clsx('text-sm leading-relaxed', enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through')}>
                          {label}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <>
                    {Object.entries(featuresObject).map(([key, value]) => {
                      if (!(key in FEATURE_LABELS) || key === 'custom_features') return null
                      const enabled = Boolean(value)
                      return (
                        <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <span
                            className={clsx(
                              'mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-white',
                              enabled ? 'bg-emerald-500' : 'bg-slate-300',
                            )}
                          >
                            {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                          <span className={clsx('text-sm leading-relaxed', enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through')}>
                            {FEATURE_LABELS[key]}
                          </span>
                        </div>
                      )
                    })}
                    {Array.isArray(customFeatures) && customFeatures.length > 0 ? (
                      customFeatures.map((feature: any, index: number) => {
                        if (!feature || typeof feature !== 'object') return null
                        const enabled = Boolean(feature.enabled ?? true)
                        const label = String(feature.label || 'ميزة إضافية')
                        return (
                          <div key={`custom-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <span
                              className={clsx(
                                'mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-white',
                                enabled ? 'bg-emerald-500' : 'bg-slate-300',
                              )}
                            >
                              {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </span>
                            <span className={clsx('text-sm leading-relaxed', enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through')}>
                              {label}
                            </span>
                          </div>
                        )
                      })
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAllFeatures(false)
                }}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </article>
  )
}

import { Check, Crown, Sparkles, X } from 'lucide-react'
import type { SubscriptionPlanRecord } from '../types'
import clsx from 'classnames'

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
  const rawFeatures = plan.features ?? {}
  
  // التعامل مع شكلين من البيانات: array أو object
  const isArrayFormat = Array.isArray(rawFeatures)
  const featuresList = isArrayFormat ? rawFeatures : []
  const featuresObject = isArrayFormat ? {} : rawFeatures
  const customFeatures = !isArrayFormat ? (featuresObject.custom_features ?? []) : []

  const monthlyPrice = plan.monthly_price ?? 0
  const yearlyPrice = plan.yearly_price ?? null

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
        {isArrayFormat && featuresList.length > 0 ? (
          featuresList.map((feature: any, index: number) => {
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
        {!isArrayFormat ? Object.entries(featuresObject).map(([key, value]) => {
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
        
        {/* المزايا المخصصة الإضافية (للشكل القديم فقط) */}
        {Array.isArray(customFeatures) && customFeatures.length > 0 ? (
          customFeatures.map((feature: any, index: number) => {
            if (!feature || typeof feature !== 'object') return null
            const enabled = Boolean(feature.enabled ?? true)
            const label = String(feature.label || 'ميزة إضافية')
            return (
              <li key={`custom-${index}`} className="flex items-center gap-3">
                <span
                  className={clsx(
                    'grid h-6 w-6 place-items-center rounded-full text-white',
                    enabled ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <span className={clsx(enabled ? 'text-slate-800' : 'text-slate-400 line-through')}>{label}</span>
              </li>
            )
          })
        ) : null}
        
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
    </article>
  )
}

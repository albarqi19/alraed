interface MetricCardProps {
  title: string
  value: number
  subtitle?: string
  tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'indigo'
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, { border: string; text: string; badge: string }> = {
  emerald: {
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-500/10 text-emerald-600',
  },
  sky: {
    border: 'border-sky-200',
    text: 'text-sky-600',
    badge: 'bg-sky-500/10 text-sky-600',
  },
  amber: {
    border: 'border-amber-200',
    text: 'text-amber-600',
    badge: 'bg-amber-500/10 text-amber-600',
  },
  rose: {
    border: 'border-rose-200',
    text: 'text-rose-600',
    badge: 'bg-rose-500/10 text-rose-600',
  },
  indigo: {
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    badge: 'bg-indigo-500/10 text-indigo-600',
  },
}

export function MetricCards({ cards }: { cards: MetricCardProps[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const tone = card.tone ?? 'indigo'
        const palette = toneClasses[tone]
        return (
          <article
            key={card.title}
            className={`rounded-3xl border ${palette.border} bg-white/80 p-5 shadow-sm backdrop-blur transition hover:shadow-lg`}
          >
            <p className="text-xs font-semibold text-slate-500">{card.title}</p>
            <p className="mt-3 text-3xl font-bold text-slate-800">
              {card.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
            {card.subtitle ? (
              <span className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${palette.badge}`}>
                {card.subtitle}
              </span>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

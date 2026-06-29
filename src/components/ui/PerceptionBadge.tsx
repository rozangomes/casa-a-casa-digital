import { clsx } from 'clsx'
import type { PoliticalPerception } from '@/types'

const config: Record<PoliticalPerception, { label: string; className: string }> = {
  muito_favoravel: {
    label: 'Muito favorável',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  favoravel: {
    label: 'Favorável',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  indiferente: {
    label: 'Indiferente',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  contrario: {
    label: 'Contrário',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
}

export function PerceptionBadge({ value }: { value: PoliticalPerception }) {
  const { label, className } = config[value]
  return (
    <span
      className={clsx(
        'inline-block text-xs font-medium px-2.5 py-1 rounded-full border',
        className
      )}
    >
      {label}
    </span>
  )
}

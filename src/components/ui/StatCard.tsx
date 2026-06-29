import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'white'
  sublabel?: string
}

const colorMap = {
  green: 'text-brand-primary bg-brand-primary-glow',
  yellow: 'text-brand-warning bg-brand-warning/10',
  red: 'text-brand-danger bg-brand-danger/10',
  blue: 'text-brand-info bg-brand-info/10',
  white: 'text-brand-text bg-brand-border/30',
}

export function StatCard({ label, value, icon: Icon, color = 'white', sublabel }: StatCardProps) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-4 shadow-card animate-fade-in">
      {Icon && (
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-3xl font-bold text-brand-text tabular-nums">{value}</p>
      <p className="text-sm text-brand-muted mt-1">{label}</p>
      {sublabel && <p className="text-xs text-brand-muted/60 mt-0.5">{sublabel}</p>}
    </div>
  )
}

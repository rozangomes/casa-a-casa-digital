import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface BigButtonProps {
  label: string
  sublabel?: string
  icon?: LucideIcon
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit'
}

export function BigButton({
  label,
  sublabel,
  icon: Icon,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  type = 'button',
}: BigButtonProps) {
  const base =
    'flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-bg'

  const variants = {
    primary:
      'bg-brand-primary text-brand-bg hover:bg-brand-primary-dark shadow-green-glow focus:ring-brand-primary',
    secondary:
      'bg-brand-card border border-brand-border text-brand-text hover:bg-brand-border focus:ring-brand-border',
    danger:
      'bg-brand-danger/20 border border-brand-danger text-brand-danger hover:bg-brand-danger/30 focus:ring-brand-danger',
    ghost:
      'bg-transparent border border-brand-border text-brand-muted hover:border-brand-primary hover:text-brand-primary focus:ring-brand-primary',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        base,
        variants[variant],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed active:scale-100'
      )}
    >
      {Icon && !loading && <Icon className="w-5 h-5 shrink-0" />}
      {loading && (
        <svg className="w-5 h-5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      <span className="flex flex-col items-start">
        <span>{loading ? 'Aguarde…' : label}</span>
        {sublabel && <span className="text-xs font-normal opacity-70">{sublabel}</span>}
      </span>
    </button>
  )
}

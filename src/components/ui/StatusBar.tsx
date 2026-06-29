'use client'
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx } from 'clsx'

interface StatusBarProps {
  onSync?: () => void
}

export function StatusBar({ onSync }: StatusBarProps) {
  const { syncStatus } = useAppStore()
  const { online, pending_count, last_sync, syncing } = syncStatus

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-brand-surface border-b border-brand-border text-xs">
      <div className="flex items-center gap-2">
        {online ? (
          <Wifi className="w-3.5 h-3.5 text-brand-primary" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-brand-danger" />
        )}
        <span className={online ? 'text-brand-primary' : 'text-brand-danger'}>
          {online ? 'Online' : 'Offline'}
        </span>
        {pending_count > 0 && (
          <span className="bg-brand-warning/20 text-brand-warning px-1.5 py-0.5 rounded-full">
            {pending_count} pendente{pending_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {last_sync && (
          <span className="text-brand-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(last_sync), 'HH:mm', { locale: ptBR })}
          </span>
        )}
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing || !online}
            className={clsx(
              'flex items-center gap-1 text-brand-primary cursor-pointer',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            aria-label="Sincronizar agora"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Sincronizando…' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  )
}

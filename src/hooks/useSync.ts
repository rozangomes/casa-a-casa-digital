'use client'
import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { syncAll, registerOnlineListener } from '@/lib/sync'
import { getPendingVisits } from '@/lib/db'

export function useSync() {
  const { setSyncStatus } = useAppStore()

  const runSync = useCallback(async () => {
    setSyncStatus({ syncing: true })
    try {
      await syncAll()
      const pending = await getPendingVisits()
      setSyncStatus({
        syncing: false,
        pending_count: pending.length,
        last_sync: new Date().toISOString(),
      })
    } catch {
      setSyncStatus({ syncing: false })
    }
  }, [setSyncStatus])

  useEffect(() => {
    // Detecta online/offline
    const updateOnline = () => setSyncStatus({ online: navigator.onLine })
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    updateOnline()

    // Auto-sync ao voltar online
    const unregister = registerOnlineListener(() => runSync())

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
      unregister()
    }
  }, [setSyncStatus, runSync])

  return { runSync }
}

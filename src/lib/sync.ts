// Motor de sincronização offline → Supabase
// Detecta conexão, sobe pendentes e evita duplicatas via UUID local
import { supabase } from './supabase'
import {
  getPendingVisits,
  getPendingWalks,
  markVisitSynced,
  markWalkSynced,
} from './db'

export interface SyncResult {
  success: number
  failed: number
  errors: string[]
}

export async function syncPendingVisits(): Promise<SyncResult> {
  const result: SyncResult = { success: 0, failed: 0, errors: [] }
  const pending = await getPendingVisits()

  if (pending.length === 0) return result

  for (const visit of pending) {
    try {
      const { sync_pending, ...payload } = visit

      const { error } = await supabase
        .from('visits')
        .upsert(payload, { onConflict: 'id' }) // UUID evita duplicata

      if (error) throw error

      await markVisitSynced(visit.id)
      result.success++
    } catch (err: unknown) {
      result.failed++
      result.errors.push(
        err instanceof Error ? err.message : 'Erro desconhecido'
      )
    }
  }

  return result
}

export async function syncPendingWalks(): Promise<SyncResult> {
  const result: SyncResult = { success: 0, failed: 0, errors: [] }
  const pending = await getPendingWalks()

  if (pending.length === 0) return result

  for (const walk of pending) {
    try {
      const { sync_pending, synced, ...payload } = walk

      const { error } = await supabase
        .from('walks')
        .upsert(payload, { onConflict: 'id' })

      if (error) throw error

      await markWalkSynced(walk.id)
      result.success++
    } catch (err: unknown) {
      result.failed++
      result.errors.push(
        err instanceof Error ? err.message : 'Erro desconhecido'
      )
    }
  }

  return result
}

export async function syncAll(): Promise<{ visits: SyncResult; walks: SyncResult }> {
  const [visits, walks] = await Promise.all([
    syncPendingVisits(),
    syncPendingWalks(),
  ])
  return { visits, walks }
}

// Registra listener de reconexão de rede
export function registerOnlineListener(
  onSync: (result: { visits: SyncResult; walks: SyncResult }) => void
): () => void {
  const handler = async () => {
    const result = await syncAll()
    onSync(result)
  }

  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}

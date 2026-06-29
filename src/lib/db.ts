// IndexedDB via idb — armazena visitas offline com segurança
import { openDB, type IDBPDatabase } from 'idb'
import type { Visit, User, Walk } from '@/types'

const DB_NAME = 'impulso-territorio'
const DB_VERSION = 1

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Tabela de visitas locais
      if (!db.objectStoreNames.contains('visits')) {
        const visitStore = db.createObjectStore('visits', { keyPath: 'id' })
        visitStore.createIndex('by_user', 'user_id')
        visitStore.createIndex('by_pending', 'sync_pending')
        visitStore.createIndex('by_date', 'visited_at')
      }

      // Usuário local (sessão)
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' })
      }

      // Caminhadas locais
      if (!db.objectStoreNames.contains('walks')) {
        const walkStore = db.createObjectStore('walks', { keyPath: 'id' })
        walkStore.createIndex('by_user', 'user_id')
        walkStore.createIndex('by_pending', 'sync_pending')
      }
    },
  })
}

// ── Visitas ─────────────────────────────────────────────────────────────────

export async function saveVisit(visit: Visit): Promise<void> {
  const db = await getDB()
  await db.put('visits', visit)
}

export async function getAllVisits(): Promise<Visit[]> {
  const db = await getDB()
  return db.getAll('visits')
}

export async function getPendingVisits(): Promise<Visit[]> {
  const db = await getDB()
  const all = await db.getAll('visits')
  return all.filter((v) => v.sync_pending)
}

export async function markVisitSynced(id: string): Promise<void> {
  const db = await getDB()
  const visit = await db.get('visits', id)
  if (visit) {
    visit.sync_pending = false
    visit.synced_at = new Date().toISOString()
    await db.put('visits', visit)
  }
}

export async function getTodayVisits(userId: string): Promise<Visit[]> {
  const db = await getDB()
  const all = await db.getAll('visits')
  const today = new Date().toISOString().slice(0, 10)
  return all.filter(
    (v) => v.user_id === userId && v.visited_at.startsWith(today)
  )
}

export async function getVisitsByUser(userId: string): Promise<Visit[]> {
  const db = await getDB()
  const all = await db.getAll('visits')
  return all.filter((v) => v.user_id === userId)
}

// ── Sessão ───────────────────────────────────────────────────────────────────

export async function saveSession(user: User): Promise<void> {
  const db = await getDB()
  await db.put('session', { key: 'current_user', ...user })
}

export async function getSession(): Promise<User | null> {
  const db = await getDB()
  const session = await db.get('session', 'current_user')
  if (!session) return null
  const { key, ...user } = session
  return user as User
}

export async function clearSession(): Promise<void> {
  const db = await getDB()
  await db.delete('session', 'current_user')
}

// ── Caminhadas ───────────────────────────────────────────────────────────────

export async function saveWalk(walk: Walk): Promise<void> {
  const db = await getDB()
  await db.put('walks', walk)
}

export async function getPendingWalks(): Promise<Walk[]> {
  const db = await getDB()
  const all = await db.getAll('walks')
  return all.filter((w) => w.sync_pending)
}

export async function markWalkSynced(id: string): Promise<void> {
  const db = await getDB()
  const walk = await db.get('walks', id)
  if (walk) {
    walk.sync_pending = false
    walk.synced = true
    await db.put('walks', walk)
  }
}

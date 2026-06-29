import { create } from 'zustand'
import type { User, Visit, SyncStatus } from '@/types'

interface AppState {
  user: User | null
  visits: Visit[]
  syncStatus: SyncStatus
  currentNeighborhood: string
  setUser: (user: User | null) => void
  addVisit: (visit: Visit) => void
  setVisits: (visits: Visit[]) => void
  setSyncStatus: (status: Partial<SyncStatus>) => void
  setNeighborhood: (n: string) => void
  pendingCount: () => number
  todayCount: () => number
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  visits: [],
  syncStatus: { online: true, pending_count: 0, syncing: false },
  currentNeighborhood: '',

  setUser: (user) => set({ user }),
  addVisit: (visit) => set((s) => ({ visits: [visit, ...s.visits] })),
  setVisits: (visits) => set({ visits }),
  setSyncStatus: (status) =>
    set((s) => ({ syncStatus: { ...s.syncStatus, ...status } })),
  setNeighborhood: (n) => set({ currentNeighborhood: n }),

  pendingCount: () => get().visits.filter((v) => v.sync_pending).length,
  todayCount: () => {
    const today = new Date().toISOString().slice(0, 10)
    const user = get().user
    return get().visits.filter(
      (v) => v.visited_at.startsWith(today) && v.user_id === user?.id
    ).length
  },
}))

'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, MapPin, RefreshCw, Plus, LogOut, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSync } from '@/hooks/useSync'
import { getTodayVisits, getVisitsByUser } from '@/lib/db'
import { StatusBar } from '@/components/ui/StatusBar'
import { BigButton } from '@/components/ui/BigButton'
import { StatCard } from '@/components/ui/StatCard'
import type { Visit } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clearSession } from '@/lib/db'

export default function DashboardPage() {
  const router = useRouter()
  const { user, currentNeighborhood, setNeighborhood, syncStatus } = useAppStore()
  const { runSync } = useSync()
  const [todayVisits, setTodayVisits] = useState<Visit[]>([])
  const [editingNeighborhood, setEditingNeighborhood] = useState(false)
  const [neighborhoodInput, setNeighborhoodInput] = useState('')

  useEffect(() => {
    async function init() {
      if (!user) {
        const { getSession } = await import('@/lib/db')
        const session = await getSession()
        if (!session) { router.replace('/login'); return }
        useAppStore.getState().setUser(session)
      }
      loadData()
    }
    init()
  }, [user])

  async function loadData() {
    if (!user) return
    const visits = await getTodayVisits(user.id)
    setTodayVisits(visits)
  }

  const pending = todayVisits.filter((v) => v.sync_pending).length
  const synced = todayVisits.length - pending

  async function handleLogout() {
    await clearSession()
    router.replace('/login')
  }

  const perceptionCounts = todayVisits.reduce(
    (acc, v) => {
      acc[v.political_perception] = (acc[v.political_perception] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      <StatusBar onSync={runSync} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between">
        <div>
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="text-2xl font-bold text-brand-text">
            Olá, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-brand-muted text-sm mt-0.5">{user?.coordinator_name && `Coord: ${user.coordinator_name}`}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-brand-muted hover:text-brand-danger transition-colors cursor-pointer"
          aria-label="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Bairro atual */}
      <div className="px-5 mb-4">
        {editingNeighborhood ? (
          <div className="flex gap-2">
            <input
              value={neighborhoodInput}
              onChange={(e) => setNeighborhoodInput(e.target.value)}
              placeholder="Nome do bairro"
              className="flex-1 bg-brand-card border border-brand-primary rounded-xl px-4 py-3 text-brand-text text-base"
              autoFocus
            />
            <button
              onClick={() => {
                setNeighborhood(neighborhoodInput)
                setEditingNeighborhood(false)
              }}
              className="bg-brand-primary text-brand-bg px-4 py-3 rounded-xl font-semibold cursor-pointer"
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNeighborhoodInput(currentNeighborhood); setEditingNeighborhood(true) }}
            className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-xl px-4 py-3 w-full cursor-pointer hover:border-brand-primary/50 transition-colors"
          >
            <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="text-brand-text text-sm">
              {currentNeighborhood || 'Toque para definir o bairro'}
            </span>
          </button>
        )}
      </div>

      {/* Cards de stats */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="Casas hoje"
          value={todayVisits.length}
          icon={Home}
          color="green"
        />
        <StatCard
          label="Pendente sync"
          value={pending}
          icon={Clock}
          color={pending > 0 ? 'yellow' : 'white'}
        />
      </div>

      {/* Progresso do dia */}
      {todayVisits.length > 0 && (
        <div className="px-5 mb-5">
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
            <p className="text-brand-muted text-xs mb-3 font-medium uppercase tracking-wider">Percepção política hoje</p>
            <div className="space-y-2">
              {[
                { key: 'muito_favoravel', label: 'Muito favorável', color: 'bg-emerald-500' },
                { key: 'favoravel', label: 'Favorável', color: 'bg-green-500' },
                { key: 'indiferente', label: 'Indiferente', color: 'bg-yellow-500' },
                { key: 'contrario', label: 'Contrário', color: 'bg-red-500' },
              ].map(({ key, label, color }) => {
                const count = perceptionCounts[key] || 0
                const pct = todayVisits.length > 0 ? (count / todayVisits.length) * 100 : 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-brand-muted text-xs w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-brand-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-brand-text text-xs w-6 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ações principais */}
      <div className="px-5 space-y-3 pb-8 safe-bottom mt-auto">
        <BigButton
          label="Registrar casa visitada"
          sublabel="Abre formulário rápido"
          icon={Plus}
          onClick={() => router.push('/visit')}
          variant="primary"
        />
        <BigButton
          label="Sincronizar agora"
          sublabel={
            syncStatus.online
              ? `${pending} registro${pending !== 1 ? 's' : ''} pendente${pending !== 1 ? 's' : ''}`
              : 'Sem internet'
          }
          icon={RefreshCw}
          onClick={runSync}
          variant="secondary"
          disabled={!syncStatus.online || pending === 0}
          loading={syncStatus.syncing}
        />
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import {
  Home, Users, MapPin, TrendingUp, LogOut,
  Trophy, Clock, CheckCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateMockVisits, MOCK_USERS } from '@/lib/mock-data'
import { StatCard } from '@/components/ui/StatCard'
import { PerceptionBadge } from '@/components/ui/PerceptionBadge'
import type { Visit, DashboardStats } from '@/types'
import { clearSession } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Leaflet precisa de SSR desabilitado (acessa window)
const VisitsMap = dynamicImport(() => import('@/components/VisitsMap'), { ssr: false })

function buildStats(visits: Visit[]): DashboardStats {
  const today = new Date().toISOString().slice(0, 10)

  const byTeam = Object.entries(
    visits.reduce((acc, v) => { acc[v.team_id] = (acc[v.team_id] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([team, count]) => ({ team, count })).sort((a, b) => b.count - a.count)

  const byMilitant = Object.entries(
    visits.reduce((acc, v) => {
      const key = v.user_id
      if (!acc[key]) {
        const u = MOCK_USERS.find((u) => u.id === v.user_id)
        acc[key] = { name: u?.name || v.user_id, phone: u?.phone || '', count: 0, role: u?.role || 'visitador' }
      }
      acc[key].count++
      return acc
    }, {} as Record<string, { name: string; phone: string; count: number; role: import('@/types').UserRole }>)
  ).map(([, v]) => v).sort((a, b) => b.count - a.count)

  const byNeighborhood = Object.entries(
    visits.reduce((acc, v) => { acc[v.neighborhood] = (acc[v.neighborhood] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([neighborhood, count]) => ({ neighborhood, count })).sort((a, b) => b.count - a.count)

  const perceptions = visits.reduce(
    (acc, v) => { acc[v.political_perception as keyof typeof acc]++; return acc },
    { muito_favoravel: 0, favoravel: 0, indiferente: 0, contrario: 0 }
  )

  return {
    total_visits: visits.length,
    total_today: visits.filter((v) => v.visited_at.startsWith(today)).length,
    pending_sync: visits.filter((v) => v.sync_pending).length,
    by_team: byTeam,
    by_militant: byMilitant,
    by_neighborhood: byNeighborhood,
    by_perception: perceptions,
    by_demand: {} as import('@/types').DashboardStats['by_demand'],
    daily_series: [],
    visits_with_coords: visits.filter((v) => v.latitude && v.longitude),
  }
}

type Tab = 'overview' | 'militants' | 'map'

export default function CoordinatorPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    async function init() {
      if (!user) {
        const { getSession } = await import('@/lib/db')
        const session = await getSession()
        if (!session) { router.replace('/login'); return }
        useAppStore.getState().setUser(session)
      }
      loadVisits()
    }
    init()
  }, [user])

  async function loadVisits() {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        setVisits(generateMockVisits()); setUseMock(true); setLoading(false); return
      }
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('visited_at', { ascending: false })

      if (error || !data || data.length === 0) {
        // Sem dados reais → usa mock
        setVisits(generateMockVisits())
        setUseMock(true)
      } else {
        setVisits(data as Visit[])
        setUseMock(false)
      }
    } catch {
      setVisits(generateMockVisits())
      setUseMock(true)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => buildStats(visits), [visits])
  const favorable = stats.by_perception.muito_favoravel + stats.by_perception.favoravel
  const total = stats.total_visits || 1

  async function handleLogout() {
    await clearSession()
    router.replace('/login')
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Resumo', icon: TrendingUp },
    { id: 'militants', label: 'Militantes', icon: Users },
    { id: 'map', label: 'Mapa', icon: MapPin },
  ]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-1">Painel do Coordenador</p>
          <h1 className="text-2xl font-bold text-brand-text">{user?.name.split(' ')[0]}</h1>
          <p className="text-brand-muted text-xs mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button onClick={handleLogout} className="p-2 text-brand-muted hover:text-brand-danger transition-colors cursor-pointer" aria-label="Sair">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {useMock && (
        <div className="mx-5 mb-3 px-4 py-2 bg-brand-info/10 border border-brand-info/30 rounded-xl text-brand-info text-xs">
          Exibindo dados de demonstração (sem conexão com Supabase)
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-5 gap-2 mb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
              tab === id
                ? 'bg-brand-primary text-brand-bg'
                : 'bg-brand-card text-brand-muted border border-brand-border hover:border-brand-primary/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 safe-bottom">
        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === 'overview' && !loading && (
          <div className="space-y-5 animate-fade-in">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total de visitas" value={stats.total_visits} icon={Home} color="green" />
              <StatCard label="Hoje" value={stats.total_today} icon={Clock} color="blue" />
              <StatCard label="Favoráveis" value={`${Math.round((favorable / total) * 100)}%`} icon={CheckCircle} color="green" sublabel={`${favorable} de ${stats.total_visits}`} />
              <StatCard label="Pendente sync" value={stats.pending_sync} icon={Clock} color={stats.pending_sync > 0 ? 'yellow' : 'white'} />
            </div>

            {/* Percepção */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-brand-muted text-xs mb-3 font-medium uppercase tracking-wider">Percepção política</p>
              {[
                { key: 'muito_favoravel' as const, label: 'Muito favorável', color: 'bg-emerald-500' },
                { key: 'favoravel' as const, label: 'Favorável', color: 'bg-green-500' },
                { key: 'indiferente' as const, label: 'Indiferente', color: 'bg-yellow-500' },
                { key: 'contrario' as const, label: 'Contrário', color: 'bg-red-500' },
              ].map(({ key, label, color }) => {
                const count = stats.by_perception[key]
                const pct = total > 0 ? (count / total) * 100 : 0
                return (
                  <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
                    <span className="text-brand-muted text-xs w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-2.5 bg-brand-border rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-brand-text text-xs w-8 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Por bairro */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-brand-muted text-xs mb-3 font-medium uppercase tracking-wider">Por bairro</p>
              <div className="space-y-2">
                {stats.by_neighborhood.slice(0, 6).map(({ neighborhood, count }) => (
                  <div key={neighborhood} className="flex items-center justify-between">
                    <span className="text-brand-text text-sm">{neighborhood}</span>
                    <span className="text-brand-primary font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MILITANTS ────────────────────────────────────────────── */}
        {tab === 'militants' && !loading && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">Ranking de militantes</p>
            {stats.by_militant.map((m, i) => (
              <div key={m.phone} className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-slate-400/20 text-slate-400' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-brand-border/50 text-brand-muted'
                }`}>
                  {i === 0 ? <Trophy className="w-4 h-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-brand-text font-medium text-sm truncate">{m.name}</p>
                  <p className="text-brand-muted text-xs">{m.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-brand-primary font-bold text-lg tabular-nums">{m.count}</p>
                  <p className="text-brand-muted text-xs">casas</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MAP ──────────────────────────────────────────────────── */}
        {tab === 'map' && (
          <div className="animate-fade-in">
            <div className="rounded-2xl overflow-hidden border border-brand-border" style={{ height: '70vh' }}>
              <VisitsMap visits={stats.visits_with_coords} />
            </div>
            <p className="text-brand-muted text-xs text-center mt-2">
              {stats.visits_with_coords.length} visitas com localização GPS
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40 text-brand-muted">
            <svg className="w-6 h-6 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando dados…
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import {
  Home, Users, MapPin, TrendingUp, LogOut,
  Trophy, Clock, BarChart2, AlertCircle, Zap,
  UserPlus, Mail, CheckCircle, XCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateMockVisits, MOCK_USERS } from '@/lib/mock-data'
import { StatCard } from '@/components/ui/StatCard'
import { PerceptionBadge } from '@/components/ui/PerceptionBadge'
import type { Visit, DashboardStats, TerritorialIntelligence, DemandCategory } from '@/types'
import { DEMAND_LABELS } from '@/types'
import { clearSession } from '@/lib/db'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx } from 'clsx'

const VisitsMap = dynamicImport(() => import('@/components/VisitsMap'), { ssr: false })

// ── helpers ──────────────────────────────────────────────────────────────────
function buildStats(visits: Visit[], userNames: Record<string, string> = {}): DashboardStats {
  const today = new Date().toISOString().slice(0, 10)

  const byTeam = Object.entries(
    visits.reduce((acc, v) => { acc[v.team_id] = (acc[v.team_id] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([team, count]) => ({ team, count })).sort((a, b) => b.count - a.count)

  const byMilitant = Object.entries(
    visits.reduce((acc, v) => {
      if (!acc[v.user_id]) {
        const u = MOCK_USERS.find((u) => u.id === v.user_id)
        acc[v.user_id] = { name: userNames[v.user_id] || u?.name || v.user_id, phone: u?.phone || '', count: 0, role: u?.role || 'visitador' }
      }
      acc[v.user_id].count++
      return acc
    }, {} as Record<string, DashboardStats['by_militant'][0]>)
  ).map(([, v]) => v).sort((a, b) => b.count - a.count)

  const byNeighborhood = Object.entries(
    visits.reduce((acc, v) => { acc[v.neighborhood] = (acc[v.neighborhood] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([neighborhood, count]) => ({ neighborhood, count })).sort((a, b) => b.count - a.count)

  const byPerception = visits.reduce(
    (acc, v) => { acc[v.political_perception as keyof typeof acc]++; return acc },
    { muito_favoravel: 0, favoravel: 0, indiferente: 0, contrario: 0 }
  )

  const byDemand = visits.reduce((acc, v) => {
    if (v.main_demand) acc[v.main_demand] = (acc[v.main_demand] || 0) + 1
    return acc
  }, {} as Record<DemandCategory, number>) as Record<DemandCategory, number>

  // Série diária dos últimos 14 dias
  const daily_series = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    return { date: d, count: visits.filter((v) => v.visited_at.startsWith(d)).length }
  })

  return {
    total_visits: visits.length,
    total_today: visits.filter((v) => v.visited_at.startsWith(today)).length,
    pending_sync: visits.filter((v) => v.sync_pending).length,
    by_team: byTeam,
    by_militant: byMilitant,
    by_neighborhood: byNeighborhood,
    by_perception: byPerception,
    by_demand: byDemand,
    visits_with_coords: visits.filter((v) => v.latitude && v.longitude),
    daily_series,
  }
}

function buildTerritorial(visits: Visit[]): TerritorialIntelligence[] {
  const byNeighborhood: Record<string, Visit[]> = {}
  visits.forEach((v) => {
    if (!byNeighborhood[v.neighborhood]) byNeighborhood[v.neighborhood] = []
    byNeighborhood[v.neighborhood].push(v)
  })

  return Object.entries(byNeighborhood).map(([neighborhood, vs]) => {
    const demands = vs.reduce((acc, v) => {
      if (v.main_demand) acc[v.main_demand] = (acc[v.main_demand] || 0) + 1
      return acc
    }, {} as Record<DemandCategory, number>)

    const topDemand = (Object.entries(demands).sort((a, b) => b[1] - a[1])[0]?.[0] || 'outro') as DemandCategory
    const favorable = vs.filter((v) => ['muito_favoravel', 'favoravel'].includes(v.political_perception)).length

    return {
      neighborhood,
      total_visits: vs.length,
      top_demand: topDemand,
      demand_breakdown: demands as Record<DemandCategory, number>,
      favorable_rate: vs.length > 0 ? Math.round((favorable / vs.length) * 100) : 0,
      visits_coords: vs
        .filter((v) => v.latitude && v.longitude)
        .map((v) => ({ lat: v.latitude!, lng: v.longitude!, demand: v.main_demand || 'outro' })),
    }
  }).sort((a, b) => b.total_visits - a.total_visits)
}

type Tab = 'overview' | 'territory' | 'militants' | 'map' | 'team'

type TeamMember = {
  id: string
  name: string
  email: string
  role: string
  status: 'pending' | 'active'
  neighborhood_zone?: string
}

const DEMAND_COLORS: Record<DemandCategory, string> = {
  saude: 'bg-red-500',
  educacao: 'bg-blue-500',
  transporte: 'bg-orange-400',
  seguranca: 'bg-purple-500',
  emprego_renda: 'bg-yellow-500',
  infraestrutura: 'bg-slate-400',
  assistencia_social: 'bg-pink-500',
  outro: 'bg-gray-500',
}

// ── componente ────────────────────────────────────────────────────────────────
export default function ManagementPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null)

  // Equipe
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', role: 'coordenador_regiao' as string, neighborhood_zone: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    async function init() {
      let activeUser = user
      if (!activeUser) {
        const { getSession } = await import('@/lib/db')
        const session = await getSession()
        if (!session) { router.replace('/login'); return }
        useAppStore.getState().setUser(session)
        activeUser = session
      }
      if (activeUser.role !== 'estrategista') { router.replace('/coordinator'); return }
      loadVisits()
      loadTeam()
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
        setVisits(generateMockVisits()); setUseMock(true)
      } else {
        setVisits(data as Visit[]); setUseMock(false)
        // Busca nomes dos usuários reais
        const { data: usersData } = await supabase.from('users').select('id, name')
        if (usersData) {
          const names: Record<string, string> = {}
          usersData.forEach((u: { id: string; name: string }) => { names[u.id] = u.name })
          setUserNames(names)
        }
      }
    } catch {
      setVisits(generateMockVisits()); setUseMock(true)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => buildStats(visits, userNames), [visits, userNames])
  const territorial = useMemo(() => buildTerritorial(visits), [visits])
  const total = stats.total_visits || 1
  const favorable = stats.by_perception.muito_favoravel + stats.by_perception.favoravel
  const maxBar = Math.max(...stats.daily_series.map((d) => d.count), 1)

  const topDemands = Object.entries(stats.by_demand)
    .map(([k, v]) => ({ key: k as DemandCategory, count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const selectedTerr = territorial.find((t) => t.neighborhood === selectedNeighborhood)

  async function loadTeam() {
    if (!isSupabaseConfigured()) return
    setTeamLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, status, neighborhood_zone')
      .in('role', ['coordenador_regiao', 'coordenador_bairro', 'visitador'])
      .order('created_at', { ascending: false })
    setTeamMembers((data as TeamMember[]) || [])
    setTeamLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setInviteLoading(true)
    setInviteResult(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: inviteForm.name,
        email: inviteForm.email,
        phone: inviteForm.phone,
        role: inviteForm.role,
        invited_by: user.id,
        invited_by_name: user.name,
        neighborhood_zone: inviteForm.neighborhood_zone,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteResult({ ok: true, msg: `Convite enviado para ${inviteForm.email}` })
      setInviteForm({ name: '', email: '', phone: '', role: 'coordenador_regiao', neighborhood_zone: '' })
      loadTeam()
    } else {
      setInviteResult({ ok: false, msg: data.error || 'Erro ao enviar convite' })
    }
    setInviteLoading(false)
  }

  async function handleLogout() {
    await clearSession()
    router.replace('/login')
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
    { id: 'territory', label: 'Território', icon: MapPin },
    { id: 'militants', label: 'Militantes', icon: Users },
    { id: 'map', label: 'Mapa', icon: MapPin },
    { id: 'team', label: 'Equipe', icon: UserPlus },
  ]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 bg-brand-surface border-b border-brand-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-brand-primary text-xs font-bold uppercase tracking-widest">Casa a Casa Digital</span>
              {useMock && (
                <span className="text-[10px] bg-brand-info/10 text-brand-info border border-brand-info/30 px-2 py-0.5 rounded-full">Demo</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-brand-text">Gestão de Campanha</h1>
            <p className="text-brand-muted text-xs mt-0.5">
              Estrategista · {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button onClick={handleLogout} className="p-2 text-brand-muted hover:text-brand-danger transition-colors cursor-pointer" aria-label="Sair">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* KPIs rápidos no header */}
        <div className="flex gap-4 mt-4 pb-1 overflow-x-auto scrollbar-hide">
          {[
            { label: 'Total visitas', value: stats.total_visits, color: 'text-brand-primary' },
            { label: 'Hoje', value: stats.total_today, color: 'text-brand-info' },
            { label: 'Favoráveis', value: `${Math.round((favorable / total) * 100)}%`, color: 'text-emerald-400' },
            { label: 'Militantes', value: stats.by_militant.length, color: 'text-brand-text' },
            { label: 'Bairros', value: stats.by_neighborhood.length, color: 'text-brand-text' },
          ].map(({ label, value, color }) => (
            <div key={label} className="shrink-0 text-center">
              <p className={clsx('text-xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-brand-muted text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-2 pt-4 pb-2 overflow-x-auto scrollbar-hide shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
              tab === id ? 'bg-brand-primary text-brand-bg' : 'bg-brand-card text-brand-muted border border-brand-border hover:border-brand-primary/50'
            )}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-10 safe-bottom">
        {loading && (
          <div className="flex items-center justify-center h-40 text-brand-muted gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando dados…
          </div>
        )}

        {/* ── VISÃO GERAL ────────────────────────────────────────── */}
        {!loading && tab === 'overview' && (
          <div className="space-y-5 animate-fade-in">
            {/* Série temporal — mini gráfico de barras */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-brand-muted text-xs uppercase tracking-wider font-medium mb-4">Visitas nos últimos 14 dias</p>
              <div className="flex items-end gap-1 h-20">
                {stats.daily_series.map(({ date, count }) => {
                  const today = new Date().toISOString().slice(0, 10)
                  const isToday = date === today
                  const height = maxBar > 0 ? Math.max((count / maxBar) * 100, 4) : 4
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className={clsx('w-full rounded-sm transition-all duration-500',
                        isToday ? 'bg-brand-primary' : 'bg-brand-border'
                      )} style={{ height: `${height}%` }} title={`${date}: ${count} visitas`} />
                      {isToday && <span className="text-[8px] text-brand-primary font-bold">HOJ</span>}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-brand-muted">
                <span>{format(subDays(new Date(), 13), 'dd/MM')}</span>
                <span>Hoje · {stats.total_today} visitas</span>
              </div>
            </div>

            {/* Percepção política */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-brand-muted text-xs uppercase tracking-wider font-medium mb-4">Percepção política geral</p>
              {[
                { key: 'muito_favoravel' as const, label: 'Muito favorável', color: 'bg-emerald-500' },
                { key: 'favoravel' as const, label: 'Favorável', color: 'bg-green-500' },
                { key: 'indiferente' as const, label: 'Indiferente', color: 'bg-yellow-500' },
                { key: 'contrario' as const, label: 'Contrário', color: 'bg-red-500' },
              ].map(({ key, label, color }) => {
                const count = stats.by_perception[key]
                const pct = (count / total) * 100
                return (
                  <div key={key} className="flex items-center gap-3 mb-2.5 last:mb-0">
                    <span className="text-brand-muted text-xs w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-brand-border rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-brand-text text-xs w-10 text-right tabular-nums">{count} <span className="text-brand-muted">({Math.round(pct)}%)</span></span>
                  </div>
                )
              })}
            </div>

            {/* Top demandas territoriais */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-brand-primary" />
                <p className="text-brand-text font-semibold text-sm">Inteligência Territorial</p>
              </div>
              <p className="text-brand-muted text-xs mb-3">Principais demandas dos moradores</p>
              {topDemands.map(({ key, count }) => {
                const pct = total > 0 ? (count / visits.length) * 100 : 0
                return (
                  <div key={key} className="flex items-center gap-3 mb-2.5 last:mb-0">
                    <div className={clsx('w-2.5 h-2.5 rounded-sm shrink-0', DEMAND_COLORS[key])} />
                    <span className="text-brand-muted text-xs w-32 shrink-0">{DEMAND_LABELS[key]}</span>
                    <div className="flex-1 h-2.5 bg-brand-border rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all duration-700', DEMAND_COLORS[key])}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-brand-text text-xs w-8 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
              {topDemands.length === 0 && (
                <p className="text-brand-muted text-sm text-center py-4">Nenhuma demanda registrada ainda</p>
              )}
            </div>

            {/* Por bairro */}
            <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <p className="text-brand-muted text-xs uppercase tracking-wider font-medium mb-3">Cobertura por bairro</p>
              <div className="space-y-2">
                {stats.by_neighborhood.slice(0, 8).map(({ neighborhood, count }) => (
                  <div key={neighborhood} className="flex items-center justify-between">
                    <span className="text-brand-text text-sm">{neighborhood}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-brand-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary rounded-full"
                          style={{ width: `${(count / stats.by_neighborhood[0].count) * 100}%` }} />
                      </div>
                      <span className="text-brand-primary font-semibold tabular-nums text-sm w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── INTELIGÊNCIA TERRITORIAL ──────────────────────────── */}
        {!loading && tab === 'territory' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-brand-muted text-xs pt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Toque num bairro para ver as demandas detalhadas
            </div>

            {territorial.map((terr) => (
              <div key={terr.neighborhood}>
                <button
                  onClick={() => setSelectedNeighborhood(
                    selectedNeighborhood === terr.neighborhood ? null : terr.neighborhood
                  )}
                  className={clsx('w-full bg-brand-card border rounded-2xl p-4 text-left cursor-pointer transition-all duration-200',
                    selectedNeighborhood === terr.neighborhood
                      ? 'border-brand-primary shadow-green-glow'
                      : 'border-brand-border hover:border-brand-primary/40'
                  )}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-brand-text font-semibold">{terr.neighborhood}</p>
                      <p className="text-brand-muted text-xs">{terr.total_visits} visitas · {terr.favorable_rate}% favoráveis</p>
                    </div>
                    <span className={clsx('text-xs px-2 py-1 rounded-lg font-medium', DEMAND_COLORS[terr.top_demand].replace('bg-', 'bg-').replace('-500', '-500/20'), 'text-brand-text border border-brand-border')}>
                      {DEMAND_LABELS[terr.top_demand]}
                    </span>
                  </div>

                  {/* mini bar de favoráveis */}
                  <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full transition-all duration-700"
                      style={{ width: `${terr.favorable_rate}%` }} />
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {selectedNeighborhood === terr.neighborhood && selectedTerr && (
                  <div className="bg-brand-surface border border-brand-primary/30 border-t-0 rounded-b-2xl p-4 animate-slide-up">
                    <p className="text-brand-muted text-xs uppercase tracking-wider font-medium mb-3">Demandas em {terr.neighborhood}</p>
                    {Object.entries(selectedTerr.demand_breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, count]) => {
                        const pct = (count / terr.total_visits) * 100
                        return (
                          <div key={key} className="flex items-center gap-3 mb-2">
                            <div className={clsx('w-2 h-2 rounded-sm shrink-0', DEMAND_COLORS[key as DemandCategory])} />
                            <span className="text-brand-muted text-xs w-28 shrink-0">{DEMAND_LABELS[key as DemandCategory]}</span>
                            <div className="flex-1 h-2 bg-brand-border rounded-full overflow-hidden">
                              <div className={clsx('h-full rounded-full', DEMAND_COLORS[key as DemandCategory])}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-brand-text text-xs w-6 text-right">{count}</span>
                          </div>
                        )
                      })}
                    <div className="mt-3 pt-3 border-t border-brand-border grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-brand-primary font-bold">{terr.favorable_rate}%</p>
                        <p className="text-brand-muted text-xs">Favoráveis</p>
                      </div>
                      <div>
                        <p className="text-brand-text font-bold">{terr.visits_coords.length}</p>
                        <p className="text-brand-muted text-xs">Com GPS</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── MILITANTES ─────────────────────────────────────────── */}
        {!loading && tab === 'militants' && (
          <div className="space-y-3 animate-fade-in pt-1">
            <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">Ranking de militantes · {stats.by_militant.length} ativos</p>
            {stats.by_militant.map((m, i) => (
              <div key={m.phone} className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-slate-400/20 text-slate-400' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-brand-border/50 text-brand-muted'
                )}>
                  {i < 3 ? <Trophy className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-brand-text font-medium text-sm truncate">{m.name}</p>
                  <p className="text-brand-muted text-xs">{m.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-brand-primary font-bold text-xl tabular-nums">{m.count}</p>
                  <p className="text-brand-muted text-xs">casas</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EQUIPE ────────────────────────────────────────────── */}
        {tab === 'team' && (
          <div className="space-y-4 animate-fade-in pt-1">
            <div className="flex items-center justify-between">
              <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">
                Equipe · {teamMembers.length}
              </p>
              <button
                onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-brand-bg rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Convidar
              </button>
            </div>

            {!isSupabaseConfigured() && (
              <div className="px-4 py-3 bg-brand-info/10 border border-brand-info/30 rounded-xl text-brand-info text-sm">
                Configure o Supabase para gerenciar a equipe.
              </div>
            )}

            {teamLoading && (
              <div className="flex items-center justify-center h-24 text-brand-muted gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Carregando equipe…
              </div>
            )}

            {!teamLoading && teamMembers.map((m) => (
              <div key={m.id} className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-brand-text font-medium text-sm truncate">{m.name}</p>
                  <p className="text-brand-primary text-xs font-medium">
                    {m.role === 'coordenador_regiao' ? 'Coord. Região' : m.role === 'coordenador_bairro' ? 'Coord. Bairro' : 'Visitador'}
                  </p>
                  <div className="flex items-center gap-1 text-brand-muted text-xs">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.neighborhood_zone && (
                    <p className="text-brand-muted text-xs">{m.neighborhood_zone}</p>
                  )}
                </div>
                <div className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium shrink-0',
                  m.status === 'active'
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'bg-brand-warning/10 text-brand-warning'
                )}>
                  {m.status === 'active' ? 'Ativo' : 'Pendente'}
                </div>
              </div>
            ))}

            {!teamLoading && isSupabaseConfigured() && teamMembers.length === 0 && (
              <div className="text-center py-10 text-brand-muted">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum membro cadastrado ainda.</p>
                <p className="text-xs mt-1">Convide o primeiro coordenador.</p>
              </div>
            )}
          </div>
        )}

        {/* ── MAPA ──────────────────────────────────────────────── */}
        {!loading && tab === 'map' && (
          <div className="animate-fade-in pt-1">
            <div className="rounded-2xl overflow-hidden border border-brand-border" style={{ height: '65vh' }}>
              <VisitsMap visits={stats.visits_with_coords} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { color: 'bg-emerald-500', label: 'Muito favorável' },
                { color: 'bg-green-500', label: 'Favorável' },
                { color: 'bg-yellow-500', label: 'Indiferente' },
                { color: 'bg-red-500', label: 'Contrário' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-brand-muted">
                  <div className={clsx('w-2.5 h-2.5 rounded-full', color)} />
                  {label}
                </div>
              ))}
            </div>
            <p className="text-brand-muted text-xs text-center mt-2">
              {stats.visits_with_coords.length} visitas com localização GPS
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL CONVIDAR COORDENADOR ────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 bg-black/60 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-card">
            <h2 className="text-brand-text font-bold text-lg mb-1">Convidar Coordenador</h2>
            <p className="text-brand-muted text-sm mb-5">
              O convite será enviado por email com um link para criar a senha.
            </p>

            <form onSubmit={handleInvite} className="space-y-3">
              {/* Seletor de papel */}
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="coordenador_regiao">Coordenador de Região</option>
                <option value="coordenador_bairro">Coordenador de Bairro</option>
                <option value="visitador">Visitador / Militante</option>
              </select>
              <input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
                required
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors"
              />
              <input
                type="tel"
                value={inviteForm.phone}
                onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Telefone / WhatsApp"
                required
                inputMode="tel"
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors"
              />
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
                required
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors"
              />
              <input
                value={inviteForm.neighborhood_zone}
                onChange={(e) => setInviteForm((f) => ({ ...f, neighborhood_zone: e.target.value }))}
                placeholder="Bairro / zona de atuação (opcional)"
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors"
              />

              {inviteResult && (
                <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
                  inviteResult.ok
                    ? 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary'
                    : 'bg-brand-danger/10 border border-brand-danger/30 text-brand-danger'
                )}>
                  {inviteResult.ok
                    ? <CheckCircle className="w-4 h-4 shrink-0" />
                    : <XCircle className="w-4 h-4 shrink-0" />}
                  {inviteResult.msg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-brand-border text-brand-muted font-semibold cursor-pointer hover:border-brand-primary/40 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={inviteLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-brand-primary text-brand-bg font-semibold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
                  {inviteLoading ? 'Enviando…' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

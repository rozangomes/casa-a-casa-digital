'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, MapPin, TrendingUp, LogOut, Trophy, Clock, CheckCircle, UserPlus, XCircle, PlusCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateMockVisits, MOCK_USERS } from '@/lib/mock-data'
import { StatCard } from '@/components/ui/StatCard'
import type { Visit, DashboardStats } from '@/types'
import { clearSession } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx } from 'clsx'

function buildStats(visits: Visit[], userNames: Record<string, string> = {}): DashboardStats {
  const today = new Date().toISOString().slice(0, 10)
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

  const perceptions = visits.reduce(
    (acc, v) => { acc[v.political_perception as keyof typeof acc]++; return acc },
    { muito_favoravel: 0, favoravel: 0, indiferente: 0, contrario: 0 }
  )

  return {
    total_visits: visits.length,
    total_today: visits.filter((v) => v.visited_at.startsWith(today)).length,
    pending_sync: visits.filter((v) => v.sync_pending).length,
    by_team: [],
    by_militant: byMilitant,
    by_neighborhood: byNeighborhood,
    by_perception: perceptions,
    by_demand: {} as DashboardStats['by_demand'],
    daily_series: [],
    visits_with_coords: visits.filter((v) => v.latitude && v.longitude),
  }
}

type Tab = 'overview' | 'coordinators' | 'militants'

export default function RegionPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [coordinators, setCoordinators] = useState<{ id: string; name: string; email: string; status: string; neighborhood_zone?: string; coordinator_name?: string }[]>([])
  const [coordLoading, setCoordLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', phone: '', email: '', role: 'coordenador_bairro', neighborhood_zone: '' })
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
      if (activeUser.role !== 'coordenador_regiao' && activeUser.role !== 'estrategista') {
        router.replace('/coordinator'); return
      }
      loadVisits()
      loadCoordinators()
    }
    init()
  }, [user])

  async function loadVisits() {
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        setVisits(generateMockVisits()); setUseMock(true); setLoading(false); return
      }
      const { data, error } = await supabase.from('visits').select('*').order('visited_at', { ascending: false })
      if (error || !data || data.length === 0) {
        setVisits(generateMockVisits()); setUseMock(true)
      } else {
        setVisits(data as Visit[]); setUseMock(false)
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

  async function loadCoordinators() {
    if (!isSupabaseConfigured()) return
    setCoordLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, email, status, neighborhood_zone, coordinator_name')
      .eq('role', 'coordenador_bairro')
      .order('created_at', { ascending: false })
    setCoordinators(data || [])
    setCoordLoading(false)
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
        coordinator_name: user.name,
        neighborhood_zone: inviteForm.neighborhood_zone,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteResult({ ok: true, msg: `Convite enviado para ${inviteForm.email}` })
      setInviteForm({ name: '', phone: '', email: '', role: 'coordenador_bairro', neighborhood_zone: '' })
      loadCoordinators()
    } else {
      setInviteResult({ ok: false, msg: data.error || 'Erro ao enviar convite' })
    }
    setInviteLoading(false)
  }

  async function handleLogout() {
    await clearSession()
    router.replace('/login')
  }

  const stats = useMemo(() => buildStats(visits, userNames), [visits, userNames])
  const favorable = stats.by_perception.muito_favoravel + stats.by_perception.favoravel
  const total = stats.total_visits || 1

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Resumo', icon: TrendingUp },
    { id: 'coordinators', label: 'Coordenadores', icon: Users },
    { id: 'militants', label: 'Militantes', icon: MapPin },
  ]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <p className="text-brand-muted text-xs uppercase tracking-widest mb-1">Coordenador de Região</p>
          <h1 className="text-2xl font-bold text-brand-text">{user?.name.split(' ')[0]}</h1>
          <p className="text-brand-muted text-xs mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/visit')}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-card border border-brand-border text-brand-text rounded-xl text-sm font-semibold cursor-pointer hover:border-brand-primary/50 transition-colors">
            <PlusCircle className="w-4 h-4 text-brand-primary" />
            Visita
          </button>
          <button
            onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-brand-bg rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            <UserPlus className="w-4 h-4" />
            Convidar
          </button>
          <button onClick={handleLogout} className="p-2 text-brand-muted hover:text-brand-danger transition-colors cursor-pointer">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {useMock && (
        <div className="mx-5 mb-3 px-4 py-2 bg-brand-info/10 border border-brand-info/30 rounded-xl text-brand-info text-xs">
          Exibindo dados de demonstração
        </div>
      )}

      <div className="flex px-5 gap-2 mb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
              tab === id ? 'bg-brand-primary text-brand-bg' : 'bg-brand-card text-brand-muted border border-brand-border hover:border-brand-primary/50'
            )}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 safe-bottom">

        {tab === 'overview' && !loading && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total de visitas" value={stats.total_visits} icon={Home} color="green" />
              <StatCard label="Hoje" value={stats.total_today} icon={Clock} color="blue" />
              <StatCard label="Favoráveis" value={`${Math.round((favorable / total) * 100)}%`} icon={CheckCircle} color="green" sublabel={`${favorable} de ${stats.total_visits}`} />
              <StatCard label="Bairros" value={stats.by_neighborhood.length} icon={MapPin} color="white" />
            </div>

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

        {tab === 'coordinators' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">Coordenadores de Bairro · {coordinators.length}</p>
              <button onClick={() => { setShowInviteModal(true); setInviteResult(null) }}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-brand-bg rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                <UserPlus className="w-4 h-4" />
                Convidar
              </button>
            </div>
            {coordLoading && (
              <div className="flex items-center justify-center h-20 text-brand-muted gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Carregando…
              </div>
            )}
            {!coordLoading && coordinators.map((c) => (
              <div key={c.id} className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-brand-text font-medium text-sm">{c.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-brand-primary/15 text-brand-primary border-brand-primary/30">
                      Coord. Bairro
                    </span>
                  </div>
                  {c.coordinator_name && (
                    <p className="text-brand-muted text-xs mt-0.5">Convidado por: {c.coordinator_name}</p>
                  )}
                  <p className="text-brand-muted text-xs truncate">{c.email}</p>
                  {c.neighborhood_zone && <p className="text-brand-muted text-xs">{c.neighborhood_zone}</p>}
                </div>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium shrink-0',
                  c.status === 'active' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-warning/10 text-brand-warning'
                )}>
                  {c.status === 'active' ? 'Ativo' : 'Pendente'}
                </span>
              </div>
            ))}
            {!coordLoading && coordinators.length === 0 && (
              <div className="text-center py-10 text-brand-muted">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum coordenador cadastrado ainda.</p>
                <p className="text-xs mt-1">Convide o primeiro coordenador de bairro.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'militants' && !loading && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-brand-muted text-xs uppercase tracking-wider font-medium">Ranking de militantes · {stats.by_militant.length}</p>
            {stats.by_militant.map((m, i) => (
              <div key={m.phone} className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
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
                  <p className="text-brand-primary font-bold text-lg tabular-nums">{m.count}</p>
                  <p className="text-brand-muted text-xs">casas</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40 text-brand-muted gap-2">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Carregando…
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 bg-black/60 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-card">
            <h2 className="text-brand-text font-bold text-lg mb-1">Convidar para minha região</h2>
            <p className="text-brand-muted text-sm mb-5">O convite será enviado por email com link para criar a senha.</p>

            <form onSubmit={handleInvite} className="space-y-3">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base focus:border-brand-primary transition-colors cursor-pointer"
              >
                <option value="coordenador_bairro">Coordenador de Bairro</option>
                <option value="visitador">Visitador / Militante</option>
              </select>
              <input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo" required
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors" />
              <input type="tel" value={inviteForm.phone} onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Telefone / WhatsApp" required inputMode="tel"
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors" />
              <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email" required
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors" />
              <input value={inviteForm.neighborhood_zone} onChange={(e) => setInviteForm((f) => ({ ...f, neighborhood_zone: e.target.value }))}
                placeholder="Bairro / zona (opcional)"
                className="w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-3.5 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors" />

              {inviteResult && (
                <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
                  inviteResult.ok ? 'bg-brand-primary/10 border border-brand-primary/30 text-brand-primary' : 'bg-brand-danger/10 border border-brand-danger/30 text-brand-danger'
                )}>
                  {inviteResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
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

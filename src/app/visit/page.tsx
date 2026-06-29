'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, MapPin, CheckCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { saveVisit } from '@/lib/db'
import { syncPendingVisits } from '@/lib/sync'
import { getCurrentPosition } from '@/lib/geo'
import { fetchCep, formatCep } from '@/lib/cep'
import { BigButton } from '@/components/ui/BigButton'
import type { Visit, PoliticalPerception, DemandCategory } from '@/types'
import { clsx } from 'clsx'

// ── Percepção ─────────────────────────────────────────────────────────────────
const perceptions: { value: PoliticalPerception; emoji: string; label: string; color: string; active: string }[] = [
  { value: 'muito_favoravel', emoji: '🤩', label: 'Muito favorável', color: 'border-emerald-500/40 bg-emerald-500/10', active: 'border-emerald-500 bg-emerald-500/25 shadow-[0_0_12px_#10b98140]' },
  { value: 'favoravel',       emoji: '😊', label: 'Favorável',       color: 'border-green-500/40 bg-green-500/10',   active: 'border-green-500 bg-green-500/25 shadow-[0_0_12px_#22c55e40]' },
  { value: 'indiferente',     emoji: '😐', label: 'Indiferente',     color: 'border-yellow-500/40 bg-yellow-500/10', active: 'border-yellow-500 bg-yellow-500/25 shadow-[0_0_12px_#eab30840]' },
  { value: 'contrario',       emoji: '😠', label: 'Contrário',       color: 'border-red-500/40 bg-red-500/10',       active: 'border-red-500 bg-red-500/25 shadow-[0_0_12px_#ef444440]' },
]

// ── Demandas ──────────────────────────────────────────────────────────────────
const demands: { value: DemandCategory; emoji: string; label: string }[] = [
  { value: 'saude',             emoji: '🏥', label: 'Saúde' },
  { value: 'educacao',          emoji: '📚', label: 'Educação' },
  { value: 'transporte',        emoji: '🚌', label: 'Transporte' },
  { value: 'seguranca',         emoji: '🛡️', label: 'Segurança' },
  { value: 'emprego_renda',     emoji: '💼', label: 'Emprego' },
  { value: 'infraestrutura',    emoji: '🏗️', label: 'Infraestrutura' },
  { value: 'assistencia_social',emoji: '🤝', label: 'Assistência' },
  { value: 'outro',             emoji: '💬', label: 'Outro' },
]

export default function VisitPage() {
  const router = useRouter()
  const { user, addVisit, syncStatus } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  const geoRef = useRef<{ lat?: number; lng?: number; acc?: number }>({})

  const [form, setForm] = useState({
    cep: '',
    neighborhood: '',
    street_number: '',
    city: 'Magé',
    political_perception: '' as PoliticalPerception | '',
    main_demands: [] as DemandCategory[],
    demand_description: '',
    received_material: false,
    resident_name: '',
    residents_over_16: '' as string | number,
    phone_collected: '',
    notes: '',
  })

  useEffect(() => {
    async function init() {
      if (!user) {
        const { getSession } = await import('@/lib/db')
        const session = await getSession()
        if (!session) { router.replace('/login'); return }
        useAppStore.getState().setUser(session)
      }
      getCurrentPosition()
        .then((pos) => { geoRef.current = { lat: pos.latitude, lng: pos.longitude } })
        .catch(() => {})
    }
    init()
  }, [user, router])

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const data = await fetchCep(digits)
      setForm((f) => ({
        ...f,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
      }))
    } catch { /* CEP não encontrado */ }
    finally { setCepLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.neighborhood || !form.political_perception) return
    if (!user) return
    setLoading(true)

    if (!geoRef.current.lat) {
      try {
        const pos = await getCurrentPosition(5000)
        geoRef.current = { lat: pos.latitude, lng: pos.longitude }
      } catch { /* sem GPS */ }
    }

    const visit: Visit = {
      id: uuidv4(),
      user_id: user.id,
      team_id: user.team_id,
      coordinator_name: user.coordinator_name,
      cep: form.cep.replace(/\D/g, '') || undefined,
      city: form.city || 'Magé',
      neighborhood: form.neighborhood,
      street_number: form.street_number || undefined,
      resident_home: true,
      received_material: form.received_material,
      political_perception: form.political_perception as PoliticalPerception,
      main_demand: form.main_demands[0] || undefined,
      main_demand_2: form.main_demands[1] || undefined,
      main_demand_3: form.main_demands[2] || undefined,
      demand_description: form.demand_description || undefined,
      resident_name: form.resident_name || undefined,
      residents_over_16: form.residents_over_16 !== '' ? Number(form.residents_over_16) : undefined,
      phone_collected: form.phone_collected || undefined,
      notes: form.notes || undefined,
      latitude: geoRef.current.lat,
      longitude: geoRef.current.lng,
      gps_accuracy: geoRef.current.acc,
      visited_at: new Date().toISOString(),
      created_offline: !syncStatus.online,
      sync_pending: true,
    }

    await saveVisit(visit)
    addVisit(visit)
    // Envia imediatamente ao Supabase se online
    syncPendingVisits().catch(() => {})
    setLoading(false)
    setSaved(true)
    const dest = user.role === 'coordenador_regiao' ? '/region'
      : user.role === 'coordenador_bairro' ? '/coordinator'
      : '/dashboard'
    setTimeout(() => router.push(dest), 1200)
  }

  const inputClass = 'bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted w-full focus:border-brand-primary transition-colors'

  if (saved) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-brand-primary/20 flex items-center justify-center shadow-green-glow">
          <CheckCircle className="w-10 h-10 text-brand-primary" />
        </div>
        <h2 className="text-2xl font-bold text-brand-text">Casa registrada!</h2>
        <p className="text-brand-muted text-sm">Voltando ao painel…</p>
      </div>
    )
  }

  const canSave = !!form.neighborhood && !!form.political_perception

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl bg-brand-card border border-brand-border text-brand-muted cursor-pointer"
          aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Registrar visita</h1>
          <div className="flex items-center gap-1 text-brand-muted text-xs mt-0.5">
            <MapPin className="w-3 h-3 text-brand-primary" />
            <span>{geoRef.current.lat ? 'GPS ativo' : 'Aguardando GPS…'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 gap-4 pb-8 safe-bottom overflow-y-auto">

        {/* ── LOCALIZAÇÃO ───────────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <p className="text-brand-text font-semibold text-sm">Onde foi a visita?</p>
          <div className="relative">
            <input
              value={form.cep}
              onChange={(e) => setForm((f) => ({ ...f, cep: formatCep(e.target.value) }))}
              onBlur={handleCepBlur}
              placeholder="CEP (preenche bairro automaticamente)"
              inputMode="numeric"
              maxLength={9}
              className={inputClass}
            />
            {cepLoading && (
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary animate-spin" />
            )}
          </div>
          <input
            value={form.neighborhood}
            onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
            placeholder="Bairro *"
            required
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.street_number}
              onChange={(e) => setForm((f) => ({ ...f, street_number: e.target.value }))}
              placeholder="Número da casa"
              inputMode="numeric"
              className={inputClass}
            />
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Cidade"
              className={inputClass}
            />
          </div>
        </div>

        {/* ── PERCEPÇÃO POLÍTICA ────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-brand-text font-semibold text-sm mb-3">Como foi a recepção? *</p>
          <div className="grid grid-cols-2 gap-3">
            {perceptions.map(({ value, emoji, label, color, active }) => (
              <button key={value} type="button"
                onClick={() => setForm((f) => ({ ...f, political_perception: value }))}
                className={clsx(
                  'flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer',
                  form.political_perception === value ? active : color
                )}>
                <span className="text-3xl">{emoji}</span>
                <span className="text-xs font-semibold text-brand-text">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── DEMANDAS ──────────────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-brand-text font-semibold text-sm mb-1">Principais demandas</p>
          <p className="text-brand-muted text-xs mb-3">Até 3 · {form.main_demands.length}/3</p>
          <div className="grid grid-cols-4 gap-2">
            {demands.map(({ value, emoji, label }) => {
              const selected = form.main_demands.includes(value)
              const disabled = !selected && form.main_demands.length >= 3
              return (
                <button key={value} type="button" disabled={disabled}
                  onClick={() => setForm((f) => ({
                    ...f,
                    main_demands: f.main_demands.includes(value)
                      ? f.main_demands.filter((d) => d !== value)
                      : [...f.main_demands, value],
                  }))}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 cursor-pointer',
                    selected
                      ? 'border-brand-info bg-brand-info/15'
                      : disabled
                        ? 'border-brand-border/30 opacity-30 cursor-not-allowed'
                        : 'border-brand-border bg-brand-border/20 hover:border-brand-info/40'
                  )}>
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[10px] font-medium text-brand-muted leading-tight text-center">{label}</span>
                </button>
              )
            })}
          </div>
          {form.main_demands.includes('outro') && (
            <textarea
              value={form.demand_description}
              onChange={(e) => setForm((f) => ({ ...f, demand_description: e.target.value }))}
              placeholder="Descreva a demanda…"
              rows={2}
              className="mt-3 w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-text text-sm placeholder-brand-muted resize-none"
            />
          )}
        </div>

        {/* ── RECEBEU MATERIAL ──────────────────────────────────── */}
        <div className="flex items-center justify-between bg-brand-card border border-brand-border rounded-2xl px-4 py-4">
          <span className="text-brand-text font-medium">Recebeu material?</span>
          <div className="flex gap-2">
            {(['Sim', 'Não'] as const).map((opt) => {
              const active = opt === 'Sim' ? form.received_material : !form.received_material
              return (
                <button key={opt} type="button"
                  onClick={() => setForm((f) => ({ ...f, received_material: opt === 'Sim' }))}
                  className={clsx('px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer',
                    active ? 'bg-brand-primary text-brand-bg' : 'bg-brand-border/50 text-brand-muted'
                  )}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── DETALHES EXTRAS (recolhido) ───────────────────────── */}
        <button type="button"
          onClick={() => setShowExtra((v) => !v)}
          className="flex items-center justify-between px-4 py-3 bg-brand-card border border-brand-border rounded-2xl text-brand-muted text-sm cursor-pointer hover:border-brand-primary/40 transition-colors">
          <span>+ Detalhes do morador (opcional)</span>
          {showExtra ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showExtra && (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3 animate-fade-in">
            <input
              value={form.resident_name}
              onChange={(e) => setForm((f) => ({ ...f, resident_name: e.target.value }))}
              placeholder="Nome do morador"
              className={inputClass}
            />
            <input
              value={form.residents_over_16}
              onChange={(e) => setForm((f) => ({ ...f, residents_over_16: e.target.value }))}
              placeholder="Moradores com 16+ anos"
              type="number"
              min="0"
              inputMode="numeric"
              className={inputClass}
            />
            <input
              value={form.phone_collected}
              onChange={(e) => setForm((f) => ({ ...f, phone_collected: e.target.value }))}
              placeholder="Telefone do morador"
              type="tel"
              inputMode="tel"
              className={inputClass}
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Observação"
              rows={2}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-text text-sm placeholder-brand-muted resize-none"
            />
          </div>
        )}

        <BigButton
          type="submit"
          label="Salvar visita"
          loading={loading}
          variant="primary"
          disabled={!canSave}
        />

        {!canSave && (
          <p className="text-brand-muted text-xs text-center -mt-2">
            Preencha o bairro e a recepção para salvar
          </p>
        )}
      </form>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { ArrowLeft, MapPin, CheckCircle, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { saveVisit } from '@/lib/db'
import { getCurrentPosition } from '@/lib/geo'
import { fetchCep, formatCep } from '@/lib/cep'
import { BigButton } from '@/components/ui/BigButton'
import type { Visit, PoliticalPerception, DemandCategory } from '@/types'
import { DEMAND_LABELS } from '@/types'
import { clsx } from 'clsx'

// ── Componente Toggle Sim/Não ─────────────────────────────────────────────────
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-brand-card border border-brand-border rounded-2xl px-4 py-4">
      <span className="text-brand-text font-medium text-base">{label}</span>
      <div className="flex gap-2">
        {(['Sim', 'Não'] as const).map((opt) => {
          const active = opt === 'Sim' ? value : !value
          return (
            <button key={opt} type="button" onClick={() => onChange(opt === 'Sim')}
              className={clsx('px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer',
                active ? 'bg-brand-primary text-brand-bg shadow-green-glow' : 'bg-brand-border/50 text-brand-muted hover:bg-brand-border'
              )}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const perceptions: { value: PoliticalPerception; label: string; color: string }[] = [
  { value: 'muito_favoravel', label: 'Muito favorável', color: 'border-emerald-500 bg-emerald-500/20 text-emerald-400' },
  { value: 'favoravel',      label: 'Favorável',       color: 'border-green-500 bg-green-500/20 text-green-400' },
  { value: 'indiferente',    label: 'Indiferente',     color: 'border-yellow-500 bg-yellow-500/20 text-yellow-400' },
  { value: 'contrario',      label: 'Contrário',       color: 'border-red-500 bg-red-500/20 text-red-400' },
]

const demandOptions = Object.entries(DEMAND_LABELS) as [DemandCategory, string][]

export default function VisitPage() {
  const router = useRouter()
  const { user, addVisit, syncStatus } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  const geoRef = useRef<{ lat?: number; lng?: number; acc?: number }>({})

  const [form, setForm] = useState({
    cep: '',
    street: '',
    street_number: '',
    neighborhood: '',
    city: 'Magé',
    state: '',
    resident_home: true,
    received_material: false,
    political_perception: 'favoravel' as PoliticalPerception,
    main_demand: '' as DemandCategory | '',
    demand_description: '',
    phone_collected: '',
    notes: '',
  })

  useEffect(() => {
    async function init() {
      if (!user) {
        // Restaura sessão do IndexedDB antes de redirecionar (suporte a reload direto)
        const { getSession } = await import('@/lib/db')
        const session = await getSession()
        if (!session) { router.replace('/login'); return }
        useAppStore.getState().setUser(session)
      }
      // GPS em background — inicia assim que a tela abre
      getCurrentPosition()
        .then((pos) => { geoRef.current = { lat: pos.latitude, lng: pos.longitude } })
        .catch(() => setGeoError('GPS não obtido — o endereço via CEP será usado'))
    }
    init()
  }, [user, router])

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    setCepError('')
    try {
      const data = await fetchCep(digits)
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }))
    } catch {
      setCepError('CEP não encontrado. Preencha o endereço manualmente.')
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)

    // Tenta um último GPS se ainda não travou
    if (!geoRef.current.lat) {
      try {
        const pos = await getCurrentPosition(5000)
        geoRef.current = { lat: pos.latitude, lng: pos.longitude }
      } catch { /* usa só o CEP */ }
    }

    const visit: Visit = {
      id: uuidv4(),
      user_id: user.id,
      team_id: user.team_id,
      coordinator_name: user.coordinator_name,
      cep: form.cep.replace(/\D/g, '') || undefined,
      city: form.city || 'Não informada',
      neighborhood: form.neighborhood || 'Não informado',
      street: form.street || undefined,
      street_number: form.street_number || undefined,
      state: form.state || undefined,
      resident_home: form.resident_home,
      received_material: form.received_material,
      political_perception: form.political_perception,
      main_demand: (form.main_demand as DemandCategory) || undefined,
      demand_description: form.demand_description || undefined,
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
    setLoading(false)
    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  const inputClass = 'bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted w-full'

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

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
          aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Registrar visita</h1>
          <div className="flex items-center gap-1 text-brand-muted text-xs mt-0.5">
            <MapPin className="w-3 h-3 text-brand-primary" />
            <span>{geoRef.current.lat ? 'GPS ativo' : geoError || 'Aguardando GPS…'}</span>
          </div>
        </div>
      </div>

      {geoError && (
        <div className="mx-5 mb-3 px-4 py-2.5 bg-brand-warning/10 border border-brand-warning/30 rounded-xl text-brand-warning text-xs">
          {geoError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 gap-4 pb-8 safe-bottom overflow-y-auto">

        {/* ── ENDEREÇO VIA CEP ──────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <p className="text-brand-text font-semibold text-sm">Endereço</p>

          <div className="relative">
            <input value={form.cep}
              onChange={(e) => setForm((f) => ({ ...f, cep: formatCep(e.target.value) }))}
              onBlur={handleCepBlur}
              placeholder="CEP (preenchimento automático)"
              inputMode="numeric"
              maxLength={9}
              className={inputClass}
            />
            {cepLoading && (
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary animate-spin" />
            )}
          </div>
          {cepError && <p className="text-brand-warning text-xs">{cepError}</p>}

          <div className="grid grid-cols-3 gap-2">
            <input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              placeholder="Rua" className={clsx(inputClass, 'col-span-2')} />
            <input value={form.street_number} onChange={(e) => setForm((f) => ({ ...f, street_number: e.target.value }))}
              placeholder="Nº" className={inputClass} inputMode="numeric" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
              placeholder="Bairro" className={inputClass} />
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Cidade" className={inputClass} />
          </div>
        </div>

        {/* ── DADOS DA VISITA ───────────────────────────────────── */}
        <Toggle label="Morador estava em casa?" value={form.resident_home}
          onChange={(v) => setForm((f) => ({ ...f, resident_home: v }))} />

        <Toggle label="Recebeu material?" value={form.received_material}
          onChange={(v) => setForm((f) => ({ ...f, received_material: v }))} />

        {/* Percepção política */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-brand-text font-medium mb-3">Percepção política</p>
          <div className="grid grid-cols-2 gap-2">
            {perceptions.map(({ value, label, color }) => (
              <button key={value} type="button"
                onClick={() => setForm((f) => ({ ...f, political_perception: value }))}
                className={clsx('py-3 px-2 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer text-center',
                  form.political_perception === value ? color : 'border-brand-border bg-brand-border/20 text-brand-muted hover:border-brand-primary/30'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── INTELIGÊNCIA TERRITORIAL ──────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4">
          <p className="text-brand-text font-medium mb-1">Principal demanda do morador</p>
          <p className="text-brand-muted text-xs mb-3">Qual é a maior preocupação citada?</p>
          <div className="grid grid-cols-2 gap-2">
            {demandOptions.map(([value, label]) => (
              <button key={value} type="button"
                onClick={() => setForm((f) => ({ ...f, main_demand: f.main_demand === value ? '' : value }))}
                className={clsx('py-3 px-2 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer text-center',
                  form.main_demand === value
                    ? 'border-brand-info bg-brand-info/15 text-brand-info'
                    : 'border-brand-border bg-brand-border/20 text-brand-muted hover:border-brand-info/30'
                )}>
                {label}
              </button>
            ))}
          </div>
          {form.main_demand === 'outro' && (
            <textarea value={form.demand_description}
              onChange={(e) => setForm((f) => ({ ...f, demand_description: e.target.value }))}
              placeholder="Descreva a demanda…"
              rows={2}
              className="mt-3 w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-brand-text text-sm placeholder-brand-muted resize-none"
            />
          )}
        </div>

        {/* ── CAPTAÇÃO ─────────────────────────────────────────── */}
        <input value={form.phone_collected}
          onChange={(e) => setForm((f) => ({ ...f, phone_collected: e.target.value }))}
          placeholder="Telefone captado (opcional)"
          type="tel" inputMode="tel"
          className={inputClass}
        />

        <textarea value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Observação curta (opcional)"
          rows={2}
          className="bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted resize-none w-full"
        />

        <BigButton type="submit" label="Salvar visita" loading={loading} variant="primary" />
      </form>
    </div>
  )
}

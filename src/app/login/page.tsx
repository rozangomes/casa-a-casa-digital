'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { User, Phone, Users, Shield, ChevronDown } from 'lucide-react'
import { saveSession } from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'
import { BigButton } from '@/components/ui/BigButton'
import type { User as UserType, UserRole } from '@/types'
import { clsx } from 'clsx'

const roles: { value: UserRole; label: string; desc: string; icon: string }[] = [
  { value: 'visitador',          label: 'Visitador / Militante', desc: 'Registra visitas em campo',             icon: '🚶' },
  { value: 'coordenador_bairro', label: 'Coordenador de Bairro', desc: 'Gerencia uma região geográfica',        icon: '📍' },
  { value: 'estrategista',       label: 'Estrategista / Coord. Geral', desc: 'Acesso completo a toda campanha', icon: '📊' },
]

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>('visitador')
  const [showRoles, setShowRoles] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', team: '', coordinator: '', zone: '' })

  const selectedRole = roles.find((r) => r.value === role)!

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) return
    setLoading(true)
    try {
      const isCoord = role !== 'visitador'
      const user: UserType = {
        id: uuidv4(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        role,
        team_id: form.team.trim() || 'sem-equipe',
        coordinator_name: form.coordinator.trim(),
        neighborhood_zone: form.zone.trim() || undefined,
        is_coordinator: isCoord,
        created_at: new Date().toISOString(),
      }
      await saveSession(user)
      setUser(user)
      if (role === 'estrategista') router.push('/management')
      else if (role === 'coordenador_bairro') router.push('/coordinator')
      else router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors duration-200'

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-3xl bg-brand-primary flex items-center justify-center shadow-green-glow">
            <svg className="w-10 h-10 text-brand-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-text tracking-tight">Casa a Casa Digital</h1>
            <p className="text-brand-primary text-xs font-medium tracking-widest uppercase mt-0.5">by Impulso Político</p>
          </div>
          <p className="text-brand-muted text-sm text-center max-w-xs">
            Gestão completa de visitas domiciliares de campanha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {/* Seletor de perfil */}
          <div className="relative">
            <button type="button" onClick={() => setShowRoles((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-brand-primary bg-brand-primary/10 text-brand-primary cursor-pointer transition-all">
              <span className="text-xl">{selectedRole.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{selectedRole.label}</p>
                <p className="text-xs opacity-70">{selectedRole.desc}</p>
              </div>
              <ChevronDown className={clsx('w-4 h-4 transition-transform', showRoles && 'rotate-180')} />
            </button>

            {showRoles && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-brand-card border border-brand-border rounded-2xl overflow-hidden z-20 shadow-card animate-fade-in">
                {roles.map((r) => (
                  <button key={r.value} type="button"
                    onClick={() => { setRole(r.value); setShowRoles(false) }}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                      r.value === role ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text hover:bg-brand-border/30'
                    )}>
                    <span className="text-xl">{r.icon}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{r.label}</p>
                      <p className="text-xs opacity-60">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campos comuns */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Nome completo" required
              className={`${inputClass} pl-11`} autoComplete="name" />
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input name="phone" value={form.phone} onChange={handleChange}
              placeholder="Telefone (WhatsApp)" required type="tel"
              className={`${inputClass} pl-11`} inputMode="tel" />
          </div>

          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input name="team" value={form.team} onChange={handleChange}
              placeholder="Nome da equipe"
              className={`${inputClass} pl-11`} />
          </div>

          {/* Campo de coordenador — só para visitador */}
          {role === 'visitador' && (
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input name="coordinator" value={form.coordinator} onChange={handleChange}
                placeholder="Nome do seu coordenador"
                className={`${inputClass} pl-11`} />
            </div>
          )}

          {/* Zona do bairro — só para coordenador de bairro */}
          {role === 'coordenador_bairro' && (
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input name="zone" value={form.zone} onChange={handleChange}
                placeholder="Bairro / zona de atuação"
                className={`${inputClass} pl-11`} />
            </div>
          )}

          <div className="pt-2">
            <BigButton type="submit"
              label={role === 'estrategista' ? 'Acessar gestão de campanha' : role === 'coordenador_bairro' ? 'Acessar painel de bairro' : 'Começar a campanha'}
              loading={loading} variant="primary" />
          </div>
        </form>
      </div>

      <p className="text-center text-brand-muted/40 text-xs pb-8 safe-bottom">
        Casa a Casa Digital · Impulso Político v0.2.0
      </p>
    </div>
  )
}

// Ícone MapPin inline para não precisar de import extra
function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

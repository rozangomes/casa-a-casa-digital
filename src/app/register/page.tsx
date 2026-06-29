'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { saveSession } from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'
import { BigButton } from '@/components/ui/BigButton'
import { clsx } from 'clsx'

type PendingUser = {
  id: string
  name: string
  email: string
  role: string
  neighborhood_zone?: string
  coordinator_name?: string
}

const ROLE_LABEL: Record<string, string> = {
  visitador: 'Visitador / Militante',
  coordenador_bairro: 'Coordenador de Bairro',
  estrategista: 'Estrategista',
}

function RegisterContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')

  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)
  const [tokenError, setTokenError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setTokenError('Link inválido. Peça um novo convite.'); return }

    fetch(`/api/register?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setTokenError(data.error)
        else setPendingUser(data.user)
      })
      .catch(() => setTokenError('Erro ao verificar link. Tente novamente.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    if (password.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error || 'Erro ao ativar conta'); setLoading(false); return }

    await saveSession(data.user)
    useAppStore.getState().setUser(data.user)
    setDone(true)

    setTimeout(() => {
      if (data.user.role === 'estrategista') router.replace('/management')
      else if (data.user.role === 'coordenador_bairro') router.replace('/coordinator')
      else router.replace('/dashboard')
    }, 1500)
  }

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors duration-200'

  if (done) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4 animate-fade-in px-6">
        <div className="w-20 h-20 rounded-full bg-brand-primary/20 flex items-center justify-center shadow-green-glow">
          <CheckCircle className="w-10 h-10 text-brand-primary" />
        </div>
        <h2 className="text-2xl font-bold text-brand-text">Conta ativada!</h2>
        <p className="text-brand-muted text-sm">Entrando no sistema…</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-danger/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-brand-danger" />
        </div>
        <h2 className="text-xl font-bold text-brand-text">Link inválido</h2>
        <p className="text-brand-muted text-sm">{tokenError}</p>
        <button onClick={() => router.replace('/login')}
          className="text-brand-primary text-sm underline cursor-pointer">
          Ir para o login
        </button>
      </div>
    )
  }

  if (!pendingUser) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <svg className="w-6 h-6 animate-spin text-brand-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-3xl bg-brand-primary flex items-center justify-center shadow-green-glow">
            <svg className="w-8 h-8 text-brand-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-text">Casa a Casa Digital</h1>
            <p className="text-brand-primary text-xs font-medium tracking-widest uppercase mt-0.5">by Impulso Político</p>
          </div>
        </div>

        {/* Card de boas-vindas */}
        <div className="w-full max-w-md bg-brand-card border border-brand-primary/30 rounded-2xl p-4 mb-6">
          <p className="text-brand-muted text-xs uppercase tracking-wider mb-2">Bem-vindo(a) ao sistema</p>
          <p className="text-brand-text font-bold text-lg">{pendingUser.name}</p>
          <p className="text-brand-muted text-sm">{pendingUser.email}</p>
          <div className="mt-2 inline-block px-3 py-1 bg-brand-primary/10 border border-brand-primary/30 rounded-full">
            <span className="text-brand-primary text-xs font-medium">{ROLE_LABEL[pendingUser.role] || pendingUser.role}</span>
          </div>
          {pendingUser.neighborhood_zone && (
            <p className="text-brand-muted text-xs mt-1">Zona: {pendingUser.neighborhood_zone}</p>
          )}
        </div>

        <p className="text-brand-muted text-sm text-center mb-6 max-w-xs">
          Defina sua senha para ativar sua conta
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Criar senha (mín. 6 caracteres)"
              required
              className={inputClass}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirmar senha"
            required
            className={clsx(inputClass, confirm && confirm !== password && 'border-brand-danger')}
          />

          {error && (
            <p className="text-brand-danger text-sm text-center">{error}</p>
          )}

          <div className="pt-2">
            <BigButton type="submit" label="Ativar minha conta" loading={loading} variant="primary" />
          </div>
        </form>
      </div>

      <p className="text-center text-brand-muted/40 text-xs pb-8 safe-bottom">
        Casa a Casa Digital · Impulso Político
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <svg className="w-6 h-6 animate-spin text-brand-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}

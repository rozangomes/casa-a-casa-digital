'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { BigButton } from '@/components/ui/BigButton'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || ''
    setToken(t)
    if (!t) { setError('Link inválido.'); setValidating(false); return }

    fetch(`/api/auth/reset-password?token=${t}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setName(data.name)
      })
      .catch(() => setError('Erro ao validar link'))
      .finally(() => setValidating(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }

    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao redefinir senha')
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors duration-200'

  if (validating) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center text-brand-muted gap-2">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Validando link…
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 gap-5 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center shadow-green-glow">
          <CheckCircle className="w-8 h-8 text-brand-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-brand-text">Senha redefinida!</h2>
          <p className="text-brand-muted text-sm mt-2">Redirecionando para o login…</p>
        </div>
      </div>
    )
  }

  if (error && !name) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-brand-danger text-center">{error}</p>
        <button onClick={() => router.push('/forgot-password')}
          className="text-brand-primary text-sm font-medium cursor-pointer">
          Solicitar novo link
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      <div className="px-6 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-brand-text">Nova senha</h1>
        {name && <p className="text-brand-muted text-sm mt-1">Olá, {name.split(' ')[0]}! Escolha sua nova senha.</p>}
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              required
              className={`${inputClass} pl-11 pr-11`}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted cursor-pointer">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type={showPw ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirme a nova senha"
              required
              className={`${inputClass} pl-11`}
            />
          </div>

          {error && <p className="text-brand-danger text-sm text-center">{error}</p>}

          <BigButton type="submit" label="Redefinir senha" loading={loading} variant="primary" />
        </form>
      </div>
    </div>
  )
}

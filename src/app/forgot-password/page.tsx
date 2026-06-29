'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { BigButton } from '@/components/ui/BigButton'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'w-full bg-brand-card border border-brand-border rounded-2xl px-4 py-4 text-brand-text text-base placeholder-brand-muted focus:border-brand-primary transition-colors duration-200'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao enviar email')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 gap-5 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center shadow-green-glow">
          <CheckCircle className="w-8 h-8 text-brand-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-brand-text">Email enviado!</h2>
          <p className="text-brand-muted text-sm mt-2 max-w-xs">
            Se este email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          </p>
        </div>
        <button onClick={() => router.push('/login')}
          className="text-brand-primary text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity">
          Voltar ao login
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col safe-top">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-text">Esqueci minha senha</h1>
          <p className="text-brand-muted text-xs mt-0.5">Enviaremos um link para redefinir</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-4 gap-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu email cadastrado"
              required
              autoComplete="email"
              className={`${inputClass} pl-11`}
            />
          </div>

          {error && <p className="text-brand-danger text-sm text-center">{error}</p>}

          <BigButton type="submit" label="Enviar link de recuperação" loading={loading} variant="primary" />
        </form>
      </div>
    </div>
  )
}

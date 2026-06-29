'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/db'
import { useAppStore } from '@/store/useAppStore'

export default function RootPage() {
  const router = useRouter()
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    async function check() {
      try {
        const session = await getSession()
        if (session) {
          setUser(session)
          if (session.role === 'estrategista') router.replace('/management')
          else if (session.role === 'coordenador_bairro') router.replace('/coordinator')
          else router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch {
        router.replace('/login')
      }
    }
    check()
  }, [router, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center shadow-green-glow">
          <svg className="w-8 h-8 text-brand-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <p className="text-brand-muted text-sm animate-pulse">Carregando…</p>
      </div>
    </div>
  )
}

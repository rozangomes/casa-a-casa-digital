// Busca de endereço via ViaCEP (gratuito, sem chave de API)
import type { CepResult } from '@/types'

export async function fetchCep(cep: string): Promise<CepResult> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) throw new Error('CEP inválido')

  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error('CEP não encontrado')

  const data: CepResult = await res.json()
  if (data.erro) throw new Error('CEP não encontrado')

  return data
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

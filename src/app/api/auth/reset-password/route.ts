import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })

  const supabase = adminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, name, reset_token_expires_at')
    .eq('reset_token', token)
    .maybeSingle()

  if (!user) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })

  const expired = new Date(user.reset_token_expires_at) < new Date()
  if (expired) return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 410 })

  return NextResponse.json({ name: user.name })
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })

  const supabase = adminClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, reset_token_expires_at')
    .eq('reset_token', token)
    .maybeSingle()

  if (!user) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 })

  const expired = new Date(user.reset_token_expires_at) < new Date()
  if (expired) return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 410 })

  const password_hash = await bcrypt.hash(password, 12)

  await supabase.from('users').update({
    password_hash,
    reset_token: null,
    reset_token_expires_at: null,
  }).eq('id', user.id)

  return NextResponse.json({ success: true })
}

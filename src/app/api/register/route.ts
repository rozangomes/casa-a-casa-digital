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
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, neighborhood_zone, coordinator_name')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 404 })
  }

  return NextResponse.json({ user: data })
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password || password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  await supabase.from('users').update({
    password_hash,
    status: 'active',
    invite_token: null,
  }).eq('id', data.id)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _, invite_token: __, ...user } = { ...data, status: 'active', invite_token: null }
  return NextResponse.json({ user })
}

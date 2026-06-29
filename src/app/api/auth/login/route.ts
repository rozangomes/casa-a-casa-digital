import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Email não encontrado ou conta pendente de ativação' }, { status: 401 })
  }

  if (!data.password_hash) {
    return NextResponse.json({ error: 'Conta não ativada. Verifique seu email de convite.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, data.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, invite_token, ...user } = data
  return NextResponse.json({ user })
}

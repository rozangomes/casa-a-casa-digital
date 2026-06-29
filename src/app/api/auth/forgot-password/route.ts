import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  const supabase = adminClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, status')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'active')
    .maybeSingle()

  // Responde sempre com sucesso para não revelar se o email existe
  if (!user) return NextResponse.json({ success: true })

  const reset_token = uuidv4()
  const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora

  await supabase.from('users').update({
    reset_token,
    reset_token_expires_at: expires_at,
  }).eq('id', user.id)

  const reset_url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${reset_token}`

  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reset_password',
          name: user.name,
          email: user.email,
          reset_url,
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch { /* não bloqueia */ }
  }

  return NextResponse.json({ success: true })
}

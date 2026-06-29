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
  const { name, email, role, invited_by, invited_by_name, coordinator_name, neighborhood_zone, team_id } = await req.json()

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
  }

  const supabase = adminClient()
  const invite_token = uuidv4()
  const id = uuidv4()

  const { error } = await supabase.from('users').insert({
    id,
    name,
    email: email.toLowerCase().trim(),
    role,
    status: 'pending',
    invite_token,
    invited_by,
    coordinator_name: coordinator_name || invited_by_name || '',
    neighborhood_zone: neighborhood_zone || null,
    team_id: team_id || uuidv4(),
    phone: '',
    is_coordinator: role !== 'visitador',
    created_at: new Date().toISOString(),
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const register_url = `${process.env.NEXT_PUBLIC_APP_URL}/register?token=${invite_token}`

  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          register_url,
          invited_by_name: invited_by_name || 'Equipe Casa a Casa Digital',
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      // Não bloqueia o convite se o n8n falhar
    }
  }

  return NextResponse.json({ success: true, register_url })
}

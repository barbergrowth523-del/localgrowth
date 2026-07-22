import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Acesso profissional nao configurado.' }, { status: 403 })
  const serviceClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: member, error } = await serviceClient.from('equipe').select('id,user_id,nome,email').ilike('email', user.email).maybeSingle()
  if (error || !member) return NextResponse.json({ error: 'Profissional nao encontrado.' }, { status: 403 })
  return NextResponse.json({ member })
}


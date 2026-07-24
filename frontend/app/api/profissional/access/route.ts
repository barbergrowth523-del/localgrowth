import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Acesso profissional nao configurado.' }, { status: 403 })

  const serviceClient = createAdminClient()
  const { data: member, error } = await serviceClient.from('equipe').select('id,user_id,auth_user_id,nome,email').eq('auth_user_id', user.id).maybeSingle()
  if (error || !member) return NextResponse.json({ error: 'Profissional nao encontrado.' }, { status: 403 })
  return NextResponse.json({ member })
}

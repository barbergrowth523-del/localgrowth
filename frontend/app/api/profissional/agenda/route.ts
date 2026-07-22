import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user?.email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Acesso profissional nao configurado.' }, { status: 403 })
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: member } = await supabase.from('equipe').select('id,user_id,nome,comissao_percentual').ilike('email', user.email).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Profissional nao encontrado.' }, { status: 403 })
  const { data: appointments, error } = await supabase.from('agendamentos').select('id,cliente_id,data_agendamento,hora_agendamento,servico,status,servico_id').eq('user_id', member.user_id).eq('equipe_id', member.id).order('data_agendamento').order('hora_agendamento')
  if (error) return NextResponse.json({ error: 'Nao foi possivel carregar sua agenda.' }, { status: 500 })
  const clientIds = [...new Set((appointments ?? []).map((item) => item.cliente_id))]
  const { data: clients } = clientIds.length ? await supabase.from('clientes').select('id,nome,telefone').in('id', clientIds) : { data: [] }
  return NextResponse.json({ member, appointments: appointments ?? [], clients: clients ?? [] })
}


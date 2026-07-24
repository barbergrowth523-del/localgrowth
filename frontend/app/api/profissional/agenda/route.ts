import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Acesso profissional nao configurado.' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: member } = await supabase.from('equipe').select('id,user_id,auth_user_id,nome,comissao_percentual,email').eq('auth_user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Profissional nao encontrado.' }, { status: 403 })

  const { data: appointments, error } = await supabase
    .from('agendamentos')
    .select('id,cliente_id,data_agendamento,hora_agendamento,servico,status,servico_id,nota_avaliacao')
    .eq('user_id', member.user_id)
    .eq('equipe_id', member.id)
    .order('data_agendamento')
    .order('hora_agendamento')
  if (error) return NextResponse.json({ error: 'Nao foi possivel carregar sua agenda.' }, { status: 500 })

  const clientIds = [...new Set((appointments ?? []).map((item) => item.cliente_id))]
  const { data: clients } = clientIds.length ? await supabase.from('clientes').select('id,nome,telefone').in('id', clientIds) : { data: [] }
  const { data: services } = await supabase.from('servicos').select('id,nome,preco').eq('user_id', member.user_id)

  return NextResponse.json({ member, appointments: appointments ?? [], clients: clients ?? [], services: services ?? [] })
}

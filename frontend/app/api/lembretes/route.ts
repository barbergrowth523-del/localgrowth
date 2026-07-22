import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
  const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const { data: appointments, error } = await supabase.from('agendamentos').select('id,cliente_id,data_agendamento,hora_agendamento,servico').eq('user_id', user.id).eq('data_agendamento', tomorrow).eq('status', 'Confirmado').is('lembrete_enviado_em', null).order('hora_agendamento')
  if (error) return NextResponse.json({ error: 'Nao foi possivel carregar lembretes.' }, { status: 500 })
  const ids = [...new Set((appointments ?? []).map((item) => item.cliente_id))]
  const { data: clients } = ids.length ? await supabase.from('clientes').select('id,nome,telefone').in('id', ids) : { data: [] }
  const clientMap = new Map((clients ?? []).map((client) => [client.id, client]))
  const reminders = (appointments ?? []).map((appointment) => {
    const client = clientMap.get(appointment.cliente_id)
    const phone = client?.telefone?.replace(/\D/g, '') ?? ''
    const message = encodeURIComponent('Ola ' + (client?.nome ?? 'cliente') + '! Lembrete do seu horario amanha as ' + appointment.hora_agendamento.slice(0, 5) + ' para ' + appointment.servico + '. Ate la!')
    return { ...appointment, clientName: client?.nome ?? 'Cliente', phone: client?.telefone ?? '', waLink: phone ? 'https://wa.me/' + (phone.startsWith('55') ? phone : '55' + phone) + '?text=' + message : '' }
  })
  return NextResponse.json({ reminders })
}


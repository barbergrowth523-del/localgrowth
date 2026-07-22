import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID }
function resolveBarbeariaId(value: string) { return uuidPattern.test(value) ? value : permanentBarbearias[value.toLowerCase()] }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { barbearia?: string; nome?: string; telefone?: string; servicoId?: string; date?: string; time?: string }
    const barbeariaId = resolveBarbeariaId(body.barbearia?.trim() ?? '')
    const nome = body.nome?.trim() ?? ''
    const telefone = body.telefone?.replace(/\D/g, '') ?? ''
    const servicoId = body.servicoId?.trim() ?? ''
    const date = body.date?.trim() ?? ''
    const time = body.time?.trim() ?? ''
    if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ error: 'Link de agendamento invalido.' }, { status: 400 })
    if (nome.length < 2 || telefone.length < 8 || !uuidPattern.test(servicoId) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: 'Preencha todos os dados do agendamento.' }, { status: 400 })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Agendamento publico nao configurado.' }, { status: 500 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: service, error: serviceError } = await supabase.from('servicos').select('id,nome').eq('id', servicoId).eq('user_id', barbeariaId).eq('ativo', true).maybeSingle()
    if (serviceError || !service) return NextResponse.json({ error: 'Servico invalido.' }, { status: 400 })
    let { data: client } = await supabase.from('clientes').select('id').eq('user_id', barbeariaId).eq('telefone', telefone).maybeSingle()
    if (!client) {
      const result = await supabase.from('clientes').insert({ nome, telefone, data_ultimo_corte: new Date().toISOString().slice(0, 10), user_id: barbeariaId, barbearia_id: barbeariaId, servico_preferido_id: servicoId }).select('id').single()
      if (result.error || !result.data) return NextResponse.json({ error: 'Nao foi possivel cadastrar o cliente.' }, { status: 400 })
      client = result.data
    }
    const { error } = await supabase.from('agendamentos').insert({ user_id: barbeariaId, barbearia_id: barbeariaId, cliente_id: client.id, servico_id: service.id, servico: service.nome, data_agendamento: date, hora_agendamento: time, status: 'Confirmado' })
    if (error) return NextResponse.json({ error: 'Nao foi possivel reservar o horario.' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Erro inesperado ao criar agendamento.' }, { status: 500 }) }
}
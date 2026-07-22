import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { agendamentoId?: string; estrelas?: number; comentario?: string }
    const appointmentId = body.agendamentoId?.trim() ?? ''
    const stars = Number(body.estrelas)
    if (!appointmentId || !Number.isInteger(stars) || stars < 1 || stars > 5) return NextResponse.json({ error: 'Informe uma avaliacao de 1 a 5 estrelas.' }, { status: 400 })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Avaliacao nao configurada.' }, { status: 500 })
    const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: appointment } = await supabase.from('agendamentos').select('id,status').eq('id', appointmentId).eq('status', 'Concluido').maybeSingle()
    if (!appointment) return NextResponse.json({ error: 'Atendimento nao encontrado ou ainda nao concluido.' }, { status: 404 })
    const { error } = await supabase.from('avaliacoes').upsert({ agendamento_id: appointmentId, estrelas: stars, comentario: body.comentario?.trim() || null }, { onConflict: 'agendamento_id' })
    if (error) return NextResponse.json({ error: 'Nao foi possivel salvar a avaliacao.' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Requisicao invalida.' }, { status: 400 }) }
}


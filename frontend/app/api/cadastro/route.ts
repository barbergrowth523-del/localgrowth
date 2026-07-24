import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID || 'a2ce084d-84bd-426e-9ec4-cc0f961df556' }
function resolveBarbeariaId(value: string) { return permanentBarbearias[value.trim().toLowerCase()] }

export async function POST(request: Request) {
  try {
    const allowed = await checkPublicRateLimit(request, 'cadastro', 5, 600)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
    }
    const body = await request.json() as { barbearia?: string; nome?: string; telefone?: string; dataNascimento?: string; servicoPreferidoId?: string | null }
    const barbearia = body.barbearia?.trim() ?? ''
    const nome = body.nome?.trim() ?? ''
    const telefone = body.telefone?.replace(/\D/g, '') ?? ''
    const dataNascimento = body.dataNascimento?.trim() || null
    const servicoPreferidoId = body.servicoPreferidoId?.trim() || null
    const barbeariaId = resolveBarbeariaId(barbearia)
    if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ error: 'Link de cadastro invalido.' }, { status: 400 })
    if (nome.length < 2 || nome.length > 120 || telefone.length < 8 || telefone.length > 15) return NextResponse.json({ error: 'Preencha nome e telefone validos.' }, { status: 400 })
    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return NextResponse.json({ error: 'Data de nascimento invalida.' }, { status: 400 })
    }
    if (servicoPreferidoId && !uuidPattern.test(servicoPreferidoId)) return NextResponse.json({ error: 'Servico invalido.' }, { status: 400 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    if (servicoPreferidoId) {
      const { data: service, error: serviceError } = await supabase.from('servicos').select('id').eq('id', servicoPreferidoId).eq('user_id', barbeariaId).eq('ativo', true).maybeSingle()
      if (serviceError || !service) return NextResponse.json({ error: 'Servico invalido.' }, { status: 400 })
    }
    const { error } = await supabase.from('clientes').upsert({ nome, telefone, data_ultimo_corte: new Date().toISOString().slice(0, 10), data_nascimento: dataNascimento, servico_preferido_id: servicoPreferidoId, barbearia_id: barbeariaId, user_id: barbeariaId }, { onConflict: 'user_id,telefone', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: 'Nao foi possivel concluir o cadastro.' }, { status: 400 })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Erro inesperado ao concluir cadastro.' }, { status: 500 }) }
}

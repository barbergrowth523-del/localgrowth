import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'
import { readJsonBody } from '@/lib/security/request'
import { resolvePublicBarbershop } from '@/lib/public-barbershop'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T12:00:00Z')
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function POST(request: Request) {
  try {
    const allowed = await checkPublicRateLimit(request, 'cadastro', 5, 600)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
    }
    const body = await readJsonBody<{ barbearia?: string; nome?: string; telefone?: string; dataNascimento?: string; servicoPreferidoId?: string | null }>(request)
    if (!body) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })
    const barbearia = body.barbearia?.trim() ?? ''
    const nome = body.nome?.trim() ?? ''
    const telefone = body.telefone?.replace(/\D/g, '') ?? ''
    const dataNascimento = body.dataNascimento?.trim() || null
    const servicoPreferidoId = body.servicoPreferidoId?.trim() || null
    const shop = await resolvePublicBarbershop(barbearia)
    const barbeariaId = shop?.id
    if (!barbeariaId) return NextResponse.json({ error: 'Link de cadastro invalido.' }, { status: 400 })
    if (nome.length < 2 || nome.length > 120 || telefone.length < 8 || telefone.length > 15) return NextResponse.json({ error: 'Preencha nome e telefone validos.' }, { status: 400 })
    if (dataNascimento && !isRealDate(dataNascimento)) {
      return NextResponse.json({ error: 'Data de nascimento invalida.' }, { status: 400 })
    }
    if (servicoPreferidoId && !uuidPattern.test(servicoPreferidoId)) return NextResponse.json({ error: 'Servico invalido.' }, { status: 400 })
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Cadastro publico nao configurado.' }, { status: 503 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    if (servicoPreferidoId) {
      const { data: service, error: serviceError } = await supabase.from('servicos').select('id').eq('id', servicoPreferidoId).eq('user_id', barbeariaId).eq('ativo', true).maybeSingle()
      if (serviceError || !service) return NextResponse.json({ error: 'Servico invalido.' }, { status: 400 })
    }
    const { error } = await supabase.from('clientes').upsert({ nome, telefone, data_ultimo_corte: new Date().toISOString().slice(0, 10), data_nascimento: dataNascimento, servico_preferido_id: servicoPreferidoId, barbearia_id: barbeariaId, user_id: barbeariaId }, { onConflict: 'user_id,telefone', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: 'Nao foi possivel concluir o cadastro.' }, { status: 400 })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Erro inesperado ao concluir cadastro.' }, { status: 500 }) }
}

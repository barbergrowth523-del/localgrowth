import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const permanentBarbearias: Record<string, string | undefined> = {
  jacobina: process.env.BARBEARIA_JACOBINA_ID,
}

function resolveBarbeariaId(value: string) {
  if (uuidPattern.test(value)) return value
  return permanentBarbearias[value.toLowerCase()]
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { barbearia?: string; nome?: string; telefone?: string; dataNascimento?: string }
    const barbearia = body.barbearia?.trim() ?? ''
    const nome = body.nome?.trim() ?? ''
    const telefone = body.telefone?.replace(/\D/g, '') ?? ''
    const dataNascimento = body.dataNascimento?.trim() || null
    const barbeariaId = resolveBarbeariaId(barbearia)
    if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ error: 'Link de cadastro invalido.' }, { status: 400 })
    if (nome.length < 2 || telefone.length < 8)  return NextResponse.json({ error: 'Preencha nome e telefone validos.' }, { status: 400 })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Cadastro publico nao configurado no servidor.' }, { status: 500 })
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await supabase.from('clientes').insert({ nome, telefone, data_ultimo_corte: new Date().toISOString().slice(0, 10), data_nascimento: dataNascimento, barbearia_id: barbeariaId, user_id: barbeariaId })
    if (error) return NextResponse.json({ error: 'Nao foi possivel concluir o cadastro.' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro inesperado ao concluir cadastro.' }, { status: 500 })
  }
}

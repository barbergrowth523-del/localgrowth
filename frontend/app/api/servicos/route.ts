import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const permanentBarbearias: Record<string, string | undefined> = { jacobina: process.env.BARBEARIA_JACOBINA_ID || 'a2ce084d-84bd-426e-9ec4-cc0f961df556' }

function resolveBarbeariaId(value: string) { return uuidPattern.test(value) ? value : permanentBarbearias[value.toLowerCase()] }

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('barbearia')?.trim() ?? ''
  const barbeariaId = resolveBarbeariaId(value)
  if (!barbeariaId || !uuidPattern.test(barbeariaId)) return NextResponse.json({ error: 'Link de cadastro invalido.' }, { status: 400 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Servicos publicos nao configurados.' }, { status: 500 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('user_id', barbeariaId).eq('ativo', true).order('nome')
  if (error) return NextResponse.json({ error: 'Nao foi possivel carregar os servicos.' }, { status: 400 })
  if (!data?.length) {
    const defaults = [{ user_id: barbeariaId, nome: 'Corte', preco: 60, duracao_minutos: 30 }, { user_id: barbeariaId, nome: 'Barba', preco: 40, duracao_minutos: 30 }]
    const created = await supabase.from('servicos').insert(defaults).select('id,nome,preco,duracao_minutos')
    return NextResponse.json({ services: created.data ?? defaults.map((item) => ({ ...item, id: item.nome.toLowerCase() })) })
  }
  return NextResponse.json({ services: data })
}

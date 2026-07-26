import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolvePublicBarbershop } from '@/lib/public-barbershop'


export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('barbearia')?.trim() ?? ''
  const shop = await resolvePublicBarbershop(value)
  const barbeariaId = shop?.id
  if (!shop || !barbeariaId) return NextResponse.json({ error: 'Link de cadastro invalido.' }, { status: 400 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Servicos publicos nao configurados.' }, { status: 500 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('user_id', barbeariaId).eq('ativo', true).order('nome')
  if (error) return NextResponse.json({ error: 'Nao foi possivel carregar os servicos.' }, { status: 500 })
  return NextResponse.json({ services: data ?? [], barbershop: { name: shop.name, slug: shop.slug } })
}

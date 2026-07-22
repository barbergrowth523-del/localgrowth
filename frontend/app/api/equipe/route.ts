import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role nao configurada.')
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const sessionClient = await createClient()
    const { data: { user: owner } } = await sessionClient.auth.getUser()
    if (!owner) return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })

    const serviceClient = getServiceClient()
    const { data: profile } = await serviceClient.from('perfis_barbearia').select('plano').eq('id', owner.id).maybeSingle()
    if (String(profile?.plano ?? 'starter').toLowerCase() !== 'scale') {
      return NextResponse.json({ error: 'Recurso exclusivo do Plano Scale.' }, { status: 403 })
    }

    const body = await request.json() as { nome?: string; telefone?: string; email?: string; senha?: string; comissao?: number }
    const nome = body.nome?.trim()
    const email = body.email?.trim().toLowerCase()
    const senha = body.senha ?? ''
    const telefone = body.telefone?.trim() || null
    const comissao = Number(body.comissao)

    if (!nome || !email || senha.length < 6 || !Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
      return NextResponse.json({ error: 'Informe nome, email, senha e comissao validos.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { account_type: 'professional' },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Nao foi possivel criar o acesso.' }, { status: 400 })
    }

    const { data: member, error: memberError } = await serviceClient.from('equipe').insert({
      user_id: owner.id,
      auth_user_id: authData.user.id,
      nome,
      telefone,
      email,
      comissao_percentual: comissao,
    }).select('id,nome,telefone,email,comissao_percentual,ativo').single()

    if (memberError) {
      await serviceClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Nao foi possivel vincular o profissional: ' + memberError.message }, { status: 400 })
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro inesperado ao criar profissional.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'
import { hasValidSameOrigin, readJsonBody } from '@/lib/security/request'

export async function POST(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
    const sessionClient = await createClient()
    const { data: { user: owner } } = await sessionClient.auth.getUser()
    if (!owner) return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })

    const allowed = await checkPublicRateLimit(request, 'equipe:' + owner.id, 5, 3600)
    if (!allowed) return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })

    const serviceClient = createAdminClient()
    const { data: profile } = await serviceClient.from('perfis_barbearia').select('plano').eq('id', owner.id).maybeSingle()
    if (String(profile?.plano ?? 'starter').toLowerCase() !== 'scale') {
      return NextResponse.json({ error: 'Recurso exclusivo do Plano Scale.' }, { status: 403 })
    }

    const body = await readJsonBody<{ nome?: string; telefone?: string; email?: string; senha?: string; comissao?: number }>(request)
    if (!body) return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })
    const nome = body.nome?.trim()
    const email = body.email?.trim().toLowerCase()
    const senha = body.senha ?? ''
    const telefone = body.telefone?.replace(/\D/g, '') || null
    const comissao = Number(body.comissao)

    if (!nome || nome.length > 120 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8 || senha.length > 72 || (telefone && (telefone.length < 8 || telefone.length > 15)) || !Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
      return NextResponse.json({ error: 'Informe nome, email, senha e comissao validos.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { account_type: 'professional' },
    })

    if (authError || !authData.user) {
      console.error('[api/equipe] auth user creation failed', authError?.status ?? 'unknown')
      return NextResponse.json({ error: 'Nao foi possivel criar o acesso profissional.' }, { status: 400 })
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
      console.error('[api/equipe] member link failed', memberError.code)
      return NextResponse.json({ error: 'Nao foi possivel vincular o profissional.' }, { status: 400 })
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('[api/equipe] request failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Erro inesperado ao criar profissional.' }, { status: 500 })
  }
}
export async function DELETE(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
    const sessionClient = await createClient()
    const { data: { user: owner } } = await sessionClient.auth.getUser()
    if (!owner) return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })

    const body = await readJsonBody<{ memberId?: string }>(request)
    const memberId = body?.memberId?.trim() ?? ''
    if (!/^[0-9a-f-]{36}$/i.test(memberId)) return NextResponse.json({ error: 'Profissional invalido.' }, { status: 400 })

    const serviceClient = createAdminClient()
    const { data: profile } = await serviceClient.from('perfis_barbearia').select('plano').eq('id', owner.id).maybeSingle()
    if (String(profile?.plano ?? 'starter').toLowerCase() !== 'scale') return NextResponse.json({ error: 'Recurso exclusivo do Plano Scale.' }, { status: 403 })

    const { data: member, error: memberError } = await serviceClient.from('equipe').select('id,auth_user_id').eq('id', memberId).eq('user_id', owner.id).maybeSingle()
    if (memberError || !member) return NextResponse.json({ error: 'Profissional nao encontrado.' }, { status: 404 })

    const { error: deleteError } = await serviceClient.from('equipe').delete().eq('id', member.id).eq('user_id', owner.id)
    if (deleteError) return NextResponse.json({ error: 'Nao foi possivel remover o profissional.' }, { status: 500 })

    if (member.auth_user_id) {
      const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(member.auth_user_id)
      if (authDeleteError) console.error('[api/equipe] orphan auth cleanup failed', authDeleteError.status ?? 'unknown')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/equipe] delete failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Erro inesperado ao remover profissional.' }, { status: 500 })
  }
}
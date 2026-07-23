import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ProfileRow = Record<string, unknown>

const firstValue = (profile: ProfileRow, keys: string[]) => keys.map((key) => profile[key]).find((value) => value !== null && value !== undefined && value !== '')

const normalize = (profile: ProfileRow) => {
  const renewalValue = firstValue(profile, ['renovacao_automatica', 'auto_renewal', 'renovacaoAutomatica'])
  return {
    plan: String(firstValue(profile, ['plano', 'plan']) ?? ''),
    startedAt: String(firstValue(profile, ['data_inicio_assinatura', 'inicio_assinatura', 'subscription_started_at', 'started_at']) ?? ''),
    expiresAt: String(firstValue(profile, ['data_fim_assinatura', 'data_vencimento', 'vencimento', 'subscription_ends_at', 'expires_at']) ?? ''),
    autoRenewal: renewalValue === true || renewalValue === 'true' || renewalValue === 1,
  }
}

async function getProfile() {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { supabase, user: null, profile: null, error: authError }

  const primary = await supabase.from('perfis_barbearia').select('*').eq('id', authData.user.id).maybeSingle()
  if (primary.data) return { supabase, user: authData.user, profile: primary.data as ProfileRow, error: null }

  const fallback = await supabase.from('perfis_barbearia').select('*').eq('auth_id', authData.user.id).maybeSingle()
  return { supabase, user: authData.user, profile: (fallback.data as ProfileRow | null) ?? null, error: fallback.error ?? primary.error }
}

export async function GET() {
  const result = await getProfile()
  if (!result.user) return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 })
  if (result.error && !result.profile) return NextResponse.json({ error: 'Nao foi possivel carregar a assinatura.' }, { status: 500 })
  return NextResponse.json({ subscription: normalize(result.profile ?? {}) })
}

export async function PATCH(request: Request) {
  const result = await getProfile()
  if (!result.user) return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 })
  if (!result.profile) return NextResponse.json({ error: 'Perfil da barbearia nao encontrado.' }, { status: 404 })

  const body = await request.json() as { autoRenewal?: boolean }
  if (typeof body.autoRenewal !== 'boolean') return NextResponse.json({ error: 'Status de renovacao invalido.' }, { status: 400 })

  const column = ['renovacao_automatica', 'auto_renewal', 'renovacaoAutomatica'].find((key) => Object.prototype.hasOwnProperty.call(result.profile, key))
  if (!column) return NextResponse.json({ error: 'Campo de renovacao nao configurado no banco.' }, { status: 409 })

  const key = Object.prototype.hasOwnProperty.call(result.profile, 'id') ? 'id' : 'auth_id'
  const { error } = await result.supabase.from('perfis_barbearia').update({ [column]: body.autoRenewal }).eq(key, result.user.id)
  if (error) return NextResponse.json({ error: 'Nao foi possivel salvar a renovacao.' }, { status: 500 })

  return NextResponse.json({ subscription: normalize({ ...result.profile, [column]: body.autoRenewal }) })
}
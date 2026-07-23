import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Row = Record<string, unknown>
type Source = { table: 'perfis_barbearia' | 'assinaturas'; key: string; id: string; row: Row }

const firstValue = (row: Row, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== null && value !== undefined && value !== '')

const normalize = (profile: Row, subscription: Row | null, userCreatedAt: string, source: Source | null) => {
  const merged = { ...profile, ...(subscription ?? {}) }
  const renewalValue = firstValue(merged, ['renovacao_automatica', 'auto_renewal', 'renovacaoAutomatica', 'autoRenewal'])
  return {
    plan: String(firstValue(merged, ['plano', 'plan', 'nome_plano', 'plan_name', 'subscription_plan']) ?? ''),
    startedAt: String(firstValue(merged, ['data_inicio_assinatura', 'inicio_assinatura', 'subscription_started_at', 'started_at', 'startDate', 'start_date', 'created_at']) ?? userCreatedAt ?? ''),
    expiresAt: String(firstValue(merged, ['data_fim_assinatura', 'data_vencimento', 'vencimento', 'subscription_ends_at', 'expires_at', 'expiresAt', 'due_date', 'dueDate']) ?? ''),
    autoRenewal: renewalValue === true || renewalValue === 'true' || renewalValue === 1,
    source,
  }
}

async function findSubscription(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  for (const key of ['user_id', 'usuario_id', 'auth_id', 'perfil_id']) {
    const result = await supabase.from('assinaturas').select('*').eq(key, userId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (result.data) return result.data as Row
  }
  return null
}

async function getAccount() {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { supabase, user: null, profile: null, subscription: null, source: null, error: authError }

  const primary = await supabase.from('perfis_barbearia').select('*').eq('id', authData.user.id).maybeSingle()
  const fallback = primary.data ? null : await supabase.from('perfis_barbearia').select('*').eq('auth_id', authData.user.id).maybeSingle()
  const profile = (primary.data ?? fallback?.data ?? null) as Row | null
  const profileKey = profile && Object.prototype.hasOwnProperty.call(profile, 'id') ? 'id' : 'auth_id'
  const profileSource = profile ? { table: 'perfis_barbearia' as const, key: profileKey, id: authData.user.id, row: profile } : null
  const subscription = await findSubscription(supabase, authData.user.id)
  const subscriptionSource = subscription && typeof subscription.id === 'string' ? { table: 'assinaturas' as const, key: 'id', id: subscription.id, row: subscription } : null

  return { supabase, user: authData.user, profile: profile ?? {}, subscription, source: subscriptionSource ?? profileSource, error: fallback?.error ?? primary.error }
}

export async function GET() {
  const result = await getAccount()
  if (!result.user) return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 })
  return NextResponse.json({ subscription: normalize(result.profile ?? {}, result.subscription, result.user.created_at, result.source) })
}

export async function PATCH(request: Request) {
  const result = await getAccount()
  if (!result.user) return NextResponse.json({ error: 'Usuario nao autenticado.' }, { status: 401 })
  if (!result.source) return NextResponse.json({ error: 'Assinatura nao encontrada.' }, { status: 404 })

  const body = await request.json() as { autoRenewal?: boolean }
  if (typeof body.autoRenewal !== 'boolean') return NextResponse.json({ error: 'Status de renovacao invalido.' }, { status: 400 })

  const sourceRow = result.source.row
  const column = ['renovacao_automatica', 'auto_renewal', 'renovacaoAutomatica', 'autoRenewal'].find((key) => Object.prototype.hasOwnProperty.call(sourceRow, key))
  if (!column) return NextResponse.json({ error: 'Campo de renovacao nao configurado no banco.' }, { status: 409 })

  const { error } = await result.supabase.from(result.source.table).update({ [column]: body.autoRenewal }).eq(result.source.key, result.source.id)
  if (error) return NextResponse.json({ error: 'Nao foi possivel salvar a renovacao.' }, { status: 500 })

  const updated = { ...sourceRow, [column]: body.autoRenewal }
  return NextResponse.json({ subscription: normalize(result.profile ?? {}, result.subscription ? updated : null, result.user.created_at, result.source) })
}

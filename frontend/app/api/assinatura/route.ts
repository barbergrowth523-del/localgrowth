import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Row = Record<string, unknown>
type Source = { table: 'perfis_barbearia'; key: 'id'; id: string; row: Row }

const firstValue = (row: Row, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== null && value !== undefined && value !== '')
const addDays = (value: string, days: number) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const normalize = (profile: Row, subscription: Row | null, userCreatedAt: string, source: Source | null) => {
  const merged = { ...profile, ...(subscription ?? {}) }
  const renewalValue = firstValue(merged, ['renovacao_automatica', 'auto_renewal', 'renovacaoAutomatica', 'autoRenewal'])
  const startedAt = String(firstValue(merged, ['data_inicio_assinatura', 'inicio_assinatura', 'subscription_started_at', 'started_at', 'startDate', 'start_date', 'created_at']) ?? userCreatedAt ?? '')
  const storedExpiresAt = firstValue(merged, ['data_vencimento', 'data_fim_assinatura', 'vencimento', 'subscription_ends_at', 'expires_at', 'expiresAt', 'due_date', 'dueDate'])
  const expiresAt = String(storedExpiresAt ?? '') || addDays(startedAt, 30)
  return {
    plan: String(firstValue(merged, ['plano', 'plan', 'nome_plano', 'plan_name', 'subscription_plan']) ?? ''),
    startedAt,
    expiresAt,
    autoRenewal: renewalValue === undefined || renewalValue === true || renewalValue === 'true' || renewalValue === 1,
    source,
  }
}


async function getAccount() {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { supabase, user: null, profile: null, subscription: null, source: null, error: authError }

  const primary = await supabase.from('perfis_barbearia').select('id,plano,data_inicio_assinatura,data_vencimento,renovacao_automatica,created_at').eq('id', authData.user.id).maybeSingle()
  const profile = (primary.data ?? null) as Row | null
  const profileSource = profile ? { table: 'perfis_barbearia' as const, key: 'id' as const, id: authData.user.id, row: profile } : null

  return { supabase, user: authData.user, profile: profile ?? {}, subscription: null, source: profileSource, error: primary.error }
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

  const admin = createAdminClient()
  const { error } = await admin.from(result.source.table).update({ [column]: body.autoRenewal }).eq(result.source.key, result.source.id)
  if (error) return NextResponse.json({ error: 'Nao foi possivel salvar a renovacao.' }, { status: 500 })

  const updatedProfile = { ...(result.profile ?? {}), [column]: body.autoRenewal }
  return NextResponse.json({ subscription: normalize(updatedProfile, null, result.user.created_at, result.source) })
}

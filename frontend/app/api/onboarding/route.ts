import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { hasValidSameOrigin, readJsonBody } from '@/lib/security/request'

type OnboardingStatus = 'completed' | 'skipped'

type OnboardingRow = { completed_at: string | null; skipped_at: string | null }

async function getAuthenticatedUser() {
  const sessionClient = await createClient()
  const { data: { user }, error } = await sessionClient.auth.getUser()
  return { user, error }
}

export async function GET() {
  try {
    const { user, error: userError } = await getAuthenticatedUser()
    if (userError || !user) return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('lojista_onboarding')
      .select('completed_at,skipped_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) {
      console.error('[api/onboarding] lookup failed', { code: error.code })
      return NextResponse.json({ error: 'Nao foi possivel consultar o tour.' }, { status: 500 })
    }

    const row = data as OnboardingRow | null
    return NextResponse.json({ completed: Boolean(row?.completed_at || row?.skipped_at) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/onboarding] lookup exception', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Erro ao consultar o tour.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
    const { user, error: userError } = await getAuthenticatedUser()
    if (userError || !user) return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })

    const body = await readJsonBody<{ status?: OnboardingStatus }>(request, 1024)
    if (body?.status !== 'completed' && body?.status !== 'skipped') {
      return NextResponse.json({ error: 'Status do tour invalido.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const column = body.status === 'completed' ? 'completed_at' : 'skipped_at'
    const admin = createAdminClient()
    const { error } = await admin
      .from('lojista_onboarding')
      .upsert({ user_id: user.id, [column]: now, updated_at: now }, { onConflict: 'user_id' })
    if (error) {
      console.error('[api/onboarding] persistence failed', { code: error.code })
      return NextResponse.json({ error: 'Nao foi possivel salvar o tour.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: body.status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/onboarding] persistence exception', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Erro ao salvar o tour.' }, { status: 500 })
  }
}

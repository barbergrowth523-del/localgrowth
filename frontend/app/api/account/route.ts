import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'
import { hasValidSameOrigin, readJsonBody } from '@/lib/security/request'

const SUPER_ADMIN_EMAIL = 'barbergrowth523@gmail.com'

type AccountDeleteBody = { password?: string; confirmation?: string }

export async function DELETE(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
    const sessionClient = await createClient()
    const { data: { user }, error: userError } = await sessionClient.auth.getUser()
    if (userError || !user?.email) return NextResponse.json({ error: 'Sua sessao expirou. Entre novamente.' }, { status: 401 })
    if (user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL) return NextResponse.json({ error: 'A conta Super Admin nao pode ser excluida por esta tela.' }, { status: 403 })

    const allowed = await checkPublicRateLimit(request, `account-delete:${user.id}`, 3, 3600)
    if (!allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, { status: 429 })

    const body = await readJsonBody<AccountDeleteBody>(request, 4096)
    const password = body?.password ?? ''
    if (body?.confirmation !== 'EXCLUIR' || password.length < 8 || password.length > 72) return NextResponse.json({ error: 'Confirme a palavra EXCLUIR e informe sua senha atual.' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !publishableKey) return NextResponse.json({ error: 'Servico de autenticacao indisponivel.' }, { status: 503 })

    const reauthClient = createSupabaseClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: reauth, error: reauthError } = await reauthClient.auth.signInWithPassword({ email: user.email, password })
    if (reauthError || reauth.user?.id !== user.id) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('perfis_barbearia').select('role').eq('id', user.id).maybeSingle()
    if (String(profile?.role ?? '').toLowerCase() === 'admin') return NextResponse.json({ error: 'A conta Super Admin nao pode ser excluida por esta tela.' }, { status: 403 })

    const { data: professionalIds, error: cleanupError } = await admin.rpc('erase_merchant_account_data', { p_owner_id: user.id })
    if (cleanupError) {
      console.error('[api/account] data cleanup failed', { code: cleanupError.code, details: cleanupError.details })
      return NextResponse.json({ error: 'Nao foi possivel remover os dados da conta.' }, { status: 500 })
    }

    for (const professionalId of (professionalIds ?? []) as string[]) {
      const { error } = await admin.auth.admin.deleteUser(professionalId)
      if (error) console.error('[api/account] professional auth cleanup failed', { status: error.status })
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error('[api/account] auth deletion failed', { status: authDeleteError.status })
      return NextResponse.json({ error: 'Os dados foram removidos, mas a conta de acesso nao pode ser excluida agora. Contate o suporte.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/account] delete failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Erro inesperado ao excluir a conta.' }, { status: 500 })
  }
}
import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export class AdminAccessError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminAccessError'
    this.status = status
  }
}

export async function requireSuperAdmin() {
  const sessionClient = await createClient()
  const { data: authData, error: authError } = await sessionClient.auth.getUser()

  if (authError || !authData.user) {
    throw new AdminAccessError('Sessao administrativa nao encontrada.', 401)
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('perfis_barbearia')
    .select('role,acesso_bloqueado')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[admin-auth] profile lookup failed', profileError.message)
    throw new AdminAccessError('Nao foi possivel validar o acesso administrativo.', 500)
  }

  if (profile?.role !== 'admin' || profile.acesso_bloqueado === true) {
    throw new AdminAccessError('Acesso administrativo negado.', 403)
  }

  return { user: authData.user, admin }
}

export function getAdminErrorStatus(error: unknown) {
  return error instanceof AdminAccessError ? error.status : 500
}

export function getAdminErrorMessage(error: unknown) {
  if (error instanceof AdminAccessError) return error.message
  return 'Erro interno no painel administrativo.'
}

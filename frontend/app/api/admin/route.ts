import { NextResponse } from 'next/server'
import { getAdminErrorMessage, getAdminErrorStatus, requireSuperAdmin } from '@/lib/admin'
import { getAdminOverview } from '@/lib/admin-overview'
import { createAdminClient } from '@/lib/supabase/admin'

type AdminAction =
  | { action: 'block'; userId: string; blocked: boolean }
  | { action: 'courtesy'; userId: string; days: number }
  | { action: 'impersonate'; userId: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

async function writeAudit(
  admin: ReturnType<typeof createAdminClient>,
  adminId: string,
  targetUserId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  const { error } = await admin.from('admin_audit_log').insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    metadata,
  })
  if (error) console.error('[api/admin] audit write failed', error.message)
}

export async function GET() {
  try {
    const overview = await getAdminOverview()
    return NextResponse.json(overview, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: getAdminErrorMessage(error) }, { status: getAdminErrorStatus(error) })
  }
}

export async function PATCH(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Origem da requisicao invalida.' }, { status: 403 })
  }

  try {
    const { user: currentAdmin, admin } = await requireSuperAdmin()
    const body = await request.json() as Partial<AdminAction>

    if (!body.userId || !UUID_PATTERN.test(body.userId)) {
      return NextResponse.json({ error: 'Usuario alvo invalido.' }, { status: 400 })
    }

    const { data: targetProfile, error: profileError } = await admin
      .from('perfis_barbearia')
      .select('id,role,plano,data_vencimento,acesso_bloqueado')
      .eq('id', body.userId)
      .maybeSingle()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'Barbearia nao encontrada.' }, { status: 404 })
    }
    if (targetProfile.role === 'admin') {
      return NextResponse.json({ error: 'Outro administrador nao pode ser alterado por esta acao.' }, { status: 403 })
    }

    if (body.action === 'block' && typeof body.blocked === 'boolean') {
      const { error } = await admin
        .from('perfis_barbearia')
        .update({ acesso_bloqueado: body.blocked })
        .eq('id', body.userId)
      if (error) throw error

      await writeAudit(
        admin,
        currentAdmin.id,
        body.userId,
        body.blocked ? 'block_access' : 'unblock_access',
        { blocked: body.blocked },
      )
      return NextResponse.json({ success: true, blocked: body.blocked })
    }

    if (body.action === 'courtesy' && Number.isInteger(body.days) && Number(body.days) >= 1 && Number(body.days) <= 365) {
      const now = Date.now()
      const storedExpiry = targetProfile.data_vencimento ? new Date(targetProfile.data_vencimento).getTime() : 0
      const base = Number.isFinite(storedExpiry) ? Math.max(now, storedExpiry) : now
      const courtesyUntil = new Date(base + Number(body.days) * 86_400_000).toISOString()
      const { error } = await admin
        .from('perfis_barbearia')
        .update({ cortesia_ate: courtesyUntil, data_vencimento: courtesyUntil, acesso_bloqueado: false })
        .eq('id', body.userId)
      if (error) throw error

      await writeAudit(admin, currentAdmin.id, body.userId, 'grant_courtesy', {
        days: body.days,
        courtesyUntil,
      })
      return NextResponse.json({ success: true, courtesyUntil })
    }

    if (body.action === 'impersonate') {
      if (body.userId === currentAdmin.id) {
        return NextResponse.json({ error: 'Voce ja esta autenticado nesta conta.' }, { status: 400 })
      }
      if (targetProfile.acesso_bloqueado) {
        return NextResponse.json({ error: 'Desbloqueie a barbearia antes de entrar como lojista.' }, { status: 409 })
      }

      await writeAudit(admin, currentAdmin.id, body.userId, 'impersonate_preview_opened', {
        mode: 'read_only',
      })
      return NextResponse.json({ success: true, previewUrl: `/admin/lojistas/${body.userId}` })
    }

    return NextResponse.json({ error: 'Acao administrativa invalida.' }, { status: 400 })
  } catch (error) {
    const status = getAdminErrorStatus(error)
    console.error('[api/admin] request failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: getAdminErrorMessage(error) }, { status })
  }
}

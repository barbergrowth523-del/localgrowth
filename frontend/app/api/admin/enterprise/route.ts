import { NextResponse } from 'next/server'
import { requireSuperAdmin, getAdminErrorMessage, getAdminErrorStatus } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

type Payload = {
  action?: string
  plan?: string
  displayName?: string
  priceMonthly?: number
  clientLimit?: number | null
  features?: string[]
  code?: string
  discountPercent?: number
  durationDays?: number
  maxRedemptions?: number | null
  expiresAt?: string | null
  trialDays?: number
  targetPlan?: string | null
  title?: string
  message?: string
  kind?: string
  broadcastId?: string
  displayMode?: string
}
const PLANS = ['starter', 'pro', 'scale']
const KINDS = ['info', 'success', 'warning', 'critical']
const DISPLAY_MODES = ['banner', 'popup']

function validOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

async function audit(admin: ReturnType<typeof createAdminClient>, adminId: string, action: string, metadata: Record<string, unknown>) {
  const { error } = await admin.from('admin_audit_log').insert({ admin_id: adminId, target_user_id: null, action, metadata })
  if (error) console.error('[admin-enterprise] audit failed', error.message)
}

export async function PATCH(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
  try {
    const { user, admin } = await requireSuperAdmin()
    const body = await request.json() as Payload

    if (body.action === 'update_plan' && PLANS.includes(body.plan ?? '')) {
      const price = Number(body.priceMonthly)
      const limit = body.clientLimit == null ? null : Number(body.clientLimit)
      if (!Number.isFinite(price) || price < 0 || (limit !== null && (!Number.isInteger(limit) || limit < 1))) return NextResponse.json({ error: 'Valores do plano invalidos.' }, { status: 400 })
      const { error } = await admin.from('admin_plan_configs').update({ display_name: String(body.displayName ?? '').trim(), price_monthly: price, client_limit: limit, features: body.features ?? [], updated_by: user.id, updated_at: new Date().toISOString() }).eq('plan', body.plan)
      if (error) throw error
      await audit(admin, user.id, 'update_plan_config', { plan: body.plan, price, clientLimit: limit })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'create_coupon') {
      const code = String(body.code ?? '').trim().toUpperCase()
      const discount = Number(body.discountPercent)
      const duration = Number(body.durationDays)
      if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isInteger(discount) || discount < 1 || discount > 100 || !Number.isInteger(duration) || duration < 1 || duration > 365) return NextResponse.json({ error: 'Dados do cupom invalidos.' }, { status: 400 })
      const { error } = await admin.from('admin_coupons').insert({ code, discount_percent: discount, duration_days: duration, max_redemptions: body.maxRedemptions ?? null, expires_at: body.expiresAt || null, created_by: user.id })
      if (error) throw error
      await audit(admin, user.id, 'create_coupon', { code, discount, duration })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'bulk_trial') {
      const days = Number(body.trialDays)
      if (!Number.isInteger(days) || days < 1 || days > 365 || (body.targetPlan && !PLANS.includes(body.targetPlan))) return NextResponse.json({ error: 'Extensao de teste invalida.' }, { status: 400 })
      const now = new Date()
      const { data: rows, error: loadError } = await admin.from('perfis_barbearia').select('id,data_vencimento,role,plano')
      if (loadError) throw loadError
      const eligibleRows = (rows ?? []).filter((row) => row.role !== 'admin' && (!body.targetPlan || row.plano === body.targetPlan))
      const updates = eligibleRows.map((row) => {
        const expiry = row.data_vencimento ? new Date(row.data_vencimento) : now
        const base = expiry > now ? expiry : now
        return admin.from('perfis_barbearia').update({ data_vencimento: new Date(base.getTime() + days * 86_400_000).toISOString(), acesso_bloqueado: false }).eq('id', row.id)
      })
      const results = await Promise.all(updates)
      const updateError = results.find((result) => result.error)?.error
      if (updateError) throw updateError
      await audit(admin, user.id, 'bulk_extend_trial', { days, targetPlan: body.targetPlan ?? 'all', accounts: eligibleRows.length })
      return NextResponse.json({ success: true, affected: eligibleRows.length })
    }

    if (body.action === 'publish_broadcast') {
      const title = String(body.title ?? '').trim()
      const message = String(body.message ?? '').trim()
      if (title.length < 3 || title.length > 100 || message.length < 3 || message.length > 1000 || !KINDS.includes(body.kind ?? '') || !DISPLAY_MODES.includes(body.displayMode ?? 'banner') || (body.targetPlan && !PLANS.includes(body.targetPlan))) return NextResponse.json({ error: 'Comunicado invalido.' }, { status: 400 })
      const { data, error } = await admin.from('admin_broadcasts').insert({ title, message, kind: body.kind, target_plan: body.targetPlan || null, display_mode: body.displayMode ?? 'banner', status: 'published', published_at: new Date().toISOString(), expires_at: body.expiresAt || null, created_by: user.id }).select('id').single()
      if (error) throw error
      await audit(admin, user.id, 'publish_broadcast', { broadcastId: data.id, title, targetPlan: body.targetPlan ?? 'all', displayMode: body.displayMode ?? 'banner' })
      return NextResponse.json({ success: true, id: data.id })
    }

    if (body.action === 'archive_broadcast' && /^[0-9a-f-]{36}$/i.test(body.broadcastId ?? '')) {
      const { error } = await admin.from('admin_broadcasts').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', body.broadcastId)
      if (error) throw error
      await audit(admin, user.id, 'archive_broadcast', { broadcastId: body.broadcastId })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acao invalida.' }, { status: 400 })
  } catch (error) {
    console.error('[admin-enterprise] request failed', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: getAdminErrorMessage(error) }, { status: getAdminErrorStatus(error) })
  }
}

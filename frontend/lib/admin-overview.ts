import 'server-only'

import { requireSuperAdmin } from '@/lib/admin'

export type Plan = 'starter' | 'pro' | 'scale'
export type BillingHealth = 'healthy' | 'due_soon' | 'overdue' | 'blocked'

export type AdminShop = {
  id: string
  name: string
  email: string
  phone: string | null
  plan: Plan
  createdAt: string
  expiresAt: string | null
  courtesyUntil: string | null
  blocked: boolean
  active: boolean
  billingHealth: BillingHealth
  daysToExpiry: number | null
}

export type RevenuePoint = { label: string; mrr: number; churn: number }
export type AdminSupportTicket = { id: string; userId: string; shopName: string; email: string | null; message: string; category: string; status: string; createdAt: string }
export type AdminAuditLog = { id: string; adminId: string; adminEmail: string; targetUserId: string | null; targetName: string | null; action: string; metadata: Record<string, unknown>; createdAt: string }

export type AdminOverview = {
  metrics: {
    estimatedMrr: number
    activeSubscriptions: number
    byPlan: Record<Plan, number>
    openSupportTickets: number
  }
  revenueHistory: RevenuePoint[]
  shops: AdminShop[]
  supportTickets: AdminSupportTicket[]
  auditLogs: AdminAuditLog[]
}

type ProfileRow = {
  id: string
  nome_estabelecimento: string | null
  telefone_whatsapp: string | null
  plano: string | null
  created_at: string
  data_vencimento: string | null
  cortesia_ate: string | null
  acesso_bloqueado: boolean | null
}

type TicketRow = { id: string; user_id: string; barbearia_nome: string; user_email: string | null; mensagem: string; categoria: string; status: string; created_at: string }
type AuditRow = { id: string; admin_id: string; target_user_id: string | null; action: string; metadata: Record<string, unknown>; created_at: string }

const PLAN_PRICES: Record<Plan, number> = { starter: 47, pro: 97, scale: 197 }
const DAY_MS = 86_400_000

function normalizePlan(value: string | null): Plan {
  const plan = String(value ?? 'starter').trim().toLowerCase()
  return plan === 'pro' || plan === 'scale' ? plan : 'starter'
}

function effectiveExpiry(row: ProfileRow) {
  const expiry = row.data_vencimento ? new Date(row.data_vencimento).getTime() : Number.POSITIVE_INFINITY
  const courtesy = row.cortesia_ate ? new Date(row.cortesia_ate).getTime() : 0
  return Math.max(Number.isNaN(expiry) ? 0 : expiry, Number.isNaN(courtesy) ? 0 : courtesy)
}

function billingState(row: ProfileRow): Pick<AdminShop, 'active' | 'billingHealth' | 'daysToExpiry'> {
  if (row.acesso_bloqueado) return { active: false, billingHealth: 'blocked', daysToExpiry: null }
  const expiry = effectiveExpiry(row)
  if (!Number.isFinite(expiry)) return { active: true, billingHealth: 'healthy', daysToExpiry: null }
  const daysToExpiry = Math.ceil((expiry - Date.now()) / DAY_MS)
  if (daysToExpiry < 0) return { active: false, billingHealth: 'overdue', daysToExpiry }
  if (daysToExpiry <= 7) return { active: true, billingHealth: 'due_soon', daysToExpiry }
  return { active: true, billingHealth: 'healthy', daysToExpiry }
}

function buildRevenueHistory(profiles: ProfileRow[]): RevenuePoint[] {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const offset = index - 5
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)
    const monthEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 1) - 1
    const active = profiles.filter((profile) => {
      const created = new Date(profile.created_at).getTime()
      return created <= monthEnd && effectiveExpiry(profile) >= monthStart
    })
    const churn = profiles.filter((profile) => {
      if (!profile.data_vencimento) return false
      const expiry = new Date(profile.data_vencimento).getTime()
      return expiry >= monthStart && expiry <= monthEnd && expiry < Date.now()
    }).length
    return {
      label: formatter.format(new Date(monthStart)).replace('.', ''),
      mrr: active.reduce((sum, profile) => sum + PLAN_PRICES[normalizePlan(profile.plano)], 0),
      churn,
    }
  })
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { admin } = await requireSuperAdmin()
  const [{ data: profiles, error: profileError }, usersResult, { data: ticketRows, error: ticketError }, { data: auditRows, error: auditError }] = await Promise.all([
    admin.from('perfis_barbearia').select('id,nome_estabelecimento,telefone_whatsapp,plano,created_at,data_vencimento,cortesia_ate,acesso_bloqueado').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('support_tickets').select('id,user_id,barbearia_nome,user_email,mensagem,categoria,status,created_at').order('created_at', { ascending: false }).limit(50),
    admin.from('admin_audit_log').select('id,admin_id,target_user_id,action,metadata,created_at').order('created_at', { ascending: false }).limit(100),
  ])

  if (profileError) throw new Error('Nao foi possivel carregar as barbearias.')
  if (usersResult.error) throw new Error('Nao foi possivel carregar os usuarios.')
  if (ticketError) throw new Error('Nao foi possivel carregar os chamados de suporte.')
  if (auditError) throw new Error('Nao foi possivel carregar os logs de auditoria.')

  const profileRows = (profiles ?? []) as ProfileRow[]
  const emails = new Map(usersResult.data.users.map((user) => [user.id, user.email ?? 'Email nao informado']))
  const shops = profileRows.map<AdminShop>((profile) => ({
    id: profile.id,
    name: profile.nome_estabelecimento?.trim() || 'Barbearia sem nome',
    email: emails.get(profile.id) ?? 'Email nao informado',
    phone: profile.telefone_whatsapp?.trim() || null,
    plan: normalizePlan(profile.plano),
    createdAt: profile.created_at,
    expiresAt: profile.data_vencimento,
    courtesyUntil: profile.cortesia_ate,
    blocked: profile.acesso_bloqueado === true,
    ...billingState(profile),
  }))
  const supportTickets = ((ticketRows ?? []) as TicketRow[]).map<AdminSupportTicket>((ticket) => ({
    id: ticket.id, userId: ticket.user_id, shopName: ticket.barbearia_nome, email: ticket.user_email,
    message: ticket.mensagem, category: ticket.categoria, status: ticket.status, createdAt: ticket.created_at,
  }))
  const shopNames = new Map(shops.map((shop) => [shop.id, shop.name]))
  const auditLogs = ((auditRows ?? []) as AuditRow[]).map<AdminAuditLog>((log) => ({
    id: log.id,
    adminId: log.admin_id,
    adminEmail: emails.get(log.admin_id) ?? 'Admin',
    targetUserId: log.target_user_id,
    targetName: log.target_user_id ? shopNames.get(log.target_user_id) ?? 'Conta removida' : null,
    action: log.action,
    metadata: log.metadata ?? {},
    createdAt: log.created_at,
  }))

  const activeShops = shops.filter((shop) => shop.active)
  const byPlan = activeShops.reduce<Record<Plan, number>>((counts, shop) => ({ ...counts, [shop.plan]: counts[shop.plan] + 1 }), { starter: 0, pro: 0, scale: 0 })

  return {
    metrics: {
      estimatedMrr: Object.entries(byPlan).reduce((total, [plan, count]) => total + PLAN_PRICES[plan as Plan] * count, 0),
      activeSubscriptions: activeShops.length,
      byPlan,
      openSupportTickets: supportTickets.filter((ticket) => ticket.status === 'aberto' || ticket.status === 'em_atendimento').length,
    },
    revenueHistory: buildRevenueHistory(profileRows),
    shops,
    supportTickets,
    auditLogs,
  }
}

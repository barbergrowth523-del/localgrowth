import 'server-only'

import { requireSuperAdmin } from '@/lib/admin'

export type AdminShop = {
  id: string
  name: string
  email: string
  plan: 'starter' | 'pro' | 'scale'
  createdAt: string
  expiresAt: string | null
  courtesyUntil: string | null
  blocked: boolean
  active: boolean
}

export type AdminSupportTicket = {
  id: string
  userId: string
  shopName: string
  email: string | null
  message: string
  category: string
  status: string
  createdAt: string
}

export type AdminOverview = {
  metrics: {
    estimatedMrr: number
    activeSubscriptions: number
    byPlan: Record<'starter' | 'pro' | 'scale', number>
    openSupportTickets: number
  }
  shops: AdminShop[]
  supportTickets: AdminSupportTicket[]
}

type ProfileRow = {
  id: string
  nome_estabelecimento: string | null
  plano: string | null
  created_at: string
  data_vencimento: string | null
  cortesia_ate: string | null
  acesso_bloqueado: boolean | null
}

type TicketRow = {
  id: string
  user_id: string
  barbearia_nome: string
  user_email: string | null
  mensagem: string
  categoria: string
  status: string
  created_at: string
}

const PLAN_PRICES = { starter: 47, pro: 97, scale: 197 } as const

function normalizePlan(value: string | null): AdminShop['plan'] {
  const plan = String(value ?? 'starter').trim().toLowerCase()
  return plan === 'pro' || plan === 'scale' ? plan : 'starter'
}

function isCurrent(row: ProfileRow) {
  if (row.acesso_bloqueado) return false
  const now = Date.now()
  const expiry = row.data_vencimento ? new Date(row.data_vencimento).getTime() : Number.POSITIVE_INFINITY
  const courtesy = row.cortesia_ate ? new Date(row.cortesia_ate).getTime() : 0
  return Math.max(expiry, courtesy) >= now
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { admin } = await requireSuperAdmin()
  const [{ data: profiles, error: profileError }, usersResult, { data: ticketRows, error: ticketError }] = await Promise.all([
    admin.from('perfis_barbearia').select('id,nome_estabelecimento,plano,created_at,data_vencimento,cortesia_ate,acesso_bloqueado').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('support_tickets').select('id,user_id,barbearia_nome,user_email,mensagem,categoria,status,created_at').order('created_at', { ascending: false }).limit(50),
  ])

  if (profileError) throw new Error('Nao foi possivel carregar as barbearias.')
  if (usersResult.error) throw new Error('Nao foi possivel carregar os usuarios.')
  if (ticketError) throw new Error('Nao foi possivel carregar os chamados de suporte.')

  const emails = new Map(usersResult.data.users.map((user) => [user.id, user.email ?? 'Email nao informado']))
  const shops = ((profiles ?? []) as ProfileRow[]).map<AdminShop>((profile) => ({
    id: profile.id,
    name: profile.nome_estabelecimento?.trim() || 'Barbearia sem nome',
    email: emails.get(profile.id) ?? 'Email nao informado',
    plan: normalizePlan(profile.plano),
    createdAt: profile.created_at,
    expiresAt: profile.data_vencimento,
    courtesyUntil: profile.cortesia_ate,
    blocked: profile.acesso_bloqueado === true,
    active: isCurrent(profile),
  }))
  const supportTickets = ((ticketRows ?? []) as TicketRow[]).map<AdminSupportTicket>((ticket) => ({
    id: ticket.id,
    userId: ticket.user_id,
    shopName: ticket.barbearia_nome,
    email: ticket.user_email,
    message: ticket.mensagem,
    category: ticket.categoria,
    status: ticket.status,
    createdAt: ticket.created_at,
  }))

  const activeShops = shops.filter((shop) => shop.active)
  const byPlan = activeShops.reduce<Record<AdminShop['plan'], number>>((counts, shop) => ({ ...counts, [shop.plan]: counts[shop.plan] + 1 }), { starter: 0, pro: 0, scale: 0 })

  return {
    metrics: {
      estimatedMrr: Object.entries(byPlan).reduce((total, [plan, count]) => total + PLAN_PRICES[plan as AdminShop['plan']] * count, 0),
      activeSubscriptions: activeShops.length,
      byPlan,
      openSupportTickets: supportTickets.filter((ticket) => ticket.status === 'aberto' || ticket.status === 'em_atendimento').length,
    },
    shops,
    supportTickets,
  }
}

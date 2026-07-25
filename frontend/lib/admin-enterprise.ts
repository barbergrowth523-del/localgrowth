import 'server-only'

import { requireSuperAdmin } from '@/lib/admin'

export type HealthStatus = 'healthy' | 'risk' | 'inactive'
export type CustomerHealth = {
  id: string
  name: string
  email: string
  plan: string
  score: number
  status: HealthStatus
  loginCount30d: number
  clientCount: number
  whatsappCount30d: number
  lastLoginAt: string | null
  aiTokens30d: number
  aiCost30d: number
  planMrr: number
}
export type ForecastPoint = { month: string; mrr: number; projected: boolean }
export type AnalyticsOverview = {
  currentMrr: number
  conversionRate: number
  monthlyNetGrowth: number
  projectedMrr12m: number
  forecast: ForecastPoint[]
  health: CustomerHealth[]
  healthTotals: Record<HealthStatus, number>
  planPrices: Record<string, number>
}

type ProfileRow = { id: string; nome_estabelecimento: string | null; plano: string | null; data_vencimento: string | null; acesso_bloqueado: boolean | null; created_at: string }
type PlanRow = { plan: string; price_monthly: number }
type ActivityRow = { user_id: string; event_type: string; created_at: string }
type IdRow = { user_id: string | null; barbearia_id?: string | null }
type AiUsageRow = { user_id: string; input_tokens: number; output_tokens: number; estimated_cost_brl: number }

const DAY = 86_400_000

function healthStatus(score: number): HealthStatus {
  if (score >= 70) return 'healthy'
  if (score >= 35) return 'risk'
  return 'inactive'
}

function loginPoints(count: number, lastLoginAt: string | null) {
  if (count >= 8) return 35
  if (count >= 3) return 25
  if (count >= 1) return 15
  if (!lastLoginAt) return 0
  const days = Math.floor((Date.now() - new Date(lastLoginAt).getTime()) / DAY)
  return days <= 7 ? 20 : days <= 30 ? 10 : 0
}

function volumePoints(count: number, levels: [number, number, number], points: [number, number, number]) {
  if (count >= levels[2]) return points[2]
  if (count >= levels[1]) return points[1]
  if (count >= levels[0]) return points[0]
  return 0
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { admin } = await requireSuperAdmin()
  const since30 = new Date(Date.now() - 30 * DAY).toISOString()
  const since90 = new Date(Date.now() - 90 * DAY).toISOString()
  const [profilesResult, plansResult, clientsResult, sendsResult, activityResult, usersResult, aiUsageResult] = await Promise.all([
    admin.from('perfis_barbearia').select('id,nome_estabelecimento,plano,data_vencimento,acesso_bloqueado,created_at'),
    admin.from('admin_plan_configs').select('plan,price_monthly').eq('active', true),
    admin.from('clientes').select('user_id'),
    admin.from('historico_disparos').select('barbearia_id').gte('enviado_em', since30),
    admin.from('account_activity_events').select('user_id,event_type,created_at').gte('created_at', since30),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('ai_usage_events').select('user_id,input_tokens,output_tokens,estimated_cost_brl').gte('created_at', since30),
  ])
  const firstError = profilesResult.error ?? plansResult.error ?? clientsResult.error ?? sendsResult.error ?? activityResult.error ?? usersResult.error ?? aiUsageResult.error
  if (firstError) throw new Error('Nao foi possivel calcular a inteligencia operacional.')

  const profiles = (profilesResult.data ?? []) as ProfileRow[]
  const planPrices = new Map(((plansResult.data ?? []) as PlanRow[]).map((row) => [row.plan, Number(row.price_monthly)]))
  const clientCounts = new Map<string, number>()
  for (const row of (clientsResult.data ?? []) as IdRow[]) if (row.user_id) clientCounts.set(row.user_id, (clientCounts.get(row.user_id) ?? 0) + 1)
  const sendCounts = new Map<string, number>()
  for (const row of (sendsResult.data ?? []) as IdRow[]) if (row.barbearia_id) sendCounts.set(row.barbearia_id, (sendCounts.get(row.barbearia_id) ?? 0) + 1)
  const loginCounts = new Map<string, number>()
  for (const row of (activityResult.data ?? []) as ActivityRow[]) if (row.event_type === 'login') loginCounts.set(row.user_id, (loginCounts.get(row.user_id) ?? 0) + 1)
  const aiUsage = new Map<string, { tokens: number; cost: number }>()
  for (const row of (aiUsageResult.data ?? []) as AiUsageRow[]) {
    const current = aiUsage.get(row.user_id) ?? { tokens: 0, cost: 0 }
    aiUsage.set(row.user_id, { tokens: current.tokens + Number(row.input_tokens) + Number(row.output_tokens), cost: current.cost + Number(row.estimated_cost_brl) })
  }  const users = new Map(usersResult.data.users.map((user) => [user.id, user]))

  const health = profiles.filter((profile) => users.get(profile.id)?.email !== 'barbergrowth523@gmail.com').map<CustomerHealth>((profile) => {
    const user = users.get(profile.id)
    const loginCount30d = loginCounts.get(profile.id) ?? 0
    const clientCount = clientCounts.get(profile.id) ?? 0
    const whatsappCount30d = sendCounts.get(profile.id) ?? 0
    const score = Math.min(100, loginPoints(loginCount30d, user?.last_sign_in_at ?? null) + volumePoints(clientCount, [5, 30, 100], [15, 25, 35]) + volumePoints(whatsappCount30d, [1, 5, 20], [10, 20, 30]))
    const plan = String(profile.plano ?? 'starter').toLowerCase()
    const usage = aiUsage.get(profile.id) ?? { tokens: 0, cost: 0 }
    return { id: profile.id, name: profile.nome_estabelecimento?.trim() || 'Barbearia sem nome', email: user?.email ?? 'Email nao informado', plan, score, status: healthStatus(score), loginCount30d, clientCount, whatsappCount30d, lastLoginAt: user?.last_sign_in_at ?? null, aiTokens30d: usage.tokens, aiCost30d: usage.cost, planMrr: planPrices.get(plan) ?? 0 }
  }).sort((a, b) => a.score - b.score)

  const now = Date.now()
  const paidProfiles = profiles.filter((profile) => !profile.acesso_bloqueado && planPrices.has(String(profile.plano).toLowerCase()) && (!profile.data_vencimento || new Date(profile.data_vencimento).getTime() >= now))
  const currentMrr = paidProfiles.reduce((sum, profile) => sum + (planPrices.get(String(profile.plano).toLowerCase()) ?? 0), 0)
  const conversionRate = profiles.length ? paidProfiles.length / profiles.length : 0
  const newAccounts90d = profiles.filter((profile) => new Date(profile.created_at).getTime() >= new Date(since90).getTime()).length
  const expired90d = profiles.filter((profile) => profile.data_vencimento && new Date(profile.data_vencimento).getTime() >= new Date(since90).getTime() && new Date(profile.data_vencimento).getTime() < now).length
  const averageTicket = paidProfiles.length ? currentMrr / paidProfiles.length : 97
  const monthlyAcquisition = newAccounts90d / 3
  const monthlyChurn = paidProfiles.length ? Math.min(0.3, expired90d / paidProfiles.length / 3) : 0
  const monthlyNetGrowth = monthlyAcquisition * conversionRate * averageTicket - currentMrr * monthlyChurn
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
  const forecast = Array.from({ length: 13 }, (_, index) => {
    const value = Math.max(0, currentMrr + monthlyNetGrowth * index)
    return { month: formatter.format(new Date(new Date().getFullYear(), new Date().getMonth() + index, 1)).replace('.', ''), mrr: Math.round(value), projected: index > 0 }
  })
  const healthTotals = health.reduce<Record<HealthStatus, number>>((totals, item) => ({ ...totals, [item.status]: totals[item.status] + 1 }), { healthy: 0, risk: 0, inactive: 0 })
  return { currentMrr, conversionRate, monthlyNetGrowth, projectedMrr12m: forecast[12].mrr, forecast, health, healthTotals, planPrices: Object.fromEntries(planPrices) }
}

export async function getPlansOverview() {
  const { admin } = await requireSuperAdmin()
  const [plans, coupons] = await Promise.all([
    admin.from('admin_plan_configs').select('*').order('price_monthly'),
    admin.from('admin_coupons').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  if (plans.error || coupons.error) throw new Error('Nao foi possivel carregar planos e cupons.')
  return { plans: plans.data ?? [], coupons: coupons.data ?? [] }
}

export async function getBroadcastOverview() {
  const { admin } = await requireSuperAdmin()
  const { data, error } = await admin.from('admin_broadcasts').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw new Error('Nao foi possivel carregar os comunicados.')
  return data ?? []
}

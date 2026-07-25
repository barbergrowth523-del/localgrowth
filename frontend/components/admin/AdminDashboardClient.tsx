'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle, Ban, Building2, CalendarPlus, CircleDollarSign, ExternalLink,
  Headphones, History, MessageCircle, RefreshCw, Search, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react'
import { AdminRevenueChart, type RevenuePoint } from '@/components/admin/AdminRevenueChart'

type Plan = 'starter' | 'pro' | 'scale'
type BillingHealth = 'healthy' | 'due_soon' | 'overdue' | 'blocked'
type ShopFilter = 'all' | 'active' | 'overdue' | 'scale' | 'pro'
type AdminShop = {
  id: string; name: string; email: string; phone: string | null; plan: Plan; createdAt: string;
  expiresAt: string | null; courtesyUntil: string | null; blocked: boolean; active: boolean;
  billingHealth: BillingHealth; daysToExpiry: number | null
}
type AdminSupportTicket = { id: string; userId: string; shopName: string; email: string | null; message: string; category: string; status: string; createdAt: string }
type AdminAuditLog = { id: string; adminId: string; adminEmail: string; targetUserId: string | null; targetName: string | null; action: string; metadata: Record<string, unknown>; createdAt: string }
type AdminOverview = {
  metrics: { estimatedMrr: number; activeSubscriptions: number; byPlan: Record<Plan, number>; openSupportTickets: number }
  revenueHistory: RevenuePoint[]
  shops: AdminShop[]
  supportTickets: AdminSupportTicket[]
  auditLogs: AdminAuditLog[]
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const date = new Intl.DateTimeFormat('pt-BR')
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
const FILTERS: Array<{ id: ShopFilter; label: string }> = [
  { id: 'all', label: 'Todas' }, { id: 'active', label: 'Ativas' }, { id: 'overdue', label: 'Inadimplentes' },
  { id: 'scale', label: 'Plano Scale' }, { id: 'pro', label: 'Plano Pro' },
]

function formatDate(value: string | null) {
  if (!value) return 'Sem vencimento'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : date.format(parsed)
}

function planLabel(plan: Plan) { return plan.charAt(0).toUpperCase() + plan.slice(1) }
function cleanPhone(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? ''
  if (!digits) return ''
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
}

function billingLabel(shop: AdminShop) {
  if (shop.blocked) return 'Bloqueado'
  if (shop.billingHealth === 'overdue') return 'Inadimplente'
  if (shop.billingHealth === 'due_soon') return shop.daysToExpiry === 0 ? 'Vence hoje' : `Vence em ${shop.daysToExpiry} dias`
  return 'Ativo'
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    block_access: 'Acesso bloqueado',
    unblock_access: 'Acesso liberado',
    grant_courtesy: 'Cortesia concedida',
    impersonate_preview_opened: 'Modo lojista acessado',
    change_plan: 'Plano alterado',
    update_support_status: 'Chamado atualizado',
  }
  return labels[action] ?? action.replaceAll('_', ' ')
}

function auditDetail(log: AdminAuditLog) {
  const metadata = log.metadata
  if (log.action === 'change_plan') {
    return `${String(metadata.previousPlan ?? 'nao informado')} -> ${String(metadata.newPlan ?? 'nao informado')}`
  }
  if (log.action === 'update_support_status') {
    const ticketId = String(metadata.ticketId ?? '').slice(0, 8)
    return `Chamado #${ticketId}: ${String(metadata.previousStatus ?? 'nao informado')} -> ${String(metadata.newStatus ?? 'nao informado')}`
  }
  if (log.action === 'grant_courtesy') return `${String(metadata.days ?? 0)} dias adicionados`
  if (log.action === 'impersonate_preview_opened') return 'Visualizacao administrativa em modo somente leitura'
  return log.action === 'block_access' ? 'A conta perdeu acesso ao painel' : 'Acesso administrativo registrado'
}
export function AdminDashboardClient({ initialOverview }: { initialOverview: AdminOverview }) {
  const [overview, setOverview] = useState(initialOverview)
  const [pending, setPending] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ShopFilter>('all')
  const [operationsTab, setOperationsTab] = useState<'support' | 'audit'>('support')
  const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({})

  const filteredShops = useMemo(() => {
    const term = search.trim().toLowerCase()
    return overview.shops.filter((shop) => {
      const matchesSearch = !term || shop.name.toLowerCase().includes(term) || shop.email.toLowerCase().includes(term)
      const matchesFilter = filter === 'all'
        || (filter === 'active' && shop.active && shop.billingHealth === 'healthy')
        || (filter === 'overdue' && (shop.billingHealth === 'overdue' || shop.billingHealth === 'due_soon'))
        || (filter === 'scale' && shop.plan === 'scale')
        || (filter === 'pro' && shop.plan === 'pro')
      return matchesSearch && matchesFilter
    })
  }, [filter, overview.shops, search])

  async function sendAction(payload: Record<string, unknown>) {
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json() as { error?: string; blocked?: boolean; courtesyUntil?: string; previewUrl?: string }
    if (!response.ok) throw new Error(data.error ?? 'Acao administrativa nao concluida.')
    return data
  }

  async function refreshOverview() {
    const response = await fetch('/api/admin', { cache: 'no-store' })
    const data = await response.json() as AdminOverview & { error?: string }
    if (!response.ok) throw new Error(data.error ?? 'Nao foi possivel atualizar o painel.')
    setOverview(data)
  }

  async function toggleBlock(shop: AdminShop) {
    setPending(`block:${shop.id}`); setNotice('')
    try {
      const result = await sendAction({ action: 'block', userId: shop.id, blocked: !shop.blocked })
      await refreshOverview()
      setNotice(result.blocked ? 'Acesso bloqueado com sucesso.' : 'Acesso liberado com sucesso.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao alterar acesso.') } finally { setPending('') }
  }

  async function grantCourtesy(shop: AdminShop) {
    setPending(`courtesy:${shop.id}`); setNotice('')
    try {
      await sendAction({ action: 'courtesy', userId: shop.id, days: 7 })
      await refreshOverview(); setNotice('Sete dias de cortesia adicionados.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao conceder cortesia.') } finally { setPending('') }
  }

  async function impersonate(shop: AdminShop) {
    if (!window.confirm(`Entrar temporariamente como ${shop.name}? Esta acao sera auditada.`)) return
    setPending(`impersonate:${shop.id}`); setNotice('')
    try {
      const result = await sendAction({ action: 'impersonate', userId: shop.id })
      if (!result.previewUrl) throw new Error('Modo de visualizacao nao recebido.')
      window.open(result.previewUrl, '_blank', 'noopener,noreferrer'); setNotice('Modo lojista aberto em uma nova aba.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao entrar como lojista.') } finally { setPending('') }
  }

  async function changePlan(shop: AdminShop, plan: Plan) {
    if (plan === shop.plan) return
    setPending(`plan:${shop.id}`); setNotice('')
    try {
      await sendAction({ action: 'change_plan', userId: shop.id, plan })
      await refreshOverview(); setNotice(`Plano de ${shop.name} alterado para ${planLabel(plan)}.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao alterar o plano.') } finally { setPending('') }
  }

  async function updateTicketStatus(ticket: AdminSupportTicket, status: 'aberto' | 'em_atendimento' | 'fechado') {
    if (status === ticket.status) return
    setPending(`ticket:${ticket.id}`); setNotice('')
    try {
      await sendAction({ action: 'support_status', userId: ticket.userId, ticketId: ticket.id, status })
      await refreshOverview(); setNotice('Status do chamado atualizado e registrado na auditoria.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao atualizar o chamado.') } finally { setPending('') }
  }

  async function suggestTicketReply(ticket: AdminSupportTicket) {
    setPending(`ai:${ticket.id}`); setNotice('')
    try {
      const response = await fetch('/api/admin/ai/suggest-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: ticket.id }) })
      const data = await response.json() as { draft?: string; error?: string }
      if (!response.ok || !data.draft) throw new Error(data.error ?? 'Nao foi possivel gerar o rascunho.')
      setAiDrafts((current) => ({ ...current, [ticket.id]: data.draft! }))
      setNotice('Rascunho de IA gerado. Revise antes de enviar ao lojista.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Erro ao gerar rascunho.') } finally { setPending('') }
  }
  function chargeOnWhatsApp(shop: AdminShop) {
    const phone = cleanPhone(shop.phone)
    if (!phone) return
    const urgency = shop.billingHealth === 'overdue' ? 'identificamos uma pendencia na sua assinatura' : 'sua assinatura esta proxima do vencimento'
    const message = `Ola! Aqui e do suporte Prontusfy. ${shop.name}, ${urgency}. Regularize seu acesso para manter todos os recursos ativos. Acesse a area de Assinatura ou responda esta mensagem se precisar de ajuda.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Ambiente restrito</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Dashboard Super Admin</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Visao global de receita, assinaturas e operacao das barbearias Prontusfy.</p>
        </div>
        <button type="button" onClick={() => void refreshOverview()} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400 transition hover:border-emerald-500/30 hover:text-emerald-300"><RefreshCw className="h-4 w-4 text-emerald-400" /> Atualizar dados</button>
      </div>

      {notice && <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CircleDollarSign />} label="MRR estimado" value={currency.format(overview.metrics.estimatedMrr)} helper="Baseado nos planos ativos" />
        <MetricCard icon={<Sparkles />} label="Assinaturas ativas" value={String(overview.metrics.activeSubscriptions)} helper={`${overview.shops.length} barbearias cadastradas`} />
        <MetricCard icon={<UsersRound />} label="Plano Pro" value={String(overview.metrics.byPlan.pro)} helper={`${overview.metrics.byPlan.starter} Starter`} />
        <MetricCard icon={<Building2 />} label="Plano Scale" value={String(overview.metrics.byPlan.scale)} helper={`${overview.metrics.openSupportTickets} chamados abertos`} />
      </section>

      <AdminRevenueChart points={overview.revenueHistory} />

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
        <div className="border-b border-slate-800 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div><h2 className="text-lg font-bold text-white">Barbearias cadastradas</h2><p className="mt-1 text-xs text-slate-500">Busca global, saude financeira e acoes rapidas.</p></div>
            <div className="relative w-full xl:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === item.id ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{item.label}</button>)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Barbearia</th><th className="px-5 py-3">Plano</th><th className="px-5 py-3">Cadastro</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Acoes rapidas</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {filteredShops.map((shop) => {
                const billingAlert = shop.billingHealth === 'overdue' || shop.billingHealth === 'due_soon'
                return <tr key={shop.id} className={`transition ${billingAlert ? 'bg-rose-950/25 hover:bg-rose-950/40' : 'hover:bg-slate-800/35'}`}>
                  <td className="px-5 py-4"><div className="flex items-start gap-3">{billingAlert && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}<div><p className="font-semibold text-white">{shop.name}</p><p className="mt-1 text-xs text-slate-500">{shop.email}</p>{shop.phone && <p className="mt-1 text-[11px] text-slate-600">{shop.phone}</p>}</div></div></td>
                  <td className="px-5 py-4"><select aria-label={`Alterar plano de ${shop.name}`} value={shop.plan} disabled={pending === `plan:${shop.id}`} onChange={(event) => void changePlan(shop, event.target.value as Plan)} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500"><option value="starter">Starter</option><option value="pro">Pro</option><option value="scale">Scale</option></select></td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatDate(shop.createdAt)}</td>
                  <td className="px-5 py-4"><p className={billingAlert ? 'font-semibold text-rose-300' : 'text-sm text-slate-300'}>{formatDate(shop.expiresAt)}</p>{shop.courtesyUntil && <p className="mt-1 text-xs text-amber-300">Cortesia ate {formatDate(shop.courtesyUntil)}</p>}</td>
                  <td className="px-5 py-4"><BillingBadge shop={shop} /></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">
                    {billingAlert && <ActionButton busy={false} disabled={!cleanPhone(shop.phone)} onClick={() => chargeOnWhatsApp(shop)} icon={<MessageCircle className="h-3.5 w-3.5" />} accent="whatsapp">Cobrar via WhatsApp</ActionButton>}
                    <ActionButton busy={pending === `block:${shop.id}`} danger={!shop.blocked} onClick={() => void toggleBlock(shop)} icon={<Ban className="h-3.5 w-3.5" />}>{shop.blocked ? 'Desbloquear' : 'Bloquear'}</ActionButton>
                    <ActionButton busy={pending === `courtesy:${shop.id}`} onClick={() => void grantCourtesy(shop)} icon={<CalendarPlus className="h-3.5 w-3.5" />}>+7 dias</ActionButton>
                    <ActionButton busy={pending === `impersonate:${shop.id}`} onClick={() => void impersonate(shop)} icon={<ExternalLink className="h-3.5 w-3.5" />}>Entrar como lojista</ActionButton>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        {!filteredShops.length && <div className="p-10 text-center text-sm text-slate-500">Nenhuma barbearia encontrada com estes filtros.</div>}
        <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">Exibindo {filteredShops.length} de {overview.shops.length} contas</div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Governanca e atendimento</h2>
            <p className="mt-1 text-xs text-slate-500">Gerencie chamados e acompanhe cada acao administrativa critica.</p>
          </div>
          <div role="tablist" aria-label="Governanca administrativa" className="flex w-fit rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button type="button" role="tab" aria-selected={operationsTab === 'support'} onClick={() => setOperationsTab('support')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${operationsTab === 'support' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-white'}`}><Headphones className="h-4 w-4" /> Mini-CRM <span className="rounded-full bg-amber-500/15 px-1.5 text-amber-300">{overview.metrics.openSupportTickets}</span></button>
            <button type="button" role="tab" aria-selected={operationsTab === 'audit'} onClick={() => setOperationsTab('audit')} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${operationsTab === 'audit' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-white'}`}><History className="h-4 w-4" /> Logs de Auditoria</button>
          </div>
        </div>

        {operationsTab === 'support' ? (
          <div className="divide-y divide-slate-800">
            {overview.supportTickets.map((ticket) => (
              <article key={ticket.id} className="grid gap-4 px-5 py-5 transition hover:bg-slate-800/30 lg:grid-cols-[minmax(190px,0.7fr)_minmax(0,2fr)_220px] lg:items-center">
                <div><p className="font-semibold text-white">{ticket.shopName}</p><p className="mt-1 text-xs text-slate-500">{ticket.email ?? 'Email nao informado'}</p><p className="mt-2 font-mono text-[10px] text-slate-600">#{ticket.id.slice(0, 8)}</p></div>
                <div><p className="text-sm leading-6 text-slate-300">{ticket.message}</p><p className="mt-2 text-[11px] text-slate-600">{date.format(new Date(ticket.createdAt))} | {ticket.category.replaceAll('_', ' ')}</p>{aiDrafts[ticket.id] && <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Rascunho sugerido por IA</p><p className="mt-1 text-sm leading-6 text-slate-200">{aiDrafts[ticket.id]}</p></div>}</div>
                <div className="space-y-3"><button type="button" disabled={pending === `ai:${ticket.id}`} onClick={() => void suggestTicketReply(ticket)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-60"><Sparkles className="h-4 w-4" />{pending === `ai:${ticket.id}` ? 'Gerando rascunho...' : 'Sugerir resposta com IA'}</button><label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status do chamado<select value={ticket.status === 'respondido' ? 'fechado' : ticket.status} disabled={pending === `ticket:${ticket.id}`} onChange={(event) => void updateTicketStatus(ticket, event.target.value as 'aberto' | 'em_atendimento' | 'fechado')} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-500"><option value="aberto">Aberto</option><option value="em_atendimento">Em atendimento</option><option value="fechado">Resolvido</option></select></label></div>
              </article>
            ))}
            {!overview.supportTickets.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhum chamado registrado.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Data e hora</th><th className="px-5 py-3">Acao</th><th className="px-5 py-3">Conta afetada</th><th className="px-5 py-3">Administrador</th><th className="px-5 py-3">Identificador</th></tr></thead>
              <tbody className="divide-y divide-slate-800">{overview.auditLogs.map((log) => <tr key={log.id} className="hover:bg-slate-800/30"><td className="px-5 py-4 text-sm text-slate-300">{dateTime.format(new Date(log.createdAt))}</td><td className="px-5 py-4"><p className="font-semibold text-white">{auditActionLabel(log.action)}</p><p className="mt-1 text-xs text-slate-500">{auditDetail(log)}</p></td><td className="px-5 py-4 text-sm text-slate-300">{log.targetName ?? 'Sistema'}</td><td className="px-5 py-4 text-xs text-slate-400">{log.adminEmail}</td><td className="px-5 py-4 font-mono text-[11px] text-emerald-400">#{log.id.slice(0, 8)}</td></tr>)}</tbody>
            </table>
            {!overview.auditLogs.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhuma acao administrativa registrada.</p>}
          </div>
        )}
      </section>
    </main>
  )
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">{icon}</span></div><p className="mt-4 text-3xl font-extrabold tracking-tight text-white">{value}</p><p className="mt-2 text-xs text-slate-500">{helper}</p></article>
}

function BillingBadge({ shop }: { shop: AdminShop }) {
  const style = shop.blocked ? 'bg-slate-700 text-slate-300' : shop.billingHealth === 'overdue' ? 'bg-rose-500/15 text-rose-300' : shop.billingHealth === 'due_soon' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'
  return <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}><span className={`h-1.5 w-1.5 rounded-full ${shop.billingHealth === 'overdue' ? 'bg-rose-400' : shop.billingHealth === 'due_soon' ? 'bg-amber-400' : shop.blocked ? 'bg-slate-400' : 'bg-emerald-400'}`} />{billingLabel(shop)}</span>
}

function ActionButton({ children, icon, busy, danger = false, disabled = false, accent = 'default', onClick }: { children: React.ReactNode; icon: React.ReactNode; busy: boolean; danger?: boolean; disabled?: boolean; accent?: 'default' | 'whatsapp'; onClick: () => void }) {
  const style = accent === 'whatsapp' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : danger ? 'border-rose-500/25 text-rose-300 hover:bg-rose-500/10' : 'border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200'
  return <button type="button" disabled={busy || disabled} title={disabled ? 'Telefone nao cadastrado' : undefined} onClick={onClick} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${style}`}>{busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}{children}</button>
}

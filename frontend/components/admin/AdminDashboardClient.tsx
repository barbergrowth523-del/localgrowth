'use client'

import { useState } from 'react'
import {
  Ban,
  Building2,
  CalendarPlus,
  CircleDollarSign,
  ExternalLink,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'

type Plan = 'starter' | 'pro' | 'scale'
type AdminShop = {
  id: string
  name: string
  email: string
  plan: Plan
  createdAt: string
  expiresAt: string | null
  courtesyUntil: string | null
  blocked: boolean
  active: boolean
}
type AdminSupportTicket = { id: string; userId: string; shopName: string; email: string | null; message: string; category: string; status: string; createdAt: string }
type AdminOverview = {
  metrics: {
    estimatedMrr: number
    activeSubscriptions: number
    byPlan: Record<Plan, number>
    openSupportTickets: number
  }
  shops: AdminShop[]
  supportTickets: AdminSupportTicket[]
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const date = new Intl.DateTimeFormat('pt-BR')

function formatDate(value: string | null) {
  if (!value) return 'Sem vencimento'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Data invalida' : date.format(parsed)
}

function planLabel(plan: Plan) {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function AdminDashboardClient({ initialOverview }: { initialOverview: AdminOverview }) {
  const [overview, setOverview] = useState(initialOverview)
  const [pending, setPending] = useState('')
  const [notice, setNotice] = useState('')

  const totalShops = overview.shops.length

  async function sendAction(payload: Record<string, unknown>) {
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json() as {
      error?: string
      blocked?: boolean
      courtesyUntil?: string
      previewUrl?: string
    }
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
    const key = `block:${shop.id}`
    setPending(key)
    setNotice('')
    try {
      const result = await sendAction({ action: 'block', userId: shop.id, blocked: !shop.blocked })
      setOverview((current) => ({
        ...current,
        shops: current.shops.map((item) => item.id === shop.id
          ? { ...item, blocked: Boolean(result.blocked), active: !result.blocked }
          : item),
      }))
      await refreshOverview()
      setNotice(result.blocked ? 'Acesso bloqueado com sucesso.' : 'Acesso liberado com sucesso.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao alterar acesso.')
    } finally {
      setPending('')
    }
  }

  async function grantCourtesy(shop: AdminShop) {
    const key = `courtesy:${shop.id}`
    setPending(key)
    setNotice('')
    try {
      const result = await sendAction({ action: 'courtesy', userId: shop.id, days: 7 })
      setOverview((current) => ({
        ...current,
        shops: current.shops.map((item) => item.id === shop.id
          ? {
              ...item,
              courtesyUntil: result.courtesyUntil ?? item.courtesyUntil,
              expiresAt: result.courtesyUntil ?? item.expiresAt,
              blocked: false,
              active: true,
            }
          : item),
      }))
      await refreshOverview()
      setNotice('Sete dias de cortesia adicionados.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao conceder cortesia.')
    } finally {
      setPending('')
    }
  }

  async function impersonate(shop: AdminShop) {
    if (!window.confirm(`Entrar temporariamente como ${shop.name}? Esta acao sera auditada.`)) return
    const key = `impersonate:${shop.id}`
    setPending(key)
    setNotice('')
    try {
      const result = await sendAction({ action: 'impersonate', userId: shop.id })
      if (!result.previewUrl) throw new Error('Modo de visualizacao nao recebido.')
      window.open(result.previewUrl, '_blank', 'noopener,noreferrer')
      setNotice('Modo lojista aberto em uma nova aba.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao entrar como lojista.')
    } finally {
      setPending('')
    }
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Ambiente restrito
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Dashboard Super Admin</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Visao global de receita, assinaturas e operacao das barbearias Prontusfy.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
          <RefreshCw className="h-4 w-4 text-emerald-400" /> Dados carregados em tempo real
        </div>
      </div>

      {notice && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CircleDollarSign />} label="MRR estimado" value={currency.format(overview.metrics.estimatedMrr)} helper="Baseado nos planos ativos" />
        <MetricCard icon={<Sparkles />} label="Assinaturas ativas" value={String(overview.metrics.activeSubscriptions)} helper={`${totalShops} barbearias cadastradas`} />
        <MetricCard icon={<UsersRound />} label="Plano Pro" value={String(overview.metrics.byPlan.pro)} helper={`${overview.metrics.byPlan.starter} Starter`} />
        <MetricCard icon={<Building2 />} label="Plano Scale" value={String(overview.metrics.byPlan.scale)} helper={`${overview.metrics.openSupportTickets} chamados abertos`} />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Barbearias cadastradas</h2>
            <p className="mt-1 text-xs text-slate-500">Gerencie plano, validade e acesso de cada conta.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{totalShops} contas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Barbearia</th>
                <th className="px-5 py-3 font-semibold">Plano</th>
                <th className="px-5 py-3 font-semibold">Cadastro</th>
                <th className="px-5 py-3 font-semibold">Vencimento</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Acoes rapidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {overview.shops.map((shop) => (
                <tr key={shop.id} className="transition hover:bg-slate-800/35">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{shop.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{shop.email}</p>
                  </td>
                  <td className="px-5 py-4"><PlanBadge plan={shop.plan} /></td>
                  <td className="px-5 py-4 text-sm text-slate-300">{formatDate(shop.createdAt)}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-300">{formatDate(shop.expiresAt)}</p>
                    {shop.courtesyUntil && <p className="mt-1 text-xs text-amber-300">Cortesia ate {formatDate(shop.courtesyUntil)}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      shop.blocked
                        ? 'bg-rose-500/10 text-rose-300'
                        : shop.active
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${shop.blocked ? 'bg-rose-400' : shop.active ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {shop.blocked ? 'Bloqueado' : shop.active ? 'Ativo' : 'Expirado'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        busy={pending === `block:${shop.id}`}
                        danger={!shop.blocked}
                        onClick={() => void toggleBlock(shop)}
                        icon={<Ban className="h-3.5 w-3.5" />}
                      >
                        {shop.blocked ? 'Desbloquear' : 'Bloquear'}
                      </ActionButton>
                      <ActionButton
                        busy={pending === `courtesy:${shop.id}`}
                        onClick={() => void grantCourtesy(shop)}
                        icon={<CalendarPlus className="h-3.5 w-3.5" />}
                      >
                        +7 dias
                      </ActionButton>
                      <ActionButton
                        busy={pending === `impersonate:${shop.id}`}
                        onClick={() => void impersonate(shop)}
                        icon={<ExternalLink className="h-3.5 w-3.5" />}
                      >
                        Entrar como lojista
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!overview.shops.length && (
          <div className="p-10 text-center text-sm text-slate-500">Nenhuma barbearia cadastrada.</div>
        )}
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Headphones className="h-5 w-5 text-emerald-400" /> Chamados de suporte</h2>
            <p className="mt-1 text-xs text-slate-500">Perguntas encaminhadas pelo assistente para atendimento humano.</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">{overview.metrics.openSupportTickets} abertos</span>
        </div>
        <div className="divide-y divide-slate-800">
          {overview.supportTickets.map((ticket) => (
            <article key={ticket.id} className="grid gap-3 px-5 py-4 transition hover:bg-slate-800/30 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,2fr)_auto] md:items-center">
              <div><p className="font-semibold text-white">{ticket.shopName}</p><p className="mt-1 text-xs text-slate-500">{ticket.email ?? 'Email nao informado'}</p></div>
              <div><p className="text-sm leading-6 text-slate-300">{ticket.message}</p><p className="mt-1 text-[11px] text-slate-600">{date.format(new Date(ticket.createdAt))} | {ticket.category.replaceAll('_', ' ')}</p></div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${ticket.status === 'aberto' ? 'bg-amber-500/10 text-amber-300' : ticket.status === 'respondido' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300'}`}>{ticket.status.replaceAll('_', ' ')}</span>
            </article>
          ))}
          {!overview.supportTickets.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhum chamado registrado.</p>}
        </div>
      </section>
    </main>
  )
}

function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </article>
  )
}

function PlanBadge({ plan }: { plan: Plan }) {
  const style = plan === 'scale'
    ? 'border-violet-500/25 bg-violet-500/10 text-violet-300'
    : plan === 'pro'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
      : 'border-slate-700 bg-slate-800 text-slate-300'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${style}`}>{planLabel(plan)}</span>
}

function ActionButton({
  children,
  icon,
  busy,
  danger = false,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  busy: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${
        danger
          ? 'border-rose-500/25 text-rose-300 hover:bg-rose-500/10'
          : 'border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200'
      }`}
    >
      {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

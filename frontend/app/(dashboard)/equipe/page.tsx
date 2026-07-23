'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Phone, Plus, Trash2, UserRound, UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ScalePaywall } from '@/components/ScalePaywall'

type TeamMember = {
  id: string
  nome: string
  telefone: string | null
  comissao_percentual: number
  email: string | null
  ativo: boolean
}
type Performance = { cortes: number; faturamento: number }


type TeamForm = {
  nome: string
  telefone: string
  email: string
  senha: string
  comissao: string
}

const emptyForm: TeamForm = {
  nome: '',
  telefone: '',
  email: '',
  senha: '',
  comissao: '50',
}

export default function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [performance, setPerformance] = useState<Record<string, Performance>>({})
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    void loadMembers()
    void loadPerformance()
  }, [])

  async function loadMembers() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Sua sessao expirou. Entre novamente.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('equipe')
      .select('id,nome,telefone,email,comissao_percentual,ativo')
      .eq('user_id', user.id)
      .order('nome')

    if (error) setStatus('Erro ao carregar equipe: ' + error.message)
    else setMembers((data ?? []) as TeamMember[])
    setLoading(false)
  }

async function loadPerformance() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [appointmentsResult, servicesResult] = await Promise.all([
      supabase.from('agendamentos').select('equipe_id,servico_id,status').eq('user_id', user.id),
      supabase.from('servicos').select('id,preco').eq('user_id', user.id),
    ])
    const prices = new Map((servicesResult.data ?? []).map((service) => [service.id, Number(service.preco)]))
    const performance = new Map((appointmentsResult.data ?? []).map((appointment) => [appointment.equipe_id, appointment]))
    return { prices, performance }
  }
  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const commission = Number(form.comissao.replace(',', '.'))

    if (!form.nome.trim() || !form.email.trim() || form.senha.length < 6 || !Number.isFinite(commission) || commission < 0 || commission > 100) {
      setStatus('Informe nome, email, senha com 6 caracteres e comissao entre 0 e 100.')
      return
    }

    setSaving(true)
    setStatus('')
    const response = await fetch('/api/equipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        comissao: commission,
      }),
    })
    const data = await response.json() as { error?: string }

    if (!response.ok) setStatus(data.error ?? 'Erro ao criar acesso do profissional.')
    else {
      setForm(emptyForm)
      setStatus('Profissional cadastrado com acesso liberado!')
      await loadMembers()
    }
    setSaving(false)
  }

  async function deleteMember(member: TeamMember) {
    if (!window.confirm('Apagar profissional ' + member.nome + '?')) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Sua sessao expirou. Entre novamente.')
      return
    }

    const { error } = await supabase
      .from('equipe')
      .delete()
      .eq('id', member.id)
      .eq('user_id', user.id)

    if (error) setStatus('Erro ao apagar profissional: ' + error.message)
    else {
      setMembers((current) => current.filter((item) => item.id !== member.id))
      setStatus('Profissional removido com sucesso!')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">Plano Scale</p>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
              <UsersRound className="h-8 w-8 shrink-0 text-emerald-400" />
              Minha Equipe
            </h1>
            <p className="mt-2 text-sm text-slate-400">Gerencie profissionais, telefones e comissoes da sua barbearia.</p>
          </div>
          <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">Profissionais</span>
        </header>

        {status && <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}

        <ScalePaywall>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-6">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400"><Plus className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-white">Adicionar profissional</h2>
                  <p className="mt-1 text-xs text-slate-500">Defina os dados e a comissao.</p>
                </div>
              </div>

              <form onSubmit={saveMember} className="space-y-4">
                <label className="block text-sm text-slate-300">Nome completo<input required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ex: Samuel Santos" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></label>
                <label className="block text-sm text-slate-300">Telefone<input type="tel" value={form.telefone} onChange={(event) => setForm({ ...form, telefone: event.target.value })} placeholder="(00) 00000-0000" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></label>
                <label className="block text-sm text-slate-300">Email de Acesso<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="profissional@email.com" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Senha<input required minLength={6} type="password" value={form.senha} onChange={(event) => setForm({ ...form, senha: event.target.value })} placeholder="Minimo de 6 caracteres" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Comissao (%)<input required min="0" max="100" step="0.01" type="number" value={form.comissao} onChange={(event) => setForm({ ...form, comissao: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-500" /></label>
                <button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? 'Salvando...' : 'Cadastrar profissional'}</button>
              </form>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-bold text-white">Profissionais cadastrados</h2>
                  <p className="mt-1 text-xs text-slate-500">Equipe vinculada a esta barbearia.</p>
                </div>
                <UsersRound className="h-5 w-5 shrink-0 text-emerald-400" />
              </div>

              {loading ? <p className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-500">Carregando equipe...</p> : members.length ? <div className="space-y-3">{members.map((member) => <article key={member.id} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold text-white">{member.nome}</p><p className="mt-1 truncate text-xs text-slate-500">{member.email || 'Email nao informado'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-emerald-400" />{member.telefone || 'Telefone nao informado'}</span><span className="text-emerald-300">Comissao de {Number(member.comissao_percentual).toFixed(0)}%</span><span>{member.ativo ? 'Ativo' : 'Inativo'}</span></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Cortes</p><p className="mt-1 text-sm font-bold text-white">{performance[member.id]?.cortes ?? 0}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Faturamento</p><p className="mt-1 text-sm font-bold text-emerald-300">R$ {(performance[member.id]?.faturamento ?? 0).toFixed(2).replace('.', ',')}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Comissao</p><p className="mt-1 text-sm font-bold text-white">R$ {((performance[member.id]?.faturamento ?? 0) * (Number(member.comissao_percentual) / 100)).toFixed(2).replace('.', ',')}</p></div></div></div><button type="button" onClick={() => void deleteMember(member)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 sm:w-auto"><Trash2 className="h-3.5 w-3.5" /> Apagar</button></article>)}</div> : <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950 p-8 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-400">Nenhum profissional cadastrado.</p></div>}
            </section>
          </div>
        </ScalePaywall>
      </div>
    </main>
  )
}

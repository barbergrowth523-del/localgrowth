'use client'

import { BarChart3, Scissors, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScalePaywall } from '@/components/ScalePaywall'

type Barber = { id: string; nome: string; comissao_percentual: number }
type Appointment = { equipe_id: string | null; servico_id: string | null; status: string }
type Service = { id: string; preco: number }

export default function RelatoriosPage() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); setLoading(false); return }
      const [barbersResult, appointmentsResult, servicesResult] = await Promise.all([
        supabase.from('equipe').select('id,nome,comissao_percentual').eq('user_id', user.id).order('nome'),
        supabase.from('agendamentos').select('equipe_id,servico_id,status').eq('user_id', user.id),
        supabase.from('servicos').select('id,preco').eq('user_id', user.id),
      ])
      const error = barbersResult.error ?? appointmentsResult.error ?? servicesResult.error
      if (error) setStatus('Erro ao carregar relatorios: ' + error.message)
      setBarbers((barbersResult.data ?? []) as Barber[])
      setAppointments((appointmentsResult.data ?? []) as Appointment[])
      setServices((servicesResult.data ?? []) as Service[])
      setLoading(false)
    }
    void loadReports()
  }, [])

  const prices = useMemo(() => new Map(services.map((service) => [service.id, Number(service.preco)])), [services])
  const filtered = useMemo(() => appointments.filter((item) => selectedBarber === 'all' || item.equipe_id === selectedBarber), [appointments, selectedBarber])
  const completed = filtered.filter((item) => item.status === 'Concluido')
  const revenue = completed.reduce((total, item) => total + (item.servico_id ? prices.get(item.servico_id) ?? 0 : 0), 0)
  const commission = completed.reduce((total, item) => { const barber = barbers.find((candidate) => candidate.id === item.equipe_id); const price = item.servico_id ? prices.get(item.servico_id) ?? 0 : 0; return total + price * (Number(barber?.comissao_percentual ?? 0) / 100) }, 0)

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:p-6 md:p-8 lg:p-12"><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-sm font-medium text-emerald-400">Plano Scale</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><BarChart3 className="h-8 w-8 text-emerald-400" /> Relatorios individuais</h1><p className="mt-2 text-sm text-slate-400">Acompanhe cortes, faturamento e comissao de cada profissional.</p></div><select value={selectedBarber} onChange={(event) => setSelectedBarber(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="all">Todos os barbeiros</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nome}</option>)}</select></div>{status && <p className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{status}</p>}<ScalePaywall>{loading ? <p className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Carregando relatorios...</p> : <><div className="grid gap-4 md:grid-cols-3"><Metric icon={<Scissors className="h-5 w-5" />} label="Cortes concluidos" value={String(completed.length)} /><Metric icon={<TrendingUp className="h-5 w-5" />} label="Faturamento" value={'R$ ' + revenue.toFixed(2).replace('.', ',')} /><Metric icon={<Users className="h-5 w-5" />} label="Comissao estimada" value={'R$ ' + commission.toFixed(2).replace('.', ',')} /></div><section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"><div className="border-b border-slate-800 p-5"><h2 className="font-semibold text-white">Desempenho por profissional</h2><p className="mt-1 text-xs text-slate-500">Resumo dos agendamentos concluidos.</p></div><div className="divide-y divide-slate-800">{barbers.filter((barber) => selectedBarber === 'all' || barber.id === selectedBarber).map((barber) => { const items = completed.filter((item) => item.equipe_id === barber.id); const total = items.reduce((sum, item) => sum + (item.servico_id ? prices.get(item.servico_id) ?? 0 : 0), 0); const barberCommission = total * (Number(barber.comissao_percentual) / 100); return <div key={barber.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">{barber.nome}</p><p className="mt-1 text-xs text-slate-500">Comissao de {Number(barber.comissao_percentual).toFixed(0)}%</p></div><div className="grid grid-cols-3 gap-6 text-right text-sm"><div><p className="text-xs text-slate-500">Cortes</p><p className="mt-1 font-bold text-white">{items.length}</p></div><div><p className="text-xs text-slate-500">Faturamento</p><p className="mt-1 font-bold text-emerald-300">R$ {total.toFixed(2).replace('.', ',')}</p></div><div><p className="text-xs text-slate-500">Comissao</p><p className="mt-1 font-bold text-white">R$ {barberCommission.toFixed(2).replace('.', ',')}</p></div></div></div> })}{!barbers.length && <p className="p-6 text-sm text-slate-500">Cadastre barbeiros em Configuracoes para ver os relatorios.</p>}</div></section></>}</ScalePaywall></div></main>
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl"><div className="flex items-center gap-3 text-emerald-400">{icon}<span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span></div><p className="mt-4 text-2xl font-bold text-white">{value}</p></div>
}

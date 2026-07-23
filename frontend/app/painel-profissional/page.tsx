'use client'

import { BarChart3, CalendarDays, CheckCircle2, LogOut, MessageCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Appointment = { id: string; cliente_id: string; data_agendamento: string; hora_agendamento: string; servico: string; servico_id: string | null; status: string }
type Client = { id: string; nome: string; telefone: string }
type Service = { id: string; nome: string; preco: number }
type Payload = {
  member: { nome: string; comissao_percentual: number }
  appointments: Appointment[]
  clients: Client[]
  services: Service[]
}

export default function ProfessionalPanelPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [message, setMessage] = useState('Carregando agenda...')

  useEffect(() => {
    fetch('/api/profissional/agenda')
      .then(async (response) => {
        if (!response.ok) throw new Error('Acesso negado.')
        return response.json() as Promise<Payload>
      })
      .then(setData)
      .catch((error: Error) => setMessage(error.message))
  }, [])

  const names = new Map((data?.clients ?? []).map((client) => [client.id, client.nome]))
  const phones = new Map((data?.clients ?? []).map((client) => [client.id, client.telefone]))
  const prices = useMemo(() => new Map((data?.services ?? []).map((service) => [service.id, Number(service.preco)])), [data?.services])
  const completed = data?.appointments.filter((appointment) => appointment.status === 'Concluido') ?? []
  const revenue = completed.reduce((total, appointment) => total + (appointment.servico_id ? prices.get(appointment.servico_id) ?? 0 : 0), 0)
  const commission = revenue * (Number(data?.member.comissao_percentual ?? 0) / 100)

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login-profissional'
  }

  function getWhatsAppLink(appointment: Appointment) {
    const rawPhone = phones.get(appointment.cliente_id)?.replace(/\D/g, '') ?? ''
    if (!rawPhone) return ''
    const phone = rawPhone.startsWith('55') ? rawPhone : '55' + rawPhone
    const name = names.get(appointment.cliente_id)?.split(' ')[0] ?? 'cliente'
    const text = appointment.status === 'Confirmado' ? 'Ola ' + name + ', passando para lembrar do nosso agendamento hoje as ' + appointment.hora_agendamento.slice(0, 5) + '. Te esperamos aqui na barbearia!' : 'Ola ' + name + ', estamos por aqui caso precise falar sobre seu atendimento.'
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)
  }

  if (!data) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-sm text-slate-400">{message}</main>

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-emerald-400">Painel do profissional</p>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold sm:text-3xl"><CalendarDays className="h-8 w-8 shrink-0 text-emerald-400" /> Ola, {data.member.nome}</h1>
            <p className="mt-2 text-sm text-slate-400">Veja apenas sua agenda, faturamento e comissao.</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-300 hover:bg-slate-900"><LogOut className="h-4 w-4" /> Sair</button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric icon={<CalendarDays className="h-5 w-5" />} label="Cortes concluidos" value={String(completed.length)} />
          <Metric icon={<BarChart3 className="h-5 w-5" />} label="Faturamento" value={'R$ ' + revenue.toFixed(2).replace('.', ',')} />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Minha comissao" value={'R$ ' + commission.toFixed(2).replace('.', ',')} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 p-5">
            <h2 className="font-semibold text-white">Minha agenda</h2>
            <p className="mt-1 text-xs text-slate-500">Atendimentos atribuidos somente a voce.</p>
          </div>
          {data.appointments.length ? <div className="divide-y divide-slate-800">{data.appointments.map((appointment) => {
            const link = getWhatsAppLink(appointment)
            return <article key={appointment.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold text-white">{names.get(appointment.cliente_id) ?? 'Cliente'}</p><p className="mt-1 text-sm text-slate-400">{appointment.data_agendamento} as {appointment.hora_agendamento.slice(0, 5)} - {appointment.servico}</p><p className="mt-1 text-xs text-slate-500">{phones.get(appointment.cliente_id) || 'Telefone nao informado'}</p></div><div className="flex items-center gap-2"><span className="w-fit rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">{appointment.status}</span>{link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"><MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp</a>}</div></article>
          })}</div> : <p className="p-10 text-center text-sm text-slate-500">Nenhum atendimento marcado.</p>}
        </section>
      </div>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl"><div className="flex items-center gap-3 text-emerald-400">{icon}<span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span></div><p className="mt-4 text-2xl font-bold text-white">{value}</p></article>
}

'use client'

import { CalendarDays, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Appointment = { id: string; cliente_id: string; data_agendamento: string; hora_agendamento: string; servico: string; status: string }
type Client = { id: string; nome: string; telefone: string }
type Payload = { member: { nome: string }; appointments: Appointment[]; clients: Client[] }

export default function ProfessionalPanelPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [message, setMessage] = useState('Carregando agenda...')
  useEffect(() => { fetch('/api/profissional/agenda').then(async (response) => { if (!response.ok) throw new Error('Acesso negado.') ; return response.json() as Promise<Payload> }).then(setData).catch((error: Error) => setMessage(error.message)) }, [])
  const names = new Map((data?.clients ?? []).map((client) => [client.id, client.nome]))
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/login-profissional' }
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">{message}</main>
  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:p-6 md:p-10"><div className="mx-auto max-w-5xl"><header className="mb-8 flex items-center justify-between"><div><p className="text-sm text-emerald-400">Painel do profissional</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><CalendarDays className="h-8 w-8 text-emerald-400" /> Ola, {data.member.nome}</h1><p className="mt-2 text-sm text-slate-400">Veja apenas seus atendimentos e sua agenda.</p></div><button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-3 text-sm text-slate-300 hover:bg-slate-900"><LogOut className="h-4 w-4" /> Sair</button></header><section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">{data.appointments.length ? data.appointments.map((appointment) => <article key={appointment.id} className="flex flex-col gap-3 border-b border-slate-800 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">{names.get(appointment.cliente_id) ?? 'Cliente'}</p><p className="mt-1 text-sm text-slate-400">{appointment.data_agendamento} as {appointment.hora_agendamento.slice(0, 5)} - {appointment.servico}</p></div><span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">{appointment.status}</span></article>) : <p className="p-10 text-center text-sm text-slate-500">Nenhum atendimento marcado.</p>}</section></div></main>
}


'use client'

import { CalendarCheck } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

 type Service = { id: string; nome: string; preco: number; duracao_minutos: number }

export default function PublicBookingForm({ barbearia }: { barbearia: string }) {
  const [services, setServices] = useState<Service[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const nomeBarbearia = useMemo(() => 'Barbearia ' + (barbearia || 'Jacobina').replace(/[-_]+/g, ' '), [barbearia])

  useEffect(() => {
    fetch('/api/servicos?barbearia=' + encodeURIComponent(barbearia)).then((response) => response.ok ? response.json() : { services: [] }).then((data: { services?: Service[] }) => setServices(data.services ?? [])).catch(() => setServices([]))
  })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('')
    const response = await fetch('/api/agendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barbearia, nome, telefone, servicoId, date, time }) })
    const data = await response.json() as { success?: boolean; error?: string }
    if (!response.ok || !data.success) setMessage(data.error ?? 'Nao foi possivel criar o agendamento.')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl"><CalendarCheck className="mx-auto h-12 w-12 text-emerald-400" /><h1 className="mt-4 text-2xl font-bold">Horario reservado!</h1><p className="mt-3 text-sm text-slate-400">A {nomeBarbearia} recebeu seu pedido. Aguarde a confirmacao.</p></section></main>

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"><div className="mb-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><CalendarCheck className="h-6 w-6" /></div><h1 className="mt-4 text-2xl font-bold">Agende na {nomeBarbearia}</h1><p className="mt-2 text-sm text-slate-400">Escolha um servico e o melhor horario para voce.</p></div><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-slate-300">Nome completo<input required value={nome} onChange={(event) => setNome(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">WhatsApp / Telefone<input required minLength={8} value={telefone} onChange={(event) => setTelefone(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Servico<select required value={servicoId} onChange={(event) => setServicoId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500"><option value="">Escolha um servico</option>{services.map((service) => <option key={service.id} value={service.id}>{service.nome} - R$ {Number(service.preco).toFixed(2).replace('.', ',')}</option>)}</select></label><div className="grid grid-cols-2 gap-4"><label className="block text-sm text-slate-300">Data<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Horario<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label></div>{message && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</p>}<button disabled={loading} type="submit" className="w-full rounded-xl bg-emerald-500 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">{loading ? 'Salvando...' : 'Confirmar horario'}</button></form></section></main>
}
'use client'

import { CalendarCheck, Check, Clock3, UserRound } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type Service = { id: string; nome: string; preco: number; duracao_minutos: number }
type DayOption = { key: string; label: string; dateLabel: string }
type Barber = { id: string; nome: string }
type Availability = { capacity: number; booked: Record<string, number>; barbers: Barber[] }

const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const fallbackServices: Service[] = [
  { id: 'fallback-corte', nome: 'Corte', preco: 60, duracao_minutos: 30 },
  { id: 'fallback-barba', nome: 'Barba', preco: 40, duracao_minutos: 30 },
]
const timeOptions = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function dateLabel(date: Date) {
  return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0')
}

export default function PublicBookingForm({ barbearia }: { barbearia: string }) {
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [availability, setAvailability] = useState<Availability>({ capacity: 1, booked: {}, barbers: [] })
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [servicoId, setServicoId] = useState('')
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [selectedTime, setSelectedTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const nomeBarbearia = useMemo(() => 'Barbearia ' + (barbearia || 'Jacobina').replace(/[-_]+/g, ' '), [barbearia])

  const days = useMemo<DayOption[]>(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() + index)
    return { key: dateKey(date), label: index === 0 ? 'Hoje' : index === 1 ? 'Amanha' : weekLabels[date.getDay()], dateLabel: dateLabel(date) }
  }), [])

  const availableTimes = useMemo(
    () => timeOptions.filter((time) => (availability.booked[time] ?? 0) < availability.capacity),
    [availability],
  )

  useEffect(() => {
    setLoadingServices(true)
    fetch('/api/servicos?barbearia=' + encodeURIComponent(barbearia))
      .then((response) => response.ok ? response.json() : { services: [] })
      .then((data: { services?: Service[] }) => {
        const loaded = data.services ?? []
        const available = loaded.length ? loaded : fallbackServices
        setServices(available)
        if (available.length) setServicoId((current) => current || available[0].id)
      })
      .catch(() => setServices(fallbackServices))
      .finally(() => setLoadingServices(false))
  }, [barbearia])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingAvailability(true)
    setSelectedTime('')
    fetch('/api/agendar?barbearia=' + encodeURIComponent(barbearia) + '&date=' + selectedDate)
      .then((response) => response.ok ? response.json() : { capacity: 1, booked: {} })
      .then((data: Availability) => setAvailability({ capacity: Math.max(1, data.capacity ?? 1), booked: data.booked ?? {}, barbers: data.barbers ?? [] }))
      .catch(() => setAvailability({ capacity: 1, booked: {}, barbers: [] }))
      .finally(() => setLoadingAvailability(false))
  }, [barbearia, selectedDate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!services.length) { setMessage('Nenhum servico disponivel no momento.'); return }
    if (!selectedDate || !selectedTime) { setMessage('Escolha um dia e um horario para continuar.'); return }
    setLoading(true)
    const response = await fetch('/api/agendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barbearia, nome, telefone, servicoId, equipeId: selectedBarberId || undefined, servico: services.find((service) => service.id === servicoId)?.nome, date: selectedDate, time: selectedTime }),
    })
    const data = await response.json() as { success?: boolean; error?: string }
    if (!response.ok || !data.success) setMessage(data.error ?? 'Nao foi possivel criar o agendamento.')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><Check className="h-7 w-7" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-emerald-400">Passo 4 - Confirmacao</p><h1 className="mt-3 text-2xl font-bold">Horario reservado!</h1><p className="mt-3 text-sm leading-6 text-slate-400">A {nomeBarbearia} recebeu seu pedido. Aguarde a confirmacao.</p></section></main>

  return <main className="min-h-screen overflow-x-hidden bg-slate-950 px-4 py-6 text-white sm:px-5 sm:py-12"><section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:p-8"><div className="mb-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><CalendarCheck className="h-6 w-6" /></div><h1 className="mt-4 text-2xl font-bold">Agende na {nomeBarbearia}</h1><p className="mt-2 text-sm text-slate-400">Escolha o melhor horario para o seu proximo corte.</p></div><div className="mb-8 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"><span className="text-emerald-400">1. Identificacao</span><span>2. Servico</span><span>3. Dia e horario</span><span>4. Confirmacao</span></div><form onSubmit={submit} className="space-y-7"><section><div className="mb-3 flex items-center gap-2"><UserRound className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-semibold text-white">1. Identificacao</h2></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Nome completo<input required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Joao Silva" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">WhatsApp / Telefone<input required minLength={8} value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500" /></label></div></section><section><h2 className="mb-3 text-sm font-semibold text-white">2. Escolha o servico</h2>{loadingServices ? <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">Carregando servicos...</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{services.map((service) => <button type="button" key={service.id} onClick={() => setServicoId(service.id)} className={'rounded-2xl border p-4 text-left transition ' + (servicoId === service.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700')}><p className="font-semibold text-white">{service.nome}</p><p className="mt-2 text-sm text-emerald-300">R$ {Number(service.preco).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-slate-500">{service.duracao_minutos} minutos</p></button>)}</div>}</section>{availability.barbers.length > 1 && <section><h2 className="mb-3 text-sm font-semibold text-white">3. Escolha o barbeiro</h2><select value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Distribuicao automatica</option>{availability.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nome}</option>)}</select><p className="mt-2 text-xs text-slate-500">Escolha um profissional ou deixe o sistema distribuir automaticamente.</p></section>}<section><h2 className="mb-3 text-sm font-semibold text-white">3. Escolha o dia e horario</h2><div className="flex gap-2 overflow-x-auto pb-2">{days.map((day) => <button type="button" key={day.key} onClick={() => setSelectedDate(day.key)} className={'min-w-[76px] rounded-xl border px-3 py-3 text-center transition ' + (selectedDate === day.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700')}><span className="block text-xs font-bold">{day.label}</span><span className="mt-1 block text-xs">{day.dateLabel}</span></button>)}</div><p className="mt-4 text-xs text-slate-500">{loadingAvailability ? 'Verificando disponibilidade...' : availability.capacity + ' cadeiras simultaneas disponiveis'}</p>{availableTimes.length ? <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">{timeOptions.map((time) => { const occupied = availability.booked[time] ?? 0; const available = occupied < availability.capacity; return <button disabled={!available || loadingAvailability} type="button" key={time} onClick={() => setSelectedTime(time)} className={'rounded-lg border px-2 py-3 text-sm font-semibold transition ' + (!available ? 'cursor-not-allowed border-slate-900 bg-slate-900 text-slate-700' : selectedTime === time ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-emerald-500/60')}>{time}{!available && <span className="mt-1 block text-[9px] uppercase">Lotado</span>}</button> })}</div> : <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">Todos os horarios estao ocupados neste dia.</p>}</section>{message && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</p>}<button disabled={loading || loadingServices || loadingAvailability || !services.length || !availableTimes.length} type="submit" className="w-full rounded-xl bg-emerald-500 px-5 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Salvando...' : 'Confirmar agendamento'}</button></form></section></main>
}

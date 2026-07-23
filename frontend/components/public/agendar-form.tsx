'use client'

import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock3, UserRound } from 'lucide-react'
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
  const [dayOffset, setDayOffset] = useState(0)
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
  const visibleDays = days.slice(dayOffset, dayOffset + 4)
  const availableTimes = useMemo(() => timeOptions.filter((time) => (availability.booked[time] ?? 0) < availability.capacity), [availability])
  const selectedService = services.find((service) => service.id === servicoId)

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
      .catch(() => {
        setServices(fallbackServices)
        setServicoId((current) => current || fallbackServices[0].id)
      })
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
      body: JSON.stringify({ barbearia, nome, telefone, servicoId, equipeId: selectedBarberId || undefined, servico: selectedService?.nome, date: selectedDate, time: selectedTime }),
    })
    const data = await response.json() as { success?: boolean; error?: string }
    if (!response.ok || !data.success) setMessage(data.error ?? 'Nao foi possivel criar o agendamento.')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><Check className="h-7 w-7" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-emerald-400">Passo 4 - Confirmacao</p><h1 className="mt-3 text-2xl font-bold">Horario reservado!</h1><p className="mt-3 text-sm leading-6 text-slate-400">A {nomeBarbearia} recebeu seu pedido. Aguarde a confirmacao.</p></section></main>
  }

  return <main className="min-h-screen overflow-x-hidden bg-gray-950 px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-10"><section className="mx-auto w-full max-w-screen-2xl">
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-800/80 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><CalendarCheck className="h-5 w-5" /></div><span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Atendimento online</span></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Agende na {nomeBarbearia}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">Escolha seu servico, profissional e horario em poucos passos.</p></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400"><span className="text-emerald-400">Status:</span> Agenda online disponivel</div>
    </header>

    <div className="mb-8 flex items-center gap-2 sm:gap-4"><ProgressStep number="1" label="Identificacao" active={!nome || !telefone} /><ProgressLine active={Boolean(nome && telefone)} /><ProgressStep number="2" label="Servico" active={Boolean(nome && telefone) && !servicoId} /><ProgressLine active={Boolean(servicoId)} /><ProgressStep number="3" label="Dia e horario" active={Boolean(servicoId)} /><ProgressLine active={Boolean(selectedDate && selectedTime)} /><ProgressStep number="4" label="Confirmacao" active={false} /></div>

    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-md sm:p-7"><SectionHeading icon={<UserRound className="h-5 w-5" />} eyebrow="Passo 1" title="Identificacao" /><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Nome completo<input required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Joao Silva" className="mt-2 w-full rounded-xl border border-slate-800 bg-gray-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">WhatsApp / Telefone<input required minLength={8} value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" className="mt-2 w-full rounded-xl border border-slate-800 bg-gray-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500" /></label></div></section>
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-md sm:p-7"><SectionHeading icon={<Clock3 className="h-5 w-5" />} eyebrow="Passo 2" title="Escolha o servico" /><div className="grid gap-4 sm:grid-cols-2">{loadingServices ? <p className="rounded-xl border border-slate-800 bg-gray-950 p-4 text-sm text-slate-500 sm:col-span-2">Carregando servicos...</p> : services.map((service) => <button type="button" key={service.id} onClick={() => setServicoId(service.id)} className={'group rounded-2xl border p-5 text-left shadow-md transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500/70 hover:shadow-emerald-500/10 ' + (servicoId === service.id ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/10' : 'border-slate-800 bg-gray-950')}><div className="flex items-start justify-between gap-3"><p className="text-base font-semibold text-white">{service.nome}</p>{servicoId === service.id && <Check className="h-5 w-5 text-emerald-400" />}</div><p className="mt-4 text-xl font-bold text-emerald-300">R$ {Number(service.preco).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-xs text-slate-500">{service.duracao_minutos} minutos de atendimento</p></button>)}</div>{availability.barbers.length > 1 && <div className="mt-6 border-t border-slate-800 pt-5"><label className="block text-sm text-slate-300">Profissional<select value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"><option value="">Distribuicao automatica</option>{availability.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nome}</option>)}</select></label><p className="mt-2 text-xs text-slate-500">Escolha um profissional ou deixe o sistema distribuir automaticamente.</p></div>}</section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-md sm:p-7 lg:sticky lg:top-6"><SectionHeading icon={<CalendarCheck className="h-5 w-5" />} eyebrow="Passo 3" title="Escolha o dia e horario" /><div className="flex items-center gap-2"><button type="button" aria-label="Dias anteriores" disabled={dayOffset === 0} onClick={() => setDayOffset((current) => Math.max(0, current - 1))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-gray-950 text-slate-400 transition hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button><div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">{visibleDays.map((day) => <button type="button" key={day.key} onClick={() => setSelectedDate(day.key)} className={'rounded-xl border px-2 py-3 text-center transition duration-200 ' + (selectedDate === day.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-md shadow-emerald-500/10' : 'border-slate-800 bg-gray-950 text-slate-400 hover:border-emerald-500/60')}><span className="block text-xs font-bold">{day.label}</span><span className="mt-1 block text-xs">{day.dateLabel}</span></button>)}</div><button type="button" aria-label="Proximos dias" disabled={dayOffset >= days.length - 4} onClick={() => setDayOffset((current) => Math.min(days.length - 4, current + 1))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-gray-950 text-slate-400 transition hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button></div><p className="mt-5 text-xs text-slate-500">{loadingAvailability ? 'Verificando disponibilidade...' : availability.capacity + ' cadeiras simultaneas disponiveis'}</p>{availableTimes.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{timeOptions.map((time) => { const occupied = availability.booked[time] ?? 0; const available = occupied < availability.capacity; return <button disabled={!available || loadingAvailability} type="button" key={time} onClick={() => setSelectedTime(time)} className={'min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition duration-200 ' + (!available ? 'cursor-not-allowed border-slate-900 bg-gray-950 text-slate-700' : selectedTime === time ? 'border-emerald-400 bg-emerald-500 text-gray-950 shadow-lg shadow-emerald-500/20' : 'border-slate-800 bg-gray-950 text-slate-300 hover:-translate-y-0.5 hover:border-emerald-500/70')}>{time}{!available && <span className="mt-1 block text-[9px] uppercase">Lotado</span>}</button> })}</div> : <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">Todos os horarios estao ocupados neste dia.</p>}<div className="mt-7 border-t border-slate-800 pt-6">{selectedService && <div className="mb-4 flex items-center justify-between text-sm"><span className="text-slate-400">Resumo</span><span className="font-semibold text-white">{selectedService.nome} - R$ {Number(selectedService.preco).toFixed(2).replace('.', ',')}</span></div>}{message && <p className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</p>}<button disabled={loading || loadingServices || loadingAvailability || !services.length || !availableTimes.length} type="submit" className="flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-bold text-gray-950 shadow-lg shadow-emerald-500/10 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Salvando...' : 'Confirmar agendamento'}</button></div></section>
    </form>
  </section></main>
}

function ProgressStep({ number, label, active }: { number: string; label: string; active: boolean }) {
  return <div className={'flex min-w-0 items-center gap-2 ' + (active ? 'text-emerald-400' : 'text-slate-500')}><span className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ' + (active ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900')}>{number}</span><span className="hidden text-xs font-semibold sm:inline">{label}</span></div>
}

function ProgressLine({ active }: { active: boolean }) {
  return <div className={'h-px flex-1 transition ' + (active ? 'bg-emerald-500/70' : 'bg-slate-800')} />
}

function SectionHeading({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">{icon}</div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-white">{title}</h2></div></div>
}

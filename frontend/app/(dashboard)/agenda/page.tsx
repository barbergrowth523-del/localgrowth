'use client'

import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, MessageCircle, Plus, UserRound, X, XCircle } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'Confirmado' | 'Concluido' | 'Cancelado'
type Service = { id: string; nome: string; preco: number; duracao_minutos: number }
type Client = { id: string; nome: string; telefone: string }
type Barber = { id: string; nome: string }
type Appointment = {
  id: string
  cliente_id: string
  servico_id?: string | null
  data_agendamento: string
  hora_agendamento: string
  servico: string
  status: Status
  barbeiro_id?: string | null
}
type FormState = { clienteId: string; date: string; time: string; serviceId: string; barberId: string }
type CalendarCell = { date: string; day: number; currentMonth: boolean }

const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const today = new Date()
const todayKey = dateKey(today)
const emptyForm: FormState = { clienteId: '', date: todayKey, time: '09:00', serviceId: '', barberId: '' }

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}


function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return day + '/' + month + '/' + year
}

export default function AgendaPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [form, setForm] = useState<FormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadAgendaData()
  }, [])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    let active = true

    async function subscribe() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      channel = supabase
        .channel('agenda-' + user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: 'user_id=eq.' + user.id }, () => {
          void loadAgendaData()
        })
        .subscribe()
    }

    void subscribe()
    return () => {
      active = false
      if (channel) void createClient().removeChannel(channel)
    }
  }, [])

  async function loadAgendaData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('Sua sessao expirou. Entre novamente.')
        return
      }

      const [clientsResult, appointmentsResult, servicesResult, barbersResult] = await Promise.all([
        supabase.from('clientes').select('id,nome,telefone').eq('user_id', user.id).order('nome'),
        supabase.from('agendamentos').select('id,cliente_id,servico_id,data_agendamento,hora_agendamento,servico,status').eq('user_id', user.id).order('data_agendamento').order('hora_agendamento'),
        supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('barbeiros').select('id,nome').eq('user_id', user.id).eq('ativo', true).order('nome'),
      ])

      if (clientsResult.error) throw clientsResult.error
      if (appointmentsResult.error) throw appointmentsResult.error
      if (servicesResult.error) throw servicesResult.error
      if (barbersResult.error) throw barbersResult.error

      setClients((clientsResult.data ?? []) as Client[])
      setServices((servicesResult.data ?? []) as Service[])
      setBarbers((barbersResult.data ?? []) as Barber[])
      setAppointments((appointmentsResult.data ?? []) as Appointment[])
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? 'Erro ao carregar a Agenda: ' + error.message : 'Erro ao carregar a Agenda. Verifique o banco de dados.')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const appointmentsByDate = useMemo(() => {
    const counts = new Map<string, number>()
    appointments.forEach((appointment) => counts.set(appointment.data_agendamento, (counts.get(appointment.data_agendamento) ?? 0) + 1))
    return counts
  }, [appointments])

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
    const cells: CalendarCell[] = []
    for (let index = 0; index < firstDay.getDay(); index += 1) cells.push({ date: '', day: 0, currentMonth: false })
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)
      cells.push({ date: dateKey(date), day, currentMonth: true })
    }
    while (cells.length % 7 !== 0) cells.push({ date: '', day: 0, currentMonth: false })
    return cells
  }, [visibleMonth])

  const dayAppointments = useMemo(
    () => appointments.filter((item) => item.data_agendamento === selectedDate).sort((a, b) => a.hora_agendamento.localeCompare(b.hora_agendamento)),
    [appointments, selectedDate],
  )
  const clientNames = useMemo(() => new Map(clients.map((client) => [client.id, client.nome])), [clients])
  const serviceNames = useMemo(() => new Map(services.map((service) => [service.id, service.nome])), [services])
  const barberNames = useMemo(() => new Map(barbers.map((barber) => [barber.id, barber.nome])), [barbers])

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function selectDate(date: string) {
    if (!date) return
    setSelectedDate(date)
  }

  function openModal() {
    setForm({ ...emptyForm, date: selectedDate, clienteId: clients[0]?.id ?? '', serviceId: services[0]?.id ?? '', barberId: '' })
    setModalOpen(true)
    setStatus('')
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.clienteId || !form.serviceId) {
      setStatus('Selecione um cliente e um servico para continuar.')
      return
    }

    setSaving(true)
    setStatus('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Sua sessao expirou. Entre novamente.')
      setSaving(false)
      return
    }

    const service = services.find((item) => item.id === form.serviceId)
    const { error } = await supabase.from('agendamentos').insert({
      user_id: user.id,
      barbearia_id: user.id,
      cliente_id: form.clienteId,
      servico_id: form.serviceId,
      barbeiro_id: form.barberId || null,
      data_agendamento: form.date,
      hora_agendamento: form.time,
      servico: service?.nome ?? 'Servico',
      status: 'Confirmado',
    })

    if (error) {
      setStatus('Erro ao salvar agendamento: ' + error.message)
      setSaving(false)
      return
    }

    setSelectedDate(form.date)
    setVisibleMonth(new Date(form.date + 'T12:00:00'))
    setModalOpen(false)
    setForm(emptyForm)
    setStatus('Agendamento criado com sucesso.')
    await loadAgendaData()
    setSaving(false)
  }

  async function updateStatus(appointment: Appointment, nextStatus: Status) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessao expirada')
      const { error } = await supabase.from('agendamentos').update({ status: nextStatus }).eq('id', appointment.id).eq('user_id', user.id)
      if (error) throw error
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status: nextStatus } : item))
    } catch {
      setStatus('Nao foi possivel atualizar o status. Verifique a tabela agendamentos.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-400">Organizacao do salao</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><CalendarDays className="h-8 w-8 text-emerald-400" /> Agenda</h1>
            <p className="mt-2 text-sm text-slate-400">Gerencie os cortes marcados e mantenha sua cadeira ocupada.</p>
          </div>
          <button type="button" onClick={openModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"><Plus className="h-4 w-4" /> Novo agendamento</button>
        </div>

        {status && <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}
        {!services.length && !loading && <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">Cadastre seus servicos em Configuracoes antes de criar um agendamento.</p>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Calendario</p>
                <h2 className="mt-1 text-xl font-bold text-white">{monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</h2>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(todayKey) }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Hoje</button>
                <button type="button" onClick={() => changeMonth(1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Proximo mes"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{weekDays.map((day) => <span key={day} className="py-2">{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, index) => {
                const count = cell.date ? appointmentsByDate.get(cell.date) ?? 0 : 0
                const isSelected = cell.date === selectedDate
                const isToday = cell.date === todayKey
                return <button key={cell.date || 'empty-' + index} type="button" disabled={!cell.date} onClick={() => selectDate(cell.date)} className={'min-h-16 rounded-xl border p-2 text-left transition ' + (!cell.date ? 'cursor-default border-transparent bg-transparent' : isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700')}>{cell.date && <><span className={'text-sm font-semibold ' + (isToday ? 'text-emerald-300' : 'text-slate-300')}>{cell.day}</span>{count > 0 ? <span className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{count} corte{count === 1 ? '' : 's'}</span> : <span className="mt-2 block text-[10px] text-slate-600">Livre</span>}</>}</button>
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div><h2 className="font-semibold text-white">Horarios marcados</h2><p className="mt-1 text-xs text-slate-500">{displayDate(selectedDate)} - {dayAppointments.length ? dayAppointments.length + (dayAppointments.length === 1 ? ' corte' : ' cortes') : 'Disponivel'}</p></div>
              <Clock3 className="h-5 w-5 text-emerald-400" />
            </div>
            {dayAppointments.length ? <div className="space-y-3 p-4">{dayAppointments.map((appointment) => {
              const client = clients.find((item) => item.id === appointment.cliente_id)
              const service = services.find((item) => item.id === appointment.servico_id)
              const phone = client?.telefone.replace(/\\D/g, '') ?? ''
              const whatsappPhone = phone.startsWith('55') ? phone : '55' + phone
              const whatsappMessage = encodeURIComponent('Fala ' + (client?.nome.split(' ')[0] ?? 'cliente') + '! Seu horario esta confirmado. Se precisar falar com a barbearia, estamos por aqui.')
              const serviceLabel = service?.nome ?? appointment.servico
              const servicePrice = service ? 'R$ ' + Number(service.preco).toFixed(2).replace('.', ',') : 'Preco nao informado'
              return <article key={appointment.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-lg shadow-emerald-950/10 transition hover:border-emerald-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-16 flex-col items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Horario</span>
                      <span className="mt-0.5 text-lg font-bold">{appointment.hora_agendamento.slice(0, 5)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-base font-bold text-white"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-emerald-300">{(client?.nome ?? 'C').slice(0, 1).toUpperCase()}</span>{client?.nome ?? 'Cliente removido'}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><UserRound className="h-3 w-3" />{serviceLabel} - {appointment.barbeiro_id ? barberNames.get(appointment.barbeiro_id) ?? 'Barbeiro' : 'Distribuicao automatica'}</p>
                    </div>
                  </div>
                  <button type="button" disabled={appointment.status === 'Cancelado'} onClick={() => void updateStatus(appointment, 'Cancelado')} className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Cancelar agendamento"><XCircle className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-800 py-3">
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Servico</p><p className="mt-1 text-sm font-semibold text-slate-200">{serviceLabel}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Valor</p><p className="mt-1 text-sm font-semibold text-emerald-300">{servicePrice}</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Telefone</p><p className="mt-1 truncate text-xs text-slate-400">{client?.telefone ?? 'Nao informado'}</p></div>
                  {phone && <a href={'https://wa.me/' + whatsappPhone + '?text=' + whatsappMessage} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"><MessageCircle className="h-3.5 w-3.5" /> Mensagem</a>}
                </div>
                <select aria-label="Status do agendamento" value={appointment.status} onChange={(event) => void updateStatus(appointment, event.target.value as Status)} className={'mt-4 w-full rounded-lg border bg-slate-900 px-3 py-2.5 text-xs font-semibold outline-none transition ' + (appointment.status === 'Confirmado' ? 'border-emerald-500/20 text-emerald-300' : appointment.status === 'Concluido' ? 'border-sky-500/20 text-sky-300' : 'border-rose-500/20 text-rose-300')}><option>Confirmado</option><option>Concluido</option><option>Cancelado</option></select>
              </article>
            })}</div> : <div className="p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-slate-600"><Clock3 className="h-6 w-6" /></div><p className="mt-4 font-semibold text-slate-300">Nenhum horario marcado.</p><p className="mt-1 text-sm text-slate-500">Este dia esta livre para novos agendamentos.</p></div>}
          </section>
        </div>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-bold text-white">Novo agendamento</h2><p className="mt-1 text-sm text-slate-400">Escolha o cliente, horario e servico.</p></div><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div><form onSubmit={createAppointment} className="space-y-4"><label className="block text-sm text-slate-300">Cliente<select required value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}</select></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Data<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Horario<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" /></label></div><label className="block text-sm text-slate-300">Barbeiro<select value={form.barberId} onChange={(event) => setForm({ ...form, barberId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Distribuicao automatica</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.nome}</option>)}</select></label><label className="block text-sm text-slate-300">Servico<select required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Selecione um servico</option>{services.map((service) => <option key={service.id} value={service.id}>{service.nome} - R$ {Number(service.preco).toFixed(2).replace('.', ',')} - {service.duracao_minutos} min</option>)}</select></label><div className="flex justify-end gap-3 border-t border-slate-800 pt-5"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancelar</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"><Check className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar agendamento'}</button></div></form></div></div>}
    </main>
  )
}

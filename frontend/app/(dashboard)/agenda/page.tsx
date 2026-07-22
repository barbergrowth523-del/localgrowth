'use client'

import { CalendarDays, Check, Clock3, Plus, X, XCircle } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'Confirmado' | 'Concluido' | 'Cancelado'
type Service = { id: string; nome: string; preco: number; duracao_minutos: number }
type Client = { id: string; nome: string; telefone: string }
type Appointment = { id: string; cliente_id: string; servico_id?: string | null; data_agendamento: string; hora_agendamento: string; servico: string; status: Status }
type FormState = { clienteId: string; date: string; time: string; serviceId: string }

const today = new Date().toISOString().slice(0, 10)
const emptyForm: FormState = { clienteId: '', date: today, time: '09:00', serviceId: '' }

export default function AgendaPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => { void loadAgendaData() }, [])

  async function loadAgendaData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
      const [clientsResult, appointmentsResult, servicesResult] = await Promise.all([
        supabase.from('clientes').select('id,nome,telefone').eq('user_id', user.id).order('nome'),
        supabase.from('agendamentos').select('id,cliente_id,servico_id,data_agendamento,hora_agendamento,servico,status').eq('user_id', user.id).order('data_agendamento').order('hora_agendamento'),
        supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('user_id', user.id).eq('ativo', true).order('nome'),
      ])
      if (clientsResult.error) throw clientsResult.error
      if (appointmentsResult.error) {
        const errorMessage = appointmentsResult.error.message?.toLowerCase() ?? ''
        if (appointmentsResult.error.code === '42P01' || errorMessage.includes('agendamentos') && errorMessage.includes('does not exist')) {
          setClients((clientsResult.data ?? []) as Client[]); setAppointments([]); setStatus('A Agenda ainda nao esta configurada no banco.'); return
        }
        throw appointmentsResult.error
      }
      if (servicesResult.error) throw servicesResult.error
      setClients((clientsResult.data ?? []) as Client[])
      setServices((servicesResult.data ?? []) as Service[])
      setAppointments((appointmentsResult.data ?? []) as Appointment[])
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? 'Erro ao carregar a Agenda: ' + error.message : 'Erro ao carregar a Agenda. Verifique o banco de dados.')
      setAppointments([])
    }
  }

  const dayAppointments = useMemo(() => appointments.filter((item) => item.data_agendamento === selectedDate), [appointments, selectedDate])
  const clientNames = useMemo(() => new Map(clients.map((client) => [client.id, client.nome])), [clients])
  const serviceNames = useMemo(() => new Map(services.map((service) => [service.id, service.nome])), [services])

  function openModal() {
    setForm({ ...emptyForm, date: selectedDate, clienteId: clients[0]?.id ?? '', serviceId: services[0]?.id ?? '' })
    setModalOpen(true); setStatus('')
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.clienteId || !form.serviceId) { setStatus('Selecione um cliente e um servico para continuar.'); return }
    setSaving(true); setStatus('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); setSaving(false); return }
    const service = services.find((item) => item.id === form.serviceId)
    const { error } = await supabase.from('agendamentos').insert({ user_id: user.id, barbearia_id: user.id, cliente_id: form.clienteId, servico_id: form.serviceId, data_agendamento: form.date, hora_agendamento: form.time, servico: service?.nome ?? 'Servico', status: 'Confirmado' })
    if (error) { setStatus('Erro ao salvar agendamento: ' + error.message); setSaving(false); return }
    setSelectedDate(form.date); setModalOpen(false); setForm(emptyForm); setStatus('Agendamento criado com sucesso.'); await loadAgendaData(); setSaving(false)
  }

  async function updateStatus(appointment: Appointment, nextStatus: Status) {
    try {
      const { error } = await createClient().from('agendamentos').update({ status: nextStatus }).eq('id', appointment.id)
      if (error) throw error
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status: nextStatus } : item))
    } catch { setStatus('Nao foi possivel atualizar o status. Verifique a tabela agendamentos.') }
  }

  return <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8 lg:p-12"><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-sm font-medium text-emerald-400">Organizacao do salao</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-bold"><CalendarDays className="h-8 w-8 text-emerald-400" /> Agenda</h1><p className="mt-2 text-sm text-slate-400">Gerencie os cortes marcados e mantenha sua cadeira ocupada.</p></div><button type="button" onClick={openModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"><Plus className="h-4 w-4" /> Novo agendamento</button></div>{status && <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}{!services.length && <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">Cadastre seus servicos em Configuracoes antes de criar um agendamento.</p>}<section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"><div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-white">Horarios marcados</h2><p className="mt-1 text-xs text-slate-500">Veja e atualize o status de cada atendimento.</p></div><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500" /></div>{dayAppointments.length ? <div className="divide-y divide-slate-800">{dayAppointments.map((appointment) => <div key={appointment.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-12 w-16 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-300"><Clock3 className="mr-1 h-4 w-4" />{appointment.hora_agendamento.slice(0, 5)}</div><div><p className="font-semibold text-white">{clientNames.get(appointment.cliente_id) ?? 'Cliente removido'}</p><p className="mt-1 text-xs text-slate-500">{appointment.servico_id ? serviceNames.get(appointment.servico_id) ?? appointment.servico : appointment.servico}</p></div></div><select value={appointment.status} onChange={(event) => void updateStatus(appointment, event.target.value as Status)} className={'rounded-lg border px-3 py-2 text-xs font-semibold outline-none ' + (appointment.status === 'Confirmado' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : appointment.status === 'Concluido' ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300')}><option>Confirmado</option><option>Concluido</option><option>Cancelado</option></select><button type="button" disabled={appointment.status === 'Cancelado'} onClick={() => void updateStatus(appointment, 'Cancelado')} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"><XCircle className="h-4 w-4" /> Cancelar</button></div>)}</div> : <div className="p-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-slate-600"><Clock3 className="h-6 w-6" /></div><p className="mt-4 font-semibold text-slate-300">Nenhum horario marcado.</p><p className="mt-1 text-sm text-slate-500">Crie um novo agendamento para preencher sua agenda.</p></div>}</section></div>{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-xl font-bold text-white">Novo agendamento</h2><p className="mt-1 text-sm text-slate-400">Escolha o cliente, horario e servico.</p></div><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div><form onSubmit={createAppointment} className="space-y-4"><label className="block text-sm text-slate-300">Cliente<select required value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}</select></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-300">Data<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Horario<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" /></label></div><label className="block text-sm text-slate-300">Servico<select required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="">Selecione um servico</option>{services.map((service) => <option key={service.id} value={service.id}>{service.nome} - R$ {Number(service.preco).toFixed(2).replace('.', ',')} - {service.duracao_minutos} min</option>)}</select></label><div className="flex justify-end gap-3 border-t border-slate-800 pt-5"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800">Cancelar</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"><Check className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar agendamento'}</button></div></form></div></div>}</main>
}
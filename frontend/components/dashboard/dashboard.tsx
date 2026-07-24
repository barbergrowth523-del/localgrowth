'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clipboard, FileUp, Cake, LoaderCircle, MessageCircle, Search, Sparkles, User, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Client = { id: string; name: string; phone: string; last_cut_at: string; status_calculado?: string; frequency?: 'semanal' | 'quinzenal' | 'mensal'; birthday?: string }
const sample: Client[] = [{ id: '1', name: 'Mariana Costa', phone: '5571998765432', last_cut_at: '2026-07-17', frequency: 'semanal' }, { id: '2', name: 'Lucas Almeida', phone: '5571987654321', last_cut_at: '2026-06-12', frequency: 'quinzenal' }, { id: '3', name: 'Rafael Santos', phone: '5571991234567', last_cut_at: '2026-05-28', frequency: 'mensal' }]
const isOverdue = (date: string) => (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000 > 30
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? ''
const bookingPath = '/agendar?barbearia=jacobina'
const getBookingUrl = () => bookingUrl || (typeof window !== 'undefined' ? window.location.origin + bookingPath : bookingPath)
const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`

function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(0)
  const targetRef = useRef(0)
  useEffect(() => {
    const from = targetRef.current
    targetRef.current = target
    const start = performance.now()
    let frame = 0
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

function buildWhatsAppMessage(name: string) {
  const callToAction = ' Escolha seu horario direto aqui: ' + getBookingUrl()
  return 'Oi, ' + name.split(' ')[0] + '! Tudo bem? Ja faz um tempinho desde seu ultimo corte. Quer reservar um horario?' + callToAction
}
export function Dashboard({ userEmail }: { userEmail: string }) {
  const fallbackName = userEmail === 'barbergrowth523@gmail.com' ? 'Samuel Santos' : (userEmail.split('@')[0] || 'Usuario').replace(/[._-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  const [profileName, setProfileName] = useState('')
  const [planLabel, setPlanLabel] = useState('Plano Free')
  const displayName = profileName || fallbackName
  const firstName = displayName.split(' ')[0] || 'Usuario'
  const [clients, setClients] = useState<Client[]>([]); const [isUploading, setIsUploading] = useState(false); const [searchTerm, setSearchTerm] = useState(''); const [status, setStatus] = useState(''); const [frequencyFilter, setFrequencyFilter] = useState('todos'); const [selectedClient, setSelectedClient] = useState<Client | null>(null); const fileRef = useRef<HTMLInputElement>(null)
  async function loadClients() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
    const primaryProfile = await supabase.from('perfis_barbearia').select('*').eq('id', user.id).maybeSingle()
    const fallbackProfile = primaryProfile.data ? null : await supabase.from('perfis_barbearia').select('*').eq('auth_id', user.id).maybeSingle()
    const profile = (primaryProfile.data ?? fallbackProfile?.data) as Record<string, unknown> | null
    const profileValue = (keys: string[]) => keys.map((key) => profile?.[key]).find((value) => typeof value === 'string' && value.trim()) as string | undefined
    const savedName = profileValue(['nome', 'nome_completo', 'name', 'nome_barbearia', 'barbearia_nome'])
    const savedPlan = profileValue(['plano', 'plan', 'nome_plano'])
    if (savedName) setProfileName(savedName.trim())
    if (savedPlan) {
      const cleanPlan = savedPlan.replace(/^plano\s+/i, '').trim()
      setPlanLabel('Plano ' + (cleanPlan ? cleanPlan.charAt(0).toUpperCase() + cleanPlan.slice(1).toLowerCase() : 'Free'))
    }    const result = await supabase.from('clientes').select('id,nome,telefone,data_ultimo_corte,data_nascimento').eq('user_id', user.id).order('data_ultimo_corte', { ascending: true })
    let data = result.data as Array<{ id: string; nome: string; telefone: string; data_ultimo_corte: string; data_nascimento?: string | null }> | null
    let error = result.error
    const errorMessage = error?.message?.toLowerCase() ?? ''
    if (error && (error.code === '42703' || (errorMessage.includes('data_nascimento') && errorMessage.includes('column')))) {
      const fallback = await supabase.from('clientes').select('id,nome,telefone,data_ultimo_corte').eq('user_id', user.id).order('data_ultimo_corte', { ascending: true })
      data = fallback.data as Array<{ id: string; nome: string; telefone: string; data_ultimo_corte: string; data_nascimento?: string | null }> | null
      error = fallback.error
    }
    if (error) { setStatus('Erro ao carregar clientes: ' + error.message); return }
    const rows = (data ?? []) as Array<{ id: string; nome: string; telefone: string; data_ultimo_corte: string; data_nascimento?: string | null }>
    setClients(rows.map(client => ({ id: client.id, name: client.nome, phone: client.telefone, last_cut_at: client.data_ultimo_corte, status_calculado: undefined, frequency: undefined, birthday: client.data_nascimento ?? undefined })))
  }  useEffect(() => { void loadClients() }, [])
  const filteredClientes = useMemo(() => { const source = clients.length ? clients : sample; const normalizedSearch = searchTerm.trim().toLowerCase(); return source.filter(client => { const matchesSearch = (client.name + ' ' + client.phone).toLowerCase().includes(normalizedSearch); const normalizedFrequency = client.frequency?.toLowerCase(); const matchesFrequency = frequencyFilter === 'todos' || !normalizedFrequency || normalizedFrequency === frequencyFilter; return matchesSearch && matchesFrequency }) }, [clients, searchTerm, frequencyFilter])
  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || isUploading) return
    setIsUploading(true)
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean)
      const parsed = rows.slice(1).map(row => {
        const [name, phone, date] = row.split(',').map(value => value.trim().replace(/^"|"$/g, ''))
        return { name, phone: phone.replace(/\D/g, ''), last_cut_at: date }
      }).filter(row => row.name && row.phone && row.last_cut_at)
      if (!parsed.length) {
        setStatus('Nao encontramos linhas validas no CSV.')
        return
      }
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus('Sua sessao expirou. Entre novamente.')
        return
      }
      const { error } = await supabase.from('clientes').insert(parsed.map(row => ({ nome: row.name, telefone: row.phone, data_ultimo_corte: row.last_cut_at, barbearia_id: user.id, user_id: user.id })))
      if (error) {
        setStatus('Erro ao importar clientes: ' + error.message)
        return
      }
      await loadClients()
      setStatus('Clientes importados com sucesso!')
    } catch (error) {
      setStatus('Erro ao importar clientes: ' + (error instanceof Error ? error.message : 'falha inesperada'))
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }
    const dashboardClients = clients.length ? clients : sample
  const sumidoCount = dashboardClients.filter(c => getRetentionStatus(c) === 'sumido').length
  const atRisk = sumidoCount * 60
  const estimatedRecoveries = Math.min(sumidoCount, 2)
  const roiMultiple = estimatedRecoveries === 0 ? 0 : estimatedRecoveries
  return <main className="min-h-screen bg-slate-950"><header className="border-b border-slate-800 bg-slate-950"><div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5 lg:px-10"><div className="flex flex-1 items-center"><p className="truncate text-sm font-semibold text-white sm:text-base">Bom dia, {firstName}</p></div><Link href="/assinatura" className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:shadow-[0_0_18px_rgba(52,211,153,0.15)]"><Sparkles size={14} className="text-emerald-400" /><span>{planLabel} Ativo</span></Link><div className="flex flex-1 justify-end"><span className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300"><User size={15} className="text-emerald-400" />{displayName}</span></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10"><div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 w-full"><div><p className="text-sm font-medium text-emerald-400">Visao geral</p><p className="mt-2 text-slate-400">Veja quem esta esperando por um novo corte.</p></div><div><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" /><button disabled={isUploading} onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><FileUp size={17} /> {isUploading ? 'Importando...' : 'Importar planilha CSV'}</button></div></div>
      {status && <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><CheckCircle2 size={17} />{status}</div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"><MoneyOnTableCard value={atRisk} sumidoCount={sumidoCount} /><RoiBadge multiple={roiMultiple} recoveries={estimatedRecoveries} /><Stat icon={<Users size={18} />} label="Total de clientes" value={dashboardClients.length} /><Stat icon={<CalendarDays size={18} />} label="Cortes este mes" value={dashboardClients.filter(c => new Date(c.last_cut_at).getMonth() === new Date().getMonth()).length} /></div>
      <BirthdayPanel clients={dashboardClients} />
      <HealthBaseChart clients={dashboardClients} />
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Sua base de clientes</h2><p className="mt-1 text-sm text-slate-500">Clientes ha mais de 30 dias aparecem destacados.</p></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente" className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 sm:w-56" /></div><select value={frequencyFilter} onChange={event => setFrequencyFilter(event.target.value)} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-slate-900"><option value="todos">Todas as frequencias</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Telefone</th><th className="px-5 py-4 font-medium">Ultimo corte</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-slate-800">{filteredClientes.length ? filteredClientes.map(client => <ClientRow key={client.id} client={client} onSelect={() => setSelectedClient(client)} />) : <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Nenhum cliente encontrado com estes filtros.</td></tr>}</tbody></table></div>{!clients.length && <p className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">Exibindo exemplos para voce visualizar a tela. Importe sua planilha para comecar.</p>}</section>
    </div><ClientDrawer client={selectedClient} onClose={() => setSelectedClient(null)} /></main>
}
function MoneyOnTableCard({ value, sumidoCount }: { value: number; sumidoCount: number }) {
  const displayedValue = useCountUp(value)
  return <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 text-white shadow-sm"><div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" /><div className="relative flex h-full flex-col justify-between gap-4"><p className="text-sm font-medium text-slate-300">Dinheiro na Mesa</p><div><p className="text-2xl font-bold tracking-[-.04em] text-emerald-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayedValue)}</p><p className="mt-1 text-xs text-slate-300">{countLabel(sumidoCount, 'cliente sumido', 'clientes sumidos')}</p></div></div></div>
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const displayedValue = useCountUp(value)
  return <div className="h-full rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm backdrop-blur-md"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">{icon}</div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-.04em] text-white">{displayedValue}</p></div>
}
function RoiBadge({ multiple, recoveries }: { multiple: number; recoveries: number }) {
  const displayedMultiple = useCountUp(multiple)
  return <div className="h-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-sm"><p className="text-sm font-medium text-slate-500">Retorno do Sistema</p><p className="mt-2 text-2xl font-bold text-emerald-300">{multiple === 0 ? 'Pronto para o primeiro resgate!' : 'O sistema ja se pagou ' + displayedMultiple + ' vezes!'}</p><p className="mt-1 text-xs text-emerald-300/80">Estimativa com {countLabel(recoveries, 'resgate', 'resgates')} hipoteticos.</p></div>
}
function getRetentionStatus(client: Client): 'em_dia' | 'alerta' | 'sumido' {
  if (client.status_calculado === 'sumido' || client.status_calculado === 'alerta' || client.status_calculado === 'em_dia') return client.status_calculado
  const days = (Date.now() - new Date(client.last_cut_at + 'T12:00:00').getTime()) / 86400000
  return days >= 35 ? 'sumido' : days > 25 ? 'alerta' : 'em_dia'
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits
  if (local.length === 11) return '(' + local.slice(0, 2) + ') ' + local.slice(2, 7) + '-' + local.slice(7)
  if (local.length === 10) return '(' + local.slice(0, 2) + ') ' + local.slice(2, 6) + '-' + local.slice(6)
  return phone
}
function BirthdayPanel({ clients }: { clients: Client[] }) {
  const now = new Date()
  const month = now.getMonth()
  const currentDay = now.getDate()
  const birthdayClients = clients.filter((client) => {
    if (!client.birthday) return false
    const parts = client.birthday.split('-').map(Number)
    return parts[1] - 1 === month
  }).sort((first, second) => Number(first.birthday?.slice(-2)) - Number(second.birthday?.slice(-2)))

  function openBirthdayWhatsApp(client: Client) {
    const digits = client.phone.replace(/\D/g, '')
    const phone = digits.startsWith('55') ? digits : '55' + digits
    const firstName = client.name.split(' ')[0]
    const message = 'Oi, ' + firstName + '! Feliz aniversario! Para comemorar, seu proximo corte tem 15% de desconto com o cupom BARBER15. Quer reservar seu horario?'
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer')
  }

  return <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2 text-amber-400"><Cake size={18} /></div><div><h2 className="font-semibold text-white">Aniversariantes do mes</h2><p className="mt-1 text-xs text-slate-500">Parabenize seus clientes e ofereca 15% de desconto no proximo corte.</p></div></div><span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">{birthdayClients.length} neste mes</span></div>{birthdayClients.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{birthdayClients.map((client) => { const day = Number(client.birthday?.slice(-2)); const thisWeek = day >= currentDay && day <= currentDay + 7; return <div key={client.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{client.name}</p><p className="mt-1 text-xs text-slate-500">Dia {String(day).padStart(2, '0')} {thisWeek ? '- Nesta semana' : ''}</p></div><button type="button" onClick={() => openBirthdayWhatsApp(client)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"><MessageCircle size={14} /> WhatsApp</button></div> })}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-4 text-center text-sm text-slate-500">Nenhum aniversariante cadastrado neste mes. Adicione datas no cadastro de clientes.</div>}</section>
}
function HealthBaseChart({ clients }: { clients: Client[] }) {
  const totals = clients.reduce((summary, client) => {
    summary[getRetentionStatus(client)] += 1
    return summary
  }, { em_dia: 0, alerta: 0, sumido: 0 })
  const total = clients.length || 1
  const retained = Math.round((totals.em_dia / total) * 100)
  const alert = Math.round((totals.alerta / total) * 100)
  const risk = Math.max(0, 100 - retained - alert)
  return <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm"><h3 className="mb-3 text-sm font-semibold text-slate-300">Saude da Base de Clientes</h3><div className="mb-2 flex h-3 w-full overflow-hidden rounded-full"><div className="bg-emerald-500" style={{ width: retained + '%' }} /><div className="bg-amber-400" style={{ width: alert + '%' }} /><div className="bg-rose-500" style={{ width: risk + '%' }} /></div><div className="flex justify-between text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{retained}% Retidos</span><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />{alert}% Em Alerta</span><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-rose-500" />{risk}% Em Risco</span></div></div>
}

function ClientDrawer({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [history, setHistory] = useState<Array<{ id: string; mensagem_enviada: string; status: string; enviado_em: string }>>([])
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'amigavel' | 'oferta' | 'direto'>('amigavel')
  const [generating, setGenerating] = useState(false)
  useEffect(() => {
    if (!client) return
    setNote(window.localStorage.getItem('prontusfy-note-' + client.id) ?? '')
    setMessage(buildWhatsAppMessage(client.name))
    createClient().from('historico_disparos').select('id,mensagem_enviada,status,enviado_em').eq('cliente_id', client.id).order('enviado_em', { ascending: false }).then(({ data }) => setHistory((data ?? []) as Array<{ id: string; mensagem_enviada: string; status: string; enviado_em: string }>))
  }, [client])
  if (!client) return null
  const clientId = client.id
  const clientName = client.name
  function saveNote() { window.localStorage.setItem('prontusfy-note-' + clientId, note) }
  async function generateVariation(nextTone = tone) {
    setTone(nextTone)
    setGenerating(true)
    try {
      const response = await fetch('/api/messages/variation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: clientName, tone: nextTone, bookingUrl }) })
      const data = await response.json() as { message?: string }
      if (data.message) setMessage(data.message)
    } finally {
      setGenerating(false)
    }
  }
  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Fechar detalhes" onClick={onClose} className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" /><aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detalhes do cliente</p><h2 className="mt-2 text-2xl font-semibold text-white">{client.name}</h2><p className="mt-1 text-sm text-slate-500">{formatPhone(client.phone)}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-950 hover:text-white"><X size={18} /></button></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-950 p-3"><p className="text-xs text-slate-500">Ultimo corte</p><p className="mt-1 text-sm font-semibold text-white">{formatDate(client.last_cut_at)}</p></div><div className="rounded-lg bg-slate-950 p-3"><p className="text-xs text-slate-500">Frequencia</p><p className="mt-1 text-sm font-semibold capitalize text-white">{client.frequency ?? 'Nao informada'}</p></div></div><div className="mt-6"><h3 className="font-semibold text-white">Mensagem de reativacao</h3><div className="mt-3 flex gap-2"><button onClick={() => generateVariation('amigavel')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'amigavel' ? 'bg-slate-900 text-white' : 'bg-slate-950 text-slate-300')}>Amigavel</button><button onClick={() => generateVariation('oferta')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'oferta' ? 'bg-slate-900 text-white' : 'bg-slate-950 text-slate-300')}>Oferta</button><button onClick={() => generateVariation('direto')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'direto' ? 'bg-slate-900 text-white' : 'bg-slate-950 text-slate-300')}>Direto</button></div><textarea value={message} onChange={event => setMessage(event.target.value)} className="mt-3 min-h-28 w-full resize-none rounded-lg border border-slate-800 p-3 text-sm leading-6 outline-none focus:border-slate-900" /><div className="mt-3 flex gap-2"><button disabled={generating} onClick={() => generateVariation()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60">{generating ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}Gerar variacao com IA</button><a href={'https://wa.me/' + client.phone + '?text=' + encodeURIComponent(message)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"><MessageCircle size={14} />Enviar</a></div></div><div className="mt-6"><h3 className="font-semibold text-white">Anotacoes</h3><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ex.: prefere degrade baixo..." className="mt-3 min-h-24 w-full resize-none rounded-lg border border-slate-800 p-3 text-sm outline-none focus:border-slate-900" /><button onClick={saveNote} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">Salvar anotacao</button></div><div className="mt-8"><div className="flex items-center justify-between"><h3 className="font-semibold text-white">Historico de disparos</h3><ChevronRight size={16} className="text-slate-400" /></div>{history.length ? <div className="mt-3 space-y-3">{history.map(item => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-3 text-xs text-slate-500"><span className="capitalize">{item.status}</span><span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.enviado_em))}</span></div><p className="mt-2 text-sm text-slate-300">{item.mensagem_enviada}</p></div>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-slate-800 px-3 py-4 text-sm text-slate-500">Nenhum disparo registrado ainda.</p>}</div></aside></div>
}
function ClientRow({ client, onSelect }: { client: Client; onSelect: () => void }) {
  const status = getRetentionStatus(client)
  const statusStyles = {
    sumido: 'bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium',
    alerta: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    em_dia: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium',
  }[status]
  const statusLabel = { sumido: '+30 dias', alerta: 'Alerta', em_dia: 'Em dia' }[status]
  const overdue = status === 'sumido'
  const vipAtRisk = status === 'sumido'

  return <tr onClick={onSelect} className={'cursor-pointer border-b border-slate-800 transition-colors hover:bg-slate-800/60 ' + (overdue ? 'bg-rose-500/5' : '')}>
    <td className="px-5 py-4 font-medium text-slate-200"><div className="flex items-center gap-3"><span className={'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ' + (overdue ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300')}>{client.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>{client.name}{vipAtRisk && <span className="ml-2 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">VIP em risco</span>}</div></td>
    <td className="px-5 py-4 text-slate-400">{formatPhone(client.phone)}</td>
    <td className="px-5 py-4 text-slate-400">{formatDate(client.last_cut_at)}</td>
    <td className="px-5 py-4"><span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' + statusStyles + (status === 'sumido' ? ' animate-pulse' : '')}>{status === 'sumido' ? <AlertCircle size={13} /> : status === 'alerta' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{statusLabel}</span></td>
    <td className="px-5 py-4 text-right"><a onClick={event => event.stopPropagation()} href={'https://wa.me/' + client.phone + '?text=' + encodeURIComponent(buildWhatsAppMessage(client.name))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700"><MessageCircle size={14} /> WhatsApp</a></td>
  </tr>
}

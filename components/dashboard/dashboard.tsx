'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clipboard, FileUp, Gift, LoaderCircle, LogOut, MessageCircle, Search, Scissors, Sparkles, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Client = { id: string; name: string; phone: string; last_cut_at: string; status_calculado?: string; frequency?: 'semanal' | 'quinzenal' | 'mensal'; birthday?: string }
const sample: Client[] = [{ id: '1', name: 'Mariana Costa', phone: '5571998765432', last_cut_at: '2026-07-17' }, { id: '2', name: 'Lucas Almeida', phone: '5571987654321', last_cut_at: '2026-06-12' }, { id: '3', name: 'Rafael Santos', phone: '5571991234567', last_cut_at: '2026-05-28' }]
const isOverdue = (date: string) => (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000 > 30
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ?? ''
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
  const callToAction = bookingUrl ? ' Agende aqui: ' + bookingUrl : ''
  return 'Oi, ' + name.split(' ')[0] + '! Tudo bem? Já faz um tempinho desde seu último corte. Quer reservar um horário?' + callToAction
}
export function Dashboard({ userEmail }: { userEmail: string }) {
  const [clients, setClients] = useState<Client[]>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [frequency, setFrequency] = useState('todos'); const [selectedClient, setSelectedClient] = useState<Client | null>(null); const fileRef = useRef<HTMLInputElement>(null)
  async function loadClients() { const { data, error } = await createClient().from('vw_clientes_status').select('id,nome,telefone,data_ultimo_corte,status_calculado').order('data_ultimo_corte', { ascending: true }); if (error) { setStatus('Erro ao carregar clientes: ' + error.message); return } setClients((data ?? []).map(client => ({ id: client.id, name: client.nome, phone: client.telefone, last_cut_at: client.data_ultimo_corte, status_calculado: client.status_calculado, frequency: undefined, birthday: undefined }))) }
  useEffect(() => { void loadClients() }, [])
  const visible = useMemo(() => clients.filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(search.toLowerCase()) && (frequency === 'todos' || c.frequency === frequency)), [clients, search, frequency])
  async function importCsv(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); const rows = text.split(/\r?\n/).filter(Boolean); const parsed = rows.slice(1).map(row => { const [name, phone, date] = row.split(',').map(v => v.trim().replace(/^"|"$/g, '')); return { name, phone: phone.replace(/\D/g, ''), last_cut_at: date } }).filter(row => row.name && row.phone && row.last_cut_at); if (!parsed.length) return setStatus('Não encontramos linhas válidas no CSV.'); const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return setStatus('Sua sessão expirou. Entre novamente.'); const { error } = await supabase.from('clientes').insert(parsed.map(row => ({ nome: row.name, telefone: row.phone, data_ultimo_corte: row.last_cut_at, barbearia_id: user.id }))); if (error) return setStatus('Erro ao importar: ' + error.message); await loadClients(); setStatus(`${countLabel(parsed.length, 'cliente', 'clientes')} ${parsed.length === 1 ? 'importado' : 'importados'} com sucesso.`); event.target.value = '' }
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/' }
  const dashboardClients = clients.length ? clients : sample
  const sumidoCount = dashboardClients.filter(c => getRetentionStatus(c) === 'sumido').length
  const atRisk = sumidoCount * 60
  const estimatedRecoveries = Math.min(sumidoCount, 2)
  const roiMultiple = estimatedRecoveries === 0 ? 0 : estimatedRecoveries
  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200/80 bg-white shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><div className="flex items-center gap-3 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white"><Scissors size={17} /></span> BarberGrowth</div><div className="flex items-center gap-4"><span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:block">{userEmail}</span><button onClick={signOut} className="rounded-lg p-2 text-[#78847c] transition hover:bg-[#eef2ed]" title="Sair"><LogOut size={17} /></button></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-[#1c6b49]">Visão geral</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Bom dia, barbeiro.</h1><p className="mt-2 text-[#78847c]">Veja quem está esperando por um novo corte.</p></div><div><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" /><button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"><FileUp size={17} /> Importar planilha CSV</button></div></div>
      {status && <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#dce9dd] bg-[#f0f8f0] px-4 py-3 text-sm text-[#276243]"><CheckCircle2 size={17} />{status}</div>}
      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4"><div className="md:col-span-2"><MoneyOnTableCard value={atRisk} sumidoCount={sumidoCount} /></div><div className="md:col-span-2"><RoiBadge multiple={roiMultiple} recoveries={estimatedRecoveries} /></div><Stat icon={<Users size={18} />} label="Total de clientes" value={dashboardClients.length} /><Stat icon={<CalendarDays size={18} />} label="Cortes este m&ecirc;s" value={dashboardClients.filter(c => new Date(c.last_cut_at).getMonth() === new Date().getMonth()).length} /></section>
      <div className="mt-4 grid grid-cols-1 gap-4"><BirthdayModule /></div>
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-[#e8ece7] px-5 py-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Sua base de clientes</h2><p className="mt-1 text-sm text-[#89948d]">Clientes há mais de 30 dias aparecem destacados.</p></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-[#9aa59e]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente" className="w-full rounded-lg border border-[#e4e8e2] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1c6b49] sm:w-56" /></div><select value={frequency} onChange={event => setFrequency(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-900"><option value="todos">Todas as frequências</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Telefone</th><th className="px-5 py-4 font-medium">Último corte</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-slate-100">{(visible.length ? visible : sample).map(client => <ClientRow key={client.id} client={client} onSelect={() => setSelectedClient(client)} />)}</tbody></table></div>{!clients.length && <p className="border-t border-slate-100 px-5 py-4 text-xs text-[#89948d]">Exibindo exemplos para você visualizar a tela. Importe sua planilha para começar.</p>}</section>
    </div><ClientDrawer client={selectedClient} onClose={() => setSelectedClient(null)} /></main>
}
function MoneyOnTableCard({ value, sumidoCount }: { value: number; sumidoCount: number }) {
  const displayedValue = useCountUp(value)
  return <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-lg shadow-slate-900/15">
    <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
    <div className="relative flex h-full flex-col justify-between gap-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">Dinheiro na mesa</p><h2 className="mt-3 max-w-md text-2xl font-semibold tracking-[-.03em]">Você tem dinheiro parado na rua este mês.</h2></div></div>
      <div><p className="text-5xl font-bold tracking-[-.06em] text-emerald-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayedValue)}</p><p className="mt-3 text-sm text-slate-300">{countLabel(sumidoCount, 'cliente', 'clientes')} sumidos &times; R$ 60,00 de ticket m&eacute;dio estimado.</p></div>
    </div>
  </div>
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const displayedValue = useCountUp(value)
  return <div className="rounded-xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-md"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold tracking-[-.04em] text-slate-900">{displayedValue}</p></div>
}
function RoiBadge({ multiple, recoveries }: { multiple: number; recoveries: number }) {
  const displayedMultiple = useCountUp(multiple)
  return <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-800 shadow-sm backdrop-blur-md"><p className="font-semibold text-slate-900">Retorno do Sistema</p><p className="mt-2 font-semibold">{multiple === 0 ? 'Pronto para o primeiro resgate!' : `O sistema j&aacute; se pagou ${displayedMultiple} vezes!`}</p><p className="mt-1 text-xs text-emerald-700/80">Estimativa com {countLabel(recoveries, 'resgate', 'resgates')} hipot&eacute;ticos.</p></div>
}function getRetentionStatus(client: Client): 'em_dia' | 'alerta' | 'sumido' {
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
function BirthdayModule() {
  const [copied, setCopied] = useState(false)
  const template = 'Oi! Feliz aniversário, [nome]! Para comemorar, seu próximo corte tem 15% de desconto. Quer reservar seu horário?'
  async function copyTemplate() {
    await navigator.clipboard?.writeText(template)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md"><div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Gift size={18} /></span><div><p className="font-semibold text-slate-900">Aniversariantes</p><p className="mt-1 text-xs text-slate-500">Cadastre datas de nascimento para ativar ofertas personalizadas.</p></div></div><button onClick={copyTemplate} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-700 transition hover:text-slate-900">{copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />}{copied ? 'Template copiado' : 'Copiar template de 15% OFF'}</button></div>
}

function ClientDrawer({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [history, setHistory] = useState<Array<{ id: string; mensagem_enviada: string; status: string; enviado_em: string }>>([])
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'amigavel' | 'oferta' | 'direto'>('amigavel')
  const [generating, setGenerating] = useState(false)
  useEffect(() => {
    if (!client) return
    setNote(window.localStorage.getItem('barbergrowth-note-' + client.id) ?? '')
    setMessage(buildWhatsAppMessage(client.name))
    createClient().from('historico_disparos').select('id,mensagem_enviada,status,enviado_em').eq('cliente_id', client.id).order('enviado_em', { ascending: false }).then(({ data }) => setHistory((data ?? []) as Array<{ id: string; mensagem_enviada: string; status: string; enviado_em: string }>))
  }, [client])
  if (!client) return null
  const clientId = client.id
  const clientName = client.name
  function saveNote() { window.localStorage.setItem('barbergrowth-note-' + clientId, note) }
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
  return <div className="fixed inset-0 z-50 flex justify-end"><button aria-label="Fechar detalhes" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-900/30 backdrop-blur-sm" /><aside className="relative h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detalhes do cliente</p><h2 className="mt-2 text-2xl font-semibold text-slate-900">{client.name}</h2><p className="mt-1 text-sm text-slate-500">{formatPhone(client.phone)}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={18} /></button></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Último corte</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(client.last_cut_at)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Frequência</p><p className="mt-1 text-sm font-semibold capitalize text-slate-900">{client.frequency ?? 'Não informada'}</p></div></div><div className="mt-6"><h3 className="font-semibold text-slate-900">Mensagem de reativação</h3><div className="mt-3 flex gap-2"><button onClick={() => generateVariation('amigavel')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'amigavel' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>Amigável</button><button onClick={() => generateVariation('oferta')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'oferta' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>Oferta</button><button onClick={() => generateVariation('direto')} className={'rounded-full px-3 py-1.5 text-xs font-semibold ' + (tone === 'direto' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>Direto</button></div><textarea value={message} onChange={event => setMessage(event.target.value)} className="mt-3 min-h-28 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-slate-900" /><div className="mt-3 flex gap-2"><button disabled={generating} onClick={() => generateVariation()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60">{generating ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}Gerar variação com IA</button><a href={'https://wa.me/' + client.phone + '?text=' + encodeURIComponent(message)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"><MessageCircle size={14} />Enviar</a></div></div><div className="mt-6"><h3 className="font-semibold text-slate-900">Anotações</h3><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ex.: prefere degradê baixo..." className="mt-3 min-h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-900" /><button onClick={saveNote} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">Salvar anotação</button></div><div className="mt-8"><div className="flex items-center justify-between"><h3 className="font-semibold text-slate-900">Histórico de disparos</h3><ChevronRight size={16} className="text-slate-400" /></div>{history.length ? <div className="mt-3 space-y-3">{history.map(item => <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="flex justify-between gap-3 text-xs text-slate-500"><span className="capitalize">{item.status}</span><span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(item.enviado_em))}</span></div><p className="mt-2 text-sm text-slate-700">{item.mensagem_enviada}</p></div>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">Nenhum disparo registrado ainda.</p>}</div></aside></div>
}
function ClientRow({ client, onSelect }: { client: Client; onSelect: () => void }) {
  const status = getRetentionStatus(client)
  const statusStyles = {
    sumido: 'bg-rose-100 text-rose-800 border border-rose-200 font-medium',
    alerta: 'bg-amber-50 text-amber-700 border border-amber-200',
    em_dia: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium',
  }[status]
  const statusLabel = { sumido: '+30 dias', alerta: 'Alerta', em_dia: 'Em dia' }[status]
  const overdue = status === 'sumido'
  const vipAtRisk = status === 'sumido'

  return <tr onClick={onSelect} className={'cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 ' + (overdue ? 'bg-red-50/30' : '')}>
    <td className="px-5 py-5 font-medium"><div className="flex items-center gap-3"><span className={'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ' + (overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>{client.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>{client.name}{vipAtRisk && <span className="ml-2 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">VIP em risco</span>}</div></td>
    <td className="px-5 py-5 text-slate-600">{formatPhone(client.phone)}</td>
    <td className="px-5 py-5 text-slate-600">{formatDate(client.last_cut_at)}</td>
    <td className="px-5 py-5"><span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' + statusStyles + (status === 'sumido' ? ' animate-pulse' : '')}>{status === 'sumido' ? <AlertCircle size={13} /> : status === 'alerta' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{statusLabel}</span></td>
    <td className="px-5 py-5 text-right"><a onClick={event => event.stopPropagation()} href={'https://wa.me/' + client.phone + '?text=' + encodeURIComponent(buildWhatsAppMessage(client.name))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-700"><MessageCircle size={14} /> WhatsApp</a></td>
  </tr>
}

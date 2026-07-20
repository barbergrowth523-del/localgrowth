'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, FileUp, LogOut, MessageCircle, MoreHorizontal, Search, Scissors, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Client = { id: string; name: string; phone: string; last_cut_at: string; status_calculado?: string }
const sample: Client[] = [{ id: '1', name: 'Mariana Costa', phone: '5571998765432', last_cut_at: '2026-07-17' }, { id: '2', name: 'Lucas Almeida', phone: '5571987654321', last_cut_at: '2026-06-12' }, { id: '3', name: 'Rafael Santos', phone: '5571991234567', last_cut_at: '2026-05-28' }]
const isOverdue = (date: string) => (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000 > 30
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).replace('.', '')

export function Dashboard({ userEmail }: { userEmail: string }) {
  const [clients, setClients] = useState<Client[]>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const fileRef = useRef<HTMLInputElement>(null)
  async function loadClients() { const { data, error } = await createClient().from('vw_clientes_status').select('id,nome,telefone,data_ultimo_corte,status_calculado').order('data_ultimo_corte', { ascending: true }); if (error) { setStatus('Erro ao carregar clientes: ' + error.message); return } setClients((data ?? []).map(client => ({ id: client.id, name: client.nome, phone: client.telefone, last_cut_at: client.data_ultimo_corte, status_calculado: client.status_calculado }))) }
  useEffect(() => { void loadClients() }, [])
  const visible = useMemo(() => clients.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())), [clients, search])
  async function importCsv(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const text = await file.text(); const rows = text.split(/\r?\n/).filter(Boolean); const parsed = rows.slice(1).map(row => { const [name, phone, date] = row.split(',').map(v => v.trim().replace(/^"|"$/g, '')); return { name, phone: phone.replace(/\D/g, ''), last_cut_at: date } }).filter(row => row.name && row.phone && row.last_cut_at); if (!parsed.length) return setStatus('Não encontramos linhas válidas no CSV.'); const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return setStatus('Sua sessão expirou. Entre novamente.'); const { error } = await supabase.from('clientes').insert(parsed.map(row => ({ nome: row.name, telefone: row.phone, data_ultimo_corte: row.last_cut_at, barbearia_id: user.id }))); if (error) return setStatus('Erro ao importar: ' + error.message); await loadClients(); setStatus(`${parsed.length} cliente(s) importado(s) com sucesso.`); event.target.value = '' }
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/' }
  const overdue = clients.filter(c => isOverdue(c.last_cut_at)).length
  return <main className="min-h-screen bg-slate-100"><header className="border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><div className="flex items-center gap-3 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c6b49] text-white"><Scissors size={17} /></span> BarberGrowth</div><div className="flex items-center gap-4"><span className="hidden text-sm text-[#78847c] sm:block">{userEmail}</span><button onClick={signOut} className="rounded-lg p-2 text-[#78847c] transition hover:bg-[#eef2ed]" title="Sair"><LogOut size={17} /></button></div></div></header>
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-[#1c6b49]">Visão geral</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em]">Bom dia, barbeiro.</h1><p className="mt-2 text-[#78847c]">Veja quem está esperando por um novo corte.</p></div><div><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" /><button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-[#1c6b49] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15563a]"><FileUp size={17} /> Importar planilha CSV</button></div></div>
      {status && <div className="mt-6 flex items-center gap-2 rounded-xl border border-[#dce9dd] bg-[#f0f8f0] px-4 py-3 text-sm text-[#276243]"><CheckCircle2 size={17} />{status}</div>}
      <div className="mt-10 grid gap-4 sm:grid-cols-3"><Stat icon={<Users size={18} />} label="Total de clientes" value={clients.length} /><Stat icon={<AlertCircle size={18} />} label="Precisam de atenção" value={overdue} danger /><Stat icon={<CalendarDays size={18} />} label="Cortes este mês" value={clients.filter(c => new Date(c.last_cut_at).getMonth() === new Date().getMonth()).length} /></div>
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-col justify-between gap-4 border-b border-[#e8ece7] px-5 py-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Sua base de clientes</h2><p className="mt-1 text-sm text-[#89948d]">Clientes há mais de 30 dias aparecem destacados.</p></div><div className="relative"><Search size={16} className="absolute left-3 top-3 text-[#9aa59e]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente" className="w-full rounded-lg border border-[#e4e8e2] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1c6b49] sm:w-56" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600"><tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Telefone</th><th className="px-5 py-4 font-medium">Último corte</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-slate-100">{(visible.length ? visible : sample).map(client => <ClientRow key={client.id} client={client} />)}</tbody></table></div>{!clients.length && <p className="border-t border-slate-100 px-5 py-4 text-xs text-[#89948d]">Exibindo exemplos para você visualizar a tela. Importe sua planilha para começar.</p>}</section>
    </div></main>
}
function Stat({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) { return <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-lg ${danger ? 'bg-[#fff0ee] text-[#c94a43]' : 'bg-[#eaf4eb] text-[#1c6b49]'}`}>{icon}</div><p className="text-sm text-[#89948d]">{label}</p><p className="mt-1 text-3xl font-semibold tracking-[-.04em]">{value}</p></div> }
function getRetentionStatus(client: Client): 'em_dia' | 'alerta' | 'sumido' {
  if (client.status_calculado === 'sumido' || client.status_calculado === 'alerta' || client.status_calculado === 'em_dia') return client.status_calculado
  const days = (Date.now() - new Date(client.last_cut_at + 'T12:00:00').getTime()) / 86400000
  return days >= 35 ? 'sumido' : days > 25 ? 'alerta' : 'em_dia'
}

function ClientRow({ client }: { client: Client }) {
  const status = getRetentionStatus(client)
  const statusStyles = {
    sumido: 'bg-red-50 text-red-700 border border-red-200',
    alerta: 'bg-amber-50 text-amber-700 border border-amber-200',
    em_dia: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }[status]
  const statusLabel = { sumido: '+30 dias', alerta: 'Alerta', em_dia: 'Em dia' }[status]
  const overdue = status === 'sumido'

  return <tr className={'border-b border-slate-100 transition-colors hover:bg-slate-50/80 ' + (overdue ? 'bg-red-50/30' : '')}>
    <td className="px-5 py-5 font-medium"><div className="flex items-center gap-3"><span className={'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ' + (overdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>{client.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>{client.name}</div></td>
    <td className="px-5 py-5 text-slate-600">{client.phone}</td>
    <td className="px-5 py-5 text-slate-600">{formatDate(client.last_cut_at)}</td>
    <td className="px-5 py-5"><span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' + statusStyles}>{status === 'sumido' ? <AlertCircle size={13} /> : status === 'alerta' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{statusLabel}</span></td>
    <td className="px-5 py-5 text-right"><a href={'https://wa.me/' + client.phone + '?text=' + encodeURIComponent('Oi! Tudo bem? Quer reservar um horário?')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</a></td>
  </tr>
}

'use client'

import { Clipboard, Copy, MessageCircle, Plus, Printer, QrCode, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Frequency = 'semanal' | 'quinzenal' | 'mensal'
type Client = { id: string; nome: string; telefone: string; ultimoCorte: string; frequencia: Frequency; novo: boolean }

const initialClients: Client[] = [
  { id: 'sample-1', nome: 'Pedro Souza', telefone: '(74) 98888-7777', ultimoCorte: '2026-05-15', frequencia: 'mensal', novo: false },
  { id: 'sample-2', nome: 'Lucas Almeida', telefone: '(74) 99111-2233', ultimoCorte: '2026-06-10', frequencia: 'quinzenal', novo: false },
  { id: 'sample-3', nome: 'Carlos Silva', telefone: '(74) 99999-4455', ultimoCorte: '2026-04-02', frequencia: 'mensal', novo: false },
]

const signupUrl = '/cadastrar?barbearia=jacobina'
const qrImageUrl = 'https://quickchart.io/qr?size=260&text=' + encodeURIComponent(signupUrl)

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Client[]>(initialClients)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ nome: '', telefone: '', ultimoCorte: '', frequencia: 'mensal' as Frequency, novo: false })

  useEffect(() => { void loadClients() }, [])

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return clientes.filter((cliente) => (cliente.nome + ' ' + cliente.telefone).toLowerCase().includes(termo))
  }, [busca, clientes])

  async function loadClients() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
    const { data, error } = await supabase.from('clientes').select('id,nome,telefone,data_ultimo_corte').eq('user_id', user.id).order('data_ultimo_corte', { ascending: true })
    if (error) { setStatus('Erro ao carregar clientes: ' + error.message); return }
    if (!data?.length) { setClientes(initialClients); return }
    setClientes(data.map((cliente) => ({ id: String(cliente.id), nome: cliente.nome, telefone: cliente.telefone, ultimoCorte: cliente.data_ultimo_corte, frequencia: 'mensal', novo: false })))
  }

  function closeModal() {
    setModalOpen(false)
    setForm({ nome: '', telefone: '', ultimoCorte: '', frequencia: 'mensal', novo: false })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); setSaving(false); return }
    const date = form.novo ? new Date().toISOString().slice(0, 10) : form.ultimoCorte
    const { error } = await supabase.from('clientes').insert({ nome: form.nome.trim(), telefone: form.telefone.trim(), data_ultimo_corte: date, barbearia_id: user.id, user_id: user.id })
    if (error) { setStatus('Erro ao salvar cliente: ' + error.message); setSaving(false); return }
    await loadClients()
    setStatus('Cliente salvo com sucesso!')
    setSaving(false)
    closeModal()
  }

  async function deleteClient(cliente: Client) {
    if (cliente.id.startsWith('sample-')) { setClientes((current) => current.filter((item) => item.id !== cliente.id)); return }
    if (!window.confirm('Excluir cliente ' + cliente.nome + '?')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id).eq('user_id', user.id)
    if (error) { setStatus('Erro ao excluir cliente: ' + error.message); return }
    setClientes((current) => current.filter((item) => item.id !== cliente.id))
    setStatus('Cliente excluido com sucesso!')
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(signupUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function printSignupCard() {
    const printWindow = window.open('', '_blank', 'width=720,height=900')
    if (!printWindow) return
    printWindow.document.write('<!doctype html><html><head><title>Impressao da placa</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff;font-family:Arial,sans-serif;color:#0f172a}.card{width:620px;padding:56px 48px;text-align:center;border:1px solid #e2e8f0;border-radius:24px}.brand{font-size:28px;font-weight:800;letter-spacing:.04em;margin-bottom:12px}.title{font-size:22px;font-weight:700;margin:0 0 28px}.qr{width:260px;height:260px;object-fit:contain;margin:0 auto 28px}.instruction{font-size:18px;line-height:1.5;margin:0;color:#334155}@media print{.card{border:0;width:100%}}</style></head><body><main class="card"><div class="brand">Barbearia Jacobina</div><h1 class="title">Cadastro rapido de clientes</h1><img class="qr" src="' + qrImageUrl + '" alt="QR Code de cadastro" /><p class="instruction">Escaneie com a camera do celular para fazer seu cadastro rapido na barbearia!</p></main></body></html>')
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => { printWindow.print(); printWindow.close() }
  }

  function openWhatsApp(cliente: Client) {
    const telefone = cliente.telefone.replace(/\D/g, '')
    const mensagem = 'Fala ' + cliente.nome + ', tudo bem? Aqui e da barbearia! Passando para dar aquela moral no visual. Vamos agendar?'
    window.open('https://wa.me/' + telefone + '?text=' + encodeURIComponent(mensagem), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Users className="h-8 w-8 text-emerald-400" /> Meus Clientes</h1><p className="mt-1 text-sm text-slate-400">Gerencie sua base e acompanhe quem precisa retornar ao salao.</p></div><button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400"><UserPlus className="h-4 w-4" /> Novo Cliente</button></div>
      {status && <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl md:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400"><QrCode className="h-6 w-6" /></div><div><h2 className="text-lg font-bold text-white">Cadastro via QR Code (Auto-atendimento)</h2><p className="mt-1 text-sm text-slate-400">Deixe o cliente preencher os dados pelo celular no final do atendimento.</p></div></div><div className="flex flex-wrap gap-2"><button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-white"><Copy className="h-4 w-4" />{copied ? 'Link copiado' : 'Copiar Link'}</button><button onClick={printSignupCard} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"><Printer className="h-4 w-4" /> Imprimir PLACA</button></div></div><div className="mt-5 flex flex-col items-center gap-5 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row"><img src={qrImageUrl} alt="QR Code de cadastro rapido" className="h-32 w-32 shrink-0 rounded-lg bg-white p-2" /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Link de cadastro rapido</p><p className="mt-2 break-all rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-300">{signupUrl}</p><p className="mt-2 text-xs text-slate-500">Exiba este QR Code no balcao para acelerar novos cadastros.</p></div></div></section>
      <div className="relative mb-6"><Search className="absolute left-4 top-4 h-5 w-5 text-slate-500" /><input type="search" placeholder="Buscar cliente por nome ou telefone..." value={busca} onChange={(event) => setBusca(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500" /></div>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"><div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left"><thead><tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400"><th className="p-5">Cliente</th><th className="p-5">Telefone</th><th className="p-5">Ultimo Corte</th><th className="p-5">Frequencia</th><th className="p-5 text-right">Acao</th></tr></thead><tbody className="divide-y divide-slate-800 text-sm">{clientesFiltrados.length > 0 ? clientesFiltrados.map((cliente) => <ClientRow key={cliente.id} cliente={cliente} onWhatsApp={() => openWhatsApp(cliente)} onDelete={() => void deleteClient(cliente)} />) : <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>}</tbody></table></div></div>
      {modalOpen && <ClientModal form={form} setForm={setForm} saving={saving} onClose={closeModal} onSubmit={handleSubmit} />}
    </div>
  )
}

function ClientRow({ cliente, onWhatsApp, onDelete }: { cliente: Client; onWhatsApp: () => void; onDelete: () => void }) {
  return <tr className="transition hover:bg-slate-800/50"><td className="p-5 font-semibold text-slate-200">{cliente.nome}</td><td className="p-5 text-slate-400">{cliente.telefone}</td><td className="p-5 text-slate-400">{cliente.novo ? 'Novo cliente' : formatDate(cliente.ultimoCorte)}</td><td className="p-5 text-slate-400 capitalize">{cliente.frequencia}</td><td className="p-5 text-right"><div className="inline-flex gap-2"><button onClick={onWhatsApp} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</button><button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /> Excluir</button></div></td></tr>
}

function ClientModal({ form, setForm, saving, onClose, onSubmit }: { form: { nome: string; telefone: string; ultimoCorte: string; frequencia: Frequency; novo: boolean }; setForm: (value: { nome: string; telefone: string; ultimoCorte: string; frequencia: Frequency; novo: boolean }) => void; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-labelledby="client-modal-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 id="client-modal-title" className="text-xl font-bold text-white">Cadastrar novo cliente</h2><p className="mt-1 text-sm text-slate-400">Adicione um cliente manualmente na sua base.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="Fechar modal"><X className="h-5 w-5" /></button></div><form onSubmit={onSubmit} className="space-y-4"><Field label="Nome Completo" value={form.nome} onChange={(value) => setForm({ ...form, nome: value })} placeholder="Ex: Joao Silva" required /><Field label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm({ ...form, telefone: value })} placeholder="(00) 00000-0000" required /><label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300"><input type="checkbox" checked={form.novo} onChange={(event) => setForm({ ...form, novo: event.target.checked, ultimoCorte: '' })} className="h-4 w-4 accent-emerald-500" /> Novo cliente</label>{!form.novo && <Field label="Data do Ultimo Corte" type="date" value={form.ultimoCorte} onChange={(value) => setForm({ ...form, ultimoCorte: value })} required />}<label className="block text-sm text-slate-300">Frequencia esperada<select required value={form.frequencia} onChange={(event) => setForm({ ...form, frequencia: event.target.value as Frequency })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option></select></label><div className="flex justify-end gap-3 border-t border-slate-800 pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">Cancelar</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar cliente'}</button></div></form></div></div>
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-sm text-slate-300">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500" /></label>
}

function formatDate(date: string) {
  if (!date) return 'Nao informado'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date + 'T12:00:00')).replace('.', '')
}

'use client'

import { Bell, Clock, Clock3, MessageSquare, Pencil, Plus, Save, Settings, Store, Trash2, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Service = { id: string; nome: string; preco: number; duracao_minutos: number }
type ServiceForm = { nome: string; preco: string; duracao: string }
const emptyService: ServiceForm = { nome: '', preco: '', duracao: '30' }

export default function ConfiguracoesPage() {
  const [nomeBarbearia, setNomeBarbearia] = useState('Barbearia Jacobina')
  const [whatsapp, setWhatsapp] = useState('(74) 98888-7777')
  const [diasInativo, setDiasInativo] = useState('30')
  const [mensagemPadrao, setMensagemPadrao] = useState('Fala, {nome}! Tudo bem? Notamos que ja vai fazer um tempinho desde seu ultimo corte aqui na {barbearia}. Que tal dar aquela moral no visual essa semana? Clica aqui para agendar!')
  const [notifPainel, setNotifPainel] = useState(true)
  const [envioAutomatico, setEnvioAutomatico] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyService)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingService, setSavingService] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => { void loadServices() }, [])

  async function loadServices() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
    const { data, error } = await supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('user_id', user.id).order('nome')
    if (error) { setStatus('Erro ao carregar servicos: ' + error.message); return }
    setServices((data ?? []) as Service[])
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('Configuracoes salvas com sucesso!')
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const price = Number(serviceForm.preco.replace(',', '.'))
    const duration = Number(serviceForm.duracao)
    if (!serviceForm.nome.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0) { setStatus('Preencha nome, preco e duracao validos.'); return }
    setSavingService(true); setStatus('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); setSavingService(false); return }
    const payload = { nome: serviceForm.nome.trim(), preco: price, duracao_minutos: duration }
    const result = editingId ? await supabase.from('servicos').update(payload).eq('id', editingId).eq('user_id', user.id) : await supabase.from('servicos').insert({ ...payload, user_id: user.id })
    if (result.error) { setStatus('Erro ao salvar servico: ' + result.error.message); setSavingService(false); return }
    setServiceForm(emptyService); setEditingId(null); setStatus('Servico salvo com sucesso!'); await loadServices(); setSavingService(false)
  }

  function editService(service: Service) { setEditingId(service.id); setServiceForm({ nome: service.nome, preco: service.preco.toFixed(2).replace('.', ','), duracao: String(service.duracao_minutos) }) }
  function cancelEdit() { setEditingId(null); setServiceForm(emptyService) }

  async function deleteService(service: Service) {
    if (!window.confirm('Apagar servico ' + service.nome + '?')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('Sua sessao expirou. Entre novamente.'); return }
    const { error } = await supabase.from('servicos').delete().eq('id', service.id).eq('user_id', user.id)
    if (error) { setStatus('Erro ao apagar servico: ' + error.message); return }
    setServices((current) => current.filter((item) => item.id !== service.id)); setStatus('Servico apagado com sucesso!')
  }

  return <div className="mx-auto w-full max-w-5xl p-8 lg:p-12"><div className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Settings className="h-8 w-8 text-emerald-400" /> Configuracoes do Sistema</h1><p className="mt-1 text-sm text-slate-400">Personalize as automacoes, regras de resgate e informacoes do seu estabelecimento.</p></div>{status && <p className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</p>}<form onSubmit={handleSave} className="space-y-6"><section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Store className="h-5 w-5" />} title="Dados do Estabelecimento" description="Informacoes principais exibidas nas mensagens enviadas aos clientes." /><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Nome da Barbearia" value={nomeBarbearia} onChange={setNomeBarbearia} /><Field label="WhatsApp de Atendimento" value={whatsapp} onChange={setWhatsapp} type="tel" /></div></section><section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Clock className="h-5 w-5" />} title="Criterio de Inatividade" description={'Defina quando um cliente passa a ser considerado "em risco" de sumico.'} /><label className="block text-xs font-medium text-slate-400">Dias sem cortar o cabelo para o alerta disparar<select value={diasInativo} onChange={(event) => setDiasInativo(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500 md:w-1/2"><option value="20">20 dias (Ritmo acelerado)</option><option value="30">30 dias (Recomendado)</option><option value="45">45 dias (Espacado)</option><option value="60">60 dias (Critico)</option></select></label></section><section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<MessageSquare className="h-5 w-5" />} title="Template de Resgate (WhatsApp)" description="Personalize o texto padrao sugerido na hora de recuperar o cliente." /><label className="block text-xs font-medium text-slate-400">Mensagem Padrao<textarea rows={4} value={mensagemPadrao} onChange={(event) => setMensagemPadrao(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-white outline-none transition focus:border-emerald-500" /><span className="mt-2 block text-xs text-slate-500">Dica: use <code className="text-emerald-400">{'{nome}'}</code> e <code className="text-emerald-400">{'{barbearia}'}</code> para personalizar.</span></label><div className="space-y-4 border-t border-slate-800 pt-4"><Toggle label="Avisos Sonoros / Visuais no Painel" description="Destacar clientes sumidos no topo da lista principal." checked={notifPainel} onChange={setNotifPainel} /><Toggle label="Modo de Disparo Assistido" description="Otimizar o link direto para o WhatsApp Web ou Mobile." checked={envioAutomatico} onChange={setEnvioAutomatico} /></div></section><div className="flex justify-end pt-2"><button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><Save className="h-4 w-4" /> Salvar Todas as Configuracoes</button></div></form><section className="mt-6 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Clock3 className="h-5 w-5" />} title="Gerenciar servicos" description="Cadastre os servicos e valores que serao usados na Agenda e no auto-atendimento." /><form onSubmit={saveService} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_150px_150px_auto]"><Field label="Nome" value={serviceForm.nome} onChange={(value) => setServiceForm({ ...serviceForm, nome: value })} placeholder="Ex: Corte" /><Field label="Preco" value={serviceForm.preco} onChange={(value) => setServiceForm({ ...serviceForm, preco: value })} placeholder="60,00" type="text" /><Field label="Duracao em minutos" value={serviceForm.duracao} onChange={(value) => setServiceForm({ ...serviceForm, duracao: value })} placeholder="30" type="number" /><div className="flex items-end gap-2"><button disabled={savingService} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"><Plus className="h-4 w-4" />{savingService ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}</button>{editingId && <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-700 p-3.5 text-slate-300 hover:bg-slate-800" aria-label="Cancelar edicao"><X className="h-4 w-4" /></button>}</div></form><div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">{services.length ? services.map((service) => <div key={service.id} className="flex flex-col gap-3 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">{service.nome}</p><p className="mt-1 text-xs text-slate-500">R$ {service.preco.toFixed(2).replace('.', ',')} - {service.duracao_minutos} minutos</p></div><div className="flex gap-2"><button type="button" onClick={() => editService(service)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /> Editar servico</button><button type="button" onClick={() => void deleteService(service)} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /> Apagar</button></div></div>) : <p className="p-5 text-sm text-slate-500">Nenhum servico cadastrado.</p>}</div></section></div>
}

function Header({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) { return <div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">{icon}</div><div><h2 className="text-lg font-bold text-white">{title}</h2><p className="text-xs text-slate-400">{description}</p></div></div> }
function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <label className="block text-xs font-medium text-slate-400">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label> }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-medium text-white">{label}</span><span className="text-xs text-slate-400">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-500" /></label> }
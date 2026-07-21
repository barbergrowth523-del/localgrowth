'use client'

import { Bell, Clock, MessageSquare, Save, Settings, Sliders, Store } from 'lucide-react'
import { FormEvent, useState } from 'react'

export default function ConfiguracoesPage() {
  const [nomeBarbearia, setNomeBarbearia] = useState('Barbearia Jacobina')
  const [whatsapp, setWhatsapp] = useState('(74) 98888-7777')
  const [diasInativo, setDiasInativo] = useState('30')
  const [mensagemPadrao, setMensagemPadrao] = useState('Fala, {nome}! Tudo bem? Notamos que já vai fazer um tempinho desde seu último corte aqui na {barbearia}. Que tal dar aquela moral no visual essa semana? Clica aqui para agendar!')
  const [notifPainel, setNotifPainel] = useState(true)
  const [envioAutomatico, setEnvioAutomatico] = useState(false)

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alert('Configurações avançadas salvas com sucesso!')
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-8 lg:p-12">
      <div className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Settings className="h-8 w-8 text-emerald-400" /> Configurações do Sistema</h1><p className="mt-1 text-sm text-slate-400">Personalize as automações, regras de resgate e informações do seu estabelecimento.</p></div>
      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Store className="h-5 w-5" />} title="Dados do Estabelecimento" description="Informações principais exibidas nas mensagens enviadas aos clientes." /><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Nome da Barbearia" value={nomeBarbearia} onChange={setNomeBarbearia} /><Field label="WhatsApp de Atendimento" value={whatsapp} onChange={setWhatsapp} type="tel" /></div></section>
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Clock className="h-5 w-5" />} title="Critério de Inatividade" description={'Defina quando um cliente passa a ser considerado "em risco" de sumiço.'} /><label className="block text-xs font-medium text-slate-400">Dias sem cortar o cabelo para o alerta disparar<select value={diasInativo} onChange={(event) => setDiasInativo(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500 md:w-1/2"><option value="20">20 dias (Ritmo acelerado)</option><option value="30">30 dias (Recomendado)</option><option value="45">45 dias (Espaçado)</option><option value="60">60 dias (Crítico)</option></select></label></section>
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<MessageSquare className="h-5 w-5" />} title="Template de Resgate (WhatsApp)" description="Personalize o texto padrão sugerido na hora de recuperar o cliente." /><label className="block text-xs font-medium text-slate-400">Mensagem Padrão<textarea rows={4} value={mensagemPadrao} onChange={(event) => setMensagemPadrao(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-white outline-none transition focus:border-emerald-500" /><span className="mt-2 block text-xs text-slate-500">Dica: use <code className="text-emerald-400">{'{nome}'}</code> e <code className="text-emerald-400">{'{barbearia}'}</code> para personalizar.</span></label><div className="space-y-4 border-t border-slate-800 pt-4"><Toggle label="Avisos Sonoros / Visuais no Painel" description="Destacar clientes sumidos no topo da lista principal." checked={notifPainel} onChange={setNotifPainel} /><Toggle label="Modo de Disparo Assistido" description="Otimizar o link direto para o WhatsApp Web ou Mobile." checked={envioAutomatico} onChange={setEnvioAutomatico} /></div></section>
        <div className="flex justify-end pt-2"><button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><Save className="h-4 w-4" /> Salvar Todas as Configurações</button></div>
      </form>
    </div>
  )
}

function Header({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">{icon}</div><div><h2 className="text-lg font-bold text-white">{title}</h2><p className="text-xs text-slate-400">{description}</p></div></div>
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-medium text-slate-400">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label>
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-sm font-medium text-white">{label}</span><span className="text-xs text-slate-400">{description}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-500" /></label>
}

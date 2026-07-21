'use client'

import { Bell, Save, Settings, Store } from 'lucide-react'
import { FormEvent, useState } from 'react'

export default function ConfiguracoesPage() {
  const [notifWhatsapp, setNotifWhatsapp] = useState(true)
  const [nomeBarbearia, setNomeBarbearia] = useState('Minha Barbearia')
  const [whatsapp, setWhatsapp] = useState('(74) 98888-7777')

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alert('Configurações salvas com sucesso!')
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-8 lg:p-12">
      <div className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Settings className="h-8 w-8 text-emerald-400" /> Configurações</h1><p className="mt-1 text-sm text-slate-400">Ajuste as preferências e informações gerais da sua barbearia.</p></div>
      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400"><Store className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-white">Dados do Estabelecimento</h2><p className="text-xs text-slate-400">Nome e contato exibidos no sistema.</p></div></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><label className="block text-xs font-medium text-slate-400">Nome da barbearia<input type="text" value={nomeBarbearia} onChange={(event) => setNomeBarbearia(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label><label className="block text-xs font-medium text-slate-400">WhatsApp de atendimento<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label></div></section>
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400"><Bell className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-white">Notificações e Automações</h2><p className="text-xs text-slate-400">Controle de avisos sobre clientes em risco.</p></div></div><label className="flex items-center justify-between gap-4 py-2"><span><span className="block text-sm font-medium text-white">Alertas de Clientes Sumidos</span><span className="text-xs text-slate-400">Receba avisos automáticos no painel sobre clientes que precisam retornar.</span></span><input type="checkbox" checked={notifWhatsapp} onChange={(event) => setNotifWhatsapp(event.target.checked)} className="h-5 w-5 cursor-pointer accent-emerald-500" /></label></section>
        <div className="flex justify-end pt-2"><button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><Save className="h-4 w-4" /> Salvar Alterações</button></div>
      </form>
    </div>
  )
}

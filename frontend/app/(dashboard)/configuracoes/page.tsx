import { Bell, Building2, Check } from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-slate-400">Ajuste as preferências da sua barbearia.</p>
      </div>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-400" /><h2 className="font-semibold text-white">Dados da barbearia</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">Nome da barbearia<input className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500" placeholder="Minha Barbearia" /></label>
            <label className="text-sm text-slate-300">WhatsApp<input className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500" placeholder="(00) 00000-0000" /></label>
          </div>
          <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"><Check className="h-4 w-4" /> Salvar alterações</button>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-emerald-400" /><div><h2 className="font-semibold text-white">Notificações</h2><p className="mt-1 text-sm text-slate-400">Receba avisos sobre clientes em risco.</p></div></div>
        </section>
      </div>
    </div>
  )
}

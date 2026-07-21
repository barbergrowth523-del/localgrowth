import { Mail, User } from 'lucide-react'

export default function PerfilPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <div className="mb-8"><h1 className="text-2xl font-bold text-white">Perfil</h1><p className="mt-1 text-sm text-slate-400">Gerencie seus dados de acesso.</p></div>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-center gap-4"><div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400"><User className="h-6 w-6" /></div><div><h2 className="font-semibold text-white">Informações pessoais</h2><p className="text-sm text-slate-400">Seu perfil BarberGrowth</p></div></div>
        <label className="block text-sm text-slate-300">Nome<input className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500" placeholder="Seu nome" /></label>
        <label className="mt-4 block text-sm text-slate-300">E-mail<div className="relative mt-2"><Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><input type="email" className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none focus:border-emerald-500" placeholder="voce@barbearia.com" /></div></label>
        <button className="mt-5 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Salvar perfil</button>
      </section>
    </div>
  )
}

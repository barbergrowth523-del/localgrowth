'use client'

import { MessageSquare, Search, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'

const clientes = [
  { id: 1, nome: 'Pedro Souza', telefone: '(74) 98888-7777', ultimoCorte: '15 de maio de 2026', status: 'VIP em risco' },
  { id: 2, nome: 'Lucas Almeida', telefone: '(74) 99111-2233', ultimoCorte: '10 de junho de 2026', status: 'Ativo' },
  { id: 3, nome: 'Carlos Silva', telefone: '(74) 99999-4455', ultimoCorte: '02 de abril de 2026', status: 'Sumido (+60 dias)' },
]

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const clientesFiltrados = clientes.filter((cliente) => (cliente.nome + ' ' + cliente.telefone).toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="mx-auto w-full max-w-7xl p-8 lg:p-12">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Users className="h-8 w-8 text-emerald-400" /> Meus Clientes</h1><p className="mt-1 text-sm text-slate-400">Gerencie sua base de clientes e acompanhe quem precisa retornar ao salao.</p></div>
        <button onClick={() => alert('Abrir modal de cadastro de cliente')} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><UserPlus className="h-4 w-4" /> Novo Cliente</button>
      </div>
      <div className="relative mb-6"><Search className="absolute left-4 top-4 h-5 w-5 text-slate-500" /><input type="search" placeholder="Buscar cliente por nome ou telefone..." value={busca} onChange={(event) => setBusca(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-4 pl-12 pr-4 text-sm text-white shadow-inner outline-none transition focus:border-emerald-500" /></div>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left"><thead><tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400"><th className="p-5">Cliente</th><th className="p-5">Telefone</th><th className="p-5">Ultimo Corte</th><th className="p-5">Status</th><th className="p-5 text-right">Acao</th></tr></thead><tbody className="divide-y divide-slate-800/60 text-sm">{clientesFiltrados.length > 0 ? clientesFiltrados.map((cliente) => <tr key={cliente.id} className="transition hover:bg-slate-800/40"><td className="p-5 font-semibold text-white">{cliente.nome}</td><td className="p-5 text-slate-400">{cliente.telefone}</td><td className="p-5 text-slate-400">{cliente.ultimoCorte}</td><td className="p-5"><span className={'rounded-full px-3 py-1 text-xs font-medium ' + (cliente.status === 'Ativo' ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border border-amber-500/20 bg-amber-500/10 text-amber-400')}>{cliente.status}</span></td><td className="p-5 text-right"><button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-500"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</button></td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>}</tbody></table></div></div>
    </div>
  )
}

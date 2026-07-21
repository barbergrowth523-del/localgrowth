'use client'

import { MessageSquare, Search, Users } from 'lucide-react'
import { useState } from 'react'

const clientes = [
  { id: 1, nome: 'Pedro Souza', telefone: '(74) 98888-7777', ultimoCorte: '15 de maio de 2026', status: 'VIP em risco' },
  { id: 2, nome: 'Lucas Almeida', telefone: '(74) 99111-2233', ultimoCorte: '10 de junho de 2026', status: 'Ativo' },
  { id: 3, nome: 'Carlos Silva', telefone: '(74) 99999-4455', ultimoCorte: '02 de abril de 2026', status: 'Sumido (+60 dias)' },
]

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const clientesFiltrados = clientes.filter((cliente) =>
    `${cliente.nome} ${cliente.telefone}`.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Meus Clientes</h1>
          <p className="text-sm text-slate-400">Gerencie sua base e acompanhe quem precisa retornar.</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
        <input
          type="search"
          placeholder="Buscar cliente por nome ou telefone..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="p-4">Cliente</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Último Corte</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {clientesFiltrados.length > 0 ? clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className="transition hover:bg-slate-800/50">
                  <td className="p-4 font-medium text-white">{cliente.nome}</td>
                  <td className="p-4 text-slate-400">{cliente.telefone}</td>
                  <td className="p-4 text-slate-400">{cliente.ultimoCorte}</td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cliente.status === 'Ativo' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>
                      {cliente.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 p-2 text-xs font-semibold text-white transition hover:bg-emerald-500">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

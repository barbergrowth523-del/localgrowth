'use client'

import { FormEvent, useMemo, useState } from 'react'

export default function CadastroForm({ barbearia }: { barbearia: string }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const nomeBarbearia = useMemo(() => {
    if (!barbearia || isUuid(barbearia)) return 'Barbearia Jacobina'
    return 'Barbearia ' + barbearia.replace(/[-_]+/g, ' ')
  }, [barbearia])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const response = await fetch('/api/cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barbearia, nome, telefone }) })
    const data = await response.json() as { success?: boolean; error?: string }
    if (!response.ok || !data.success) setError(data.error ?? 'Nao foi possivel concluir o cadastro.')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-xl font-bold text-emerald-400">OK</div><h1 className="text-2xl font-bold">Cadastro realizado com sucesso!</h1><p className="mt-3 text-sm text-slate-400">Obrigado. A {nomeBarbearia} ja recebeu seus dados.</p></section></main>

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl font-bold text-emerald-400">BG</div><h1 className="text-2xl font-bold">{nomeBarbearia}</h1><p className="mt-2 text-sm text-slate-400">Bem-vindo! Preencha seus dados para facilitar seu proximo atendimento.</p></div><form onSubmit={handleSubmit} className="space-y-5"><label className="block text-sm text-slate-300">Nome Completo<input required minLength={2} value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex: Joao Silva" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">WhatsApp / Telefone<input required minLength={8} value={telefone} onChange={(event) => setTelefone(event.target.value)} placeholder="(00) 00000-0000" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white placeholder:text-slate-600 outline-none focus:border-emerald-500" /></label>{error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}<button disabled={loading} type="submit" className="w-full rounded-xl bg-emerald-500 px-5 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Enviando...' : 'Concluir Cadastro'}</button></form><p className="mt-6 text-center text-xs text-slate-600">Seus dados serao usados apenas para facilitar seu atendimento.</p></section></main>
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

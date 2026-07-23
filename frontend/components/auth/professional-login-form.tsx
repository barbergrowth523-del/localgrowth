'use client'

import { ArrowRight, Lock } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfessionalLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const result = await createClient().auth.signInWithPassword({ email, password })
    if (result.error) { setMessage('E-mail ou senha invalidos.'); setLoading(false); return }
    const access = await fetch('/api/profissional/access')
    if (!access.ok) { await createClient().auth.signOut(); setMessage('Este acesso nao esta vinculado a uma equipe.'); setLoading(false); return }
    window.location.href = '/painel-profissional'
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"><div className="mb-8 text-center"><BrandLogo showName={false} className="justify-center" markClassName="h-12 w-12" /><h1 className="mt-5 text-2xl font-bold">Painel do profissional</h1><p className="mt-2 text-sm text-slate-400">Acesse sua agenda e seus atendimentos.</p></div><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-slate-300">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label><label className="block text-sm text-slate-300">Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none focus:border-emerald-500" /></label>{message && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{message}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{loading ? 'Entrando...' : 'Entrar no painel'}<ArrowRight className="h-4 w-4" /></button></form><p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600"><Lock className="h-3.5 w-3.5" /> Acesso restrito a profissionais</p></section></main>
}


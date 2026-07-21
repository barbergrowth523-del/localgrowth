'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Check, Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('')
    const supabase = createClient()
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
    setLoading(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup') return setMessage('Confira seu e-mail para confirmar o cadastro.')
    window.location.href = '/dashboard'
  }
  return <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between"><div className="absolute left-10 top-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="relative z-10 flex items-center gap-3 font-semibold tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-slate-950"><Scissors size={19} /></span> BarberGrowth</div>
      <div className="relative z-10 max-w-lg pb-12"><p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-emerald-400">Relacionamento que mantém a cadeira cheia.</p><h1 className="text-6xl font-semibold leading-[.98] tracking-[-.06em] text-white">Seu cliente não deveria precisar lembrar de você.</h1><p className="mt-7 max-w-md text-lg leading-8 text-slate-400">Organize seus clientes, entenda quem está sumido e transforme uma mensagem em mais um horário marcado.</p></div>
    </section>
    <section className="flex items-center justify-center bg-slate-950 px-6 py-12"><div className="w-full max-w-[390px]">
      <div className="mb-10 lg:hidden flex items-center gap-3 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-slate-950"><Scissors size={17} /></span> BarberGrowth</div>
      <p className="mb-3 text-sm font-medium text-emerald-400">Bem-vindo de volta</p><h2 className="text-4xl font-semibold tracking-[-.04em]">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2><p className="mt-3 text-slate-400">Comece a cuidar melhor do seu negócio hoje.</p>
      <form onSubmit={submit} className="mt-9 space-y-5"><label className="block text-sm font-medium">E-mail<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2" placeholder="voce@barbearia.com" /></label><label className="block text-sm font-medium">Senha<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2" placeholder="••••••••" /></label>{message && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{message}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-4 font-bold text-slate-950 transition hover:bg-emerald-500 disabled:opacity-60">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight size={17} /></button></form>
      <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="mt-7 flex w-full items-center justify-center gap-1 text-sm text-slate-400">{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}<span className="font-semibold text-emerald-400">{mode === 'login' ? 'Cadastre-se' : 'Entrar'}</span></button><div className="mt-14 flex items-center justify-center gap-2 text-xs text-slate-600"><Check size={14} className="text-emerald-400" /> Seus dados ficam protegidos pelo Supabase</div>
    </div></section>
  </main>
}

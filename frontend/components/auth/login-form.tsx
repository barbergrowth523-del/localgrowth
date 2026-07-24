'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Check, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginForm({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/dashboard' } })
    setLoading(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup') return setMessage('Confira seu e-mail para confirmar o cadastro.')
    window.location.href = '/dashboard'
  }

  return (
    <AuthLayout
      aside={
        <div className="mt-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-[.2em] text-emerald-400">Relacionamento que mant?m a cadeira cheia.</p>
          <h1 className="text-5xl font-semibold leading-[.98] tracking-[-.06em] text-white xl:text-6xl">Seu cliente n?o deveria precisar lembrar de voc?.</h1>
          <p className="mt-5 text-base leading-7 text-slate-400 xl:text-lg xl:leading-8">Organize seus clientes, entenda quem est? sumido e transforme uma mensagem em mais um hor?rio marcado.</p>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3"><Check size={16} className="shrink-0 text-emerald-400" />Integra??o instant?nea com WhatsApp</li>
            <li className="flex items-center gap-3"><Check size={16} className="shrink-0 text-emerald-400" />Mapeamento inteligente de evas?o</li>
            <li className="flex items-center gap-3"><Check size={16} className="shrink-0 text-emerald-400" />Retorno sobre investimento imediato</li>
          </ul>
          <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-6">
            <div className="flex gap-1 text-amber-400">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" />)}</div>
            <p className="mt-4 text-sm italic leading-6 text-slate-300">&quot;O sistema encontrou R$ 850 perdidos na minha base de clientes logo no primeiro dia de uso. O investimento se pagou na mesma hora.&quot;</p>
            <p className="mt-4 text-sm font-semibold text-white">Marcos, Carvalhos Barber Shop</p>
          </div>
        </div>
      }
    >
      <div>
        <p className="text-sm font-medium text-emerald-400">Bem-vindo de volta</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">Comece a cuidar melhor do seu neg?cio hoje.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-200">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-base text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2" placeholder="voce@barbearia.com" /></label>
          <label className="block text-sm font-medium text-slate-200">Senha<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-base text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2" placeholder="Sua senha" /></label>
          {message && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{message}</p>}
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-emerald-500 disabled:opacity-60">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight size={17} /></button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="mt-7 flex w-full items-center justify-center gap-1 text-sm text-slate-400">{mode === 'login' ? 'Ainda n?o tem uma conta?' : 'J? tem uma conta?'}<span className="font-semibold text-emerald-400">{mode === 'login' ? 'Cadastre-se' : 'Entrar'}</span></button>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"><Check size={14} className="text-emerald-400" /> Seus dados ficam protegidos pelo Supabase</div>
      </div>
    </AuthLayout>
  )
}

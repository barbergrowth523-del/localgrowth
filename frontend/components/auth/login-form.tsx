'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
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
    <AuthLayout>
      <div>
        <p className="text-sm font-medium text-emerald-400">Bem-vindo de volta</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
          Comece a cuidar melhor do seu negocio hoje.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-200">
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-base text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
              placeholder="voce@barbearia.com"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Senha
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-base text-white outline-none ring-emerald-400 transition placeholder:text-slate-600 focus:ring-2"
              placeholder="Sua senha"
            />
          </label>
          {message && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">{message}</p>}
          <button
            disabled={loading}
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            <ArrowRight size={17} />
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}
          className="mt-7 flex w-full items-center justify-center gap-1 text-sm text-slate-400"
        >
          {mode === 'login' ? 'Ainda nao tem uma conta?' : 'Ja tem uma conta?'}
          <span className="font-semibold text-emerald-400">{mode === 'login' ? 'Cadastre-se' : 'Entrar'}</span>
        </button>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Check size={14} className="text-emerald-400" /> Seus dados ficam protegidos pelo Supabase
        </div>
      </div>
    </AuthLayout>
  )
}

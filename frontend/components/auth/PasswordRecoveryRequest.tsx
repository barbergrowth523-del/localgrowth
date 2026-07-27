'use client'

import Link from 'next/link'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PasswordRecoveryRequest() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const normalizedEmail = email.trim().toLowerCase()

    try {
      const { error: requestError } = await createClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/esqueci-senha/verificar`,
      })
      if (requestError) {
        setError('Nao foi possivel enviar o codigo. Confira o e-mail e tente novamente.')
        return
      }

      window.sessionStorage.setItem('prontusfy-recovery-email', normalizedEmail)
      window.sessionStorage.setItem('prontusfy-recovery-otp-sent-at', String(Date.now()))
      setMessage('Codigo enviado. Confira seu e-mail e digite os 6 numeros na proxima tela.')
      window.setTimeout(() => window.location.assign('/esqueci-senha/verificar'), 700)
    } catch {
      setError('Nao foi possivel conectar ao servico de recuperacao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 inline-flex rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
          <Mail className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Prontusfy</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Recuperar senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Informe seu e-mail. Enviaremos um codigo de 8 digitos para confirmar sua identidade.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@barbearia.com"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            />
          </label>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Enviando codigo...' : 'Enviar codigo'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> O acesso sera protegido por verificacao segura.</div>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-emerald-400 hover:text-emerald-300">Voltar para o login</Link>
      <LegalLinks className="mt-6 justify-center" />
      </section>
    </main>
  )
}
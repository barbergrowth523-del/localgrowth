'use client'

import Link from 'next/link'
import { LegalLinks } from '@/components/legal/LegalLinks'
import { CheckCircle2, Loader2, MailCheck, RefreshCw } from 'lucide-react'
import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export function EmailOtpVerification() {
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const pendingEmail = window.sessionStorage.getItem('prontusfy-signup-email') ?? ''
    const sentAt = Number(window.sessionStorage.getItem('prontusfy-signup-otp-sent-at') ?? Date.now())
    setEmail(pendingEmail)

    const elapsed = Math.floor((Date.now() - sentAt) / 1000)
    setCooldown(Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed))
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    event.preventDefault()
    const nextDigits = Array(OTP_LENGTH).fill('').map((_, index) => pasted[index] ?? '')
    setDigits(nextDigits)
    inputs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus()
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault()
    const token = digits.join('')
    if (!email) return setMessage('Volte ao cadastro e informe seu e-mail novamente.')
    if (token.length !== OTP_LENGTH) return setMessage('Digite os 6 digitos enviados para o seu e-mail.')

    setLoading(true)
    setMessage('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
      if (error || !data.session || !data.user) {
        setMessage('Codigo invalido ou expirado. Confira os digitos ou solicite um novo codigo.')
        return
      }

      setSuccess(true)
      window.sessionStorage.removeItem('prontusfy-signup-email')
      window.sessionStorage.removeItem('prontusfy-signup-otp-sent-at')
      window.localStorage.removeItem(`prontusfy-onboarding-${data.user.id}`)
      window.localStorage.removeItem(`prontusfy-onboarding-${data.user.id}-step`)
      window.localStorage.setItem(`prontusfy-welcome-${data.user.id}`, 'pending')
      void supabase.from('account_activity_events').insert({ user_id: data.user.id, event_type: 'email_verified' })
      window.setTimeout(() => window.location.replace('/assinatura?onboarding=1'), 700)
    } catch {
      setMessage('Nao foi possivel verificar o codigo agora. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function resendCode() {
    if (!email || cooldown > 0 || resending) return
    setResending(true)
    setMessage('')
    try {
      const { error } = await createClient().auth.resend({ type: 'signup', email })
      if (error) {
        setMessage('Nao foi possivel reenviar agora. Aguarde alguns instantes e tente novamente.')
        return
      }
      const sentAt = Date.now()
      window.sessionStorage.setItem('prontusfy-signup-otp-sent-at', String(sentAt))
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setDigits(Array(OTP_LENGTH).fill(''))
      inputs.current[0]?.focus()
      setMessage('Novo codigo enviado. Confira sua caixa de entrada e a pasta de spam.')
    } catch {
      setMessage('Nao foi possivel reenviar agora. Tente novamente.')
    } finally {
      setResending(false)
    }
  }

  const maskedEmail = email ? email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : ''

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          {success ? <CheckCircle2 className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
        </div>
        <div className="mt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Confirmacao segura</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Verifique seu e-mail</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enviamos um codigo de 6 digitos para {maskedEmail || 'o e-mail informado'}. Digite o codigo abaixo para ativar sua conta.
          </p>
        </div>

        <form onSubmit={verifyCode} className="mt-7">
          <div className="grid grid-cols-6 gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputs.current[index] = element }}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digito ${index + 1} do codigo`}
                className="aspect-square min-w-0 rounded-xl border border-slate-700 bg-slate-950 text-center text-xl font-bold text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 sm:text-2xl"
              />
            ))}
          </div>

          {message && <p aria-live="polite" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-5 text-emerald-100">{message}</p>}

          <button disabled={loading || success} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</> : success ? 'E-mail confirmado' : 'Verificar codigo'}
          </button>
        </form>

        <button
          type="button"
          disabled={!email || cooldown > 0 || resending}
          onClick={() => void resendCode()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-3 text-sm font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
          {cooldown > 0 ? `Reenviar codigo em ${cooldown}s` : 'Reenviar codigo'}
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          E-mail incorreto? <Link href="/cadastro" className="font-semibold text-emerald-400 hover:text-emerald-300">Voltar ao cadastro</Link>
        </p>
      <LegalLinks className="mt-6 justify-center" />
      </section>
    </main>
  )
}
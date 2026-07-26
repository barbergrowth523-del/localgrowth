'use client'

import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export function PasswordRecoveryOtp() {
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    const storedEmail = window.sessionStorage.getItem('prontusfy-recovery-email') ?? ''
    const sentAt = Number(window.sessionStorage.getItem('prontusfy-recovery-otp-sent-at') ?? 0)
    setEmail(storedEmail)
    const elapsed = sentAt ? Math.floor((Date.now() - sentAt) / 1000) : RESEND_COOLDOWN_SECONDS
    setCooldown(Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed))
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  function updateDigit(index: number, value: string) {
    const onlyDigits = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((digit, position) => position === index ? onlyDigits : digit))
    if (onlyDigits && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    setDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? ''))
    inputs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const token = digits.join('')

    if (!email) {
      setError('Solicite um novo codigo informando seu e-mail.')
      setLoading(false)
      return
    }
    if (token.length !== OTP_LENGTH) {
      setError('Digite os 6 numeros recebidos por e-mail.')
      setLoading(false)
      return
    }
    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.')
      setLoading(false)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas nao conferem.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
      if (verifyError) {
        setError('Codigo invalido ou expirado. Solicite um novo codigo.')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError('Nao foi possivel salvar a nova senha. Solicite outro codigo e tente novamente.')
        return
      }
      window.sessionStorage.removeItem('prontusfy-recovery-email')
      window.sessionStorage.removeItem('prontusfy-recovery-otp-sent-at')
      setMessage('Senha alterada com sucesso. Redirecionando para o login...')
      window.setTimeout(() => window.location.assign('/login'), 900)
    } catch {
      setError('Nao foi possivel concluir a recuperacao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    if (!email || cooldown > 0 || resending) return
    setResending(true)
    setError('')
    setMessage('')
    try {
      const { error: resendError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/esqueci-senha/verificar` })
      if (resendError) {
        setError('Nao foi possivel reenviar o codigo. Tente novamente em instantes.')
        return
      }
      window.sessionStorage.setItem('prontusfy-recovery-otp-sent-at', String(Date.now()))
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setMessage('Novo codigo enviado para seu e-mail.')
    } catch {
      setError('Nao foi possivel reenviar o codigo.')
    } finally {
      setResending(false)
    }
  }

  const strength = newPassword.length >= 12 ? 'Senha forte' : newPassword.length >= 8 ? 'Senha adequada' : 'Use no minimo 8 caracteres'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 inline-flex rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400"><KeyRound className="h-6 w-6" /></div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Prontusfy</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Digite o codigo de recuperacao</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enviamos um codigo de recuperacao para seu e-mail. Digite os 6 numeros e defina sua nova senha.</p>
        <p className="mt-2 truncate text-sm text-slate-300">{email || 'Nenhum e-mail informado'}</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div onPaste={handlePaste} className="flex justify-between gap-2">
            {digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element }} value={digit} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} aria-label={`Digito ${index + 1}`} className="h-14 w-12 rounded-xl border border-slate-800 bg-slate-950 text-center text-2xl font-bold text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 sm:h-16 sm:w-14" />)}
          </div>

          <label className="block text-sm font-medium text-slate-200">Nova senha<div className="relative mt-2"><input required minLength={8} type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 pr-12 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" placeholder="Minimo de 8 caracteres" /><button type="button" onClick={() => setShowNewPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-emerald-300" aria-label={showNewPassword ? 'Esconder senha' : 'Mostrar senha'}>{showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div><span className={`mt-2 block text-xs ${newPassword.length >= 8 ? 'text-emerald-300' : 'text-slate-500'}`}>{strength}</span></label>
          <label className="block text-sm font-medium text-slate-200">Confirmar nova senha<div className="relative mt-2"><input required minLength={8} type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 pr-12 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20" placeholder="Repita a nova senha" /><button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-emerald-300" aria-label={showConfirmPassword ? 'Esconder senha' : 'Mostrar senha'}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p>}
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Validando...' : 'Redefinir senha'}<ArrowRight className="h-4 w-4" /></button>
        </form>

        <button type="button" onClick={() => void resend()} disabled={!email || cooldown > 0 || resending} className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:text-slate-600"><RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />{resending ? 'Reenviando...' : cooldown > 0 ? `Reenviar codigo em ${cooldown}s` : 'Reenviar codigo'}</button>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-400" /> O codigo e de uso unico e expira por seguranca.</div>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-slate-400 hover:text-white">Voltar para o login</Link>
      </section>
    </main>
  )
}
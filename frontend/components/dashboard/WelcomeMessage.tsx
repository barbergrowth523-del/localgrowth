'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function WelcomeMessage({ userId, barbershopName }: { userId: string; barbershopName?: string | null }) {
  const [open, setOpen] = useState(false)
  const key = `prontusfy-welcome-${userId}`

  useEffect(() => {
    setOpen(window.localStorage.getItem(key) === 'pending')
  }, [key])

  function close() {
    window.localStorage.setItem(key, 'shown')
    setOpen(false)
  }

  if (!open) return null

  return <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="w-full max-w-md rounded-3xl border border-emerald-500/25 bg-slate-900 p-6 shadow-2xl shadow-emerald-950/50 sm:p-8"><span className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><Sparkles className="h-7 w-7" /></span><p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Conta pronta</p><h2 id="welcome-title" className="mt-3 text-3xl font-bold tracking-tight text-white">Bem-vindo ao Prontusfy{barbershopName ? `, ${barbershopName}` : ''}.</h2><p className="mt-4 text-sm leading-6 text-slate-400">Sua conta foi confirmada. Comece cadastrando clientes pelo QR Code, organize a Agenda e use o Dashboard para resgatar quem esta sumido.</p><button type="button" onClick={close} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300">Comecar agora <ArrowRight className="h-4 w-4" /></button></section></div>
}
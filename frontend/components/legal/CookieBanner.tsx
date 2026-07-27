'use client'

import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'prontusfy-cookie-consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(window.localStorage.getItem(CONSENT_KEY) !== 'accepted')
  }, [])

  function accept() {
    window.localStorage.setItem(CONSENT_KEY, 'accepted')
    window.dispatchEvent(new Event('prontusfy-cookie-consent'))
    setVisible(false)
  }

  if (!visible) return null

  return <section role="dialog" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-slate-200 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><span className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-400"><Cookie className="h-5 w-5" /></span><p className="text-sm leading-6 text-slate-300">Usamos cookies essenciais para manter sua sessao e, com seu aceite, medir melhorias na plataforma. Consulte nossa <Link href="/politica-de-privacidade" className="font-semibold text-emerald-400 hover:text-emerald-300">Politica de Privacidade</Link>.</p></div><button type="button" onClick={accept} className="shrink-0 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Aceitar cookies</button></div></section>
}
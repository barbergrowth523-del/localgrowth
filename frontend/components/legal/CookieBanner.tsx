'use client'

import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'prontusfy-cookie-consent'

export function CookieBanner() {
  const [consent, setConsent] = useState<string | null>(null)

  useEffect(() => {
    const syncConsent = () => setConsent(window.localStorage.getItem(CONSENT_KEY))
    syncConsent()
    window.addEventListener('prontusfy-cookie-consent', syncConsent)
    return () => window.removeEventListener('prontusfy-cookie-consent', syncConsent)
  }, [])

  function saveConsent(value: 'accepted' | 'declined') {
    window.localStorage.setItem(CONSENT_KEY, value)
    window.dispatchEvent(new Event('prontusfy-cookie-consent'))
    setConsent(value)
  }

  if (consent === 'accepted') return null

  const declined = consent === 'declined'
  return <section role="dialog" aria-live="polite" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-slate-200 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><span className="mt-0.5 rounded-xl bg-emerald-500/10 p-2 text-emerald-400"><Cookie className="h-5 w-5" /></span><p className="text-sm leading-6 text-slate-300">{declined ? 'Voce escolheu usar apenas cookies essenciais. Recursos de medicao e marketing permanecem desativados.' : 'Usamos cookies essenciais para manter sua sessao e, com seu aceite, medir melhorias na plataforma.'} Consulte nossa <Link href="/politica-de-cookies" className="font-semibold text-emerald-400 hover:text-emerald-300">Politica de Cookies</Link>.</p></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><button type="button" onClick={() => saveConsent('declined')} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800">Apenas essenciais</button><button type="button" onClick={() => saveConsent('accepted')} className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Aceitar cookies</button></div></div></section>
}
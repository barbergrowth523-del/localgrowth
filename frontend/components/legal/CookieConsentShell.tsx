'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { CookieBanner } from '@/components/legal/CookieBanner'

const CONSENT_KEY = 'prontusfy-cookie-consent'

export function CookieConsentShell({ children }: { children: ReactNode }) {
  const [declined, setDeclined] = useState(false)

  useEffect(() => {
    const syncConsent = () => setDeclined(window.localStorage.getItem(CONSENT_KEY) === 'declined')
    syncConsent()
    window.addEventListener('prontusfy-cookie-consent', syncConsent)
    return () => window.removeEventListener('prontusfy-cookie-consent', syncConsent)
  }, [])

  return <><div className={declined ? 'pointer-events-none opacity-60 blur-[4px] transition-all duration-300' : 'transition-all duration-300'}>{children}</div><CookieBanner /></>
}
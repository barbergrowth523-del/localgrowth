'use client'

import type { ReactNode } from 'react'
import { CookieBanner } from '@/components/legal/CookieBanner'

export function CookieConsentShell({ children }: { children: ReactNode }) {
  return <>{children}<CookieBanner /></>
}

import type { Metadata } from 'next'
import './globals.css'
import { CookieConsentShell } from '@/components/legal/CookieConsentShell'
import { MarketingScripts } from '@/components/legal/MarketingScripts'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_TAGLINE,
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><head><meta charSet="utf-8" /></head><body className="overflow-x-hidden bg-slate-950"><MarketingScripts gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID} /><CookieConsentShell>{children}</CookieConsentShell></body></html>
}
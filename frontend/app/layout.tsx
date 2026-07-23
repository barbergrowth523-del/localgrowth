import type { Metadata } from 'next'
import './globals.css'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

export const metadata: Metadata = { title: BRAND_NAME, description: BRAND_TAGLINE }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><head><meta charSet="utf-8" /></head><body>{children}</body></html>
}
